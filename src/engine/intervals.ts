// Entraînement quotidien des intervalles, jusqu'à ce qu'ils soient tous acquis (montants puis descendants).
// Suivi par intervalle et par sens sur les 20 dernières réponses ; acquis à 90 % (au moins 12 réponses).
export type IntervalStats = Record<string, boolean[]>;
/** ordre d'introduction : intervalles ouverts d'abord, puis tierces, secondes et septièmes, sixtes, puis le triton */
export const INTERVAL_ORDER = [12, 7, 5, 4, 3, 2, 10, 9, 8, 1, 11, 6];
export const intervalKey = (sens: 'montant' | 'descendant', semi: number) => `${sens}:${semi}`;

export function intervalMastered(stats: IntervalStats, key: string): boolean {
  const h = stats[key] ?? [];
  return h.length >= 12 && h.filter(Boolean).length / h.length >= 0.9;
}

/** Ce que la séance travaille aujourd'hui, ou null quand tout est acquis dans les deux sens. */
export function dailyIntervals(stats: IntervalStats): { sens: 'montant' | 'descendant'; intervalles: number[] } | null {
  for (const sens of ['montant', 'descendant'] as const) {
    const done = INTERVAL_ORDER.filter((x) => intervalMastered(stats, intervalKey(sens, x)));
    if (done.length === INTERVAL_ORDER.length) continue;
    // les acquis (pour les entretenir) + les deux prochains de la liste
    const next = INTERVAL_ORDER.filter((x) => !done.includes(x)).slice(0, 2);
    const set = INTERVAL_ORDER.filter((x) => done.includes(x) || next.includes(x));
    return { sens, intervalles: set.length >= 3 ? set : INTERVAL_ORDER.slice(0, 3) };
  }
  return null;
}

export function recordIntervalAnswers(stats: IntervalStats, entries: { key: string; ok: boolean }[]): IntervalStats {
  const out = { ...stats };
  for (const e of entries) out[e.key] = [...(out[e.key] ?? []), e.ok].slice(-20);
  return out;
}
