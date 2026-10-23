// FSRS-4.5 (Free Spaced Repetition Scheduler), poids par défaut.
// Le SRS suit des compétences (concept × domaine), pas des exercices.
import type { CompetenceState, Domain, Rating } from '../content/types';

const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = 19 / 81;
export const REQUEST_RETENTION = 0.9;
export const MASTERY_R = 0.8;
const DAY = 86_400_000;

const clampD = (d: number) => Math.min(10, Math.max(1, d));

export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

export function intervalDays(stability: number, retention = REQUEST_RETENTION): number {
  const i = (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  return Math.max(1, Math.round(i));
}

const initD = (g: Rating) => clampD(W[4] - (g - 3) * W[5]);

export function newCompetence(conceptId: string, domain: Domain): CompetenceState {
  return { key: `${conceptId}:${domain}`, conceptId, domain, stability: 0, difficulty: 0, lastReview: 0, due: 0, reps: 0, lapses: 0, tempoCible: null };
}

export function review(c: CompetenceState, g: Rating, now: number): CompetenceState {
  let S: number;
  let D: number;
  if (c.reps === 0) {
    S = W[g - 1];
    D = initD(g);
  } else {
    const elapsed = Math.max(0, (now - c.lastReview) / DAY);
    const R = retrievability(elapsed, c.stability);
    const dPrime = c.difficulty - W[6] * (g - 3);
    D = clampD(W[7] * initD(4) + (1 - W[7]) * dPrime);
    if (g === 1) {
      S = W[11] * Math.pow(D, -W[12]) * (Math.pow(c.stability + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R));
      S = Math.min(S, c.stability);
    } else {
      const hard = g === 2 ? W[15] : 1;
      const easy = g === 4 ? W[16] : 1;
      S = c.stability * (Math.exp(W[8]) * (11 - D) * Math.pow(c.stability, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1) * hard * easy + 1);
    }
  }
  // Un échec revient dans la journée suivante ; sinon intervalle FSRS.
  const days = g === 1 ? 1 : intervalDays(S);
  const ok = g >= 2;
  return {
    ...c, stability: S, difficulty: D, lastReview: now, due: now + days * DAY, reps: c.reps + 1, lapses: c.lapses + (g === 1 && c.reps > 0 ? 1 : 0),
    successes: successesOf(c) + (ok ? 1 : 0), firstSuccess: c.firstSuccess ?? (ok ? now : undefined),
  };
}

export function currentR(c: CompetenceState | undefined, now: number): number {
  if (!c || c.reps === 0) return 0;
  return retrievability((now - c.lastReview) / DAY, c.stability);
}

const successesOf = (c: CompetenceState) => c.successes ?? Math.max(0, c.reps - c.lapses);

/** Acquise : réussie au moins une fois. Suffit pour ouvrir la suite (on apprend en avançant). */
export const isAcquired = (c: CompetenceState | undefined) => !!c && successesOf(c) >= 1;

/**
 * Maîtrisée : rappel prédit ≥ 80 %, au moins 2 réussites, et ces réussites sur des jours différents
 * (réviser 2 fois le même soir n'est pas retenir). Sert aux médailles, au boss et à la règle d'équilibre.
 */
export const isMastered = (c: CompetenceState | undefined, now: number) =>
  !!c && successesOf(c) >= 2 && c.lastReview - (c.firstSuccess ?? c.lastReview) >= 20 * 3_600_000 && currentR(c, now) >= MASTERY_R;

export type Medal = 'aucune' | 'debut' | 'bronze' | 'argent' | 'or';
export function medal(c: CompetenceState | undefined): Medal {
  if (!c || c.reps === 0) return 'aucune';
  if (c.stability >= 30) return 'or';
  if (c.stability >= 10) return 'argent';
  if (c.stability >= 2) return 'bronze';
  return 'debut';
}
