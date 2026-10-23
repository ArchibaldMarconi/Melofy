// Déblocage : un exercice s'ouvre quand les notions préalables sont acquises DANS SON DOMAINE.
// (L'ancienne règle d'homogénéité, « un domaine ne peut pas avoir plus d'un palier d'avance », est retirée :
// les domaines sont indépendants.)
import type { CompetenceState, Concept, Domain, ExerciseTemplate } from '../content/types';
import { isAcquired, isMastered } from './fsrs';
import { TEMPLATES } from '../content/templates';

const DOMAIN_FR: Record<Domain, string> = { rythme: 'rythme', oreille: 'oreille', theorie: 'théorie', technique: 'technique', impro: 'impro', repiquage: 'repiquage' };

export type CompetenceMap = Record<string, CompetenceState>;

export function conceptMastered(conceptId: string, comps: CompetenceMap, now: number): boolean {
  return Object.values(comps).some((c) => c.conceptId === conceptId && isMastered(c, now));
}

export function conceptAcquired(conceptId: string, comps: CompetenceMap): boolean {
  return Object.values(comps).some((c) => c.conceptId === conceptId && isAcquired(c));
}

/** Une notion s'ouvre dès que ses prérequis sont acquis ; le SRS se charge ensuite de les consolider. */
export function conceptUnlocked(c: Concept, comps: CompetenceMap, _now?: number): boolean {
  return c.prerequis.every((p) => conceptAcquired(p, comps));
}

/** palier atteint par domaine = plus haut palier dont un concept est maîtrisé dans ce domaine */
export function domainLevels(concepts: Concept[], comps: CompetenceMap, now: number): Record<Domain, number> {
  const lv = { rythme: 1, oreille: 1, theorie: 1, technique: 1, impro: 1, repiquage: 1 } as Record<Domain, number>;
  for (const c of Object.values(comps)) {
    const concept = concepts.find((x) => x.id === c.conceptId);
    if (concept && isMastered(c, now)) lv[c.domain] = Math.max(lv[c.domain], concept.palier);
  }
  return lv;
}

// ---------- Prérequis par domaine ----------
// Chaque domaine progresse à son rythme : on peut être excellent en technique et débutant en rythme.
// Un exercice de rythme ne demande que les bases rythmiques ; quand une notion préalable n'a pas d'exercice
// dans ce domaine, on remonte à ses propres prérequis. Impro et repiquage suivent la progression de l'oreille.
let domainsByConcept: Map<string, Set<Domain>> | null = null;
function domainsOf(conceptId: string): Set<Domain> {
  if (!domainsByConcept) {
    domainsByConcept = new Map();
    for (const t of TEMPLATES) for (const cid of t.concepts) {
      if (!domainsByConcept.has(cid)) domainsByConcept.set(cid, new Set());
      domainsByConcept.get(cid)!.add(t.domain);
    }
  }
  return domainsByConcept.get(conceptId) ?? new Set();
}

export function prereqAcquiredFor(pid: string, domain: Domain, concepts: Concept[], comps: CompetenceMap, seen = new Set<string>()): boolean {
  // impro et repiquage reposent d'abord sur l'oreille : ils suivent la progression de l'oreille
  if (domain === 'impro' || domain === 'repiquage') return prereqAcquiredFor(pid, 'oreille', concepts, comps, seen);
  if (domainsOf(pid).has(domain)) return Object.values(comps).some((c) => c.conceptId === pid && c.domain === domain && isAcquired(c));
  if (seen.has(pid)) return true;
  seen.add(pid);
  const c = concepts.find((x) => x.id === pid);
  return !c || c.prerequis.every((pp) => prereqAcquiredFor(pp, domain, concepts, comps, seen));
}

export function conceptUnlockedFor(c: Concept, domain: Domain, concepts: Concept[], comps: CompetenceMap): boolean {
  return c.prerequis.every((p) => prereqAcquiredFor(p, domain, concepts, comps));
}

export function templateUnlocked(t: ExerciseTemplate, concepts: Concept[], comps: CompetenceMap, _now: number, _premium = false): { ok: boolean; reason?: string } {
  for (const id of t.concepts) {
    const c = concepts.find((x) => x.id === id);
    if (c && !conceptUnlockedFor(c, t.domain, concepts, comps)) {
      const missing = c.prerequis.filter((pid) => !prereqAcquiredFor(pid, t.domain, concepts, comps)).map((pid) => concepts.find((x) => x.id === pid)?.title ?? pid);
      return { ok: false, reason: `Se débloque dès que tu réussis, en ${DOMAIN_FR[t.domain]}, un exercice de : ${missing.join(', ')}.` };
    }
  }
  return { ok: true };
}
