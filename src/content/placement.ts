// Test de placement par domaine : chaque domaine (rythme, oreille, théorie et lecture, technique) a sa propre
// suite de sondes et trouve sa propre limite. On peut être excellent en technique et débutant en rythme :
// l'appli donne alors les bases du rythme et du fil à retordre en technique.
// Dans chaque domaine : départ selon le niveau déclaré, sauts tant que tout est réussi, puis dichotomie,
// avec une seconde chance après un raté isolé.
import type { Domain, Params } from './types';
import { CONCEPTS } from './concepts';
import { TEMPLATES } from './templates';

export interface Probe { conceptId: string; templateId: string; params?: Params }
export type PlacementDomain = 'rythme' | 'oreille' | 'theorie' | 'technique';
export const PLACEMENT_DOMAINS: PlacementDomain[] = ['rythme', 'oreille', 'theorie', 'technique'];
export const PLACEMENT_LABEL: Record<PlacementDomain, string> = { rythme: 'Rythme', oreille: 'Oreille', theorie: 'Théorie et lecture', technique: 'Technique' };

export const DOMAIN_PROBES: Record<PlacementDomain, Probe[]> = {
  rythme: [
    { conceptId: 'pulsation', templateId: 'RY-1-01', params: { tempo: [80, 100], temps: 8 } },
    { conceptId: 'noire_blanche_silence', templateId: 'RY-1-03', params: { mesures: 2 } },
    { conceptId: 'degres_1_5', templateId: 'RY-2-01', params: { mesures: 2 } },
    { conceptId: 'tierce_majeure', templateId: 'RY-2-03', params: { mesures: 2 } },
    { conceptId: 'enchainer', templateId: 'RY-2-05', params: { mesures: 2 } },
    { conceptId: 'syncopes', templateId: 'RY-3-01', params: { mesures: 2, figures: ['noire', 'croches', 'syncope'] } },
    { conceptId: 'swing', templateId: 'RY-4-01', params: { mesures: 2, figures: ['noire', 'croches', 'triolet'] } },
    { conceptId: 'mesures_impaires', templateId: 'RY-5-03', params: { questions: 3, mesures_possibles: [3, 4, 5] } },
  ],
  oreille: [
    { conceptId: 'grave_aigu', templateId: 'OR-1-01', params: { ecart_min: 2, ecart_max: 5, questions: 3 } },
    { conceptId: 'tonique', templateId: 'OR-1-04', params: { questions: 3 } },
    { conceptId: 'degres_1_3', templateId: 'OR-1-06', params: { degres: [1, 2, 3], questions: 3 } },
    { conceptId: 'degres_1_5', templateId: 'OR-2-01', params: { degres: [1, 2, 3, 4, 5], questions: 3 } },
    { conceptId: 'gamme_majeure', templateId: 'OR-2-03', params: { questions: 3 } },
    { conceptId: 'tierce_majeure', templateId: 'OR-2-06', params: { questions: 3, intervalles: [2, 4] } },
    { conceptId: 'accords_145', templateId: 'OR-2-07', params: { questions: 3 } },
    { conceptId: 'degres_mineur', templateId: 'OR-3-02', params: { questions: 3, degres: ['1', '2', 'b3', '4', '5'] } },
    { conceptId: 'intervalles_tous', templateId: 'OR-3-05', params: { questions: 3, intervalles: [2, 3, 4, 5, 7, 9, 12] } },
    { conceptId: 'accords_diatoniques', templateId: 'OR-3-10', params: { questions: 3, degres: [1, 2, 4, 5, 6] } },
    { conceptId: 'accords_7', templateId: 'OR-4-01', params: { questions: 3, qualites: ['maj7', 'dom7', 'm7'] } },
    { conceptId: 'cadences', templateId: 'OR-4-02', params: { questions: 3, cadences: ['parfaite', 'plagale', 'demi'] } },
    { conceptId: 'modes', templateId: 'OR-5-01', params: { questions: 3, modes: ['ionien', 'dorien', 'mixolydien', 'eolien'] } },
    { conceptId: 'emprunts', templateId: 'OR-5-03', params: { questions: 3, accords: ['IV', 'iv', 'bVII'] } },
    { conceptId: 'modulation', templateId: 'OR-5-05', params: { questions: 3, modulations: ['reste', 'V', 'vi'] } },
  ],
  theorie: [
    { conceptId: 'notes_instrument', templateId: 'TH-1-02', params: { questions: 3, etendue: 1 } },
    { conceptId: 'noire_blanche_silence', templateId: 'TH-1-01', params: { questions: 3 } },
    { conceptId: 'lecture_portee', templateId: 'TH-1-03', params: { questions: 3, de: 60, a: 72 } },
    { conceptId: 'gamme_do', templateId: 'TH-1-05', params: { questions: 3 } },
    { conceptId: 'noms_notes', templateId: 'TH-2-03', params: { questions: 3, tonalites: ['C', 'G'] } },
    { conceptId: 'accords_145', templateId: 'TH-2-05' },
    { conceptId: 'triades', templateId: 'TH-3-02', params: { qualites: ['majeur', 'mineur', 'dim'] } },
    { conceptId: 'accords_7', templateId: 'TH-4-01', params: { qualites: ['maj7', 'dom7', 'm7'] } },
    { conceptId: 'cle_fa', templateId: 'TH-4-04', params: { questions: 3, de: 41, a: 57 } },
    { conceptId: 'modes', templateId: 'TH-5-01', params: { questions: 3 } },
  ],
  technique: [
    { conceptId: 'notes_instrument', templateId: 'TE-1-05', params: { nb_notes: 3 } },
    { conceptId: 'degres_1_3', templateId: 'TE-1-08', params: { fonctions: [2, 3], nb_cibles: 2 } },
    { conceptId: 'gamme_majeure', templateId: 'TE-2-08', params: { fonctions: [3, 5, 8], nb_cibles: 3 } },
    { conceptId: 'accords_145', templateId: 'TE-2-05' },
    { conceptId: 'triades', templateId: 'TE-3-03', params: { qualites: ['majeur', 'mineur', 'dim'] } },
    { conceptId: 'accords_7', templateId: 'TE-4-01', params: { qualites: ['maj7', 'dom7', 'm7'] } },
    { conceptId: 'cle_fa', templateId: 'TE-4-03', params: { nb_notes: 3, de: 41, a: 57 } },
    { conceptId: 'manche_complet', templateId: 'TE-5-03', params: { mode: 'dorien', fonctions: [3, 6, 7], nb_cibles: 2 } },
  ],
};

export type PlacementProfile = 'bases' | 'confirme' | 'avance';
/** départ (fraction de la suite de sondes du domaine) et saut pendant la phase montante */
export const PROFILES: Record<PlacementProfile, { label: string; line: string; start: number; jump: number }> = {
  bases: { label: 'Quelques bases', line: 'Je connais un peu mon instrument', start: 0, jump: 1 },
  confirme: { label: 'Confirmé', line: 'Je joue depuis un moment', start: 0.3, jump: 2 },
  avance: { label: 'Avancé', line: 'Je lis, je repique, j\'improvise', start: 0.55, jump: 2 },
};

/** Prochaine sonde dans une suite de n sondes, ou null quand la limite est trouvée. */
export function nextProbe(results: Record<number, boolean>, profile: PlacementProfile, n: number): number | null {
  const { start, jump } = PROFILES[profile];
  const tested = Object.keys(results).map(Number);
  if (!tested.length) return Math.min(Math.round(start * (n - 1)), n - 1);
  const passed = tested.filter((i) => results[i]);
  const lo = passed.length ? Math.max(...passed) : -1;
  const failsAbove = tested.filter((i) => !results[i] && i > lo).sort((a, b) => a - b);
  if (!failsAbove.length) {
    if (lo >= n - 1) return null;
    let k = Math.min(lo + jump, n - 1);
    while (k > lo && results[k] !== undefined) k--;
    if (k <= lo) { k = lo + 1; while (k < n && results[k] !== undefined) k++; }
    return k < n ? k : null;
  }
  const hi = failsAbove[0];
  const gap: number[] = [];
  for (let k = lo + 1; k < hi; k++) if (results[k] === undefined) gap.push(k);
  if (gap.length) return gap[Math.floor(gap.length / 2)];
  if (failsAbove.length === 1 && hi + 1 < n && results[hi + 1] === undefined) return hi + 1;
  return null;
}

/** indice de la plus haute sonde réussie (-1 si aucune) */
export const highestPassed = (results: Record<number, boolean>) =>
  Math.max(-1, ...Object.keys(results).map(Number).filter((i) => results[i]));

/** domaines où une notion a des exercices */
const domainsOf = (conceptId: string) => new Set<Domain>(TEMPLATES.filter((t) => t.concepts[0] === conceptId).map((t) => t.domain));

/**
 * Compétences validées dans un domaine : toutes les notions du parcours jusqu'à la plus haute sonde réussie,
 * qui ont des exercices dans ce domaine (les notions sautées en dessous sont considérées acquises).
 */
export function placedPairs(domain: PlacementDomain, results: Record<number, boolean>): { conceptId: string; domain: Domain }[] {
  const k = highestPassed(results);
  if (k < 0) return [];
  const upto = CONCEPTS.findIndex((c) => c.id === DOMAIN_PROBES[domain][k].conceptId);
  return CONCEPTS.slice(0, upto + 1).filter((c) => domainsOf(c.id).has(domain)).map((c) => ({ conceptId: c.id, domain }));
}

/**
 * Impro et repiquage mobilisent l'oreille ET l'instrument : validés jusqu'à la notion la moins avancée des deux.
 */
export function placedImproPairs(pairs: { conceptId: string; domain: Domain }[]): { conceptId: string; domain: Domain }[] {
  const idx = (d: Domain) => Math.max(-1, ...pairs.filter((p) => p.domain === d).map((p) => CONCEPTS.findIndex((c) => c.id === p.conceptId)));
  const upto = Math.min(idx('oreille'), idx('technique'));
  if (upto < 0) return [];
  return CONCEPTS.slice(0, upto + 1).flatMap((c) => (['impro', 'repiquage'] as Domain[]).filter((d) => domainsOf(c.id).has(d)).map((d) => ({ conceptId: c.id, domain: d })));
}
