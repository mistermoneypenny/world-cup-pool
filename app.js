/* ============================================================
   WORLD CUP 2026 PICK-BY-ROUND POOL
   ============================================================
   Structure: 48-team tournament — Group Stage + Knockout.
   GROUP_TEAMS: 12 groups (A–L), 4 teams each, 6 round-robin
     games per group = 72 total group stage games.
     Seeds = FIFA Draw Pots (1 = strongest, 4 = weakest).
   INITIAL_TEAMS: 32 knockout teams, 4 quadrants (A/B/C/D),
     8 per quadrant in R32 matchup pairs. Admin updates these
     after the group stage concludes.
   6 rounds: Group Stage → R32 → R16 → QF → SF → Final.
   ============================================================ */

// ── CONSTANTS ─────────────────────────────────────────────────

const ROUND_CONFIG = [
  { id: 'groups', label: 'Group Stage',       short: 'GRP',   pts: 1,  multiplier: 1.0  },
  { id: 'r32',    label: 'Round of 32',       short: 'R32',   pts: 2,  multiplier: 1.2  },
  { id: 'r16',    label: 'Round of 16',       short: 'R16',   pts: 3,  multiplier: 1.3  },
  { id: 'qf',     label: 'Quarterfinals',     short: 'QF',    pts: 5,  multiplier: 1.6  },
  { id: 'sf',     label: 'Semifinals',        short: 'SF',    pts: 8,  multiplier: 2.0  },
  { id: 'third',  label: '3rd Place Play-off', short: '3RD',  pts: 8,  multiplier: 2.0  },
  { id: 'final',  label: 'Final',             short: 'FINAL', pts: 15, multiplier: 3.0  },
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
// 'tournament' bonuses are submitted during the Group Stage window
// and scored at tournament end. They appear as a separate section
// in the Group Stage picks view.
const BONUS_CONFIG = {
  tournament: [
    { id: 'tw_golden_boot', label: 'Golden Boot Winner',                       points: 6,  type: 'text' },
    { id: 'tw_possession',  label: 'Team with Best Time of Possession %',      points: 6,  type: 'select', options: '__ALL_TEAMS__' },
    { id: 'tw_pot1_exit',   label: 'First Pot 1 Team to be Eliminated',        points: 6,  type: 'select', options: '__POT1_TEAMS__' },
  ],
  groups: [
    { id: 'grp_most_goals',   label: 'Team with Most Goals in the Group Stage',           points: 5, type: 'select', options: '__ALL_TEAMS__' },
    { id: 'grp_conf_winrate', label: 'Confederation with Highest Win Rate',               points: 5, type: 'select', options: CONFEDERATIONS },
    { id: 'grp_margin',       label: 'Highest Winning Margin in Any Single Game (goals)', points: 4, type: 'select', options: ['1','2','3','4','5','6+'] },
  ],
  r32: [
    { id: 'r32_red_cards', label: 'Total Red Cards in R32', points: 6, type: 'select', options: Array.from({length: 21}, (_, i) => String(i)) },
  ],
  r16: [
    { id: 'r16_goals', label: 'Total Goals in R16', points: 5, type: 'select', options: Array.from({length: 41}, (_, i) => String(i)) },
  ],
  qf: [
    { id: 'qf_assists', label: 'Team with Most Assists',                 points: 2,  type: 'select', options: '__ALL_TEAMS__' },
    { id: 'qf_teams',   label: 'All Four Correct Picks (Semi-Finalists)', points: 10, type: 'multi', count: 4, sourceRound: 'qf' },
  ],
  sf: [
    { id: 'sf_top_scorer', label: 'High Individual Scorer (Semi-Finals)', points: 3, type: 'text' },
  ],
  final: [
    { id: 'final_motm', label: 'Man of the Match', points: 3, type: 'text' },
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
// Seed = FIFA Draw Pot (1–4). Official draw Dec 5, 2025.
// Pot 1: Morocco, Colombia, Croatia (replacing hosts) + top 9 ranked nations.
// Hosts USA/Mexico/Canada relegated to Pot 2 based on FIFA rankings.
// Pot 2–4: remaining 36 teams ranked by FIFA Coca-Cola Rankings.
const GROUP_TEAMS = {
  // Team order within each group determines fixture pairings via GROUP_PAIRS:
  // MD1: t0vt1, t2vt3 | MD2: t0vt2, t1vt3 | MD3: t0vt3, t1vt2
  // Order is set to match the official FIFA 2026 fixture schedule exactly.
  A: [
    { seed: 2, name: 'Mexico'         },  // MD1: Mexico vs S.Africa | S.Korea vs Czechia
    { seed: 3, name: 'South Africa'   },  // MD2: Mexico vs S.Korea  | S.Africa vs Czechia
    { seed: 2, name: 'South Korea'    },  // MD3: Mexico vs Czechia  | S.Africa vs S.Korea
    { seed: 4, name: 'Czech Republic' },
  ],
  B: [
    { seed: 2, name: 'Canada'         },  // MD1: Canada vs Bosnia   | Qatar vs Switzerland
    { seed: 4, name: 'Bosnia'         },  // MD2: Canada vs Qatar    | Bosnia vs Switzerland
    { seed: 3, name: 'Qatar'          },  // MD3: Canada vs Switz.   | Bosnia vs Qatar
    { seed: 2, name: 'Switzerland'    },
  ],
  C: [
    { seed: 1, name: 'Brazil'         },  // MD1: Brazil vs Morocco  | Haiti vs Scotland
    { seed: 1, name: 'Morocco'        },  // MD2: Brazil vs Haiti    | Morocco vs Scotland
    { seed: 4, name: 'Haiti'          },  // MD3: Brazil vs Scotland | Morocco vs Haiti
    { seed: 3, name: 'Scotland'       },
  ],
  D: [
    { seed: 2, name: 'USA'            },  // MD1: USA vs Paraguay    | Australia vs Turkey
    { seed: 3, name: 'Paraguay'       },  // MD2: USA vs Australia   | Turkey vs Paraguay
    { seed: 2, name: 'Australia'      },  // MD3: USA vs Turkey      | Paraguay vs Australia
    { seed: 4, name: 'Turkey'         },
  ],
  E: [
    { seed: 1, name: 'Germany'        },  // MD1: Germany vs Curacao | Ivory Coast vs Ecuador
    { seed: 4, name: 'Curacao'        },  // MD2: Germany vs I.Coast | Ecuador vs Curacao
    { seed: 3, name: 'Ivory Coast'    },  // MD3: Germany vs Ecuador | Curacao vs I.Coast
    { seed: 2, name: 'Ecuador'        },
  ],
  F: [
    { seed: 1, name: 'Netherlands'    },  // MD1: Netherlands vs Japan | Sweden vs Tunisia
    { seed: 2, name: 'Japan'          },  // MD2: Netherlands vs Sweden | Japan vs Tunisia
    { seed: 4, name: 'Sweden'         },  // MD3: Netherlands vs Tunisia | Japan vs Sweden
    { seed: 3, name: 'Tunisia'        },
  ],
  G: [
    { seed: 1, name: 'Belgium'        },  // MD1: Belgium vs Egypt   | Iran vs New Zealand
    { seed: 3, name: 'Egypt'          },  // MD2: Belgium vs Iran    | Egypt vs New Zealand
    { seed: 2, name: 'Iran'           },  // MD3: Belgium vs N.Zeal. | Egypt vs Iran
    { seed: 4, name: 'New Zealand'    },
  ],
  H: [
    { seed: 1, name: 'Spain'          },  // MD1: Spain vs Cape Verde | Saudi Arabia vs Uruguay
    { seed: 4, name: 'Cape Verde'     },  // MD2: Spain vs S.Arabia  | Uruguay vs Cape Verde
    { seed: 3, name: 'Saudi Arabia'   },  // MD3: Spain vs Uruguay   | Cape Verde vs S.Arabia
    { seed: 2, name: 'Uruguay'        },
  ],
  I: [
    { seed: 1, name: 'France'         },  // MD1: France vs Senegal  | Iraq vs Norway
    { seed: 2, name: 'Senegal'        },  // MD2: France vs Iraq     | Norway vs Senegal
    { seed: 4, name: 'Iraq'           },  // MD3: France vs Norway   | Senegal vs Iraq
    { seed: 3, name: 'Norway'         },
  ],
  J: [
    { seed: 1, name: 'Argentina'      },  // MD1: Argentina vs Algeria | Austria vs Jordan
    { seed: 3, name: 'Algeria'        },  // MD2: Argentina vs Austria | Jordan vs Algeria
    { seed: 2, name: 'Austria'        },  // MD3: Argentina vs Jordan  | Algeria vs Austria
    { seed: 4, name: 'Jordan'         },
  ],
  K: [
    { seed: 1, name: 'Portugal'       },  // MD1: Portugal vs DR Congo | Uzbekistan vs Colombia
    { seed: 4, name: 'DR Congo'       },  // MD2: Portugal vs Uzbekistan | Colombia vs DR Congo
    { seed: 3, name: 'Uzbekistan'     },  // MD3: Portugal vs Colombia | DR Congo vs Uzbekistan
    { seed: 1, name: 'Colombia'       },
  ],
  L: [
    { seed: 1, name: 'England'        },  // MD1: England vs Croatia  | Ghana vs Panama
    { seed: 1, name: 'Croatia'        },  // MD2: England vs Ghana    | Panama vs Croatia
    { seed: 4, name: 'Ghana'          },  // MD3: England vs Panama   | Croatia vs Ghana
    { seed: 3, name: 'Panama'         },
  ],
};

// ── COUNTRY FLAGS ─────────────────────────────────────────────
// Uses flagcdn.com image CDN — works on all platforms (no emoji rendering issues)
const FLAG_CODES = {
  'Mexico': 'mx', 'South Korea': 'kr', 'Czech Republic': 'cz', 'South Africa': 'za',
  'Canada': 'ca', 'Switzerland': 'ch', 'Qatar': 'qa', 'Bosnia': 'ba',
  'Brazil': 'br', 'Morocco': 'ma', 'Scotland': 'gb-sct', 'Haiti': 'ht',
  'USA': 'us', 'Turkey': 'tr', 'Australia': 'au', 'Paraguay': 'py',
  'Germany': 'de', 'Ecuador': 'ec', 'Ivory Coast': 'ci', 'Curacao': 'cw',
  'Netherlands': 'nl', 'Japan': 'jp', 'Sweden': 'se', 'Tunisia': 'tn',
  'Belgium': 'be', 'Iran': 'ir', 'Egypt': 'eg', 'New Zealand': 'nz',
  'Spain': 'es', 'Uruguay': 'uy', 'Saudi Arabia': 'sa', 'Cape Verde': 'cv',
  'France': 'fr', 'Senegal': 'sn', 'Norway': 'no', 'Iraq': 'iq',
  'Argentina': 'ar', 'Austria': 'at', 'Algeria': 'dz', 'Jordan': 'jo',
  'Portugal': 'pt', 'Colombia': 'co', 'DR Congo': 'cd', 'Uzbekistan': 'uz',
  'England': 'gb-eng', 'Croatia': 'hr', 'Panama': 'pa', 'Ghana': 'gh',
};
function flag(name) {
  const c = FLAG_CODES[name];
  return c ? `<img src="https://flagcdn.com/w40/${c}.png" width="20" height="15" alt="" class="team-flag">` : '';
}

const PLAYER_FLAGS = {
  'Aapo':                 ['fi'],
  'Bergman':              ['us'],
  'Cole':                 ['ca', 'gb'],
  'Commish':              ['us', 'de', 'gb'],
  'Dennis':               ['de'],
  'Diego':                ['es', 'ar'],
  'Francisco':            ['es', 'ar'],
  'Jeremy':               ['us'],
  'Jose':                 ['pt'],
  'Josh':                 ['us'],
  'Late Night Lang':      ['gb'],
  'Lorenz':               ['de'],
  'Matthias':             ['at'],
  'Mike Jones':           ['gb'],
  'Pataky':               ['us'],
  'Puschel':              ['de'],
  'Rafa':                 ['es'],
  'Ricky':                ['pt'],
  'Santiago':             ['co'],
  "Sean 'Diddler' Combs": ['gb', 'nz'],
};
function playerFlagsHtml(name) {
  return (PLAYER_FLAGS[name] || [])
    .map(c => `<img src="https://flagcdn.com/w40/${c}.png" width="20" height="15" alt="" class="player-nat-flag">`)
    .join('');
}

// INITIAL_TEAMS: 32 projected knockout-round teams, 8 per quadrant, in R32 matchup pairs.
// Seeds = FIFA Draw Pot (1–4). Admin updates after group stage.
const INITIAL_TEAMS = {
  A: [
    { seed: 1, name: 'France'         },
    { seed: 4, name: 'Czech Republic' },
    { seed: 1, name: 'Portugal'       },
    { seed: 1, name: 'Colombia'       },
    { seed: 1, name: 'Belgium'        },
    { seed: 3, name: 'Egypt'          },
    { seed: 1, name: 'Argentina'      },
    { seed: 3, name: 'Algeria'        },
  ],
  B: [
    { seed: 1, name: 'England'        },
    { seed: 1, name: 'Croatia'        },
    { seed: 1, name: 'Netherlands'    },
    { seed: 2, name: 'Japan'          },
    { seed: 1, name: 'Spain'          },
    { seed: 2, name: 'Uruguay'        },
    { seed: 1, name: 'Brazil'         },
    { seed: 1, name: 'Morocco'        },
  ],
  C: [
    { seed: 1, name: 'Germany'        },
    { seed: 3, name: 'Ivory Coast'    },
    { seed: 2, name: 'Mexico'         },
    { seed: 2, name: 'South Korea'    },
    { seed: 2, name: 'Switzerland'    },
    { seed: 2, name: 'Canada'         },
    { seed: 2, name: 'USA'            },
    { seed: 4, name: 'Turkey'         },
  ],
  D: [
    { seed: 2, name: 'Senegal'        },
    { seed: 2, name: 'Australia'      },
    { seed: 2, name: 'Iran'           },
    { seed: 3, name: 'Norway'         },
    { seed: 2, name: 'Ecuador'        },
    { seed: 4, name: 'Sweden'         },
    { seed: 2, name: 'Austria'        },
    { seed: 3, name: 'Panama'         },
  ],
};

// Build sorted list of all 48 group stage team names for dropdowns
const ALL_TEAM_NAMES = Object.values(GROUP_TEAMS)
  .flat()
  .map(t => t.name)
  .sort((a, b) => a.localeCompare(b));

// Build sorted list of Pot 1 (seed === 1) teams for bonus dropdown
// Uses flat filter so groups with multiple seed-1 teams (e.g. after
// re-seeding) are all included, and groups with no seed-1 team are skipped.
const POT1_TEAMS = Object.values(GROUP_TEAMS)
  .flat()
  .filter(t => t.seed === 1)
  .map(t => t.name)
  .sort((a, b) => a.localeCompare(b));

// Resolve __ALL_TEAMS__ and __POT1_TEAMS__ placeholders in BONUS_CONFIG
Object.values(BONUS_CONFIG).forEach(bonuses => {
  bonuses.forEach(b => {
    if (b.options === '__ALL_TEAMS__') b.options = ALL_TEAM_NAMES;
    if (b.options === '__POT1_TEAMS__') b.options = POT1_TEAMS;
  });
});

// ── PLAYER AVATARS ────────────────────────────────────────────
const PLAYER_AVATARS = {
  'Matthias':        'Matthias.png',
  'Diego':           'Diego.png',
  'Lorenz':          'Lorenz.png',
  'Cole':            'Cole.png',
  'Aapo':            'Aapo.png',
  'Commish':         'David.png',
  'Late Night Lang': 'Lang.png',
  'Jose':            'Jose.png',
  'Rafa':            'Rafa.png',
  'Mike Jones':      'MikeJones.png',
  'Dennis':          'Dennis.png',
  'Pataky':          'Pataky.png',
  'Puschel':         'Puschel.png',
};

const PLAYER_AVATAR_POS = {
  'Aapo':  'top',
  'Diego': 'top',
};
const PLAYER_AVATAR_FIT = {
  'Matthias': 'contain',
  'Pataky':   'contain',
};
function playerAvatarHtml(playerName, size = 32) {
  const file = PLAYER_AVATARS[playerName];
  if (!file) return `<span class="player-avatar-placeholder" style="width:${size}px;height:${size}px"></span>`;
  const pos = PLAYER_AVATAR_POS[playerName] || 'center';
  const fit = PLAYER_AVATAR_FIT[playerName] || 'cover';
  return `<img src="${file}" alt="${esc(playerName)}" class="player-avatar" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:${fit};object-position:${pos};flex-shrink:0;">`;
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
  r32Teams: null,   // null = show TBD in knockout bracket; admin sets after group stage
  adminViewPlayer: null,
  sessionPlayer:   null,
  rulesText:       '',
  bonusPicks:   {},
  bonusAnswers: {},
  playerPins:   {},
  roundDeadlines: {},
  pickSavedAt:    {},
  reactions:      {},
  broadcast:      null,
};

// ── GAME GENERATION ───────────────────────────────────────────

// Round-robin pairs for a 4-team group: all 6 unique matchups
// Matchday 1: 0v1, 2v3 | Matchday 2: 0v2, 1v3 | Matchday 3: 0v3, 1v2
const GROUP_PAIRS = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
const GROUP_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

// Scheduled dates for each group's three matchdays (FIFA World Cup 2026)
// MD1: Jun 11–17 | MD2: Jun 18–23 | MD3: Jun 24–27 (simultaneous pairs)
const MATCHDAY_DATES = {
  A: ['Jun 11', 'Jun 18', 'Jun 24'],
  B: ['Jun 12', 'Jun 18', 'Jun 24'],
  C: ['Jun 13', 'Jun 19', 'Jun 24'],
  D: ['Jun 12', 'Jun 19', 'Jun 25'],
  E: ['Jun 14', 'Jun 20', 'Jun 25'],
  F: ['Jun 14', 'Jun 20', 'Jun 25'],
  G: ['Jun 15', 'Jun 21', 'Jun 26'],
  H: ['Jun 15', 'Jun 21', 'Jun 26'],
  I: ['Jun 16', 'Jun 22', 'Jun 26'],
  J: ['Jun 16', 'Jun 22', 'Jun 27'],
  K: ['Jun 17', 'Jun 23', 'Jun 27'],
  L: ['Jun 17', 'Jun 23', 'Jun 27'],
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

  // R32: 4 games per quadrant — only populated once admin sets r32Teams after group stage.
  // Until then all R32 slots show TBD. INITIAL_TEAMS is kept for the admin autofill tool only.
  const r32Source = (state.r32Teams && !Array.isArray(state.r32Teams) && Object.keys(state.r32Teams).length)
    ? state.r32Teams : null;
  REGIONS.forEach(region => {
    const teams = r32Source ? r32Source[region] : null;
    for (let i = 0; i < 4; i++) {
      const id = gameId('r32', region, i);
      games[id] = { id, round: 'r32', region, idx: i,
        t1: teams ? teams[i * 2]     : null,
        t2: teams ? teams[i * 2 + 1] : null,
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

  // 3rd Place Play-off: losers of both SFs
  const tpid = gameId('third', null, 0);
  games[tpid] = { id: tpid, round: 'third', region: null, idx: 0,
    t1: null, t2: null,
    p1: gameId('sf', null, 0), p2: gameId('sf', null, 1),
    label: '3rd Place Play-off' };

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

// ── PICK STORAGE KEYS (matchup-based, immune to team reordering) ──
// Picks are stored as { "Mexico|South Africa": "Mexico" } instead of
// { "groups-a-0": "Mexico" }. This means reordering GROUP_TEAMS or
// changing bracket structure never invalidates stored picks.
function gameKey(t1Name, t2Name) {
  return [t1Name, t2Name].sort().join('|');
}
function getPickKey(game) {
  const { t1, t2 } = getTeams(game);
  if (!t1 || !t2) return game.id; // TBD knockout games: fall back to ID
  return gameKey(t1.name, t2.name);
}
// One-time migration: converts old game-ID picks to matchup-key picks.
// Called on every load; only does work when old-format keys are detected.
function migratePicksToMatchupKeys(picks) {
  const pat = /^(groups|r32|r16|qf|sf|third|final)(-[a-l])?-\d+$/i;
  let migrated = false;
  for (const [pid, pdata] of Object.entries(picks)) {
    for (const [rid, rPicks] of Object.entries(pdata)) {
      if (!rPicks || typeof rPicks !== 'object') continue;
      if (!Object.keys(rPicks).some(k => pat.test(k))) continue;
      const games = getGamesForRound(rid);
      const newPicks = {};
      for (const [gid, picked] of Object.entries(rPicks)) {
        if (!pat.test(gid)) { newPicks[gid] = picked; continue; } // already new format
        const g = games.find(x => x.id === gid);
        if (!g) continue; // game no longer exists — drop stale pick
        const { t1, t2 } = getTeams(g);
        if (t1 && t2) newPicks[gameKey(t1.name, t2.name)] = picked;
      }
      picks[pid][rid] = newPicks;
      migrated = true;
    }
  }
  return migrated;
}

function getLoser(gid) {
  const winner = getWinner(gid);
  if (!winner) return null;
  const game = state.games[gid];
  if (!game) return null;
  const { t1, t2 } = getTeams(game);
  if (!t1 || !t2) return null;
  return winner.name === t1.name ? t2 : t1;
}

function resolveTeam(game, slot) {
  if (game.round === 'r32' || game.round === 'groups') return slot === 1 ? game.t1 : game.t2;
  if (game.round === 'third') {
    const parentId = slot === 1 ? game.p1 : game.p2;
    if (!parentId) return null;
    return getLoser(parentId);
  }
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
  if (name === 'Draw') return null;
  const game = state.games[gid];
  if (!game) return null;
  const { t1, t2 } = getTeams(game);
  if (t1 && t1.name === name) return t1;
  if (t2 && t2.name === name) return t2;
  // Stored result name doesn't match either team (e.g. stale demo data).
  // Fall back to score to determine the actual winner.
  const sc = state.scores[gid];
  if (sc !== undefined) {
    if (sc.t1 > sc.t2) return t1;
    if (sc.t2 > sc.t1) return t2;
  }
  return null;
}

function getGamesForRound(roundId) {
  return Object.values(state.games).filter(g => g.round === roundId);
}

// ── SCORING ───────────────────────────────────────────────────

// Favorites (or equal-pot) earn flat cfg.pts.
// Underdogs earn: cfg.pts + (dogSeed - favSeed) * cfg.multiplier.
// Draws earn:     cfg.pts + (pot differential / 2) * cfg.multiplier.
function calcPickPoints(game, pickedName, cfg) {
  if (pickedName === 'Draw') {
    const { t1, t2 } = getTeams(game);
    if (!t1 || !t2) return cfg.pts;
    const diff = Math.abs(t1.seed - t2.seed);
    return Math.round((cfg.pts + (diff / 2) * cfg.multiplier) * 10) / 10;
  }
  const { t1, t2 } = getTeams(game);
  if (!t1 || !t2) return cfg.pts;
  const fav = t1.seed <= t2.seed ? t1 : t2;
  const dog = fav === t1 ? t2 : t1;
  if (dog.seed === fav.seed) return cfg.pts;
  if (pickedName === dog.name) {
    return Math.round((cfg.pts + (dog.seed - fav.seed) * cfg.multiplier) * 10) / 10;
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
    const pickedName = roundPicks[getPickKey(game)];
    const resultName = state.results[game.id];
    if (pickedName) {
      if (resultName !== undefined) {
        // Resolve the true winner via getWinner() so score-based fallback applies
        // when state.results has a stale/wrong team name (e.g. leftover demo data).
        const trueWinner = resultName === 'Draw' ? 'Draw' : (getWinner(game.id)?.name ?? resultName);
        if (trueWinner === pickedName) { score += calcPickPoints(game, pickedName, cfg); correct++; }
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

// Returns the bonus list for a round. For 'groups', bundles tournament-wide bonuses first.
function getBonusList(roundId) {
  if (roundId === 'groups') return [...(BONUS_CONFIG.tournament || []), ...(BONUS_CONFIG.groups || [])];
  return BONUS_CONFIG[roundId] || [];
}

function getBonusScore(playerId, roundId) {
  const bonuses = getBonusList(roundId);
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
  const bonuses = getBonusList(roundId);
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
    r32Teams:       state.r32Teams,
    scores:         state.scores,
    roundDeadlines: state.roundDeadlines,
    pickSavedAt:    state.pickSavedAt,
    reactions:      state.reactions,
    broadcast:      state.broadcast,
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
  if (saved.picks) {
    state.picks = saved.picks;
    // Silently migrate any old game-ID picks to matchup keys and re-save
    if (migratePicksToMatchupKeys(state.picks)) setTimeout(() => saveState(), 500);
  }
  if (saved.currentRound)     state.currentRound = saved.currentRound;
  if (saved.roundStatus)      state.roundStatus  = saved.roundStatus;
  if (saved.rulesText !== undefined) state.rulesText = saved.rulesText;
  if (saved.bonusPicks)   state.bonusPicks   = saved.bonusPicks;
  if (saved.bonusAnswers) state.bonusAnswers = saved.bonusAnswers;
  if (saved.playerPins)   state.playerPins   = saved.playerPins;
  // Only restore r32Teams if it's a real object with region keys (not an empty array)
  if (saved.r32Teams && !Array.isArray(saved.r32Teams) && Object.keys(saved.r32Teams).length)
    state.r32Teams = saved.r32Teams;
  if (saved.scores)         state.scores         = saved.scores;
  if (saved.roundDeadlines) state.roundDeadlines = saved.roundDeadlines;
  if (saved.pickSavedAt)    state.pickSavedAt    = saved.pickSavedAt;
  if (saved.reactions)      state.reactions      = saved.reactions;
  if ('broadcast' in saved) state.broadcast      = saved.broadcast;
  // Default bracketSubView to 'groups' when in groups round, else 'knockout'
  state.bracketSubView = (state.currentRound === 'groups') ? 'groups' : 'knockout';
}

// ── TOAST ─────────────────────────────────────────────────────

let toastTimer;
let countdownTimer        = null;
let notifPermission       = 'default';
let dismissedBroadcastId  = null;
let deferredInstallPrompt = null;
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
  // Show/hide the bracket sticky nav (lives outside .main to allow position:sticky)
  document.getElementById('bracket-nav').style.display = view === 'bracket' ? '' : 'none';
  renderCurrentView();
}

function renderCurrentView() {
  updateRoundStatus();
  updatePlayerSelect();
  updateSessionHeader();
  updateBroadcastBanner();
  switch (state.currentView) {
    case 'rules':       renderRules();        break;
    case 'bracket':     renderBracket();      break;
    case 'picks':       renderPicks();        break;
    case 'leaderboard': renderLeaderboard();  break;
    case 'analytics':   renderAnalytics();   break;
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
  try { localStorage.setItem('wcSession', pid); } catch(e) {}
  document.getElementById('login-overlay').style.display = 'none';
  updateSessionHeader();
  updatePlayerSelect();
  switchView('bracket');
}

function logoutSession() {
  state.sessionPlayer   = null;
  state.adminViewPlayer = null;
  try { localStorage.removeItem('wcSession'); } catch(e) {}
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
  third:  '3RD PLACE',
  final:  'FINAL',
};

const ROUND_DATES = {
  groups: 'Jun 12–26',
  r32:    'Jun 29 – Jul 2',
  r16:    'Jul 5–8',
  qf:     'Jul 11–12',
  sf:     'Jul 15–16',
  third:  'Jul 18',
  final:  'Jul 19',
};

const QUADRANT_NAMES = { A: 'Quadrant A', B: 'Quadrant B', C: 'Quadrant C', D: 'Quadrant D' };

function renderBracket() {
  const wrapper = document.getElementById('bracket-wrapper');
  wrapper.innerHTML = '';

  // Sub-view toggle bar — rendered into sticky nav above the scroll container
  const nav = document.getElementById('bracket-nav');
  nav.innerHTML = '';
  const toggleBar = document.createElement('div');
  toggleBar.className = 'bracket-toggle-bar';
  [['groups', '&#127942; Group Stage'], ['knockout', '&#9883; Knockout Bracket']].forEach(([id, label]) => {
    const btn = document.createElement('button');
    btn.className = 'bracket-toggle-btn' + (state.bracketSubView === id ? ' active' : '');
    btn.innerHTML = label;
    btn.addEventListener('click', () => { state.bracketSubView = id; renderBracket(); });
    toggleBar.appendChild(btn);
  });
  nav.appendChild(toggleBar);

  if (state.bracketSubView === 'groups') {
    renderGroupStageBracket(wrapper);
    return;
  }

  // Show notice above the bracket (not inside the flex row or it stretches as a column)
  const scrollEl = wrapper.parentElement;
  scrollEl.querySelectorAll('.knockout-notice').forEach(el => el.remove());
  const groupGamesTotal  = GROUP_LETTERS.length * 6;
  const groupResultsDone = GROUP_LETTERS.reduce((n, g) =>
    n + getGamesForRound('groups').filter(gm => gm.region === g && state.results[gm.id] !== undefined).length, 0);
  if (groupResultsDone < groupGamesTotal) {
    const notice = document.createElement('div');
    notice.className = 'knockout-notice';
    notice.innerHTML = `&#9888; Projected bracket — finalised after the Group Stage (${groupResultsDone}/${groupGamesTotal} results entered).`;
    scrollEl.insertBefore(notice, wrapper);
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
      let winner, loser;
      if (result === t1.name)      { winner = t1; loser = t2; }
      else if (result === t2.name) { winner = t2; loser = t1; }
      else {
        // Result name doesn't match either team — derive winner from score
        const sc = state.scores[game.id];
        if (!sc) return;
        if      (sc.t1 > sc.t2) { winner = t1; loser = t2; }
        else if (sc.t2 > sc.t1) { winner = t2; loser = t1; }
        else return; // tied score but not stored as Draw — skip
      }
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
        row.innerHTML = `<span class="group-team-rank">${pos + 1}</span><span class="group-team-name">${flag(s.team.name)}${esc(s.team.name)}</span><span class="group-standing-stat">${s.played}</span><span class="group-standing-stat">${s.w}</span><span class="group-standing-stat">${s.d}</span><span class="group-standing-stat">${s.l}</span><span class="group-standing-stat gsp-pts">${s.pts}</span>`;
        teamsDiv.appendChild(row);
      });
    } else {
      teams.forEach(t => {
        const row = document.createElement('div');
        row.className = 'group-team-row';
        row.innerHTML = `<span class="group-team-rank">${t.seed}</span><span class="group-team-name">${flag(t.name)}${esc(t.name)}</span>`;
        teamsDiv.appendChild(row);
      });
    }
    card.appendChild(teamsDiv);

    // Games by matchday
    const games = getGamesForRound('groups').filter(g => g.region === group).sort((a,b) => a.idx - b.idx);
    let lastMDIdx = -1;
    let gameRowCount = 0;
    games.forEach((game, i) => {
      const mdIdx = MATCHDAY_IDX[i];
      if (mdIdx !== lastMDIdx) {
        const date = (MATCHDAY_DATES[group] || [])[mdIdx] || '';
        const mdHdr = document.createElement('div');
        mdHdr.className = 'group-md-label';
        mdHdr.innerHTML = `Matchday ${mdIdx + 1}<span class="group-md-date">${date}</span>`;
        card.appendChild(mdHdr);
        lastMDIdx = mdIdx;
        gameRowCount = 0;
      }
      const { t1, t2 } = getTeams(game);
      const winner = getWinner(game.id);
      const isDraw = state.results[game.id] === 'Draw';
      const playerPick = (state.picks[state.currentPlayer] || {})['groups']?.[getPickKey(game)];
      const gameRow = document.createElement('div');
      gameRow.className = 'group-game-row' + (gameRowCount % 2 === 1 ? ' alt' : '');
      gameRowCount++;

      const sc = state.scores[game.id];
      const liveSc = findGameScore(t1?.name, t2?.name);
      const isLiveGroup = !sc && liveSc && liveSc.status === 'in';
      if (isLiveGroup) {
        const badge = liveSc.link ? document.createElement('a') : document.createElement('span');
        if (liveSc.link) { badge.href = liveSc.link; badge.target = '_blank'; badge.rel = 'noopener noreferrer'; }
        badge.className = 'live-badge-inline';
        badge.textContent = liveSc.statusDetail || 'LIVE';
        gameRow.appendChild(badge);
      } else if (liveSc?.link) {
        const espn = document.createElement('a');
        espn.href = liveSc.link;
        espn.target = '_blank';
        espn.rel = 'noopener noreferrer';
        espn.className = 'espn-link-inline';
        espn.textContent = 'ESPN';
        gameRow.appendChild(espn);
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
        const displaySc = sc ?? liveSc;
        const goalStr = displaySc != null
          ? (idx === 0 ? displaySc.t1 : displaySc.t2)
          : (isDraw && idx === 0 ? 'D' : '');
        const scoreClass = `group-game-goal${isLiveGroup ? ' live' : ''}`;
        teamEl.innerHTML = `<span class="group-game-seed">${team.seed}</span><span class="group-game-name">${flag(team.name)}${esc(team.name)}</span>${goalStr !== '' ? `<span class="${scoreClass}">${goalStr}</span>` : ''}`;
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
  const playerPick  = (state.picks[state.currentPlayer] || {})[game.round]?.[getPickKey(game)];

  const card = document.createElement('div');
  card.className = 'matchup';

  const sc = state.scores[game.id];
  const liveSc = findGameScore(t1?.name, t2?.name);
  const isLive = !sc && liveSc && liveSc.status === 'in';
  if (isLive) {
    const badge = liveSc.link ? document.createElement('a') : document.createElement('div');
    if (liveSc.link) { badge.href = liveSc.link; badge.target = '_blank'; badge.rel = 'noopener noreferrer'; }
    badge.className = 'live-badge';
    badge.textContent = liveSc.statusDetail || 'LIVE';
    card.appendChild(badge);
  } else if (liveSc?.link) {
    const espn = document.createElement('a');
    espn.href = liveSc.link;
    espn.target = '_blank';
    espn.rel = 'noopener noreferrer';
    espn.className = 'espn-link-badge';
    espn.textContent = 'ESPN ↗';
    card.appendChild(espn);
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
      if (pickedThis)             row.classList.add('picked');
      if (pickedThis && isWinner) row.classList.add('pick-correct');
      if (pickedThis && isLoser)  row.classList.add('pick-wrong');
      const displaySc = sc ?? liveSc;
      const goals = displaySc != null ? `<span class="t-score${isLive ? ' live' : ''}">${idx === 0 ? displaySc.t1 : displaySc.t2}</span>` : '';
      row.innerHTML = `<span class="t-seed">${team.seed}</span><span class="t-name">${flag(team.name)}${esc(team.name)}</span>${goals}`;
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

  // 3rd Place Play-off
  const thirdGame = state.games[gameId('third', null, 0)];
  if (thirdGame) {
    const thirdSep = document.createElement('div');
    thirdSep.className = 'third-place-sep';
    finalContent.appendChild(thirdSep);

    const thirdInfo = document.createElement('div');
    thirdInfo.className = 'champ-info';
    thirdInfo.innerHTML = `<div class="third-place-label">&#129350; 3rd Place Play-off</div><div class="champ-date">Saturday, July 18, 2026</div>`;
    finalContent.appendChild(thirdInfo);

    const thirdWrap = document.createElement('div');
    thirdWrap.className = 'matchup-wrap';
    thirdWrap.appendChild(buildMatchup(thirdGame));
    finalContent.appendChild(thirdWrap);
  }

  finalCol.appendChild(finalContent);
  center.appendChild(finalCol);

  // Right SF column (game 1: C vs D)
  center.appendChild(buildSFCol(1));

  return center;
}

// ── RULES RENDERING ───────────────────────────────────────────

const DEFAULT_RULES_PLACEHOLDER = `WORLD CUP 2026 POOL — OFFICIAL RULES

HOW IT WORKS
Before each round opens, every player submits their picks for that round. Once the round is locked by the Commissioner, picks can no longer be changed. Points are awarded for correct picks, with bigger rewards for later rounds and for picking upsets.

PICK DEADLINES
Picks must be submitted before the Commissioner locks the round. Late picks will not be accepted. Make sure you are logged in and have saved your picks before the deadline.

——————————————————————————
SCORING
——————————————————————————

BASE POINTS
Every correct pick earns base points, regardless of which team wins:

  Group Stage       1 pt
  Round of 32       2 pts
  Round of 16       3 pts
  Quarterfinals     5 pts
  Semifinals        8 pts
  3rd Place         8 pts
  Final            15 pts

——————————————————————————

UPSET BONUS — PICKING A WINNER
Teams are seeded by FIFA Draw Pot (Pot 1 = strongest, Pot 4 = weakest). If you pick a higher-pot team to beat a lower-pot team, you earn base points plus an upset bonus:

  Total = Base pts + (Underdog pot − Favourite pot) × Round multiplier

Round multipliers:
  Group Stage ×1.0  ·  R32 ×1.2  ·  R16 ×1.3
  QF ×1.6  ·  SF ×2.0  ·  3rd Place ×2.0  ·  Final ×3.0

If there is no pot differential (equal-pot teams, or favourite wins), you earn base points only — no multiplier applied.

Examples:
  Pot 4 beats Pot 1 in the Group Stage → 1 + (3 × 1.0) = 4 pts
  Pot 3 beats Pot 1 in the Round of 32 → 2 + (2 × 1.2) = 4.4 pts
  Pot 2 beats Pot 1 in the Quarterfinals → 5 + (1 × 1.6) = 6.6 pts
  Pot 4 beats Pot 1 in the Final → 15 + (3 × 3.0) = 24 pts

——————————————————————————

DRAWS (Group Stage only)
You may pick a Draw in any Group Stage game. Knockout rounds are always decided by penalty kicks if level after 90 minutes, so Draw is not a pick option there. A correct draw pick earns base points plus a pot-gap bonus:

  Total = Base pts + (Pot differential / 2) × Round multiplier

Examples:
  Same-pot draw (e.g. Pot 2 vs Pot 2) → 1 + 0 = 1 pt
  Pot 1 vs Pot 2 draw → 1 + (0.5 × 1.0) = 1.5 pts
  Pot 1 vs Pot 3 draw → 1 + (1.0 × 1.0) = 2 pts
  Pot 1 vs Pot 4 draw → 1 + (1.5 × 1.0) = 2.5 pts

——————————————————————————
BONUS QUESTIONS
——————————————————————————

Each round includes bonus questions worth extra points. Answers must be submitted before the round locks.

Tournament-Wide Predictions (due before the Group Stage begins)
  · Golden Boot Winner (player name) — 6 pts
  · Team with Best Time of Possession % — 6 pts
  · First Pot 1 Team to be Eliminated — 6 pts

Group Stage
  · Team with Most Goals in the Group Stage — 5 pts
  · Confederation with Highest Win Rate — 5 pts
  · Highest Winning Margin in Any Single Game (goals) — 4 pts

Round of 32
  · Total Red Cards in R32 — 6 pts

Round of 16
  · Total Goals in R16 — 5 pts

Quarterfinals
  · Team with Most Assists — 2 pts
  · All Four Correct Semi-Finalist Picks — 10 pts

Semifinals
  · High Individual Scorer (Semi-Finals) — 3 pts

Final
  · Man of the Match — 3 pts

——————————————————————————
STANDINGS
——————————————————————————

The leaderboard shows each player's total points earned and their maximum possible score (current points plus potential points from picks already submitted for unplayed games). Players are ranked by total score. Tied players share the same rank.

——————————————————————————
PARTICIPATING TEAMS BY POT
——————————————————————————

Pot 1 (Top Seeds)
  Argentina · Belgium · Brazil · Colombia · Croatia · England
  France · Germany · Morocco · Netherlands · Portugal · Spain

Pot 2
  Austria · Canada · Ecuador · Iran · Japan · Mexico
  Senegal · South Korea · Switzerland · Turkey · Uruguay · USA

Pot 3
  Algeria · Australia · Czech Republic · DR Congo · Egypt · Ivory Coast
  Norway · Panama · Qatar · Saudi Arabia · Scotland · Sweden

Pot 4
  Bosnia · Cape Verde · Curacao · Ghana · Haiti · Iraq
  Jordan · New Zealand · Paraguay · South Africa · Tunisia · Uzbekistan

——————————————————————————
GENERAL RULES
——————————————————————————

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

  // ── Countdown timer (Feature 1) ──────────────────────────────
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  const dlRaw = (state.roundDeadlines || {})[roundId];
  if (dlRaw && isCurrentRound && state.roundStatus === 'open') {
    const dlMs = new Date(dlRaw).getTime();
    if (dlMs > Date.now()) {
      const cdDiv = document.createElement('div');
      cdDiv.className = 'picks-countdown';
      cdDiv.id = 'picks-countdown';
      body.appendChild(cdDiv);
      startCountdown(cdDiv, dlMs);
    }
  }

  // ── Last-saved indicator (Feature 3) ─────────────────────────
  const savedAt = (state.pickSavedAt || {})[viewId]?.[roundId];
  if (savedAt) {
    const tsDiv = document.createElement('div');
    tsDiv.className = 'picks-last-saved';
    tsDiv.textContent = `💾 Last saved: ${relativeTime(savedAt)}`;
    body.appendChild(tsDiv);
  }

  if (roundId === 'groups') {
    // Group stage: 12 groups, 6 games each, organized in group sections
    const MATCHDAY_IDX_PICKS = [0, 0, 1, 1, 2, 2];
    const groupsContainer = document.createElement('div');
    groupsContainer.className = 'picks-groups-container';
    GROUP_LETTERS.forEach(group => {
      const section = document.createElement('div');
      section.className = 'picks-group-section';
      const groupGamesAll = getGamesForRound('groups').filter(g => g.region === group);
      const pickedCount = groupGamesAll.filter(g => state.pendingPicks[getPickKey(g)]).length;
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
  // For the group stage, show two titled sections:
  // 1) Tournament-Wide Predictions, 2) Group Stage Bonuses
  function renderBonusQuestions(bonusList, sectionTitle) {
    if (!bonusList.length) return;
    const bonusSection = document.createElement('div');
    bonusSection.className = 'bonus-section';
    const bonusTitle = document.createElement('h3');
    bonusTitle.className = 'bonus-title';
    bonusTitle.innerHTML = sectionTitle;
    bonusSection.appendChild(bonusTitle);

    bonusList.forEach(b => {
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
        const autoTeams = srcGames.map(g => srcPicks[getPickKey(g)] || '');

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
  } // end renderBonusQuestions

  if (roundId === 'groups') {
    renderBonusQuestions(BONUS_CONFIG.tournament || [], '&#127760; Tournament-Wide Predictions');
    renderBonusQuestions(BONUS_CONFIG.groups    || [], '&#11088; Group Stage Bonuses');
  } else {
    renderBonusQuestions(getBonusList(roundId), '&#127775; Bonus Opportunity');
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
    <span class="pick-pts">${cfg.pts} pt${cfg.pts > 1 ? 's' : ''}</span>`;
  card.appendChild(hdr);

  if (!t1 && !t2) {
    const tbd = document.createElement('div');
    tbd.className = 'pick-tbd';
    tbd.textContent = 'Matchup TBD — teams not yet determined';
    card.appendChild(tbd);
    return card;
  }

  const savedPick = savedPicks[getPickKey(game)];
  const isDrawResult = state.results[game.id] === 'Draw';

  // Draw only available in Group Stage (knockout rounds decided by penalties)
  const options = game.round === 'groups'
    ? [{ team: t1 }, { team: null, isDraw: true }, { team: t2 }]
    : [{ team: t1 }, { team: t2 }];

  // Pre-compute pick popularity for locked/closed rounds
  const popData = (!isOpen && state.players.length > 1) ? getPickPopularity(game, game.round) : null;

  options.forEach(({ team, isDraw }) => {
    const optionName = isDraw ? 'Draw' : team?.name;
    if (!team && !isDraw) return;

    const isPicked     = state.pendingPicks[getPickKey(game)] === optionName;
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
          resultMark = '<span class="pick-o-result correct">✓</span>';
          row.classList.add('result-correct');
        } else {
          resultMark = '<span class="pick-o-result wrong">✗</span>';
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

    // Individual team score (goals) for this option
    const teamGoal = (!isDraw && sc !== undefined)
      ? String(team === t1 ? sc.t1 : sc.t2)
      : '';

    // Always emit result span (even empty) so columns stay aligned
    const resultSpan = resultMark || '<span class="pick-o-result"></span>';

    // Popularity bar (shown when round is locked/closed)
    let popHtml = '';
    if (popData && popData.total > 0) {
      const cnt = popData.counts[optionName] || 0;
      const pct = Math.round((cnt / popData.total) * 100);
      popHtml = `<span class="pick-o-pop"><span class="pick-pop-track"><span class="pick-pop-fill" style="width:${pct}%"></span></span><span class="pick-pop-txt">${cnt}/${popData.total}</span></span>`;
    }

    if (isDraw) {
      row.innerHTML = `<span class="pick-o-seed"></span><span class="pick-o-name pick-draw-label">Draw</span><span class="pick-o-score"></span><span class="pick-o-pts">${ptsTxt}</span>${resultSpan}${popHtml}`;
    } else {
      row.innerHTML = `<span class="pick-o-seed">${team.seed}</span><span class="pick-o-name">${flag(team.name)}${esc(team.name)}</span><span class="pick-o-score">${teamGoal}</span><span class="pick-o-pts">${ptsTxt}</span>${resultSpan}${popHtml}`;
    }
    row.insertBefore(radio, row.firstChild);

    if (isOpen) {
      row.addEventListener('click', () => {
        state.pendingPicks[getPickKey(game)] = optionName;
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

  // ── Emoji reactions (Feature 9) ─────────────────────────────
  if (state.results[game.id] !== undefined) {
    const reactionBar = document.createElement('div');
    reactionBar.className = 'reaction-bar';
    const myPid = state.sessionPlayer || state.currentPlayer;
    ['⚽', '🔥', '😮', '👏'].forEach(emoji => {
      const cnt    = (state.reactions?.[game.id]?.[emoji] || []).length;
      const reacted = !!(state.reactions?.[game.id]?.[emoji]?.includes(myPid));
      const btn = document.createElement('button');
      btn.className = 'reaction-btn' + (reacted ? ' reacted' : '');
      btn.innerHTML = cnt ? `${emoji}<span class="reaction-cnt">${cnt}</span>` : emoji;
      btn.title = emoji;
      btn.addEventListener('click', ev => { ev.stopPropagation(); toggleReaction(game.id, emoji); });
      reactionBar.appendChild(btn);
    });
    card.appendChild(reactionBar);
  }

  return card;
}

// ── PICK POPULARITY ───────────────────────────────────────────
function getPickPopularity(game, roundId) {
  const pickKey = getPickKey(game);
  const counts = {};
  let total = 0;
  state.players.forEach(p => {
    const pick = (state.picks[p.id] || {})[roundId]?.[pickKey];
    if (pick) { counts[pick] = (counts[pick] || 0) + 1; total++; }
  });
  return { counts, total };
}

// ── ROUND RECAP ───────────────────────────────────────────────
function getRecapRound() {
  if (state.lbRound === 'all') {
    if (state.roundStatus === 'closed') return state.currentRound;
    const ci = ROUND_CONFIG.findIndex(r => r.id === state.currentRound);
    if (ci > 0) {
      const prev = ROUND_CONFIG[ci - 1];
      if (getGamesForRound(prev.id).some(g => state.results[g.id] !== undefined)) return prev.id;
    }
    return null;
  }
  return getGamesForRound(state.lbRound).some(g => state.results[g.id] !== undefined) ? state.lbRound : null;
}

function buildRoundRecap(roundId) {
  const cfg = ROUND_CONFIG.find(r => r.id === roundId);
  const games = getGamesForRound(roundId).filter(g => state.results[g.id] !== undefined);
  if (!cfg || games.length === 0) return null;

  let topScore = 0, topPlayer = null;
  let totalPicks = 0, totalCorrect = 0;
  state.players.forEach(p => {
    const s = getPlayerRoundScore(p.id, roundId);
    if (s.score > topScore) { topScore = s.score; topPlayer = p; }
    totalPicks  += s.correct + s.wrong;
    totalCorrect += s.correct;
  });

  let upsets = 0;
  games.forEach(game => {
    const winner = getWinner(game.id);
    if (!winner || winner.name === 'Draw') return;
    const { t1, t2 } = getTeams(game);
    if (!t1 || !t2) return;
    const fav = t1.seed <= t2.seed ? t1 : t2;
    if (winner.name !== fav.name) upsets++;
  });

  const accuracy = totalPicks > 0 ? Math.round((totalCorrect / totalPicks) * 100) : 0;
  const el = document.createElement('div');
  el.className = 'round-recap';
  let html = topPlayer
    ? `<span class="recap-winner">🏆 ${esc(topPlayer.name)} won the ${esc(cfg.label)}</span><span class="recap-pts">${fmtScore(topScore)} pts</span>`
    : '';
  html += `<span class="recap-sep">·</span><span class="recap-stat">${totalCorrect}/${totalPicks} correct (${accuracy}%)</span>`;
  if (upsets > 0) html += `<span class="recap-sep">·</span><span class="recap-stat">⚡ ${upsets} upset${upsets !== 1 ? 's' : ''}</span>`;
  el.innerHTML = html;
  return el;
}


function updateSaveStatus() {
  const statusEl = document.getElementById('save-status');
  if (!statusEl) return;
  const roundId = state.activePicksRound;
  const games   = getGamesForRound(roundId);
  const picked  = games.filter(g => state.pendingPicks[getPickKey(g)]).length;
  if (roundId === 'groups') {
    const incomplete = GROUP_LETTERS.filter(g => {
      const grpGames = games.filter(gm => gm.region === g);
      return grpGames.some(gm => !state.pendingPicks[getPickKey(gm)]);
    });
    statusEl.textContent = picked === games.length
      ? `All ${games.length} picks complete ✔`
      : `${picked} / ${games.length} picked — ${incomplete.length} group${incomplete.length !== 1 ? 's' : ''} incomplete (${incomplete.join(', ')})`;
    // Update per-group progress counters live
    document.querySelectorAll('.picks-group-section').forEach(section => {
      const grpLetter = section.querySelector('.picks-group-hdr')?.textContent?.match(/Group ([A-L])/)?.[1];
      if (!grpLetter) return;
      const grpGames = games.filter(gm => gm.region === grpLetter);
      const done = grpGames.filter(gm => state.pendingPicks[getPickKey(gm)]).length;
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
  if (!state.pickSavedAt)       state.pickSavedAt       = {};
  if (!state.pickSavedAt[pid])  state.pickSavedAt[pid]  = {};
  state.pickSavedAt[pid][rid] = new Date().toISOString();
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
    thHTML += '<th>Score</th><th>Total Possible</th><th class="num lb-best-th" title="Best possible finish rank">Best</th>';
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

    const avatar   = playerAvatarHtml(row.player.name, 64);
    const canH2H   = !isMe && picksVisible && !linkLocked;
    const h2hBtnHtml = canH2H
      ? `<button class="lb-h2h-btn" data-h2hpid="${row.player.id}" title="Head-to-head vs ${esc(row.player.name)}">⚔</button>`
      : '';
    const natFlags = playerFlagsHtml(row.player.name);
    let tdHTML = `<td class="rank-num ${rankCls}">${rankIcon}</td>
      <td><div class="lb-player-cell">${avatar}<button class="${btnClass}" data-pid="${row.player.id}"${btnTitle}>${esc(row.player.name)}${lockTag}</button>${natFlags}${h2hBtnHtml}</div></td>`;

    if (state.lbRound === 'all') {
      const maxPossible = row.total.total + row.total.possible;
      const maxScore = ROUND_CONFIG.reduce((sum, cfg) => sum + cfg.pts * getGamesForRound(cfg.id).length, 0);
      const pctW = Math.min(100, Math.round((row.total.total / maxScore) * 100));
      const wl = row.total.correct || row.total.wrong
        ? `<span class="lb-wl"><span class="lb-w">${row.total.correct}✔</span> <span class="lb-l">${row.total.wrong}✘</span></span>`
        : '';
      const bestRank    = getBestPossibleRank(row.player.id, rows);
      const bRankIcon   = bestRank <= 3 ? ['🥇','🥈','🥉'][bestRank - 1] : `#${bestRank}`;
      tdHTML += `<td><span class="lb-total">${fmtScore(row.total.total)}</span>${wl}
          <div class="pct-bar-wrap"><div class="pct-bar" style="width:${pctW}%"></div></div></td>
        <td class="lb-possible">${fmtScore(maxPossible)}</td>
        <td class="num lb-best-finish" title="Best possible finish if all remaining picks win">${bRankIcon}</td>`;
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

  // Round recap banner
  const recapRoundId = getRecapRound();
  if (recapRoundId) {
    const recap = buildRoundRecap(recapRoundId);
    if (recap) body.appendChild(recap);
  }

  const scrollWrap = document.createElement('div');
  scrollWrap.className = 'lb-scroll-wrap';
  scrollWrap.appendChild(table);
  body.appendChild(scrollWrap);

  tbody.addEventListener('click', e => {
    const h2hBtn = e.target.closest('.lb-h2h-btn');
    if (h2hBtn) {
      const rid = state.lbRound === 'all' ? state.currentRound : state.lbRound;
      openH2H(h2hBtn.dataset.h2hpid, rid);
      return;
    }
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

  // ── Upset tracker (Feature 7) ─────────────────────────────
  if (state.lbRound === 'all') renderUpsetTracker(body);
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
        const key    = getPickKey(g);
        const stored = state.picks[p.id][cfg.id][key];
        const validPicks = cfg.id === 'groups'
          ? [t1.name, t2.name, 'Draw']
          : [t1.name, t2.name];
        if (!validPicks.includes(stored)) {
          const r = Math.random();
          state.picks[p.id][cfg.id][key] = cfg.id === 'groups'
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
  const bonuses  = getBonusList(roundId);

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

// ── RANDOM PICK GENERATOR ─────────────────────────────────────

function generateRandomPicks() {
  function mkRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Boldness: how likely each player is to pick an upset (0 = always pick fav)
  const BOLDNESS = [0.18, 0.45, 0.12, 0.35, 0.58, 0.28, 0.40, 0.22, 0.52, 0.33, 0.47, 0.30];

  let filled = 0;
  state.players.forEach((player, pi) => {
    const boldness = BOLDNESS[Math.min(pi, BOLDNESS.length - 1)];
    const rng = mkRng(pi * 9973 + 42);
    if (!state.picks[player.id]) state.picks[player.id] = {};

    ROUND_CONFIG.forEach(cfg => {
      state.picks[player.id][cfg.id] = {}; // overwrite round entirely
      getGamesForRound(cfg.id).forEach(game => {
        const { t1, t2 } = getTeams(game);
        if (!t1 || !t2) return;
        const fav = t1.seed <= t2.seed ? t1 : t2;
        const dog = fav === t1 ? t2 : t1;
        const upsetProb = boldness * (dog.seed - fav.seed) / 7;

        let pick;
        if (cfg.id === 'groups') {
          // Group stage: allow Draw (~10–18% based on boldness)
          const drawProb = 0.10 + boldness * 0.12;
          const r = rng();
          if (r < drawProb)                                    pick = 'Draw';
          else if (r < drawProb + upsetProb * (1 - drawProb)) pick = dog.name;
          else                                                 pick = fav.name;
        } else {
          // Knockout rounds: ~50/50 split so picks are a realistic mix of
          // right and wrong. Each player gets a different coin flip per game.
          pick = rng() < 0.5 ? t1.name : t2.name;
        }
        state.picks[player.id][cfg.id][getPickKey(game)] = pick;
        filled++;
      });
    });
  });
  saveState();
  return filled;
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
        state.picks[player.id][cfg.id][getPickKey(game)] = rng() < upsetProb ? dog.name : fav.name;
      });
    });

    if (!state.bonusPicks[player.id]) state.bonusPicks[player.id] = {};
    Object.keys(BONUS_CONFIG).forEach(roundId => {
      BONUS_CONFIG[roundId].forEach(b => {
        if (b.type === 'multi') {
          const srcRound = b.sourceRound || 'qf';
          const srcGames = getGamesForRound(srcRound);
          const srcPicks = (state.picks[player.id] || {})[srcRound] || {};
          state.bonusPicks[player.id][b.id] = srcGames.map(g => srcPicks[getPickKey(g)] || '');
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

// ── ANALYTICS ─────────────────────────────────────────────────

let _analyticsCharts = [];

function renderAnalytics() {
  _analyticsCharts.forEach(c => c.destroy());
  _analyticsCharts = [];

  const body = document.getElementById('analytics-body');
  if (!body) return;
  body.innerHTML = '';

  const MONO = "'Consolas','Courier New',monospace";
  const BB   = '#FF6600';
  const BBC  = ['#FF6600','#00CFFF','#FFFF00','#00FF87','#FF3D6B','#CC44FF','#FF9933','#00FFCC','#FF6666','#66B3FF','#FFD700','#99FF99','#FF99FF'];

  const players = ['Lorenz','Diego','Cole','Matthias','Commish','Lang','Rafa','Dennis','Pataky','Puschel','Francisco','Josh','Sean'];
  const short   = ['LOR','DIE','COL','MAT','COM','LAN','RAF','DEN','PAT','PUS','FRA','JOS','SEA'];

  Chart.defaults.color                = '#888';
  Chart.defaults.font.family          = MONO;
  Chart.defaults.font.size            = 9;
  Chart.defaults.animation            = false;
  Chart.defaults.maintainAspectRatio  = false;

  const gc = '#111';
  const sc = {
    x: { grid: { color: gc, lineWidth: 1 }, ticks: { color: '#777', font: { family: MONO, size: 9 } }, border: { color: '#333' } },
    y: { grid: { color: gc, lineWidth: 1 }, ticks: { color: '#777', font: { family: MONO, size: 9 } }, border: { color: '#333' } },
  };
  const tip = {
    backgroundColor: '#0a0a0a', borderColor: BB, borderWidth: 1,
    titleColor: BB, bodyColor: '#CCC', padding: 8,
    titleFont: { family: MONO, size: 10, weight: 'bold' },
    bodyFont: { family: MONO, size: 9 },
  };
  const leg = (pos) => ({ position: pos || 'bottom', labels: { color: '#888', font: { family: MONO, size: 8 }, boxWidth: 8, boxHeight: 8, padding: 10 } });

  // Bloomberg page header
  const hdr = document.createElement('div');
  hdr.className = 'bb-page-header';
  hdr.innerHTML = `<span class="bb-page-title">ANALYTICS</span>` +
    `<span class="bb-page-sub">WORLD CUP POOL 2026 &diams; DUMMY DATA &diams; ALL FIGURES ILLUSTRATIVE</span>` +
    `<span class="bb-page-num">PG 1/1</span>`;
  body.appendChild(hdr);

  const grid = document.createElement('div');
  grid.className = 'analytics-grid';
  body.appendChild(grid);

  function addCard(id, title, desc, wide) {
    const card = document.createElement('div');
    card.className = 'analytics-card' + (wide ? ' analytics-card-wide' : '');
    card.innerHTML =
      `<div class="bb-card-header"><span class="analytics-card-title">${title}</span></div>` +
      `<p class="analytics-card-desc">${desc}</p>` +
      `<div class="analytics-chart-wrap" id="wrap-${id}"><canvas id="${id}"></canvas></div>`;
    grid.appendChild(card);
  }

  function mkChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    _analyticsCharts.push(new Chart(canvas, config));
  }

  // 1 ── Upset Index
  addCard('ch-upset', 'UPSET INDEX', 'Underdog picks per player — higher = bolder strategy');
  mkChart('ch-upset', {
    type: 'bar',
    data: {
      labels: players,
      datasets: [{ label: 'UPSET PICKS', data: [22,18,15,14,17,11,13,9,8,16,12,5,14],
        backgroundColor: BB, hoverBackgroundColor: '#FF8833', borderWidth: 0, borderRadius: 0 }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: tip },
      scales: { x: { ...sc.x, beginAtZero: true }, y: sc.y }
    }
  });

  // 2 ── Pick Consensus
  addCard('ch-consensus', 'PICK CONSENSUS', 'Most contested matchups — 50% = perfectly split pool');
  const matchups = ['Mexico vs S.Africa','USA vs Paraguay','Brazil vs Morocco','England vs Croatia','Neth. vs Japan','Germany vs Curacao','France vs Senegal','Arg. vs Algeria'];
  const pct1 = [53,49,48,45,71,82,67,55];
  mkChart('ch-consensus', {
    type: 'bar',
    data: {
      labels: matchups,
      datasets: [
        { label: 'TEAM A %', data: pct1,                   backgroundColor: BB,    borderWidth: 0, borderRadius: 0 },
        { label: 'TEAM B %', data: pct1.map(v => 100 - v), backgroundColor: '#1a1a1a', borderWidth: 0, borderRadius: 0 },
      ]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: leg('bottom'), tooltip: tip },
      scales: {
        x: { ...sc.x, stacked: true, max: 100, ticks: { ...sc.x.ticks, callback: v => v + '%' } },
        y: { ...sc.y, stacked: true },
      }
    }
  });

  // 3 ── Risk Profile
  addCard('ch-risk', 'RISK PROFILE', 'Pick distribution by pot — Pot 3/4 picks are upsets');
  mkChart('ch-risk', {
    type: 'bar',
    data: {
      labels: players,
      datasets: [
        { label: 'POT 1 WINS',   data: [28,32,38,35,30,25,36,34,40,29,33,37,31], backgroundColor: BB,       borderWidth: 0, borderRadius: 0 },
        { label: 'POT 2 WINS',   data: [20,18,15,17,22,24,16,18,14,21,19,15,20], backgroundColor: '#00CFFF', borderWidth: 0, borderRadius: 0 },
        { label: 'POT 3 UPSETS', data: [14,12,10,11,13,15,10,11, 9,14,12,10,13], backgroundColor: '#FFFF00', borderWidth: 0, borderRadius: 0 },
        { label: 'POT 4 UPSETS', data: [10,10, 9, 9, 7, 8,10, 9, 9, 8, 8,10, 8], backgroundColor: '#FF3D6B', borderWidth: 0, borderRadius: 0 },
      ]
    },
    options: {
      plugins: { legend: leg('bottom'), tooltip: tip },
      scales: { x: { ...sc.x, stacked: true }, y: { ...sc.y, stacked: true } }
    }
  });

  // 4 ── Agreement Matrix (HTML table)
  addCard('ch-agreement', 'PLAYER AGREEMENT MATRIX', 'How often any two players picked the same team (%)');
  const wrap4 = document.getElementById('wrap-ch-agreement');
  wrap4.innerHTML = '';
  const seed = (i, j) => Math.min(95, Math.max(30, Math.round(60 + Math.sin(i * 3.1 + j * 7.3) * 22)));
  let tbl = '<div class="ag-scroll"><table class="ag-table"><thead><tr><th></th>' +
    short.map(s => `<th>${s}</th>`).join('') + '</tr></thead><tbody>';
  short.forEach((row, i) => {
    tbl += `<tr><th>${row}</th>`;
    short.forEach((_, j) => {
      const v   = i === j ? 100 : seed(i, j);
      const pct = (v - 30) / 70;
      const r   = Math.round(255 * pct + 10 * (1 - pct));
      const g   = Math.round(102 * pct + 10 * (1 - pct));
      const b   = Math.round(0);
      const bg  = i === j ? BB : `rgb(${r},${g},${b})`;
      const fg  = (pct > 0.4 || i === j) ? '#FFF' : '#555';
      tbl += `<td style="background:${bg};color:${fg}">${v}%</td>`;
    });
    tbl += '</tr>';
  });
  tbl += '</tbody></table></div>';
  wrap4.innerHTML = tbl;

  // 5 ── Score Over Time
  addCard('ch-score-time', 'SCORE OVER TIME', 'Cumulative points per player by matchday (dummy data)', true);
  const mdays = ['MD1','MD2','MD3','R32','R16','QF','SF','FINAL'];
  mkChart('ch-score-time', {
    type: 'line',
    data: {
      labels: mdays,
      datasets: players.map((name, i) => {
        let cum = 0;
        return {
          label: name,
          data: mdays.map((_, mi) => { cum += 7 + Math.round(Math.sin(i * 1.7 + mi * 2.3) * 5 + 5); return cum; }),
          borderColor: BBC[i], backgroundColor: 'transparent',
          borderWidth: 1.5, pointRadius: 2, pointBackgroundColor: BBC[i], tension: 0,
        };
      })
    },
    options: { plugins: { legend: leg('bottom'), tooltip: tip }, scales: sc }
  });

  // 6 ── Score Ceiling
  addCard('ch-ceiling', 'SCORE CEILING', 'Maximum possible score remaining per player (dummy data)', true);
  mkChart('ch-ceiling', {
    type: 'line',
    data: {
      labels: mdays,
      datasets: players.map((name, i) => {
        let cur = 95 + Math.round(Math.sin(i * 2.3) * 8);
        return {
          label: name,
          data: mdays.map((_, mi) => { cur -= 5 + Math.round(Math.abs(Math.sin(i * 1.3 + mi * 3.1)) * 4); return Math.max(cur, 15); }),
          borderColor: BBC[i], backgroundColor: 'transparent',
          borderWidth: 1.5, pointRadius: 2, pointBackgroundColor: BBC[i], tension: 0,
        };
      })
    },
    options: { plugins: { legend: leg('bottom'), tooltip: tip }, scales: sc }
  });

  // 7 ── Accuracy by Group
  addCard('ch-group-acc', 'ACCURACY BY GROUP', 'Correct pick % per group — top 5 players shown (dummy data)');
  mkChart('ch-group-acc', {
    type: 'radar',
    data: {
      labels: ['A','B','C','D','E','F','G','H','I','J','K','L'],
      datasets: players.slice(0, 5).map((name, i) => ({
        label: name,
        data: Array.from({length:12}, (_, gi) => Math.max(0, Math.min(100, 55 + Math.round(Math.sin(i * 2.1 + gi * 1.7) * 30)))),
        borderColor: BBC[i], backgroundColor: BBC[i] + '18',
        borderWidth: 1.5, pointRadius: 2, pointBackgroundColor: BBC[i],
      }))
    },
    options: {
      plugins: { legend: leg('bottom'), tooltip: tip },
      scales: { r: {
        grid: { color: '#1a1a1a' },
        angleLines: { color: '#1a1a1a' },
        ticks: { color: '#555', backdropColor: 'transparent', stepSize: 25, font: { family: MONO, size: 8 } },
        pointLabels: { color: '#888', font: { family: MONO, size: 9 } },
        suggestedMin: 0, suggestedMax: 100,
      }}
    }
  });

  // 8 ── Upset Hit Rate
  addCard('ch-upset-hit', 'UPSET HIT RATE', '% of upset picks that were correct (dummy data)');
  const hitData = [48,42,55,38,61,35,44,50,33,47,52,40,45];
  mkChart('ch-upset-hit', {
    type: 'bar',
    data: {
      labels: players,
      datasets: [{ label: 'HIT RATE',
        data: hitData,
        backgroundColor: hitData.map(v => v >= 50 ? BB : '#2a1400'),
        hoverBackgroundColor: hitData.map(v => v >= 50 ? '#FF8833' : '#3d1e00'),
        borderWidth: 0, borderRadius: 0,
      }]
    },
    options: {
      plugins: { legend: { display: false }, tooltip: tip },
      scales: {
        x: sc.x,
        y: { ...sc.y, beginAtZero: true, max: 100, ticks: { color: '#777', font: { family: MONO, size: 9 }, callback: v => v + '%' } }
      }
    }
  });
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
  renderDeadlineAdmin();
  renderBroadcastAdmin();
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

// ── PICKS BACKUP HELPERS ─────────────────────────────────────

function downloadStateBackup() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const exportData = {
    exportedAt: new Date().toISOString(),
    picks:       state.picks,
    bonusPicks:  state.bonusPicks,
    players:     state.players,
    results:     state.results,
    bonusAnswers:state.bonusAnswers,
    currentRound:state.currentRound,
    roundStatus: state.roundStatus,
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `wc2026-backup-${ts}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Backup downloaded!', 'success');
}

async function showServerBackups() {
  const container = document.getElementById('backup-list-container');
  const content   = document.getElementById('backup-list-content');
  if (!container || !content) return;
  const visible = container.style.display !== 'none';
  if (visible) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  content.textContent = 'Loading…';
  try {
    const adminId = state.sessionPlayer || state.currentPlayer;
    const res = await fetch(`/api/picks-backups?_sender=${adminId}`);
    const data = await res.json();
    if (!data.backups || !data.backups.length) {
      content.textContent = 'No server backups found yet. They appear automatically once picks are saved.';
      return;
    }
    content.innerHTML = '';
    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;margin-top:0.5rem';
    table.innerHTML = `<thead><tr style="text-align:left;border-bottom:1px solid var(--border)">
      <th style="padding:4px 8px">File</th>
      <th style="padding:4px 8px">Saved</th>
      <th style="padding:4px 8px">Picks</th>
      <th style="padding:4px 8px"></th>
    </tr></thead>`;
    const tbody = document.createElement('tbody');
    data.backups.forEach(b => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border)';
      const dt = b.savedAt ? new Date(b.savedAt).toLocaleString() : '—';
      tr.innerHTML = `<td style="padding:4px 8px;font-family:monospace;font-size:0.75rem">${b.filename}</td>
        <td style="padding:4px 8px">${dt}</td>
        <td style="padding:4px 8px">${b.totalPicks ?? '?'}</td>
        <td style="padding:4px 8px">
          <a href="/api/picks-backup/${b.filename}?_sender=${adminId}" download
             style="color:var(--primary);text-decoration:none;font-size:0.78rem">&#8659; Download</a>
        </td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    content.appendChild(table);
  } catch (e) {
    content.textContent = 'Error loading backups: ' + e.message;
  }
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

// ── FEATURE 1: COUNTDOWN TIMER ───────────────────────────────

function startCountdown(target, deadlineMs) {
  const update = () => {
    const diff = deadlineMs - Date.now();
    if (diff <= 0) {
      target.textContent = '⏰ Deadline passed — picks may be locked soon';
      clearInterval(countdownTimer);
      countdownTimer = null;
      setTimeout(pollServer, 600);
      return;
    }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${String(m).padStart(2,'0')}m`);
    parts.push(`${String(s).padStart(2,'0')}s`);
    target.textContent = `⏰ Picks lock in: ${parts.join(' ')}`;
  };
  update();
  countdownTimer = setInterval(update, 1000);
}

// ── FEATURE 3: RELATIVE TIME ──────────────────────────────────

function relativeTime(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(isoStr).toLocaleDateString(undefined,
    { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── FEATURE 6: BEST POSSIBLE FINISH ──────────────────────────

function getBestPossibleRank(playerId, rows) {
  const myRow = rows.find(r => r.player.id === playerId);
  if (!myRow) return rows.length;
  const myMax = myRow.total.total + myRow.total.possible;
  return 1 + rows.filter(r => r.player.id !== playerId && r.total.total > myMax).length;
}

// ── FEATURE 7: UPSET TRACKER ─────────────────────────────────

function computeUpsets() {
  const upsets = [];
  for (const [gid, resultName] of Object.entries(state.results)) {
    if (resultName === 'Draw') continue;
    const game = state.games[gid];
    if (!game) continue;
    const { t1, t2 } = getTeams(game);
    if (!t1 || !t2) continue;
    const winner = getWinner(gid);
    if (!winner) continue;
    const fav = t1.seed <= t2.seed ? t1 : t2;
    const dog = fav === t1 ? t2 : t1;
    if (winner.name !== dog.name) continue; // not an upset
    const cfg = ROUND_CONFIG.find(r => r.id === game.round);
    if (!cfg) continue;
    const bonusPts = Math.round((dog.seed - fav.seed) * cfg.multiplier * 10) / 10;
    const pickedBy = state.players
      .filter(p => (state.picks[p.id] || {})[game.round]?.[getPickKey(game)] === winner.name)
      .map(p => p.name);
    upsets.push({ game, winner, loser: fav, seedDiff: dog.seed - fav.seed, bonusPts, cfg, pickedBy });
  }
  return upsets.sort((a, b) => b.bonusPts - a.bonusPts);
}

function renderUpsetTracker(container) {
  const upsets = computeUpsets();
  const section = document.createElement('div');
  section.className = 'upset-tracker';

  const hdr = document.createElement('div');
  hdr.className = 'upset-tracker-hdr';
  hdr.innerHTML = `<span class="upset-tracker-title">⚡ Upset Tracker</span>
    <span class="upset-tracker-count">${upsets.length} upset${upsets.length !== 1 ? 's' : ''}</span>`;
  section.appendChild(hdr);

  if (!upsets.length) {
    const empty = document.createElement('div');
    empty.className = 'upset-empty';
    empty.textContent = 'No upsets yet — all favorites winning so far.';
    section.appendChild(empty);
    container.appendChild(section);
    return;
  }

  upsets.forEach(u => {
    const row = document.createElement('div');
    row.className = 'upset-row';
    const pickedByHtml = u.pickedBy.length
      ? `<span class="upset-picked-by">Picked by: ${u.pickedBy.map(n => esc(n)).join(', ')}</span>`
      : '<span class="upset-picked-by nobody">Nobody picked this</span>';
    row.innerHTML = `
      <div class="upset-game">
        <span class="upset-winner">${flag(u.winner.name)}${esc(u.winner.name)}<span class="upset-seed"> (${u.winner.seed})</span></span>
        <span class="upset-arrow">beat</span>
        <span class="upset-loser">${flag(u.loser.name)}${esc(u.loser.name)}<span class="upset-seed"> (${u.loser.seed})</span></span>
      </div>
      <div class="upset-meta">
        <span class="upset-round">${u.cfg.short}</span>
        <span class="upset-bonus">+${u.bonusPts} upset bonus</span>
        ${pickedByHtml}
      </div>`;
    section.appendChild(row);
  });

  container.appendChild(section);
}

// ── FEATURE 9: EMOJI REACTIONS ────────────────────────────────

function toggleReaction(gameId, emoji) {
  const myPid = state.sessionPlayer || state.currentPlayer;
  if (!myPid) return;
  if (!state.reactions)           state.reactions           = {};
  if (!state.reactions[gameId])   state.reactions[gameId]   = {};
  if (!state.reactions[gameId][emoji]) state.reactions[gameId][emoji] = [];
  const arr = state.reactions[gameId][emoji];
  const idx = arr.indexOf(myPid);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(myPid);
  saveState();
  renderCurrentView();
}

function getReactionCounts(gameId) {
  const out = {};
  for (const [emoji, players] of Object.entries(state.reactions?.[gameId] || {})) {
    if (players.length) out[emoji] = players.length;
  }
  return out;
}

// ── FEATURE 10: BROADCAST BANNER ─────────────────────────────

function updateBroadcastBanner() {
  const banner = document.getElementById('broadcast-banner');
  if (!banner) return;
  const msg = state.broadcast?.message;
  const id  = state.broadcast?.id;
  if (msg && id && id !== dismissedBroadcastId) {
    document.getElementById('broadcast-text').textContent = msg;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

function dismissBroadcast() {
  dismissedBroadcastId = state.broadcast?.id || null;
  const banner = document.getElementById('broadcast-banner');
  if (banner) banner.style.display = 'none';
}

function sendBroadcast() {
  const input = document.getElementById('broadcast-input');
  const msg = input?.value.trim();
  if (!msg) { showToast('Enter a message first', 'error'); return; }
  state.broadcast = { message: msg, id: uid() };
  saveState();
  updateBroadcastBanner();
  renderBroadcastAdmin();
  showToast('Broadcast sent! 📢', 'success');
}

function clearBroadcast() {
  state.broadcast = null;
  saveState();
  updateBroadcastBanner();
  renderBroadcastAdmin();
  showToast('Broadcast cleared', 'info');
}

function renderBroadcastAdmin() {
  const wrapper = document.querySelector('.admin-wrapper');
  if (!wrapper) return;
  let card = document.getElementById('broadcast-admin-card');
  if (!card) {
    card = document.createElement('div');
    card.className = 'admin-card';
    card.id = 'broadcast-admin-card';
    const dangerZone = wrapper.querySelector('.danger-zone');
    dangerZone ? wrapper.insertBefore(card, dangerZone) : wrapper.appendChild(card);
  }
  const current = state.broadcast?.message || '';
  card.innerHTML = `
    <h3 class="admin-card-title">Commissioner Broadcast</h3>
    <p style="color:var(--text-3);font-size:0.8rem;margin-bottom:0.5rem">Send a banner message to all players — stays until dismissed or cleared.</p>
    <div class="admin-row">
      <textarea id="broadcast-input" rows="2" maxlength="200" placeholder="Type your message..."
        style="flex:1;resize:vertical;background:var(--surface-3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 8px;font-size:0.85rem">${esc(current)}</textarea>
    </div>
    <div class="admin-row" style="margin-top:0.5rem;gap:0.5rem">
      <button class="btn btn-primary"   id="send-broadcast-btn">📢 Send</button>
      <button class="btn btn-secondary" id="clear-broadcast-btn">Clear</button>
      <button class="btn btn-secondary" id="notif-btn" style="margin-left:auto" title="Enable desktop notifications for round lock / result alerts">🔔 Notifications</button>
    </div>
    ${current ? `<div style="font-size:0.75rem;color:var(--accent);margin-top:0.4rem">Active: "${esc(current)}"</div>` : ''}
  `;
  card.querySelector('#send-broadcast-btn')?.addEventListener('click',  sendBroadcast);
  card.querySelector('#clear-broadcast-btn')?.addEventListener('click', clearBroadcast);
  card.querySelector('#notif-btn')?.addEventListener('click', requestNotifPermission);
}

// ── FEATURE 1: PICK DEADLINE ADMIN ───────────────────────────

function renderDeadlineAdmin() {
  const wrapper = document.querySelector('.admin-wrapper');
  if (!wrapper) return;
  let card = document.getElementById('deadline-admin-card');
  if (!card) {
    card = document.createElement('div');
    card.className = 'admin-card';
    card.id = 'deadline-admin-card';
    const dangerZone = wrapper.querySelector('.danger-zone');
    dangerZone ? wrapper.insertBefore(card, dangerZone) : wrapper.appendChild(card);
  }
  const optHtml = ROUND_CONFIG.map(r =>
    `<option value="${r.id}"${r.id === state.currentRound ? ' selected' : ''}>${r.label}</option>`
  ).join('');
  card.innerHTML = `
    <h3 class="admin-card-title">Pick Deadline</h3>
    <p style="color:var(--text-3);font-size:0.8rem;margin-bottom:0.5rem">Set a countdown deadline — players see a live timer on My Picks.</p>
    <div class="admin-row">
      <label>Round:</label>
      <select id="deadline-round-sel" class="sel-input">${optHtml}</select>
    </div>
    <div class="admin-row" style="margin-top:0.5rem;flex-wrap:wrap;gap:0.4rem">
      <input type="datetime-local" id="deadline-input" class="sel-input" style="flex:1;min-width:170px" />
      <button class="btn btn-primary"   id="save-deadline-btn">Set</button>
      <button class="btn btn-secondary" id="clear-deadline-btn">Clear</button>
    </div>
    <div id="deadline-current" style="font-size:0.75rem;color:var(--text-3);margin-top:0.35rem"></div>
  `;
  const roundSel   = card.querySelector('#deadline-round-sel');
  const input      = card.querySelector('#deadline-input');
  const currentDiv = card.querySelector('#deadline-current');
  const refresh = () => {
    const dl = (state.roundDeadlines || {})[roundSel.value];
    if (dl) {
      input.value = new Date(dl).toISOString().slice(0, 16);
      currentDiv.textContent = `Set: ${new Date(dl).toLocaleString()}`;
    } else {
      input.value = '';
      currentDiv.textContent = 'No deadline set for this round.';
    }
  };
  roundSel.addEventListener('change', refresh);
  refresh();
  card.querySelector('#save-deadline-btn').addEventListener('click', () => {
    if (!input.value) { showToast('Pick a date & time', 'error'); return; }
    if (!state.roundDeadlines) state.roundDeadlines = {};
    state.roundDeadlines[roundSel.value] = new Date(input.value).toISOString();
    saveState(); refresh();
    showToast('Deadline set!', 'success');
  });
  card.querySelector('#clear-deadline-btn').addEventListener('click', () => {
    if (state.roundDeadlines) delete state.roundDeadlines[roundSel.value];
    saveState(); refresh();
    showToast('Deadline cleared', 'info');
  });
}

// ── FEATURE 2: BROWSER NOTIFICATIONS ─────────────────────────

async function requestNotifPermission() {
  if (!('Notification' in window)) {
    showToast('Notifications not supported in this browser', 'error'); return;
  }
  const result = await Notification.requestPermission();
  notifPermission = result;
  if (result === 'granted')  showToast('Notifications enabled! 🔔', 'success');
  else if (result === 'denied') showToast('Notifications blocked — check browser settings', 'error');
  else showToast('Notification permission dismissed', 'info');
}

function fireNotif(title, body) {
  if (notifPermission !== 'granted') return;
  if (!document.hidden) return; // only when tab is in background
  try { new Notification(title, { body, icon: 'logo.png' }); } catch (e) {}
}

// ── FEATURE 4: HEAD-TO-HEAD ───────────────────────────────────

function openH2H(opponentId, roundId) {
  let modal = document.getElementById('h2h-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'h2h-modal';
    modal.className = 'h2h-modal-overlay';
    modal.innerHTML = `
      <div class="h2h-modal-card">
        <div class="h2h-modal-hdr">
          <span id="h2h-title" class="h2h-modal-title"></span>
          <button class="h2h-close-btn" onclick="closeH2H()">✕</button>
        </div>
        <div id="h2h-body"></div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) closeH2H(); });
    document.body.appendChild(modal);
  }
  const myId   = state.sessionPlayer || state.currentPlayer;
  const myName = state.players.find(p => p.id === myId)?.name       || 'Me';
  const opName = state.players.find(p => p.id === opponentId)?.name || 'Opponent';
  document.getElementById('h2h-title').textContent = `${myName} vs ${opName}`;
  renderH2HBody(document.getElementById('h2h-body'), myId, opponentId, roundId);
  modal.style.display = 'flex';
}

function closeH2H() {
  const modal = document.getElementById('h2h-modal');
  if (modal) modal.style.display = 'none';
}

function renderH2HBody(container, myId, opponentId, roundId) {
  container.innerHTML = '';
  const cfg = ROUND_CONFIG.find(r => r.id === roundId);
  if (!cfg) return;
  const myPicks  = (state.picks[myId]       || {})[roundId] || {};
  const oppPicks = (state.picks[opponentId] || {})[roundId] || {};
  const myName   = state.players.find(p => p.id === myId)?.name       || 'Me';
  const oppName  = state.players.find(p => p.id === opponentId)?.name || 'Opponent';
  const games    = getGamesForRound(roundId);
  if (!games.length) {
    container.innerHTML = '<div class="h2h-empty">No games in this round yet.</div>';
    return;
  }
  const myScore  = getPlayerRoundScore(myId,       roundId);
  const oppScore = getPlayerRoundScore(opponentId, roundId);

  const summary = document.createElement('div');
  summary.className = 'h2h-summary';
  summary.innerHTML = `
    <div class="h2h-s-player${myScore.score >= oppScore.score ? ' h2h-leading' : ''}">
      ${playerAvatarHtml(myName, 44)}
      <div class="h2h-s-name">${esc(myName)}</div>
      <div class="h2h-s-score">${fmtScore(myScore.score)} pts</div>
      <div class="h2h-s-wl">${myScore.correct}✔ ${myScore.wrong}✘</div>
    </div>
    <div class="h2h-vs">vs</div>
    <div class="h2h-s-player${oppScore.score > myScore.score ? ' h2h-leading' : ''}">
      ${playerAvatarHtml(oppName, 44)}
      <div class="h2h-s-name">${esc(oppName)}</div>
      <div class="h2h-s-score">${fmtScore(oppScore.score)} pts</div>
      <div class="h2h-s-wl">${oppScore.correct}✔ ${oppScore.wrong}✘</div>
    </div>`;
  container.appendChild(summary);

  const rndLabel = document.createElement('div');
  rndLabel.className = 'h2h-round-label';
  rndLabel.textContent = cfg.label;
  container.appendChild(rndLabel);

  const gamesDiv = document.createElement('div');
  gamesDiv.className = 'h2h-games';
  games.forEach(game => {
    const { t1, t2 } = getTeams(game);
    if (!t1 && !t2) return;
    const winner  = getWinner(game.id);
    const myPick  = myPicks[getPickKey(game)];
    const oppPick = oppPicks[getPickKey(game)];
    const same    = myPick && oppPick && myPick === oppPick;
    const isCorrect = pick => {
      if (!pick || !state.results[game.id]) return null;
      if (state.results[game.id] === 'Draw') return pick === 'Draw';
      return !!(winner && pick === winner.name);
    };
    const pickHtml = pick => {
      if (!pick) return '<span class="h2h-no-pick">—</span>';
      const c = isCorrect(pick);
      const cls = c === true ? 'h2h-pick correct' : c === false ? 'h2h-pick wrong' : 'h2h-pick pending';
      const icon = c === true ? ' ✔' : c === false ? ' ✗' : '';
      const fl   = pick !== 'Draw' ? flag(pick) : '';
      return `<span class="${cls}">${fl}${esc(pick)}${icon}</span>`;
    };
    const label = game.round === 'groups'
      ? (game.label || '').replace(/^Group [A-L]: /i, '')
      : (game.label || game.region || '');
    const row = document.createElement('div');
    row.className = 'h2h-game-row' + (same ? ' h2h-same' : '');
    row.innerHTML = `
      <div class="h2h-game-pick my-pick">${pickHtml(myPick)}</div>
      <div class="h2h-game-label">${esc(label)}</div>
      <div class="h2h-game-pick opp-pick">${pickHtml(oppPick)}</div>`;
    gamesDiv.appendChild(row);
  });
  container.appendChild(gamesDiv);
}

// ── FEATURE 8: PWA INSTALL BANNER ────────────────────────────

function showInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = 'flex';
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

  document.getElementById('gen-picks-btn')?.addEventListener('click', () => {
    if (!confirm(`Overwrite ALL picks for all ${state.players.length} players with seeded-random selections?`)) return;
    const n = generateRandomPicks();
    showToast(`Generated ${n} random picks across ${state.players.length} players`, 'success');
    renderAdmin();
  });

  document.getElementById('backup-download-btn')?.addEventListener('click', downloadStateBackup);
  document.getElementById('backup-list-btn')?.addEventListener('click', showServerBackups);

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

  // PWA install banner buttons (Feature 8)
  document.getElementById('install-btn')?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    const banner = document.getElementById('install-banner');
    if (banner) banner.style.display = 'none';
  });
  document.getElementById('install-dismiss-btn')?.addEventListener('click', () => {
    const banner = document.getElementById('install-banner');
    if (banner) banner.style.display = 'none';
  });
}

// ── INIT ──────────────────────────────────────────────────────

async function init() {
  state.games = buildGames();
  await loadState();
  // Rebuild games with any saved r32Teams now that state is loaded
  if (state.r32Teams) rebuildGames();

  if (!state.players.length) {
    // Fresh install — seed default players only (no demo data)
    state.players = DEFAULT_PLAYERS.map(p => ({ ...p, id: uid() }));
    saveState();
  }
  if (!state.rulesText || state.rulesText.includes('Total number of draws in the group stage') || state.rulesText.includes('A correct Draw pick earns 1 point') || state.rulesText.includes('(Pot differential / 2) × Round multiplier') || state.rulesText.includes('((Underdog pot') || state.rulesText.includes('Germany · Mexico · Netherlands')) {
    // First run or old default text — replace with updated rules
    state.rulesText = DEFAULT_RULES_PLACEHOLDER;
    saveState();
  }
  if (!state.currentPlayer && state.players.length) {
    state.currentPlayer = state.players[0].id;
  }

  setupEvents();
  setupOfflineDetection();

  // Resume session from localStorage if player still exists.
  // Render errors must NOT reach this catch or they'll re-show the login overlay.
  let sessionRestored = false;
  try {
    const savedPid = localStorage.getItem('wcSession');
    if (savedPid && state.players.find(p => p.id === savedPid)) {
      state.sessionPlayer = savedPid;
      state.currentPlayer = savedPid;
      sessionRestored = true;
    }
  } catch(e) { /* localStorage unavailable */ }

  if (sessionRestored) {
    document.getElementById('login-overlay').style.display = 'none';
    updateSessionHeader();
    updatePlayerSelect();
    try { switchView('bracket'); } catch(e) { console.error('Render error:', e); }
  } else {
    renderLoginOverlay();
  }

  startPolling();
  startScoresPolling();

  // Feature 8: PWA service worker + install prompt
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner();
  });
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
    reactions: state.reactions, broadcast: state.broadcast,
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
      reactions: saved.reactions, broadcast: saved.broadcast,
    });

    if (newHash === lastStateHash) return;
    lastStateHash = newHash;

    // Snapshot for notification detection (before state is mutated)
    const oldRoundStatus = state.roundStatus;
    const oldResultCount = Object.keys(state.results).length;

    const hadR32 = JSON.stringify(state.r32Teams);
    applyLoadedState(saved);
    if (JSON.stringify(state.r32Teams) !== hadR32) rebuildGames();
    renderCurrentView();

    // Fire browser notifications on key changes
    if (saved.roundStatus === 'locked' && oldRoundStatus !== 'locked') {
      const cfg = ROUND_CONFIG.find(r => r.id === saved.currentRound);
      fireNotif('Picks Locked 🔒', `${cfg?.label || 'Round'} picks are locked — games in progress!`);
    }
    const newResultCount = Object.keys(saved.results || {}).length;
    if (newResultCount > oldResultCount) {
      const n = newResultCount - oldResultCount;
      fireNotif('Results In ⚽', `${n} new result${n !== 1 ? 's' : ''} entered — check the leaderboard!`);
    }
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
      ? { t1: sc.t1.score, t2: sc.t2.score, status: sc.status, statusDetail: sc.statusDetail, link: sc.link }
      : { t1: sc.t2.score, t2: sc.t1.score, status: sc.status, statusDetail: sc.statusDetail, link: sc.link };
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
