// Où un exercice lit et écrit sa révision espacée : la seule fonction qui relie un exercice à sa carte FSRS.
// Une carte par compétence (entendre les degrés, trouver les notes sur le manche…), partagée par tous les
// exercices qui l'entraînent ; la difficulté propre à chaque exercice est suivie à part (niveau, escalier).
import type { CompetenceState, Domain, ExerciseTemplate } from '../content/types';
import { skillOf } from '../content/skills';
import { newCompetence } from './fsrs';

type T = Pick<ExerciseTemplate, 'generator'>;

export const cardKeyOf = (t: T): string => skillOf(t);

export const newSkillCard = (skill: string, domain: Domain): CompetenceState => ({ ...newCompetence(skill, domain), key: skill });

export const cardOf = (t: T, comps: Record<string, CompetenceState>) => comps[cardKeyOf(t)];

/** date de révision due (ms) si la carte de l'exercice est due, sinon null */
export function dueOfTemplate(t: T, comps: Record<string, CompetenceState>, now: number): number | null {
  const c = cardOf(t, comps);
  return c && c.reps > 0 && c.due <= now ? c.due : null;
}

export const lastReviewOfTemplate = (t: T, comps: Record<string, CompetenceState>) => cardOf(t, comps)?.lastReview ?? 0;

export const practicedTemplate = (t: T, comps: Record<string, CompetenceState>) => (cardOf(t, comps)?.reps ?? 0) > 0;
