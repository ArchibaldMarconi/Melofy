import type { Params } from '../content/types';
import type { Area } from '../content/skills';

export type RootStackParamList = {
  Tabs: undefined;
  /** minutes : série chronométrée (onglet Pratique) — les exercices s'enchaînent jusqu'à la fin du temps */
  DeepLesson: { id: string };
  /** entraînement ciblé : quelques minutes sur un domaine, exercices choisis par l'appli */
  Focus: { area: Area };
  Practice: { templateId: string; params?: Params; seed: number; minutes?: number; /** série technique : + N BPM après chaque réussite */ tempoStep?: number } | { boss: string };
};

/** onglet Jouer : l'atelier et ses outils, ouverts sous la barre d'onglets */
export type PlayStackParamList = {
  Atelier: undefined;
  Metronome: undefined;
  Accordeur: undefined;
  /** accompagnement en boucle pour improviser */
  Jam: undefined;
};
