// Ember Veil — screenshot staging.
// One job: pose the game for its screenshots. The maker runs the game
// with ?shot=start|play|hide|exit and captures real renders of this
// code — a title, a patrol in progress, a player hidden in cover, and
// the final dash to the exit. Positions are fixed, so a shot is stable.

import { TILE } from './config.js';

// Put one guard at a tile, facing an angle, with a suspicion level.
function poseGuard(guard, tx, ty, angle, suspicion, state) {
  guard.x = (tx + 0.5) * TILE;
  guard.y = (ty + 0.5) * TILE;
  guard.angle = angle;
  guard.suspicion = suspicion;
  guard.state = state || 'patrol';
  guard.pauseTimer = 10; // hold still: the pose must survive the capture
  guard.lastSeen = null;
}

function posePlayer(game, tx, ty, facing) {
  game.player.x = (tx + 0.5) * TILE;
  game.player.y = (ty + 0.5) * TILE;
  game.player.facing = facing;
  game.player.sneaking = true;
}

export function applyShot(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  game.state = 'playing';
  game.shotFrozen = true; // the pose holds while the picture is taken
  let g = game.guards;

  if (shot === 'start') {
    game.state = 'title';
    game.shotFrozen = false;
    return;
  }

  if (shot === 'play') {
    // Mid-level: the courier sneaks past a patrol, one guard already
    // half-suspicious, cones crossing the gallery floor.
    posePlayer(game, 12, 10, 0);
    poseGuard(g[0], 7, 9, 0, 0.8, 'stare');
    poseGuard(g[1], 19, 8, Math.PI, 0.1, 'patrol');
    poseGuard(g[2], 26, 12, Math.PI / 2, 0, 'patrol');
    return;
  }

  if (shot === 'hide') {
    // Tucked in a bush while a guard walks past, lantern sweeping over
    // the leaves. The HIDDEN mark shows the cover rule working.
    posePlayer(game, 3, 3, Math.PI / 2);
    game.player.hidden = true;
    poseGuard(g[0], 3, 6, -Math.PI / 2, 0.45, 'stare');
    poseGuard(g[1], 12, 8, Math.PI, 0.15, 'patrol');
    poseGuard(g[2], 24, 4, Math.PI / 2, 0, 'patrol');
    return;
  }

  if (shot === 'exit') {
    // Every relic stolen, the exit open and glowing, one last guard
    // between the courier and the door. Posed on level 2, so the sheet
    // shows the game has more than one level in it.
    game.loadLevel(1);
    g = game.guards; // loadLevel replaces the guards: re-read them
    for (const r of game.world.relics) r.taken = true;
    posePlayer(game, 25, 13, 0);
    poseGuard(g[0], 20, 10, Math.PI, 0.2, 'patrol');
    poseGuard(g[1], 26, 10, Math.PI / 2, 0, 'patrol');
    poseGuard(g[2], 13, 12, 0, 0, 'patrol');
    poseGuard(g[3], 28, 8, Math.PI / 2, 0.55, 'stare');
    return;
  }
}
