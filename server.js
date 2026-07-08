const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE          = path.join(DATA_DIR, 'state.json');
const DATA_BASELINE_FILE = path.join(DATA_DIR, 'state-baseline.json');

// JSONBin.io persistent storage
const JSONBIN_ID  = '69b9bc23c3097a1dd5342b3b';
const JSONBIN_KEY = process.env.JSONBIN_KEY || '$2a$10$W6vNvtSScYKU7ztHnivVI.1PhiLvrklCsgk5GcOXtdi.Kg6Ppd2c6';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Compute a short content hash of app.js + styles.css at startup.
// This becomes a ?v= query param injected into index.html, busting CDN/browser
// caches automatically whenever either file changes between deploys.
function fileHash(file) {
  try { return crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, file))).digest('hex').slice(0, 8); }
  catch { return Date.now().toString(36); }
}
const ASSET_VER = fileHash('app.js') + fileHash('styles.css');

// Serve index.html with versioned asset URLs to defeat CDN/browser caching
const RAW_HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const VERSIONED_HTML = RAW_HTML
  .replace('src="app.js"',         `src="app.js?v=${ASSET_VER}"`)
  .replace('href="styles.css"',    `href="styles.css?v=${ASSET_VER}"`);

app.use(express.json({ limit: '1mb' }));

// Serve index.html (and /bracket, /picks etc. if needed) with versioned assets
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(VERSIONED_HTML);
});

// Prevent CDN/browsers from caching JS/CSS (versioned URLs make this belt-and-suspenders)
app.use((req, res, next) => {
  if (/\.(js|css)(\?.*)?$/.test(req.path)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

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

// ── Startup floor: prevents stale JSONBin deploys from rolling back progress ──
// Update MIN_ROUND when the tournament advances beyond the current floor.
const ROUND_ORDER = ['groups','r32','r16','qf','sf','third','final'];
const MIN_ROUND        = 'qf';    // R16 is complete — never fall back below QF
const MIN_ROUND_STATUS = 'open';  // stale snapshots arrive locked — reset to open

function applyStartupFloor(data) {
  const minIdx = ROUND_ORDER.indexOf(MIN_ROUND);
  const curIdx = ROUND_ORDER.indexOf(data.currentRound || 'groups');
  if (curIdx < minIdx) {
    console.log(`[floor] Correcting stale round: ${data.currentRound} → ${MIN_ROUND} (status: ${data.roundStatus} → ${MIN_ROUND_STATUS})`);
    data.currentRound = MIN_ROUND;
    data.roundStatus  = MIN_ROUND_STATUS;
    // Write correction back to JSONBin so subsequent reads are already correct
    writeState(data).catch(e => console.warn('[floor] JSONBin correction write failed:', e.message));
  }
  return data;
}

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
      applyStartupFloor(data);
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
        const data = JSON.parse(raw);
        applyStartupFloor(data);
        memoryState = data;
        return memoryState;
      }
    }
  } catch (e) { /* ignore */ }

  // Last resort: read the committed baseline snapshot (present on Render when JSONBin
  // is unavailable and data/state.json doesn't exist, e.g. quota exhausted on deploy).
  try {
    if (fs.existsSync(DATA_BASELINE_FILE)) {
      const raw = fs.readFileSync(DATA_BASELINE_FILE, 'utf8');
      if (raw.trim()) {
        const data = JSON.parse(raw);
        applyStartupFloor(data);
        memoryState = data;
        console.log('[readState] Loaded from committed state-baseline.json (JSONBin unavailable)');
        return memoryState;
      }
    }
  } catch (e) { /* ignore */ }
  return {};
}

// ── PICKS BACKUP ─────────────────────────────────────────────
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 20;
let lastBackupPicksHash = null;

function picksHash(picks) {
  return JSON.stringify(picks || {});
}

function writePicksBackup(picks) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const ts  = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(BACKUP_DIR, `picks-${ts}.json`);
    fs.writeFileSync(file, JSON.stringify({ savedAt: new Date().toISOString(), picks }, null, 2), 'utf8');
    // Keep only the most recent MAX_BACKUPS files
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('picks-')).sort();
    while (files.length > MAX_BACKUPS) {
      try { fs.unlinkSync(path.join(BACKUP_DIR, files.shift())); } catch (_) {}
    }
    console.log(`Picks backup written: ${path.basename(file)}`);
  } catch (e) {
    console.warn('Picks backup write failed:', e.message);
  }
}

// ── Helper: write state to memory + local + JSONBin ─────────
async function writeState(data) {
  memoryState = data;
  lastJsonBinRead = Date.now();

  // Snapshot picks whenever they change (guards against accidental clears)
  const hash = picksHash(data.picks);
  if (hash !== lastBackupPicksHash && data.picks && Object.keys(data.picks).length > 0) {
    const totalPicks = Object.values(data.picks).reduce((sum, p) =>
      sum + Object.values(p).reduce((s2, r) => s2 + Object.keys(r).length, 0), 0);
    if (totalPicks > 0) {
      writePicksBackup(data.picks);
      lastBackupPicksHash = hash;
    }
  }

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
                             'defaultPlayersKey', 'bonusAnswers', 'r32Teams',
                             'roundDeadlines', 'broadcast'];
        adminFields.forEach(field => {
          if (incoming[field] === undefined) return;
          // bonusAnswers: merge; r32Teams: only update when non-empty — both protect against
          // stale client state wiping server values set via direct POST
          if (field === 'bonusAnswers') {
            if (incoming[field] && Object.keys(incoming[field]).length > 0) {
              // Protect correct answers from being overwritten by stale or downgraded admin saves:
              // 1. Skip empty strings (unset admin panel selects)
              // 2. Skip string values that are already in the existing array
              //    (admin panel can only show one option of a tied answer — don't downgrade)
              const toMerge = {};
              const existingAnswers = existing[field] || {};
              for (const [k, v] of Object.entries(incoming[field])) {
                const isEmpty = v === '' || v == null ||
                  (Array.isArray(v) && (v.length === 0 || v.every(x => !x)));
                if (isEmpty) continue;
                const existingVal = existingAnswers[k];
                // Don't downgrade an array answer to a single string if the string is in the array
                if (Array.isArray(existingVal) && !Array.isArray(v) && existingVal.includes(v)) continue;
                toMerge[k] = v;
              }
              if (Object.keys(toMerge).length > 0) {
                existing[field] = { ...existingAnswers, ...toMerge };
              }
            }
          } else if (field === 'r32Teams') {
            // Must be a non-empty object with region keys A/B/C/D (not game-ID keyed)
            if (incoming[field] && typeof incoming[field] === 'object' &&
                !Array.isArray(incoming[field]) && incoming[field]['A']) {
              existing[field] = incoming[field];
            }
          } else if (field === 'currentRound') {
            // Round ratchet: only advance or stay the same unless _setRound flag is present
            const ORDER = ['groups','r32','r16','qf','sf','third','final'];
            const exIdx = ORDER.indexOf(existing.currentRound || 'groups');
            const inIdx = ORDER.indexOf(incoming.currentRound || 'groups');
            if (incoming._setRound || inIdx >= exIdx) {
              existing[field] = incoming[field];
            }
          } else {
            existing[field] = incoming[field];
          }
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

      if (incoming.picks) {
        if (!existing.picks) existing.picks = {};
        if (sender) {
          // Merge per-round so a client sending empty rounds can't wipe stored picks.
          // A round is only updated when the incoming data is non-empty.
          if (!existing.picks[sender]) existing.picks[sender] = {};
          const inPicks = incoming.picks[sender] || {};
          for (const [rnd, rndPicks] of Object.entries(inPicks)) {
            if (rndPicks && Object.keys(rndPicks).length > 0) {
              existing.picks[sender][rnd] = rndPicks;
            }
            // empty round object silently ignored — never wipes stored picks
          }
        } else {
          // Senderless: only allow if DB has no picks yet (initial setup only).
          const hasExistingPicks = Object.keys(existing.picks).length > 0;
          if (!hasExistingPicks) existing.picks = incoming.picks;
        }
      }

      if (incoming.bonusPicks && sender) {
        if (!existing.bonusPicks) existing.bonusPicks = {};
        // Same protection: only merge non-empty bonus picks
        if (!existing.bonusPicks[sender]) existing.bonusPicks[sender] = {};
        const inBP = incoming.bonusPicks[sender] || {};
        for (const [key, val] of Object.entries(inBP)) {
          if (val !== '' && val != null && !(Array.isArray(val) && val.length === 0)) {
            existing.bonusPicks[sender][key] = val;
          }
        }
      } else if (incoming.bonusPicks && !sender) {
        // Senderless: only allow if DB has no bonus picks yet (initial setup only).
        const hasExistingBP = existing.bonusPicks && Object.keys(existing.bonusPicks).length > 0;
        if (!hasExistingBP) existing.bonusPicks = incoming.bonusPicks;
      }

      // Reactions: any player can update (fun feature, not score-critical)
      if (incoming.reactions) {
        if (!existing.reactions) existing.reactions = {};
        for (const [gid, emojis] of Object.entries(incoming.reactions)) {
          existing.reactions[gid] = emojis;
        }
      }

      // pickSavedAt: each player writes only their own entry
      if (incoming.pickSavedAt) {
        if (!existing.pickSavedAt) existing.pickSavedAt = {};
        if (sender && incoming.pickSavedAt[sender]) {
          existing.pickSavedAt[sender] = incoming.pickSavedAt[sender];
        } else if (!sender) {
          existing.pickSavedAt = incoming.pickSavedAt;
        }
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
  '20260702','20260703','20260704','20260705','20260706','20260707','20260709','20260710',
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

  const todayStr   = new Date(now).toISOString().slice(0, 10).replace(/-/g, '');
  const tomorrowStr = new Date(now + 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  const weekAhead   = new Date(now + 7 * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  // Past + today + tomorrow for live/results; up to 7 days ahead for scheduled kickoff times
  const datesToFetch = WC_DATES.filter(d => d <= tomorrowStr || d <= weekAhead);
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
      const teams = comp.competitors || [];
      if (teams.length < 2) continue;
      const home = teams.find(t => t.homeAway === 'home') || teams[0];
      const away = teams.find(t => t.homeAway === 'away') || teams[1];
      const key = `${home.team?.displayName} vs ${away.team?.displayName}`;
      const link = event.links?.find(l => l.rel?.includes('clubhouse'))?.href
        || `https://www.espn.com/soccer/match/_/gameId/${event.id}`;
      if (status === 'pre') {
        scores[key] = {
          t1: { name: home.team?.displayName || '', score: null },
          t2: { name: away.team?.displayName || '', score: null },
          status: 'pre',
          statusDetail: comp.status?.type?.shortDetail || '',
          scheduledDate: event.date || null,
          link,
        };
        continue;
      }
      scores[key] = {
        t1: { name: home.team?.displayName || '', score: parseInt(home.score) || 0, winner: home.winner === true },
        t2: { name: away.team?.displayName || '', score: parseInt(away.score) || 0, winner: away.winner === true },
        status,
        statusDetail: comp.status?.type?.shortDetail || '',
        scheduledDate: event.date || null,
        link,
      };
      // Parse penalty shootout score from ESPN notes: "[Winner] advance X-Y on penalties"
      const penNote = comp.notes?.find(n => /advance \d+-\d+ on penalties/i.test(n.text || ''));
      if (penNote) {
        const m = (penNote.text || '').match(/advance (\d+)-(\d+) on penalties/i);
        if (m) {
          const winScore = parseInt(m[1]), loseScore = parseInt(m[2]);
          // t1=home, t2=away; winner flag determines which scored more
          scores[key].pks = home.winner === true
            ? { t1: winScore, t2: loseScore }
            : { t1: loseScore, t2: winScore };
        }
      }
    }
  }

  cachedScores = scores;
  lastScoresFetch = now;
  return scores;
}

// Group stage teams + pairs (mirrors app.js) for server-side auto-results
// Order determines fixture pairings: MD1: t0vt1, t2vt3 | MD2: t0vt2, t1vt3 | MD3: t0vt3, t1vt2
const SRV_GROUP_TEAMS = {
  A:[{n:'Mexico'},{n:'South Africa'},{n:'South Korea'},{n:'Czech Republic'}],
  B:[{n:'Canada'},{n:'Bosnia'},{n:'Qatar'},{n:'Switzerland'}],
  C:[{n:'Brazil'},{n:'Morocco'},{n:'Haiti'},{n:'Scotland'}],
  D:[{n:'USA'},{n:'Paraguay'},{n:'Australia'},{n:'Turkey'}],
  E:[{n:'Germany'},{n:'Curacao'},{n:'Ivory Coast'},{n:'Ecuador'}],
  F:[{n:'Netherlands'},{n:'Japan'},{n:'Sweden'},{n:'Tunisia'}],
  G:[{n:'Belgium'},{n:'Egypt'},{n:'Iran'},{n:'New Zealand'}],
  H:[{n:'Spain'},{n:'Cape Verde'},{n:'Saudi Arabia'},{n:'Uruguay'}],
  I:[{n:'France'},{n:'Senegal'},{n:'Iraq'},{n:'Norway'}],
  J:[{n:'Argentina'},{n:'Algeria'},{n:'Austria'},{n:'Jordan'}],
  K:[{n:'Portugal'},{n:'DR Congo'},{n:'Uzbekistan'},{n:'Colombia'}],
  L:[{n:'England'},{n:'Croatia'},{n:'Ghana'},{n:'Panama'}],
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

  // R32 auto-results from r32Teams
  const r32Teams = memoryState.r32Teams || {};
  for (const [region, teams] of Object.entries(r32Teams)) {
    for (let i = 0; i < 4; i++) {
      const gid = `r32-${region.toLowerCase()}-${i}`;
      if (results[gid] !== undefined) continue;
      const t1 = teams[i * 2]?.name, t2 = teams[i * 2 + 1]?.name;
      if (!t1 || !t2) continue;
      for (const sc of Object.values(scores)) {
        if (sc.status !== 'post') continue;
        const fwd = matchWCTeam(sc.t1.name, t1) && matchWCTeam(sc.t2.name, t2);
        const rev = matchWCTeam(sc.t1.name, t2) && matchWCTeam(sc.t2.name, t1);
        if (!fwd && !rev) continue;
        const s1 = fwd ? sc.t1.score : sc.t2.score;
        const s2 = fwd ? sc.t2.score : sc.t1.score;
        const w1 = fwd ? sc.t1.winner : sc.t2.winner;
        if (s1 > s2) { results[gid] = t1; }
        else if (s2 > s1) { results[gid] = t2; }
        else if (w1 !== undefined) { results[gid] = w1 ? t1 : t2; }
        else { break; }
        const isPens = (sc.statusDetail || '').toLowerCase().includes('pen');
        if (isPens) {
          if (!memoryState.scores) memoryState.scores = {};
          const existing = memoryState.scores[gid] || {};
          // fwd: sc.t1=game t1, sc.t2=game t2; rev: flipped — correct pks direction accordingly
          const apiPks = sc.pks ? (fwd ? sc.pks : { t1: sc.pks.t2, t2: sc.pks.t1 }) : null;
          memoryState.scores[gid] = { ...existing, t1: s1, t2: s2, pens: true, ...(apiPks ? { pks: apiPks } : {}) };
        }
        console.log(`Auto-result R32: ${gid} → ${results[gid]}`);
        changed++;
        break;
      }
    }
  }

  if (changed > 0) {
    memoryState.results = results;
    try { await writeState(memoryState); } catch (e) { console.error('Auto-result save failed:', e.message); }
  }
}

// R16 dates — all games on these days are Round of 16
const R16_DATES = new Set(['2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07']);

async function autoUpdateR16Bonuses(scores) {
  if (!memoryState) return;
  // Skip if both answers already set
  if (memoryState.bonusAnswers?.r16_goals && memoryState.bonusAnswers?.r16_pks) return;

  const r16Games = Object.values(scores).filter(sc =>
    sc.status === 'post' && R16_DATES.has((sc.scheduledDate || '').slice(0, 10))
  );
  if (r16Games.length < 8) return; // wait until all 8 are complete

  let totalGoals = 0, pkCount = 0;
  for (const sc of r16Games) {
    totalGoals += (sc.t1.score || 0) + (sc.t2.score || 0);
    if (sc.pks || /pen/i.test(sc.statusDetail || '')) pkCount++;
  }

  if (!memoryState.bonusAnswers) memoryState.bonusAnswers = {};
  memoryState.bonusAnswers.r16_goals = String(totalGoals);
  memoryState.bonusAnswers.r16_pks   = String(pkCount);
  console.log(`Auto R16 bonuses: goals=${totalGoals}, pks=${pkCount}`);
  try { await writeState(memoryState); } catch (e) { console.error('R16 bonus save failed:', e.message); }
}

app.get('/api/scores', async (req, res) => {
  try {
    const scores = await fetchESPNScores();
    await autoUpdateWCResults(scores);
    await autoUpdateR16Bonuses(scores);
    res.json(scores);
  } catch (e) {
    console.error('GET /api/scores error:', e.message);
    res.json({});
  }
});

// ── LIVE STATS (Bonus Tracker) ────────────────────────────────

const CONF_MAP = {
  'Czech Republic':'UEFA','Bosnia':'UEFA','Switzerland':'UEFA','Scotland':'UEFA',
  'Turkey':'UEFA','Germany':'UEFA','Netherlands':'UEFA','Sweden':'UEFA',
  'Belgium':'UEFA','Spain':'UEFA','France':'UEFA','Norway':'UEFA',
  'Austria':'UEFA','Portugal':'UEFA','England':'UEFA','Croatia':'UEFA',
  'Brazil':'CONMEBOL','Paraguay':'CONMEBOL','Ecuador':'CONMEBOL',
  'Uruguay':'CONMEBOL','Argentina':'CONMEBOL','Colombia':'CONMEBOL',
  'South Africa':'CAF','Morocco':'CAF','Ivory Coast':'CAF','Tunisia':'CAF',
  'Egypt':'CAF','Cape Verde':'CAF','Senegal':'CAF','Algeria':'CAF',
  'DR Congo':'CAF','Ghana':'CAF',
  'South Korea':'AFC','Qatar':'AFC','Australia':'AFC','Japan':'AFC',
  'Iran':'AFC','Saudi Arabia':'AFC','Iraq':'AFC','Jordan':'AFC','Uzbekistan':'AFC',
  'Mexico':'CONCACAF','Canada':'CONCACAF','Haiti':'CONCACAF',
  'Curacao':'CONCACAF','USA':'CONCACAF','Panama':'CONCACAF',
  'New Zealand':'OFC',
};

let liveStatsCache    = null;
let lastLiveStatsFetch = 0;
const LIVE_STATS_TTL  = 60 * 60 * 1000; // 1 hour

const AS_HDRS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchAsHtml(path) {
  const r = await fetch(`https://en.as.com/resultados/futbol/mundial/2026/ranking${path}`, { headers: AS_HDRS });
  if (!r.ok) throw new Error(`AS.com ${r.status}`);
  return r.text();
}

function parseAsTeamTable(html) {
  const tbody = (html.match(/<tbody>([\s\S]+?)<\/tbody>/) || [])[1] || '';
  return tbody.split('<tr>').slice(1).map((row, i) => {
    const team = (row.match(/class="a_tb_tn _hidden-xs">([^<]+)<\/span>/) || [])[1]?.trim();
    const val  = (row.match(/class="a_tb_rk">([^<]+)<\/td>/)  || [])[1]?.trim();
    return (team && val) ? { pos: i + 1, team, value: val } : null;
  }).filter(Boolean);
}

function parseAsPlayerTable(html) {
  const tbody = (html.match(/<tbody>([\s\S]+?)<\/tbody>/) || [])[1] || '';
  return tbody.split('<tr>').slice(1).map((row, i) => {
    const player = (row.match(/class="player_a"[^>]*>\s*([^<]+?)\s*<\/a>/) || [])[1]?.trim();
    const team   = (row.match(/<span class="_hidden-xs">([^<]+)<\/span>/) || [])[1]?.trim();
    const goals  = parseInt((row.match(/class="a_tb_rk">(\d+)<\/td>/) || [])[1] || '0');
    return (player && team) ? { pos: i + 1, player, team, goals } : null;
  }).filter(Boolean);
}

function computeConfWinRate(results) {
  const conf = {};
  Object.values(CONF_MAP).forEach(c => { if (!conf[c]) conf[c] = { wins: 0, games: 0 }; });

  for (const [gid, winner] of Object.entries(results || {})) {
    if (!gid.startsWith('groups-')) continue;
    const parts = gid.split('-');
    const grp   = parts[1].toUpperCase();
    const gi    = parseInt(parts[2]);
    if (isNaN(gi) || !SRV_PAIRS[gi]) continue;
    const teams = SRV_GROUP_TEAMS[grp];
    if (!teams) continue;
    const [a, b] = SRV_PAIRS[gi];
    const t1 = teams[a].n, t2 = teams[b].n;
    const c1 = CONF_MAP[t1], c2 = CONF_MAP[t2];

    if (winner === 'Draw') {
      if (c1) conf[c1].games++;
      if (c2) conf[c2].games++;
    } else {
      const wc = CONF_MAP[winner];
      const lc = CONF_MAP[winner === t1 ? t2 : t1];
      if (wc) { conf[wc].wins++; conf[wc].games++; }
      if (lc) conf[lc].games++;
    }
  }

  return Object.entries(conf)
    .filter(([, d]) => d.games > 0)
    .map(([name, d]) => ({ conf: name, wins: d.wins, games: d.games, rate: Math.round(d.wins / d.games * 1000) / 10 }))
    .sort((a, b) => b.rate - a.rate || b.wins - a.wins);
}

function computeHighestMargin(scores) {
  let best = { margin: 0, label: null };
  for (const sc of Object.values(scores || {})) {
    if (sc.status !== 'post') continue;
    const margin = Math.abs(sc.t1.score - sc.t2.score);
    if (margin > best.margin) {
      const w = sc.t1.score >= sc.t2.score ? sc.t1 : sc.t2;
      const l = sc.t1.score >= sc.t2.score ? sc.t2 : sc.t1;
      best = { margin, label: `${w.name} ${Math.max(sc.t1.score, sc.t2.score)}-${Math.min(sc.t1.score, sc.t2.score)} ${l.name}` };
    }
  }
  return best.margin > 0 ? best : null;
}

async function refreshLiveStats() {
  try {
    const [possRes, bootRes, goalsRes] = await Promise.allSettled([
      fetchAsHtml('/equipos/porcentaje-de-posesion/'),
      fetchAsHtml('/jugadores/goles/'),
      fetchAsHtml('/equipos/goles/'),
    ]);

    const possession = possRes.status === 'fulfilled' ? parseAsTeamTable(possRes.value).slice(0, 25) : null;
    const goldenBoot = bootRes.status === 'fulfilled' ? parseAsPlayerTable(bootRes.value).slice(0, 20) : null;
    const teamGoals  = goalsRes.status === 'fulfilled' ? parseAsTeamTable(goalsRes.value) : null;

    const confWinRate = computeConfWinRate((memoryState || {}).results);

    let highestMargin = null;
    try {
      const espnScores = await fetchESPNScores();
      highestMargin = computeHighestMargin(espnScores);
    } catch (_) { /* ignore */ }

    liveStatsCache = { possession, goldenBoot, teamGoals, confWinRate, highestMargin, lastUpdated: new Date().toISOString() };
    lastLiveStatsFetch = Date.now();
    console.log('Live stats refreshed ok');
  } catch (e) {
    console.warn('Live stats refresh error:', e.message);
  }
}

app.get('/api/live-stats', async (req, res) => {
  if (!liveStatsCache || Date.now() - lastLiveStatsFetch > LIVE_STATS_TTL) {
    await refreshLiveStats();
  }
  if (!liveStatsCache) return res.json({});
  // confWinRate and highestMargin are cheap to compute from in-memory data — always fresh
  const fresh = {
    ...liveStatsCache,
    confWinRate:   computeConfWinRate((memoryState || {}).results),
    highestMargin: computeHighestMargin(cachedScores),
  };
  res.json(fresh);
});

// Initial refresh 5s after boot, then every hour
setTimeout(() => refreshLiveStats(), 5000);
setInterval(() => refreshLiveStats(), LIVE_STATS_TTL);

// ── PICKS BACKUP ENDPOINTS ────────────────────────────────────

// List available backup files
app.get('/api/picks-backups', async (req, res) => {
  try {
    const state = await readState();
    const sender = req.query._sender;
    if (!isAdminSender(sender, state)) return res.status(403).json({ error: 'Admin only' });
    if (!fs.existsSync(BACKUP_DIR)) return res.json({ backups: [] });
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('picks-')).sort().reverse();
    const backups = files.map(f => {
      try {
        const raw = fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8');
        const data = JSON.parse(raw);
        const totalPicks = Object.values(data.picks || {}).reduce((sum, p) =>
          sum + Object.values(p).reduce((s2, r) => s2 + Object.keys(r).length, 0), 0);
        const playerCount = Object.keys(data.picks || {}).length;
        return { filename: f, savedAt: data.savedAt, totalPicks, playerCount };
      } catch (_) { return { filename: f }; }
    });
    res.json({ backups });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Download a specific backup file
app.get('/api/picks-backup/:filename', async (req, res) => {
  try {
    const state = await readState();
    const sender = req.query._sender;
    if (!isAdminSender(sender, state)) return res.status(403).json({ error: 'Admin only' });
    const file = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, ''); // sanitise
    const filePath = path.join(BACKUP_DIR, file);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Restore picks from a backup (admin only)
app.post('/api/picks-restore', async (req, res) => {
  try {
    const result = await withWriteLock(async () => {
      const existing = await readState();
      const sender = req.body._sender;
      if (!isAdminSender(sender, existing)) return res.status(403).json({ error: 'Admin only' });
      const { picks } = req.body;
      if (!picks || typeof picks !== 'object') return res.status(400).json({ error: 'picks required' });
      existing.picks = picks;
      await writeState(existing);
      return { ok: true, playerCount: Object.keys(picks).length };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/picks/:playerId ────────────────────────────────
// Dedicated, player-isolated pick save. Enforces round locking server-side.
app.post('/api/picks/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { roundId, picks, bonusPicks, _sender } = req.body;

    if (!_sender || _sender !== playerId) {
      return res.status(403).json({ error: 'Sender must match player' });
    }
    if (!roundId || typeof picks !== 'object') {
      return res.status(400).json({ error: 'roundId and picks are required' });
    }

    const result = await withWriteLock(async () => {
      const existing = await readState();

      const playerExists = existing.players?.some(p => p.id === playerId);
      if (!playerExists) return { error: 'Player not found', status: 404 };

      if (roundId === existing.currentRound &&
          (existing.roundStatus === 'locked' || existing.roundStatus === 'closed')) {
        return { error: 'Round is locked — picks cannot be changed', status: 403 };
      }

      if (!existing.picks) existing.picks = {};
      if (!existing.picks[playerId]) existing.picks[playerId] = {};
      // Guard: never overwrite existing non-empty picks with an empty object
      const hasExistingPicks = Object.keys(existing.picks[playerId][roundId] || {}).length > 0;
      if (Object.keys(picks).length === 0 && hasExistingPicks) {
        return { error: 'Cannot overwrite existing picks with empty set', status: 400 };
      }
      existing.picks[playerId][roundId] = picks;

      if (bonusPicks && typeof bonusPicks === 'object') {
        if (!existing.bonusPicks) existing.bonusPicks = {};
        if (!existing.bonusPicks[playerId]) existing.bonusPicks[playerId] = {};
        Object.assign(existing.bonusPicks[playerId], bonusPicks);
      }

      if (!existing.pickSavedAt) existing.pickSavedAt = {};
      if (!existing.pickSavedAt[playerId]) existing.pickSavedAt[playerId] = {};
      existing.pickSavedAt[playerId][roundId] = new Date().toISOString();

      await writeState(existing);
      return { ok: true };
    });

    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    res.json(result);
  } catch (e) {
    console.error('POST /api/picks error:', e.message);
    res.status(500).json({ error: e.message });
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

// ── STARTUP PICKS PROTECTION ─────────────────────────────────
// On every deploy, merge the git-committed baselines into the live JSONBin state.
// Additive-only: picks/bonusPicks already in JSONBin are kept as-is;
// only keys that are MISSING from the live state get filled in.
// data/state.json is gitignored (local only); data/bonus-picks-baseline.json is
// committed and available on Render — it provides bonus picks restore on redeploy.
const BONUS_BASELINE_FILE = path.join(DATA_DIR, 'bonus-picks-baseline.json');

async function startupPicksProtection() {
  try {
    let baseline = null;
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      if (raw.trim()) baseline = JSON.parse(raw);
    } catch (_) {}

    // Fallback: load bonus picks from the committed baseline file (available on Render)
    let bonusBaseline = baseline?.bonusPicks || null;
    if (!bonusBaseline) {
      try {
        const raw = fs.readFileSync(BONUS_BASELINE_FILE, 'utf8');
        if (raw.trim()) bonusBaseline = JSON.parse(raw);
      } catch (_) {}
    }

    if (!baseline && !bonusBaseline) return;

    const live = await readState();
    let changed = false;

    // Merge picks (nested: playerId -> roundId -> picks object)
    if (baseline) {
      const livePicks = live.picks || {};
      for (const [pid, rounds] of Object.entries(baseline.picks || {})) {
        if (!livePicks[pid]) { livePicks[pid] = rounds; changed = true; continue; }
        for (const [rnd, picks] of Object.entries(rounds)) {
          if (!livePicks[pid][rnd] || Object.keys(livePicks[pid][rnd]).length === 0) {
            livePicks[pid][rnd] = picks; changed = true;
          }
        }
      }
      live.picks = livePicks;
    }

    // Merge bonusPicks (nested: playerId -> bonusKey -> value)
    if (bonusBaseline) {
      const liveBP = live.bonusPicks || {};
      for (const [pid, bpData] of Object.entries(bonusBaseline)) {
        if (!liveBP[pid]) { liveBP[pid] = bpData; changed = true; continue; }
        for (const [key, val] of Object.entries(bpData)) {
          if (!liveBP[pid][key]) { liveBP[pid][key] = val; changed = true; }
        }
      }
      live.bonusPicks = liveBP;
    }

    if (changed) {
      await writeState(live);
      console.log('[startup] Picks protection: merged missing picks from baseline');
    } else {
      console.log('[startup] Picks protection: live state is complete, no merge needed');
    }
  } catch (e) {
    console.warn('[startup] Picks protection error:', e.message);
  }
}

app.listen(PORT, () => {
  console.log(`World Cup 2026 Pool running at http://localhost:${PORT}`);

  // Run picks protection 3s after boot so JSONBin has time to respond
  setTimeout(() => startupPicksProtection(), 3000);

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
