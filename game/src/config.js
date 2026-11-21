// Ember Veil — level data and tuning.
// One job: the numbers and maps. No drawing, no input, no audio here.
//
// Map legend (32 wide x 18 tall, one char per tile):
//   # wall (blocks sight + movement)   . floor
//   C crate (cover: blocks sight + movement)
//   B planter (a potted fern: hide zone, walkable, you are hidden inside unless a guard is very close)
//   S shadow (hide zone: walkable, dark floor, same hiding rule as a bush)
//   P player start   R relic (collect)   E exit   G guard spawn
// Guard patrol routes are listed per level as tile waypoints.

export const TILE = 40;
export const MAP_W = 32;
export const MAP_H = 18;
export const VIEW_W = 1280;
export const VIEW_H = 720;

// Guard senses (pixels / seconds).
export const GUARD = {
  patrolSpeed: 55,
  chaseSpeed: 118,
  investigateSpeed: 85,
  viewRange: 235,
  viewHalfAngle: 0.66, // ~38 degrees each side
  detectRate: 1.15, // suspicion per second while the player is clearly seen
  detectRateClose: 2.4, // ...while very close
  decayRate: 0.55, // suspicion per second while unseen
  alertAt: 1.0, // suspicion 0..1; at 1 the guard gives chase
  suspiciousAt: 0.35, // above this the guard stops and stares, then investigates
  catchRange: 26, // caught when a chasing guard gets this close
  hideSpotRange: 52, // a hidden player is only spotted inside this range
  hearRange: 190, // running footsteps heard inside this range
  sneakHearRange: 55, // sneaking footsteps heard inside this range
  alertShoutRange: 320, // an alerted guard warns guards inside this range
};

// Player movement (pixels per second).
export const PLAYER = {
  walkSpeed: 150,
  sneakSpeed: 82,
  radius: 13,
  pebbleCooldown: 4, // seconds between thrown pebbles
  pebbleNoiseRange: 260, // guards inside this range investigate the pebble
};

export const LEVELS = [
  {
    name: 'The Quiet Gallery',
    sub: 'Two relics. Three guards. Learn their patrols.',
    seed: 11,
    map: [
      '########' + '########' + '########' + '########',
      '#P....#.' + '......C.' + '.......#' + '.......#',
      '#.....#.' + '......C.' + '.......#' + '...R...#',
      '#..B..#.' + '...B....' + '.......#' + '.......#',
      '#.....#.' + '........' + '.......#' + '...#...#',
      '#.....#.' + '...####.' + '#......#' + '...#...#',
      '#..C....' + '....#...' + '...#....' + '#...#..#',
      '#.......' + '.#..R...' + '#.......' + '#......#',
      '#...####' + '##......' + '#....C..' + '.......#',
      '#...#...' + '...C....' + '#.......' + '.....##.',
      '#...#...' + '........' + '#....B..' + '...#...#',
      '#...#..C' + '........' + '#.......' + '.#.....#',
      '#...#...' + '..B.....' + '#....C..' + '.#.....#',
      '#.......' + '#.......' + '#....#..' + '.....E.#',
      '#..G....' + '#...G...' + '.#...#..' + '....G..#',
      '#.......' + '#.......' + '#....#..' + '.......#',
      '#.......' + '#.......' + '#....#..' + '.......#',
      '########' + '########' + '########' + '########',
    ],
    guards: [
      { x: 3, y: 14, waypoints: [[3, 14], [3, 2], [10, 2], [10, 14]] },
      { x: 12, y: 14, waypoints: [[12, 14], [12, 8], [20, 8], [20, 14]] },
      { x: 28, y: 14, waypoints: [[28, 14], [28, 4], [24, 4], [24, 14]] },
    ],
  },
  {
    name: 'The Lantern Vault',
    sub: 'Three relics. Four guards. The vault is awake.',
    seed: 23,
    map: [
      '########' + '########' + '########' + '########',
      '#P....#.' + '....B...' + '.......#' + '.......#',
      '#.....#.' + '.......C' + '....#...' + '#...R..#',
      '#..C..#.' + '..B.....' + '....#...' + '#.......',
      '#.....#.' + '........' + '....#...' + '#...#..#',
      '#.....##' + '##...#..' + '.#......' + '#...#..#',
      '#.......' + '.#..R...' + '#....C..' + '.#....#.',
      '#...####' + '##......' + '#.......' + '....#..#',
      '#...#...' + '....C...' + '#...B...' + '.#.....#',
      '#...#...' + '........' + '#....#..' + '.....#.#',
      '#..G....' + '....#...' + '#...G...' + '.#.....#',
      '#.......' + '.#......' + '#.......' + '.#..C..#',
      '#...B...' + '....#...' + '#....#..' + '..R....#',
      '#.......' + '.#...C..' + '.#......' + '#...E..#',
      '#....#..' + '........' + '....#...' + '#......#',
      '#..G....' + '#.......' + '.#...#..' + '....G..#',
      '#.......' + '........' + '........' + '.......#',
      '########' + '########' + '########' + '########',
    ],
    guards: [
      { x: 3, y: 10, waypoints: [[3, 10], [3, 2], [9, 2], [9, 10]] },
      { x: 20, y: 10, waypoints: [[20, 10], [21, 3], [26, 3], [26, 10]] },
      { x: 3, y: 15, waypoints: [[3, 15], [13, 15], [13, 11], [3, 11]] },
      { x: 28, y: 15, waypoints: [[28, 15], [28, 8], [22, 8], [22, 15]] },
    ],
  },
  {
    name: 'The Ember Sanctum',
    sub: 'Three relics. Five guards. No room for noise.',
    seed: 47,
    map: [
      '########' + '########' + '########' + '########',
      '#P....B.' + '........' + '........' + '...R...#',
      '#.......' + '..C.....' + '........' + '.......#',
      '#.......' + '........' + '....#...' + '.......#',
      '#..##...' + '........' + '....#...' + '..C....#',
      '#.......' + '..######' + '........' + '.......#',
      '#.......' + '....R...' + '....B...' + '.......#',
      '#..###..' + '........' + '........' + '....#..#',
      '#.......' + '....C...' + '........' + '..##...#',
      '#..G....' + '........' + '....G...' + '.......#',
      '#.......' + '.#......' + '........' + '..B....#',
      '#..C....' + '....#...' + '....#...' + '.......#',
      '#.......' + '....B...' + '.....C..' + '..R....#',
      '#.......' + '........' + '........' + '.......#',
      '#.......' + '.#...G..' + '........' + '...E...#',
      '#..G....' + '....#...' + '....#...' + '...G...#',
      '#.......' + '........' + '........' + '.......#',
      '########' + '########' + '########' + '########',
    ],
    guards: [
      { x: 3, y: 9, waypoints: [[3, 9], [3, 2], [6, 2], [6, 9]] },
      { x: 20, y: 9, waypoints: [[20, 9], [21, 3], [25, 3], [25, 9]] },
      { x: 13, y: 14, waypoints: [[13, 14], [13, 11], [17, 11], [17, 14]] },
      { x: 3, y: 15, waypoints: [[3, 15], [9, 15], [9, 12], [3, 12]] },
      { x: 28, y: 15, waypoints: [[28, 15], [28, 10], [25, 10], [25, 15]] },
    ],
  },
];
