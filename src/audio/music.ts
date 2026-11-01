import { SONG } from '../data/content';

/**
 * Plays "Won't You Be a Hero?": the vocal version first, then the instrumental on loop.
 * When the biome is sick, a low-pass filter muffles the music; it clears as the biome heals.
 * Browsers only allow audio after a tap, so call start() from a click handler.
 */
export class Music {
  private el: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private filter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;

  constructor() {
    this.el = this.makeEl(SONG.vocal, false);
  }

  private makeEl(src: string, loop: boolean) {
    const el = new Audio(src);
    el.preload = 'auto';
    el.loop = loop;
    el.addEventListener('ended', () => this.toInstrumental());
    return el;
  }

  private baseVolume() {
    return this.el.src.includes('instrumental') ? 0.92 : 0.62;
  }

  private toInstrumental() {
    this.el.src = SONG.instrumental;
    this.el.loop = true;
    this.el.volume = this.baseVolume();
    this.el.play().catch(() => {});
  }

  private setupGraph() {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      const src = this.ctx.createMediaElementSource(this.el);
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 18000;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      src.connect(this.filter);
      this.filter.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      window.setTimeout(() => this.checkSilent(), 6000);
    } catch {
      this.ctx = null;
      this.filter = null;
    }
  }

  // Safety net: if the audio graph outputs silence (blocked by the browser), fall back to plain playback.
  private checkSilent() {
    if (!this.analyser || this.el.paused) return;
    const a = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(a);
    let dev = 0;
    for (const v of a) dev = Math.max(dev, Math.abs(v - 128));
    if (dev < 2) {
      const alt = this.makeEl(this.el.currentSrc || this.el.src, this.el.loop);
      alt.currentTime = this.el.currentTime;
      alt.volume = this.el.volume;
      this.el.pause();
      this.el = alt;
      this.filter = null;
      this.el.play().catch(() => {});
    }
  }

  get playing() {
    return !this.el.paused;
  }

  async start() {
    if (!this.ctx) this.setupGraph();
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {});
    this.el.volume = 0;
    await this.el.play();
    this.fadeTo(this.baseVolume(), 2500);
  }

  pause() {
    this.el.pause();
  }

  private fadeTo(vol: number, ms: number) {
    const v0 = this.el.volume;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      this.el.volume = v0 + (vol - v0) * k;
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }

  /** health 0..1 — muffles the song as the biome gets sick. */
  setHealth(h: number) {
    if (!this.filter || !this.ctx) return;
    const k = Math.min(1, Math.max(0, (h - 0.12) / 0.6));
    const smooth = k * k * (3 - 2 * k);
    this.filter.frequency.setTargetAtTime(450 + (18000 - 450) * smooth * smooth, this.ctx.currentTime, 0.5);
  }
}
