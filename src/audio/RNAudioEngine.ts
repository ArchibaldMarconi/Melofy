// Moteur audio pour Expo Go (expo-audio + expo-file-system, tous deux inclus dans Expo Go).
// Expo Go n'a pas de Web Audio : chaque son est donc calculé en JS (mixer.ts), encodé en WAV dans le cache,
// puis joué par un lecteur expo-audio. Le micro passe par AudioStream (PCM en temps réel) et la même chaîne
// d'analyse que la version navigateur (YIN + segmentation des notes). Dans un navigateur, Metro prend
// RNAudioEngine.web.ts à la place (Web Audio), avec la même interface.
import { AudioModule, createAudioPlayer, requestRecordingPermissionsAsync, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import type { Instrument, NoteEvent } from '../content/types';
import { beatsToMs } from '../engine/music';
import type { AudioEngine, PlayOptions, Playback } from './AudioEngine';
import type { MicFrame } from './segmenter';
import { rms, yin } from './yin';
import { encodeWav } from './wav';
import { renderDrone, type SynthVoice } from './synth';
import { Mixer, SR } from './mixer';
/** latence de démarrage d'un lecteur (estimation), ajoutée à l'heure de début annoncée */
const START_LATENCY_MS = 60;
const clock = () => (globalThis.performance?.now ? globalThis.performance.now() : Date.now());

let fileSeq = 0;
async function wavFile(data: Float32Array): Promise<File> {
  const f = new File(Paths.cache, `melofy-${Date.now()}-${fileSeq++}.wav`);
  await f.write(encodeWav(data));
  return f;
}

export class ExpoAudioEngine implements AudioEngine {
  latencyMs = 0;
  droneVolume = 0.6;
  private mixer = new Mixer();
  private players = new Set<AudioPlayer>();
  private files: File[] = [];
  private drone: AudioPlayer | null = null;
  private droneKey = '';
  private droneFile: File | null = null;
  private stream: { stop: () => void } | null = null;
  private modeReady = false;

  async init() { await this.mode(false); }
  now() { return clock(); }

  private async mode(recording: boolean) {
    if (this.modeReady && !recording) return;
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: recording, interruptionMode: 'mixWithOthers', shouldRouteThroughEarpiece: false });
      this.modeReady = true;
    } catch { /* le mode audio par défaut reste utilisable */ }
  }

  warm(instrument: Instrument) { this.mixer.warm(instrument); }

  private async playBuffer(data: Float32Array, volume = 1, loop = false): Promise<AudioPlayer> {
    const f = await wavFile(data);
    this.files.push(f);
    const p = createAudioPlayer({ uri: f.uri });
    p.volume = volume;
    p.loop = loop;
    p.play();
    return p;
  }

  private release(p: AudioPlayer) {
    try { p.pause(); p.remove(); } catch { /* déjà libéré */ }
    this.players.delete(p);
  }

  private cleanFiles() {
    if (this.files.length < 40) return;
    for (const f of this.files.splice(0, this.files.length - 20)) { try { f.delete(); } catch { /* déjà supprimé */ } }
  }

  private schedule(render: () => Float32Array, delayMs: number, totalMs: number): Playback {
    const startMs = clock() + delayMs + START_LATENCY_MS;
    let player: AudioPlayer | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let endTimer: ReturnType<typeof setTimeout>;
    const done = new Promise<void>((res) => {
      timer = setTimeout(async () => {
        if (stopped) return res();
        try {
          const p = await this.playBuffer(render());
          // coupé pendant que le fichier s'écrivait : il ne doit pas démarrer quand même
          if (stopped) { this.release(p); return res(); }
          player = p;
          this.players.add(player);
        } catch { /* son indisponible : l'exercice continue */ }
        endTimer = setTimeout(() => { if (player) this.release(player); this.cleanFiles(); res(); }, totalMs + 250);
      }, Math.max(0, delayMs - 20));
    });
    return {
      startMs, done,
      stop: () => { stopped = true; clearTimeout(timer); clearTimeout(endTimer); if (player) this.release(player); },
    };
  }

  play(events: NoteEvent[], o: PlayOptions): Playback {
    const tempo = o.tempo * (o.rate ?? 1);
    let endBeats = 0;
    for (const e of events) endBeats = Math.max(endBeats, e.start + e.dur);
    // le rendu se fait au moment de jouer, pas à l'appel (même comportement qu'avant)
    return this.schedule(() => this.mixer.renderEvents(events, o).data, o.delayMs ?? 60, beatsToMs(endBeats, tempo));
  }

  playNote(midi: number, instrument: Instrument = 'piano') {
    this.playBuffer(this.mixer.renderNote(midi, instrument)).then((p) => { this.players.add(p); setTimeout(() => this.release(p), 1500); }).catch(() => {});
  }

  clicks(beats: number, tempo: number, delayMs = 60, perBar = 4): Playback {
    const totalMs = (beats * 60000) / tempo;
    return this.schedule(() => this.mixer.renderClickTrack(beats, tempo, perBar).data, delayMs, totalMs);
  }

  /** Lecture d'un tampon déjà calculé (métronome, accordeur) : en boucle ou non */
  async playRaw(data: Float32Array, loop: boolean, volume = 1): Promise<{ stop: () => void }> {
    await this.mode(false);
    const p = await this.playBuffer(data, volume, loop);
    this.players.add(p);
    return { stop: () => this.release(p) };
  }

  render(voice: SynthVoice, midi = 0): Float32Array { return this.mixer.render(voice, midi); }

  renderLayers(layers: { notes: NoteEvent[]; voice: SynthVoice; volume: number }[], tempo: number, beats: number): Float32Array {
    return this.mixer.renderLayers(layers, tempo, beats);
  }

  renderClicks(clicks: { t: number; kind: 'fort' | 'temps' | 'sub' }[], durS: number): Float32Array { return this.mixer.renderClicks(clicks, durS); }
  get sampleRate() { return SR; }

  startDrone(midis: number[]) {
    const key = midis.join(',');
    this.stopDrone();
    this.droneKey = key;
    (async () => {
      if (!this.droneFile || this.droneFile.name !== `drone-${key.replace(/,/g, '_')}.wav`) {
        const f = new File(Paths.cache, `drone-${key.replace(/,/g, '_')}.wav`);
        if (!f.exists) await f.write(encodeWav(renderDrone(midis, SR)));
        this.droneFile = f;
      }
      if (this.droneKey !== key) return;
      const p = createAudioPlayer({ uri: this.droneFile.uri });
      p.loop = true;
      p.volume = Math.max(0.02, 0.5 * this.droneVolume);
      p.play();
      this.drone = p;
    })().catch(() => {});
  }

  stopDrone() {
    this.droneKey = '';
    if (this.drone) { try { this.drone.pause(); this.drone.remove(); } catch { /* déjà libéré */ } this.drone = null; }
  }

  async startMic(onFrame: (f: MicFrame) => void, opts: { frame?: number; minHz?: number } = {}) {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) throw new Error('micro_refuse');
    await this.mode(true);
    this.stopMic();
    let stream: InstanceType<typeof AudioModule.AudioStream>;
    try {
      stream = new AudioModule.AudioStream({ sampleRate: 44100, channels: 1, encoding: 'float32' });
    } catch { throw new Error('micro_indispo'); }
    const FRAME = opts.frame ?? 2048;
    let pending = new Float32Array(0);
    let origin: number | null = null;
    let consumed = 0; // échantillons déjà analysés depuis le début
    const sub = stream.addListener('audioStreamBuffer', (b) => {
      const sr = b.sampleRate;
      const chunk = new Float32Array(b.data);
      const mono = b.channels > 1 ? chunk.filter((_, i) => i % b.channels === 0) : chunk;
      if (origin === null) origin = clock() - b.timestamp * 1000;
      const merged = new Float32Array(pending.length + mono.length);
      merged.set(pending); merged.set(mono, pending.length);
      let off = 0;
      while (merged.length - off >= FRAME) {
        const frame = merged.subarray(off, off + FRAME);
        const level = rms(frame);
        const freq = level > 0.008 ? yin(frame, sr, 0.15, opts.minHz ?? 60) : null;
        onFrame({ freq, rms: level, tMs: origin + ((consumed + FRAME) / sr) * 1000 });
        off += FRAME / 2; // recouvrement de moitié : une analyse toutes les ~23 ms
        consumed += FRAME / 2;
      }
      pending = merged.slice(off);
    });
    try { await stream.start(); } catch { sub.remove(); throw new Error('micro_indispo'); }
    this.stream = { stop: () => { sub.remove(); try { stream.stop(); } catch { /* déjà arrêté */ } } };
  }

  stopMic() {
    if (!this.stream) return;
    this.stream.stop();
    this.stream = null;
  }

  stopAll() {
    for (const p of [...this.players]) this.release(p);
  }
}

export const audio = new ExpoAudioEngine();
