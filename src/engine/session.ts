// Composition de la séance du jour, à la durée choisie (5 à 20 min) :
//  1. routine fixe : rythme (échauffement), noms des notes, repérage sur l'instrument, lecture
//  2. confusions à retravailler, révisions dues (entrelacées), nouveauté groupée après sa leçon, impro
//  3. consolidation : on complète jusqu'à la durée choisie avec ce qui a été le moins pratiqué
// Les durées sont réalistes (écoute, réponse, essais, consigne) puis apprises à partir des temps mesurés.
// Entrelacement : jamais plus de 2 exercices du même domaine d'affilée ; la nouveauté reste groupée.
import type { CompetenceState, Concept, Domain, ExerciseTemplate, GeneratorId, Instrument, Params, PlanItem, SessionBlock } from '../content/types';
import { mulberry32, pick, type Rng } from './rng';
import { prereqAcquiredFor, templateUnlocked, type CompetenceMap } from './unlock';
import { generate } from './generators';
import { estimateSeconds } from './duration';
import { dailyIntervals, type IntervalStats } from './intervals';
import { categoryOf, partOf, PART_CATEGORIES, PART_SHARE, TARGETS, type Category } from './balance';

export interface SessionInput {
  templates: ExerciseTemplate[];
  concepts: Concept[];
  competences: CompetenceMap;
  seenConcepts: string[];
  minutes: number;
  now: number;
  seed: number;
  unlockAll?: boolean;
  /** erreurs « attendu>joué » des 7 derniers jours (ex. « 2>3 ») */
  confusions?: string[];
  instrument?: Instrument;
  /** suivi des intervalles : entraînement quotidien jusqu'à ce qu'ils soient tous acquis */
  intervalStats?: IntervalStats;
  /** temps moyen mesuré par exercice (s) */
  avgTimeS?: Record<string, number>;
}

export interface SessionPlan { items: PlanItem[]; totalS: number; estimatedS: number }

/** Routine de chaque partie : présente chaque jour dès que l'un de ses exercices est ouvert. */
export const ROUTINE: { block: SessionBlock; part: 1 | 2; generators: GeneratorId[]; params?: Params }[] = [
  { block: 'routine_rythme', part: 1, generators: ['pulse_tap', 'rhythm_read', 'play_on_beat'] },
  { block: 'routine_perroquet', part: 1, generators: ['rhythm_echo', 'melody_echo'] },
  // audiation : entendre dans sa tête avant de jouer (le cœur de Melofy)
  { block: 'routine_audiation', part: 1, generators: ['audiate_pattern', 'predict_next'] },
  { block: 'routine_oreille', part: 1, generators: ['degree_identify', 'name_by_ear', 'finished_or_not', 'up_down'], params: { questions: 3 } },
  { block: 'routine_noms', part: 1, generators: ['name_the_note', 'scale_next', 'degree_name'], params: { questions: 3 } },
  { block: 'routine_lecture', part: 1, generators: ['read_staff', 'write_staff_note', 'rhythm_dictation', 'rhythm_read', 'staff_dictation'], params: { questions: 4 } },
  { block: 'routine_instrument', part: 2, generators: ['find_notes_series', 'find_function', 'find_keys', 'find_note', 'find_tonic'] },
  // relier l'oreille aux mains sur de vraies mélodies
  { block: 'routine_repiquage', part: 2, generators: ['audiate_tune', 'tune_echo'] },
];

export function buildDailySession(inp: SessionInput): SessionPlan {
  const r = mulberry32(inp.seed);
  const total = inp.minutes * 60;
  const instrument = inp.instrument ?? 'piano';
  const unlocked = inp.unlockAll ? inp.templates : inp.templates.filter((t) => templateUnlocked(t, inp.concepts, inp.competences, inp.now).ok);
  const byId = (id: string) => inp.templates.find((t) => t.id === id)!;
  const seed = () => Math.floor(r() * 2 ** 31);
  const comps = Object.values(inp.competences);
  const practiced = (t: ExerciseTemplate) => comps.some((c) => c.conceptId === t.concepts[0] && c.domain === t.domain && c.reps > 0);
  const lastSeen = (t: ExerciseTemplate) => Math.max(0, ...comps.filter((c) => t.concepts.includes(c.conceptId) && c.domain === t.domain).map((c) => c.lastReview));
  const est = (it: PlanItem) => {
    const t = byId(it.templateId);
    const learned = inp.avgTimeS?.[t.id];
    const v = generate(t, it.params, it.seed, { instrument });
    const base = learned ?? estimateSeconds(t, v, { firstTime: !practiced(t) });
    return Math.round(base + (it.lessonConceptId && !inp.seenConcepts.includes(it.lessonConceptId) ? 35 : 0));
  };
  const make = (t: ExerciseTemplate, block: SessionBlock, params?: Params): PlanItem => {
    const it: PlanItem = { templateId: t.id, seed: seed(), block, params, part: partOf(t) };
    it.estS = est(it);
    return it;
  };
  const used = new Map<string, number>();
  const use = (it: PlanItem) => { used.set(it.templateId, (used.get(it.templateId) ?? 0) + 1); return it; };
  const sum = (xs: PlanItem[]) => xs.reduce((a, x) => a + (x.estS ?? 0), 0);

  // exercices ouverts si les notions introduites pendant la séance sont acquises
  // (domaines indépendants : les prérequis se vérifient dans le domaine de l'exercice, comme templateUnlocked)
  const openWith = (extra: Set<string>) => inp.unlockAll ? inp.templates : inp.templates.filter((t) => t.concepts.every((cid) => {
    const c = inp.concepts.find((x) => x.id === cid);
    return !c || c.prerequis.every((pr) => extra.has(pr) || prereqAcquiredFor(pr, t.domain, inp.concepts, inp.competences));
  }));

  // ---------- 1. Routine (séance courte : le rythme, une routine de la partie 1 qui tourne, l'instrument) ----------
  const routineDefs = inp.minutes <= 5
    ? (() => { const p1 = ROUTINE.filter((x) => x.part === 1 && x.block !== 'routine_rythme'); void p1; return [ROUTINE[0], ROUTINE.find((x) => x.block === 'routine_audiation')!, ROUTINE.find((x) => x.block === 'routine_instrument')!]; })()
    : ROUTINE;
  const routine: PlanItem[] = [];
  for (const def of routineDefs) {
    const cands = unlocked.filter((t) => def.generators.includes(t.generator) && !used.has(t.id) && partOf(t) === def.part);
    if (!cands.length) continue;
    const sorted = [...cands].sort((a, b) => Number(!!a.optionnel) - Number(!!b.optionnel) || lastSeen(a) - lastSeen(b));
    const t = pick(r, sorted.slice(0, 2));
    const it = make(t, def.block, def.params);
    const cid = t.concepts[0];
    if (!inp.seenConcepts.includes(cid) && !routine.some((x) => x.lessonConceptId === cid)) { it.lessonConceptId = cid; it.estS = est(it); }
    routine.push(use(it));
  }
  // intervalles du jour : chaque jour, quel que soit le niveau, tant que les 24 (12 montants, 12 descendants) ne sont pas acquis
  const daily = dailyIntervals(inp.intervalStats ?? {});
  const ivTpl = inp.templates.find((t) => t.id === 'OR-3-05');
  if (daily && ivTpl && inp.minutes > 5) {
    const it = make(ivTpl, 'routine_intervalles', { sens: daily.sens, intervalles: daily.intervalles, questions: 5 });
    routine.splice(1, 0, use(it));
  }
  const assumed = new Set<string>(routine.map((x) => x.lessonConceptId).filter(Boolean) as string[]);
  let pool = openWith(assumed);

  // ---------- 2. Nouveauté : un pas en avant dans chaque domaine, le plus en retard d'abord ----------
  // 1 domaine en 5 min, 2 en 10, 3 en 15, les 4 en 20. Dans chaque domaine : la 1re notion du parcours qui a un
  // exercice principal jamais pratiqué DANS CE DOMAINE (domaines indépendants). Leçon si la notion est inconnue.
  const news: PlanItem[] = [];
  const unexplored = (t: ExerciseTemplate) => !comps.some((c) => c.conceptId === t.concepts[0] && c.domain === t.domain && c.reps > 0);
  const DOMS: Domain[] = ['rythme', 'oreille', 'theorie', 'technique'];
  const progressOf = (d: Domain) => comps.filter((c) => c.domain === d && c.reps > 0).length;
  const domOrder = [...DOMS].sort((a, b) => progressOf(a) - progressOf(b) || ((DOMS.indexOf(a) + inp.seed) % 4) - ((DOMS.indexOf(b) + inp.seed) % 4));
  const nDomains = inp.minutes <= 5 ? 1 : inp.minutes <= 10 ? 2 : inp.minutes <= 15 ? 3 : 4;
  const curriculum = [...inp.concepts].sort((a, b) => a.palier - b.palier || a.unite.localeCompare(b.unite, 'fr', { numeric: true }));
  for (const d of domOrder) {
    if (news.length >= nDomains || (news.length && sum(news) >= total * 0.3)) break;
    const fresh = (c: Concept) => pool.find((t) => t.domain === d && t.concepts.includes(c.id) && !t.optionnel && !used.has(t.id) && unexplored(t));
    const c = curriculum.find((x) => fresh(x));
    if (!c) continue;
    const t = fresh(c)!;
    // découverte : 4 questions suffisent (on y revient en révision)
    const it = make(t, 'nouveaute', t.params.questions !== undefined ? { questions: 4 } : undefined);
    if (!inp.seenConcepts.includes(c.id) && !news.some((x) => x.lessonConceptId === c.id)) { it.lessonConceptId = c.id; it.estS = est(it); }
    news.push(use(it));
    assumed.add(c.id);
    pool = openWith(assumed);
  }

  // la routine s'efface dans une catégorie que la nouveauté couvre déjà (sauf l'échauffement et une leçon à porter)
  for (let k = routine.length - 1; k >= 0; k--) {
    const it = routine[k];
    if (it.block === 'routine_rythme' || it.block === 'routine_intervalles' || it.block === 'routine_audiation' || it.lessonConceptId) continue;
    if (news.some((x) => categoryOf(byId(x.templateId)) === categoryOf(byId(it.templateId)))) {
      routine.splice(k, 1);
      used.set(it.templateId, (used.get(it.templateId) ?? 1) - 1);
    }
  }

  // ---------- 3. Confusions et révisions dues ----------
  const rem = remediationItem(inp.confusions ?? [], unlocked, seed);
  if (rem) { rem.part = partOf(byId(rem.templateId)); rem.estS = est(rem); use(rem); }
  // les révisions dues passent par l'équilibrage (étape 4) : prioritaires DANS leur catégorie,
  // pour qu'un élève en retard d'oreille ne voie pas toute sa séance mangée par l'oreille
  const dueOf = (t: ExerciseTemplate) => {
    const c = comps.find((x) => x.conceptId === t.concepts[0] && x.domain === t.domain && x.reps > 0);
    return c && c.due <= inp.now ? c.due : null;
  };

  // ---------- 4. Équilibre : on complète chaque partie là où la catégorie est le plus en retard sur sa cible ----------
  // consolidation et révisions : seulement des notions vues AVANT aujourd'hui (celle du jour passe par le bloc Nouveauté,
  // sous son plafond de 25 %) ; exception : une notion introduite par la routine sans autre exercice possible
  const seenBefore = (cid: string) => inp.seenConcepts.includes(cid) || comps.some((c) => c.conceptId === cid && c.reps > 0);
  const introducedPrior = (t: ExerciseTemplate) => t.concepts.every(seenBefore);
  // faute de mieux (1er jour) : la notion du jour, toujours placée APRÈS sa leçon et sa découverte
  const introducedToday = (t: ExerciseTemplate) => t.concepts.every((cid) => seenBefore(cid) || assumed.has(cid));
  const today = new Set<PlanItem>();
  const parts: Record<1 | 2, PlanItem[]> = { 1: [], 2: [] };
  for (const it of [...routine, ...(rem ? [rem] : []), ...news]) parts[it.part ?? 1].push(it);
  const timeIn = (xs: PlanItem[], c: Category) => xs.filter((x) => categoryOf(byId(x.templateId)) === c).reduce((a, x) => a + (x.estS ?? 0), 0);
  for (const part of [1, 2] as const) {
    const budget = total * PART_SHARE[part];
    for (let guard = 0; guard < 40 && sum(parts[part]) < budget * 0.92; guard++) {
      const room = budget * 1.08 - sum(parts[part]);
      const everything = [...parts[1], ...parts[2]];
      // catégories de cette partie, de la plus en retard à la moins en retard (par rapport à la cible de la séance)
      const cats = PART_CATEGORIES[part].map((c) => ({ c, deficit: TARGETS[c] * total - timeIn(everything, c) })).sort((a, b) => b.deficit - a.deficit);
      let added = false;
      for (const allowToday of [false, true]) {
      if (added) break;
      for (const { c } of cats) {
        const cands = pool
          .filter((t) => partOf(t) === part && categoryOf(t) === c && (allowToday ? introducedToday(t) : introducedPrior(t)) && (used.get(t.id) ?? 0) < 2 && t.mechanic !== 'jeu_libre')
          // révision due d'abord (la plus en retard), puis le parcours principal, puis le moins pratiqué
          // à égalité, la notion la plus avancée d'abord : un domaine fort reçoit du défi, pas des révisions de débutant
          .sort((a, b) => (dueOf(a) ?? Infinity) - (dueOf(b) ?? Infinity) || Number(!!a.optionnel) - Number(!!b.optionnel) || (used.get(a.id) ?? 0) - (used.get(b.id) ?? 0) || lastSeen(a) - lastSeen(b) || b.palier - a.palier)
          .map((t) => make(t, dueOf(t) !== null ? 'revision' : 'consolidation'))
          .filter((it) => (it.estS ?? 0) <= room);
        if (!cands.length) continue;
        // une révision due est prise telle quelle ; sinon un peu de variété parmi les 3 premiers
        const chosen = cands[0].block === 'revision' ? cands[0] : pick(r, cands.slice(0, 3));
        if (allowToday && !introducedPrior(byId(chosen.templateId))) today.add(chosen);
        parts[part].push(use(chosen));
        added = true;
        break;
      }
      }
      if (!added) break;
    }
  }

  // ---------- Assemblage : partie 1 (échauffement rythmique d'abord), puis partie 2 ----------
  const order = (xs: PlanItem[], warmFirst: boolean) => {
    // échauffement rythmique d'abord ; le reste entrelacé (jamais 3 du même domaine d'affilée) ;
    // la consolidation de la notion du jour toujours après sa découverte
    const warm = warmFirst ? xs.filter((x) => x.block === 'routine_rythme') : [];
    const rest = xs.filter((x) => !warm.includes(x) && !today.has(x));
    const head = [...warm];
    head.push(...interleave(rest, inp.templates, head));
    head.push(...interleave(xs.filter((x) => today.has(x)), inp.templates, head));
    return head;
  };
  // partie trop pleine (routine + nouveauté en séance courte) : on retire sa consolidation, puis ses révisions
  for (const part of [1, 2] as const) {
    const budget = total * PART_SHARE[part] * 1.2;
    for (const kind of ['consolidation', 'revision'] as const) {
      while (sum(parts[part]) > budget && parts[part].some((x) => x.block === kind)) {
        const k = parts[part].map((x) => x.block).lastIndexOf(kind);
        parts[part].splice(k, 1);
      }
    }
  }
  let out = [...order(parts[1], true), ...order(parts[2], false)];
  out = attachLessons(out, inp.templates);
  return { items: out, totalS: total, estimatedS: sum(out) };
}

export function remediationItem(confusions: string[], unlocked: ExerciseTemplate[], seed: () => number): PlanItem | null {
  const t = unlocked.find((x) => x.generator === 'degree_identify');
  if (!t) return null;
  const counts = new Map<string, number>();
  for (const k of confusions) {
    const [a, b] = k.split('>');
    if (!/^[1-7]$/.test(a) || !/^[1-7]$/.test(b) || a === b) continue;
    const key = [a, b].sort().join('-');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const best = [...counts.entries()].filter(([, n]) => n >= 2).sort((x, y) => y[1] - x[1])[0];
  if (!best) return null;
  const degres = best[0].split('-').map(Number);
  return { templateId: t.id, seed: seed(), block: 'remediation', params: { degres, questions: 6 } };
}

/** La leçon d'un concept va sur le premier exercice de ce concept dans l'ordre final. */
function attachLessons(items: PlanItem[], templates: ExerciseTemplate[]): PlanItem[] {
  // une leçon par notion, sur le 1er exercice de cette notion dans l'ordre final (routine ou nouveauté)
  const conceptsOf = (i: PlanItem) => templates.find((t) => t.id === i.templateId)?.concepts ?? [];
  const lessons = [...new Set(items.filter((i) => i.lessonConceptId).map((i) => i.lessonConceptId!))];
  const res = items.map((i) => ({ ...i, lessonConceptId: undefined as string | undefined }));
  for (const cid of lessons) {
    const first = res.find((i) => conceptsOf(i).includes(cid) && i.block !== 'consolidation' && i.block !== 'revision') ?? res.find((i) => conceptsOf(i).includes(cid));
    if (first && !first.lessonConceptId) first.lessonConceptId = cid;
  }
  return res;
}

/**
 * Réordonne pour éviter plus de 2 exercices du même domaine d'affilée.
 * `prefix` : éléments déjà placés (échauffement) pris en compte pour la contrainte.
 */
export function interleave(items: PlanItem[], templates: ExerciseTemplate[], prefix: PlanItem[] = []): PlanItem[] {
  const dom = (i: PlanItem) => templates.find((t) => t.id === i.templateId)?.domain;
  const rest = [...items];
  const placed = [...prefix];
  const res: PlanItem[] = [];
  while (rest.length) {
    const n = placed.length;
    const blocked = n >= 2 && dom(placed[n - 1]) === dom(placed[n - 2]) ? dom(placed[n - 1]) : undefined;
    let idx = rest.findIndex((i) => dom(i) !== blocked);
    if (idx < 0) idx = 0; // impossible d'éviter : on accepte
    const it = rest.splice(idx, 1)[0];
    res.push(it);
    placed.push(it);
  }
  return res;
}

export const planDurationS = (items: PlanItem[], templates: ExerciseTemplate[]) =>
  items.reduce((s, i) => s + (i.estS ?? templates.find((t) => t.id === i.templateId)?.dureeS ?? 0), 0);

export type { CompetenceState };
