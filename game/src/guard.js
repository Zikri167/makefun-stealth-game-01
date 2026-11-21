// Ember Veil — the guards.
// One job: patrol, see, suspect, chase. A guard walks its waypoints,
// watches a cone in front of it, and builds suspicion while the player
// is inside that cone with a clear line of sight. Full suspicion means
// a chase; losing the player means a search, then back to patrol.

import { GUARD, TILE } from './config.js';

export const PATROL = 'patrol';
export const STARE = 'stare'; // stopped, watching something odd
export const INVESTIGATE = 'investigate'; // walking to a noise / last seen spot
export const CHASE = 'chase';
export const RETURN = 'return'; // walking back to the patrol route

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(current, target, maxStep) {
  const d = angleDiff(target, current);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

export class Guard {
  constructor(spawn, index) {
    this.index = index;
    this.x = spawn.x;
    this.y = spawn.y;
    this.waypoints = spawn.waypoints;
    this.wpIndex = 0;
    this.angle = -Math.PI / 2; // face up at spawn
    this.state = PATROL;
    this.suspicion = 0;
    this.lastSeen = null; // {x, y} where the player was last clearly seen
    this.investigateTarget = null;
    this.stareTimer = 0;
    this.searchTimer = 0;
    this.pauseTimer = 0; // brief pause at each waypoint, looks around
    this.scanPhase = index * 1.7; // guards scan out of sync
    this.alertCooldown = 0;
    this.caughtPlayer = false;
    this.stepPhase = Math.random() * 10;
  }

  // Can this guard see the player right now? Distance, cone angle,
  // line of sight, and hiding: a player crouched behind a planter or
  // in a shadow is only spotted at very close range.
  canSee(world, player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD.viewRange) return 0;
    const hidden = world.hiddenAt(player.x, player.y);
    if (hidden && dist > GUARD.hideSpotRange) return 0;
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, this.angle)) > GUARD.viewHalfAngle) return 0;
    if (!world.hasLineOfSight(this.x, this.y, player.x, player.y)) return 0;
    // Visibility: 1.0 up close, fading to 0.35 at the cone's edge.
    const rangeFall = 1 - (dist / GUARD.viewRange) * 0.65;
    return hidden ? rangeFall * 0.5 : rangeFall;
  }

  // Hear the player: running is loud, sneaking is quiet. Returns true
  // when the guard turns to investigate the noise.
  hears(player, world) {
    if (!player.moving || player.noiseRadius <= 0) return false;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist > player.noiseRadius) return false;
    if (!world.hasLineOfSight(this.x, this.y, player.x, player.y)) {
      // Sound bends a little around corners, but not far.
      if (dist > player.noiseRadius * 0.5) return false;
    }
    return true;
  }

  // Warn nearby guards: they investigate the same spot.
  shout(guards) {
    for (const other of guards) {
      if (other === this || other.state === CHASE) continue;
      const d = Math.hypot(other.x - this.x, other.y - this.y);
      if (d > GUARD.alertShoutRange) continue;
      other.investigateTarget = this.lastSeen
        ? { x: this.lastSeen.x, y: this.lastSeen.y }
        : { x: this.x, y: this.y };
      other.state = INVESTIGATE;
      other.suspicion = Math.max(other.suspicion, 0.6);
    }
  }

  update(dt, world, player, guards) {
    this.alertCooldown = Math.max(0, this.alertCooldown - dt);
    const vis = this.canSee(world, player);

    if (vis > 0) {
      this.lastSeen = { x: player.x, y: player.y };
      const rate = vis > 0.85 ? GUARD.detectRateClose : GUARD.detectRate;
      this.suspicion = Math.min(1, this.suspicion + rate * vis * dt);
      // Face what you see.
      const toPlayer = Math.atan2(player.y - this.y, player.x - this.x);
      this.angle = turnToward(this.angle, toPlayer, 5.5 * dt);
      if (this.suspicion >= GUARD.alertAt && this.state !== CHASE) {
        this.state = CHASE;
        if (this.alertCooldown <= 0) {
          this.shout(guards);
          this.alertCooldown = 2.5;
        }
      } else if (this.suspicion >= GUARD.suspiciousAt && this.state === PATROL) {
        this.state = STARE;
        this.stareTimer = 0.9;
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - GUARD.decayRate * dt);
      if (this.state === STARE) {
        this.stareTimer -= dt;
        if (this.stareTimer <= 0) {
          if (this.suspicion >= GUARD.suspiciousAt && this.lastSeen) {
            this.investigateTarget = { ...this.lastSeen };
            this.state = INVESTIGATE;
          } else {
            this.state = PATROL;
          }
        }
      }
    }

    // Noise: a loud player pulls a patrolling guard over to look.
    if (this.state === PATROL && this.hears(player, world)) {
      this.investigateTarget = { x: player.x, y: player.y };
      this.state = INVESTIGATE;
      this.suspicion = Math.max(this.suspicion, 0.45);
    }

    switch (this.state) {
      case PATROL:
        this.patrol(dt, world);
        break;
      case INVESTIGATE:
        this.walkTo(dt, world, this.investigateTarget, GUARD.investigateSpeed, () => {
          this.state = STARE;
          this.stareTimer = 1.6;
          this.searchTimer = 2.2;
        });
        break;
      case STARE: {
        // Slowly scan around while staring.
        this.scanPhase += dt * 0.9;
        this.angle += Math.sin(this.scanPhase) * 0.55 * dt;
        if (this.searchTimer > 0) {
          this.searchTimer -= dt;
          if (this.searchTimer <= 0 && this.suspicion < GUARD.suspiciousAt) {
            this.state = RETURN;
          }
        }
        break;
      }
      case CHASE: {
        const target = this.lastSeen || { x: player.x, y: player.y };
        // Chase the last seen spot; refresh it while the player is visible.
        if (vis > 0) target.x = player.x, target.y = player.y;
        const arrived = this.walkTo(dt, world, target, GUARD.chaseSpeed, null);
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        if (distToPlayer < GUARD.catchRange) {
          this.caughtPlayer = true;
        }
        if (vis <= 0) {
          this.searchTimer += dt;
          if (this.searchTimer > 3.5) {
            this.state = INVESTIGATE;
            this.investigateTarget = { ...this.lastSeen };
            this.searchTimer = 0;
          }
        } else {
          this.searchTimer = 0;
        }
        if (arrived && vis <= 0) {
          this.state = INVESTIGATE;
          this.investigateTarget = { ...this.lastSeen };
        }
        break;
      }
      case RETURN: {
        // Walk back to the nearest waypoint, then resume the patrol.
        let nearest = 0;
        let nearestD = Infinity;
        this.waypoints.forEach((wp, i) => {
          const d = Math.hypot(wp.x - this.x, wp.y - this.y);
          if (d < nearestD) {
            nearestD = d;
            nearest = i;
          }
        });
        this.wpIndex = nearest;
        this.state = PATROL;
        break;
      }
      default:
        break;
    }
  }

  patrol(dt, world) {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      this.scanPhase += dt * 1.1;
      this.angle += Math.sin(this.scanPhase) * 0.7 * dt;
      return;
    }
    const wp = this.waypoints[this.wpIndex];
    const arrived = this.walkTo(dt, world, wp, GUARD.patrolSpeed, null);
    if (arrived) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.pauseTimer = 0.7;
    }
  }

  // Walk toward a point, facing the direction of travel. Returns true
  // when the point is reached (within a tile's quarter).
  walkTo(dt, world, target, speed, onArrive) {
    if (!target) return true;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < TILE * 0.25) {
      if (onArrive) onArrive();
      return true;
    }
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    const pos = { x: this.x, y: this.y };
    world.moveCircle(pos, nx - this.x, ny - this.y, 13);
    this.x = pos.x;
    this.y = pos.y;
    const face = Math.atan2(dy, dx);
    this.angle = turnToward(this.angle, face, 4.5 * dt);
    this.stepPhase += dt * (speed / 14);
    return false;
  }
}
