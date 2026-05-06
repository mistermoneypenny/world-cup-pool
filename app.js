/* ============================================================
   WORLD CUP 2026 PICK-BY-ROUND POOL
   ============================================================
   Structure: 48-team tournament — Group Stage + Knockout.
   GROUP_TEAMS: 12 groups (A–L), 4 teams each, 6 round-robin
     games per group = 72 total group stage games.
     Seeds = FIFA Coca-Cola World Rankings (lower = stronger).
   INITIAL_TEAMS: 32 knockout teams, 4 quadrants (A/B/C/D),
     8 per quadrant in R32 matchup pairs. Admin updates these
     after the group stage concludes.
   6 rounds: Group Stage → R32 → R16 → QF → SF → Final.
   ============================================================ */

// ── CONSTANTS ─────────────────────────────────────────────────

const ROUND_CONFIG = [
  { id: 'groups', label: 'Group Stage',    short: 'GRP',   pts: 1,  multiplier: 1.0 },
  { id: 'r32',    label: 'Round of 32',    short: 'R32',   pts: 2,  multiplier: 1.2 },
  { id: 'r16',    label: 'Round of 16',    short: 'R16',   pts: 3,  multiplier: 1.4 },
  { id: 'qf',     label: 'Quarterfinals',  short: 'QF',    pts: 5,  multiplier: 1.6 },
  { id: 'sf',     label: 'Semifinals',     short: 'SF',    pts: 8,  multiplier: 1.8 },
  { id: 'final',  label: 'Final',          short: 'FINAL', pts: 15, multiplier: 2.0 },
];

// -- CONFEDERATION LIST (for bonus dropdown) -----------------------
const CONFEDERATIONS = [
  'UEFA (Europe)',
  'CONMEBOL (South America)',
  'CONCACAF (N/C America & Caribbean)',
  'CAF (Africa)',
  'AFC (Asia)',
  'OFC (Oceania)',
];

// -- BONUS QUESTIONS PER ROUND ------------------------------------
const BONUS_CONFIG = {
  groups: [
    { id: 'grp_draws', label: 'Total Draws in the Group Stage', points: 8, type: 'select', options: Array.from({length: 37}, (_, i) => String(i)) },
    { id: 'grp_conf',  label: 'Confederation with Most Group Stage Wins', points: 6, type: 'select', options: CONFEDERATIONS },
  ],
  r32: [
    { id: 'r32_conf', label: 'Most Successful Confederation (R32+)', points: 4, type: 'select', options: CONFEDERATIONS },
  ],
  r16: [
    { id: 'r16_shootouts', label: 'Number of Penalty Shootouts in R32', points: 6, type: 'select', options: Array.from({length: 17}, (_, i) => String(i)) },
  ],
  qf: [
    { id: 'qf_scorer', label: 'Golden Boot Leader (Player Name)', points: 10, type: 'text' },
    { id: 'qf_teams',  label: 'Name the Four Semi-Finalists', points: 20, type: 'multi', count: 4, sourceRound: 'qf' },
  ],
  sf: [
    { id: 'sf_goals', label: 'Nation with Most Total Goals', points: 6, type: 'select', options: '__ALL_TEAMS__' },
    { id: 'sf_num',   label: 'Total Goals in Both Semifinals', points: 6, type: 'select', options: Array.from({length: 21}, (_, i) => String(i)) },
  ],
};

const REGIONS = ['A', 'B', 'C', 'D'];

// Quadrant layout: left col (top→bottom) | right col (top→bottom)
const LEFT_REGIONS  = ['A', 'B'];
const RIGHT_REGIONS = ['C', 'D'];

// Left side (A + B) → SF game 0  |  Right side (C + D) → SF game 1
const SF_PAIRINGS = [
  ['A', 'B'],
  ['C', 'D'],
];

// ── TEAM DATA ─────────────────────────────────────────────────
// GROUP_TEAMS: 48 teams in 12 groups (A–L), 4 teams per group.
// Seed = FIFA Coca-Cola World Ranking (April 2026). Official draw Dec 5, 2025.
const GROUP_TEAMS = {
  A: [
    { seed: 15, name: 'Mexico'         },
    { seed: 25, name: 'South Korea'    },
    { seed: 59, name: 'South Africa'   },
    { seed: 38, name: 'Czech Republic' },
  ],
  B: [
    { seed: 19, name: 'Switzerland'    },
    { seed: 30, name: 'Canada'         },
    { seed: 55, name: 'Qatar'          },
    { seed: 63, name: 'Bosnia'         },
  ],
  C: [
    { seed:  6, name: 'Brazil'         },
    { seed:  8, name: 'Morocco'        },
    { seed: 43, name: 'Scotland'       },
    { seed: 83, name: 'Haiti'          },
  ],
  D: [
    { seed: 16, name: 'USA'            },
    { seed: 27, name: 'Australia'      },
    { seed: 41, name: 'Paraguay'       },
    { seed: 22, name: 'Turkey'         },
  ],
  E: [
    { seed: 10, name: 'Germany'        },
    { seed: 23, name: 'Ecuador'        },
    { seed: 34, name: 'Ivory Coast'    },
    { seed: 82, name: 'Curacao'        },
  ],
  F: [
    { seed:  7, name: 'Netherlands'    },
    { seed: 18, name: 'Japan'          },
    { seed: 44, name: 'Tunisia'        },
    { seed: 37, name: 'Sweden'         },
  ],
  G: [
    { seed:  9, name: 'Belgium'        },
    { seed: 20, name: 'Iran'           },
    { seed: 29, name: 'Egypt'          },
    { seed: 85, name: 'New Zealand'    },
  ],
  H: [
    { seed:  2, name: 'Spain'          },
    { seed: 17, name: 'Uruguay'        },
    { seed: 61, name: 'Saudi Arabia'   },
    { seed: 68, name: 'Cape Verde'     },
  ],
  I: [
    { seed:  1, name: 'France'         },
    { seed: 13, name: 'Senegal'        },
    { seed: 31, name: 'Norway'         },
    { seed: 57, name: 'Iraq'           },
  ],
  J: [
    { seed:  3, name: 'Argentina'      },
    { seed: 24, name: 'Austria'        },
    { seed: 28, name: 'Algeria'        },
    { seed: 64, name: 'Jordan'         },
  ],
  K: [
    { seed:  5, name: 'Portugal'       },
    { seed: 12, name: 'Colombia'       },
    { seed: 49, name: 'Uzbekistan'     },
    { seed: 46, name: 'DR Congo'       },
  ],
  L: [
    { seed:  4, name: 'England'        },
    { seed: 11, name: 'Croatia'        },
    { seed: 33, name: 'Panama'         },
    { seed: 73, name: 'Ghana'          },
  ],
};

// INITIAL_TEAMS: 32 projected knockout-round teams, 8 per quadrant, in R32 matchup pairs.
// Seeds = FIFA Coca-Cola Rankings (Apr 2026). Admin updates after group stage.
const INITIAL_TEAMS = {
  A: [
    { seed:  1, name: 'France'         },
    { seed: 38, name: 'Czech Republic' },
    { seed:  5, name: 'Portugal'       },
    { seed: 12, name: 'Colombia'       },
    { seed:  9, name: 'Belgium'        },
    { seed: 29, name: 'Egypt'          },
    { seed:  3, name: 'Argentina'      },
    { seed: 28, name: 'Algeria'        },
  ],
  B: [
    { seed:  4, name: 'England'        },
    { seed: 11, name: 'Croatia'        },
    { seed:  7, name: 'Netherlands'    },
    { seed: 18, name: 'Japan'          },
    { seed:  2, name: 'Spain'          },
    { seed: 17, name: 'Uruguay'        },
    { seed:  6, name: 'Brazil'         },
    { seed:  8, name: 'Morocco'        },
  ],
  C: [
    { seed: 10, name: 'Germany'        },
    { seed: 34, name: 'Ivory Coast'    },
    { seed: 15, name: 'Mexico'         },
    { seed: 25, name: 'South Korea'    },
    { seed: 19, name: 'Switzerland'    },
    { seed: 30, name: 'Canada'         },
    { seed: 16, name: 'USA'            },
    { seed: 22, name: 'Turkey'         },
  ],
  D: [
    { seed: 13, name: 'Senegal'        },
    { seed: 27, name: 'Australia'      },
    { seed: 20, name: 'Iran'           },
    { seed: 31, name: 'Norway'         },
    { seed: 23, name: 'Ecuador'        },
    { seed: 37, name: 'Sweden'         },
    { seed: 24, name: 'Austria'        },
    { seed: 33, name: 'Panama'         },
  ],
};

// Build sorted list of all 48 group stage team names for dropdowns
const ALL_TEAM_NAMES = Object.values(GROUP_TEAMS)
  .flat()
  .map(t => t.name)
  .sort((a, b) => a.localeCompare(b));

// Resolve the __ALL_TEAMS__ placeholder in BONUS_CONFIG
BONUS_CONFIG.sf[0].options = ALL_TEAM_NAMES;

// ── PLAYER AVATARS ────────────────────────────────────────────
const PLAYER_AVATARS = {
  'Matthias': 'Matthias.png',
  'Diego':    'Diego.png',
  'Lorenz':   'Lorenz.png',
  'Cole':     'Cole.png',
  'Commish':  'David.png',
};

function playerAvatarHtml(playerName, size = 32) {
  const file = PLAYER_AVATARS[playerName];
  if (!file) return `<span class="player-avatar-placeholder" style="width:${size}px;height:${size}px"></span>`;
  return `<img src="${file}" alt="${esc(playerName)}" class="player-avatar" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
}

const DEFAULT_PLAYERS = [
  { id: 'player1', name: 'Commish'  },
  { id: 'player2', name: 'Lorenz'   },
  { id: 'player3', name: 'Diego'    },
  { id: 'player4', name: 'Cole'     },
  { id: 'player5', name: 'Matthias' },
];

const STORAGE_KEY = 'wcPool2026';
const DEFAULT_PLAYERS_KEY = DEFAULT_PLAYERS.map(p => p.name).join(',');

// ── STATE ─────────────────────────────────────────────────────

let state = {
  currentView: 'bracket',
  currentRound: 'groups',
  roundStatus:  'open',
  activePicksRound: 'groups',
  lbRound: 'all',
  resultsRound: 'groups',
  bracketSubView: 'groups',
  players: [],
  currentPlayer: null,
  results: {},
  scores: {},   // { [gameId]: { t1: number, t2: number } }
  liveScores: {}, // ESPN live data — not persisted
  picks: {},
  pendingPicks: {},
  games: {},
  r32Teams: null,   // null = use INITIAL_TEAMS; set by admin after group stage
  adminViewPlayer: null,
  sessionPlayer:   null,
  rulesText:       '',
  bonusPicks:   {},
  bonusAnswers: {},
  playerPins:   {},
};

// ── GAME GENERATION ───────────────────────────────────────────

// Round-robin pairs for a 4-team group: all 6 unique matchups
// Matchday 1: 0v1, 2v3 | Matchday 2: 0v2, 1v3 | Matchday 3: 0v3, 1v2
const GROUP_PAIRS = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
const GROUP_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

// Scheduled dates for each group's three matchdays (FIFA World Cup 2026)
// MD1: Jun 12–17 | MD2: Jun 21–26 | MD3: Jun 29–Jul 2 (simultaneous pairs)
const MATCHDAY_DATES = {
  A: ['Jun 12', 'Jun 21', 'Jun 29'],
  B: ['Jun 12', 'Jun 21', 'Jun 29'],
  C: ['Jun 13', 'Jun 22', 'Jun 30'],
  D: ['Jun 13', 'Jun 22', 'Jun 30'],
  E: ['Jun 14', 'Jun 23', 'Jul 1'],
  F: ['Jun 14', 'Jun 23', 'Jul 1'],
  G: ['Jun 15', 'Jun 24', 'Jul 2'],
  H: ['Jun 15', 'Jun 24', 'Jul 2'],
  I: ['Jun 16', 'Jun 25', 'Jun 29'],
  J: ['Jun 16', 'Jun 25', 'Jun 30'],
  K: ['Jun 17', 'Jun 26', 'Jul 1'],
  L: ['Jun 17', 'Jun 26', 'Jul 2'],
};

function buildGames() {
  const games = {};

  // Group stage: 6 round-robin games per group × 12 groups = 72 games
  GROUP_LETTERS.forEach(group => {
    const teams = GROUP_TEAMS[group];
    GROUP_PAIRS.forEach(([i, j], gameIdx) => {
      const id = gameId('groups', group, gameIdx);
      games[id] = { id, round: 'groups', region: group, idx: gameIdx,
        t1: teams[i], t2: teams[j], p1: null, p2: null,
        label: `Group ${group}: ${teams[i].name} vs ${teams[j].name}` };
    });
  });

  // R32: 4 games per quadrant — use state.r32Teams if set (admin-updated after group stage),
  // otherwise fall back to INITIAL_TEAMS (pre-tournament projections)
  const r32Source = state.r32Teams || INITIAL_TEAMS;
  REGIONS.forEach(region => {
    const teams = r32Source[region];
    for (let i = 0; i < 4; i++) {
      const id = gameId('r32', region, i);
      games[id] = { id, round: 'r32', region, idx: i,
        t1: teams[i * 2], t2: teams[i * 2 + 1],
        p1: null, p2: null };
    }
  });

  // R16 (2 games per quadrant) and QF (1 game per quadrant)
  const prevMap  = { r16: 'r32', qf: 'r16' };
  const countMap = { r16: 2, qf: 1 };
  ['r16', 'qf'].forEach(round => {
    const prev  = prevMap[round];
    const count = countMap[round];
    REGIONS.forEach(region => {
      for (let i = 0; i < count; i++) {
        const id = gameId(round, region, i);
        games[id] = { id, round, region, idx: i,
          t1: null, t2: null,
          p1: gameId(prev, region, i * 2),
          p2: gameId(prev, region, i * 2 + 1) };
      }
    });
  });

  // Semifinals: 2 games
  SF_PAIRINGS.forEach(([r1, r2], i) => {
    const id = gameId('sf', null, i);
    games[id] = { id, round: 'sf', region: null, idx: i,
      t1: null, t2: null,
      p1: gameId('qf', r1, 0), p2: gameId('qf', r2, 0),
      label: `${r1} vs ${r2}` };
  });

  // Final
  const fid = gameId('final', null, 0);
  games[fid] = { id: fid, round: 'final', region: null, idx: 0,
    t1: null, t2: null,
    p1: gameId('sf', null, 0), p2: gameId('sf', null, 1),
    label: 'World Cup Final' };

  return games;
}

function rebuildGames() {
  state.games = buildGames();
}

function gameId(round, region, idx) {
  return region ? `${round}-${region.toLowerCase()}-${idx}` : `${round}-${idx}`;
}

function resolveTeam(game, slot) {
  if (game.round === 'r32' || game.round === 'groups') return slot === 1 ? game.t1 : game.t2;
  const parentId = slot === 1 ? game.p1 : game.p2;
  if (!parentId) return null;
  return getWinner(parentId);
}

function getTeams(game) {
  return { t1: resolveTeam(game, 1), t2: resolveTeam(game, 2) };
}

function getWinner(gid) {
  const name = state.results[gid];
  if (!name) return null;
  const game = state.games[gid];
  if (!game) return null;
  const { t1, t2 } = getTeams(game);
  if (t1 && t1.name === name) return t1;
  if (t2 && t2.name === name) return t2;
  return null;
}

function getGamesForRound(roundId) {
  return Object.values(state.games).filter(g => g.round === roundId);
}

// ── SCORING ───────────────────────────────────────────────────

// Favorites (lower seed/ranking) earn flat cfg.pts.
// Underdogs earn an upset bonus: ((dogSeed - favSeed) + cfg.pts) * cfg.multiplier.
// Draws (group stage only) earn flat cfg.pts — no upset bonus.
function calcPickPoints(game, pickedName, cfg) {
  if (pickedName === 'Draw') return cfg.pts;
  const { t1, t2 } = getTeams(game);
  if (!t1 || !t2) return cfg.pts;
  const fav = t1.seed <= t2.seed ? t1 : t2;
  const dog = fav === t1 ? t2 : t1;
  if (dog.seed === fav.seed) return cfg.pts;
  if (pickedName === dog.name) {
    return Math.round(((dog.seed - fav.seed) + cfg.pts) * cfg.multiplier * 10) / 10;
  }
  return cfg.pts;
}

function fmtScore(n) {
  if (!n) return '-';
  const r = Math.round(n * 10) / 10;
  return r === Math.floor(r) ? String(Math.floor(r)) : r.toFixed(1);
}

function getPlayerRoundScore(playerId, roundId) {
  const roundPicks = (state.picks[playerId] || {})[roundId] || {};
  const cfg = ROUND_CONFIG.find(r => r.id === roundId);
  let score = 0, possible = 0, correct = 0, wrong = 0;
  getGamesForRound(roundId).forEach(game => {
    const pickedName = roundPicks[game.id];
    const resultName = state.results[game.id];
    if (pickedName) {
      if (resultName !== undefined) {
        if (resultName === pickedName) { score += calcPickPoints(game, pickedName, cfg); correct++; }
        else wrong++;
      } else {
        if (isPickStillAlive(pickedName, roundId, game)) possible += calcPickPoints(game, pickedName, cfg);
      }
    }
  });
  const bonusPts = getBonusScore(playerId, roundId);
  score += bonusPts;
  return { score, possible, correct, wrong, bonusPts };
}

function isPickStillAlive(teamName, roundId, game) {
  for (const gid of Object.keys(state.results)) {
    const g = state.games[gid];
    if (!g) continue;
    const winner = getWinner(gid);
    if (!winner) continue;
    const { t1, t2 } = getTeams(g);
    const loser = winner.name === (t1 && t1.name) ? t2 : t1;
    if (loser && loser.name === teamName) return false;
  }
  return true;
}

function getPlayerTotalScore(playerId) {
  let total = 0, possible = 0, correct = 0, wrong = 0, totalBonus = 0;
  ROUND_CONFIG.forEach(cfg => {
    const r = getPlayerRoundScore(playerId, cfg.id);
    total      += r.score;
    possible   += r.possible;
    correct    += r.correct;
    wrong      += r.wrong;
    totalBonus += (r.bonusPts || 0);
  });
  return { total, possible, correct, wrong, totalBonus };
}

// ── BONUS SCORING ─────────────────────────────────────────────

function getBonusScore(playerId, roundId) {
  const bonuses = BONUS_CONFIG[roundId] || [];
  let score = 0;
  bonuses.forEach(b => {
    const playerAns  = (state.bonusPicks[playerId] || {})[b.id];
    const correctAns = state.bonusAnswers[b.id];
    if (!playerAns || !correctAns) return;
    if (b.type === 'multi') {
      if (!Array.isArray(playerAns) || !Array.isArray(correctAns)) return;
      const normP = playerAns.map(s => s.trim().toLowerCase()).filter(Boolean).sort();
      const normC = correctAns.map(s => s.trim().toLowerCase()).filter(Boolean).sort();
      if (normP.length === normC.length && normP.every((v, i) => v === normC[i])) score += b.points;
    } else {
      if (playerAns.trim().toLowerCase() === correctAns.trim().toLowerCase()) score += b.points;
    }
  });
  return score;
}

function getPlayerBonusDetails(playerId, roundId) {
  const bonuses = BONUS_CONFIG[roundId] || [];
  return bonuses.map(b => {
    const playerAns  = (state.bonusPicks[playerId] || {})[b.id];
    const correctAns = state.bonusAnswers[b.id];
    let status = 'pending', earned = 0;
    if (playerAns && correctAns) {
      let isCorrect = false;
      if (b.type === 'multi') {
        if (Array.isArray(playerAns) && Array.isArray(correctAns)) {
          const np = playerAns.map(s => s.trim().toLowerCase()).filter(Boolean).sort();
          const nc = correctAns.map(s => s.trim().toLowerCase()).filter(Boolean).sort();
          isCorrect = np.length === nc.length && np.every((v, i) => v === nc[i]);
        }
      } else {
        isCorrect = playerAns.trim().toLowerCase() === correctAns.trim().toLowerCase();
      }
      status = isCorrect ? 'correct' : 'wrong';
      earned = isCorrect ? b.points : 0;
    }
    return { ...b, playerAns, correctAns, status, earned };
  });
}

// ── PERSISTENCE ───────────────────────────────────────────────

function saveState() {
  const payload = {
    currentRound: state.currentRound,
    roundStatus:  state.roundStatus,
    players:      state.players,
    results:      state.results,
    picks:        state.picks,
    rulesText:    state.rulesText,
    defaultPlayersKey: DEFAULT_PLAYERS_KEY,
    bonusPicks:   state.bonusPicks,
    bonusAnswers: state.bonusAnswers,
    playerPins:   state.playerPins,
    r32Teams:     state.r32Teams,
    scores:       state.scores,
    _sender: state.sessionPlayer || state.currentPlayer,
  };
  fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => showToast('Save failed — working offline', 'error'));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) {}
}

async function loadState() {
  try {
    const res = await fetch('/api/state');
    if (res.ok) {
      const saved = await res.json();
      if (saved && Object.keys(saved).length > 0) { applyLoadedState(saved); return; }
    }
  } catch (e) {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    applyLoadedState(JSON.parse(raw));
  } catch (e) {}
}

function applyLoadedState(saved) {
  if (saved.defaultPlayersKey !== DEFAULT_PLAYERS_KEY) {
    if (saved.results)      state.results      = saved.results;
    if (saved.currentRound) state.currentRound = saved.currentRound;
    if (saved.roundStatus)  state.roundStatus  = saved.roundStatus;
    if (saved.rulesText !== undefined) state.rulesText = saved.rulesText;
    return;
  }
  if (saved.players?.length)  state.players  = saved.players;
  if (saved.results)          state.results  = saved.results;
  if (saved.picks)            state.picks    = saved.picks;
  if (saved.currentRound)     state.currentRound = saved.currentRound;
  if (saved.roundStatus)      state.roundStatus  = saved.roundStatus;
  if (saved.rulesText !== undefined) state.rulesText = saved.rulesText;
  if (saved.bonusPicks)   state.bonusPicks   = saved.bonusPicks;
  if (saved.bonusAnswers) state.bonusAnswers = saved.bonusAnswers;
  if (saved.playerPins)   state.playerPins   = saved.playerPins;
  if (saved.r32Teams)     state.r32Teams     = saved.r32Teams;
  if (saved.scores)       state.scores       = saved.scores;
  // Default bracketSubView to 'groups' when in groups round, else 'knockout'
  state.bracketSubView = (state.currentRound === 'groups') ? 'groups' : 'knockout';
}

// ── TOAST ─────────────────────────────────────────────────────

let toastTimer;
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}

// ── VIEW SWITCHING ────────────────────────────────────────────

function switchView(view) {
  // Warn if leaving picks view with unsaved changes
  if (state.currentView === 'picks' && view !== 'picks') {
    const savedPicks = (state.picks[state.currentPlayer] || {})[state.activePicksRound] || {};
    const hasUnsaved = Object.keys(state.pendingPicks).some(
      gid => state.pendingPicks[gid] !== (savedPicks[gid] || null)
    );
    if (hasUnsaved && !confirm('You have unsaved picks. Leave without saving?')) return;
  }
  state.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  renderCurrentView();
}

function renderCurrentView() {
  updateRoundStatus();
  updatePlayerSelect();
  updateSessionHeader();
  switch (state.currentView) {
    case 'rules':       renderRules();        break;
    case 'bracket':     renderBracket();      break;
    case 'picks':       renderPicks();        break;
    case 'leaderboard': renderLeaderboard();  break;
    case 'admin':       renderAdmin();        break;
  }
}

// ── SESSION / LOGIN ───────────────────────────────────────────

function isAdmin() {
  return !!(state.sessionPlayer && state.sessionPlayer === state.players[0]?.id);
}

function isRoundPicksVisible(roundId) {
  if (isAdmin()) return true;
  const ri = ROUND_CONFIG.findIndex(r => r.id === roundId);
  const ci = ROUND_CONFIG.findIndex(r => r.id === state.currentRound);
  if (ri < ci) return true;
  if (ri === ci) return state.roundStatus === 'closed';
  return false;
}

function renderLoginOverlay() {
  const overlay = document.getElementById('login-overlay');
  const grid    = document.getElementById('login-players-grid');
  grid.innerHTML = '';

  const pinModal = document.getElementById('pin-modal');
  if (pinModal) pinModal.style.display = 'none';

  state.players.forEach((p, i) => {
    const { total } = getPlayerTotalScore(p.id);
    const adminPlayer = (i === 0);
    const hasPin = !!(state.playerPins[p.id]);
    const btn = document.createElement('button');
    btn.className = 'player-btn' + (adminPlayer ? ' admin' : '');
    btn.innerHTML = `
      ${adminPlayer ? '<span class="lp-badge">&#128081; Admin</span>' : ''}
      <span class="lp-avatar">${playerAvatarHtml(p.name, 56)}</span>
      <span class="lp-name">${esc(p.name)}</span>
      <span class="lp-score">${total > 0 ? fmtScore(total) + ' pts' : 'No picks yet'}</span>
      ${hasPin ? '<span class="lp-lock">&#128274;</span>' : ''}`;
    btn.addEventListener('click', () => {
      if (hasPin) { showPinModal(p.id, p.name); }
      else        { loginAs(p.id); }
    });
    grid.appendChild(btn);
  });

  overlay.style.display = 'flex';
}

function showPinModal(playerId, playerName) {
  const modal = document.getElementById('pin-modal');
  const nameEl = document.getElementById('pin-player-name');
  const input  = document.getElementById('pin-input');
  const errEl  = document.getElementById('pin-error');
  nameEl.textContent = playerName;
  input.value = '';
  errEl.style.display = 'none';
  modal.style.display = 'flex';
  modal.dataset.playerId = playerId;
  setTimeout(() => input.focus(), 50);
}

function submitPin() {
  const modal    = document.getElementById('pin-modal');
  const input    = document.getElementById('pin-input');
  const errEl    = document.getElementById('pin-error');
  const playerId = modal.dataset.playerId;
  const entered  = input.value.trim();
  const correct  = state.playerPins[playerId];
  if (entered === correct) { modal.style.display = 'none'; loginAs(playerId); }
  else { errEl.style.display = 'block'; input.value = ''; input.focus(); }
}

function closePinModal() {
  document.getElementById('pin-modal').style.display = 'none';
}

function loginAs(pid) {
  state.sessionPlayer   = pid;
  state.currentPlayer   = pid;
  state.adminViewPlayer = null;
  try { sessionStorage.setItem('wcSession', pid); } catch(e) {}
  document.getElementById('login-overlay').style.display = 'none';
  updateSessionHeader();
  updatePlayerSelect();
  switchView('bracket');
}

function logoutSession() {
  state.sessionPlayer   = null;
  state.adminViewPlayer = null;
  try { sessionStorage.removeItem('wcSession'); } catch(e) {}
  renderLoginOverlay();
}

function updateSessionHeader() {
  const adminBtn      = document.getElementById('admin-nav-btn');
  const sessionEl     = document.getElementById('session-indicator');
  const sessionNameEl = document.getElementById('session-name');
  const playerWrapEl  = document.getElementById('player-wrap');
  if (!state.sessionPlayer) return;
  const admin = isAdmin();
  if (adminBtn)      adminBtn.style.display      = admin ? '' : 'none';
  if (playerWrapEl)  playerWrapEl.style.display  = admin ? '' : 'none';
  if (sessionEl)     sessionEl.style.display     = admin ? 'none' : 'flex';
  if (sessionNameEl) {
    const player = state.players.find(p => p.id === state.sessionPlayer);
    sessionNameEl.textContent = player?.name || '';
  }
}

// ── HEADER HELPERS ────────────────────────────────────────────

function updateRoundStatus() {
  const pill = document.getElementById('round-status');
  const cfg  = ROUND_CONFIG.find(r => r.id === state.currentRound);
  const labels = { open: 'Open', locked: 'Locked', closed: 'Closed' };
  let label = `${cfg?.label ?? ''} — ${labels[state.roundStatus] ?? ''}`;
  if (state.currentRound === 'groups') {
    const total    = getGamesForRound('groups').length;
    const entered  = getGamesForRound('groups').filter(g => state.results[g.id]).length;
    const groupsDone = GROUP_LETTERS.filter(grp =>
      getGamesForRound('groups').filter(g => g.region === grp).every(g => state.results[g.id])
    ).length;
    label += ` — ${entered}/${total} results (${groupsDone}/12 groups complete)`;
  }
  pill.textContent = label;
  pill.className = `status-pill ${state.roundStatus}`;
}

function updatePlayerSelect() {
  if (state.sessionPlayer && !isAdmin()) {
    state.currentPlayer = state.sessionPlayer;
    return;
  }
  const sel = document.getElementById('player-select');
  const cur = sel.value || state.currentPlayer;
  sel.innerHTML = '';
  state.players.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === cur) opt.selected = true;
    sel.appendChild(opt);
  });
  if (!state.players.find(p => p.id === cur) && state.players.length) {
    state.currentPlayer = state.players[0].id;
    sel.value = state.currentPlayer;
  } else {
    state.currentPlayer = sel.value;
  }
}

// ── BRACKET RENDERING ─────────────────────────────────────────

const ROUND_LABELS = {
  groups: 'GROUP STAGE',
  r32:    'ROUND OF 32',
  r16:    'ROUND OF 16',
  qf:     'QUARTERFINALS',
  sf:     'SEMIFINALS',
  final:  'FINAL',
};

const ROUND_DATES = {
  groups: 'Jun 12–26',
  r32:    'Jun 29 – Jul 2',
  r16:    'Jul 5–8',
  qf:     'Jul 11–12',
  sf:     'Jul 15–16',
  final:  'Jul 19',
};

const QUADRANT_NAMES = { A: 'Quadrant A', B: 'Quadrant B', C: 'Quadrant C', D: 'Quadrant D' };

function renderBracket() {
  const wrapper = document.getElementById('bracket-wrapper');
  wrapper.innerHTML = '';

  // Sub-view toggle bar
  const toggleBar = document.createElement('div');
  toggleBar.className = 'bracket-toggle-bar';
  [['groups', '&#127942; Group Stage'], ['knockout', '&#9883; Knockout Bracket']].forEach(([id, label]) => {
    const btn = document.createElement('button');
    btn.className = 'bracket-toggle-btn' + (state.bracketSubView === id ? ' active' : '');
    btn.innerHTML = label;
    btn.addEventListener('click', () => { state.bracketSubView = id; renderBracket(); });
    toggleBar.appendChild(btn);
  });
  wrapper.appendChild(toggleBar);

  if (state.bracketSubView === 'groups') {
    renderGroupStageBracket(wrapper);
    return;
  }

  // Show notice if group stage isn't complete yet
  const groupGamesTotal  = GROUP_LETTERS.length * 6;
  const groupResultsDone = GROUP_LETTERS.reduce((n, g) =>
    n + getGamesForRound('groups').filter(gm => gm.region === g && state.results[gm.id] !== undefined).length, 0);
  if (groupResultsDone < groupGamesTotal) {
    const notice = document.createElement('div');
    notice.className = 'knockout-notice';
    notice.innerHTML = `&#9888; Knockout bracket will be confirmed after the Group Stage concludes (${groupResultsDone}/${groupGamesTotal} group results entered). Teams shown below are projected.`;
    wrapper.appendChild(notice);
  }

  // Left column: Quadrant A (top) + Quadrant B (bottom), rounds L→R
  const leftCol = document.createElement('div');
  leftCol.className = 'bracket-left-col';
  leftCol.appendChild(buildRegionBlock('A', 'left', true));
  leftCol.appendChild(buildRegionBlock('B', 'left', false));

  // Center column: SF col 0 | Final | SF col 1
  const centerCol = buildBracketCenter();

  // Right column: Quadrant C (top) + Quadrant D (bottom), rounds R→L
  const rightCol = document.createElement('div');
  rightCol.className = 'bracket-right-col';
  rightCol.appendChild(buildRegionBlock('C', 'right', true));
  rightCol.appendChild(buildRegionBlock('D', 'right', false));

  wrapper.appendChild(leftCol);
  wrapper.appendChild(centerCol);
  wrapper.appendChild(rightCol);
}

function getGroupStandings(group) {
  const teams = GROUP_TEAMS[group];
  const table = {};
  teams.forEach(t => { table[t.name] = { team: t, w: 0, d: 0, l: 0, pts: 0, played: 0 }; });

  const games = getGamesForRound('groups').filter(g => g.region === group);
  games.forEach(game => {
    const result = state.results[game.id];
    if (!result) return;
    const { t1, t2 } = getTeams(game);
    if (!t1 || !t2) return;
    if (result === 'Draw') {
      table[t1.name].d++; table[t1.name].pts++; table[t1.name].played++;
      table[t2.name].d++; table[t2.name].pts++; table[t2.name].played++;
    } else {
      const winner = result === t1.name ? t1 : t2;
      const loser  = winner === t1 ? t2 : t1;
      table[winner.name].w++; table[winner.name].pts += 3; table[winner.name].played++;
      table[loser.name].l++;  table[loser.name].played++;
    }
  });

  return Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.w   !== a.w)   return b.w   - a.w;
    return a.team.seed - b.team.seed; // FIFA ranking tiebreak
  });
}

function renderGroupStageBracket(wrapper) {
  const grid = document.createElement('div');
  grid.className = 'group-stage-grid';

  const MATCHDAY_IDX = [0, 0, 1, 1, 2, 2]; // game index → matchday index (0/1/2)

  GROUP_LETTERS.forEach(group => {
    const teams = GROUP_TEAMS[group];
    const card = document.createElement('div');
    card.className = 'group-card';

    const groupGames = getGamesForRound('groups').filter(g => g.region === group);
    const resultsEntered = groupGames.filter(g => state.results[g.id] !== undefined).length;
    const groupComplete  = resultsEntered === groupGames.length;
    const hdr = document.createElement('div');
    hdr.className = 'group-card-hdr';
    hdr.innerHTML = `<span class="group-card-title">Group ${group}</span>${groupComplete ? '<span class="group-complete-badge">✔ Final</span>' : resultsEntered > 0 ? `<span class="group-progress-badge">${resultsEntered}/${groupGames.length}</span>` : ''}`;
    card.appendChild(hdr);

    // Standings table (or plain team list if no results yet)
    const standings = getGroupStandings(group);
    const anyResults = standings.some(s => s.played > 0);
    const teamsDiv = document.createElement('div');
    teamsDiv.className = 'group-teams-list';

    if (anyResults) {
      // Standings header row
      const hdrRow = document.createElement('div');
      hdrRow.className = 'group-team-row group-standing-hdr';
      hdrRow.innerHTML = `<span class="group-team-rank">#</span><span class="group-team-name">Team</span><span class="group-standing-stat">P</span><span class="group-standing-stat">W</span><span class="group-standing-stat">D</span><span class="group-standing-stat">L</span><span class="group-standing-stat gsp-pts">Pts</span>`;
      teamsDiv.appendChild(hdrRow);
      standings.forEach((s, pos) => {
        const row = document.createElement('div');
        const advancing = pos < 2; // top 2 guaranteed; 3rd handled separately
        row.className = 'group-team-row group-standing-row' + (advancing ? ' advancing' : '');
        row.innerHTML = `<span class="group-team-rank">${s.team.seed}</span><span class="group-team-name">${esc(s.team.name)}</span><span class="group-standing-stat">${s.played}</span><span class="group-standing-stat">${s.w}</span><span class="group-standing-stat">${s.d}</span><span class="group-standing-stat">${s.l}</span><span class="group-standing-stat gsp-pts">${s.pts}</span>`;
        teamsDiv.appendChild(row);
      });
    } else {
      teams.forEach(t => {
        const row = document.createElement('div');
        row.className = 'group-team-row';
        row.innerHTML = `<span class="group-team-rank">${t.seed}</span><span class="group-team-name">${esc(t.name)}</span>`;
        teamsDiv.appendChild(row);
      });
    }
    card.appendChild(teamsDiv);

    // Games by matchday
    const games = getGamesForRound('groups').filter(g => g.region === group).sort((a,b) => a.idx - b.idx);
    let lastMDIdx = -1;
    games.forEach((game, i) => {
      const mdIdx = MATCHDAY_IDX[i];
      if (mdIdx !== lastMDIdx) {
        const date = (MATCHDAY_DATES[group] || [])[mdIdx] || '';
        const mdHdr = document.createElement('div');
        mdHdr.className = 'group-md-label';
        mdHdr.innerHTML = `Matchday ${mdIdx + 1}<span class="group-md-date">${date}</span>`;
        card.appendChild(mdHdr);
        lastMDIdx = mdIdx;
      }
      const { t1, t2 } = getTeams(game);
      const winner = getWinner(game.id);
      const isDraw = state.results[game.id] === 'Draw';
      const playerPick = (state.picks[state.currentPlayer] || {})['groups']?.[game.id];
      const gameRow = document.createElement('div');
      gameRow.className = 'group-game-row';

      const sc = state.scores[game.id];
      const liveSc = !sc ? findGameScore(t1?.name, t2?.name) : null;
      const isLiveGroup = liveSc && liveSc.status === 'in';
      if (isLiveGroup) {
        const badge = document.createElement('span');
        badge.className = 'live-badge-inline';
        badge.textContent = liveSc.statusDetail || 'LIVE';
        gameRow.appendChild(badge);
      }
      [t1, t2].forEach((team, idx) => {
        const teamEl = document.createElement('span');
        teamEl.className = 'group-game-team';
        if (isDraw) {
          teamEl.classList.add('draw');
        } else if (winner) {
          if (winner.name === team.name) teamEl.classList.add('winner');
          else teamEl.classList.add('loser');
        }
        if (playerPick === team.name) teamEl.classList.add('picked');
        const displaySc = sc !== undefined ? sc : liveSc;
        const goalStr = displaySc !== undefined
          ? (idx === 0 ? displaySc.t1 : displaySc.t2)
          : (isDraw && idx === 0 ? 'D' : '');
        const scoreClass = `group-game-goal${isLiveGroup ? ' live' : ''}`;
        teamEl.innerHTML = `<span class="group-game-seed">${team.seed}</span><span class="group-game-name">${esc(team.name)}</span>${goalStr !== '' ? `<span class="${scoreClass}">${goalStr}</span>` : ''}`;
        gameRow.appendChild(teamEl);
      });
      card.appendChild(gameRow);
    });

    grid.appendChild(card);
  });

  wrapper.appendChild(grid);
}

function buildRegionBlock(region, side, showHeader = true) {
  const rounds = ['r32', 'r16', 'qf'];
  const orderedRounds = side === 'right' ? [...rounds].reverse() : rounds;

  const block = document.createElement('div');
  block.className = 'region-block';

  if (showHeader) {
    const hdrRow = document.createElement('div');
    hdrRow.className = 'bracket-hdr-row';
    orderedRounds.forEach(roundId => {
      const cell = document.createElement('div');
      cell.className = 'bracket-hdr-cell';
      cell.innerHTML = `<strong>${ROUND_LABELS[roundId]}</strong>`;
      hdrRow.appendChild(cell);
    });
    block.appendChild(hdrRow);
  }

  const lbl = document.createElement('div');
  lbl.className = 'region-label';
  lbl.textContent = QUADRANT_NAMES[region] || region;
  block.appendChild(lbl);

  const roundsRow = document.createElement('div');
  roundsRow.className = 'region-rounds';
  orderedRounds.forEach(roundId => {
    roundsRow.appendChild(buildRoundCol(region, roundId));
  });
  block.appendChild(roundsRow);

  return block;
}

function buildRoundCol(region, roundId) {
  const col = document.createElement('div');
  col.className = `round-col round-${roundId}`;

  const games = Object.values(state.games).filter(
    g => g.round === roundId && g.region === region
  ).sort((a, b) => a.idx - b.idx);

  games.forEach(game => {
    const wrap = document.createElement('div');
    wrap.className = 'matchup-wrap';
    wrap.appendChild(buildMatchup(game));
    col.appendChild(wrap);

    // R32: insert a gap after game indices 0 and 2 to visually pair matchups
    if (roundId === 'r32' && game.idx % 2 === 0) {
      const gap = document.createElement('div');
      gap.className = 'r32-pair-gap';
      col.appendChild(gap);
    }
  });

  return col;
}

function buildMatchup(game) {
  const { t1, t2 } = getTeams(game);
  const winner      = getWinner(game.id);
  const playerPick  = (state.picks[state.currentPlayer] || {})[game.round]?.[game.id];

  const card = document.createElement('div');
  card.className = 'matchup';

  const sc = state.scores[game.id];
  const liveSc = !sc ? findGameScore(t1?.name, t2?.name) : null;
  const isLive = liveSc && liveSc.status === 'in';
  if (isLive) {
    const badge = document.createElement('div');
    badge.className = 'live-badge';
    badge.textContent = liveSc.statusDetail || 'LIVE';
    card.appendChild(badge);
  }
  [{ team: t1 }, { team: t2 }].forEach(({ team }, idx) => {
    const row = document.createElement('div');
    row.className = 'team-slot';
    if (!team) {
      row.classList.add('tbd');
      row.innerHTML = `<span class="t-seed"></span><span class="t-name">TBD</span>`;
    } else {
      const isWinner = winner && winner.name === team.name;
      const isLoser  = winner && winner.name !== team.name;
      if (isWinner) row.classList.add('winner');
      if (isLoser)  row.classList.add('loser');
      const pickedThis = playerPick === team.name;
      if (pickedThis && isWinner) row.classList.add('pick-correct');
      if (pickedThis && isLoser)  row.classList.add('pick-wrong');
      const displaySc = sc !== undefined ? sc : liveSc;
      const goals = displaySc !== undefined ? `<span class="t-score${isLive ? ' live' : ''}">${idx === 0 ? displaySc.t1 : displaySc.t2}</span>` : '';
      row.innerHTML = `<span class="t-seed">${team.seed}</span><span class="t-name">${esc(team.name)}</span>${goals}`;
    }
    card.appendChild(row);
  });

  return card;
}

function buildBracketCenter() {
  const center = document.createElement('div');
  center.className = 'bracket-center';

  function buildSFCol(gameIndex) {
    const col = document.createElement('div');
    col.className = 'f4-col';

    const hdrCell = document.createElement('div');
    hdrCell.className = 'bracket-hdr-cell';
    hdrCell.innerHTML = '<strong>Semifinals</strong>';
    col.appendChild(hdrCell);

    const wrap = document.createElement('div');
    wrap.className = 'f4-game-wrap';

    const lbl = document.createElement('div');
    lbl.className = 'f4-label';
    lbl.textContent = SF_PAIRINGS[gameIndex].join(' · ');
    wrap.appendChild(lbl);

    const game = state.games[gameId('sf', null, gameIndex)];
    if (game) {
      const w = document.createElement('div');
      w.className = 'matchup-wrap';
      w.appendChild(buildMatchup(game));
      wrap.appendChild(w);
    }

    col.appendChild(wrap);
    return col;
  }

  // Left SF column (game 0: A vs B)
  center.appendChild(buildSFCol(0));

  // Final column
  const finalCol = document.createElement('div');
  finalCol.className = 'champ-col';

  const finalHdrCell = document.createElement('div');
  finalHdrCell.className = 'bracket-hdr-cell';
  finalHdrCell.innerHTML = '<strong>Final</strong>';
  finalCol.appendChild(finalHdrCell);

  const finalContent = document.createElement('div');
  finalContent.className = 'champ-content';

  const finalInfo = document.createElement('div');
  finalInfo.className = 'champ-info';
  finalInfo.innerHTML = `
    <div class="champ-title">&#127942; World Cup Final</div>
    <div class="champ-venue">MetLife Stadium, NJ</div>
    <div class="champ-date">Sunday, July 19, 2026</div>
  `;
  finalContent.appendChild(finalInfo);

  const finalGame = state.games[gameId('final', null, 0)];
  if (finalGame) {
    const finalWrap = document.createElement('div');
    finalWrap.className = 'matchup-wrap';
    finalWrap.appendChild(buildMatchup(finalGame));
    finalContent.appendChild(finalWrap);
  }

  const winnerBox = document.createElement('div');
  winnerBox.className = 'winner-box';
  const champWinner = getWinner(gameId('final', null, 0));
  winnerBox.innerHTML = champWinner
    ? `<div class="wb-label">&#9917; World Champion</div><div class="wb-team">${esc(champWinner.name)}</div>`
    : `<div class="wb-label">&#9917; World Champion</div><div class="wb-team wb-tbd">TBD</div>`;
  finalContent.appendChild(winnerBox);

  finalCol.appendChild(finalContent);
  center.appendChild(finalCol);

  // Right SF column (game 1: C vs D)
  center.appendChild(buildSFCol(1));

  return center;
}

// ── RULES RENDERING ───────────────────────────────────────────

const DEFAULT_RULES_PLACEHOLDER = `WORLD CUP 2026 POOL — OFFICIAL RULES

HOW IT WORKS
Before each round begins, every player submits their picks for that round. Once the round is locked, picks can no longer be changed. Points are awarded based on correct picks, with bigger rewards for later rounds and for picking upsets.

PICK DEADLINES
Picks must be submitted before the round is locked by the Commissioner. Late picks will not be accepted. Make sure you're logged in and have saved your picks before the deadline.

SCORING — BASE POINTS
Group Stage: 1 point per correct pick
Round of 32: 2 points per correct pick
Round of 16: 3 points per correct pick
Quarterfinals: 5 points per correct pick
Semifinals: 8 points per correct pick
Final: 15 points per correct pick

In the Group Stage you may also pick a Draw. A correct Draw pick earns 1 point.

UPSET BONUS
Picking an underdog (higher FIFA seed number) to win earns bonus points in every round — including the Group Stage. The formula is:
  ((Underdog seed − Favourite seed) + Base points) × Round multiplier

Round multipliers: GRP ×1.0 · R32 ×1.2 · R16 ×1.4 · QF ×1.6 · SF ×1.8 · Final ×2.0

Example: Picking seed #59 (South Africa) to beat seed #15 (Mexico) in the Group Stage:
  ((59 − 15) + 1) × 1.0 = 45 points

Example: Picking seed #34 (Ivory Coast) to beat seed #10 (Germany) in the Round of 32:
  ((34 − 10) + 2) × 1.2 = 31.2 points

Note: A correct Draw pick always earns a flat 1 point — no upset bonus applies to draws.

BONUS QUESTIONS
Each round includes bonus questions for extra points. Answers must be submitted before the round locks.

Group Stage
  · Total number of draws in the group stage — 8 pts
  · Confederation with the most group stage wins — 6 pts

Round of 32
  · Most successful confederation from R32 onward — 4 pts

Round of 16
  · Number of penalty shootouts in the Round of 32 — 6 pts

Quarterfinals
  · Golden Boot leader (player name) — 10 pts
  · Name all four semi-finalists — 20 pts

Semifinals
  · Nation with the most total goals in the tournament — 6 pts
  · Total goals scored in both semi-finals — 6 pts

STANDINGS
The leaderboard shows total points earned plus remaining possible points. Players are ranked by total score, with possible points used as a tiebreaker.

GENERAL RULES
· The Commissioner's decisions are final.
· All picks are private until the round is locked.
· Have fun and may the best picker win!`;

function renderRules() {
  const body        = document.getElementById('rules-body');
  const editControls = document.getElementById('rules-edit-controls');
  const admin       = isAdmin();
  body.innerHTML    = '';
  if (editControls) editControls.style.display = admin ? 'block' : 'none';

  if (admin) {
    const hint = document.createElement('p');
    hint.className = 'rules-hint';
    hint.textContent = 'Write your pool rules below. Plain text — use blank lines to separate sections.';
    body.appendChild(hint);
    const ta = document.createElement('textarea');
    ta.id          = 'rules-textarea';
    ta.className   = 'rules-textarea';
    ta.placeholder = DEFAULT_RULES_PLACEHOLDER;
    ta.value       = state.rulesText;
    body.appendChild(ta);
  } else {
    const text = state.rulesText.trim() || DEFAULT_RULES_PLACEHOLDER;
    const display = document.createElement('div');
    display.className = 'rules-display';
    text.split(/\n{2,}/).forEach(para => {
      const p = document.createElement('p');
      p.innerHTML = esc(para.trim()).replace(/\n/g, '<br>');
      display.appendChild(p);
    });
    body.appendChild(display);
  }
}

function saveRules() {
  if (!isAdmin()) return;
  const ta = document.getElementById('rules-textarea');
  if (!ta) return;
  state.rulesText = ta.value;
  saveState();
  showToast('Rules saved!', 'success');
}

// ── PICKS RENDERING ───────────────────────────────────────────

function renderPicks() {
  renderPicksTabs();
  renderPicksBody();
}

function renderPicksTabs() {
  const tabs = document.getElementById('picks-tabs');
  tabs.innerHTML = '';
  ROUND_CONFIG.forEach(cfg => {
    const btn = document.createElement('button');
    btn.className = 'round-tab';
    btn.textContent = cfg.short;
    if (cfg.id === state.activePicksRound) btn.classList.add('active');
    const ri = ROUND_CONFIG.findIndex(r => r.id === cfg.id);
    const ci = ROUND_CONFIG.findIndex(r => r.id === state.currentRound);
    if (ri < ci) btn.classList.add('done');
    else if (ri === ci && state.roundStatus === 'locked') btn.classList.add('locked');
    else if (ri > ci) btn.classList.add('future');
    btn.addEventListener('click', () => { state.activePicksRound = cfg.id; renderPicks(); });
    tabs.appendChild(btn);
  });
}

function renderPicksBody() {
  const body    = document.getElementById('picks-body');
  const saveBar = document.getElementById('save-bar');
  body.innerHTML = '';

  const roundId = state.activePicksRound;
  const cfg = ROUND_CONFIG.find(r => r.id === roundId);
  const ri  = ROUND_CONFIG.findIndex(r => r.id === roundId);
  const ci  = ROUND_CONFIG.findIndex(r => r.id === state.currentRound);

  const isCurrentRound = roundId === state.currentRound;
  const isPast         = ri < ci;
  const isFuture       = ri > ci;

  const viewId      = state.adminViewPlayer || state.currentPlayer;
  const isAdminView = !!state.adminViewPlayer;
  const isOpen      = !isAdminView && isCurrentRound && state.roundStatus === 'open';
  const isLocked    = !isAdminView && isCurrentRound && state.roundStatus === 'locked';

  const savedPicks = (state.picks[viewId] || {})[roundId] || {};
  state.pendingPicks = isAdminView ? {} : { ...savedPicks };

  if (isAdminView) {
    const viewName = state.players.find(p => p.id === viewId)?.name || 'Player';
    const banner = document.createElement('div');
    banner.className = 'admin-view-banner';
    banner.innerHTML = `<span>&#128065; Viewing <strong>${esc(viewName)}</strong>'s picks</span>
      <button class="admin-view-close">&#10005; Back to my picks</button>`;
    banner.querySelector('.admin-view-close').addEventListener('click', () => {
      state.adminViewPlayer = null; renderPicks();
    });
    body.appendChild(banner);

    if (!isAdmin() && !isRoundPicksVisible(roundId)) {
      const lockDiv = document.createElement('div');
      lockDiv.className = 'picks-hidden-msg';
      lockDiv.innerHTML = `&#128274; <strong>${esc(viewName)}</strong>'s picks for this round are hidden until the Admin closes it.`;
      body.appendChild(lockDiv);
      saveBar.style.display = 'none';
      return;
    }
  }

  const msg = document.createElement('div');
  if (isAdminView) {
    const viewName = state.players.find(p => p.id === viewId)?.name || 'Player';
    msg.className = 'picks-locked-msg';
    if (isPast)        msg.textContent = `Round complete — showing ${viewName}'s results for ${cfg.label}.`;
    else if (isFuture) msg.textContent = `${cfg.label} picks not yet open.`;
    else               msg.textContent = `Showing ${viewName}'s ${cfg.label} picks (read-only).`;
  } else if (isOpen) {
    msg.className = 'picks-open-msg';
    msg.textContent = `✔ ${cfg.label} is open — select your winners below (${cfg.pts} pt${cfg.pts > 1 ? 's' : ''} per correct pick).`;
  } else if (isLocked) {
    msg.className = 'picks-locked-msg';
    msg.textContent = `⚠ Picks are locked while ${cfg.label} games are in progress.`;
  } else if (isPast) {
    msg.className = 'picks-locked-msg';
    msg.textContent = `This round is complete. Showing your results for ${cfg.label}.`;
  } else if (isFuture) {
    msg.className = 'picks-locked-msg';
    msg.textContent = `${cfg.label} picks open after the current round concludes.`;
  }
  body.appendChild(msg);

  if (roundId === 'groups') {
    // Group stage: 12 groups, 6 games each, organized in group sections
    const MATCHDAY_IDX_PICKS = [0, 0, 1, 1, 2, 2];
    const groupsContainer = document.createElement('div');
    groupsContainer.className = 'picks-groups-container';
    GROUP_LETTERS.forEach(group => {
      const section = document.createElement('div');
      section.className = 'picks-group-section';
      const groupGamesAll = getGamesForRound('groups').filter(g => g.region === group);
      const pickedCount = groupGamesAll.filter(g => state.pendingPicks[g.id]).length;
      const sectionHdr = document.createElement('div');
      sectionHdr.className = 'picks-group-hdr';
      sectionHdr.innerHTML = `Group ${group}<span class="picks-group-progress">${pickedCount}/${groupGamesAll.length}</span>`;
      section.appendChild(sectionHdr);
      let lastMDIdx = -1;
      const groupGames = getGamesForRound('groups').filter(g => g.region === group).sort((a,b) => a.idx - b.idx);
      groupGames.forEach((game, i) => {
        const mdIdx = MATCHDAY_IDX_PICKS[i];
        if (mdIdx !== lastMDIdx) {
          const date = (MATCHDAY_DATES[group] || [])[mdIdx] || '';
          const mdEl = document.createElement('div');
          mdEl.className = 'picks-md-label';
          mdEl.innerHTML = `Matchday ${mdIdx + 1}<span class="group-md-date">${date}</span>`;
          section.appendChild(mdEl);
          lastMDIdx = mdIdx;
        }
        const { t1, t2 } = getTeams(game);
        const winner = getWinner(game.id);
        section.appendChild(buildPickCard(game, t1, t2, winner, isOpen, savedPicks, cfg));
      });
      groupsContainer.appendChild(section);
    });
    body.appendChild(groupsContainer);
  } else {
    const grid = document.createElement('div');
    grid.className = 'picks-grid';
    const games = getGamesForRound(roundId);
    games.forEach(game => {
      const { t1, t2 } = getTeams(game);
      const winner = getWinner(game.id);
      grid.appendChild(buildPickCard(game, t1, t2, winner, isOpen, savedPicks, cfg));
    });
    body.appendChild(grid);
  }

  // ── BONUS SECTION ──────────────────────────────────────────
  const bonuses = BONUS_CONFIG[roundId] || [];
  if (bonuses.length > 0) {
    const bonusSection = document.createElement('div');
    bonusSection.className = 'bonus-section';
    const bonusTitle = document.createElement('h3');
    bonusTitle.className = 'bonus-title';
    bonusTitle.innerHTML = '&#127775; Bonus Opportunity';
    bonusSection.appendChild(bonusTitle);

    bonuses.forEach(b => {
      const bonusCard = document.createElement('div');
      bonusCard.className = 'bonus-card';

      const hdr = document.createElement('div');
      hdr.className = 'bonus-card-hdr';
      hdr.innerHTML = `<span class="bonus-label">${esc(b.label)}</span><span class="bonus-pts">${b.points} pts</span>`;
      bonusCard.appendChild(hdr);

      const playerAns = (state.bonusPicks[viewId] || {})[b.id];
      const detail = getPlayerBonusDetails(viewId, roundId).find(d => d.id === b.id);

      if (b.type === 'multi') {
        const srcRound = b.sourceRound || 'qf';
        const srcGames = getGamesForRound(srcRound);
        const srcPicks = (state.picks[viewId] || {})[srcRound] || {};
        const autoTeams = srcGames.map(g => srcPicks[g.id] || '');

        if (!state.bonusPicks[viewId]) state.bonusPicks[viewId] = {};
        state.bonusPicks[viewId][b.id] = autoTeams;

        for (let i = 0; i < autoTeams.length; i++) {
          const row = document.createElement('div');
          row.className = 'bonus-input-row';
          const label = document.createElement('span');
          label.className = 'bonus-input-label';
          label.textContent = `Team ${i + 1}:`;
          row.appendChild(label);
          const inp = document.createElement('input');
          inp.type = 'text';
          inp.className = 'bonus-input';
          inp.placeholder = `Picked from your ${srcRound.toUpperCase()} selections`;
          inp.value = autoTeams[i] || '';
          inp.disabled = true;
          inp.dataset.bonusId  = b.id;
          inp.dataset.bonusIdx = i;
          row.appendChild(inp);
          bonusCard.appendChild(row);
        }
      } else if (b.type === 'select' && b.options) {
        const row = document.createElement('div');
        row.className = 'bonus-input-row';
        const sel = document.createElement('select');
        sel.className = 'bonus-input';
        sel.disabled = !isOpen;
        sel.dataset.bonusId = b.id;
        const defOpt = document.createElement('option');
        defOpt.value = '';
        defOpt.textContent = '— Select —';
        sel.appendChild(defOpt);
        b.options.forEach(optText => {
          const o = document.createElement('option');
          o.value = optText;
          o.textContent = optText;
          if (playerAns === optText) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', () => {
          if (!state.bonusPicks[state.currentPlayer]) state.bonusPicks[state.currentPlayer] = {};
          state.bonusPicks[state.currentPlayer][b.id] = sel.value;
        });
        row.appendChild(sel);
        bonusCard.appendChild(row);
      } else {
        const row = document.createElement('div');
        row.className = 'bonus-input-row';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'bonus-input';
        inp.placeholder = 'Enter your answer...';
        inp.value = playerAns || '';
        inp.disabled = !isOpen;
        inp.dataset.bonusId = b.id;
        inp.addEventListener('change', () => {
          if (!state.bonusPicks[state.currentPlayer]) state.bonusPicks[state.currentPlayer] = {};
          state.bonusPicks[state.currentPlayer][b.id] = inp.value.trim();
        });
        row.appendChild(inp);
        bonusCard.appendChild(row);
      }

      if (detail && detail.status !== 'pending') {
        const res = document.createElement('div');
        res.className = 'bonus-result ' + detail.status;
        if (detail.status === 'correct') {
          res.innerHTML = `&#10004; Correct! +${detail.earned} pts`;
        } else {
          const correctDisplay = Array.isArray(detail.correctAns)
            ? detail.correctAns.join(', ') : detail.correctAns;
          res.innerHTML = `&#10008; Incorrect &mdash; Answer: ${esc(correctDisplay)}`;
        }
        bonusCard.appendChild(res);
      }

      bonusSection.appendChild(bonusCard);
    });

    body.appendChild(bonusSection);
  }

  if (isOpen) {
    saveBar.style.display = 'flex';
    updateSaveStatus();
  } else {
    saveBar.style.display = 'none';
  }
}

function buildPickCard(game, t1, t2, winner, isOpen, savedPicks, cfg) {
  const card = document.createElement('div');
  card.className = 'pick-card';

  // Strip "Group X: " prefix for group stage cards (already shown in section header)
  const rawLabel = game.label || (game.region ? `Quadrant ${game.region}` : '');
  const regionLabel = game.round === 'groups' ? rawLabel.replace(/^Group [A-L]: /i, '') : rawLabel;
  const sc = state.scores[game.id];
  const scoreTag = sc !== undefined
    ? `<span class="pick-card-score">${sc.t1}–${sc.t2}</span>`
    : '';
  const hdr = document.createElement('div');
  hdr.className = 'pick-card-hdr';
  hdr.innerHTML = `<span class="pick-card-hdr-label">${esc(regionLabel)}</span>
    ${scoreTag}<span class="pick-pts">${cfg.pts} pt${cfg.pts > 1 ? 's' : ''}</span>`;
  card.appendChild(hdr);

  if (!t1 && !t2) {
    const tbd = document.createElement('div');
    tbd.className = 'pick-tbd';
    tbd.textContent = 'Matchup TBD — teams not yet determined';
    card.appendChild(tbd);
    return card;
  }

  const savedPick = savedPicks[game.id];
  const isDrawResult = state.results[game.id] === 'Draw';

  // Build the options list: for group stage add Draw in middle
  const options = game.round === 'groups'
    ? [{ team: t1 }, { team: null, isDraw: true }, { team: t2 }]
    : [{ team: t1 }, { team: t2 }];

  options.forEach(({ team, isDraw }) => {
    const optionName = isDraw ? 'Draw' : team?.name;
    if (!team && !isDraw) return;

    const isPicked     = state.pendingPicks[game.id] === optionName;
    const isPlayerPick = savedPick === optionName;
    const row = document.createElement('div');
    row.className = 'pick-option' + (isDraw ? ' pick-draw-option' : '');
    if (!isOpen) row.classList.add('disabled');
    if (isPicked) row.classList.add('selected');

    let resultMark = '';
    const resultEntered = state.results[game.id] !== undefined;
    if (resultEntered) {
      const isCorrectResult = isDraw ? isDrawResult : (winner && winner.name === team.name);
      if (isPlayerPick) {
        if (isCorrectResult) {
          resultMark = '<span class="pick-o-result correct">✔ Correct</span>';
          row.classList.add('result-correct');
        } else {
          resultMark = '<span class="pick-o-result wrong">✘ Wrong</span>';
          row.classList.add('result-wrong');
        }
      } else if (isCorrectResult) {
        resultMark = isDraw
          ? '<span class="pick-o-result won">DRAW</span>'
          : '<span class="pick-o-result won">WON</span>';
      }
    }

    const radio = document.createElement('input');
    radio.type     = 'radio';
    radio.name     = `game-${game.id}`;
    radio.value    = optionName;
    radio.checked  = isPicked;
    radio.disabled = !isOpen;

    const optPts = calcPickPoints(game, optionName, cfg);
    const ptsTxt = Number.isInteger(optPts)
      ? `${optPts} pt${optPts !== 1 ? 's' : ''}` : `${optPts} pts`;

    if (isDraw) {
      row.innerHTML = `<span class="pick-o-seed"></span><span class="pick-o-name pick-draw-label">Draw</span><span class="pick-o-pts">${ptsTxt}</span>${resultMark}`;
    } else {
      row.innerHTML = `<span class="pick-o-seed">${team.seed}</span><span class="pick-o-name">${esc(team.name)}</span><span class="pick-o-pts">${ptsTxt}</span>${resultMark}`;
    }
    row.insertBefore(radio, row.firstChild);

    if (isOpen) {
      row.addEventListener('click', () => {
        state.pendingPicks[game.id] = optionName;
        document.querySelectorAll(`[name="game-${game.id}"]`).forEach(r => r.checked = false);
        radio.checked = true;
        document.querySelectorAll(`.pick-option`).forEach(el => {
          if (el.querySelector(`[name="game-${game.id}"]`)) {
            el.classList.remove('selected');
            if (el.querySelector(`[value="${CSS.escape(optionName)}"]`)) el.classList.add('selected');
          }
        });
        updateSaveStatus();
      });
    }
    card.appendChild(row);
  });

  return card;
}

function updateSaveStatus() {
  const statusEl = document.getElementById('save-status');
  if (!statusEl) return;
  const roundId = state.activePicksRound;
  const games   = getGamesForRound(roundId);
  const picked  = Object.keys(state.pendingPicks).filter(gid =>
    games.find(g => g.id === gid) && state.pendingPicks[gid]
  ).length;
  if (roundId === 'groups') {
    const incomplete = GROUP_LETTERS.filter(g => {
      const grpGames = games.filter(gm => gm.region === g);
      return grpGames.some(gm => !state.pendingPicks[gm.id]);
    });
    statusEl.textContent = picked === games.length
      ? `All ${games.length} picks complete ✔`
      : `${picked} / ${games.length} picked — ${incomplete.length} group${incomplete.length !== 1 ? 's' : ''} incomplete (${incomplete.join(', ')})`;
    // Update per-group progress counters live
    document.querySelectorAll('.picks-group-section').forEach(section => {
      const grpLetter = section.querySelector('.picks-group-hdr')?.textContent?.match(/Group ([A-L])/)?.[1];
      if (!grpLetter) return;
      const grpGames = games.filter(gm => gm.region === grpLetter);
      const done = grpGames.filter(gm => state.pendingPicks[gm.id]).length;
      const prog = section.querySelector('.picks-group-progress');
      if (prog) prog.textContent = `${done}/${grpGames.length}`;
    });
  } else {
    statusEl.textContent = `${picked} / ${games.length} games picked`;
  }
}

function savePicks() {
  const pid = state.currentPlayer;
  const rid = state.activePicksRound;
  if (!pid) return;
  if (!state.picks[pid]) state.picks[pid] = {};
  state.picks[pid][rid] = { ...state.pendingPicks };
  saveState();
  showToast('Picks saved!', 'success');
  renderPicks();
}

// ── LEADERBOARD RENDERING ─────────────────────────────────────

function renderLeaderboard() {
  renderLbTabs();
  renderLbBody();
}

function renderLbTabs() {
  const tabs = document.getElementById('lb-tabs');
  tabs.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'round-tab' + (state.lbRound === 'all' ? ' active' : '');
  allBtn.textContent = 'Total';
  allBtn.addEventListener('click', () => { state.lbRound = 'all'; renderLeaderboard(); });
  tabs.appendChild(allBtn);
  ROUND_CONFIG.forEach(cfg => {
    const btn = document.createElement('button');
    btn.className = 'round-tab' + (state.lbRound === cfg.id ? ' active' : '');
    btn.textContent = cfg.short;
    btn.addEventListener('click', () => { state.lbRound = cfg.id; renderLeaderboard(); });
    tabs.appendChild(btn);
  });
}

function renderLbBody() {
  const body = document.getElementById('lb-body');
  if (!state.players.length) {
    body.innerHTML = '<div class="empty-state"><div class="es-icon">&#128202;</div>No players yet. Add players in Admin.</div>';
    return;
  }

  const rows = state.players.map(p => {
    const total   = getPlayerTotalScore(p.id);
    const byRound = {};
    ROUND_CONFIG.forEach(cfg => { byRound[cfg.id] = getPlayerRoundScore(p.id, cfg.id); });
    return { player: p, total, byRound };
  });
  rows.sort((a, b) => b.total.total - a.total.total);

  // Best score per round (for green highlight)
  const roundBest = {};
  ROUND_CONFIG.forEach(cfg => {
    let best = 0;
    rows.forEach(r => { if (r.byRound[cfg.id].score > best) best = r.byRound[cfg.id].score; });
    if (best > 0) roundBest[cfg.id] = best;
  });

  const table = document.createElement('table');
  table.className = 'lb-table';

  const thead = document.createElement('thead');
  let thHTML = '<tr><th>#</th><th>Player</th>';
  if (state.lbRound === 'all') {
    thHTML += '<th>Score</th><th>Total</th>';
    ROUND_CONFIG.forEach(cfg => { thHTML += `<th class="num">${cfg.short}</th>`; });
  } else {
    thHTML += '<th class="num">Score</th><th class="num">Total</th>';
  }
  thHTML += '</tr>';
  thead.innerHTML = thHTML;
  table.appendChild(thead);

  const lbViewRound  = state.lbRound === 'all' ? state.currentRound : state.lbRound;
  const picksVisible = isRoundPicksVisible(lbViewRound);

  const tbody = document.createElement('tbody');
  rows.forEach((row, i) => {
    const rank    = i + 1;
    const isMe    = row.player.id === (state.sessionPlayer || state.currentPlayer);
    const tr      = document.createElement('tr');
    if (isMe) tr.classList.add('me');

    const rankCls  = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '';
    const rankIcon = rank === 1 ? '&#127942;' : rank === 2 ? '&#129352;' : rank === 3 ? '&#129353;' : rank;

    const isOwnRow   = row.player.id === (state.sessionPlayer || state.currentPlayer);
    const cantPeek   = !isAdmin() && !isOwnRow;
    const linkLocked = cantPeek || (!picksVisible && !isOwnRow);
    const lockTag    = linkLocked ? ' <span class="lb-lock-icon">&#128274;</span>' : '';
    const btnClass   = linkLocked ? 'lb-player-link picks-locked' : 'lb-player-link';
    const btnTitle   = cantPeek ? ' title="You can only view your own picks"'
      : linkLocked ? ' title="Picks revealed when the round is closed"' : '';

    const avatar = playerAvatarHtml(row.player.name, 64);
    let tdHTML = `<td class="rank-num ${rankCls}">${rankIcon}</td>
      <td><div class="lb-player-cell">${avatar}<button class="${btnClass}" data-pid="${row.player.id}"${btnTitle}>${esc(row.player.name)}${lockTag}</button></div></td>`;

    if (state.lbRound === 'all') {
      const maxPossible = row.total.total + row.total.possible;
      const maxScore = ROUND_CONFIG.reduce((sum, cfg) => sum + cfg.pts * getGamesForRound(cfg.id).length, 0);
      const pctW = Math.min(100, Math.round((row.total.total / maxScore) * 100));
      const wl = row.total.correct || row.total.wrong
        ? `<span class="lb-wl"><span class="lb-w">${row.total.correct}✔</span> <span class="lb-l">${row.total.wrong}✘</span></span>`
        : '';
      tdHTML += `<td><span class="lb-total">${fmtScore(row.total.total)}</span>${wl}
          <div class="pct-bar-wrap"><div class="pct-bar" style="width:${pctW}%"></div></div></td>
        <td class="lb-possible">${fmtScore(maxPossible)}</td>`;
      ROUND_CONFIG.forEach(cfg => {
        const s = row.byRound[cfg.id];
        const isBest = roundBest[cfg.id] && s.score === roundBest[cfg.id];
        const wlTip = s.correct || s.wrong ? ` title="${s.correct}✔ ${s.wrong}✘"` : '';
        tdHTML += `<td class="lb-round-score num ${s.score === 0 && !s.correct && !s.wrong ? 'zero' : ''}${isBest ? ' round-best' : ''}"${wlTip}>${fmtScore(s.score)}</td>`;
      });
    } else {
      const s = row.byRound[state.lbRound];
      const isBest = roundBest[state.lbRound] && s.score === roundBest[state.lbRound];
      const wl = s.correct || s.wrong
        ? `<div class="lb-wl-row"><span class="lb-w">${s.correct} correct</span> <span class="lb-l">${s.wrong} wrong</span></div>`
        : '';
      tdHTML += `<td class="num${isBest ? ' round-best' : ''}"><span class="lb-total">${fmtScore(s.score)}</span>${wl}</td>
        <td class="lb-possible num">${fmtScore(s.score + s.possible)}</td>`;
    }

    tr.innerHTML = tdHTML;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  body.innerHTML = '';
  body.appendChild(table);

  tbody.addEventListener('click', e => {
    const btn = e.target.closest('.lb-player-link');
    if (!btn) return;
    const pid = btn.dataset.pid;
    if (btn.classList.contains('picks-locked')) {
      const isOwnPid = pid === (state.sessionPlayer || state.currentPlayer);
      showToast(!isAdmin() && !isOwnPid
        ? 'You can only view your own picks'
        : 'Picks are revealed once the Admin closes this round', 'info');
      return;
    }
    const roundId  = state.lbRound === 'all' ? state.currentRound : state.lbRound;
    const isOwnPid = pid === (state.sessionPlayer || state.currentPlayer);
    if (isOwnPid) {
      state.adminViewPlayer  = null;
      state.currentPlayer    = pid;
      state.activePicksRound = roundId;
    } else {
      state.adminViewPlayer  = pid;
      state.activePicksRound = roundId;
    }
    switchView('picks');
  });
}

// ── PICKS AUTO-FIX ────────────────────────────────────────────

function fixInvalidPicks() {
  let fixed = 0;
  state.players.forEach(p => {
    if (!state.picks[p.id]) state.picks[p.id] = {};
    ROUND_CONFIG.forEach(cfg => {
      if (!state.picks[p.id][cfg.id]) state.picks[p.id][cfg.id] = {};
      getGamesForRound(cfg.id).forEach(g => {
        const { t1, t2 } = getTeams(g);
        if (!t1 || !t2) return;
        const stored = state.picks[p.id][cfg.id][g.id];
        const validPicks = cfg.id === 'groups'
          ? [t1.name, t2.name, 'Draw']
          : [t1.name, t2.name];
        if (!validPicks.includes(stored)) {
          const r = Math.random();
          state.picks[p.id][cfg.id][g.id] = cfg.id === 'groups'
            ? (r < 0.4 ? t1.name : r < 0.75 ? t2.name : 'Draw')
            : (r < 0.5 ? t1.name : t2.name);
          fixed++;
        }
      });
    });
  });
  if (fixed > 0) saveState();
  return fixed;
}

// ── ADMIN BONUS ANSWERS ───────────────────────────────────────

function renderBonusAdmin() {
  const container = document.getElementById('bonus-answers-grid');
  if (!container) return;
  container.innerHTML = '';

  const roundSel = document.getElementById('results-round-sel');
  const roundId  = roundSel ? roundSel.value : state.currentRound;
  const bonuses  = BONUS_CONFIG[roundId] || [];

  if (!bonuses.length) {
    container.innerHTML = '<div class="result-tbd">No bonus questions for this round.</div>';
    return;
  }

  bonuses.forEach(b => {
    const card = document.createElement('div');
    card.className = 'bonus-admin-card';

    const hdr = document.createElement('div');
    hdr.className = 'bonus-admin-hdr';
    hdr.innerHTML = `<span>${esc(b.label)}</span><span class="bonus-pts">${b.points} pts</span>`;
    card.appendChild(hdr);

    const correctAns = state.bonusAnswers[b.id];

    if (b.type === 'multi') {
      const srcRound = b.sourceRound || 'qf';
      const srcGames = getGamesForRound(srcRound);
      const actualWinners = srcGames.map(g => { const w = getWinner(g.id); return w ? w.name : ''; });
      state.bonusAnswers[b.id] = actualWinners;

      for (let i = 0; i < actualWinners.length; i++) {
        const row = document.createElement('div');
        row.className = 'bonus-input-row';
        const label = document.createElement('span');
        label.className = 'bonus-input-label';
        label.textContent = `Team ${i + 1}:`;
        row.appendChild(label);
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'bonus-input admin-bonus-input';
        inp.placeholder = 'From entered results...';
        inp.value = actualWinners[i] || '';
        inp.disabled = true;
        inp.dataset.bonusId  = b.id;
        inp.dataset.bonusIdx = i;
        row.appendChild(inp);
        card.appendChild(row);
      }
    } else if (b.type === 'select' && b.options) {
      const row = document.createElement('div');
      row.className = 'bonus-input-row';
      const sel = document.createElement('select');
      sel.className = 'bonus-input admin-bonus-input';
      sel.dataset.bonusId = b.id;
      const defOpt = document.createElement('option');
      defOpt.value = '';
      defOpt.textContent = '— Select correct answer —';
      sel.appendChild(defOpt);
      b.options.forEach(optText => {
        const o = document.createElement('option');
        o.value = optText;
        o.textContent = optText;
        if (correctAns === optText) o.selected = true;
        sel.appendChild(o);
      });
      row.appendChild(sel);
      card.appendChild(row);
    } else {
      const row = document.createElement('div');
      row.className = 'bonus-input-row';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'bonus-input admin-bonus-input';
      inp.placeholder = 'Enter correct answer...';
      inp.value = correctAns || '';
      inp.dataset.bonusId = b.id;
      row.appendChild(inp);
      card.appendChild(row);
    }

    container.appendChild(card);
  });
}

function saveBonusAnswers() {
  const inputs = document.querySelectorAll('.admin-bonus-input');
  inputs.forEach(inp => {
    const bid = inp.dataset.bonusId;
    const idx = inp.dataset.bonusIdx;
    if (idx !== undefined) {
      if (!state.bonusAnswers[bid] || !Array.isArray(state.bonusAnswers[bid])) {
        const bonus = Object.values(BONUS_CONFIG).flat().find(b => b.id === bid);
        state.bonusAnswers[bid] = new Array(bonus ? bonus.count : 4).fill('');
      }
      state.bonusAnswers[bid][parseInt(idx)] = inp.value.trim();
    } else {
      state.bonusAnswers[bid] = inp.value.trim();
    }
  });
  saveState();
  showToast('Bonus answers saved!', 'success');
}

// ── R32 ADMIN ─────────────────────────────────────────────────

// Returns { A: [...8], B: [...8], C: [...8], D: [...8] } built from group standings.
// Groups A-C → Quadrant A, D-F → B, G-I → C, J-L → D.
// Within each quadrant: 3 winners + 3 runners-up (cross-paired to avoid rematches)
// + 2 best 3rd-place teams (sorted globally, 2 per quadrant in rank order).
function buildR32FromGroups() {
  // Assign 3 consecutive groups to each knockout quadrant
  const QUADRANT_GROUPS = { A: ['A','B','C'], B: ['D','E','F'], C: ['G','H','I'], D: ['J','K','L'] };

  // Compute all 12 third-place finishers, pick best 8 by pts → wins → seed
  const thirdPlace = GROUP_LETTERS.map(grp => {
    const s = getGroupStandings(grp);
    return s[2] ? { team: s[2].team, pts: s[2].pts, w: s[2].w, group: grp } : null;
  }).filter(Boolean);
  thirdPlace.sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.w !== a.w ? b.w - a.w : a.team.seed - b.team.seed);
  const best8 = thirdPlace.slice(0, 8).map(e => ({ name: e.team.name, seed: e.team.seed }));

  const cur = state.r32Teams || INITIAL_TEAMS;
  const getTeamAt = (standings, rank, fallback) => {
    const e = standings[rank];
    return e ? { name: e.team.name, seed: e.team.seed } : fallback;
  };

  const result = {};
  REGIONS.forEach((region, qi) => {
    const [g1, g2, g3] = QUADRANT_GROUPS[region];
    const s1 = getGroupStandings(g1), s2 = getGroupStandings(g2), s3 = getGroupStandings(g3);
    const fb = cur[region];
    // Matchups avoid same-group rematches:
    // Game 0: g1-winner vs g2-runner-up
    // Game 1: g2-winner vs g3-runner-up
    // Game 2: g3-winner vs g1-runner-up
    // Game 3: best-3rd vs 2nd-best-3rd (for this quadrant)
    result[region] = [
      getTeamAt(s1, 0, fb[0]), getTeamAt(s2, 1, fb[1]),
      getTeamAt(s2, 0, fb[2]), getTeamAt(s3, 1, fb[3]),
      getTeamAt(s3, 0, fb[4]), getTeamAt(s1, 1, fb[5]),
      best8[qi * 2]     || fb[6],
      best8[qi * 2 + 1] || fb[7],
    ];
  });
  return result;
}

function renderR32Admin() {
  const container = document.getElementById('r32-admin-grid');
  if (!container) return;
  container.innerHTML = '';

  const r32Source = state.r32Teams || INITIAL_TEAMS;

  // Group standings summary for reference
  const summary = document.createElement('div');
  summary.className = 'r32-group-summary';
  const groupsDone = GROUP_LETTERS.filter(grp =>
    getGamesForRound('groups').filter(g => g.region === grp).every(g => state.results[g.id])
  ).length;
  summary.innerHTML = `<span class="r32-summary-label">Group Stage: ${groupsDone}/12 complete</span>`;
  container.appendChild(summary);

  REGIONS.forEach(region => {
    const block = document.createElement('div');
    block.className = 'r32-admin-quadrant';

    const qHdr = document.createElement('div');
    qHdr.className = 'r32-admin-qhdr';
    qHdr.textContent = `Quadrant ${region}`;
    block.appendChild(qHdr);

    const teams = r32Source[region];
    for (let i = 0; i < 4; i++) {
      const gameRow = document.createElement('div');
      gameRow.className = 'r32-admin-game';

      const gameLbl = document.createElement('span');
      gameLbl.className = 'r32-admin-game-lbl';
      gameLbl.textContent = `R32-${region}${i + 1}`;
      gameRow.appendChild(gameLbl);

      [0, 1].forEach(slot => {
        const t = teams[i * 2 + slot];
        const sel = document.createElement('select');
        sel.className = 'r32-team-sel sel-input';
        sel.dataset.region = region;
        sel.dataset.slot   = String(i * 2 + slot);

        const blankOpt = document.createElement('option');
        blankOpt.value = '';
        blankOpt.textContent = '— TBD —';
        sel.appendChild(blankOpt);

        ALL_TEAM_NAMES.forEach(name => {
          const teamObj = Object.values(GROUP_TEAMS).flat().find(x => x.name === name);
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = teamObj ? `(${teamObj.seed}) ${name}` : name;
          if (t && t.name === name) opt.selected = true;
          sel.appendChild(opt);
        });

        if (slot === 0) {
          gameRow.appendChild(sel);
          const vs = document.createElement('span');
          vs.className = 'r32-admin-vs';
          vs.textContent = 'vs';
          gameRow.appendChild(vs);
        } else {
          gameRow.appendChild(sel);
        }
      });

      block.appendChild(gameRow);
    }
    container.appendChild(block);
  });
}

function saveR32Teams() {
  const sels = document.querySelectorAll('.r32-team-sel');
  const newTeams = { A: new Array(8).fill(null), B: new Array(8).fill(null), C: new Array(8).fill(null), D: new Array(8).fill(null) };
  sels.forEach(sel => {
    const region = sel.dataset.region;
    const slot   = parseInt(sel.dataset.slot);
    const name   = sel.value;
    if (name) {
      const teamObj = Object.values(GROUP_TEAMS).flat().find(t => t.name === name);
      newTeams[region][slot] = teamObj ? { name: teamObj.name, seed: teamObj.seed } : { name, seed: 99 };
    } else {
      const cur = (state.r32Teams || INITIAL_TEAMS)[region][slot];
      newTeams[region][slot] = cur || { name: 'TBD', seed: 99 };
    }
  });
  state.r32Teams = newTeams;
  rebuildGames();
  const fixed = fixInvalidPicks();
  saveState();
  showToast(fixed > 0 ? `R32 bracket saved · ${fixed} pick${fixed !== 1 ? 's' : ''} auto-filled` : 'R32 bracket saved!', 'success');
  renderR32Admin();
}

function autoFillR32FromGroups() {
  const groupsDone = GROUP_LETTERS.filter(grp =>
    getGamesForRound('groups').filter(g => g.region === grp).every(g => state.results[g.id])
  ).length;
  if (groupsDone < 12) {
    showToast(`Only ${groupsDone}/12 groups complete — partial auto-fill applied`, 'info');
  }
  state.r32Teams = buildR32FromGroups();
  rebuildGames();
  const fixed = fixInvalidPicks();
  saveState();
  showToast(fixed > 0 ? `R32 auto-filled from group standings · ${fixed} pick${fixed !== 1 ? 's' : ''} updated` : 'R32 auto-filled from group standings!', 'success');
  renderR32Admin();
}

// ── DEMO DATA ─────────────────────────────────────────────────

function loadDemoData() {
  // Simulated World Cup 2026 results: Group Stage through Final.
  // Notable upsets: USA beats England (group), Colombia tops Group A,
  // Argentina beats France (QF), England beats Brazil (QF),
  // Argentina beats England (SF) — Argentina vs Portugal Final.
  state.results = {
    // ── GROUP STAGE ───────────────────────────────────────────
    // Pairs per group: [0]t1vt2 [1]t3vt4 [2]t1vt3 [3]t2vt4 [4]t1vt4 [5]t2vt3
    // Group A: Argentina 1st, Colombia 2nd. Draws: Arg-Col MD1, Ser-CRI MD3
    'groups-a-0': 'Draw',      'groups-a-1': 'Costa Rica', // MD1: Arg=Draw, CRI beats SRB
    'groups-a-2': 'Argentina', 'groups-a-3': 'Colombia',   // MD2
    'groups-a-4': 'Argentina', 'groups-a-5': 'Draw',       // MD3: Arg beats CRI, Col draws SRB
    // Group B: France 1st, Morocco 2nd. Draw: Fra-Mor MD1
    'groups-b-0': 'Draw',      'groups-b-1': 'Austria',    // MD1: Draw, AUT beats HON
    'groups-b-2': 'France',    'groups-b-3': 'Morocco',    // MD2
    'groups-b-4': 'France',    'groups-b-5': 'Morocco',    // MD3
    // Group C: USA beats England (upset!), USA 1st, England 2nd
    'groups-c-0': 'USA',       'groups-c-1': 'Turkey',     // MD1: USA beats ENG, TUR beats PAN
    'groups-c-2': 'Draw',      'groups-c-3': 'Draw',       // MD2: both draws
    'groups-c-4': 'England',   'groups-c-5': 'USA',        // MD3
    // Group D: Spain 1st, Mexico 2nd. Draw: Spa-NZL MD3, Mex-POL MD3
    // MD1: Spa vs Mex, Pol vs NZL | MD2: Spa vs Pol, Mex vs NZL | MD3: Spa vs NZL, Mex vs Pol
    'groups-d-0': 'Spain',     'groups-d-1': 'Poland',     // MD1: Spain beats Mexico, Poland beats NZL
    'groups-d-2': 'Spain',     'groups-d-3': 'Mexico',     // MD2
    'groups-d-4': 'Draw',      'groups-d-5': 'Draw',       // MD3: both draw
    // Group E: Brazil 1st, Denmark 2nd. Draw: Bra-Den MD1
    'groups-e-0': 'Draw',      'groups-e-1': 'Canada',     // MD1: Bra-Den draw, CAN beats RSA
    'groups-e-2': 'Brazil',    'groups-e-3': 'Denmark',    // MD2
    'groups-e-4': 'Brazil',    'groups-e-5': 'Denmark',    // MD3
    // Group F: Portugal 1st, Switzerland 2nd
    // MD1: Por vs Sui, CIV vs GHA | MD2: Por vs CIV, Sui vs GHA | MD3: Por vs GHA, Sui vs CIV
    'groups-f-0': 'Portugal',  'groups-f-1': 'Ghana',      // MD1: Portugal beats SUI, Ghana beats CIV
    'groups-f-2': 'Portugal',  'groups-f-3': 'Draw',       // MD2: Por wins, SUI-GHA draw
    'groups-f-4': 'Portugal',  'groups-f-5': 'Switzerland',// MD3
    // Group G: Netherlands 1st, Japan 2nd (upset)
    // MD1: Ned vs Jap, Ven vs Tun | MD2: Ned vs Ven, Jap vs Tun | MD3: Ned vs Tun, Jap vs Ven
    'groups-g-0': 'Netherlands','groups-g-1': 'Venezuela',   // MD1: Ned beats Jap, Ven beats Tun (upset)
    'groups-g-2': 'Draw',      'groups-g-3': 'Japan',        // MD2: Ned-Ven draw, Japan beats Tun
    'groups-g-4': 'Netherlands','groups-g-5': 'Japan',        // MD3
    // Group H: Belgium 1st, Senegal 2nd
    // MD1: Bel vs Sen, Nig vs Uzb | MD2: Bel vs Nig, Sen vs Uzb | MD3: Bel vs Uzb, Sen vs Nig
    'groups-h-0': 'Belgium',   'groups-h-1': 'Nigeria',    // MD1: Belgium beats Sen, Nigeria beats Uzb
    'groups-h-2': 'Belgium',   'groups-h-3': 'Draw',       // MD2: Bel wins, Sen-Uzb draw
    'groups-h-4': 'Belgium',   'groups-h-5': 'Senegal',    // MD3
    // Group I: Italy 1st, South Korea 2nd. Draw: Ita-Kor MD1
    // MD1: Ita vs Kor, Egy vs Irq | MD2: Ita vs Egy, Kor vs Irq | MD3: Ita vs Irq, Kor vs Egy
    'groups-i-0': 'Draw',      'groups-i-1': 'Egypt',      // MD1: Ita-Kor draw, Egypt beats Iraq
    'groups-i-2': 'Italy',     'groups-i-3': 'Draw',       // MD2: Ita wins, Kor-Irq draw
    'groups-i-4': 'Italy',     'groups-i-5': 'South Korea',// MD3
    // Group J: Germany 1st, Ecuador 2nd. Draw: Ger-Ecu MD1
    // MD1: Ger vs Ecu, KSA vs Jor | MD2: Ger vs KSA, Ecu vs Jor | MD3: Ger vs Jor, Ecu vs KSA
    'groups-j-0': 'Draw',      'groups-j-1': 'Saudi Arabia',// MD1: Ger-Ecu draw, KSA beats Jor
    'groups-j-2': 'Germany',   'groups-j-3': 'Draw',        // MD2: Ger wins, Ecu-Jor draw
    'groups-j-4': 'Germany',   'groups-j-5': 'Ecuador',     // MD3
    // Group K: teams[0]=Croatia [1]=Iran [2]=Cameroon [3]=Bolivia
    // Pairs: k0=CROvIRN k1=CAMvBOL k2=CROvCAM k3=IRNvBOL k4=CROvBOL k5=IRNvCAM
    // Croatia 1st (7pts), Iran 2nd (6pts)
    'groups-k-0': 'Croatia',   'groups-k-1': 'Cameroon',  // MD1: CRO beats IRN, CAM beats BOL
    'groups-k-2': 'Croatia',   'groups-k-3': 'Iran',      // MD2: CRO beats CAM, IRN beats BOL
    'groups-k-4': 'Draw',      'groups-k-5': 'Iran',      // MD3: CRO-BOL draw, IRN beats CAM
    // Group L: teams[0]=Uruguay [1]=Australia [2]=Algeria [3]=Jamaica
    // Pairs: l0=URUvAUS l1=ALGvJAM l2=URUvALG l3=AUSvJAM l4=URUvJAM l5=ALGvAUS
    // Uruguay 1st (7pts), Algeria 2nd (6pts, upset)
    'groups-l-0': 'Draw',      'groups-l-1': 'Algeria',   // MD1: URU-AUS draw, ALG beats JAM
    'groups-l-2': 'Uruguay',   'groups-l-3': 'Australia', // MD2: URU beats ALG, AUS beats JAM
    'groups-l-4': 'Uruguay',   'groups-l-5': 'Algeria',   // MD3: URU beats JAM, ALG beats AUS

    // ── QUADRANT A ────────────────────────────────────────────
    // R32: France✓  Colombia(13)>Netherlands(7)  Morocco✓  Argentina✓
    'r32-a-0': 'France',      'r32-a-1': 'Colombia',
    'r32-a-2': 'Morocco',     'r32-a-3': 'Argentina',
    // R16: France beats Colombia  Argentina beats Morocco
    'r16-a-0': 'France',      'r16-a-1': 'Argentina',
    // QF: Argentina(1) beats France(2) — MAJOR UPSET
    'qf-a-0':  'Argentina',

    // ── QUADRANT B ────────────────────────────────────────────
    // R32: England✓  USA(15)>Germany(10)  Belgium✓  Brazil✓
    'r32-b-0': 'England',     'r32-b-1': 'USA',
    'r32-b-2': 'Belgium',     'r32-b-3': 'Brazil',
    // R16: England beats USA  Brazil beats Belgium
    'r16-b-0': 'England',     'r16-b-1': 'Brazil',
    // QF: England(3) beats Brazil(5) — UPSET
    'qf-b-0':  'England',

    // ── QUADRANT C ────────────────────────────────────────────
    // R32: Spain✓  Portugal✓  Japan(19)>Algeria(36)  Italy✓
    'r32-c-0': 'Spain',       'r32-c-1': 'Portugal',
    'r32-c-2': 'Japan',       'r32-c-3': 'Italy',
    // R16: Portugal(6) beats Spain(4) — UPSET  Italy beats Japan
    'r16-c-0': 'Portugal',    'r16-c-1': 'Italy',
    // QF: Portugal beats Italy
    'qf-c-0':  'Portugal',

    // ── QUADRANT D ────────────────────────────────────────────
    // R32: Uruguay✓  Croatia✓  Denmark✓  Switzerland✓
    'r32-d-0': 'Uruguay',     'r32-d-1': 'Croatia',
    'r32-d-2': 'Denmark',     'r32-d-3': 'Switzerland',
    // R16: Uruguay beats Croatia  Switzerland beats Denmark
    'r16-d-0': 'Uruguay',     'r16-d-1': 'Switzerland',
    // QF: Switzerland(18) beats Uruguay(12) — UPSET
    'qf-d-0':  'Switzerland',

    // ── SEMIFINALS ────────────────────────────────────────────
    'sf-0': 'Argentina',
    'sf-1': 'Portugal',

    // ── FINAL ─────────────────────────────────────────────────
    'final-0': 'Argentina',
  };

  // ── SCORES ────────────────────────────────────────────────
  state.scores = {
    // Group A
    'groups-a-0': {t1:1,t2:1}, 'groups-a-1': {t1:1,t2:2}, 'groups-a-2': {t1:3,t2:0},
    'groups-a-3': {t1:2,t2:0}, 'groups-a-4': {t1:2,t2:0}, 'groups-a-5': {t1:1,t2:1},
    // Group B
    'groups-b-0': {t1:1,t2:1}, 'groups-b-1': {t1:2,t2:0}, 'groups-b-2': {t1:2,t2:0},
    'groups-b-3': {t1:2,t2:0}, 'groups-b-4': {t1:1,t2:0}, 'groups-b-5': {t1:1,t2:0},
    // Group C
    'groups-c-0': {t1:1,t2:2}, 'groups-c-1': {t1:2,t2:0}, 'groups-c-2': {t1:1,t2:1},
    'groups-c-3': {t1:1,t2:1}, 'groups-c-4': {t1:2,t2:0}, 'groups-c-5': {t1:2,t2:1},
    // Group D
    'groups-d-0': {t1:3,t2:0}, 'groups-d-1': {t1:2,t2:0}, 'groups-d-2': {t1:2,t2:0},
    'groups-d-3': {t1:3,t2:0}, 'groups-d-4': {t1:1,t2:1}, 'groups-d-5': {t1:1,t2:1},
    // Group E
    'groups-e-0': {t1:1,t2:1}, 'groups-e-1': {t1:2,t2:0}, 'groups-e-2': {t1:2,t2:0},
    'groups-e-3': {t1:2,t2:1}, 'groups-e-4': {t1:1,t2:0}, 'groups-e-5': {t1:1,t2:0},
    // Group F
    'groups-f-0': {t1:2,t2:0}, 'groups-f-1': {t1:0,t2:1}, 'groups-f-2': {t1:3,t2:0},
    'groups-f-3': {t1:1,t2:1}, 'groups-f-4': {t1:2,t2:0}, 'groups-f-5': {t1:2,t2:0},
    // Group G
    'groups-g-0': {t1:2,t2:1}, 'groups-g-1': {t1:2,t2:0}, 'groups-g-2': {t1:1,t2:1},
    'groups-g-3': {t1:2,t2:0}, 'groups-g-4': {t1:2,t2:0}, 'groups-g-5': {t1:2,t2:1},
    // Group H
    'groups-h-0': {t1:2,t2:0}, 'groups-h-1': {t1:2,t2:0}, 'groups-h-2': {t1:1,t2:0},
    'groups-h-3': {t1:1,t2:1}, 'groups-h-4': {t1:2,t2:0}, 'groups-h-5': {t1:1,t2:0},
    // Group I
    'groups-i-0': {t1:1,t2:1}, 'groups-i-1': {t1:1,t2:0}, 'groups-i-2': {t1:2,t2:0},
    'groups-i-3': {t1:1,t2:1}, 'groups-i-4': {t1:1,t2:0}, 'groups-i-5': {t1:2,t2:0},
    // Group J
    'groups-j-0': {t1:1,t2:1}, 'groups-j-1': {t1:2,t2:0}, 'groups-j-2': {t1:2,t2:0},
    'groups-j-3': {t1:1,t2:1}, 'groups-j-4': {t1:2,t2:0}, 'groups-j-5': {t1:2,t2:0},
    // Group K
    'groups-k-0': {t1:2,t2:0}, 'groups-k-1': {t1:2,t2:0}, 'groups-k-2': {t1:2,t2:1},
    'groups-k-3': {t1:1,t2:0}, 'groups-k-4': {t1:1,t2:1}, 'groups-k-5': {t1:1,t2:0},
    // Group L
    'groups-l-0': {t1:1,t2:1}, 'groups-l-1': {t1:2,t2:0}, 'groups-l-2': {t1:2,t2:0},
    'groups-l-3': {t1:1,t2:0}, 'groups-l-4': {t1:2,t2:0}, 'groups-l-5': {t1:2,t2:1},
    // Knockout — scores always reflect actual winner (winner must have more goals)
    // r32-a: France(t1)✓ Colombia(t2)✓ Morocco(t1)✓ Argentina(t1)✓
    'r32-a-0': {t1:2,t2:0}, 'r32-a-1': {t1:0,t2:2}, 'r32-a-2': {t1:1,t2:0}, 'r32-a-3': {t1:2,t2:0},
    // r32-b: England(t1)✓ USA(t2)✓ Belgium(t1)✓ Brazil(t1)✓
    'r32-b-0': {t1:2,t2:1}, 'r32-b-1': {t1:0,t2:2}, 'r32-b-2': {t1:2,t2:1}, 'r32-b-3': {t1:2,t2:1},
    // r32-c: Spain(t1)✓ Portugal(t1)✓ Japan(t1)✓ Italy(t1)✓
    'r32-c-0': {t1:2,t2:0}, 'r32-c-1': {t1:2,t2:0}, 'r32-c-2': {t1:2,t2:1}, 'r32-c-3': {t1:1,t2:0},
    // r32-d: Uruguay(t1)✓ Croatia(t1)✓ Denmark(t1)✓ Switzerland(t1)✓
    'r32-d-0': {t1:1,t2:0}, 'r32-d-1': {t1:2,t2:1}, 'r32-d-2': {t1:2,t2:1}, 'r32-d-3': {t1:2,t2:0},
    // r16: France✓ Argentina(t2)✓ England✓ Brazil(t2)✓ Portugal(t2)✓ Italy(t2)✓ Uruguay✓ Switzerland(t2)✓
    'r16-a-0': {t1:2,t2:1}, 'r16-a-1': {t1:0,t2:3}, 'r16-b-0': {t1:2,t2:0}, 'r16-b-1': {t1:1,t2:2},
    'r16-c-0': {t1:1,t2:2}, 'r16-c-1': {t1:0,t2:2}, 'r16-d-0': {t1:1,t2:0}, 'r16-d-1': {t1:0,t2:2},
    // qf: Argentina(t2)✓ England(t1)✓ Portugal(t1)✓ Switzerland(t2)✓
    'qf-a-0':  {t1:2,t2:3}, 'qf-b-0':  {t1:2,t2:1}, 'qf-c-0':  {t1:2,t2:1}, 'qf-d-0':  {t1:1,t2:2},
    'sf-0':    {t1:2,t2:1}, 'sf-1':    {t1:3,t2:1},
    'final-0': {t1:2,t2:1},
  };

  state.currentRound = 'final';
  state.roundStatus  = 'closed';

  // Generate structured demo picks with boldness-based RNG
  const DEMO_BOLDNESS = [0.22, 0.48, 0.14, 0.38, 0.55, 0.30];

  function mkRng(seed) {
    let s = seed >>> 0;
    return function() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  state.players.forEach((player, pi) => {
    const boldness = DEMO_BOLDNESS[Math.min(pi, DEMO_BOLDNESS.length - 1)];
    const rng = mkRng(pi * 7919 + 1337);
    if (!state.picks[player.id]) state.picks[player.id] = {};
    ROUND_CONFIG.forEach(cfg => {
      if (!state.picks[player.id][cfg.id]) state.picks[player.id][cfg.id] = {};
      getGamesForRound(cfg.id).forEach(game => {
        const { t1, t2 } = getTeams(game);
        if (!t1 || !t2) return;
        const fav = t1.seed <= t2.seed ? t1 : t2;
        const dog = t1 === fav ? t2 : t1;
        const upsetProb = boldness * (dog.seed - fav.seed) / 7;
        state.picks[player.id][cfg.id][game.id] = rng() < upsetProb ? dog.name : fav.name;
      });
    });

    if (!state.bonusPicks[player.id]) state.bonusPicks[player.id] = {};
    Object.keys(BONUS_CONFIG).forEach(roundId => {
      BONUS_CONFIG[roundId].forEach(b => {
        if (b.type === 'multi') {
          const srcRound = b.sourceRound || 'qf';
          const srcGames = getGamesForRound(srcRound);
          const srcPicks = (state.picks[player.id] || {})[srcRound] || {};
          state.bonusPicks[player.id][b.id] = srcGames.map(g => srcPicks[g.id] || '');
        } else if (b.type === 'select' && b.options) {
          const idx = Math.floor(rng() * b.options.length);
          state.bonusPicks[player.id][b.id] = b.options[idx];
        } else {
          state.bonusPicks[player.id][b.id] = '';
        }
      });
    });
  });

  // Set bonus answers for multi-type bonuses from actual results
  Object.values(BONUS_CONFIG).flat().forEach(b => {
    if (b.type === 'multi') {
      const srcRound = b.sourceRound || 'qf';
      const srcGames = getGamesForRound(srcRound);
      state.bonusAnswers[b.id] = srcGames.map(g => { const w = getWinner(g.id); return w ? w.name : ''; });
    }
  });

  const payload = {
    currentRound: state.currentRound, roundStatus: state.roundStatus,
    players: state.players, results: state.results, picks: state.picks,
    rulesText: state.rulesText, defaultPlayersKey: DEFAULT_PLAYERS_KEY,
    bonusPicks: state.bonusPicks, bonusAnswers: state.bonusAnswers, playerPins: state.playerPins,
  };
  fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .catch(err => console.warn('Demo save failed:', err));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch(e) {}
}

// ── ADMIN RENDERING ───────────────────────────────────────────

function renderAdmin() {
  populateRoundSelects();
  renderPickStatusGrid();
  renderResultsGrid();
  renderPlayersList();
  renderPinsAdmin();
  renderBonusAdmin();
  renderR32Admin();
}

function renderPickStatusGrid() {
  const container = document.getElementById('pick-status-grid');
  if (!container) return;
  container.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'pick-status-table';

  // Header row
  const thead = document.createElement('thead');
  const hRow = document.createElement('tr');
  const th0 = document.createElement('th');
  th0.textContent = 'Player';
  hRow.appendChild(th0);
  ROUND_CONFIG.forEach(cfg => {
    const th = document.createElement('th');
    th.textContent = cfg.short;
    hRow.appendChild(th);
  });
  thead.appendChild(hRow);
  table.appendChild(thead);

  // Player rows
  const tbody = document.createElement('tbody');
  state.players.forEach(p => {
    const tr = document.createElement('tr');
    const td0 = document.createElement('td');
    td0.textContent = p.name;
    td0.className = 'psg-name';
    tr.appendChild(td0);
    ROUND_CONFIG.forEach(cfg => {
      const td = document.createElement('td');
      const picks = (state.picks[p.id] || {})[cfg.id] || {};
      const games = getGamesForRound(cfg.id).filter(g => getTeams(g).t1 && getTeams(g).t2);
      const count = Object.keys(picks).length;
      if (count > 0) {
        td.textContent = '✓';
        td.className = 'psg-yes';
        td.title = `${count}/${games.length} picks`;
      } else {
        td.textContent = '✗';
        td.className = 'psg-no';
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

function renderPinsAdmin() {
  const container = document.getElementById('pins-grid');
  if (!container) return;
  container.innerHTML = '';
  state.players.forEach(p => {
    const row = document.createElement('div');
    row.className = 'pin-admin-row';
    const label = document.createElement('span');
    label.className = 'pin-admin-name';
    label.textContent = p.name;
    row.appendChild(label);
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'bonus-input pin-admin-input';
    inp.maxLength = 4;
    inp.inputMode = 'numeric';
    inp.pattern = '[0-9]*';
    inp.placeholder = 'No PIN';
    inp.value = state.playerPins[p.id] || '';
    inp.dataset.playerId = p.id;
    row.appendChild(inp);
    container.appendChild(row);
  });
}

function savePins() {
  const inputs = document.querySelectorAll('.pin-admin-input');
  inputs.forEach(inp => {
    const pid = inp.dataset.playerId;
    const val = inp.value.trim();
    if (val && /^\d{1,4}$/.test(val)) { state.playerPins[pid] = val; }
    else { delete state.playerPins[pid]; }
  });
  saveState();
  showToast('PINs saved!', 'success');
}

function populateRoundSelects() {
  ['admin-round-sel', 'results-round-sel'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const cur = sel.value || state.currentRound;
    sel.innerHTML = '';
    ROUND_CONFIG.forEach(cfg => {
      const opt = document.createElement('option');
      opt.value = cfg.id;
      opt.textContent = cfg.label;
      if (cfg.id === cur) opt.selected = true;
      sel.appendChild(opt);
    });
  });
  const statusSel = document.getElementById('admin-status-sel');
  if (statusSel) statusSel.value = state.roundStatus;
  const roundSel = document.getElementById('admin-round-sel');
  if (roundSel) roundSel.value = state.currentRound;
}

function buildResultGameCard(game) {
  const { t1, t2 } = getTeams(game);
  const winner = getWinner(game.id);
  const isDraw = state.results[game.id] === 'Draw';
  const card = document.createElement('div');
  card.className = 'result-game';

  const lbl = document.createElement('div');
  lbl.className = 'result-game-hdr';
  // For group stage show "MD1: ArgvCol" style; for knockout show quadrant/label
  const adminSc = state.scores[game.id];
  const adminScoreStr = adminSc !== undefined ? ` <span class="result-score-badge">${adminSc.t1}–${adminSc.t2}</span>` : '';
  if (game.round === 'groups') {
    const MD_NAMES = ['MD1','MD1','MD2','MD2','MD3','MD3'];
    lbl.innerHTML = `${MD_NAMES[game.idx]}: ${t1 ? esc(t1.name) : '?'} vs ${t2 ? esc(t2.name) : '?'}${adminScoreStr}`;
  } else {
    lbl.innerHTML = `${esc(game.label || (game.region ? `Quadrant ${game.region}` : ''))}${adminScoreStr}`;
  }
  card.appendChild(lbl);

  if (!t1 && !t2) {
    const tbd = document.createElement('div');
    tbd.className = 'result-tbd';
    tbd.textContent = 'Matchup TBD';
    card.appendChild(tbd);
  } else {
    const teamsRow = document.createElement('div');
    teamsRow.className = 'result-teams';

    const setResult = (resultName) => {
      if (state.results[game.id] === resultName) { delete state.results[game.id]; }
      else { state.results[game.id] = resultName; }
      const fixed = fixInvalidPicks();
      saveState();
      const msg = resultName === 'Draw' ? 'Result: Draw' : `Result: ${resultName}`;
      showToast(fixed > 0 ? `${msg} · ${fixed} pick${fixed !== 1 ? 's' : ''} auto-filled` : msg, 'success');
      renderResultsGrid();
      if (state.currentView === 'bracket') renderBracket();
    };

    [t1, t2].forEach((team, idx) => {
      if (!team) return;
      const btn = document.createElement('button');
      btn.className = 'result-team-btn';
      if (winner && winner.name === team.name) btn.classList.add('chosen');
      btn.textContent = `(${team.seed}) ${team.name}`;
      btn.addEventListener('click', () => setResult(team.name));
      teamsRow.appendChild(btn);

      // Add Draw button between the two teams (group stage only)
      if (idx === 0) {
        const vs = document.createElement('span');
        vs.className = 'result-vs';
        vs.textContent = 'vs';
        teamsRow.appendChild(vs);

        if (game.round === 'groups') {
          const drawBtn = document.createElement('button');
          drawBtn.className = 'result-team-btn result-draw-btn' + (isDraw ? ' chosen' : '');
          drawBtn.textContent = 'Draw';
          drawBtn.addEventListener('click', () => setResult('Draw'));
          teamsRow.appendChild(drawBtn);

          const vs2 = document.createElement('span');
          vs2.className = 'result-vs';
          vs2.textContent = 'vs';
          teamsRow.appendChild(vs2);
        }
      }
    });
    card.appendChild(teamsRow);

    // Score inputs — shown whenever teams are known
    if (t1 && t2) {
      const scoreRow = document.createElement('div');
      scoreRow.className = 'result-score-row';
      const sc = state.scores[game.id] || {};

      const saveScore = () => {
        const v1 = parseInt(inp1.value, 10);
        const v2 = parseInt(inp2.value, 10);
        if (!isNaN(v1) && !isNaN(v2)) {
          state.scores[game.id] = { t1: v1, t2: v2 };
        } else {
          delete state.scores[game.id];
        }
        saveState();
      };

      const inp1 = document.createElement('input');
      inp1.type = 'number'; inp1.min = '0'; inp1.max = '20';
      inp1.className = 'score-inp'; inp1.placeholder = '-';
      inp1.value = sc.t1 !== undefined ? sc.t1 : '';
      inp1.addEventListener('change', saveScore);

      const dash = document.createElement('span');
      dash.className = 'score-dash'; dash.textContent = '–';

      const inp2 = document.createElement('input');
      inp2.type = 'number'; inp2.min = '0'; inp2.max = '20';
      inp2.className = 'score-inp'; inp2.placeholder = '-';
      inp2.value = sc.t2 !== undefined ? sc.t2 : '';
      inp2.addEventListener('change', saveScore);

      scoreRow.appendChild(inp1);
      scoreRow.appendChild(dash);
      scoreRow.appendChild(inp2);
      card.appendChild(scoreRow);
    }
  }
  return card;
}

function renderResultsGrid() {
  const grid = document.getElementById('results-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const roundSel = document.getElementById('results-round-sel');
  const roundId  = roundSel ? roundSel.value : state.currentRound;
  const games    = getGamesForRound(roundId);

  if (!games.length) { grid.innerHTML = '<div class="result-tbd">No games found.</div>'; return; }

  if (roundId === 'groups') {
    // Organize by group
    GROUP_LETTERS.forEach(group => {
      const groupGames = games.filter(g => g.region === group).sort((a,b) => a.idx - b.idx);
      const section = document.createElement('div');
      section.className = 'result-group-section';
      const hdr = document.createElement('div');
      hdr.className = 'result-group-hdr';
      hdr.textContent = `Group ${group}`;
      section.appendChild(hdr);
      groupGames.forEach(game => section.appendChild(buildResultGameCard(game)));
      grid.appendChild(section);
    });
  } else {
    games.forEach(game => grid.appendChild(buildResultGameCard(game)));
  }
}

function renderPlayersList() {
  const list = document.getElementById('players-list');
  if (!list) return;
  list.innerHTML = '';
  if (!state.players.length) {
    list.innerHTML = '<div style="color:var(--text-3);font-size:0.8rem">No players yet.</div>';
    return;
  }
  state.players.forEach(p => {
    const { total } = getPlayerTotalScore(p.id);
    const item = document.createElement('div');
    item.className = 'player-item';
    item.innerHTML = `
      <span class="player-item-name">${esc(p.name)}</span>
      <span class="player-item-score">${total} pts</span>
      <button class="player-item-del" data-id="${p.id}">Remove</button>`;
    item.querySelector('.player-item-del').addEventListener('click', () => {
      if (!confirm(`Remove ${p.name}? This will delete all their picks.`)) return;
      state.players = state.players.filter(x => x.id !== p.id);
      delete state.picks[p.id];
      if (state.currentPlayer === p.id) state.currentPlayer = state.players[0]?.id || null;
      saveState();
      showToast(`${p.name} removed`, 'info');
      updatePlayerSelect();
      renderPlayersList();
    });
    list.appendChild(item);
  });
}

// ── UTILITY ───────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function uid() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── EVENT HANDLERS ────────────────────────────────────────────

function setupEvents() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.getElementById('session-switch-btn')?.addEventListener('click', logoutSession);

  document.getElementById('player-select').addEventListener('change', e => {
    state.currentPlayer   = e.target.value;
    state.adminViewPlayer = null;
    renderCurrentView();
  });

  document.getElementById('save-picks-btn')?.addEventListener('click', savePicks);
  document.getElementById('save-rules-btn')?.addEventListener('click', saveRules);

  document.getElementById('set-round-btn')?.addEventListener('click', () => {
    const roundSel  = document.getElementById('admin-round-sel');
    const statusSel = document.getElementById('admin-status-sel');
    state.currentRound = roundSel.value;
    state.roundStatus  = statusSel.value;
    saveState();
    updateRoundStatus();
    showToast(`Round set to ${ROUND_CONFIG.find(r => r.id === state.currentRound)?.label}`, 'success');
  });

  document.getElementById('set-status-btn')?.addEventListener('click', () => {
    const statusSel = document.getElementById('admin-status-sel');
    state.roundStatus = statusSel.value;
    saveState();
    updateRoundStatus();
    showToast(`Status updated: ${state.roundStatus}`, 'info');
  });

  document.getElementById('results-round-sel')?.addEventListener('change', () => {
    renderResultsGrid();
    renderBonusAdmin();
  });

  document.getElementById('save-bonus-btn')?.addEventListener('click', saveBonusAnswers);
  document.getElementById('save-pins-btn')?.addEventListener('click', savePins);
  document.getElementById('save-r32-btn')?.addEventListener('click', saveR32Teams);
  document.getElementById('autofill-r32-btn')?.addEventListener('click', autoFillR32FromGroups);

  document.getElementById('pin-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter')  submitPin();
    if (e.key === 'Escape') closePinModal();
  });

  document.getElementById('add-player-btn')?.addEventListener('click', () => {
    const input = document.getElementById('new-player-input');
    const name  = input.value.trim();
    if (!name) return;
    if (state.players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      showToast('Player already exists', 'error'); return;
    }
    const p = { id: uid(), name };
    state.players.push(p);
    if (!state.currentPlayer) state.currentPlayer = p.id;
    saveState();
    input.value = '';
    showToast(`${name} added!`, 'success');
    updatePlayerSelect();
    renderPlayersList();
  });

  document.getElementById('new-player-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('add-player-btn').click();
  });

  document.getElementById('demo-data-btn')?.addEventListener('click', () => {
    if (!confirm('Load demo results and auto-fill picks for all players?')) return;
    loadDemoData();
    showToast('Demo data loaded!', 'success');
    renderAdmin();
    renderBracket();
  });

  document.getElementById('reset-btn')?.addEventListener('click', () => {
    if (!confirm('Reset ALL data? This cannot be undone.')) return;
    state.results       = {};
    state.picks         = {};
    state.bonusPicks    = {};
    state.bonusAnswers  = {};
    state.playerPins    = {};
    state.players       = [...DEFAULT_PLAYERS.map(p => ({ ...p, id: uid() }))];
    state.currentRound  = 'groups';
    state.roundStatus   = 'open';
    state.currentPlayer = state.players[0]?.id || null;
    saveState();
    showToast('All data reset', 'info');
    updatePlayerSelect();
    renderAdmin();
  });
}

// ── INIT ──────────────────────────────────────────────────────

async function init() {
  state.games = buildGames();
  await loadState();
  // Rebuild games with any saved r32Teams now that state is loaded
  if (state.r32Teams) rebuildGames();

  if (!state.players.length) {
    state.players = DEFAULT_PLAYERS.map(p => ({ ...p, id: uid() }));
    loadDemoData();
    saveState();
  } else if (!Object.keys(state.scores).length) {
    loadDemoData();
    saveState();
  }
  if (!state.rulesText) {
    state.rulesText = DEFAULT_RULES_PLACEHOLDER;
    saveState();
  }
  if (!state.currentPlayer && state.players.length) {
    state.currentPlayer = state.players[0].id;
  }

  setupEvents();
  setupOfflineDetection();

  // Resume session from sessionStorage if player still exists
  try {
    const savedPid = sessionStorage.getItem('wcSession');
    if (savedPid && state.players.find(p => p.id === savedPid)) {
      state.sessionPlayer = savedPid;
      state.currentPlayer = savedPid;
      document.getElementById('login-overlay').style.display = 'none';
      updateSessionHeader();
      updatePlayerSelect();
      switchView('bracket');
    } else {
      renderLoginOverlay();
    }
  } catch(e) {
    renderLoginOverlay();
  }

  startPolling();
  startScoresPolling();
}

function setupOfflineDetection() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;
  const update = () => { banner.style.display = navigator.onLine ? 'none' : 'block'; };
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

// Warn before closing/refreshing tab with unsaved picks
window.addEventListener('beforeunload', (e) => {
  if (state.currentView !== 'picks') return;
  const savedPicks = (state.picks[state.currentPlayer] || {})[state.activePicksRound] || {};
  const hasUnsaved = Object.keys(state.pendingPicks).some(
    gid => state.pendingPicks[gid] !== (savedPicks[gid] || null)
  );
  if (hasUnsaved) { e.preventDefault(); e.returnValue = ''; }
});

// ── POLLING ──────────────────────────────────────────────────

let lastStateHash = '';
let pollTimer = null;

function startPolling() {
  lastStateHash = JSON.stringify({
    currentRound: state.currentRound, roundStatus: state.roundStatus,
    results: state.results, picks: state.picks, players: state.players,
    rulesText: state.rulesText, bonusPicks: state.bonusPicks,
    bonusAnswers: state.bonusAnswers, playerPins: state.playerPins,
    r32Teams: state.r32Teams, scores: state.scores,
  });

  pollTimer = setInterval(pollServer, 8000);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearInterval(pollTimer); pollTimer = null; }
    else { pollServer(); pollTimer = setInterval(pollServer, 8000); }
  });
}

async function pollServer() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) return;
    const saved = await res.json();
    if (!saved || !Object.keys(saved).length) return;

    const newHash = JSON.stringify({
      currentRound: saved.currentRound, roundStatus: saved.roundStatus,
      results: saved.results, picks: saved.picks, players: saved.players,
      rulesText: saved.rulesText, bonusPicks: saved.bonusPicks,
      bonusAnswers: saved.bonusAnswers, playerPins: saved.playerPins,
      r32Teams: saved.r32Teams, scores: saved.scores,
    });

    if (newHash === lastStateHash) return;
    lastStateHash = newHash;
    const hadR32 = JSON.stringify(state.r32Teams);
    applyLoadedState(saved);
    if (JSON.stringify(state.r32Teams) !== hadR32) rebuildGames();
    renderCurrentView();
  } catch (e) { /* silently ignore */ }
}

// ── LIVE SCORES (ESPN) ────────────────────────────────────────
const LIVE_TEAM_ALIASES = {
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

function matchLiveTeam(espnName, poolName) {
  const e = espnName.toLowerCase().trim();
  const p = poolName.toLowerCase().trim();
  if (e === p || e.includes(p) || p.includes(e)) return true;
  const aliases = LIVE_TEAM_ALIASES[poolName];
  if (aliases) return aliases.some(a => e === a || e.includes(a) || a.includes(e));
  return false;
}

function findGameScore(t1Name, t2Name) {
  if (!t1Name || !t2Name || !state.liveScores) return null;
  for (const sc of Object.values(state.liveScores)) {
    const fwd = matchLiveTeam(sc.t1.name, t1Name) && matchLiveTeam(sc.t2.name, t2Name);
    const rev = matchLiveTeam(sc.t1.name, t2Name) && matchLiveTeam(sc.t2.name, t1Name);
    if (!fwd && !rev) continue;
    // Normalise so t1 always corresponds to our t1
    return fwd
      ? { t1: sc.t1.score, t2: sc.t2.score, status: sc.status, statusDetail: sc.statusDetail }
      : { t1: sc.t2.score, t2: sc.t1.score, status: sc.status, statusDetail: sc.statusDetail };
  }
  return null;
}

let scoresTimer = null;

async function fetchLiveScores() {
  try {
    const resp = await fetch('/api/scores');
    if (!resp.ok) return;
    const scores = await resp.json();
    if (!scores || !Object.keys(scores).length) return;
    state.liveScores = scores;
    autoSetResultsFromScores();
    renderCurrentView();
  } catch (e) { /* ignore */ }
}

function autoSetResultsFromScores() {
  if (!state.liveScores || !Object.keys(state.liveScores).length) return;
  let changed = 0;

  for (const game of Object.values(state.games)) {
    if (state.results[game.id] !== undefined) continue;
    const { t1, t2 } = getTeams(game);
    if (!t1 || !t2) continue;
    const sc = findGameScore(t1.name, t2.name);
    if (!sc || sc.status !== 'post') continue;

    if (game.round === 'groups') {
      state.results[game.id] = sc.t1 > sc.t2 ? t1.name : sc.t2 > sc.t1 ? t2.name : 'Draw';
    } else {
      if (sc.t1 === sc.t2) continue; // extra time / pens still in progress
      state.results[game.id] = sc.t1 > sc.t2 ? t1.name : t2.name;
    }
    changed++;
  }

  if (changed > 0) {
    fixInvalidPicks();
    saveState();
    showToast(`${changed} result${changed > 1 ? 's' : ''} updated from FIFA`, 'success');
  }
}

function startScoresPolling() {
  fetchLiveScores();
  if (scoresTimer) clearInterval(scoresTimer);
  scoresTimer = setInterval(fetchLiveScores, 60000);
}

document.addEventListener('DOMContentLoaded', init);
