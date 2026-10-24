// Où se fait un exercice : partout à l'écran (oreille, rythme, lecture, théorie, perroquet) ou à l'instrument
// (repérage, technique, chant, impro, repiquage) ; la séance en déduit s'il faut écouter au micro.
import type { ExerciseTemplate, GeneratorId } from '../content/types';

type Category = 'oreille' | 'chant' | 'perroquet' | 'rythme' | 'lecture' | 'theorie' | 'technique' | 'impro';

const READING: GeneratorId[] = ['read_staff', 'write_staff_note', 'staff_dictation', 'play_staff_notes', 'rhythm_dictation', 'grid_read'];

function categoryOf(t: ExerciseTemplate): Category {
  if (t.mechanic === 'perroquet') return 'perroquet';
  if (t.mechanic === 'chanter') return 'chant';
  if (READING.includes(t.generator)) return 'lecture';
  if (t.domain === 'impro' || t.domain === 'repiquage') return 'impro';
  return t.domain as Category;
}

/** 1 = faisable partout à l'écran ; 2 = demande l'instrument (ou la voix). */
export function partOf(t: ExerciseTemplate): 1 | 2 {
  const c = categoryOf(t);
  if (c === 'perroquet') return 1; // imitation sur le clavier ou le manche à l'écran
  if (c === 'technique' || c === 'chant' || c === 'impro') return 2;
  if (t.generator === 'play_staff_notes') return 2;
  return 1;
}
