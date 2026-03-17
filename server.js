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
});
