/* ============================================================
   WORLD CUP 2026 PICK-BY-ROUND POOL  (build 2026-06-11)
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
  ],
  groups: [
    { id: 'grp_most_goals',   label: 'Team with Most Goals in the Group Stage',           points: 5, type: 'select', options: '__ALL_TEAMS__' },
    { id: 'grp_conf_winrate', label: 'Confederation with Highest Win Rate',               points: 5, type: 'select', options: CONFEDERATIONS },
    { id: 'grp_margin',       label: 'Highest Winning Margin in Any Single Game (goals)', points: 4, type: 'select', options: ['1','2','3','4','5','6+'] },
  ],
  r32: [
    { id: 'r32_red_cards', label: 'Total Red Cards in R32',          points: 6, type: 'select', options: Array.from({length: 21}, (_, i) => String(i)) },
    { id: 'tw_pot1_exit',  label: 'First Pot 1 Team to be Eliminated', points: 6, type: 'select', options: '__POT1_TEAMS__' },
  ],
  r16: [
    { id: 'r16_goals', label: 'Total Goals in R16 (regulation + extra time)', points: 2.5, type: 'select', options: Array.from({length: 41}, (_, i) => String(i)), scoring: 'closest' },
    { id: 'r16_pks',   label: 'Number of R16 Matches Going to Penalties',     points: 2.5, type: 'select', options: Array.from({length: 9},  (_, i) => String(i)), scoring: 'closest' },
  ],
  qf: [
    { id: 'qf_motm_1',   label: 'Man of the Match — Morocco vs France',        points: 1, type: 'text' },
    { id: 'qf_motm_2',   label: 'Man of the Match — Norway vs England',         points: 1, type: 'text' },
    { id: 'qf_motm_3',   label: 'Man of the Match — Spain vs Belgium',          points: 1, type: 'text' },
    { id: 'qf_motm_4',   label: 'Man of the Match — Argentina vs Switzerland',  points: 1, type: 'text' },
    { id: 'qf_yellows',   label: 'Total Yellow Cards Across All QF Games',      points: 3, type: 'select', options: Array.from({length: 31}, (_, i) => String(i)), scoring: 'closest' },
    { id: 'qf_goal_diff', label: 'Total Goal Difference Across All QF Games',   points: 3, type: 'select', options: Array.from({length: 21}, (_, i) => String(i)), scoring: 'closest' },
    { id: 'qf_teams',     label: 'Final Four — All Four Correct Picks',    points: 2, type: 'multi', count: 4, sourceRound: 'qf' },
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

// FIFA 2026 bracket: SF1 = QF1(A) winner vs QF2(C) winner | SF2 = QF3(B) winner vs QF4(D) winner
const SF_PAIRINGS = [
  ['A', 'C'],
  ['B', 'D'],
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
  'Cole':                 ['ca', 'gb-eng'],
  'Commish':              ['us', 'de', 'gb-eng'],
  'Dennis':               ['de'],
  'Diego':                ['es', 'ar'],
  'Francisco':            ['es', 'ar'],
  'Jeremy':               ['us'],
  'Jose':                 ['pt'],
  'Josh':                 ['us'],
  'Late Night Lang':      ['gb-eng'],
  'Lorenz':               ['de'],
  'Matthias':             ['at'],
  'Mike Jones':           ['gb-eng'],
  'Pataky':               ['us'],
  'Puschel':              ['de'],
  'Rafa':                 ['es'],
  'Ricky':                ['pt'],
  'Santiago':             ['co'],
  "Sean 'Diddler' Combs": ['gb-eng', 'nz'],
  'Callum':               ['gb-eng'],
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
  'Dennis':              'Dennis.png',
  'Pataky':              'Pataky.png',
  'Puschel':             'Puschel.png',
  'Francisco':           'Francisco.png',
  "Sean 'Diddler' Combs":'Sean.png',
  'Callum':              'Callum.png',
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
  bracketSubView: 'knockout',
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
  liveStats:      null,
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

  // R32: 4 games per quadrant. Uses saved r32Teams if set; otherwise auto-computes from group
  // standings when all 12 groups are complete; otherwise TBD.
  const hasR32Teams = state.r32Teams && !Array.isArray(state.r32Teams) && state.r32Teams['A'];
  const allGroupsDone = state.games && GROUP_LETTERS.every(grp =>
    GROUP_PAIRS.every((_, idx) => state.results[gameId('groups', grp, idx)])
  );
  const r32Source = hasR32Teams ? state.r32Teams : (allGroupsDone ? buildR32FromGroups() : null);
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

  // FIFA 2026 bracket correction: R16 games 1 & 2 cross pool regions A ↔ B
  // R16-1: r32-a-0 winner (Canada) vs r32-b-0 winner (Morocco)   — July 4
  // R16-2: r32-a-1 winner (Paraguay) vs r32-b-1 winner (France)  — July 4
  // This cascades into QF-A (pairs R16-1 & R16-2) and QF-B (pairs R16-3 & R16-4)
  games['r16-a-0'].p2 = 'r32-b-0';
  games['r16-b-0'].p1 = 'r32-a-1';
  games['qf-a-0'].p2  = 'r16-b-0';
  games['qf-b-0'].p1  = 'r16-a-1';

  // FIFA 2026 bracket correction: R16 Quadrant D cross-pairings (slots 0v3, 1v2)
  // R16-7: r32-d-0 winner (Egypt) vs r32-d-3 winner (Argentina)  — July 7
  // R16-8: r32-d-1 winner (Colombia) vs r32-d-2 winner (Switzerland) — July 7
  games['r16-d-0'].p2 = 'r32-d-3';
  games['r16-d-1'].p1 = 'r32-d-1';
  games['r16-d-1'].p2 = 'r32-d-2';

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
// Underdogs earn: cfg.pts + (dogSeed - favSeed) * cfg.pts  [multiplier = base pts for the round]
// Draws earn:     cfg.pts + (pot differential / 2) * cfg.multiplier  [unchanged]
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
    return cfg.pts + (dog.seed - fav.seed) * cfg.pts;
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
  // Group stage is round-robin: every team plays all 3 games regardless of prior results
  if (roundId === 'groups') return true;
  // For knockout picks, only losing a knockout game eliminates a team.
  // A group-stage loss doesn't prevent a team from qualifying and appearing in R32+.
  for (const gid of Object.keys(state.results)) {
    const g = state.games[gid];
    if (!g || g.round === 'groups') continue;
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
    if (b.scoring === 'closest') {
      const correct = parseFloat(correctAns);
      if (isNaN(correct)) return;
      const myVal = parseFloat(playerAns);
      if (isNaN(myVal)) return;
      const allDists = state.players.map(p => {
        const ans = (state.bonusPicks[p.id] || {})[b.id];
        if (!ans) return null;
        const v = parseFloat(ans);
        return isNaN(v) ? null : Math.abs(v - correct);
      }).filter(d => d !== null);
      if (!allDists.length) return;
      if (Math.abs(myVal - correct) === Math.min(...allDists)) score += b.points;
    } else if (b.type === 'multi') {
      if (!Array.isArray(playerAns) || !Array.isArray(correctAns)) return;
      const normP = playerAns.map(s => s.trim().toLowerCase()).filter(Boolean).sort();
      const normC = correctAns.map(s => s.trim().toLowerCase()).filter(Boolean).sort();
      if (normP.length === normC.length && normP.every((v, i) => v === normC[i])) score += b.points;
    } else {
      const ans = playerAns.trim().toLowerCase();
      const correct = Array.isArray(correctAns)
        ? correctAns.map(s => s.trim().toLowerCase()).includes(ans)
        : ans === correctAns.trim().toLowerCase();
      if (correct) score += b.points;
    }
  });
  return score;
}

function getPlayerBonusDetails(playerId, roundId) {
  const bonuses = getBonusList(roundId);
  return bonuses.map(b => {
    const playerAns  = (state.bonusPicks[playerId] || {})[b.id];
    const correctAns = state.bonusAnswers[b.id];
    let status = 'pending', earned = 0, closestInfo = null;
    if (playerAns && correctAns) {
      let isCorrect = false;
      if (b.scoring === 'closest') {
        const correct = parseFloat(correctAns);
        if (!isNaN(correct)) {
          const myVal = parseFloat(playerAns);
          if (!isNaN(myVal)) {
            const allDists = state.players.map(p => {
              const ans = (state.bonusPicks[p.id] || {})[b.id];
              if (!ans) return null;
              const v = parseFloat(ans);
              return isNaN(v) ? null : Math.abs(v - correct);
            }).filter(d => d !== null);
            const minDist = allDists.length ? Math.min(...allDists) : Infinity;
            const myDist = Math.abs(myVal - correct);
            isCorrect = myDist === minDist;
            closestInfo = { myDist, minDist, correct };
          }
        }
      } else if (b.type === 'multi') {
        if (Array.isArray(playerAns) && Array.isArray(correctAns)) {
          const np = playerAns.map(s => s.trim().toLowerCase()).filter(Boolean).sort();
          const nc = correctAns.map(s => s.trim().toLowerCase()).filter(Boolean).sort();
          isCorrect = np.length === nc.length && np.every((v, i) => v === nc[i]);
        }
      } else {
        const ans = playerAns.trim().toLowerCase();
        isCorrect = Array.isArray(correctAns)
          ? correctAns.map(s => s.trim().toLowerCase()).includes(ans)
          : ans === correctAns.trim().toLowerCase();
      }
      status = isCorrect ? 'correct' : 'wrong';
      earned = isCorrect ? b.points : 0;
    }
    return { ...b, playerAns, correctAns, status, earned, closestInfo };
  });
}

// ── PERSISTENCE ───────────────────────────────────────────────

function saveState(extra = {}) {
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
    ...extra,
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
  if (saved.currentRound) {
    const wasFollowingCurrent = state.activePicksRound === state.currentRound;
    state.currentRound = saved.currentRound;
    // Only sync activePicksRound to the new currentRound if the user hasn't navigated
    // to a specific past/future round tab (i.e., they were tracking the current round)
    if (wasFollowingCurrent) state.activePicksRound = saved.currentRound;
  }
  if (saved.roundStatus)      state.roundStatus  = saved.roundStatus;
  if (saved.rulesText !== undefined) state.rulesText = saved.rulesText;
  if (saved.bonusPicks)   state.bonusPicks   = saved.bonusPicks;
  if (saved.bonusAnswers) state.bonusAnswers = saved.bonusAnswers;
  if (saved.playerPins)   state.playerPins   = saved.playerPins;
  // Only restore r32Teams if it uses the correct region-keyed format {A:[...], B:[...], ...}
  if (saved.r32Teams && !Array.isArray(saved.r32Teams) && saved.r32Teams['A'])
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
let _autoSaveTimer        = null;
let notifPermission       = 'default';
let dismissedBroadcastId  = null;
let deferredInstallPrompt = null;
function showPickersPopup(anchor, names) {
  const popup = document.getElementById('pick-pickers-popup');
  if (!popup) return;
  const count = names.length;
  const nameRows = count > 0 ? names.map(n => `<span class="pop-name">${esc(n)}</span>`).join('') : '<span class="pop-empty">—</span>';
  popup.innerHTML = `<div class="pop-hdr">${count > 0 ? count + ' picker' + (count !== 1 ? 's' : '') : 'No picks'}</div>${nameRows}`;
  popup.style.left = '0'; popup.style.top = '0'; popup.style.display = 'block';
  const rect = anchor.getBoundingClientRect();
  const pw = popup.offsetWidth;
  const ph = popup.offsetHeight;
  let left = rect.left;
  let top  = rect.bottom + 6;
  if (left + pw > window.innerWidth  - 8) left = window.innerWidth  - pw - 8;
  if (top  + ph > window.innerHeight - 8) top  = rect.top - ph - 6;
  popup.style.left = Math.max(8, left) + 'px';
  popup.style.top  = Math.max(8, top)  + 'px';
}

function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}

// ── VIEW SWITCHING ────────────────────────────────────────────

function syncHeaderHeight() {
  const h = document.querySelector('.header').offsetHeight;
  document.documentElement.style.setProperty('--header-h', h + 'px');
}

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
  syncHeaderHeight();
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
    case 'picks':       if (state.currentView !== 'picks') state.activePicksRound = state.currentRound; renderPicks(); break;
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
  if (ri === ci) return state.roundStatus === 'locked' || state.roundStatus === 'closed';
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
  r32:    'Jun 28 – Jul 4',
  r16:    'Jul 4–7',
  qf:     'Jul 9–12',
  sf:     'Jul 14–15',
  third:  'Jul 18',
  final:  'Jul 19',
};

const QUADRANT_NAMES = { A: 'Quadrant A', B: 'Quadrant B', C: 'Quadrant C', D: 'Quadrant D' };

function renderBracket() {
  const wrapper = document.getElementById('bracket-wrapper');
  wrapper.innerHTML = '';
  renderBonusTracker();

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

  // Left column: cross-paired A↔B blocks, rounds L→R
  // Top block (QF-A feeders): r32-a-0,b-0,a-1,b-1 → r16-a-0,b-0 → qf-a-0
  // Bot block (QF-B feeders): r32-a-2,a-3,b-2,b-3 → r16-a-1,b-1 → qf-b-0
  const leftCol = document.createElement('div');
  leftCol.className = 'bracket-left-col';
  leftCol.appendChild(buildCrossRegionBlock('top', true));
  leftCol.appendChild(buildCrossRegionBlock('bottom', false));

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

function buildCrossRegionBlock(half, showHeader = true) {
  // FIFA 2026 A↔B cross-pairings: group by which QF game the teams feed into
  const isTop  = half === 'top';
  // top: a-0+b-0 feed r16-a-0; a-1+b-1 feed r16-b-0 → qf-a-0
  // bot: a-2+a-3 feed r16-a-1; b-2+b-3 feed r16-b-1 → qf-b-0
  const r32Ids = isTop
    ? ['r32-a-0', 'r32-b-0', 'r32-a-1', 'r32-b-1']
    : ['r32-a-2', 'r32-a-3', 'r32-b-2', 'r32-b-3'];
  const r16Ids = isTop ? ['r16-a-0', 'r16-b-0'] : ['r16-a-1', 'r16-b-1'];
  const qfId   = isTop ? 'qf-a-0' : 'qf-b-0';
  const label  = isTop ? QUADRANT_NAMES['A'] : QUADRANT_NAMES['B'];

  const block = document.createElement('div');
  block.className = 'region-block';

  if (showHeader) {
    const hdrRow = document.createElement('div');
    hdrRow.className = 'bracket-hdr-row';
    ['r32', 'r16', 'qf'].forEach(roundId => {
      const cell = document.createElement('div');
      cell.className = 'bracket-hdr-cell';
      cell.innerHTML = `<strong>${ROUND_LABELS[roundId]}</strong>`;
      hdrRow.appendChild(cell);
    });
    block.appendChild(hdrRow);
  }

  const lbl = document.createElement('div');
  lbl.className = 'region-label';
  lbl.textContent = label;
  block.appendChild(lbl);

  const roundsRow = document.createElement('div');
  roundsRow.className = 'region-rounds';

  // R32 column — gap within each pair (positions 0 and 2 start each pair)
  const r32Col = document.createElement('div');
  r32Col.className = 'round-col round-r32';
  r32Ids.forEach((id, pos) => {
    const game = state.games[id];
    if (!game) return;
    const wrap = document.createElement('div');
    wrap.className = 'matchup-wrap';
    wrap.appendChild(buildMatchup(game));
    r32Col.appendChild(wrap);
    if (pos % 2 === 0) {
      const gap = document.createElement('div');
      gap.className = 'r32-pair-gap';
      r32Col.appendChild(gap);
    }
  });

  // R16 column
  const r16Col = document.createElement('div');
  r16Col.className = 'round-col round-r16';
  r16Ids.forEach(id => {
    const game = state.games[id];
    if (!game) return;
    const wrap = document.createElement('div');
    wrap.className = 'matchup-wrap';
    wrap.appendChild(buildMatchup(game));
    r16Col.appendChild(wrap);
  });

  // QF column
  const qfCol = document.createElement('div');
  qfCol.className = 'round-col round-qf';
  const qfGame = state.games[qfId];
  if (qfGame) {
    const wrap = document.createElement('div');
    wrap.className = 'matchup-wrap';
    wrap.appendChild(buildMatchup(qfGame));
    qfCol.appendChild(wrap);
  }

  roundsRow.appendChild(r32Col);
  roundsRow.appendChild(r16Col);
  roundsRow.appendChild(qfCol);
  block.appendChild(roundsRow);

  return block;
}

function buildRegionBlock(region, side, showHeader = true) {
  const rounds = side === 'right' ? ['qf', 'r16', 'r32'] : ['r32', 'r16', 'qf'];

  const block = document.createElement('div');
  block.className = 'region-block';

  if (showHeader) {
    const hdrRow = document.createElement('div');
    hdrRow.className = 'bracket-hdr-row';
    rounds.forEach(roundId => {
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
  rounds.forEach(roundId => {
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
  const isPre  = !sc && !isLive && liveSc?.status === 'pre' && liveSc?.scheduledDate;
  if (isLive) {
    const badge = liveSc.link ? document.createElement('a') : document.createElement('div');
    if (liveSc.link) { badge.href = liveSc.link; badge.target = '_blank'; badge.rel = 'noopener noreferrer'; }
    badge.className = 'live-badge';
    badge.textContent = liveSc.statusDetail || 'LIVE';
    card.appendChild(badge);
  } else if (isPre) {
    const d = new Date(liveSc.scheduledDate);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const kickoff = document.createElement('div');
    kickoff.className = 'game-kickoff';
    kickoff.textContent = `${dateStr} · ${timeStr}`;
    card.appendChild(kickoff);
  }
  const isPens = sc?.pens;
  const pks = sc?.pks;
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
      const rawVal = displaySc != null ? (idx === 0 ? displaySc.t1 : displaySc.t2) : null;
      const scoreNum = rawVal == null ? '' : (typeof rawVal === 'object' ? rawVal.score : rawVal);
      const pensBadge = isPens && isWinner ? `<span class="pens-badge">P</span>` : '';
      const goals = rawVal != null ? `<span class="t-score${isLive ? ' live' : ''}">${scoreNum}</span>` : '';
      row.innerHTML = `<span class="t-seed">${team.seed}</span><span class="t-name">${flag(team.name)}${esc(team.name)}</span>${goals}${pensBadge}`;
    }
    card.appendChild(row);
  });

  if (isPens && pks) {
    const pksNote = document.createElement('div');
    pksNote.className = 'matchup-pks-note';
    pksNote.textContent = `(${pks.t1}–${pks.t2} pens)`;
    card.appendChild(pksNote);
  }

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
Teams are seeded by FIFA Draw Pot (Pot 1 = strongest, Pot 4 = weakest). If you pick a higher-pot team to beat a lower-pot team, you earn base points plus an upset bonus. The upset multiplier equals the base points for that round — so upsets become proportionally more rewarding as the tournament progresses:

  Total = Base pts + (Underdog pot − Favourite pot) × Base pts
        = Base pts × (1 + Pot differential)

If there is no pot differential (equal-pot teams, or favourite wins), you earn base points only.

Examples:
  Pot 4 beats Pot 2 in the Round of 32  → 2 + (2 × 2)   = 6 pts
  Pot 4 beats Pot 1 in the Round of 32  → 2 + (3 × 2)   = 8 pts
  Pot 4 beats Pot 1 in the Round of 16  → 3 + (3 × 3)   = 12 pts
  Pot 4 beats Pot 1 in the Quarterfinals → 5 + (3 × 5)  = 20 pts
  Pot 4 beats Pot 1 in the Semifinals   → 8 + (3 × 8)   = 32 pts
  Pot 4 beats Pot 1 in the Final        → 15 + (3 × 15) = 60 pts

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
  · Total Goals in R16 (regulation + extra time) — 2.5 pts
  · R16 Matches Going to Penalties — 2.5 pts

Quarterfinals
  · Man of the Match for each QF game — 1 pt each (4 pts total)
  · Total Yellow Cards Across All QF Games (closest score wins) — 3 pts
  · Total Goal Difference Across All QF Games (closest score wins) — 3 pts
  · Final Four — All Four Correct Semi-Finalist Picks — 2 pts

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
      lockDiv.innerHTML = `&#128274; <strong>${esc(viewName)}</strong>'s picks are hidden until the round is locked.`;
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
      const pickedCount = (isOpen
        ? groupGamesAll.filter(g => state.pendingPicks[getPickKey(g)])
        : groupGamesAll.filter(g => savedPicks[getPickKey(g)])).length;
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
          res.innerHTML = b.scoring === 'closest'
            ? `&#10004; Closest! +${detail.earned} pts &mdash; answer was ${detail.correctAns}`
            : `&#10004; Correct! +${detail.earned} pts`;
        } else {
          if (b.scoring === 'closest' && detail.closestInfo) {
            const { myDist, minDist, correct } = detail.closestInfo;
            res.innerHTML = `&#10008; Off by ${myDist} &mdash; answer: ${correct}, closest was ${minDist} away`;
          } else {
            const correctDisplay = Array.isArray(detail.correctAns)
              ? detail.correctAns.join(', ') : detail.correctAns;
            res.innerHTML = `&#10008; Incorrect &mdash; Answer: ${esc(correctDisplay)}`;
          }
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
  card.className = 'pick-card' + (state.results[game.id] !== undefined ? ' pick-card--played' : '');

  // Strip "Group X: " prefix for group stage cards (already shown in section header)
  const rawLabel = game.label || (game.region ? `Quadrant ${game.region}` : '');
  const regionLabel = game.round === 'groups' ? rawLabel.replace(/^Group [A-L]: /i, '') : rawLabel;
  const sc = state.scores[game.id];
  const liveSc = findGameScore(t1?.name, t2?.name);
  const isLive = !sc && liveSc && liveSc.status === 'in';
  const isPost = !sc && liveSc && liveSc.status === 'post' && liveSc.t1 != null;
  const isPre  = !sc && !isLive && !isPost && liveSc?.status === 'pre' && liveSc?.scheduledDate;
  // Only show score when there are actual values (not null pre-game placeholders)
  const scoreHtml = sc !== undefined
    ? `<span class="pick-card-score">${sc.t1}–${sc.t2}</span>`
    : isLive && liveSc.t1 != null
      ? `<span class="pick-card-score live">${liveSc.t1}–${liveSc.t2}</span>`
      : isPost
        ? `<span class="pick-card-score">${liveSc.t1}–${liveSc.t2}</span>`
        : '';
  const liveBadgeHtml = isLive
    ? (liveSc.link
        ? `<a href="${esc(liveSc.link)}" target="_blank" rel="noopener noreferrer" class="live-badge-inline">${esc(liveSc.statusDetail || 'LIVE')}</a>`
        : `<span class="live-badge-inline">${esc(liveSc.statusDetail || 'LIVE')}</span>`)
    : '';
  let kickoffHtml = '';
  if (isPre) {
    const d = new Date(liveSc.scheduledDate);
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    kickoffHtml = `<span class="pick-card-kickoff">${dateStr} · ${timeStr}</span>`;
  }
  const hdr = document.createElement('div');
  hdr.className = 'pick-card-hdr';
  hdr.innerHTML = `<span class="pick-card-hdr-label">${esc(regionLabel)}</span>
    ${kickoffHtml}${liveBadgeHtml}
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

  // Show pick popularity for past/locked rounds, and always for admin
  const popData = ((!isOpen || isAdmin()) && state.players.length > 1) ? getPickPopularity(game, game.round) : null;

  options.forEach(({ team, isDraw }) => {
    const optionName = isDraw ? 'Draw' : team?.name;
    if (!team && !isDraw) return;

    const isPicked     = isOpen
      ? state.pendingPicks[getPickKey(game)] === optionName
      : savedPick === optionName;
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
    const ptsTxt = Number.isInteger(optPts) ? `${optPts}p` : `${optPts}p`;

    const teamGoal = !isDraw
      ? (sc !== undefined
          ? String(team === t1 ? sc.t1 : sc.t2)
          : (isLive || isPost) && liveSc?.t1 != null
            ? String(team === t1 ? liveSc.t1 : liveSc.t2)
            : '')
      : '';
    const pksVal = !isDraw && sc?.pens && sc?.pks
      ? (team === t1 ? sc.pks.t1 : sc.pks.t2) : null;
    // Always emit score + pks spans for non-draw options so grid columns stay consistent
    const scoreSpan = !isDraw
      ? `<span class="pick-o-score${isLive && !sc ? ' live' : ''}">${teamGoal}</span>` : '';
    const pksSpan = !isDraw
      ? `<span class="pick-o-pks">${pksVal !== null ? `(${pksVal})` : ''}</span>` : '';

    // Only emit result span when there is actual content (saves ~52px when no result yet)
    const resultSpan = resultMark;

    // Popularity bar (shown when round is locked/closed)
    let popHtml = '';
    if (popData && popData.total > 0) {
      const cnt = popData.counts[optionName] || 0;
      const pct = Math.round((cnt / popData.total) * 100);
      const pickerNames = state.players
        .filter(p => (state.picks[p.id] || {})[game.round]?.[getPickKey(game)] === optionName)
        .map(p => p.name).join('||');
      popHtml = `<span class="pick-o-pop" data-pickers="${esc(pickerNames)}" title="${cnt}/${popData.total}" role="button" tabindex="0"><span class="pick-pop-track"><span class="pick-pop-fill" style="width:${pct}%"></span></span><span class="pick-pop-txt">${cnt}/${popData.total}</span></span>`;
    }

    const yourPickBadge = (isPicked && !isOpen) ? '<span class="your-pick-badge">✓</span>' : '';
    if (isDraw) {
      row.innerHTML = `<span class="pick-o-seed"></span><span class="pick-o-name pick-draw-label">Draw${yourPickBadge}</span><span class="pick-o-pts">${ptsTxt}</span>${resultSpan}${popHtml}`;
    } else {
      row.innerHTML = `<span class="pick-o-seed">${team.seed}</span>${flag(team.name)}<span class="pick-o-name">${esc(team.name)}${yourPickBadge}</span>${scoreSpan}${pksSpan}<span class="pick-o-pts">${ptsTxt}</span>${resultSpan}${popHtml}`;
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
        scheduleAutoSave();
      });
    }
    card.appendChild(row);
  });

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

function scheduleAutoSave() {
  updateSaveStatus();
  const statusEl = document.getElementById('save-status');
  if (statusEl) statusEl.textContent += '  — saving…';
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(doAutoSave, 1200);
}

function doAutoSave() {
  _autoSaveTimer = null;
  const pid = state.currentPlayer;
  const rid = state.activePicksRound;
  if (!pid) return;
  if (!state.picks[pid]) state.picks[pid] = {};
  state.picks[pid][rid] = { ...state.pendingPicks };
  if (!state.bonusPicks[pid]) state.bonusPicks[pid] = {};
  const bonusForRound = {};
  Object.values(BONUS_CONFIG).forEach(bonuses => {
    bonuses.forEach(b => {
      if (b.type === 'multi' && (b.sourceRound || 'qf') === rid) {
        const srcGames = getGamesForRound(rid);
        state.bonusPicks[pid][b.id] = srcGames.map(g => (state.picks[pid][rid] || {})[getPickKey(g)] || '');
        bonusForRound[b.id] = state.bonusPicks[pid][b.id];
      }
    });
  });
  (BONUS_CONFIG[rid] || []).forEach(b => {
    if (b.type !== 'multi') {
      const val = (state.bonusPicks[pid] || {})[b.id];
      if (val !== undefined && val !== null && val !== '') bonusForRound[b.id] = val;
    }
  });
  if (!state.pickSavedAt)      state.pickSavedAt      = {};
  if (!state.pickSavedAt[pid]) state.pickSavedAt[pid] = {};
  state.pickSavedAt[pid][rid] = new Date().toISOString();
  fetch(`/api/picks/${pid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roundId: rid,
      picks: state.picks[pid][rid],
      bonusPicks: Object.keys(bonusForRound).length ? bonusForRound : undefined,
      _sender: pid,
    }),
  }).catch(() => showToast('Save failed — working offline', 'error'));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ picks: state.picks, bonusPicks: state.bonusPicks })); } catch (e) {}
  const statusEl = document.getElementById('save-status');
  if (statusEl) {
    updateSaveStatus();
    statusEl.textContent += '  ✓ Saved';
  }
}

function savePicks() {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = null;
  const pid = state.currentPlayer;
  const rid = state.activePicksRound;
  if (!pid) return;
  if (!state.picks[pid]) state.picks[pid] = {};
  state.picks[pid][rid] = { ...state.pendingPicks };
  // Re-sync any multi-bonus whose sourceRound is this round
  if (!state.bonusPicks[pid]) state.bonusPicks[pid] = {};
  const bonusForRound = {};
  Object.values(BONUS_CONFIG).forEach(bonuses => {
    bonuses.forEach(b => {
      if (b.type === 'multi' && (b.sourceRound || 'qf') === rid) {
        const srcGames = getGamesForRound(rid);
        state.bonusPicks[pid][b.id] = srcGames.map(g => (state.picks[pid][rid] || {})[getPickKey(g)] || '');
        bonusForRound[b.id] = state.bonusPicks[pid][b.id];
      }
    });
  });
  (BONUS_CONFIG[rid] || []).forEach(b => {
    if (b.type !== 'multi') {
      const val = (state.bonusPicks[pid] || {})[b.id];
      if (val !== undefined && val !== null && val !== '') bonusForRound[b.id] = val;
    }
  });
  if (!state.pickSavedAt)       state.pickSavedAt       = {};
  if (!state.pickSavedAt[pid])  state.pickSavedAt[pid]  = {};
  state.pickSavedAt[pid][rid] = new Date().toISOString();
  fetch(`/api/picks/${pid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roundId: rid,
      picks: state.picks[pid][rid],
      bonusPicks: Object.keys(bonusForRound).length ? bonusForRound : undefined,
      _sender: pid,
    }),
  }).catch(() => showToast('Save failed — working offline', 'error'));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ picks: state.picks, bonusPicks: state.bonusPicks })); } catch (e) {}
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

  // Pussy Meter: % of group picks where picked team's seed > opponent's seed (true upsets)
  const pmSeedOf = {};
  Object.values(GROUP_TEAMS).forEach(ts => ts.forEach(t => { pmSeedOf[t.name] = t.seed; }));
  const pmPct = {};
  rows.forEach(row => {
    const grpPicks = (state.picks?.[row.player.id] || {}).groups || {};
    let tot = 0, up = 0;
    Object.entries(grpPicks).forEach(([key, v]) => {
      if (!v || v === 'Draw') return;
      tot++;
      const parts = key.split('|');
      if (parts.length !== 2) return;
      const oppName = parts[0] === v ? parts[1] : parts[0];
      const pSeed = pmSeedOf[v], oSeed = pmSeedOf[oppName];
      if (pSeed != null && oSeed != null && pSeed > oSeed) up++;
    });
    pmPct[row.player.id] = tot ? up / tot : null;
  });
  const pmVals = Object.values(pmPct).filter(v => v !== null);
  const pmMin = pmVals.length ? Math.min(...pmVals) : 0;
  const pmMax = pmVals.length ? Math.max(...pmVals) : 1;
  const dildoPid = pmVals.length
    ? rows.find(r => pmPct[r.player.id] !== null && pmPct[r.player.id] === pmMin)?.player.id
    : null;

  const table = document.createElement('table');
  table.className = 'lb-table';

  const thead = document.createElement('thead');
  let thHTML = '<tr><th>#</th><th>Player</th>';
  if (state.lbRound === 'all') {
    thHTML += '<th>Score</th><th style="text-align:center">Total Possible</th><th class="num lb-pm-th" title="% of group picks on Pot 3/4 (upset) teams">Pussy Meter<span class="lb-pm-sub">(upset pick %)</span></th><th class="num lb-best-th" title="Best possible finish rank">Best</th>';
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
    const linkLocked = !isOwnRow && !picksVisible;
    const lockTag    = linkLocked ? ' <span class="lb-lock-icon">&#128274;</span>' : '';
    const btnClass   = linkLocked ? 'lb-player-link picks-locked' : 'lb-player-link';
    const btnTitle   = linkLocked ? ' title="Picks revealed when the round is locked"' : '';

    const avatar   = playerAvatarHtml(row.player.name, 64);
    const canH2H   = !isMe && picksVisible && !linkLocked;
    const h2hBtnHtml = canH2H
      ? `<button class="lb-h2h-btn" data-h2hpid="${row.player.id}" title="Head-to-head vs ${esc(row.player.name)}">⚔</button>`
      : '';
    const natFlags = playerFlagsHtml(row.player.name);
    const dildoHtml = row.player.id === dildoPid
      ? '<img src="Dildo.png" style="height:65px;margin-left:6px;vertical-align:middle;opacity:0.95" alt="">'
      : '';
    let tdHTML = `<td class="rank-num ${rankCls}">${rankIcon}</td>
      <td><div class="lb-player-cell">${avatar}<button class="${btnClass}" data-pid="${row.player.id}"${btnTitle}>${esc(row.player.name)}${lockTag}</button>${natFlags}${h2hBtnHtml}${dildoHtml}</div></td>`;

    if (state.lbRound === 'all') {
      const maxPossible = row.total.total + row.total.possible;
      const maxScore = ROUND_CONFIG.reduce((sum, cfg) => sum + cfg.pts * getGamesForRound(cfg.id).length, 0);
      const pctW = Math.min(100, Math.round((row.total.total / maxScore) * 100));
      const wl = row.total.correct || row.total.wrong
        ? `<span class="lb-wl"><span class="lb-w">${row.total.correct}✔</span> <span class="lb-l">${row.total.wrong}✘</span></span>`
        : '';
      const bestRank    = getBestPossibleRank(row.player.id, rows);
      const bRankIcon   = bestRank <= 3 ? ['🥇','🥈','🥉'][bestRank - 1] : `#${bestRank}`;
      const totalBonusSuffix = row.total.totalBonus > 0
        ? `<span class="lb-bonus">(+${row.total.totalBonus} bonus)</span>` : '';
      tdHTML += `<td><span class="lb-total">${fmtScore(row.total.total)}</span>${totalBonusSuffix}${wl}
          <div class="pct-bar-wrap"><div class="pct-bar" style="width:${pctW}%"></div></div></td>
        <td class="lb-possible">${fmtScore(maxPossible)}</td>
        ${(() => {
          const p = pmPct[row.player.id];
          if (p === null) return '<td class="num lb-pm">—</td>';
          const norm = pmMax > pmMin ? (p - pmMin) / (pmMax - pmMin) : 0.5;
          const hue  = Math.round(norm * 120);
          return `<td class="num lb-pm"><div style="background:hsl(${hue},65%,18%);color:hsl(${hue},90%,75%);font-weight:600;height:100%;display:flex;align-items:center;justify-content:center;padding:10px 0">${Math.round(p * 100)}%</div></td>`;
        })()}
        <td class="num lb-best-finish" title="Best possible finish if all remaining picks win">${bRankIcon}</td>`;
      ROUND_CONFIG.forEach(cfg => {
        const s = row.byRound[cfg.id];
        const isBest = roundBest[cfg.id] && s.score === roundBest[cfg.id];
        const wlTip = s.correct || s.wrong ? ` title="${s.correct}✔ ${s.wrong}✘"` : '';
        const bonusSuffix = s.bonusPts > 0 ? `<span class="lb-bonus">(+${s.bonusPts})</span>` : '';
        tdHTML += `<td class="lb-round-score num ${s.score === 0 && !s.correct && !s.wrong ? 'zero' : ''}${isBest ? ' round-best' : ''}"${wlTip}>${fmtScore(s.score)}${bonusSuffix}</td>`;
      });
    } else {
      const s = row.byRound[state.lbRound];
      const isBest = roundBest[state.lbRound] && s.score === roundBest[state.lbRound];
      const wl = s.correct || s.wrong
        ? `<div class="lb-wl-row"><span class="lb-w">${s.correct} correct</span> <span class="lb-l">${s.wrong} wrong</span></div>`
        : '';
      const roundBonusSuffix = s.bonusPts > 0 ? `<span class="lb-bonus">(+${s.bonusPts})</span>` : '';
      tdHTML += `<td class="num${isBest ? ' round-best' : ''}"><span class="lb-total">${fmtScore(s.score)}</span>${roundBonusSuffix}${wl}</td>
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
      showToast('Picks are revealed once the Admin locks this round', 'info');
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

  // ── Bonus Race ────────────────────────────────────────────
  if (state.lbRound === 'all') renderBonusRace(body);
}

// ── PICKS AUTO-FIX ────────────────────────────────────────────

function fixInvalidPicks() {
  const pid = state.currentPlayer;
  if (!pid) return 0;
  let cleared = 0;
  if (!state.picks[pid]) state.picks[pid] = {};
  ROUND_CONFIG.forEach(cfg => {
    if (!state.picks[pid][cfg.id]) state.picks[pid][cfg.id] = {};
    getGamesForRound(cfg.id).forEach(g => {
      const { t1, t2 } = getTeams(g);
      if (!t1 || !t2) return;
      const key    = getPickKey(g);
      const stored = state.picks[pid][cfg.id][key];
      if (!stored) return; // no pick yet — nothing to clear
      const validPicks = cfg.id === 'groups'
        ? [t1.name, t2.name, 'Draw']
        : [t1.name, t2.name];
      if (!validPicks.includes(stored)) {
        delete state.picks[pid][cfg.id][key];
        cleared++;
      }
    });
  });
  if (cleared > 0) {
    showToast(`${cleared} of your picks were cleared because those teams are no longer in the bracket — please re-pick.`, 'error');
  }
  return cleared;
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
        if (Array.isArray(correctAns) ? correctAns.includes(optText) : correctAns === optText) o.selected = true;
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
// Implements the official FIFA World Cup 2026 R32 bracket structure exactly as published.
// R32 → R16 bracket pairings (slots [0,1] winner meets slots [2,3] winner in R16, etc.):
//   Quadrant A: (A2 vs B2) vs (E1 vs D3) | (C1 vs F2) vs (E2 vs I2)
//   Quadrant B: (F1 vs C2) vs (I1 vs F3) | (A1 vs E3) vs (L1 vs K3)
//   Quadrant C: (H1 vs J2) vs (K2 vs L2) | (G1 vs I3) vs (D1 vs B3)
//   Quadrant D: (D2 vs G2) vs (K1 vs L3) | (B1 vs J3) vs (J1 vs H2)
function buildR32FromGroups() {
  const gt = (grp, rank, fb) => {
    const e = getGroupStandings(grp)[rank];
    return e ? { name: e.team.name, seed: e.team.seed } : fb;
  };

  const cur = state.r32Teams || INITIAL_TEAMS;

  return {
    A: [
      gt('A', 1, cur.A[0]), gt('B', 1, cur.A[1]),  // A2 vs B2  (South Africa vs Canada)
      gt('E', 0, cur.A[2]), gt('D', 2, cur.A[3]),  // E1 vs D3  (Germany vs Paraguay)
      gt('C', 0, cur.A[4]), gt('F', 1, cur.A[5]),  // C1 vs F2  (Brazil vs Japan)
      gt('E', 1, cur.A[6]), gt('I', 1, cur.A[7]),  // E2 vs I2  (Ivory Coast vs Norway)
    ],
    B: [
      gt('F', 0, cur.B[0]), gt('C', 1, cur.B[1]),  // F1 vs C2  (Netherlands vs Morocco)
      gt('I', 0, cur.B[2]), gt('F', 2, cur.B[3]),  // I1 vs F3  (France vs Sweden)
      gt('A', 0, cur.B[4]), gt('E', 2, cur.B[5]),  // A1 vs E3  (Mexico vs Ecuador)
      gt('L', 0, cur.B[6]), gt('K', 2, cur.B[7]),  // L1 vs K3  (England vs DR Congo)
    ],
    C: [
      gt('H', 0, cur.C[0]), gt('J', 1, cur.C[1]),  // H1 vs J2  (Spain vs Austria)
      gt('K', 1, cur.C[2]), gt('L', 1, cur.C[3]),  // K2 vs L2  (Portugal vs Croatia)
      gt('G', 0, cur.C[4]), gt('I', 2, cur.C[5]),  // G1 vs I3  (Belgium vs Senegal)
      gt('D', 0, cur.C[6]), gt('B', 2, cur.C[7]),  // D1 vs B3  (USA vs Bosnia)
    ],
    D: [
      gt('D', 1, cur.D[0]), gt('G', 1, cur.D[1]),  // D2 vs G2  (Australia vs Egypt)
      gt('K', 0, cur.D[2]), gt('L', 2, cur.D[3]),  // K1 vs L3  (Colombia vs Ghana)
      gt('B', 0, cur.D[4]), gt('J', 2, cur.D[5]),  // B1 vs J3  (Switzerland vs Algeria)
      gt('J', 0, cur.D[6]), gt('H', 1, cur.D[7]),  // J1 vs H2  (Argentina vs Cape Verde)
    ],
  };
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
  fixInvalidPicks();
  saveState();
  showToast('R32 bracket saved!', 'success');
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
  fixInvalidPicks();
  saveState();
  showToast('R32 auto-filled from group standings!', 'success');
  renderR32Admin();
}

// ── RANDOM PICK GENERATOR ─────────────────────────────────────


// ── DEMO DATA ─────────────────────────────────────────────────

function loadDemoData() {
  // Build group stage results dynamically from GROUP_TEAMS so team names are always valid.
  // Lower-seeded (better pot) team wins; equal seeds → Draw.
  // Knockout uses real teams from the same GROUP_TEAMS pool.
  state.results = {};
  state.scores  = {};

  for (const [letter, teams] of Object.entries(GROUP_TEAMS)) {
    const grp = letter.toLowerCase();
    GROUP_PAIRS.forEach(([i, j], pairIdx) => {
      const t1 = teams[i], t2 = teams[j];
      const id = `groups-${grp}-${pairIdx}`;
      if (t1.seed < t2.seed) {
        state.results[id] = t1.name;
        state.scores[id]  = {t1:2, t2:0};
      } else if (t2.seed < t1.seed) {
        state.results[id] = t2.name;
        state.scores[id]  = {t1:0, t2:2};
      } else {
        state.results[id] = 'Draw';
        state.scores[id]  = {t1:1, t2:1};
      }
    });
  }

  // ── KNOCKOUT ──────────────────────────────────────────────
  // All team names verified against GROUP_TEAMS.
  // Narrative: Argentina beats Germany in the final.
  Object.assign(state.results, {
    // R32 — 16 games, 4 per quadrant
    'r32-a-0': 'France',      'r32-a-1': 'Argentina',
    'r32-a-2': 'Brazil',      'r32-a-3': 'Germany',
    'r32-b-0': 'England',     'r32-b-1': 'Netherlands',
    'r32-b-2': 'Spain',       'r32-b-3': 'Portugal',
    'r32-c-0': 'Mexico',      'r32-c-1': 'Colombia',
    'r32-c-2': 'Belgium',     'r32-c-3': 'Japan',
    'r32-d-0': 'Uruguay',     'r32-d-1': 'Croatia',
    'r32-d-2': 'Morocco',     'r32-d-3': 'Senegal',
    // R16
    'r16-a-0': 'Argentina',   'r16-a-1': 'Germany',
    'r16-b-0': 'England',     'r16-b-1': 'Portugal',
    'r16-c-0': 'Colombia',    'r16-c-1': 'Japan',
    'r16-d-0': 'Croatia',     'r16-d-1': 'Morocco',
    // QF
    'qf-a-0':  'Argentina',
    'qf-b-0':  'Germany',
    'qf-c-0':  'Japan',
    'qf-d-0':  'Morocco',
    // SF: Argentina beats Japan (upset), Germany beats Morocco
    'sf-0': 'Argentina',
    'sf-1': 'Germany',
    // Final: Argentina beats Germany
    'final-0': 'Argentina',
  });
  Object.assign(state.scores, {
    'r32-a-0': {t1:2,t2:0}, 'r32-a-1': {t1:2,t2:1}, 'r32-a-2': {t1:2,t2:0}, 'r32-a-3': {t1:2,t2:1},
    'r32-b-0': {t1:2,t2:1}, 'r32-b-1': {t1:2,t2:0}, 'r32-b-2': {t1:1,t2:0}, 'r32-b-3': {t1:2,t2:0},
    'r32-c-0': {t1:2,t2:1}, 'r32-c-1': {t1:0,t2:2}, 'r32-c-2': {t1:2,t2:0}, 'r32-c-3': {t1:1,t2:0},
    'r32-d-0': {t1:1,t2:0}, 'r32-d-1': {t1:2,t2:1}, 'r32-d-2': {t1:2,t2:0}, 'r32-d-3': {t1:1,t2:0},
    'r16-a-0': {t1:3,t2:1}, 'r16-a-1': {t1:0,t2:2}, 'r16-b-0': {t1:2,t2:0}, 'r16-b-1': {t1:0,t2:2},
    'r16-c-0': {t1:1,t2:2}, 'r16-c-1': {t1:0,t2:1}, 'r16-d-0': {t1:2,t2:1}, 'r16-d-1': {t1:0,t2:1},
    'qf-a-0':  {t1:2,t2:1}, 'qf-b-0':  {t1:2,t2:0}, 'qf-c-0':  {t1:2,t2:1}, 'qf-d-0':  {t1:2,t2:0},
    'sf-0':    {t1:2,t2:1}, 'sf-1':    {t1:2,t2:0},
    'final-0': {t1:3,t2:2},
  });

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

function bbToggleFullscreen(btn) {
  const card = btn.closest('.analytics-card');
  const isFs = card.classList.toggle('bb-fullscreen');
  btn.textContent = isFs ? '✕' : '⊞';

  if (isFs) {
    const bd = document.createElement('div');
    bd.id = 'bb-fs-backdrop';
    bd.className = 'bb-fs-backdrop';
    bd.onclick = () => bbToggleFullscreen(btn);
    document.body.appendChild(bd);
    document._bbFsEsc = e => { if (e.key === 'Escape') bbToggleFullscreen(btn); };
    document.addEventListener('keydown', document._bbFsEsc);
  } else {
    const bd = document.getElementById('bb-fs-backdrop');
    if (bd) bd.remove();
    if (document._bbFsEsc) {
      document.removeEventListener('keydown', document._bbFsEsc);
      delete document._bbFsEsc;
    }
  }

  setTimeout(() => {
    _analyticsCharts.forEach(ch => { if (card.contains(ch.canvas)) ch.resize(); });
  }, 50);
}

function renderAnalytics() {
  _analyticsCharts.forEach(c => c.destroy());
  _analyticsCharts = [];

  const body = document.getElementById('analytics-body');
  if (!body) return;
  body.innerHTML = '';

  const MONO = "'Consolas','Courier New',monospace";
  const BB   = '#FF6600';
  const BBC  = ['#FF6600','#00CFFF','#FFFF00','#00FF87','#FF3D6B','#CC44FF','#FF9933','#00FFCC','#FF6666','#66B3FF','#FFD700','#99FF99','#FF99FF','#FF8866','#88CCFF','#CCFF88','#FF88CC','#88FFCC','#CCFF00','#FF00CC'];
  const bbC  = i => BBC[i % BBC.length];

  Chart.defaults.color               = '#888';
  Chart.defaults.font.family         = MONO;
  Chart.defaults.font.size           = 9;
  Chart.defaults.animation           = false;
  Chart.defaults.maintainAspectRatio = false;

  // ── Live data helpers ─────────────────────────────────────────
  const allPlayers = state.players || [];

  // All 72 group stage games
  const allGames = [];
  for (const [letter, teams] of Object.entries(GROUP_TEAMS)) {
    for (const [i, j] of GROUP_PAIRS) {
      const t1 = teams[i], t2 = teams[j];
      allGames.push({ key: gameKey(t1.name, t2.name), t1, t2, group: letter });
    }
  }

  const gPicks = pid => (state.picks[pid] || {})['groups'] || {};

  function agreePct(p1id, p2id) {
    if (p1id === p2id) return 100;
    const a = gPicks(p1id), b = gPicks(p2id);
    let same = 0, total = 0;
    allGames.forEach(g => {
      const pa = a[g.key], pb = b[g.key];
      if (pa && pb) { total++; if (pa === pb) same++; }
    });
    return total ? Math.round(same / total * 100) : null;
  }

  // Upset pick count per player — sorted descending (riskiest first)
  const upsetRaw = allPlayers.map(p => {
    const picks = gPicks(p.id);
    return allGames.reduce((n, g) => {
      const picked = picks[g.key];
      if (!picked || picked === 'Draw') return n;
      const pt = picked === g.t1.name ? g.t1 : g.t2;
      const ot = picked === g.t1.name ? g.t2 : g.t1;
      return n + (pt.seed > ot.seed ? 1 : 0);
    }, 0);
  });
  const upsetOrder = allPlayers.map((_, i) => i).sort((a, b) => upsetRaw[b] - upsetRaw[a]);
  const upsetNames = upsetOrder.map(i => allPlayers[i].name);
  const upsetData  = upsetOrder.map(i => upsetRaw[i]);

  // Risk buckets (by seed of picked team) per player — sorted by Pot3+4 picks descending
  const riskRaw = allPlayers.map(p => {
    const picks = gPicks(p.id);
    const b = {1:0,2:0,3:0,4:0,D:0};
    allGames.forEach(g => {
      const picked = picks[g.key];
      if (!picked) return;
      if (picked === 'Draw') { b.D++; return; }
      const pt = picked === g.t1.name ? g.t1 : g.t2;
      b[pt.seed]++;
    });
    return b;
  });
  const riskPct = i => { const b = riskRaw[i]; const tot = b[1]+b[2]+b[3]+b[4]; return tot ? (b[3]+b[4])/tot : 0; };
  const riskOrder = allPlayers.map((_, i) => i).sort((a, b) => riskPct(b) - riskPct(a));
  const riskNames = riskOrder.map(i => allPlayers[i].name);
  const riskData  = riskOrder.map(i => riskRaw[i]);

  // Consensus: all games with picks, sorted by upcoming date (soonest first), played games last
  // allGames here is the analytics-local array (key/t1/t2/group only), so we look up
  // the real game object (which has id/idx/region) via getGamesForRound for result & date checks.
  const CG_MD_IDX  = [0, 0, 1, 1, 2, 2];
  const CG_MON     = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
  // Within-day kickoff order for groups sharing a date (0 = plays first, 1 = plays second).
  // Pairs: B/D, E/F, G/H, I/J, K/L. H before G confirmed by fixture schedule (Spain MD1).
  const CG_DAY_ORDER = { A:0, B:0, C:0, D:1, E:0, F:1, H:0, G:1, I:0, J:1, K:0, L:1 };
  const cgGameMap  = {};
  getGamesForRound('groups').forEach(g => { cgGameMap[getPickKey(g)] = g; });
  function cgDateNum(fullGame) {
    const ds = (MATCHDAY_DATES[fullGame.region] || [])[CG_MD_IDX[fullGame.idx]] || '';
    const [m, d] = ds.split(' ');
    return (CG_MON[m] || 99) * 100 + (parseInt(d, 10) || 99);
  }
  const consensusGames = allGames.map(g => {
    let forT1 = 0, total = 0;
    allPlayers.forEach(p => {
      const pick = gPicks(p.id)[g.key];
      if (pick) { total++; if (pick === g.t1.name) forT1++; }
    });
    if (!total) return null;
    const pct      = Math.round(forT1 / total * 100);
    const lbl      = `${g.t1.name} vs ${g.t2.name}`;
    const fullGame = cgGameMap[g.key];
    const hasResult = fullGame ? state.results[fullGame.id] !== undefined : false;
    const dateNum   = fullGame ? cgDateNum(fullGame) : 99999;
    const group     = fullGame ? fullGame.region : 'Z';
    const dayOrder  = CG_DAY_ORDER[group] ?? 0;
    return { lbl, pct1: pct, pct2: 100 - pct, hasResult, dateNum, group, dayOrder, t1name: g.t1.name, t2name: g.t2.name };
  }).filter(Boolean).sort((a, b) => {
    if (a.hasResult !== b.hasResult) return a.hasResult ? 1 : -1;   // upcoming first, played last
    if (a.dateNum !== b.dateNum) return a.dateNum - b.dateNum;      // earlier date first
    if (a.dayOrder !== b.dayOrder) return a.dayOrder - b.dayOrder;  // within same date: actual kickoff order
    return a.group < b.group ? -1 : a.group > b.group ? 1 : 0;     // tiebreak by group letter
  });

  // Short names for agreement matrix
  const shortName = n => n.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();

  // ── Shared chart config ───────────────────────────────────────
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
  const leg = pos => ({ position: pos || 'bottom', labels: { color: '#888', font: { family: MONO, size: 8 }, boxWidth: 8, boxHeight: 8, padding: 10 } });

  // ── Page header ───────────────────────────────────────────────
  const hdr = document.createElement('div');
  hdr.className = 'bb-page-header';
  hdr.innerHTML = `<span class="bb-page-title">ANALYTICS</span>` +
    `<span class="bb-page-sub">WORLD CUP POOL 2026 &diams; ${allPlayers.length} PLAYERS &diams; GROUP STAGE PICKS</span>` +
    `<span class="bb-page-num">PG 1/1</span>`;
  body.appendChild(hdr);

  const grid = document.createElement('div');
  grid.className = 'analytics-grid';
  body.appendChild(grid);

  function addCard(id, title, desc, wide, height) {
    const card = document.createElement('div');
    card.className = 'analytics-card' + (wide ? ' analytics-card-wide' : '');
    const hStyle = height ? ` style="height:${height}px"` : '';
    card.innerHTML =
      `<div class="bb-card-header"><span class="analytics-card-title">${title}</span><button class="bb-fs-btn" onclick="bbToggleFullscreen(this)" title="Fullscreen">⊞</button></div>` +
      `<p class="analytics-card-desc">${desc}</p>` +
      `<div class="analytics-chart-wrap" id="wrap-${id}"${hStyle}><canvas id="${id}"></canvas></div>`;
    grid.appendChild(card);
  }

  function mkChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    _analyticsCharts.push(new Chart(canvas, config));
  }

  const names = allPlayers.map(p => p.name);
  const mdays = ['MD1','MD2','MD3','R32','R16','QF','SF','FINAL'];

  const n     = allPlayers.length;
  const hBar  = Math.max(320, n * 34);        // horizontal bar (y-axis = player names)
  const hVBar = Math.max(320, n * 26 + 100);  // vertical bar  (x-axis = player names)
  const hMtx  = Math.max(300, n * 30 + 60);   // agreement matrix table
  const rotX  = { color: '#777', font: { family: MONO, size: 9 }, maxRotation: 45, minRotation: 45 };

  // 1 ── Upset Index (LIVE) — sorted riskiest first
  addCard('ch-upset', 'UPSET INDEX', 'Group stage underdog picks per player — higher = bolder strategy', false, hBar);
  mkChart('ch-upset', {
    type: 'bar',
    data: {
      labels: upsetNames,
      datasets: [{ label: 'UPSET PICKS', data: upsetData,
        backgroundColor: BB, hoverBackgroundColor: '#FF8833', borderWidth: 0, borderRadius: 0 }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: tip },
      scales: { x: { ...sc.x, beginAtZero: true }, y: sc.y }
    }
  });

  // 2 ── Pick Consensus (LIVE) — fixed height matching Upset Index, scrollable
  const fullConsensusH = Math.max(280, consensusGames.length * 36);
  addCard('ch-consensus', 'PICK CONSENSUS', 'Upcoming games first — 50% = perfectly split pool', false, hBar);
  if (consensusGames.length > 0) {
    const wrapC = document.getElementById('wrap-ch-consensus');
    wrapC.style.overflowY = 'auto';
    wrapC.style.overflowX = 'hidden';
    const innerC = document.createElement('div');
    innerC.style.cssText = `position:relative;height:${fullConsensusH}px`;
    const canvasC = document.getElementById('ch-consensus');
    wrapC.removeChild(canvasC);
    innerC.appendChild(canvasC);
    wrapC.appendChild(innerC);
    mkChart('ch-consensus', {
      type: 'bar',
      data: {
        labels: consensusGames.map(g => g.lbl),
        datasets: [
          { label: 'TEAM A %', data: consensusGames.map(g => g.pct1), backgroundColor: BB,        borderWidth: 0, borderRadius: 0 },
          { label: 'TEAM B %', data: consensusGames.map(g => g.pct2), backgroundColor: '#2d2d2d', borderWidth: 1, borderColor: '#444', borderRadius: 0 },
        ]
      },
      options: {
        indexAxis: 'y',
        interaction: { mode: 'index', intersect: false, axis: 'y' },
        plugins: { legend: leg('bottom'), tooltip: { ...tip, callbacks: { label: ctx => { const g = consensusGames[ctx.dataIndex]; const name = ctx.datasetIndex === 0 ? g.t1name : g.t2name; return `${name}: ${ctx.raw}%`; } } } },
        scales: {
          x: { ...sc.x, stacked: true, max: 100, ticks: { ...sc.x.ticks, callback: v => v + '%' } },
          y: { ...sc.y, stacked: true },
        }
      }
    });
  } else {
    document.getElementById('wrap-ch-consensus').innerHTML = '<div class="bb-no-data">NO PICKS DATA YET</div>';
  }

  // 3 ── Risk Profile (LIVE) — sorted by Pot 3+4 picks descending
  addCard('ch-risk', 'RISK PROFILE', 'Pick distribution by pot — Pot 3/4 picks are upsets', false, hVBar);
  mkChart('ch-risk', {
    type: 'bar',
    data: {
      labels: riskNames,
      datasets: [
        { label: 'POT 1 PICKS', data: riskData.map(b => b[1]), backgroundColor: BB,        borderWidth: 0, borderRadius: 0 },
        { label: 'POT 2 PICKS', data: riskData.map(b => b[2]), backgroundColor: '#00CFFF', borderWidth: 0, borderRadius: 0 },
        { label: 'POT 3 PICKS', data: riskData.map(b => b[3]), backgroundColor: '#FFFF00', borderWidth: 0, borderRadius: 0 },
        { label: 'POT 4 PICKS', data: riskData.map(b => b[4]), backgroundColor: '#FF3D6B', borderWidth: 0, borderRadius: 0 },
        { label: 'DRAW PICKS',  data: riskData.map(b => b.D),  backgroundColor: '#444444', borderWidth: 0, borderRadius: 0 },
      ]
    },
    options: {
      plugins: { legend: leg('bottom'), tooltip: { ...tip, mode: 'index', intersect: false } },
      scales: { x: { ...sc.x, stacked: true, ticks: rotX }, y: { ...sc.y, stacked: true, beginAtZero: true } }
    }
  });

  // 4 ── Score Over Time (LIVE when results exist)
  const SO_MD_IDX = [0, 0, 1, 1, 2, 2]; // game.idx → matchday (0/1/2)
  const soGrpCfg  = ROUND_CONFIG.find(r => r.id === 'groups');
  function getMDScore(pid, mdIdx) {
    const picks = (state.picks[pid] || {})['groups'] || {};
    let sc = 0;
    getGamesForRound('groups').filter(g => SO_MD_IDX[g.idx] === mdIdx).forEach(g => {
      const picked = picks[getPickKey(g)];
      const result = state.results[g.id];
      if (picked && result !== undefined) {
        const winner = result === 'Draw' ? 'Draw' : (getWinner(g.id)?.name ?? result);
        if (winner === picked) sc += calcPickPoints(g, picked, soGrpCfg);
      }
    });
    return sc;
  }
  function mdHasResults(mdIdx) {
    return getGamesForRound('groups').filter(g => SO_MD_IDX[g.idx] === mdIdx).some(g => state.results[g.id] !== undefined);
  }
  function roundHasResults(roundId) {
    return getGamesForRound(roundId).some(g => state.results[g.id] !== undefined);
  }
  const soStarted = [
    mdHasResults(0), mdHasResults(1), mdHasResults(2),
    roundHasResults('r32'), roundHasResults('r16'), roundHasResults('qf'), roundHasResults('sf'), roundHasResults('final'),
  ];
  const soLabels  = ['MD1','MD2','MD3','R32','R16','QF','SF','FINAL'];
  const soHasData = soStarted.some(Boolean);
  addCard('ch-score-time', 'SCORE OVER TIME', 'Cumulative points per player by matchday', true, 360);
  if (soHasData) {
    mkChart('ch-score-time', {
      type: 'line',
      data: {
        labels: soLabels,
        datasets: allPlayers.map((p, i) => {
          const grpTotal = getPlayerRoundScore(p.id, 'groups').score;
          const md1 = getMDScore(p.id, 0);
          const md2 = getMDScore(p.id, 1);
          const steps = [
            md1,
            md2,
            grpTotal - md1 - md2,
            getPlayerRoundScore(p.id, 'r32').score,
            getPlayerRoundScore(p.id, 'r16').score,
            getPlayerRoundScore(p.id, 'qf').score,
            getPlayerRoundScore(p.id, 'sf').score,
            getPlayerRoundScore(p.id, 'final').score,
          ];
          let cum = 0;
          return {
            label: p.name,
            data: steps.map((s, i) => { cum += s; return soStarted[i] ? cum : null; }),
            borderColor: bbC(i), backgroundColor: 'transparent',
            borderWidth: 1.5, pointRadius: 2, pointBackgroundColor: bbC(i), tension: 0,
          };
        })
      },
      options: { plugins: { legend: leg('bottom'), tooltip: tip }, scales: sc }
    });
  } else {
    document.getElementById('wrap-ch-score-time').innerHTML = '<div class="bb-no-data">NO RESULTS YET — SCORES APPEAR AS GAMES COMPLETE</div>';
  }

  // 6 ── Score Ceiling (LIVE — real data always available from picks)
  const ceilData = allPlayers.map(p => { const s = getPlayerTotalScore(p.id); return s.total + (s.possible || 0); });
  const ceilOrd  = allPlayers.map((_, i) => i).sort((a, b) => ceilData[b] - ceilData[a]);
  addCard('ch-ceiling', 'SCORE CEILING', 'Maximum possible score per player if all remaining picks win', false, hBar);
  mkChart('ch-ceiling', {
    type: 'bar',
    data: {
      labels: ceilOrd.map(i => allPlayers[i].name),
      datasets: [{ label: 'MAX POSSIBLE', data: ceilOrd.map(i => ceilData[i]),
        backgroundColor: BB, hoverBackgroundColor: '#FF8833', borderWidth: 0, borderRadius: 0 }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: tip },
      scales: { x: { ...sc.x, beginAtZero: true }, y: sc.y }
    }
  });

  // 7 ── Accuracy by Group (LIVE when results exist)
  const groupLetters = Object.keys(GROUP_TEAMS);
  const groupAccData = allPlayers.map(p => {
    const picks = gPicks(p.id);
    return groupLetters.map(letter => {
      let correct = 0, total = 0;
      GROUP_TEAMS[letter] && allGames.filter(g => g.group === letter).forEach(g => {
        const pick = picks[g.key];
        const result = Object.values(state.games).find(sg => {
          const { t1, t2 } = getTeams(sg);
          return sg.round === 'groups' && ((t1?.name === g.t1.name && t2?.name === g.t2.name) || (t1?.name === g.t2.name && t2?.name === g.t1.name));
        });
        if (!pick || !result || state.results[result?.id] === undefined) return;
        total++;
        const res = state.results[result.id];
        const normalised = res === 'Draw' ? 'Draw' : res;
        if (pick === normalised) correct++;
      });
      return total ? Math.round(correct / total * 100) : null;
    });
  });
  const hasGroupAcc = groupAccData.some(row => row.some(v => v !== null));
  addCard('ch-group-acc', 'ACCURACY BY GROUP', 'Correct pick % per group per player', false, 300);
  if (hasGroupAcc) {
    mkChart('ch-group-acc', {
      type: 'radar',
      data: {
        labels: groupLetters,
        datasets: allPlayers.map((p, i) => ({
          label: p.name,
          data: groupAccData[allPlayers.indexOf(p)].map(v => v ?? 0),
          borderColor: bbC(i), backgroundColor: bbC(i) + '18',
          borderWidth: 1.5, pointRadius: 2, pointBackgroundColor: bbC(i),
        }))
      },
      options: {
        plugins: { legend: leg('bottom'), tooltip: tip },
        scales: { r: {
          grid: { color: '#1a1a1a' }, angleLines: { color: '#1a1a1a' },
          ticks: { color: '#555', backdropColor: 'transparent', stepSize: 25, font: { family: MONO, size: 8 } },
          pointLabels: { color: '#888', font: { family: MONO, size: 9 } },
          suggestedMin: 0, suggestedMax: 100,
        }}
      }
    });
  } else {
    document.getElementById('wrap-ch-group-acc').innerHTML = '<div class="bb-no-data">NO RESULTS YET — ACCURACY APPEARS AS GAMES COMPLETE</div>';
  }

  // 8 ── Upset Hit Rate (LIVE when results exist)
  const uhrData = allPlayers.map(p => {
    const picks = gPicks(p.id);
    let correct = 0, total = 0;
    allGames.forEach(g => {
      const pick = picks[g.key];
      if (!pick || pick === 'Draw') return;
      const pt = pick === g.t1.name ? g.t1 : g.t2;
      const ot = pt === g.t1 ? g.t2 : g.t1;
      if (pt.seed <= ot.seed) return; // not an upset pick
      const sg = Object.values(state.games).find(s => {
        const { t1, t2 } = getTeams(s);
        return s.round === 'groups' && ((t1?.name === g.t1.name && t2?.name === g.t2.name) || (t1?.name === g.t2.name && t2?.name === g.t1.name));
      });
      if (!sg || state.results[sg.id] === undefined) return;
      total++;
      if (state.results[sg.id] === pick) correct++;
    });
    return { total, rate: total ? Math.round(correct / total * 100) : null };
  });
  const hasUHR     = uhrData.some(d => d.total > 0);
  const allUHRZero = hasUHR && uhrData.every(d => !d.rate);
  const uhrTotal   = uhrData.reduce((s, d) => s + d.total, 0);
  addCard('ch-upset-hit', 'UPSET HIT RATE', '% of upset picks that were correct', false, hVBar);
  if (hasUHR && !allUHRZero) {
    const uhrOrd = allPlayers.map((_, i) => i).filter(i => uhrData[i].total > 0).sort((a, b) => (uhrData[b].rate ?? -1) - (uhrData[a].rate ?? -1));
    mkChart('ch-upset-hit', {
      type: 'bar',
      data: {
        labels: uhrOrd.map(i => allPlayers[i].name),
        datasets: [{ label: 'HIT RATE', data: uhrOrd.map(i => uhrData[i].rate),
          backgroundColor: BB, borderWidth: 0, borderRadius: 0 }]
      },
      options: {
        plugins: { legend: { display: false }, tooltip: tip },
        scales: {
          x: { ...sc.x, ticks: rotX },
          y: { ...sc.y, beginAtZero: true, max: 100, ticks: { color: '#777', font: { family: MONO, size: 9 }, callback: v => v + '%' } }
        }
      }
    });
  } else if (allUHRZero) {
    document.getElementById('wrap-ch-upset-hit').innerHTML = `<div class="bb-no-data">0 FOR ${uhrTotal} — NO UPSETS HAVE LANDED YET</div>`;
  } else {
    document.getElementById('wrap-ch-upset-hit').innerHTML = '<div class="bb-no-data">NO RESULTS YET — HIT RATE APPEARS AS GAMES COMPLETE</div>';
  }

  // 10 ── Round-by-Round Score Breakdown (LIVE when results exist)
  const rrRoundIds = ['groups', 'r32', 'r16', 'qf', 'sf', 'final'];
  const rrColors   = [BB, '#00CFFF', '#FFFF00', '#FF3D6B', '#00FF99', '#FF8800'];
  const rrScores   = allPlayers.map(p => rrRoundIds.map(r => getPlayerRoundScore(p.id, r).score));
  const rrTotals   = rrScores.map(s => s.reduce((a, b) => a + b, 0));
  const hasRRData  = rrTotals.some(t => t > 0);
  addCard('ch-round-breakdown', 'ROUND-BY-ROUND SCORE BREAKDOWN', 'Points earned per round per player — sorted by total score', true, Math.max(320, n * 26 + 100));
  if (hasRRData) {
    const rrOrder = allPlayers.map((_, i) => i).sort((a, b) => rrTotals[b] - rrTotals[a]);
    mkChart('ch-round-breakdown', {
      type: 'bar',
      data: {
        labels: rrOrder.map(i => allPlayers[i].name),
        datasets: rrRoundIds.map((r, ri) => ({
          label: ROUND_CONFIG.find(c => c.id === r).short,
          data: rrOrder.map(i => rrScores[i][ri]),
          backgroundColor: rrColors[ri], borderWidth: 0, borderRadius: 0,
        }))
      },
      options: {
        plugins: { legend: leg('bottom'), tooltip: tip },
        scales: { x: { ...sc.x, stacked: true, ticks: rotX }, y: { ...sc.y, stacked: true, beginAtZero: true } }
      }
    });
  } else {
    document.getElementById('wrap-ch-round-breakdown').innerHTML = '<div class="bb-no-data">NO RESULTS YET — SCORES APPEAR AS GAMES COMPLETE</div>';
  }

  // 11 ── Most Costly Wrong Picks (LIVE when results exist)
  const costlyGames = [];
  ROUND_CONFIG.forEach(cfg => {
    getGamesForRound(cfg.id).forEach(game => {
      const result = state.results[game.id];
      if (!result || result === 'Draw') return;
      const { t1, t2 } = getTeams(game);
      if (!t1 || !t2) return;
      const pickKey = getPickKey(game);
      let wrong = 0, total = 0;
      allPlayers.forEach(p => {
        const pick = ((state.picks[p.id] || {})[cfg.id] || {})[pickKey];
        if (pick) { total++; if (pick !== result) wrong++; }
      });
      if (!total || !wrong) return;
      const pctWrong = wrong / total;
      costlyGames.push({
        lbl: `[${cfg.short}] ${t1.name.split(' ')[0].slice(0,8)} v ${t2.name.split(' ')[0].slice(0,8)}`,
        cost: Math.round(pctWrong * cfg.pts * 10) / 10,
        pct: Math.round(pctWrong * 100),
      });
    });
  });
  costlyGames.sort((a, b) => b.cost - a.cost);
  const topCostly = costlyGames.slice(0, 20);
  addCard('ch-costly', 'MOST COSTLY WRONG PICKS', 'Avg points lost per player per game (% wrong × round value) — sorted by pain', true, Math.max(320, topCostly.length * 34));
  if (topCostly.length) {
    mkChart('ch-costly', {
      type: 'bar',
      data: {
        labels: topCostly.map(g => g.lbl),
        datasets: [{ label: 'AVG PTS LOST', data: topCostly.map(g => g.cost), backgroundColor: BB, hoverBackgroundColor: '#FF8833', borderWidth: 0, borderRadius: 0 }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: tip },
        scales: { x: { ...sc.x, beginAtZero: true }, y: sc.y }
      }
    });
  } else {
    document.getElementById('wrap-ch-costly').innerHTML = '<div class="bb-no-data">NO RESULTS YET — COSTLY MISSES APPEAR AS GAMES COMPLETE</div>';
  }

  // 12 ── Win Probability (LIVE when scores exist)
  const wpRaw   = allPlayers.map(p => { const s = getPlayerTotalScore(p.id); return { name: p.name, effective: s.total + (s.possible || 0) * 0.5 }; });
  const wpTotal = wpRaw.reduce((sum, d) => sum + d.effective, 0);
  addCard('ch-win-prob', 'WIN PROBABILITY', 'Estimated win chance: current score + 50% of max remaining — sorted highest first', false, hBar);
  if (wpTotal > 0) {
    const wpOrder = wpRaw.map((_, i) => i).sort((a, b) => wpRaw[b].effective - wpRaw[a].effective);
    mkChart('ch-win-prob', {
      type: 'bar',
      data: {
        labels: wpOrder.map(i => wpRaw[i].name),
        datasets: [{ label: 'WIN PROBABILITY', data: wpOrder.map(i => Math.round(wpRaw[i].effective / wpTotal * 100)), backgroundColor: BB, hoverBackgroundColor: '#FF8833', borderWidth: 0, borderRadius: 0 }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: ctx => ` ${ctx.raw}%` } } },
        scales: {
          x: { ...sc.x, beginAtZero: true, max: 100, ticks: { ...sc.x.ticks, callback: v => v + '%' } },
          y: sc.y
        }
      }
    });
  } else {
    document.getElementById('wrap-ch-win-prob').innerHTML = '<div class="bb-no-data">NO PICKS DATA YET</div>';
  }

  // 13 ── Knockout Bracket Similarity Matrix (LIVE; dummy until KO picks submitted) — bottom-right
  const shorts = allPlayers.map(p => shortName(p.name));
  const koRounds = ['r32', 'r16', 'qf', 'sf', 'final'];
  let hasKOPicks = false;
  allPlayers.forEach(p => koRounds.forEach(r => { if (Object.keys((state.picks[p.id] || {})[r] || {}).length) hasKOPicks = true; }));
  addCard('ch-ko-sim', 'KNOCKOUT BRACKET SIMILARITY', 'How often any two players picked the same team in knockout rounds (%)', false, hMtx);
  const wrapKO = document.getElementById('wrap-ch-ko-sim');
  wrapKO.innerHTML = '';
  function buildKOTable(pctFn) {
    let koTbl = '<div class="ag-scroll"><table class="ag-table"><thead><tr><th></th>' +
      shorts.map(s => `<th>${s}</th>`).join('') + '</tr></thead><tbody>';
    allPlayers.forEach((p1, i) => {
      koTbl += `<tr><th>${shorts[i]}</th>`;
      allPlayers.forEach((p2, j) => {
        const v = pctFn(i, j, p1.id, p2.id);
        const display = i === j ? '100%' : (v === null ? '—' : v + '%');
        const pct = v === null ? 0 : (v - 30) / 70;
        const r = Math.round(255 * pct + 10 * (1 - pct));
        const g2 = Math.round(102 * pct + 10 * (1 - pct));
        const bg = i === j ? BB : (v === null ? '#0a0a0a' : `rgb(${r},${g2},0)`);
        const fg = (pct > 0.4 || i === j) ? '#FFF' : '#444';
        koTbl += `<td style="background:${bg};color:${fg}">${display}</td>`;
      });
      koTbl += '</tr>';
    });
    return koTbl + '</tbody></table></div>';
  }
  if (hasKOPicks) {
    wrapKO.innerHTML = buildKOTable((i, j, pid1, pid2) => {
      if (i === j) return 100;
      let same = 0, total = 0;
      koRounds.forEach(r => {
        const p1 = (state.picks[pid1] || {})[r] || {};
        const p2 = (state.picks[pid2] || {})[r] || {};
        new Set([...Object.keys(p1), ...Object.keys(p2)]).forEach(k => {
          if (p1[k] && p2[k]) { total++; if (p1[k] === p2[k]) same++; }
        });
      });
      return total ? Math.round(same / total * 100) : null;
    });
  } else {
    wrapKO.innerHTML = '<div class="bb-no-data">NO KNOCKOUT PICKS YET — MATRIX APPEARS AFTER KO PICKS SUBMITTED</div>';
  }

  // 14 ── Agreement Matrix (LIVE) — bottom-right
  addCard('ch-agreement', 'PLAYER AGREEMENT MATRIX', 'How often any two players picked the same team (%)', false, hMtx);
  const wrap4 = document.getElementById('wrap-ch-agreement');
  wrap4.innerHTML = '';
  let tbl = '<div class="ag-scroll"><table class="ag-table"><thead><tr><th></th>' +
    shorts.map(s => `<th>${s}</th>`).join('') + '</tr></thead><tbody>';
  allPlayers.forEach((p1, i) => {
    tbl += `<tr><th>${shorts[i]}</th>`;
    allPlayers.forEach((p2, j) => {
      const v   = agreePct(p1.id, p2.id);
      const display = i === j ? '100%' : (v === null ? '—' : v + '%');
      const pct = v === null ? 0 : (v - 30) / 70;
      const r   = Math.round(255 * pct + 10 * (1 - pct));
      const g2  = Math.round(102 * pct + 10 * (1 - pct));
      const bg  = i === j ? BB : (v === null ? '#0a0a0a' : `rgb(${r},${g2},0)`);
      const fg  = (pct > 0.4 || i === j) ? '#FFF' : '#444';
      tbl += `<td style="background:${bg};color:${fg}">${display}</td>`;
    });
    tbl += '</tr>';
  });
  tbl += '</tbody></table></div>';
  wrap4.innerHTML = tbl;
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
  const adminScoreStr = adminSc !== undefined
    ? ` <span class="result-score-badge">${adminSc.t1}–${adminSc.t2}${adminSc.pens ? ' <span class="pens-label">pen</span>' : ''}</span>`
    : '';
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
      if (resultName === 'Draw' && game.round !== 'groups') return;
      if (state.results[game.id] === resultName) { delete state.results[game.id]; }
      else { state.results[game.id] = resultName; }
      rebuildGames();
      fixInvalidPicks();
      saveState();
      const msg = resultName === 'Draw' ? 'Result: Draw' : `Result: ${resultName}`;
      showToast(msg, 'success');
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
      let pensChk = null;

      const saveScore = () => {
        const v1 = parseInt(inp1.value, 10);
        const v2 = parseInt(inp2.value, 10);
        if (!isNaN(v1) && !isNaN(v2)) {
          const existing = state.scores[game.id] || {};
          const pens = pensChk ? pensChk.checked : (existing.pens || false);
          state.scores[game.id] = { ...existing, t1: v1, t2: v2, ...(pens ? { pens: true } : {}) };
        } else {
          delete state.scores[game.id];
        }
        rebuildGames();
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

      // Penalties checkbox + PK score — knockout rounds only
      if (game.round !== 'groups') {
        const pensRow = document.createElement('div');
        pensRow.className = 'result-pens-row';
        pensChk = document.createElement('input');
        pensChk.type = 'checkbox';
        pensChk.id = `pens-${game.id}`;
        pensChk.checked = !!sc.pens;

        // PK score inputs (shown/hidden based on checkbox)
        const pksRow = document.createElement('div');
        pksRow.className = 'result-pks-row';
        pksRow.style.display = sc.pens ? '' : 'none';

        const savePks = () => {
          const p1 = parseInt(pksInp1.value, 10);
          const p2 = parseInt(pksInp2.value, 10);
          const existing = state.scores[game.id] || {};
          if (!isNaN(p1) && !isNaN(p2)) {
            state.scores[game.id] = { ...existing, pks: { t1: p1, t2: p2 } };
          } else {
            const s = { ...existing }; delete s.pks; state.scores[game.id] = s;
          }
          rebuildGames(); saveState();
        };

        const pksInp1 = document.createElement('input');
        pksInp1.type = 'number'; pksInp1.min = '0'; pksInp1.max = '20';
        pksInp1.className = 'score-inp pks-inp'; pksInp1.placeholder = '-';
        pksInp1.value = sc.pks?.t1 !== undefined ? sc.pks.t1 : '';
        pksInp1.addEventListener('change', savePks);

        const pksDash = document.createElement('span');
        pksDash.className = 'score-dash'; pksDash.textContent = '–';

        const pksInp2 = document.createElement('input');
        pksInp2.type = 'number'; pksInp2.min = '0'; pksInp2.max = '20';
        pksInp2.className = 'score-inp pks-inp'; pksInp2.placeholder = '-';
        pksInp2.value = sc.pks?.t2 !== undefined ? sc.pks.t2 : '';
        pksInp2.addEventListener('change', savePks);

        const pksLbl = document.createElement('span');
        pksLbl.className = 'pks-row-label'; pksLbl.textContent = 'Pen score:';

        pksRow.appendChild(pksLbl);
        pksRow.appendChild(pksInp1);
        pksRow.appendChild(pksDash);
        pksRow.appendChild(pksInp2);

        pensChk.addEventListener('change', () => {
          const v1 = parseInt(inp1.value, 10);
          const v2 = parseInt(inp2.value, 10);
          pksRow.style.display = pensChk.checked ? '' : 'none';
          if (!isNaN(v1) && !isNaN(v2)) {
            const existing = state.scores[game.id] || {};
            state.scores[game.id] = { ...existing, t1: v1, t2: v2, ...(pensChk.checked ? { pens: true } : { pens: false }) };
            if (!pensChk.checked) { const s = state.scores[game.id]; delete s.pks; delete s.pens; }
            rebuildGames(); saveState();
          }
        });

        const pensLbl = document.createElement('label');
        pensLbl.htmlFor = `pens-${game.id}`;
        pensLbl.textContent = 'Won on penalties';
        pensRow.appendChild(pensChk);
        pensRow.appendChild(pensLbl);
        card.appendChild(pensRow);
        card.appendChild(pksRow);
      }
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

// ── BONUS RACE ────────────────────────────────────────────────

function renderBonusRace(container) {
  const wrapper = document.createElement('div');
  container.appendChild(wrapper);
  renderBonusTracker(wrapper);
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
      const _d = new Date(dl);
      input.value = new Date(_d.getTime() - _d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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
    const newRound  = roundSel.value;
    const RORDER    = ['groups','r32','r16','qf','sf','third','final'];
    const curIdx    = RORDER.indexOf(state.currentRound);
    const newIdx    = RORDER.indexOf(newRound);
    if (newIdx < curIdx) {
      const curLabel = ROUND_CONFIG.find(r => r.id === state.currentRound)?.label || state.currentRound;
      const newLabel = ROUND_CONFIG.find(r => r.id === newRound)?.label || newRound;
      if (!confirm(`⚠️ Move BACK to ${newLabel}?\n\nCurrent round is "${curLabel}". Rolling back will change the active round for all players. Confirm?`)) return;
    }
    state.currentRound = newRound;
    state.roundStatus  = 'open'; // advancing to a new round always opens picks; use Set Status to close
    const statusSel = document.getElementById('admin-status-sel');
    if (statusSel) statusSel.value = 'open';
    saveState({ _setRound: true }); // flag allows server round ratchet to accept any direction
    updateRoundStatus();
    showToast(`Round set to ${ROUND_CONFIG.find(r => r.id === state.currentRound)?.label} — picks are open`, 'success');
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

  // Popularity bar popup: show player names when clicked
  document.addEventListener('click', e => {
    const pop = e.target.closest('.pick-o-pop[data-pickers]');
    if (pop) {
      const names = (pop.dataset.pickers || '').split('||').filter(Boolean);
      showPickersPopup(pop, names);
      return;
    }
    const popup = document.getElementById('pick-pickers-popup');
    if (popup && !e.target.closest('#pick-pickers-popup')) popup.style.display = 'none';
  });
}

// ── INIT ──────────────────────────────────────────────────────

async function init() {
  state.games = buildGames();
  await loadState();
  // Rebuild games so r32Teams (or auto-computed group standings) populate the bracket
  rebuildGames();
  // Default picks tab to the actual current round, not the hardcoded 'groups' initial value
  state.activePicksRound = state.currentRound;

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

  // Keep --header-h in sync so #bracket-nav stacks correctly below a potentially-wrapping header
  syncHeaderHeight();
  new ResizeObserver(syncHeaderHeight).observe(document.querySelector('.header'));

  startPolling();
  startScoresPolling();
  fetchLiveStats();

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
    const pid = state.sessionPlayer || state.currentPlayer;

    // ── Protect the current user's picks from being overwritten by stale server data ──
    //
    // Two scenarios that can wipe picks:
    // 1. Mid-selection (unsaved): another player saves → poll triggers re-render → pendingPicks reset
    // 2. Just saved but save POST hasn't landed: poll fires while save is in flight → picks replaced
    //    with old server copy
    //
    // Fix for (1): snapshot pendingPicks while on the picks page and restore after re-render.
    // Fix for (2): compare pickSavedAt timestamps — if local is newer, the save is still in flight,
    //              so keep the local copy regardless of which view the user is on.

    // Snapshot unsaved in-progress picks (fix for scenario 1)
    const pendingRoundId = state.activePicksRound;
    const pendingSnapshot = (
      state.currentView === 'picks' &&
      pendingRoundId &&
      Object.keys(state.pendingPicks || {}).length > 0
    ) ? { ...state.pendingPicks } : null;

    // Snapshot saved-but-not-yet-confirmed picks (fix for scenario 2)
    const localPicksSnap    = pid ? JSON.parse(JSON.stringify(state.picks[pid]    || {})) : null;
    const localSavedAtSnap  = pid ? JSON.parse(JSON.stringify((state.pickSavedAt || {})[pid] || {})) : null;

    applyLoadedState(saved);
    if (JSON.stringify(state.r32Teams) !== hadR32) rebuildGames();

    if (pid) {
      // Scenario 2: restore rounds where local timestamp is newer than server's
      if (localPicksSnap && localSavedAtSnap) {
        for (const roundId of Object.keys(localSavedAtSnap)) {
          const localTs  = localSavedAtSnap[roundId] || '';
          const serverTs = (saved.pickSavedAt?.[pid]?.[roundId]) || '';
          if (localTs > serverTs && Object.keys(localPicksSnap[roundId] || {}).length > 0) {
            if (!state.picks[pid]) state.picks[pid] = {};
            state.picks[pid][roundId] = localPicksSnap[roundId];
            if (!state.pickSavedAt)        state.pickSavedAt = {};
            if (!state.pickSavedAt[pid])   state.pickSavedAt[pid] = {};
            state.pickSavedAt[pid][roundId] = localTs;
          }
        }
      }

      // Scenario 1: restore unsaved in-progress picks on top (only while round is still open)
      if (pendingSnapshot && saved.roundStatus === 'open' && saved.currentRound === pendingRoundId) {
        if (!state.picks[pid]) state.picks[pid] = {};
        if (!state.picks[pid][pendingRoundId]) state.picks[pid][pendingRoundId] = {};
        Object.assign(state.picks[pid][pendingRoundId], pendingSnapshot);
      }
    }

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
    // Normalise so t1/t2 always correspond to our game's t1/t2 (not ESPN home/away)
    const pks = sc.pks ? (fwd ? sc.pks : { t1: sc.pks.t2, t2: sc.pks.t1 }) : undefined;
    return fwd
      ? { t1: sc.t1.score, t2: sc.t2.score, t1Winner: sc.t1.winner, pks, status: sc.status, statusDetail: sc.statusDetail, link: sc.link, scheduledDate: sc.scheduledDate }
      : { t1: sc.t2.score, t2: sc.t1.score, t1Winner: sc.t2.winner, pks, status: sc.status, statusDetail: sc.statusDetail, link: sc.link, scheduledDate: sc.scheduledDate };
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
      if (sc.t1 > sc.t2) {
        state.results[game.id] = t1.name;
      } else if (sc.t2 > sc.t1) {
        state.results[game.id] = t2.name;
      } else if (sc.t1Winner !== undefined) {
        // Tied after 90 min — use ESPN winner flag (set correctly for PK outcomes)
        state.results[game.id] = sc.t1Winner ? t1.name : t2.name;
        const isPens = sc.statusDetail && sc.statusDetail.toLowerCase().includes('pen');
        if (isPens) {
          const existing = state.scores[game.id] || {};
          state.scores[game.id] = { ...existing, t1: sc.t1, t2: sc.t2, pens: true, ...(sc.pks ? { pks: sc.pks } : {}) };
        }
      } else {
        continue; // genuinely undecided (live extra time)
      }
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

async function fetchLiveStats() {
  try {
    const resp = await fetch('/api/live-stats');
    if (!resp.ok) return;
    state.liveStats = await resp.json();
    renderBonusTracker();
  } catch (e) { /* ignore */ }
}

function renderBonusTracker(targetEl) {
  const el = targetEl || document.getElementById('bonus-tracker');
  if (!el) return;
  const stats = state.liveStats;

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  }

  const bpEntries = Object.entries(state.bonusPicks || {});
  const totalPickers = state.players.length || bpEntries.length;

  function pickDist(id) {
    const counts = {};
    for (const [, pp] of bpEntries) {
      const v = pp[id];
      if (!v) continue;
      const k = Array.isArray(v) ? v.join(', ') : String(v).trim();
      if (k) counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }

  function pickerNamesFor(id, pkArr) {
    const pkSet = new Set(pkArr);
    const out = [];
    for (const [pid, pp] of bpEntries) {
      const v = pp[id];
      if (!v) continue;
      const k = Array.isArray(v) ? v.join(', ') : String(v).trim();
      if (!pkSet.has(k)) continue;
      const pl = state.players.find(p => p.id === pid);
      out.push(pl ? pl.name : pid);
    }
    return out;
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  function findAllPks(label, dist) {
    const nl = norm(label);
    return Object.keys(dist).filter(k => {
      const nk = norm(k);
      return nk === nl || nk.includes(nl) || nl.includes(nk);
    });
  }

  function popEl(id, pks) {
    const denom = totalPickers;
    if (!pks || !pks.length) return `<span class="bt-zero">0/${denom}</span>`;
    const names = pickerNamesFor(id, pks);
    if (!names.length) return `<span class="bt-zero">0/${denom}</span>`;
    const nameStr = esc(names.map(n => n.replace(/\|/g, '/')).join('||'));
    const pct = denom > 0 ? Math.round(names.length / denom * 100) : 0;
    return `<span class="pick-o-pop" data-pickers="${nameStr}"><span class="pick-pop-track"><span class="pick-pop-fill" style="width:${pct}%"></span></span><span class="pick-pop-txt">${names.length}/${denom}</span></span>`;
  }

  function secRow(label, cls) {
    return `<tr class="bt-sec-row${cls ? ' ' + cls : ''}"><td colspan="4">${label}</td></tr>`;
  }

  function winnersRow(id) {
    const ans = state.bonusAnswers[id];
    if (!ans) return '';
    const ansArr = Array.isArray(ans) ? ans : [ans];
    const ansNorm = new Set(ansArr.map(a => String(a).trim().toLowerCase()));
    const winners = [];
    for (const [pid, pp] of bpEntries) {
      const v = pp[id];
      if (!v) continue;
      if (!ansNorm.has(String(v).trim().toLowerCase())) continue;
      const pl = state.players.find(p => p.id === pid);
      if (pl) winners.push(pl.name);
    }
    if (!winners.length) return '';
    return `<tr class="bt-winners-row"><td></td><td colspan="3">&#9989; <span class="bt-winner-name">${esc(winners.join(', '))}</span></td></tr>`;
  }

  function winnersRowMulti(id) {
    const ans = state.bonusAnswers[id];
    if (!ans || !Array.isArray(ans)) return '';
    const normC = ans.map(a => String(a).trim().toLowerCase()).sort();
    const winners = [];
    for (const [pid, pp] of bpEntries) {
      const v = pp[id];
      if (!Array.isArray(v)) continue;
      const normP = v.map(a => String(a).trim().toLowerCase()).sort();
      if (normP.length === normC.length && normP.every((x, i) => x === normC[i])) {
        const pl = state.players.find(p => p.id === pid);
        if (pl) winners.push(pl.name);
      }
    }
    if (!winners.length) return '';
    return `<tr class="bt-winners-row"><td></td><td colspan="3">&#9989; <span class="bt-winner-name">${esc(winners.join(', '))}</span></td></tr>`;
  }

  function winnersRowClosest(id) {
    const ans = state.bonusAnswers[id];
    if (!ans) return '';
    const correct = parseFloat(ans);
    if (isNaN(correct)) return '';
    const dists = [];
    for (const [pid, pp] of bpEntries) {
      const v = parseFloat(pp[id]);
      if (!isNaN(v)) dists.push({ pid, dist: Math.abs(v - correct) });
    }
    if (!dists.length) return '';
    const minDist = Math.min(...dists.map(d => d.dist));
    const winners = dists
      .filter(d => d.dist === minDist)
      .map(d => state.players.find(p => p.id === d.pid)?.name)
      .filter(Boolean);
    if (!winners.length) return '';
    const label = minDist === 0 ? 'Exact!' : `Closest (off by ${minDist})`;
    return `<tr class="bt-winners-row"><td></td><td colspan="3">&#9989; ${label} &mdash; <span class="bt-winner-name">${esc(winners.join(', '))}</span></td></tr>`;
  }

  function qRows(id, title, pts, subtitle, rows) {
    const dist = pickDist(id);
    const used = new Set();
    let html = `<tr class="bt-q-row"><td colspan="4"><span class="bt-q-title">${title}</span><span class="bt-q-pts">${pts}pts</span>${subtitle ? `<span class="bt-q-sub">${esc(subtitle)}</span>` : ''}</td></tr>`;

    if (rows === undefined) {
      return html + `<tr class="bt-tr"><td colspan="4" class="bt-loading-cell">Loading…</td></tr>`;
    }

    if (rows === null) {
      const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
      if (!entries.length) return html + `<tr class="bt-tr"><td colspan="4" class="bt-loading-cell">No picks yet</td></tr>`;
      return html + entries.map(([k]) =>
        `<tr class="bt-tr"><td class="bt-td-rank">—</td><td class="bt-td-name">${esc(k)}${flag(k)}</td><td class="bt-td-val"></td><td class="bt-td-picks">${popEl(id, [k])}</td></tr>`
      ).join('');
    }

    html += rows.map((r, i) => {
      const pks = 'pk' in r ? (r.pk ? [r.pk] : []) : findAllPks(r.name, dist);
      pks.forEach(k => used.add(k));
      const isTop = 'leading' in r ? r.leading : i === 0;
      return `<tr class="bt-tr${isTop ? ' bt-tr-top' : ''}">
        <td class="bt-td-rank">${i + 1}</td>
        <td class="bt-td-name">${esc(r.name)}${flag(r.sub || r.name)}${r.sub ? `<span class="bt-td-sub">${esc(r.sub)}</span>` : ''}</td>
        <td class="bt-td-val">${esc(r.val || '')}</td>
        <td class="bt-td-picks">${popEl(id, pks)}</td>
      </tr>`;
    }).join('');

    const extra = Object.entries(dist).filter(([k]) => !used.has(k));
    if (extra.length) {
      html += extra.map(([k]) =>
        `<tr class="bt-tr bt-tr-other"><td class="bt-td-rank">?</td><td class="bt-td-name">${esc(k)}${flag(k)}</td><td class="bt-td-val"></td><td class="bt-td-picks">${popEl(id, [k])}</td></tr>`
      ).join('');
    }
    return html;
  }

  const CONF_KEY = { CONMEBOL: 'CONMEBOL (South America)', UEFA: 'UEFA (Europe)', CAF: 'CAF (Africa)', AFC: 'AFC (Asia)', CONCACAF: 'CONCACAF (N./C. America)', OFC: 'OFC (Oceania)' };
  const hm = stats?.highestMargin;
  const hmWinner = hm ? (hm.margin >= 6 ? '6+' : String(hm.margin)) : null;
  const updText = stats?.lastUpdated ? `Updated ${timeAgo(stats.lastUpdated)} &middot; as.com / live results` : '';
  const pot1Ans = state.bonusAnswers['tw_pot1_exit'];
  const pot1Sub = pot1Ans ? 'Answer: ' + (Array.isArray(pot1Ans) ? pot1Ans.join(', ') : pot1Ans) : 'TBD';
  const r32rcAns = state.bonusAnswers['r32_red_cards'];
  const r32rcSub = r32rcAns ? 'Answer: ' + r32rcAns : 'TBD after all R32 games';

  // For grp_most_goals: when the answer is final (an array of tied teams), show all tied teams highlighted
  const mostGoalsAns = state.bonusAnswers['grp_most_goals'];
  const mostGoalsRows = (() => {
    if (mostGoalsAns) {
      const tied = Array.isArray(mostGoalsAns) ? mostGoalsAns : [mostGoalsAns];
      return tied.map(team => ({ name: team, val: '10 goals · tied', leading: true }));
    }
    return stats ? (stats.teamGoals?.slice(0, 8).map(e => ({ name: e.team, val: `${e.value} goals` })) || []) : undefined;
  })();

  el.innerHTML = `<div class="bonus-tracker">
    <div class="bt-header">
      <h3 class="bt-title">&#127942; Bonus Tracker</h3>
      ${updText ? `<span class="bt-upd">${updText}</span>` : ''}
    </div>
    <table class="bt-table"><colgroup><col class="bt-col-rank"><col><col class="bt-col-val"><col class="bt-col-picks"></colgroup><tbody>
      ${secRow('&#127760; Tournament-Wide &middot; scored at tournament end')}
      ${qRows('tw_golden_boot', 'Golden Boot Winner', 6, null,
          stats ? (stats.goldenBoot?.slice(0, 8).map(e => ({ name: e.player, sub: e.team, val: `${e.goals} goal${e.goals !== 1 ? 's' : ''}` })) || []) : undefined)}
      ${qRows('tw_possession', 'Best Time of Possession %', 6, null,
          stats ? (stats.possession?.slice(0, 8).map(e => ({ name: e.team, val: `${e.value}%` })) || []) : undefined)}
      ${qRows('tw_pot1_exit', 'First Pot 1 Team Eliminated', 6, pot1Sub, null)}
      ${winnersRow('tw_pot1_exit')}
      ${secRow('&#11088; Group Stage &middot; complete', 'bt-sec-row--grp')}
      ${qRows('grp_most_goals', 'Team with Most Goals', 5, mostGoalsAns ? 'Tied at 10 goals' : null, mostGoalsRows)}
      ${winnersRow('grp_most_goals')}
      ${qRows('grp_conf_winrate', 'Confederation Win Rate', 5, null,
          stats ? (stats.confWinRate?.map(e => ({ name: e.conf, val: `${e.rate}% (${e.wins}W / ${e.games}G)`, pk: CONF_KEY[e.conf] || e.conf })) || []) : undefined)}
      ${winnersRow('grp_conf_winrate')}
      ${qRows('grp_margin', 'Highest Winning Margin', 4, hm ? hm.label : null,
          stats ? ['6+', '5', '4', '3'].map(opt => ({ name: `${opt} goals`, val: opt === hmWinner && hm ? hm.label : '', pk: opt, leading: opt === hmWinner })) : undefined)}
      ${winnersRow('grp_margin')}
      ${secRow('&#9876;&#65039; Round of 32 &middot; complete', 'bt-sec-row--r32')}
      ${qRows('r32_red_cards', 'Total Red Cards in R32', 6, r32rcSub, null)}
      ${winnersRow('r32_red_cards')}
      ${secRow('&#127359; Round of 16 &middot; complete', 'bt-sec-row--r16')}
      ${qRows('r16_goals', 'Total Goals in R16', 2.5, state.bonusAnswers['r16_goals'] ? null : 'Answer TBD after R16', null)}
      ${winnersRowClosest('r16_goals')}
      ${qRows('r16_pks', 'R16 Matches to Penalties', 2.5, state.bonusAnswers['r16_pks'] ? null : 'Answer TBD after R16', null)}
      ${winnersRowClosest('r16_pks')}
      ${secRow('&#127942; Quarterfinals &middot; in progress', 'bt-sec-row--qf')}
      ${qRows('qf_motm_1', 'Man of the Match — Morocco vs France', 1, state.bonusAnswers['qf_motm_1'] ? null : 'Answer TBD after QF-A', null)}
      ${winnersRow('qf_motm_1')}
      ${qRows('qf_motm_2', 'Man of the Match — Norway vs England', 1, state.bonusAnswers['qf_motm_2'] ? null : 'Answer TBD after QF-B', null)}
      ${winnersRow('qf_motm_2')}
      ${qRows('qf_motm_3', 'Man of the Match — Spain vs Belgium', 1, state.bonusAnswers['qf_motm_3'] ? null : 'Answer TBD after QF-C', null)}
      ${winnersRow('qf_motm_3')}
      ${qRows('qf_motm_4', 'Man of the Match — Argentina vs Switzerland', 1, state.bonusAnswers['qf_motm_4'] ? null : 'Answer TBD after QF-D', null)}
      ${winnersRow('qf_motm_4')}
      ${qRows('qf_yellows', 'Total Yellow Cards in QF', 3, state.bonusAnswers['qf_yellows'] ? null : 'Closest score wins · Answer TBD after QF', null)}
      ${winnersRowClosest('qf_yellows')}
      ${qRows('qf_goal_diff', 'Total Goal Difference in QF', 3, state.bonusAnswers['qf_goal_diff'] ? null : 'Closest score wins · Answer TBD after QF', null)}
      ${winnersRowClosest('qf_goal_diff')}
      ${qRows('qf_teams', 'Final Four — All Four Correct Picks', 2, state.bonusAnswers['qf_teams'] ? null : 'Answer TBD after QF', null)}
      ${winnersRowMulti('qf_teams')}
    </tbody></table>
  </div>`;
}

document.addEventListener('DOMContentLoaded', init);
