// Équilibre de la séance : catégories de travail, proportions visées, et partie de la séance.
//  - Partie 1 « partout » : sur l'écran (clavier ou manche virtuel), casque conseillé : oreille, rythme,
//    lecture-écriture, théorie, perroquet.
//  - Partie 2 « à l'instrument » : repérage, technique, chant, impro, repiquage ; l'appli demande d'abord
//    si l'élève a son instrument (sinon : à l'écran).
import type { ExerciseTemplate, GeneratorId } from '../content/types';

export type Category = 'oreille' | 'chant' | 'perroquet' | 'rythme' | 'lecture' | 'theorie' | 'technique' | 'impro';

/** Part du temps visée par catégorie, sur une séance (somme = 1). */
export const TARGETS: Record<Category, number> = {
  oreille: 0.20, // identifier, comparer, dictées : la base, mais pas seule
  rythme: 0.15, // pulsation, lecture rythmique : ce qui porte tout le reste
  lecture: 0.12, // lire et écrire sur la portée ou en tablature, dictées écrites
  theorie: 0.10,
  perroquet: 0.10, // imitation rythmique et mélodique : on apprend une langue en imitant
  chant: 0.05, // vérifie l'audition intérieure
  technique: 0.18, // repérage, jouer au tempo, fonctions sur l'instrument
  impro: 0.10, // question-réponse, jeu libre, repiquage
};

export const CATEGORY_LABEL: Record<Category, string> = {
  oreille: 'Oreille', chant: 'Chant', perroquet: 'Perroquet', rythme: 'Rythme', lecture: 'Lecture et écriture',
  theorie: 'Théorie', technique: 'Technique et repérage', impro: 'Impro et repiquage',
};

const READING: GeneratorId[] = ['read_staff', 'write_staff_note', 'staff_dictation', 'play_staff_notes', 'rhythm_dictation', 'grid_read'];

export function categoryOf(t: ExerciseTemplate): Category {
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

export const PART_CATEGORIES: Record<1 | 2, Category[]> = {
  1: ['oreille', 'rythme', 'lecture', 'theorie', 'perroquet'],
  2: ['technique', 'chant', 'impro', 'lecture'],
};
/** part du temps de chaque partie : la somme des cibles de ses catégories (≈ 2/3 et 1/3) */
export const PART_SHARE: Record<1 | 2, number> = {
  1: TARGETS.oreille + TARGETS.rythme + TARGETS.lecture + TARGETS.theorie + TARGETS.perroquet,
  2: TARGETS.technique + TARGETS.chant + TARGETS.impro,
};
