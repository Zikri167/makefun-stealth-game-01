// Ember Veil — the game itself.
// One job: own the loop and the states. Title, playing, paused, caught,
// level clear, win, game over. It loads a level, steps the player and
// the guards, plays the sounds, and hands the renderer what to draw.

import { LEVELS, VIEW_W, VIEW_H, TILE } from './config.js';
import { World } from './world.js';
import { Guard, CHASE } from './guard.js';
import { Player } from './player.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { applyShot } from './shots.js';

const TITLE = 'title';
const PLAYING = 'playing';
const PAUSED = 'paused';
const CAUGHT = 'caught';
const LEVEL_CLEAR = 'levelclear';
const WIN = 'win';
const GAME_OVER = 'gameover';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.state = TITLE;
    this.levelIndex = 0;
    this.lives = 3;
    this.levelTime = 0;
    this.totalTime = 0;
    this.time = 0;
    this.world = null;
    this.guards = [];
    this.player = null;
    this._prevAlert = false;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    const level = LEVELS[index];
    this.world = new World(level);
    this.guards = this.world.guardSpawns.map((spawn, i) => new Guard(spawn, i));
    this.player = new Player(this.world.playerStart);
    this.levelTime = 0;
    this._prevAlert = false;
  }

  start() {
    if (this.state === TITLE || this.state === LEVEL_CLEAR) {
      if (this.state === LEVEL_CLEAR) {
        const next = this.levelIndex + 1;
        if (next >= LEVELS.length) {
          this.state = WIN;
          return;
        }
        this.loadLevel(next);
      }
      this.state = PLAYING;
      this.audio.ensure();
    }
  }

  retryLevel() {
    this.loadLevel(this.levelIndex);
    this.state = PLAYING;
    this.audio.ensure();
  }

  restartGame() {
    this.lives = 3;
    this.totalTime = 0;
    this.loadLevel(0);
    this.state = TITLE;
  }

  update(dt) {
    this.time += dt;
    const pressed = this.input.consume();
    const player = this.player;

    // A staged screenshot pose: draw, do not simulate.
    if (this.shotFrozen) return;

    if (this.state === TITLE) {
      if (pressed.anyKey) this.start();
      return;
    }
    if (this.state === LEVEL_CLEAR) {
      if (pressed.anyKey) this.start();
      return;
    }
    if (this.state === WIN || this.state === GAME_OVER) {
      if (pressed.restartPressed) this.restartGame();
      return;
    }
    if (this.state === CAUGHT) {
      if (pressed.restartPressed) {
        if (this.lives > 0) this.retryLevel();
        else this.restartGame();
      }
      return;
    }
    if (this.state === PAUSED) {
      if (pressed.pausePressed) this.state = PLAYING;
      if (pressed.restartPressed) this.retryLevel();
      return;
    }

    // PLAYING
    if (pressed.pausePressed) {
      this.state = PAUSED;
      return;
    }
    if (pressed.restartPressed) {
      this.retryLevel();
      return;
    }
    this.levelTime += dt;
    this.totalTime += dt;
    this.audio.ensure();

    // Pebble noise reaches guards before the player moves this frame.
    const noise = player.pebbleNoise();
    player.update(dt, this.world, this.input);
    if (noise) {
      for (const g of this.guards) {
        if (g.state === CHASE) continue;
        const d = Math.hypot(g.x - noise.x, g.y - noise.y);
        if (d < noise.radius) {
          g.investigateTarget = { x: noise.x, y: noise.y };
          g.state = 'investigate';
          g.suspicion = Math.max(g.suspicion, 0.4);
        }
      }
      if (player.pebble && player.pebble.landed && player.pebble.ring < 5) {
        this.audio.pebble();
      }
    }

    // Footsteps: the nearest guard hears them.
    if (player.stepped) {
      let nearest = Infinity;
      for (const g of this.guards) {
        nearest = Math.min(nearest, Math.hypot(g.x - player.x, g.y - player.y));
      }
      this.audio.footstep(player.sneaking, nearest);
      player.stepped = false;
    }

    for (const g of this.guards) {
      g.update(dt, this.world, player, this.guards);
    }

    const anyAlert = this.guards.some((g) => g.state === CHASE);
    if (anyAlert && !this._prevAlert) this.audio.alarm();
    this._prevAlert = anyAlert;

    const relic = player.tryPickup(this.world);
    if (relic) this.audio.pickup();

    if (this.guards.some((g) => g.caughtPlayer)) {
      this.lives -= 1;
      this.audio.caught();
      this.state = this.lives > 0 ? CAUGHT : GAME_OVER;
      return;
    }

    if (player.atExit(this.world)) {
      this.audio.win();
      if (this.levelIndex + 1 >= LEVELS.length) {
        this.state = WIN;
      } else {
        this.state = LEVEL_CLEAR;
      }
    }
  }

  draw() {
    const ctx = this.renderer.ctx;
    const level = LEVELS[this.levelIndex];
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#14100c';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.renderer.drawWorld(this.world, this.time);
    this.renderer.drawRelics(this.world, this.time);
    this.renderer.drawGuards(this.guards, this.time);
    this.renderer.drawPlayer(this.player, this.time);
    this.renderer.drawNight(this.player);

    const anyAlert = this.guards.some((g) => g.state === CHASE);
    const anySuspicious = this.guards.some((g) => g.suspicion >= 0.35 && g.state !== CHASE);
    this.renderer.drawHud({
      levelName: `${level.name}  ·  Level ${this.levelIndex + 1}/${LEVELS.length}`,
      relicsGot: this.world.relicTotal - this.world.relicsLeft(),
      relicsTotal: this.world.relicTotal,
      lives: this.lives,
      timeText: formatTime(this.levelTime),
      anyAlert,
      anySuspicious,
      objective:
        this.world.relicsLeft() > 0
          ? `Steal the remaining ${this.world.relicsLeft()} relic${this.world.relicsLeft() === 1 ? '' : 's'} — then reach the EXIT unseen.`
          : 'All relics stolen. Reach the EXIT unseen.',
    });

    if (this.state === TITLE) {
      this.renderer.drawTitle(level.name, level.sub);
    } else if (this.state === PAUSED) {
      this.renderer.drawPaused();
    } else if (this.state === CAUGHT) {
      this.renderer.drawCaught(this.lives);
    } else if (this.state === LEVEL_CLEAR) {
      this.renderer.drawLevelClear(level.name, formatTime(this.levelTime));
    } else if (this.state === WIN) {
      this.renderer.drawWin(formatTime(this.totalTime));
    } else if (this.state === GAME_OVER) {
      this.renderer.drawGameOver();
    }
  }
}

export function boot() {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  // Screenshot staging (?shot=...): the maker poses the game for its
  // screenshots. Real renders of this code, never edited pictures.
  applyShot(game);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Exposed for automated play-testing only; the game never reads it.
  window.__game = game;
  return game;
}

if (typeof document !== 'undefined') {
  boot();
}
