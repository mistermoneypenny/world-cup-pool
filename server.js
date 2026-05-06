const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'state.json');

// JSONBin.io persistent storage
const JSONBIN_ID  = '69b9bc23c3097a1dd5342b3b';
const JSONBIN_KEY = process.env.JSONBIN_KEY || '$2a$10$W6vNvtSScYKU7ztHnivVI.1PhiLvrklCsgk5GcOXtdi.Kg6Ppd2c6';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

// ── IN-MEMORY STATE CACHE ────────────────────────────────────
let memoryState = null;
let lastJsonBinRead = 0;
const JSONBIN_READ_INTERVAL = 30000; // only read from JSONBin every 30s

// ── WRITE MUTEX ──────────────────────────────────────────────
let writeLock = Promise.resolve();

function withWriteLock(fn) {
  const next = writeLock.then(fn).catch(fn);
  writeLock = next.then(() => {}, () => {});
  return next;
}

// ── SIMPLE RATE LIMITER ──────────────────────────────────────
const requestCounts = {};
const RATE_WINDOW = 10000;
const MAX_REQUESTS = 30;

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  if (!requestCounts[ip] || now - requestCounts[ip].start > RATE_WINDOW) {
    requestCounts[ip] = { start: now, count: 1 };
  } else {
    requestCounts[ip].count++;
  }
  if (requestCounts[ip].count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
}
app.use('/api/', rateLimit);

setInterval(() => {
  const now = Date.now();
  for (const ip in requestCounts) {
    if (now - requestCounts[ip].start > RATE_WINDOW * 2) delete requestCounts[ip];
  }
}, 60000);

// ── Helper: read state (memory → JSONBin → local file) ──────
async function readState() {
  const now = Date.now();

  if (memoryState && (now - lastJsonBinRead < JSONBIN_READ_INTERVAL)) {
    return memoryState;
  }

  try {
    const resp = await fetch(`${JSONBIN_URL}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_KEY },
    });
    if (resp.ok) {
      const body = await resp.json();
      const data = body.record || {};
      if (data.init && Object.keys(data).length === 1) {
        // Fresh bin — return empty
        memoryState = {};
        lastJsonBinRead = now;
        return {};
      }
      memoryState = data;
      lastJsonBinRead = now;
      const tmpFile = DATA_FILE + '.tmp';
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmpFile, DATA_FILE);
      return data;
    }
  } catch (e) {
    console.warn('JSONBin read failed, using cache:', e.message);
  }

  if (memoryState) return memoryState;

  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      if (raw.trim()) {
        memoryState = JSON.parse(raw);
        return memoryState;
      }
    }
  } catch (e) { /* ignore */ }
  return {};
}

// ── Helper: write state to memory + local + JSONBin ─────────
async function writeState(data) {
  memoryState = data;
  lastJsonBinRead = Date.now();

  try {
    const tmpFile = DATA_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (e) {
    console.warn('Local write failed:', e.message);
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_KEY,
        },
        body: JSON.stringify(data),
      });
      if (resp.ok) return;
      console.warn(`JSONBin write attempt ${attempt + 1} failed: ${resp.status}`);
    } catch (e) {
      console.warn(`JSONBin write attempt ${attempt + 1} error:`, e.message);
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
  }
}

function isAdminSender(sender, state) {
  return !sender || (state.players?.length && sender === state.players[0]?.id);
}

// ── GET /api/state ──────────────────────────────────────────
app.get('/api/state', async (req, res) => {
  try {
    const data = await readState();
    res.json(data);
  } catch (e) {
    console.error('GET /api/state error:', e.message);
    res.json({});
  }
});

// ── POST /api/login ─────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { playerId, pin } = req.body;
    if (!playerId) return res.status(400).json({ ok: false, error: 'Missing playerId' });

    const data = await readState();
    const storedPin = data.playerPins?.[playerId];

    if (!storedPin) return res.json({ ok: true });
    if (String(pin).trim() === String(storedPin).trim()) return res.json({ ok: true });
    return res.status(401).json({ ok: false, error: 'Incorrect PIN' });
  } catch (e) {
    console.error('POST /api/login error:', e.message);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// ── POST /api/state ─────────────────────────────────────────
app.post('/api/state', async (req, res) => {
  try {
    const result = await withWriteLock(async () => {
      let existing = await readState();

      const incoming = req.body;
      const sender = incoming._sender;
      const admin = isAdminSender(sender, existing);

      if (admin) {
        const adminFields = ['currentRound', 'roundStatus', 'results', 'scores', 'rulesText',
                             'defaultPlayersKey', 'bonusAnswers', 'r32Teams'];
        adminFields.forEach(field => {
          if (incoming[field] !== undefined) existing[field] = incoming[field];
        });

        if (incoming.players !== undefined) {
          const hasExistingPlayers = existing.players && existing.players.length > 0;
          const isRealAdmin = sender && existing.players?.length && sender === existing.players[0]?.id;
          if (isRealAdmin || !hasExistingPlayers) existing.players = incoming.players;
        }

        if (incoming.playerPins !== undefined) {
          const hasIncomingPins = Object.keys(incoming.playerPins).length > 0;
          const hasExistingPins = existing.playerPins && Object.keys(existing.playerPins).length > 0;
          if (hasIncomingPins || !hasExistingPins) existing.playerPins = incoming.playerPins;
        }
      }

      if (incoming.picks && sender) {
        if (!existing.picks) existing.picks = {};
        existing.picks[sender] = incoming.picks[sender] || {};
      } else if (incoming.picks && !sender) {
        existing.picks = incoming.picks;
      }

      if (incoming.bonusPicks && sender) {
        if (!existing.bonusPicks) existing.bonusPicks = {};
        existing.bonusPicks[sender] = incoming.bonusPicks[sender] || {};
      } else if (incoming.bonusPicks && !sender) {
        existing.bonusPicks = incoming.bonusPicks;
      }

      await writeState(existing);
      return { ok: true };
    });
    res.json(result);
  } catch (e) {
    console.error('POST /api/state error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── ESPN / FIFA LIVE SCORES ───────────────────────────────────
const ESPN_SOCCER = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// World Cup 2026: June 11 – July 26
const WC_DATES = [
  '20260611','20260612','20260613','20260614','20260615','20260616','20260617',
  '20260618','20260619','20260620','20260621','20260622','20260623','20260624',
  '20260625','20260626','20260627','20260628','20260629','20260630','20260701',
  '20260702','20260704','20260705','20260706','20260707','20260709','20260710',
  '20260711','20260712','20260714','20260715','20260718','20260719','20260722','20260726',
];

let cachedScores  = {};
let lastScoresFetch = 0;
const SCORES_CACHE_MS = 60000;

const TEAM_ALIASES = {
  'USA':          ['united states', 'united states of america'],
  'Ivory Coast':  ["côte d'ivoire", "cote d'ivoire", 'ivory coast'],
  'South Korea':  ['korea republic', 'republic of korea'],
  'Iran':         ['ir iran'],
  'Turkey':       ['türkiye', 'turkiye'],
  'Czech Republic': ['czechia', 'czech republic'],
  'Curacao':      ['curaçao'],
  'Cape Verde':   ['cabo verde'],
  'DR Congo':     ['congo dr', 'democratic republic of congo', 'dr congo'],
  'Bosnia':       ['bosnia and herzegovina', 'bosnia & herzegovina'],
};

function matchWCTeam(espnName, poolName) {
  const e = (espnName || '').toLowerCase().trim();
  const p = poolName.toLowerCase().trim();
  if (e === p || e.includes(p) || p.includes(e)) return true;
  const aliases = TEAM_ALIASES[poolName];
  if (aliases) return aliases.some(a => e === a || e.includes(a) || a.includes(e));
  return false;
}

async function fetchESPNScores() {
  const now = Date.now();
  if (now - lastScoresFetch < SCORES_CACHE_MS) return cachedScores;

  const tomorrow = new Date(now + 86400000);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10).replace(/-/g, '');
  const datesToFetch = WC_DATES.filter(d => d <= tomorrowStr);
  if (!datesToFetch.length) return cachedScores;

  const scores = {};
  const results = await Promise.allSettled(
    datesToFetch.map(async date => {
      const r = await fetch(`${ESPN_SOCCER}?dates=${date}`);
      if (!r.ok) return [];
      const d = await r.json();
      return d.events || [];
    })
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const event of result.value) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const status = comp.status?.type?.state || 'pre';
      if (status === 'pre') continue;
      const teams = comp.competitors || [];
      if (teams.length < 2) continue;
      const home = teams.find(t => t.homeAway === 'home') || teams[0];
      const away = teams.find(t => t.homeAway === 'away') || teams[1];
      const key = `${home.team?.displayName} vs ${away.team?.displayName}`;
      scores[key] = {
        t1: { name: home.team?.displayName || '', score: parseInt(home.score) || 0 },
        t2: { name: away.team?.displayName || '', score: parseInt(away.score) || 0 },
        status,
        statusDetail: comp.status?.type?.shortDetail || '',
      };
    }
  }

  cachedScores = scores;
  lastScoresFetch = now;
  return scores;
}

// Group stage teams + pairs (mirrors app.js) for server-side auto-results
const SRV_GROUP_TEAMS = {
  A:[{n:'Mexico'},{n:'South Korea'},{n:'South Africa'},{n:'Czech Republic'}],
  B:[{n:'Switzerland'},{n:'Canada'},{n:'Qatar'},{n:'Bosnia'}],
  C:[{n:'Brazil'},{n:'Morocco'},{n:'Scotland'},{n:'Haiti'}],
  D:[{n:'USA'},{n:'Australia'},{n:'Paraguay'},{n:'Turkey'}],
  E:[{n:'Germany'},{n:'Ecuador'},{n:'Ivory Coast'},{n:'Curacao'}],
  F:[{n:'Netherlands'},{n:'Japan'},{n:'Tunisia'},{n:'Sweden'}],
  G:[{n:'Belgium'},{n:'Iran'},{n:'Egypt'},{n:'New Zealand'}],
  H:[{n:'Spain'},{n:'Uruguay'},{n:'Saudi Arabia'},{n:'Cape Verde'}],
  I:[{n:'France'},{n:'Senegal'},{n:'Norway'},{n:'Iraq'}],
  J:[{n:'Argentina'},{n:'Austria'},{n:'Algeria'},{n:'Jordan'}],
  K:[{n:'Portugal'},{n:'Colombia'},{n:'Uzbekistan'},{n:'DR Congo'}],
  L:[{n:'England'},{n:'Croatia'},{n:'Panama'},{n:'Ghana'}],
};
const SRV_PAIRS = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];

async function autoUpdateWCResults(scores) {
  if (!scores || !Object.keys(scores).length || !memoryState) return;
  const results = { ...(memoryState.results || {}) };
  let changed = 0;

  for (const [grp, teams] of Object.entries(SRV_GROUP_TEAMS)) {
    SRV_PAIRS.forEach(([i, j], gameIdx) => {
      const gid = `groups-${grp.toLowerCase()}-${gameIdx}`;
      if (results[gid] !== undefined) return;
      const t1 = teams[i].n, t2 = teams[j].n;
      for (const sc of Object.values(scores)) {
        if (sc.status !== 'post') continue;
        const fwd = matchWCTeam(sc.t1.name, t1) && matchWCTeam(sc.t2.name, t2);
        const rev = matchWCTeam(sc.t1.name, t2) && matchWCTeam(sc.t2.name, t1);
        if (!fwd && !rev) continue;
        const s1 = fwd ? sc.t1.score : sc.t2.score;
        const s2 = fwd ? sc.t2.score : sc.t1.score;
        results[gid] = s1 > s2 ? t1 : s2 > s1 ? t2 : 'Draw';
        console.log(`Auto-result: ${gid} → ${results[gid]}`);
        changed++;
        break;
      }
    });
  }

  if (changed > 0) {
    memoryState.results = results;
    try { await writeState(memoryState); } catch (e) { console.error('Auto-result save failed:', e.message); }
  }
}

app.get('/api/scores', async (req, res) => {
  try {
    const scores = await fetchESPNScores();
    await autoUpdateWCResults(scores);
    res.json(scores);
  } catch (e) {
    console.error('GET /api/scores error:', e.message);
    res.json({});
  }
});

// ── HEALTH CHECK ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    memoryCache: !!memoryState,
    lastJsonBinSync: lastJsonBinRead ? new Date(lastJsonBinRead).toISOString() : null,
  });
});

// ── GRACEFUL SHUTDOWN ────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n${signal} received. Syncing state to JSONBin...`);
  if (memoryState) {
    try {
      await writeState(memoryState);
      console.log('State synced. Shutting down.');
    } catch (e) {
      console.error('Final sync failed:', e.message);
    }
  }
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

app.listen(PORT, () => {
  console.log(`World Cup 2026 Pool running at http://localhost:${PORT}`);

  // ── KEEP-ALIVE PING (Render free tier) ──────────────────────
  // Pings self every 14 minutes to prevent the server sleeping
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  if (process.env.RENDER_EXTERNAL_URL) {
    setInterval(() => {
      fetch(`${SELF_URL}/api/health`)
        .then(() => console.log('Keep-alive ping sent'))
        .catch(e => console.warn('Keep-alive ping failed:', e.message));
    }, 14 * 60 * 1000);
  }
});
