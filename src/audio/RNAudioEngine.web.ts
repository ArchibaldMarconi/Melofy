// Moteur audio du navigateur (Metro prend ce fichier à la place de RNAudioEngine.ts pour le web).
// Mêmes sons que sur le téléphone (mixer.ts), joués par Web Audio : départ à l'échantillon près, boucles sans
// trou, aucun fichier écrit. Le micro passe par getUserMedia, avec la même analyse (YIN + segmentation).
import type { Instrument, NoteEvent } from '../content/types';
import { beatsToMs } from '../engine/music';
import type { AudioEngine, PlayOptions, Playback } from './AudioEngine';
import type { MicFrame } from './segmenter';
import { detectPitch, rms } from './yin';
import { renderDrone, type SynthVoice } from './synth';
import { Mixer, SR } from './mixer';

const clock = () => (globalThis.performance?.now ? globalThis.performance.now() : Date.now());

type Ctx = AudioContext;
type Started = { src: AudioBufferSourceNode; gain: GainNode; startMs: number };

export class WebAudioEngine implements AudioEngine {
  latencyMs = 0;
  private _droneVolume = 0.6;
  private mixer = new Mixer();
  private ctx: Ctx | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private drone: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private droneBuffers = new Map<string, AudioBuffer>();
  private mic: { stop: () => void } | null = null;

  get droneVolume() { return this._droneVolume; }
  set droneVolume(v: number) {
    this._droneVolume = v;
    if (this.drone) this.drone.gain.gain.value = Math.max(0.02, 0.5 * v);
  }

  /** le contexte audio, créé au premier son et réveillé à chaque geste (les navigateurs l'endorment sinon) */
  private ac(): Ctx {
    if (!this.ctx) {
      const C = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        ?? (globalThis as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new C();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  async init() {
    const c = this.ac();
    if (c.state !== 'running') await c.resume().catch(() => {});
  }
  now() { return clock(); }
  warm(instrument: Instrument) { this.mixer.warm(instrument); }

  private buffer(data: Float32Array): AudioBuffer {
    const b = this.ac().createBuffer(1, Math.max(1, data.length), SR);
    b.getChannelData(0).set(data);
    return b;
  }

  /** démarre un tampon dans `delayMs` ; `startMs` est l'heure (horloge commune) où on l'entend */
  private start(buf: AudioBuffer, o: { delayMs?: number; loop?: boolean; volume?: number } = {}): Started {
    const c = this.ac();
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = !!o.loop;
    const gain = c.createGain();
    gain.gain.value = o.volume ?? 1;
    src.connect(gain);
    gain.connect(c.destination);
    const delay = Math.max(0, o.delayMs ?? 0);
    src.start(c.currentTime + delay / 1000);
    const outLatency = ((c as Ctx & { outputLatency?: number }).outputLatency ?? c.baseLatency ?? 0) * 1000;
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
    return { src, gain, startMs: clock() + delay + outLatency };
  }

  private stopSource(src: AudioBufferSourceNode) {
    try { src.stop(); } catch { /* déjà arrêté */ }
    try { src.disconnect(); } catch { /* déjà déconnecté */ }
    this.sources.delete(src);
  }

  private schedule(data: Float32Array, delayMs: number, totalMs: number): Playback {
    const { src, startMs } = this.start(this.buffer(data), { delayMs });
    let resolve!: () => void;
    const done = new Promise<void>((r) => { resolve = r; });
    const t = setTimeout(resolve, delayMs + totalMs + 250);
    return { startMs, done, stop: () => { clearTimeout(t); this.stopSource(src); resolve(); } };
  }

  play(events: NoteEvent[], o: PlayOptions): Playback {
    const tempo = o.tempo * (o.rate ?? 1);
    let endBeats = 0;
    for (const e of events) endBeats = Math.max(endBeats, e.start + e.dur);
    return this.schedule(this.mixer.renderEvents(events, o).data, o.delayMs ?? 60, beatsToMs(endBeats, tempo));
  }

  playNote(midi: number, instrument: Instrument = 'piano') {
    try { this.start(this.buffer(this.mixer.renderNote(midi, instrument))); } catch { /* son indisponible */ }
  }

  clicks(beats: number, tempo: number, delayMs = 60, perBar = 4): Playback {
    const { data, totalMs } = this.mixer.renderClickTrack(beats, tempo, perBar);
    return this.schedule(data, delayMs, totalMs);
  }

  /** lecture d'un tampon déjà calculé (métronome, jam) : en boucle ou non */
  async playRaw(data: Float32Array, loop: boolean, volume = 1): Promise<{ stop: () => void }> {
    await this.init();
    const { src } = this.start(this.buffer(data), { loop, volume });
    return { stop: () => this.stopSource(src) };
  }

  render(voice: SynthVoice, midi = 0): Float32Array { return this.mixer.render(voice, midi); }
  renderLayers(layers: { notes: NoteEvent[]; voice: SynthVoice; volume: number }[], tempo: number, beats: number): Float32Array {
    return this.mixer.renderLayers(layers, tempo, beats);
  }
  renderClicks(clicks: { t: number; kind: 'fort' | 'temps' | 'sub' }[], durS: number): Float32Array { return this.mixer.renderClicks(clicks, durS); }
  get sampleRate() { return SR; }

  startDrone(midis: number[]) {
    this.stopDrone();
    try {
      const key = midis.join(',');
      let buf = this.droneBuffers.get(key);
      if (!buf) { buf = this.buffer(renderDrone(midis, SR)); this.droneBuffers.set(key, buf); }
      const { src, gain } = this.start(buf, { loop: true, volume: Math.max(0.02, 0.5 * this._droneVolume) });
      this.sources.delete(src); // le bourdon a sa propre vie : stopAll ne le coupe pas
      this.drone = { src, gain };
    } catch { /* son indisponible */ }
  }

  stopDrone() {
    if (!this.drone) return;
    try { this.drone.src.stop(); } catch { /* déjà arrêté */ }
    try { this.drone.src.disconnect(); } catch { /* déjà déconnecté */ }
    this.drone = null;
  }

  async startMic(onFrame: (f: MicFrame) => void, opts: { frame?: number; minHz?: number } = {}) {
    const md = (globalThis.navigator as Navigator | undefined)?.mediaDevices;
    if (!md?.getUserMedia) throw new Error('micro_indispo');
    let stream: MediaStream;
    try {
      // sans traitement : l'annulation d'écho et le contrôle de gain effaceraient l'instrument
      stream = await md.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      throw new Error((e as { name?: string })?.name === 'NotAllowedError' ? 'micro_refuse' : 'micro_indispo');
    }
    this.stopMic();
    const c = this.ac();
    await c.resume().catch(() => {});
    const sr = c.sampleRate;
    const input = c.createMediaStreamSource(stream);
    const proc = c.createScriptProcessor(1024, 1, 1);
    const mute = c.createGain();
    mute.gain.value = 0;
    input.connect(proc);
    proc.connect(mute);
    mute.connect(c.destination);
    // une fenêtre d'analyse de même durée qu'au téléphone (2048 échantillons à 44,1 kHz ≈ 46 ms)
    const FRAME = Math.round(((opts.frame ?? 2048) / 44100) * sr);
    let pending = new Float32Array(0);
    let origin: number | null = null;
    let consumed = 0;
    proc.onaudioprocess = (e) => {
      const chunk = e.inputBuffer.getChannelData(0);
      if (origin === null) origin = clock() - (chunk.length / sr) * 1000;
      const merged = new Float32Array(pending.length + chunk.length);
      merged.set(pending); merged.set(chunk, pending.length);
      let off = 0;
      while (merged.length - off >= FRAME) {
        const frame = merged.subarray(off, off + FRAME);
        const level = rms(frame);
        const freq = level > 0.008 ? detectPitch(frame, sr, { minHz: opts.minHz ?? 60 }) : null;
        onFrame({ freq, rms: level, tMs: origin + ((consumed + FRAME) / sr) * 1000 });
        off += FRAME / 2;
        consumed += FRAME / 2;
      }
      pending = merged.slice(off);
    };
    this.mic = {
      stop: () => {
        proc.onaudioprocess = null;
        try { input.disconnect(); proc.disconnect(); mute.disconnect(); } catch { /* déjà déconnecté */ }
        stream.getTracks().forEach((t) => t.stop());
      },
    };
  }

  stopMic() {
    if (!this.mic) return;
    this.mic.stop();
    this.mic = null;
  }

  stopAll() {
    for (const s of [...this.sources]) this.stopSource(s);
  }
}

export const audio = new WebAudioEngine();
