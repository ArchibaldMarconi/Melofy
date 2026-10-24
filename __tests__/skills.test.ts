// Le modèle de compétences (0.25.0) : une carte de révision par compétence, une seule résolution de la difficulté,
// un escalier qui vise ~80 % de réussites franches, et des paliers sans plafond pour les musiciens avancés.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import { TEMPLATES, templateById } from '../src/content/templates';
import { AREAS, GENERATOR_SKILL, SKILLS, areaOf, skillOf } from '../src/content/skills';
import { maxDifficulty, maxLevel, OVERDRIVE, resolveParams, staircase } from '../src/engine/difficulty';
import { buildWorkout } from '../src/engine/workout';
import { lessonsFromConcepts, type LessonProgress } from '../src/engine/cursus';
import { DEEP_LESSONS } from '../src/content/deep';
import { migrate } from '../src/store/migrate';
import { useUserStore } from '../src/store/useUserStore';
import type { Outcome } from '../src/content/types';

const ok = (o: Partial<Outcome> = {}): Outcome => ({ templateId: 'x', seed: 1, params: {}, attempt: 1, success: true, precision: 1, helps: [], errors: [], timeMs: 5000, ...o });

describe('compétences', () => {
  test('chaque exercice entraîne une compétence d\'un des 4 domaines, chaque compétence a des exercices', () => {
    for (const t of TEMPLATES) expect(AREAS).toContain(areaOf(t));
    const used = new Set(TEMPLATES.map(skillOf));
    for (const k of Object.keys(SKILLS)) expect(used.has(k as keyof typeof SKILLS)).toBe(true);
    expect(Object.keys(GENERATOR_SKILL).length).toBeGreaterThan(100);
  });
});

describe('difficulté résolue en un seul endroit', () => {
  test('au-delà de la progression écrite, les paliers sans plafond font encore monter tempo, longueur et tonalités', () => {
    const t = templateById('IM-2-01');
    const top = resolveParams(t, undefined, maxLevel(t));
    const beyond = resolveParams(t, undefined, maxLevel(t) + OVERDRIVE);
    expect(Number(beyond.nb_notes)).toBeGreaterThan(Number(top.nb_notes));
    expect(maxDifficulty(t)).toBe(maxLevel(t) + OVERDRIVE);
  });
  test('le contexte (leçon, échelle) fixe le contenu : la difficulté n\'y touche jamais', () => {
    const t = templateById('IM-2-01');
    const p = resolveParams(t, { degres: [1, 2, 3], nb_notes: 3 }, maxLevel(t) + OVERDRIVE);
    expect(p.degres).toEqual([1, 2, 3]);
    expect(p.nb_notes).toBe(3);
  });
  test('un exercice sans dimension à monter n\'a pas de palier sans plafond', () => {
    const t = TEMPLATES.find((x) => x.generator === 'step_theory')!;
    expect(maxDifficulty(t)).toBe(maxLevel(t));
  });
  test('chaque exercice se génère encore à son niveau le plus haut, piano et guitare', () => {
    const { generate } = require('../src/engine/generators');
    for (const t of TEMPLATES) for (const instrument of ['piano', 'guitare']) for (const seed of [1, 7]) {
      const v = generate(t, undefined, seed, { instrument, level: maxDifficulty(t) });
      expect(v.answerUI).toBeTruthy();
      if (v.expected.kind === 'sequence') for (const n of v.expected.notes) expect(Number.isFinite(n.midi)).toBe(true);
    }
  });
  test('escalier : plus dur après 3 réussites nettes, plus facile après un échec', () => {
    let s = { level: 1, run: 0 };
    for (let k = 0; k < 2; k++) { const r = staircase(s.level, s.run, ok(), 5); s = r; expect(r.level).toBe(1); }
    expect(staircase(s.level, s.run, ok(), 5).level).toBe(2);
    expect(staircase(2, 2, ok({ success: false }), 5).level).toBe(1);
    // une réussite au 2e essai ne monte pas et remet le compte à zéro
    expect(staircase(2, 2, ok({ attempt: 2 }), 5)).toEqual({ level: 2, run: 0, change: 0 });
    // au plafond, on reste
    expect(staircase(5, 2, ok(), 5).level).toBe(5);
  });
});

describe('révision par compétence', () => {
  beforeEach(() => useUserStore.getState().reset());
  test('un exercice met à jour la carte de sa compétence ; deux exercices de la même compétence la partagent', () => {
    const st = useUserStore.getState();
    const a = templateById('OR-1-06');
    const b = TEMPLATES.find((t) => skillOf(t) === skillOf(a) && t.id !== a.id)!;
    st.recordResult(a, ok({ templateId: a.id }), { inSession: true });
    const c1 = useUserStore.getState().competences[skillOf(a)];
    expect(c1.reps).toBe(1);
    // même séance : une 2e réussite ne compte pas comme une révision de plus
    useUserStore.getState().recordResult(b, ok({ templateId: b.id }), { inSession: true });
    expect(useUserStore.getState().competences[skillOf(a)].reps).toBe(1);
    // un échec, lui, compte toujours
    useUserStore.getState().recordResult(b, ok({ templateId: b.id, success: false, attempt: 3, helps: [5] }), { inSession: true });
    expect(useUserStore.getState().competences[skillOf(a)].lapses).toBe(1);
  });
  test('placement : les compétences et les leçons suivent, y compris les leçons de mode', () => {
    const pairs = TEMPLATES.filter((t) => t.palier <= 5).map((t) => ({ conceptId: t.concepts[0], domain: t.domain }));
    useUserStore.getState().placeOut(pairs);
    const s = useUserStore.getState();
    expect(s.competences.modes_oreille?.reps).toBe(1);
    for (const id of ['mode_dorien', 'mode_lydien', 'mode_phrygien']) expect(s.deepLessonsConfirmed).toContain(id);
  });
});

describe('cursus et placement', () => {
  test('jamais une leçon acquise au-dessus d\'une leçon parente manquante', () => {
    // toutes les notions sauf celles de la leçon des intervalles : les accords (qui en découlent) ne sont pas acquis
    const intervals = DEEP_LESSONS.find((l) => l.id === 'intervalles')!.concepts;
    const all = new Set(DEEP_LESSONS.flatMap((l) => l.concepts).filter((c) => !intervals.includes(c)));
    const r = lessonsFromConcepts(all);
    expect(r.acquired).not.toContain('intervalles');
    expect(r.acquired).not.toContain('accords');
    expect(r.acquired).toContain('degres');
  });
});

describe('séance', () => {
  test('jamais plus de 2 exercices du même domaine d\'affilée dans la révision', () => {
    const p: LessonProgress = { seen: DEEP_LESSONS.map((l) => l.id), done: [], confirmed: [], unlockAll: true };
    for (const seed of [1, 2, 3]) {
      const plan = buildWorkout({ templates: TEMPLATES, competences: {}, progress: p, minutes: 20, instrument: 'piano', hasInstrument: true, canSing: true, now: Date.now(), today: '2026-10-24', seed });
      const doms = plan.items.filter((i) => i.wpart === 'revision' && i.block !== 'confirmation').map((i) => templateById(i.templateId).domain);
      for (let k = 2; k < doms.length; k++) expect(doms[k] === doms[k - 1] && doms[k] === doms[k - 2]).toBe(false);
    }
  });
});

describe('migration v7', () => {
  test('les anciennes cartes notion × domaine deviennent des cartes de compétence, rien n\'est perdu', () => {
    const card = (reps: number, due: number) => ({ key: '', conceptId: '', domain: 'oreille', stability: 5, difficulty: 5, lastReview: 1, due, reps, lapses: 0, tempoCible: null, successes: reps });
    const s = migrate({ competences: { 'degres_1_3:oreille': card(4, 500), 'degres_1_5:oreille': card(2, 100), 'grave_aigu:oreille': card(1, 900) }, intervalStats: { a: [true] } }, 6);
    const c = s.competences as Record<string, { reps: number; due: number; key: string }>;
    expect(c.degres_oreille.reps).toBe(4);
    expect(c.degres_oreille.due).toBe(100);
    expect(c.degres_oreille.key).toBe('degres_oreille');
    expect(c.hauteurs.reps).toBe(1);
    expect(s.intervalStats).toBeUndefined();
  });
});
