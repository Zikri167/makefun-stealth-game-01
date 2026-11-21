// Ember Veil — the player.
// One job: move Wren, the courier. Walk, sneak, throw a pebble to lure
// a guard away, pick up relics, and slip out the exit once every relic
// of the level is in hand. Noise is the price of speed.

import { PLAYER, GUARD, TILE } from './config.js';

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.radius = PLAYER.radius;
    this.sneaking = false;
    this.moving = false;
    this.noiseRadius = 0;
    this.facing = -Math.PI / 2;
    this.stepPhase = 0;
    this.stepTick = 0; // counts footsteps for the sound engine
    this.pebbleCooldown = 0;
    this.pebble = null; // a thrown pebble flying through the air
    this.hidden = false;
    this.caught = false;
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.sneaking = false;
    this.moving = false;
    this.noiseRadius = 0;
    this.facing = -Math.PI / 2;
    this.pebbleCooldown = 0;
    this.pebble = null;
    this.caught = false;
  }

  update(dt, world, input) {
    this.pebbleCooldown = Math.max(0, this.pebbleCooldown - dt);
    this.sneaking = input.sneak;
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    this.moving = mx !== 0 || my !== 0;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.facing = Math.atan2(my, mx);
      const speed = this.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
      world.moveCircle(this, mx * speed * dt, my * speed * dt, this.radius);
      this.stepPhase += dt * (speed / 11);
      const prevTick = this.stepTick;
      this.stepTick = Math.floor(this.stepPhase / Math.PI);
      if (this.stepTick !== prevTick) this.stepped = true;
      // Noise: walking is heard nearby, sneaking barely at all.
      this.noiseRadius = this.sneaking ? GUARD.sneakHearRange : GUARD.hearRange;
    } else {
      this.noiseRadius = 0;
      this.stepped = false;
    }
    this.hidden = world.hiddenAt(this.x, this.y);

    // Pebble: click (or press Q) to throw one toward the mouse. It lands
    // with a clatter guards come to check, and buys a few quiet seconds.
    if (input.throwPebble && this.pebbleCooldown <= 0 && !this.pebble) {
      const tx = input.mouseX;
      const ty = input.mouseY;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const range = Math.min(dist, 260);
      this.pebble = {
        x: this.x,
        y: this.y,
        tx: this.x + (dx / dist) * range,
        ty: this.y + (dy / dist) * range,
        t: 0,
        dur: 0.28,
        landed: false,
        ring: 0,
      };
      this.pebbleCooldown = PLAYER.pebbleCooldown;
      input.throwPebble = false;
    }
    if (this.pebble) {
      const p = this.pebble;
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      p.x = p.x + (p.tx - p.x) * k;
      p.y = p.y + (p.ty - p.y) * k;
      if (k >= 1 && !p.landed) {
        p.landed = true;
        p.ring = 0;
        p.noiseAt = { x: p.tx, y: p.ty };
      }
      if (p.landed) {
        p.ring += dt * 90;
        if (p.ring > PLAYER.pebbleNoiseRange) this.pebble = null;
      }
    }
  }

  // A guard investigating a noise walks to the pebble's landing spot.
  pebbleNoise() {
    if (this.pebble && this.pebble.landed) {
      return { x: this.pebble.tx, y: this.pebble.ty, radius: PLAYER.pebbleNoiseRange };
    }
    return null;
  }

  // Pick up a relic by walking over it. Returns the relic, or null.
  tryPickup(world) {
    for (const r of world.relics) {
      if (r.taken) continue;
      if (Math.hypot(r.x - this.x, r.y - this.y) < TILE * 0.7) {
        r.taken = true;
        return r;
      }
    }
    return null;
  }

  // Standing on the exit with every relic collected.
  atExit(world) {
    if (world.relicsLeft() > 0) return false;
    return Math.hypot(world.exit.x - this.x, world.exit.y - this.y) < TILE * 0.8;
  }
}
