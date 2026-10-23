// Barème XP, note SRS et échelle d'aides (section « Règles de jeu » du document).
import type { ExerciseTemplate, Outcome, Rating } from '../content/types';

export const XP = {
  base: 10,
  niveauMult: { 1: 1.0, 2: 1.25, 3: 1.5, 4: 1.75, 5: 2.0 } as Record<number, number>,
  palierBonus: 0.1,
  ratingMult: { 1: 0.1, 2: 0.5, 3: 0.8, 4: 1.0 } as Record<Rating, number>,
  reviewBonus: 0.2,
  reviewBonusMinDays: 7,
  streak5Bonus: 5,
  sessionDone: 20,
  sessionPerfect: 30,
  boss: 200,
  /** retour bêta : les leçons rapportent des XP (lue, validée, confirmée), une seule fois chacune */
  lessonSeen: 20,
  lessonDone: 50,
  lessonConfirmed: 30,
  helpCost: { 2: 2, 3: 3, 4: 5 } as Record<number, number>,
  maxAttempts: 3,
};

export interface HelpLevel { level: 2 | 3 | 4 | 5; label: string; autoAfter: string; maxRating: Rating }
export const HELPS: HelpLevel[] = [
  { level: 2, label: 'Ralentir à 70 %', autoAfter: '1 erreur', maxRating: 3 },
  { level: 3, label: 'Indice', autoAfter: '2 erreurs', maxRating: 3 },
  { level: 4, label: 'Voir la correction', autoAfter: '2 essais ratés', maxRating: 2 },
  { level: 5, label: 'Démonstration', autoAfter: '3 essais ratés', maxRating: 1 },
];

export function computeRating(o: Pick<Outcome, 'success' | 'attempt' | 'precision' | 'helps' | 'timeMs'>, expectedMs: number): Rating {
  const maxHelp = o.helps.length ? Math.max(...o.helps) : 0;
  if (!o.success || maxHelp >= 5) return 1;
  let r: Rating;
  if (o.attempt === 1 && o.precision >= 0.95 && maxHelp === 0 && o.timeMs <= expectedMs * 1.5) r = 4;
  else if (o.attempt === 1) r = 3;
  else r = 2;
  if (maxHelp >= 4) r = Math.min(r, 2) as Rating;
  else if (maxHelp >= 2) r = Math.min(r, 3) as Rating;
  return r;
}

export function computeXp(t: ExerciseTemplate, rating: Rating, helps: number[], opts: { reviewAfterDays?: number; alreadyMasteredOutsideSrs?: boolean } = {}): number {
  if (opts.alreadyMasteredOutsideSrs) return 0;
  const maxHelp = helps.length ? Math.max(...helps) : 0;
  if (maxHelp >= 5) return 1;
  let xp = XP.base * XP.niveauMult[t.niveau] * (1 + XP.palierBonus * (t.palier - 1)) * XP.ratingMult[rating];
  if (rating >= 2 && (opts.reviewAfterDays ?? 0) >= XP.reviewBonusMinDays) xp *= 1 + XP.reviewBonus;
  const cost = [...new Set(helps)].reduce((s, h) => s + (XP.helpCost[h] ?? 0), 0);
  return Math.max(1, Math.round(xp - cost));
}

/** Niveau joueur : le niveau L demande 50·L·(L−1) XP cumulés (0, 100, 300, 600…). */
export function levelFromXp(xp: number): { level: number; current: number; next: number } {
  let L = 1;
  while (50 * (L + 1) * L <= xp) L++;
  return { level: L, current: 50 * L * (L - 1), next: 50 * (L + 1) * L };
}
