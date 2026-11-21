// Ember Veil — everything you see.
// One job: draw the level, the cones, the people and the screens on one
// canvas. The palette is a lantern-lit archive at night: warm floors,
// deep shadows, amber cones. Guards read against the floor at a glance:
// amber cone for patrol, orange for suspicious, red for the chase.

import { TILE, MAP_W, MAP_H, VIEW_W, VIEW_H, GUARD } from './config.js';
import { CHASE, INVESTIGATE, STARE } from './guard.js';

const FLOOR_A = '#33291d';
const FLOOR_B = '#2b2115';
const WALL_TOP = '#6b5138';
const WALL_SIDE = '#453522';
const WALL_EDGE = '#8a6a45';
const CRATE = '#6b4a26';
const CRATE_EDGE = '#8a6136';
const BUSH = '#1e3a1f';
const BUSH_LEAF = '#2c5a2e';
const SHADOW = '#120e1a';
const PLAYER_RING_MAX = 260;
const AMBER = '255, 190, 80';
const ORANGE = '255, 130, 40';
const RED = '255, 70, 60';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // A cone of light: a wedge from the guard, fading with distance, cut
  // into segments so walls read through it faintly at the edges.
  drawCone(guard) {
    const ctx = this.ctx;
    const color = guard.state === CHASE ? RED : guard.suspicion >= GUARD.suspiciousAt ? ORANGE : AMBER;
    const alpha = guard.state === CHASE ? 0.38 : guard.suspicion >= GUARD.suspiciousAt ? 0.32 : 0.24;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, GUARD.viewRange, guard.angle - GUARD.viewHalfAngle, guard.angle + GUARD.viewHalfAngle);
    ctx.closePath();
    const grad = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, GUARD.viewRange);
    grad.addColorStop(0, `rgba(${color},${alpha})`);
    grad.addColorStop(0.7, `rgba(${color},${alpha * 0.55})`);
    grad.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  drawWorld(world, time) {
    const ctx = this.ctx;
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const ch = world.grid[ty][tx];
        const px = tx * TILE;
        const py = ty * TILE;
        if (ch === '#') {
          ctx.fillStyle = WALL_SIDE;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = WALL_TOP;
          ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 10);
          ctx.fillStyle = WALL_EDGE;
          ctx.fillRect(px + 2, py + TILE - 8, TILE - 4, 2);
          // Wall lanterns: a warm glow where a wall meets the floor,
          // placed by the tile's own coordinates so it never moves.
          const below = ty + 1 < MAP_H ? world.tileAt(tx, ty + 1) : '#';
          const h = (tx * 83492791) ^ (ty * 2971215073);
          if (below !== '#' && (((h ^ (h >>> 11)) >>> 0) % 6 === 0)) {
            const lx = px + TILE / 2;
            const ly = py + TILE - 6;
            const glow = ctx.createRadialGradient(lx, ly, 2, lx, ly, 34);
            glow.addColorStop(0, 'rgba(255,190,90,0.5)');
            glow.addColorStop(1, 'rgba(255,190,90,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(lx, ly, 34, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd27a';
            ctx.beginPath();
            ctx.arc(lx, ly, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5d4632';
            ctx.fillRect(lx - 5, ly - 8, 10, 4);
          }
        } else {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? FLOOR_A : FLOOR_B;
          ctx.fillRect(px, py, TILE, TILE);
          // Faint tile seams.
          ctx.strokeStyle = 'rgba(0,0,0,0.12)';
          ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
          // Deterministic floor dressing from the tile's own coordinates,
          // so every run paints the same archive: a rug here, a mosaic
          // there, never a bare stretch of floor.
          const h = (tx * 73856093) ^ (ty * 19349663);
          const hh = ((h ^ (h >>> 13)) >>> 0) % 29;
          if (hh === 0) {
            ctx.fillStyle = 'rgba(122,52,44,0.55)';
            ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
            ctx.strokeStyle = 'rgba(220,170,90,0.5)';
            ctx.strokeRect(px + 7.5, py + 7.5, TILE - 15, TILE - 15);
          } else if (hh === 1) {
            ctx.fillStyle = 'rgba(220,190,120,0.16)';
            ctx.beginPath();
            ctx.moveTo(px + TILE / 2, py + 6);
            ctx.lineTo(px + TILE - 6, py + TILE / 2);
            ctx.lineTo(px + TILE / 2, py + TILE - 6);
            ctx.lineTo(px + 6, py + TILE / 2);
            ctx.closePath();
            ctx.fill();
          }
        }
        if (ch === 'C') {
          ctx.fillStyle = CRATE;
          ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
          ctx.strokeStyle = CRATE_EDGE;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
          ctx.beginPath();
          ctx.moveTo(px + 5, py + 5);
          ctx.lineTo(px + TILE - 5, py + TILE - 5);
          ctx.moveTo(px + TILE - 5, py + 5);
          ctx.lineTo(px + 5, py + TILE - 5);
          ctx.stroke();
          ctx.lineWidth = 1;
        } else if (ch === 'B') {
          // A potted fern in a terracotta planter: archive greenery you
          // can crouch behind. The pot marks it as cover at a glance.
          ctx.fillStyle = '#7a4a28';
          ctx.fillRect(px + 9, py + 24, TILE - 18, 12);
          ctx.fillStyle = '#93592f';
          ctx.fillRect(px + 9, py + 24, TILE - 18, 3);
          ctx.fillStyle = BUSH;
          ctx.beginPath();
          ctx.arc(px + 14, py + 16, 12, 0, Math.PI * 2);
          ctx.arc(px + 26, py + 12, 11, 0, Math.PI * 2);
          ctx.arc(px + 22, py + 24, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = BUSH_LEAF;
          ctx.beginPath();
          ctx.arc(px + 13, py + 13, 5, 0, Math.PI * 2);
          ctx.arc(px + 25, py + 22, 5, 0, Math.PI * 2);
          ctx.arc(px + 27, py + 11, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === 'S') {
          // A patch of safe darkness: deep indigo, edged in faint
          // moonlight so it reads as a hiding place, not a dim floor.
          ctx.fillStyle = SHADOW;
          ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
          ctx.strokeStyle = 'rgba(150,140,255,0.35)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 4.5, py + 4.5, TILE - 9, TILE - 9);
          ctx.lineWidth = 1;
          ctx.fillStyle = 'rgba(190,185,255,0.5)';
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2, 6, 0.4, Math.PI * 2 - 0.4);
          ctx.arc(px + TILE / 2 + 3, py + TILE / 2 - 1, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // The exit: a glowing doorway that only opens once every relic is held.
    const exit = world.exit;
    const open = world.relicsLeft() === 0;
    const pulse = 0.6 + Math.sin(time * 3) * 0.25;
    ctx.save();
    ctx.fillStyle = open ? `rgba(120,220,160,${0.25 + pulse * 0.3})` : 'rgba(90,90,90,0.35)';
    ctx.fillRect(exit.x - 18, exit.y - 18, 36, 36);
    ctx.strokeStyle = open ? '#7dffa8' : '#777';
    ctx.lineWidth = 3;
    ctx.strokeRect(exit.x - 18, exit.y - 18, 36, 36);
    ctx.fillStyle = open ? '#d8ffe4' : '#999';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : 'LOCK', exit.x, exit.y + 1);
    ctx.restore();
  }

  drawRelics(world, time) {
    const ctx = this.ctx;
    for (const r of world.relics) {
      if (r.taken) continue;
      const bob = Math.sin(time * 2 + r.bob) * 3;
      const x = r.x;
      const y = r.y + bob;
      ctx.save();
      const glow = ctx.createRadialGradient(x, y, 2, x, y, 30);
      glow.addColorStop(0, 'rgba(255,150,60,0.55)');
      glow.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
      // The ember gem: a small faceted diamond.
      ctx.fillStyle = '#ffb347';
      ctx.strokeStyle = '#ff7b2f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 11);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y + 11);
      ctx.lineTo(x - 8, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x + 3, y - 1);
      ctx.lineTo(x, y + 2);
      ctx.lineTo(x - 3, y - 1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawGuards(guards, time) {
    const ctx = this.ctx;
    for (const g of guards) {
      this.drawCone(g);
    }
    for (const g of guards) {
      // Body: a watchman in a dark red coat, facing its angle.
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 15, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(g.angle);
      ctx.fillStyle = '#8c2f2f';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d8c9a8';
      ctx.beginPath();
      ctx.arc(6, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      // Lantern held ahead: the light that makes the cone.
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.arc(17, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Suspicion ring + mark above the head.
      if (g.suspicion > 0.05) {
        const w = 30;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(g.x - w / 2, g.y - 34, w, 5);
        ctx.fillStyle = g.suspicion >= GUARD.alertAt ? '#ff4638' : g.suspicion >= GUARD.suspiciousAt ? '#ff8c28' : '#ffc850';
        ctx.fillRect(g.x - w / 2, g.y - 34, w * g.suspicion, 5);
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (g.state === CHASE) {
          ctx.fillStyle = '#ff4638';
          ctx.fillText('!', g.x, g.y - 44);
        } else if (g.suspicion >= GUARD.suspiciousAt) {
          ctx.fillStyle = '#ff8c28';
          ctx.fillText('?', g.x, g.y - 44);
        }
        ctx.restore();
      }
    }
  }

  drawPlayer(player, time) {
    const ctx = this.ctx;
    const bob = player.moving ? Math.sin(player.stepPhase) * 1.5 : Math.sin(time * 2) * 0.8;
    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hooded cloak, facing the direction of travel.
    ctx.rotate(player.facing);
    ctx.fillStyle = player.hidden ? '#3a4a6b' : '#46587e';
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-9, -11);
    ctx.lineTo(-13, 0);
    ctx.lineTo(-9, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#20294a';
    ctx.beginPath();
    ctx.arc(3, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(7, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Noise ripple while walking, so the player sees how loud they are.
    if (player.moving && !player.sneaking) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,220,150,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 20 + Math.sin(time * 6) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // A thrown pebble, arcing to its landing spot, then its noise ring.
    if (player.pebble) {
      const p = player.pebble;
      ctx.save();
      ctx.fillStyle = '#cfc4a8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      if (p.landed) {
        ctx.strokeStyle = `rgba(255,220,150,${Math.max(0, 0.7 - p.ring / PLAYER_RING_MAX)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.tx, p.ty, p.ring, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Hidden hint: a small eye-closed mark while tucked in cover.
    if (player.hidden) {
      ctx.save();
      ctx.fillStyle = 'rgba(180,220,255,0.9)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', player.x, player.y - 26);
      ctx.restore();
    }
  }

  drawHud(state) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(10,8,6,0.72)';
    ctx.fillRect(0, 0, VIEW_W, 44);
    ctx.fillStyle = '#f2e3c2';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.levelName, 16, 23);
    ctx.fillStyle = '#c9b48a';
    ctx.font = '15px sans-serif';
    ctx.fillText(`Relics  ${state.relicsGot}/${state.relicsTotal}`, 330, 23);
    ctx.fillText(`Lives  ${'●'.repeat(state.lives)}${'○'.repeat(Math.max(0, 3 - state.lives))}`, 470, 23);
    ctx.fillText(`Time  ${state.timeText}`, 620, 23);
    ctx.textAlign = 'right';
    ctx.fillStyle = state.anyAlert ? '#ff6a55' : '#9db98a';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(
      state.anyAlert ? '⚠ SPOTTED — BREAK LINE OF SIGHT' : state.anySuspicious ? '? A guard is suspicious…' : 'Unseen',
      VIEW_W - 16,
      23,
    );
    ctx.restore();

    // Objective line under the bar.
    ctx.save();
    ctx.fillStyle = 'rgba(10,8,6,0.5)';
    ctx.fillRect(0, 44, VIEW_W, 24);
    ctx.fillStyle = '#d8c9a8';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.objective, 16, 57);
    ctx.restore();
  }

  // A dimming veil with a hole of light around the player: the archive
  // at night. Kept light so cones and cover still read.
  drawNight(player) {
    const ctx = this.ctx;
    ctx.save();
    const grad = ctx.createRadialGradient(player.x, player.y, 90, player.x, player.y, 420);
    grad.addColorStop(0, 'rgba(6,5,12,0)');
    grad.addColorStop(1, 'rgba(6,5,12,0.30)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  panel(title, lines, accent) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,5,0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = accent || '#f2e3c2';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, VIEW_W / 2, 250);
    ctx.fillStyle = '#e8dcc0';
    ctx.font = '19px sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, VIEW_W / 2, 315 + i * 30);
    });
    ctx.restore();
  }

  drawTitle(levelName, levelSub) {
    this.panel('EMBER VEIL', [
      'A lantern-lit stealth game. Steal every relic, reach the exit unseen.',
      '',
      `First level: ${levelName} — ${levelSub}`,
      '',
      'Move  WASD / arrows      Sneak  Shift (quiet, slow)',
      'Throw a pebble  Q or mouse click (lure a guard away)',
      'Hide behind planters and in shadows — a guard only spots you up close there.',
      '',
      'Press any key to begin.',
    ]);
  }

  drawPaused() {
    this.panel('PAUSED', ['Press P to keep sneaking.', 'Press R to restart the level.']);
  }

  drawCaught(lives) {
    this.panel('CAUGHT!', [
      'A guard grabbed your cloak and dragged you to the door.',
      lives > 0 ? `You have ${lives} ${lives === 1 ? 'life' : 'lives'} left — press R to try the level again.` : 'No lives left.',
      '',
      'Press R to retry.',
    ], '#ff6a55');
  }

  drawLevelClear(levelName, timeText) {
    this.panel('CLEAN GETAWAY', [
      `${levelName} cleared in ${timeText} — unseen, every relic in hand.`,
      '',
      'Press any key for the next level.',
    ], '#7dffa8');
  }

  drawWin(totalTime) {
    this.panel('THE EMBER ARCHIVE IS YOURS', [
      `Every relic stolen, every guard outwitted — in ${totalTime}.`,
      '',
      'Thank you for playing Ember Veil.',
      'Press R to play again from the first level.',
    ], '#ffd27a');
  }

  drawGameOver() {
    this.panel('THE ARCHIVE KEEPS ITS SECRETS', [
      'Out of lives. The guards change the locks, and the relics stay.',
      '',
      'Press R to start over from the first level.',
    ], '#ff6a55');
  }
}
