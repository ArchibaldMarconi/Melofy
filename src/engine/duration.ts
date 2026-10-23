// Durée réaliste d'un exercice, en secondes : écoute, réponse, lecture de la consigne, essais ratés, écran de résultat.
// Une fois l'exercice joué, la moyenne mesurée (avgTimeS dans le store) remplace cette estimation.
import type { ExerciseTemplate, Variant } from '../content/types';
import { REFERENCE_BEATS, REFERENCE_TEMPO } from './music';

const lenBeats = (notes: { start: number; dur: number }[]) => (notes.length ? Math.max(...notes.map((n) => n.start + n.dur)) : 0);

export function estimateSeconds(t: ExerciseTemplate, v: Variant, opts: { firstTime?: boolean; lesson?: boolean } = {}): number {
  const beat = 60 / v.tempo;
  const ref = v.referenceTonic ? (REFERENCE_BEATS * 60) / REFERENCE_TEMPO + 0.5 : 0;
  const stim = lenBeats(v.stimulus) * beat;
  let s: number;
  switch (v.answerUI) {
    case 'quiz': {
      const items = v.expected.kind === 'quiz' ? v.expected.items : [];
      // écoute de la question + réflexion + 30 % d'erreurs revues (réécoute, « Question suivante »)
      s = items.reduce((acc, it) => acc + lenBeats(it.stimulus) * (60 / it.tempo) + (it.referenceTonic ? (REFERENCE_BEATS * 60) / REFERENCE_TEMPO : 0) + 3.5 + 0.3 * 5, 0);
      break;
    }
    case 'tap':
      s = v.simultaneous ? v.countInBeats * beat + v.captureMs / 1000 + 2 : stim * 2.2 + 4;
      break;
    case 'sing':
      s = ref + stim + (v.expected.kind === 'sequence' && v.expected.notes.length > 1 ? v.expected.notes.length * 1.8 + 4 : 5);
      break;
    case 'select':
      s = 12 + (v.expected.kind === 'set' ? v.expected.midis.length * 2.5 : 0);
      break;
    case 'degrees':
      s = ref + stim + (v.expected.kind === 'transcribe' ? v.expected.items.length * 2.5 : 0) + 5;
      break;
    case 'staff':
      s = ref + stim + (v.expected.kind === 'sequence' ? v.expected.notes.length * 4 : 8) + 6;
      break;
    case 'figures':
      s = stim + (v.expected.kind === 'figures' ? v.expected.items.length * 3 : 8) + 6;
      break;
    case 'free':
      s = v.captureMs / 1000 + 3;
      break;
    default:
      s = v.simultaneous
        ? v.countInBeats * beat + v.captureMs / 1000 + 2
        : ref + stim + (v.expected.kind === 'sequence' ? v.expected.notes.length * 1.6 : 8) + 5;
  }
  if (v.transcription) s += v.transcription.length * 3 + 8;
  // en moyenne 1,4 essai (les essais ratés réécoutent et refont la saisie)
  if (v.answerUI !== 'free') s *= 1.4;
  // consigne (plus longue la 1re fois, avec le point de leçon), résultat
  s += (opts.firstTime ? 25 : 8) + 5;
  if (opts.lesson) s += 35;
  return Math.round(s);
}
