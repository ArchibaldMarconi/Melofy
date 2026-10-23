// Accordeur (page 5 du plan) : préréglages, note la plus proche, écart en cents, mode guidé corde par corde.
import { freqToMidi, noteName } from './music';

export interface TuningPreset { id: string; label: string; group: string; /** cordes, de la plus grave à la plus aiguë (MIDI) ; vide = chromatique */ strings: number[] }

export const TUNER_PRESETS: TuningPreset[] = [
  { id: 'chromatique', label: 'Chromatique', group: 'Libre', strings: [] },
  { id: 'guitare', label: 'Guitare standard', group: 'Guitare', strings: [40, 45, 50, 55, 59, 64] },
  { id: 'drop_d', label: 'Drop D', group: 'Accordages abaissés', strings: [38, 45, 50, 55, 59, 64] },
  { id: 'drop_c', label: 'Drop C', group: 'Accordages abaissés', strings: [36, 43, 48, 53, 57, 62] },
  { id: 'demi_ton', label: 'Un demi-ton plus bas', group: 'Accordages abaissés', strings: [39, 44, 49, 54, 58, 63] },
  { id: 'open_g', label: 'Open G', group: 'Accordages ouverts', strings: [38, 43, 50, 55, 59, 62] },
  { id: 'open_d', label: 'Open D', group: 'Accordages ouverts', strings: [38, 45, 50, 54, 57, 62] },
  { id: 'dadgad', label: 'DADGAD', group: 'Accordages ouverts', strings: [38, 45, 50, 55, 57, 62] },
  { id: 'basse', label: 'Basse standard', group: 'Basse', strings: [28, 33, 38, 43] },
  { id: 'basse5', label: 'Basse 5 cordes', group: 'Basse', strings: [23, 28, 33, 38, 43] },
  { id: 'violon', label: 'Violon', group: 'Cordes frottées', strings: [55, 62, 69, 76] },
];
export const presetById = (id: string) => TUNER_PRESETS.find((p) => p.id === id) ?? TUNER_PRESETS[1];

/** écart en cents d'une fréquence par rapport à une note MIDI */
export const centsOff = (freq: number, midi: number) => 100 * (freqToMidi(freq) - midi);

/** note la plus proche et écart (mode chromatique) */
export function nearest(freq: number): { midi: number; name: string; cents: number } {
  const m = freqToMidi(freq);
  const midi = Math.round(m);
  return { midi, name: noteName(midi), cents: 100 * (m - midi) };
}

/** à quelle corde (index) la note jouée correspond-elle le mieux */
export function closestString(freq: number, strings: number[]): number {
  const m = freqToMidi(freq);
  let best = 0;
  for (let i = 1; i < strings.length; i++) if (Math.abs(strings[i] - m) < Math.abs(strings[best] - m)) best = i;
  return best;
}

/** une corde est accordée quand l'écart reste sous ce seuil pendant HOLD_MS */
export const IN_TUNE_CENTS = 5;
export const HOLD_MS = 700;

/** lissage : médiane des dernières mesures (ignore les sauts d'octave isolés) */
export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/** Mode guidé : la corde verrouillée, puis la suivante non accordée une fois celle-ci validée */
export function nextString(done: boolean[], from: number): number | null {
  for (let k = 1; k <= done.length; k++) {
    const i = (from + k) % done.length;
    if (!done[i]) return i;
  }
  return null;
}

/** nom court d'une corde : la note sans octave, en français (mi, la, ré…) */
export const stringLabel = (midi: number) => noteName(midi).replace(/-?\d+$/, '');
