// La difficulté d'un exercice, résolue en un seul endroit.
//  - les réglages du gabarit, puis le palier de difficulté atteint (progression écrite pour cet exercice) ;
//  - au-delà du dernier palier écrit, des paliers « sans plafond » font encore monter les dimensions génériques
//    (tempo, longueur des phrases, toutes les tonalités, moins d'aide visuelle ou sonore) : un musicien avancé
//    trouve toujours du fil à retordre ;
//  - les réglages imposés par le contexte (leçon, échelle de la séance, choix de l'élève) fixent le CONTENU
//    et priment toujours : la difficulté ne fait jamais sortir de ce qui a été expliqué.
import type { ExerciseTemplate, Params, ParamValue } from '../content/types';

/** nombre de paliers « sans plafond » ajoutés après la progression écrite */
export const OVERDRIVE = 3;

export const maxLevel = (t: ExerciseTemplate) => Math.max(0, (t.progression?.length ?? 1) - 1);

const scaleTempo = (v: ParamValue, k: number, cap: number): ParamValue =>
  Array.isArray(v) ? (v as number[]).map((x) => Math.min(cap, Math.round(Number(x) * k))) : typeof v === 'number' ? Math.min(cap, Math.round(v * k)) : v;

/** ce que chaque palier sans plafond change, dimension par dimension (seulement si l'exercice a ce réglage) */
const DIMENSIONS: Record<string, (v: ParamValue, extra: number) => ParamValue> = {
  tempo: (v, e) => scaleTempo(v, 1.1 ** e, 200),
  tempo_cle: (v, e) => scaleTempo(v, 1.08 ** e, 220),
  nb_notes: (v, e) => (typeof v === 'number' ? Math.min(12, v + e) : v),
  nb_cibles: (v, e) => (typeof v === 'number' ? Math.min(8, v + e) : v),
  nb_accords: (v, e) => (typeof v === 'number' ? Math.min(8, v + e) : v),
  mesures: (v, e) => (typeof v === 'number' ? Math.min(4, v + Math.floor(e / 2)) : v),
  tonalite: (v) => (v === 'auto' || typeof v === 'string' ? 'varie' : v),
  apercus: () => false,
  clic: () => false,
  conjoint: () => false,
  bourdon: (v, e) => (e >= 2 ? false : v),
  guide: (v, e) => (v === 'complet' || v === 'fondamentale' ? (e >= 2 ? 'aucun' : v === 'complet' ? 'fondamentale' : 'aucun') : v),
};

/** dimensions qu'un jeu de réglages peut encore faire monter */
export function overdriveKeys(p: Params): string[] {
  return Object.keys(DIMENSIONS).filter((k) => p[k] !== undefined && JSON.stringify(DIMENSIONS[k](p[k], OVERDRIVE)) !== JSON.stringify(p[k]));
}

/** le plus haut niveau atteignable : progression écrite, puis paliers sans plafond s'il reste une dimension à monter */
export const maxDifficulty = (t: ExerciseTemplate) => maxLevel(t) + (overdriveKeys(authored(t, maxLevel(t))).length ? OVERDRIVE : 0);

const authored = (t: ExerciseTemplate, level: number): Params => {
  const step = t.progression?.[Math.min(level, (t.progression?.length ?? 1) - 1)] ?? {};
  return { ...t.params, ...step };
};

/** réglages du gabarit < palier atteint (écrit, puis sans plafond) < réglages imposés par le contexte */
export function resolveParams(t: ExerciseTemplate, overrides?: Params, level = 0): Params {
  const base = authored(t, level);
  const extra = Math.max(0, level - maxLevel(t));
  const out: Params = { ...base };
  if (extra) for (const k of Object.keys(DIMENSIONS)) if (base[k] !== undefined && !(overrides && k in overrides)) out[k] = DIMENSIONS[k](base[k], Math.min(extra, OVERDRIVE));
  return { ...out, ...(overrides ?? {}) };
}

/**
 * Escalier de difficulté (vise ~80 % de réussites franches) : un cran plus dur après 3 réussites nettes d'affilée
 * (1er essai, sans aide, précision ≥ 90 %), un cran plus facile après un échec ou une réussite arrachée au dernier essai.
 */
export function staircase(cur: number, run: number, o: { success: boolean; attempt: number; helps: number[]; precision: number }, max: number): { level: number; run: number; change: -1 | 0 | 1 } {
  const clean = o.success && o.attempt === 1 && o.helps.length === 0 && o.precision >= 0.9;
  const failed = !o.success || o.attempt >= 3;
  if (clean) {
    const r = run + 1;
    if (r >= 3 && cur < max) return { level: cur + 1, run: 0, change: 1 };
    return { level: cur, run: Math.min(r, 3), change: 0 };
  }
  if (failed && cur > 0) return { level: cur - 1, run: 0, change: -1 };
  return { level: cur, run: 0, change: 0 };
}
