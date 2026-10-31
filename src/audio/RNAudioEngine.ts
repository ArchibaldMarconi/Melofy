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
import { FrameAnalyzer } from './analyzer';
import { encodeWav } from './wav';
import { renderDrone, type SynthVoice } from './synth';
import { Mixer, SR } from './mixer';
/**
 * Gain d'entrée appliqué au niveau mesuré : iOS capte en mode « mesure », sans contrôle automatique du gain, environ
 * trois fois plus bas qu'un navigateur (mesuré sur iPhone : note tenue ~0,015-0,06, silence ~0,004). Les seuils du
 * micro (accordeur, exercices, test du micro) gardent ainsi le même sens partout. La hauteur n'en dépend pas.
 */
const INPUT_GAIN = 3;
/** latence de démarrage d'un lecteur (estimation), ajoutée à l'heure de début annoncée */
const START_LATENCY_MS = 60;
const clock = () => (globalThis.performance?.now ? globalThis.performance.now() : Date.now());
/** journal des incidents du micro, en développement seulement (lu dans le terminal de Metro) */
const diag = (...a: unknown[]) => { if (__DEV__) console.log('[micro]', ...a); };

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
  /** retour au mode lecture après une écoute, attendu avant de jouer quoi que ce soit */
  private restoring: Promise<void> = Promise.resolve();

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
    await this.restoring;
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
      await this.restoring;
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
    this.stopMic();
    await this.restoring;
    await this.mode(true);

    let an: FrameAnalyzer | null = null; // créé au premier paquet, à la fréquence réelle
    // horloge de la capture, tenue en comptant les échantillons : l'horodatage envoyé par iOS n'est pas fiable (il
    // avance ~24 fois trop lentement : temps machine lu comme des nanosecondes)
    let origin: number | null = null; // heure (ms) du premier échantillon reçu
    let received = 0; // échantillons reçus depuis `origin`
    let lastPacket = clock();

    const onBuffer = (b: { data: ArrayBuffer; sampleRate: number; channels: number }) => {
      lastPacket = clock();
      const sr = b.sampleRate;
      if (!an) an = new FrameAnalyzer(sr, { frame: opts.frame, minHz: opts.minHz, gain: INPUT_GAIN });
      const chunk = new Float32Array(b.data);
      const mono = b.channels > 1 ? chunk.filter((_, i) => i % b.channels === 0) : chunk;
      if (origin === null) origin = clock() - (mono.length / sr) * 1000;
      received += mono.length;
      // plus d'un quart de seconde de retard sur le son reçu (JS occupé) : ce paquet est sauté plutôt que d'accumuler
      if (clock() - (origin + (received / sr) * 1000) > 250) { an.skip(mono.length); return; }
      an.push(mono, origin, onFrame);
    };

    const open = async () => {
      let stream: InstanceType<typeof AudioModule.AudioStream>;
      try {
        // AudioModule est un objet natif réexporté sous un nom, pas un espace de noms : import/namespace ne voit pas ses classes
        // 48 kHz : la fréquence du micro de l'iPhone, sans conversion
        // eslint-disable-next-line import/namespace
        stream = new AudioModule.AudioStream({ sampleRate: 48000, channels: 1, encoding: 'float32' });
      } catch (e) { diag('création du flux impossible', String(e)); throw new Error('micro_indispo'); }
      const sub = stream.addListener('audioStreamBuffer', onBuffer);
      try { await stream.start(); } catch (e) { diag('démarrage du flux impossible', String(e)); sub.remove(); stream.release(); throw new Error('micro_indispo'); }
      return { close: () => { sub.remove(); try { stream.stop(); } catch { /* déjà arrêté */ } stream.release(); } };
    };

    let cur: { close: () => void } | null = await open();
    let stopped = false;
    let reopening = false;
    lastPacket = clock();
    // expo-audio désactive la session audio quand un son se termine ou s'arrête, sans voir que le micro écoute : le flux
    // se tait alors. S'il ne livre plus rien depuis 0,7 s, on le rouvre (l'horloge repart du premier paquet suivant).
    const watch = setInterval(() => {
      if (stopped || reopening || clock() - lastPacket < 700) return;
      reopening = true;
      diag('flux muet : réouverture');
      cur?.close();
      cur = null;
      origin = null; received = 0; an = null;
      open()
        .then((c) => { if (stopped) c.close(); else { cur = c; lastPacket = clock(); } })
        .catch(() => { /* nouvel essai au prochain tour */ })
        .finally(() => { reopening = false; lastPacket = clock(); });
    }, 300);
    this.stream = { stop: () => { stopped = true; clearInterval(watch); cur?.close(); cur = null; } };
  }

  stopMic() {
    if (!this.stream) return;
    this.stream.stop();
    this.stream = null;
    // pendant l'écoute, iOS met la session audio en « enregistrement seul », qui coupe tout son, et ne la rend pas
    // à l'arrêt : on repasse en lecture, et chaque son attend que ce soit fait
    this.modeReady = false;
    this.restoring = this.mode(false);
  }

  stopAll() {
    for (const p of [...this.players]) this.release(p);
  }
}

export const audio = new ExpoAudioEngine();
