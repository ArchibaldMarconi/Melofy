// La séance du jour, à partir des leçons vues, dans l'ordre d'une vraie séance de musicien :
//  0. Échauffement (option, + 5 ou + 10 min) : la routine technique de la gamme du moment (engine/technique) ;
//  1. Révision (40 %) : révisions dues (une carte par compétence), pratique des leçons pas encore consolidées,
//     puis la confirmation d'une leçon quand elle est prête ;
//  2. Entendre (20 %), 3. Trouver (15 %), 4. Rejouer (25 %) : échelles de niveau par leçon (content/ladders),
//     toutes dans la TONALITÉ DU JOUR quand l'élève connaît les armures : l'oreille, la théorie et les doigts
//     travaillent la même matière, ce qui se transfère bien mieux au vrai jeu que des exercices sans lien ;
//  5. Créer (environ une minute) : improviser sur un accompagnement, avec une consigne simple. Toujours un moment de musique.
// Aucun exercice n'entre si sa leçon n'a pas été vue. La situation de l'élève (instrument, voix) décide
// de la façon de répondre : au micro sur le vrai instrument, ou à l'écran ; sans voix, pas d'exercice chanté.
import type { CompetenceState, ExerciseTemplate, Instrument, Params, PlanItem, WorkoutPart } from '../content/types';
import { DEEP_LESSONS } from '../content/deep';
import { LADDERS, type LadderPart } from '../content/ladders';
import { mulberry32, pick, type Rng } from './rng';
import { generate } from './generators';
import { estimateSeconds } from './duration';
import { lessonSeen, practiceOf, templateAvailable, type LessonProgress } from './cursus';
import { KEY_LABEL, VARIED_KEYS } from './music';
import { currentTechScale, techniquePicks } from './technique';
import { partOf } from './balance';
import { dueOfTemplate, lastReviewOfTemplate, practicedTemplate } from './srs';

export const PART_SHARES: Record<Exclude<WorkoutPart, 'technique' | 'creer'>, number> = { revision: 0.4, oreille: 0.2, mapping: 0.15, perroquet: 0.25 };
export const PART_ORDER: WorkoutPart[] = ['technique', 'revision', 'oreille', 'mapping', 'perroquet', 'creer'];
export const PART_LABEL: Record<WorkoutPart, string> = {
  technique: 'Échauffement', revision: 'Révision', oreille: 'Entendre', mapping: 'Trouver', perroquet: 'Rejouer', creer: 'Créer',
};
export const PART_LINE: Record<WorkoutPart, string> = {
  technique: 'La routine de ta gamme du moment, au métronome.',
  revision: 'Ce qui doit revenir aujourd\'hui, et la pratique de tes leçons.',
  oreille: 'Entendre, dans la tonalité du jour.',
  mapping: 'L\'appli montre, tu trouves sur ton instrument.',
  perroquet: 'L\'appli joue, tu rejoues : de l\'oreille aux doigts.',
  creer: 'Improviser sur un accompagnement, avec une consigne.',
};

/** exercices de création, du plus avancé au plus simple */
const CREATE_TEMPLATES = ['IM-5-02', 'IM-4-02', 'IM-3-02', 'IM-2-04', 'IM-2-03', 'IM-2-02', 'IM-1-02', 'IM-1-03'];

/**
 * Tonalité du jour : la tonalité par défaut de l'instrument tant que les armures ne sont pas vues ; ensuite, une
 * tonalité qui change chaque jour (do, sol, fa, ré), puis toutes celles des exercices une fois le cycle des quintes vu.
 */
export function themeOf(p: LessonProgress, instrument: Instrument, seed: number): { key: string; label: string } {
  const keys = lessonSeen('quintes', p) ? VARIED_KEYS : lessonSeen('armure', p) ? ['C', 'G', 'F', 'D'] : null;
  if (!keys) return { key: 'auto', label: `${instrument === 'guitare' ? 'la' : 'do'} majeur` };
  const key = keys[seed % keys.length];
  return { key, label: `${KEY_LABEL[key]} majeur` };
}

export interface WorkoutInput {
  templates: ExerciseTemplate[];
  competences: Record<string, CompetenceState>;
  progress: LessonProgress;
  minutes: number;
  techniqueMinutes?: 0 | 5 | 10;
  instrument: Instrument;
  hasInstrument: boolean;
  canSing: boolean;
  now: number;
  today: string;
  seed: number;
  avgTimeS?: Record<string, number>;
  techProgress?: Record<string, { step: number; tempo: number }>;
}

export interface WorkoutPlan {
  items: PlanItem[];
  totalS: number;
  estimatedS: number;
  /** aucune leçon vue : il faut commencer par une leçon */
  needsLesson: boolean;
  /** tonalité du jour (entendre, trouver, rejouer, créer) */
  theme?: { key: string; label: string };
}

const LADDER_TEMPLATES = new Set(Object.values(LADDERS).flat().map((e) => e.templateId));
const TECH_GENERATORS = new Set(['position_scale', 'position_arpeggio', 'one_string_scale', 'five_finger', 'hands_together']);

export function buildWorkout(inp: WorkoutInput): WorkoutPlan {
  const r: Rng = mulberry32(inp.seed);
  const seed = () => Math.floor(r() * 2 ** 31);
  const total = inp.minutes * 60;
  const byId = new Map(inp.templates.map((t) => [t.id, t]));
  const p = inp.progress;
  const seen = DEEP_LESSONS.filter((l) => lessonSeen(l.id, p));
  if (!seen.length && !p.unlockAll) return { items: [], totalS: total, estimatedS: 0, needsLesson: true };

  const voiceOk = (t: ExerciseTemplate) => inp.canSing || t.mechanic !== 'chanter';
  const fits = voiceOk;
  const inputFor = (t: ExerciseTemplate, part: WorkoutPart): 'micro' | 'ecran' => {
    const wantsInstrument = part === 'mapping' || part === 'perroquet' || part === 'technique' || (part === 'revision' && partOf(t) === 2);
    return inp.hasInstrument && wantsInstrument && t.inputs.includes('micro') ? 'micro' : 'ecran';
  };
  const est = (t: ExerciseTemplate, params: Params | undefined, s: number) => {
    const learned = inp.avgTimeS?.[t.id];
    if (learned) return learned;
    return Math.round(estimateSeconds(t, generate(t, params, s, { instrument: inp.instrument }), { firstTime: !practicedTemplate(t, inp.competences) }));
  };
  const make = (t: ExerciseTemplate, part: WorkoutPart, block: PlanItem['block'], params?: Params, extra: Partial<PlanItem> = {}): PlanItem => {
    const s = seed();
    return { templateId: t.id, seed: s, block, params, wpart: part, input: inputFor(t, part), estS: est(t, params, s), ...extra };
  };
  const sum = (xs: PlanItem[]) => xs.reduce((a, x) => a + (x.estS ?? 0), 0);
  const used = new Map<string, number>();
  const take = (it: PlanItem) => { used.set(it.templateId, (used.get(it.templateId) ?? 0) + 1); return it; };
  const lastSeen = (t: ExerciseTemplate) => lastReviewOfTemplate(t, inp.competences);
  const dueOf = (t: ExerciseTemplate) => dueOfTemplate(t, inp.competences, inp.now);
  const available = (t: ExerciseTemplate) => templateAvailable(t, p).ok && fits(t);
  const lessonIndex = (id: string) => DEEP_LESSONS.findIndex((l) => l.id === id);
  const theme = themeOf(p, inp.instrument, inp.seed);
  // la tonalité du jour, sauf quand l'échelle de la leçon fixe déjà la sienne (contenu de la leçon)
  const themed = (params?: Params): Params | undefined => (theme.key === 'auto' || params?.tonalite !== undefined || params?.tonalites !== undefined ? params : { ...(params ?? {}), tonalite: theme.key });

  // ---------- 1. Révision et validation ----------
  const rev: PlanItem[] = [];
  const revBudget = total * PART_SHARES.revision;
  // confirmation prête (une par séance) : chaque exercice de pratique réussi 2 fois sur 2 jours ; sans voix, le chant ne bloque pas
  const ready = DEEP_LESSONS.find((l) => p.done.includes(l.id) && !p.confirmed.includes(l.id) && (p.doneDay?.[l.id] ?? '') !== inp.today
    && practiceOf(l, inp.instrument).every((x) => { const t = byId.get(x.templateId); return (t && !voiceOk(t)) || new Set(p.practiceDays?.[x.templateId] ?? []).size >= 2; }));
  let confirmation: PlanItem | null = null;
  if (ready) {
    const v = inp.instrument === 'guitare' && ready.guitarValidation ? ready.guitarValidation : ready.validation;
    const t = byId.get(v.templateId);
    if (t) confirmation = take(make(t, 'revision', 'confirmation', v.params, { confirmLesson: ready.id }));
  }
  // application : les exercices de pratique des leçons vues pas encore confirmées, la plus récente d'abord
  const pending = seen.filter((l) => !p.confirmed.includes(l.id)).sort((a, b) => lessonIndex(b.id) - lessonIndex(a.id));
  for (const l of pending) {
    for (const x of practiceOf(l, inp.instrument)) {
      if (sum(rev) >= revBudget * 0.6) break;
      const t = byId.get(x.templateId);
      if (!t || !voiceOk(t) || used.has(t.id)) continue;
      if (new Set(p.practiceDays?.[t.id] ?? []).size >= 2 && (p.practiceDays?.[t.id] ?? []).includes(inp.today)) continue;
      rev.push(take(make(t, 'revision', 'application', x.params)));
    }
  }
  // révisions dues (SRS), puis consolidation des notions des leçons vues les moins pratiquées
  const revPool = inp.templates.filter((t) => available(t) && !LADDER_TEMPLATES.has(t.id) && !TECH_GENERATORS.has(t.generator) && t.mechanic !== 'jeu_libre');
  const fill = (budget: number, list: PlanItem[]) => {
    for (let guard = 0; guard < 30 && sum(list) + (confirmation?.estS ?? 0) < budget * 0.92; guard++) {
      const cands = revPool.filter((t) => (used.get(t.id) ?? 0) < 1)
        .sort((a, b) => (dueOf(a) ?? Infinity) - (dueOf(b) ?? Infinity) || Number(!!a.optionnel) - Number(!!b.optionnel) || lastSeen(a) - lastSeen(b));
      if (!cands.length) break;
      const t = dueOf(cands[0]) !== null ? cands[0] : pick(r, cands.slice(0, 3));
      list.push(take(make(t, 'revision', dueOf(t) !== null ? 'revision' : 'consolidation', t.params.questions !== undefined ? { questions: 4 } : undefined)));
    }
  };
  fill(revBudget, rev);

  // ---------- 2 à 4. Ear training, mapping, perroquet ----------
  // ---------- 5. Créer : environ une minute de musique libre, avec une consigne (pris sur le temps de « rejouer ») ----------
  const createT = CREATE_TEMPLATES.map((id) => byId.get(id)).filter((t): t is ExerciseTemplate => !!t && available(t)).slice(0, 2);
  const create: PlanItem[] = [];
  if (createT.length) {
    const t = createT[inp.seed % createT.length];
    create.push(take(make(t, 'creer', 'creer', themed(t.generator === 'free_play' ? { duree_s: 60 } : undefined))));
  }

  const ladderPart = (part: LadderPart): PlanItem[] => {
    const budget = total * PART_SHARES[part] - (part === 'perroquet' ? sum(create) : 0);
    const entries = LADDERS[part]
      .filter((e) => lessonSeen(e.lesson, p) || p.unlockAll)
      .map((e) => ({ e, t: byId.get(e.templateId) as ExerciseTemplate }))
      .filter((x) => !!x.t && fits(x.t))
      .sort((a, b) => lessonIndex(b.e.lesson) - lessonIndex(a.e.lesson));
    const out: PlanItem[] = [];
    if (!entries.length) return out;
    const newest = lessonIndex(entries[0].e.lesson);
    const fresh = entries.filter((x) => lessonIndex(x.e.lesson) === newest);
    // les lignes d'avant, dans un ordre tiré au hasard où les plus récentes passent plus souvent devant
    const older = entries.filter((x) => lessonIndex(x.e.lesson) !== newest)
      .map((x) => ({ x, k: r() ** (1 / (lessonIndex(x.e.lesson) + 1)) })).sort((a, b) => b.k - a.k).map((y) => y.x);
    // la ligne du jour d'abord (jusqu'à 2), puis la révision des lignes d'avant ; chaque ligne une fois, sauf s'il en manque
    const order = [...fresh.slice(0, 2), ...older, ...fresh.slice(2)];
    for (const round of [0, 1]) {
      for (const x of order) {
        if (sum(out) >= budget * 0.85) break;
        if (round === 1 && lessonIndex(x.e.lesson) !== newest && fresh.length) continue;
        const it = make(x.t, part, part, themed(x.e.params));
        if (sum(out) + (it.estS ?? 0) > budget * 1.35 && out.length) continue;
        out.push(take(it));
      }
      if (sum(out) >= budget * 0.6) break;
    }
    return out;
  };
  const ear = ladderPart('oreille');
  const map = ladderPart('mapping');
  const echo = ladderPart('perroquet');
  // une partie sans exercice encore (ex. pas de mapping au tout début) : son temps revient à la révision
  const spare = total - sum(rev) - (confirmation?.estS ?? 0) - sum(ear) - sum(map) - sum(echo) - sum(create);
  if (spare > 45) fill(revBudget + spare, rev);

  // ---------- 5. Technique (option) ----------
  const tech: PlanItem[] = [];
  if (inp.techniqueMinutes) {
    const sc = currentTechScale(p, inp.techProgress ?? {}, inp.instrument);
    if (sc) {
      const tp = inp.techProgress?.[sc.key] ?? { step: 0, tempo: 60 };
      for (const pk of techniquePicks(sc, tp.step, inp.techniqueMinutes, inp.instrument, inp.hasInstrument)) {
        const t = byId.get(pk.step.templateId);
        if (!t) continue;
        const params = pk.step.kind === 'tempo' ? { ...pk.step.params, tempo_cle: tp.tempo } : pk.step.params;
        tech.push(make(t, 'technique', 'technique', params, { tech: { scale: sc.key, stepIndex: pk.stepIndex, maxStep: pk.maxStep, kind: pk.step.kind, label: pk.step.label } }));
      }
    }
  }

  // assemblage : l'échauffement, la révision entrelacée (la confirmation à sa fin), entendre, trouver, rejouer, créer
  const items = [
    ...tech, ...interleave(rev, inp.templates), ...(confirmation ? [confirmation] : []),
    ...interleave(ear, inp.templates), ...map, ...interleave(echo, inp.templates), ...create,
  ];
  return { items, totalS: total + (inp.techniqueMinutes ?? 0) * 60, estimatedS: sum(items), needsLesson: false, theme };
}

/** jamais plus de 2 exercices du même domaine d'affilée (l'attention retombe sur une longue série identique) */
export function interleave(items: PlanItem[], templates: ExerciseTemplate[], prefix: PlanItem[] = []): PlanItem[] {
  const dom = (i: PlanItem) => templates.find((t) => t.id === i.templateId)?.domain;
  const rest = [...items];
  const placed = [...prefix];
  const res: PlanItem[] = [];
  while (rest.length) {
    const n = placed.length;
    const blocked = n >= 2 && dom(placed[n - 1]) === dom(placed[n - 2]) ? dom(placed[n - 1]) : undefined;
    let idx = rest.findIndex((i) => dom(i) !== blocked);
    if (idx < 0) idx = 0;
    const it = rest.splice(idx, 1)[0];
    res.push(it);
    placed.push(it);
  }
  return res;
}
