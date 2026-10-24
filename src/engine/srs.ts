// Où un exercice lit et écrit sa révision espacée : la seule fonction qui relie un exercice à sa carte FSRS.
import type { CompetenceState, ExerciseTemplate } from '../content/types';

export const cardKeyOf = (t: Pick<ExerciseTemplate, 'concepts' | 'domain'>) => `${t.concepts[0]}:${t.domain}`;

export const cardOf = (t: Pick<ExerciseTemplate, 'concepts' | 'domain'>, comps: Record<string, CompetenceState>) => comps[cardKeyOf(t)];

/** date de révision due (ms) si la carte de l'exercice est due, sinon null */
export function dueOfTemplate(t: Pick<ExerciseTemplate, 'concepts' | 'domain'>, comps: Record<string, CompetenceState>, now: number): number | null {
  const c = cardOf(t, comps);
  return c && c.reps > 0 && c.due <= now ? c.due : null;
}

export const lastReviewOfTemplate = (t: Pick<ExerciseTemplate, 'concepts' | 'domain'>, comps: Record<string, CompetenceState>) => cardOf(t, comps)?.lastReview ?? 0;

export const practicedTemplate = (t: Pick<ExerciseTemplate, 'concepts' | 'domain'>, comps: Record<string, CompetenceState>) => (cardOf(t, comps)?.reps ?? 0) > 0;
