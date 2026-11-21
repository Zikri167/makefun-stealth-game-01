// Ember Veil — the level as a grid.
// One job: turn a level's ASCII map into tiles, and answer the questions
// the rest of the game asks: is this tile solid, does it block sight,
// is the player hidden here, and can a guard see from A to B.

import { TILE, MAP_W, MAP_H } from './config.js';

// Tile kinds. SOLID blocks movement and sight; HIDE hides the player.
export const WALL = '#';
export const FLOOR = '.';
export const CRATE = 'C';
export const BUSH = 'B';
export const SHADOW = 'S';

export function isSolidTile(ch) {
  return ch === WALL || ch === CRATE;
}

export function isHideTile(ch) {
  return ch === BUSH || ch === SHADOW;
}

export class World {
  constructor(level) {
    this.level = level;
    this.grid = level.map.map((row) => row.split(''));
    this.playerStart = { x: 1.5 * TILE, y: 1.5 * TILE };
    this.relics = [];
    this.exit = { x: 0, y: 0, tx: 0, ty: 0 };
    this.guardSpawns = level.guards.map((g) => ({
      x: (g.x + 0.5) * TILE,
      y: (g.y + 0.5) * TILE,
      waypoints: g.waypoints.map(([wx, wy]) => ({
        x: (wx + 0.5) * TILE,
        y: (wy + 0.5) * TILE,
      })),
    }));
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const ch = this.grid[ty][tx];
        if (ch === 'P') {
          this.playerStart = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
          this.grid[ty][tx] = FLOOR;
        } else if (ch === 'R') {
          this.relics.push({
            tx, ty,
            x: (tx + 0.5) * TILE,
            y: (ty + 0.5) * TILE,
            taken: false,
            bob: Math.random() * Math.PI * 2,
          });
          this.grid[ty][tx] = FLOOR;
        } else if (ch === 'E') {
          this.exit = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, tx, ty };
          this.grid[ty][tx] = FLOOR;
        } else if (ch === 'G') {
          this.grid[ty][tx] = FLOOR;
        }
      }
    }
    this.relicTotal = this.relics.length;
  }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return WALL;
    return this.grid[ty][tx];
  }

  solidAt(tx, ty) {
    return isSolidTile(this.tileAt(tx, ty));
  }

  // Circle vs solid tiles: does a circle at (x, y) with radius r overlap
  // any solid tile? Used for movement collision.
  hitsSolid(x, y, r) {
    const x0 = Math.floor((x - r) / TILE);
    const x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE);
    const y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.solidAt(tx, ty)) continue;
        const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
        const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy < r * r) return true;
      }
    }
    return false;
  }

  // Move a circle by (dx, dy), sliding along walls axis by axis.
  moveCircle(pos, dx, dy, r) {
    if (dx !== 0 && !this.hitsSolid(pos.x + dx, pos.y, r)) pos.x += dx;
    if (dy !== 0 && !this.hitsSolid(pos.x, pos.y + dy, r)) pos.y += dy;
  }

  // Line of sight between two points: true when no solid tile blocks the
  // segment. Steps along the line in small increments (DDA-free, simple,
  // and plenty fast at this scale).
  hasLineOfSight(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / (TILE / 4)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tx = Math.floor((x0 + dx * t) / TILE);
      const ty = Math.floor((y0 + dy * t) / TILE);
      if (this.solidAt(tx, ty)) return false;
    }
    return true;
  }

  // Is the player hidden at (x, y)? Inside a bush or a shadow patch.
  hiddenAt(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return isHideTile(this.tileAt(tx, ty));
  }

  relicsLeft() {
    return this.relics.filter((r) => !r.taken).length;
  }

  // Nearest untaken relic to a point, or null.
  nearestRelic(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const r of this.relics) {
      if (r.taken) continue;
      const d = Math.hypot(r.x - x, r.y - y);
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }
    return best;
  }
}
