// Pédagogie (0.25.0) : chercher avec les mains avant le nom, une séance qui forme un tout (tonalité du jour,
// échauffement → révision → entendre → trouver → rejouer → créer).
import { DEEP_LESSONS } from '../src/content/deep';
import { TRIES } from '../src/content/deep/tries';
import { TEMPLATES } from '../src/content/templates';
import { buildWorkout, PART_ORDER, themeOf } from '../src/engine/workout';
import type { LessonProgress } from '../src/engine/cursus';

const prog = (seen: string[]): LessonProgress => ({ seen, done: seen, confirmed: [] });
const wk = (p: LessonProgress, seed = 3) => buildWorkout({ templates: TEMPLATES, competences: {}, progress: p, minutes: 15, techniqueMinutes: 5, instrument: 'piano', hasInstrument: true, canSing: true, now: Date.now(), today: '2026-10-24', seed });

describe('« À toi d\'essayer » dans chaque leçon', () => {
  test('chaque leçon a au moins une étape à essayer, rattachée à un écran qui existe', () => {
    for (const l of DEEP_LESSONS) {
      const steps = TRIES[l.id];
      expect(steps?.length).toBeGreaterThan(0);
      for (const st of steps) expect(l.screens.map((s) => s.title)).toContain(st.screen);
    }
  });
  test('les cibles sont jouables (notes MIDI réalistes) et les rythmes tiennent dans leurs mesures', () => {
    for (const steps of Object.values(TRIES)) for (const { try: t } of steps) {
      expect(t.success.length).toBeGreaterThan(10);
      if (t.kind === 'play' || t.kind === 'build') for (const m of t.target ?? []) expect(m >= 36 && m <= 96 || (t.kind === 'build' && m >= 0 && m < 12)).toBe(true);
      if (t.kind === 'play' && !t.target) expect(t.minNotes ?? 4).toBeGreaterThan(0);
      if (t.kind === 'tap') { expect(t.onsets.length).toBeGreaterThan(2); for (const o of t.onsets) expect(o).toBeGreaterThanOrEqual(0); }
    }
  });
});

describe('une séance qui forme un tout', () => {
  test('ordre : échauffement, révision, entendre, trouver, rejouer, créer', () => {
    const plan = wk(prog(DEEP_LESSONS.slice(0, 9).map((l) => l.id)));
    const order = plan.items.map((x) => PART_ORDER.indexOf(x.wpart!));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(plan.items[plan.items.length - 1].wpart).toBe('creer');
    expect(plan.items[0].wpart).toBe('technique');
  });
  test('avant les armures : la tonalité de l\'instrument ; après : une tonalité du jour, partagée par entendre, trouver et rejouer', () => {
    expect(themeOf(prog(['fondations']), 'piano', 1).key).toBe('auto');
    const seen = DEEP_LESSONS.slice(0, 9).map((l) => l.id);
    expect(seen).toContain('armure');
    const plan = wk(prog(seen), 2);
    expect(plan.theme!.key).not.toBe('auto');
    const themed = plan.items.filter((x) => ['oreille', 'mapping', 'perroquet', 'creer'].includes(x.wpart!) && x.params?.tonalite !== undefined);
    expect(themed.length).toBeGreaterThan(0);
    for (const x of themed) expect([plan.theme!.key, 'D', 'varie']).toContain(String(x.params!.tonalite));
  });
  test('la tonalité change d\'un jour à l\'autre', () => {
    const p = prog(DEEP_LESSONS.map((l) => l.id));
    const keys = new Set([1, 2, 3, 4, 5, 6].map((s) => themeOf(p, 'piano', s).key));
    expect(keys.size).toBeGreaterThan(2);
  });
  test('dès la première improvisation vue, la séance se termine par un moment de création', () => {
    expect(wk(prog(['fondations'])).items.some((x) => x.wpart === 'creer')).toBe(false);
    expect(wk(prog(['fondations', 'gamme_majeure', 'degres'])).items.some((x) => x.wpart === 'creer')).toBe(true);
  });
});
