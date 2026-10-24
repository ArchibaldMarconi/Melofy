// Entraînement ciblé (onglet Jouer) : un toucher, quelques minutes sur un domaine. L'appli choisit les exercices
// (déjà ouverts par les leçons vues), les révisions dues d'abord, au niveau de difficulté atteint par l'élève.
import type { CompetenceState, ExerciseTemplate, Instrument, PlanItem } from '../content/types';
import { areaOf, type Area } from '../content/skills';
import { mulberry32, pick, shuffle } from './rng';
import { templateAvailable, type LessonProgress } from './cursus';
import { generate } from './generators';
import { estimateSeconds } from './duration';
import { dueOfTemplate, lastReviewOfTemplate } from './srs';

export interface FocusInput {
  area: Area;
  templates: ExerciseTemplate[];
  competences: Record<string, CompetenceState>;
  progress: LessonProgress;
  instrument: Instrument;
  hasInstrument: boolean;
  canSing: boolean;
  minutes: number;
  now: number;
  seed: number;
  avgTimeS?: Record<string, number>;
}

const TECH_GENERATORS = new Set(['position_scale', 'position_arpeggio', 'one_string_scale', 'five_finger', 'hands_together']);

/** exercices ouverts d'un domaine (hors jeu libre, chant si l'élève ne chante pas) */
export function focusPool(inp: Pick<FocusInput, 'area' | 'templates' | 'progress' | 'canSing'>): ExerciseTemplate[] {
  return inp.templates.filter((t) => areaOf(t) === inp.area && t.mechanic !== 'jeu_libre' && (inp.canSing || t.mechanic !== 'chanter') && templateAvailable(t, inp.progress).ok);
}

export function buildFocus(inp: FocusInput): PlanItem[] {
  const r = mulberry32(inp.seed);
  const pool = focusPool(inp);
  if (!pool.length) return [];
  const budget = inp.minutes * 60;
  const due = pool.filter((t) => dueOfTemplate(t, inp.competences, inp.now) !== null)
    .sort((a, b) => (dueOfTemplate(a, inp.competences, inp.now) ?? 0) - (dueOfTemplate(b, inp.competences, inp.now) ?? 0));
  // puis les moins travaillés, avec un peu de hasard ; les exercices obligatoires avant les « pour aller plus loin »
  const rest = shuffle(r, pool.filter((t) => !due.includes(t)))
    .sort((a, b) => Number(!!a.optionnel) - Number(!!b.optionnel) || lastReviewOfTemplate(a, inp.competences) - lastReviewOfTemplate(b, inp.competences));
  const order = [...due, ...rest];
  const items: PlanItem[] = [];
  let total = 0;
  for (let guard = 0; guard < 40 && total < budget * 0.9; guard++) {
    const t = order[guard % order.length];
    if (guard >= order.length && order.length > 1 && items[items.length - 1]?.templateId === t.id) continue;
    const s = Math.floor(r() * 2 ** 31);
    const params = t.params.questions !== undefined ? { questions: 4 } : undefined;
    const wantsInstrument = inp.area === 'mains' || TECH_GENERATORS.has(t.generator) || t.mechanic === 'perroquet';
    const estS = inp.avgTimeS?.[t.id] ?? Math.round(estimateSeconds(t, generate(t, params, s, { instrument: inp.instrument }), { firstTime: false }));
    items.push({ templateId: t.id, seed: s, block: 'consolidation', params, input: inp.hasInstrument && wantsInstrument && t.inputs.includes('micro') ? 'micro' : 'ecran', estS });
    total += estS;
  }
  return items.length ? items : [{ templateId: pick(r, pool).id, seed: Math.floor(r() * 2 ** 31), block: 'consolidation', input: 'ecran' }];
}
