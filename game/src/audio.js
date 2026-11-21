// Ember Veil — sound, synthesized, no audio files.
// One job: footsteps, a pickup chime, an alarm sting and a win phrase,
// all from plain WebAudio oscillators. Silent until the first user
// gesture (browsers demand that), and silent when audio is unavailable.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this._lastStep = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    } catch (err) {
      this.ctx = null;
    }
  }

  _tone(freq, dur, type, vol, when = 0) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A soft thud: the pitch and loudness say how close the guard is.
  footstep(sneaking, distance) {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this._lastStep < 90) return;
    this._lastStep = now;
    const closeness = Math.max(0, 1 - distance / 320);
    const vol = (sneaking ? 0.12 : 0.5) * (0.25 + closeness);
    this._tone(sneaking ? 70 : 95, 0.09, 'sine', vol);
  }

  pickup() {
    this._tone(660, 0.16, 'sine', 0.5);
    this._tone(990, 0.22, 'sine', 0.4, 0.09);
  }

  alarm() {
    this._tone(220, 0.28, 'sawtooth', 0.35);
    this._tone(311, 0.28, 'sawtooth', 0.35, 0.14);
  }

  caught() {
    this._tone(160, 0.5, 'sawtooth', 0.4);
    this._tone(110, 0.7, 'sawtooth', 0.4, 0.18);
  }

  pebble() {
    this._tone(1400, 0.05, 'square', 0.18);
    this._tone(900, 0.07, 'square', 0.15, 0.05);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.3, 'sine', 0.4, i * 0.11));
  }
}
