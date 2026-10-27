// Interface du moteur audio. L'UI et le moteur d'exercices ne dépendent que de cette interface.
// Implémentations : ExpoAudioEngine (expo-audio, compatible Expo Go) dans RNAudioEngine.ts, et WebAudioEngine
// (Web Audio, navigateur) dans RNAudioEngine.web.ts ; les deux partagent la synthèse de mixer.ts.
// Cible : moteur natif JSI/C++ prévu dans la stack (métronome précis, YIN natif).
import type { Instrument, NoteEvent } from '../content/types';
import type { MicFrame } from './segmenter';

export interface PlayOptions { tempo: number; instrument?: Instrument | 'clic' | 'bloc'; rate?: number; delayMs?: number; volume?: number   /** filtre passe-bas (Hz) : son plus sourd, pour qu'un accompagnement se distingue de la mélodie */
  lowpassHz?: number;
}
export interface Playback { startMs: number; done: Promise<void>; stop: () => void }

export interface AudioEngine {
  init(): Promise<void>;
  /** horloge commune à la lecture et à la capture (ms) */
  now(): number;
  play(events: NoteEvent[], o: PlayOptions): Playback;
  playNote(midi: number, instrument?: Instrument): void;
  /** perBar : temps par mesure (accent sur le 1er temps de chaque mesure) */
  clicks(beats: number, tempo: number, delayMs?: number, perBar?: number): Playback;
  startDrone(midis: number[]): void;
  /** volume du bourdon, 0 à 1 */
  droneVolume: number;
  stopDrone(): void;
  /** frame : taille d'analyse (échantillons) ; minHz : note la plus grave cherchée (basse : ~30 Hz) */
  startMic(onFrame: (f: MicFrame) => void, opts?: { frame?: number; minHz?: number }): Promise<void>;
  stopMic(): void;
  stopAll(): void;
  /** pré-calcule les sons de l'instrument en tâche de fond */
  warm?(instrument: Instrument): void;
  /** latence mesurée (sortie + entrée), soustraite à l'analyse */
  latencyMs: number;
}
