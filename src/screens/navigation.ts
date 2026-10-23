import type { Params } from '../content/types';

export type RootStackParamList = {
  Tabs: undefined;
  /** minutes : série chronométrée (onglet Pratique) — les exercices s'enchaînent jusqu'à la fin du temps */
  DeepLesson: { id: string };
  Practice: { templateId: string; params?: Params; seed: number; lessonConceptId?: string; minutes?: number; /** série technique : + N BPM après chaque réussite */ tempoStep?: number } | { boss: string };
};
