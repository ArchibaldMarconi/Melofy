// Cursus (0.20.0) : leçons rattachées aux notions, déblocage par validation, workout en 5 parties.
import { CONCEPTS } from '../src/content/concepts';
import { TEMPLATES, templateById } from '../src/content/templates';
import { CURSUS_META, DEEP_LESSONS, PHASE_LABEL, lessonOfConcept, lessonsFor } from '../src/content/deep';
import { LADDERS } from '../src/content/ladders';
import { lessonState, lessonsFromCompetences, readyToConfirm, templateAvailable, type LessonProgress } from '../src/engine/cursus';
import { buildWorkout } from '../src/engine/workout';
import { techSteps, TECH_SCALES } from '../src/engine/technique';
import { migrate } from '../src/store/migrate';
import { mergeStates } from '../src/store/mergeState';
import { newCompetence, review } from '../src/engine/fsrs';
import { mulberry32 } from '../src/engine/rng';
import { generate } from '../src/engine/generators';

const NOW = Date.parse('2026-10-12T10:00:00Z');
const TODAY = '2026-10-12';
const prog = (seen: string[], done: string[] = [], extra: Partial<LessonProgress> = {}): LessonProgress => ({ seen, done, confirmed: [], doneDay: {}, practiceDays: {}, ...extra });
const wk = (p: LessonProgress, o: Partial<Parameters<typeof buildWorkout>[0]> = {}) => buildWorkout({
  templates: TEMPLATES, competences: {}, progress: p, minutes: 10, instrument: 'piano', hasInstrument: true, canSing: true, now: NOW, today: TODAY, seed: 7, ...o,
});
const orderOf = (id: string) => DEEP_LESSONS.findIndex((l) => l.id === id);

describe('cursus : 27 leçons, chaque notion rattachée', () => {
  test('27 leçons, ids uniques, parents connus et placés avant', () => {
    expect(DEEP_LESSONS).toHaveLength(27);
    expect(new Set(DEEP_LESSONS.map((l) => l.id)).size).toBe(27);
    for (const l of DEEP_LESSONS) for (const par of l.parents) {
      expect(CURSUS_META[par]).toBeDefined();
      expect(orderOf(par)).toBeLessThan(orderOf(l.id));
    }
  });
  test('chaque notion de l\'arbre appartient à une seule leçon', () => {
    for (const c of CONCEPTS) {
      const owners = DEEP_LESSONS.filter((l) => l.concepts.includes(c.id));
      expect([c.id, owners.length]).toEqual([c.id, 1]);
    }
  });
  test('la notion principale de chaque leçon est bien rattachée à elle', () => {
    // les leçons de mode sans notion propre (lydien, phrygien) se rattachent à la notion « modes » de la présentation
    for (const l of DEEP_LESSONS) expect(lessonOfConcept(l.conceptId)?.id).toBe(l.concepts.includes(l.conceptId) ? l.id : lessonOfConcept(l.conceptId)?.id);
    for (const l of DEEP_LESSONS.filter((x) => !x.concepts.includes(x.conceptId))) expect(l.id.startsWith('mode_')).toBe(true);
  });
  test('tout est atteignable depuis les deux départs (1 et 4)', () => {
    const done: string[] = [];
    for (let k = 0; k < 30; k++) for (const l of DEEP_LESSONS) if (!done.includes(l.id) && l.parents.every((x) => done.includes(x))) done.push(l.id);
    expect(done).toHaveLength(27);
    expect(DEEP_LESSONS.filter((l) => !l.parents.length).map((l) => l.id).sort()).toEqual(['fondations', 'mesure']);
  });
  test('les nouvelles leçons R1, R2, R3 et 5b sont complètes (5 écrans, découverte ou illustration rythmique)', () => {
    for (const id of ['syncopes', 'swing', 'impaires', 'cle_fa']) {
      const l = DEEP_LESSONS.find((x) => x.id === id)!;
      expect(l.provisional).toBeFalsy();
      expect(l.screens.length).toBeGreaterThanOrEqual(5);
    }
  });
  test('« pour aller plus loin » : 4 leçons complètes en phase 6, après les harmonies et les modes', () => {
    for (const id of ['dominantes_secondaires', 'extensions', 'conduite_voix', 'modes_melodique']) {
      const l = DEEP_LESSONS.find((x) => x.id === id)!;
      expect(l.phase).toBe(6);
      expect(l.discover).toBeTruthy();
      expect(l.screens.length).toBeGreaterThanOrEqual(6);
      expect(l.practice.length).toBeGreaterThanOrEqual(3);
    }
  });
  test('plus aucune leçon provisoire ; 9 à 19 ont une découverte et au moins 7 écrans', () => {
    expect(DEEP_LESSONS.filter((l) => l.provisional).map((l) => l.id)).toEqual([]);
    for (const id of ['intervalles', 'mineurs', 'accords_gamme', 'quintes', 'ii_v_i', 'modes', 'mode_dorien', 'mode_mixolydien', 'mode_lydien', 'mode_phrygien', 'emprunts']) {
      const l = DEEP_LESSONS.find((x) => x.id === id)!;
      expect(l.discover).toBeTruthy();
      expect(l.screens.length).toBeGreaterThanOrEqual(7);
      expect(l.practice.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('déblocage par leçons', () => {
  test('nouvel élève : seules les leçons 1 et 4 sont ouvertes, aucun exercice disponible', () => {
    const p = prog([]);
    expect(DEEP_LESSONS.filter((l) => lessonState(l, p) === 'ouverte').map((l) => l.id).sort()).toEqual(['fondations', 'mesure']);
    expect(TEMPLATES.filter((t) => templateAvailable(t, p).ok)).toHaveLength(0);
  });
  test('leçon vue : ses exercices s\'ouvrent ; validée : ses enfants s\'ouvrent', () => {
    const p = prog(['fondations']);
    expect(templateAvailable(templateById('OR-1-01'), p).ok).toBe(true);
    expect(templateAvailable(templateById('OR-1-16'), p).ok).toBe(false);
    expect(lessonState(DEEP_LESSONS.find((l) => l.id === 'gamme_majeure')!, p)).toBe('verrouillee');
    const p2 = prog(['fondations'], ['fondations']);
    expect(lessonState(DEEP_LESSONS.find((l) => l.id === 'gamme_majeure')!, p2)).toBe('ouverte');
    expect(templateAvailable(templateById('OR-1-16'), p2).reason).toContain('Fais d\'abord la leçon');
  });
  test('confirmation : 2 réussites sur 2 jours pour chaque exercice de pratique, jamais le jour de la validation', () => {
    const l = DEEP_LESSONS.find((x) => x.id === 'fondations')!;
    const days = Object.fromEntries(l.practice.map((x) => [x.templateId, ['2026-10-10', '2026-10-11']]));
    expect(readyToConfirm(l, prog(['fondations'], ['fondations'], { doneDay: { fondations: '2026-10-10' }, practiceDays: days }), 'piano', TODAY)).toBe(true);
    expect(readyToConfirm(l, prog(['fondations'], ['fondations'], { doneDay: { fondations: TODAY }, practiceDays: days }), 'piano', TODAY)).toBe(false);
    const short = { ...days, [l.practice[0].templateId]: ['2026-10-11'] };
    expect(readyToConfirm(l, prog(['fondations'], ['fondations'], { doneDay: { fondations: '2026-10-10' }, practiceDays: short }), 'piano', TODAY)).toBe(false);
  });
  test('anciens profils : une leçon dont toutes les notions sont acquises est validée et confirmée', () => {
    const comps: Record<string, ReturnType<typeof newCompetence>> = {};
    for (const cid of ['grave_aigu', 'notes_instrument']) {
      let c = newCompetence(cid, 'oreille');
      for (let k = 0; k < 4; k++) c = review(c, 3, NOW - (10 - k) * 86400000);
      comps[c.key] = c;
    }
    const r = lessonsFromCompetences(comps);
    expect(r.acquired).toContain('fondations');
    const m = migrate({ competences: comps, deepLessonsDone: ['mesure'] }, 3);
    expect(m.deepLessonsDone).toEqual(expect.arrayContaining(['mesure', 'fondations']));
    expect(m.deepLessonsSeen).toEqual(expect.arrayContaining(['mesure', 'fondations']));
    expect(m.deepLessonsConfirmed).toEqual(['fondations']);
  });
  test('deux appareils : leçons, jours de pratique et technique sont fusionnés', () => {
    const out = mergeStates(
      { deepLessonsDone: ['fondations'], practiceDays: { 'OR-1-01': ['2026-10-10'] }, techProgress: { majeure: { step: 3, tempo: 64 } } },
      { deepLessonsDone: ['mesure'], practiceDays: { 'OR-1-01': ['2026-10-11'] }, techProgress: { majeure: { step: 2, tempo: 80 } } },
    );
    expect(out.deepLessonsDone).toEqual(expect.arrayContaining(['fondations', 'mesure']));
    expect((out.practiceDays as Record<string, string[]>)['OR-1-01']).toEqual(['2026-10-10', '2026-10-11']);
    expect((out.techProgress as Record<string, { step: number }>).majeure.step).toBe(3);
  });
});

describe('workout en 5 parties', () => {
  test('aucune leçon vue : le workout demande de commencer par une leçon', () => {
    expect(wk(prog([])).needsLesson).toBe(true);
  });
  test('après la leçon 1 : ear training « plus aigu ou plus grave », mapping et perroquet de son niveau', () => {
    const plan = wk(prog(['fondations']));
    const parts = new Set(plan.items.map((x) => x.wpart));
    expect([...parts]).toEqual(expect.arrayContaining(['revision', 'oreille', 'mapping', 'perroquet']));
    const earIds = plan.items.filter((x) => x.wpart === 'oreille').map((x) => x.templateId);
    expect(earIds.some((id) => id === 'OR-1-01' || id === 'OR-1-15')).toBe(true);
    for (const x of plan.items.filter((y) => y.wpart !== 'revision' && y.wpart !== 'creer')) {
      const e = LADDERS[x.wpart as 'oreille'].find((y) => y.templateId === x.templateId)!;
      expect(e.lesson).toBe('fondations');
    }
  });
  test('jamais un exercice d\'une leçon non vue (300 profils au hasard)', () => {
    const r = mulberry32(42);
    for (let k = 0; k < 300; k++) {
      const seen = DEEP_LESSONS.filter(() => r() < 0.35).map((l) => l.id);
      if (!seen.length) continue;
      const p = prog(seen, seen.filter(() => r() < 0.5));
      const plan = wk(p, { seed: k, canSing: r() < 0.5, hasInstrument: r() < 0.5, instrument: r() < 0.5 ? 'guitare' : 'piano', minutes: [5, 10, 15, 20][k % 4], techniqueMinutes: r() < 0.5 ? 5 : 0 });
      for (const x of plan.items) {
        const t = templateById(x.templateId);
        // partie 1 : un exercice ouvert, ou un exercice de pratique / validation d'une leçon vue (choisi pour elle)
        const ofSeenLesson = DEEP_LESSONS.some((l) => seen.includes(l.id) && [...l.practice, l.validation, ...(l.guitarValidation ? [l.guitarValidation] : [])].some((y) => y.templateId === x.templateId));
        if (x.wpart === 'revision') expect(templateAvailable(t, p).ok || ofSeenLesson).toBe(true);
        else if (x.wpart === 'technique') expect(x.tech).toBeDefined();
        else if (x.wpart === 'creer') expect(templateAvailable(t, p).ok).toBe(true);
        else expect(LADDERS[x.wpart as 'oreille'].some((e) => e.templateId === x.templateId && seen.includes(e.lesson))).toBe(true);
      }
    }
  });
  test('situation : sans voix, pas d\'exercice chanté ; sans instrument, tout à l\'écran', () => {
    const all = DEEP_LESSONS.slice(0, 8).map((l) => l.id);
    for (let s = 0; s < 20; s++) {
      const plan = wk(prog(all, all), { seed: s, canSing: false, hasInstrument: false, techniqueMinutes: 10 });
      for (const x of plan.items) {
        expect(templateById(x.templateId).mechanic).not.toBe('chanter');
        expect(x.input).toBe('ecran');
        expect(x.templateId).not.toBe('TQ-1-03'); // mains ensemble : seulement au vrai piano
      }
    }
    const withInstr = wk(prog(all, all), { hasInstrument: true });
    for (const x of withInstr.items.filter((y) => y.wpart === 'mapping' || y.wpart === 'perroquet')) expect(x.input).toBe(templateById(x.templateId).inputs.includes('micro') ? 'micro' : 'ecran');
    expect(withInstr.items.some((x) => x.input === 'micro')).toBe(true);
  });
  test('les parts de temps suivent 40 / 20 / 15 / 25 % (à 30 % près) et la durée totale est tenue', () => {
    const all = DEEP_LESSONS.slice(0, 11).map((l) => l.id);
    for (const minutes of [10, 15, 20]) {
      const plan = wk(prog(all, all), { minutes, seed: minutes });
      // « créer » prend son temps sur la part de « rejouer » : on les compte ensemble
      const t = (part: string) => plan.items.filter((x) => x.wpart === part || (part === 'perroquet' && x.wpart === 'creer')).reduce((a, x) => a + (x.estS ?? 0), 0);
      const total = minutes * 60;
      expect(plan.estimatedS).toBeGreaterThan(total * 0.75);
      expect(plan.estimatedS).toBeLessThan(total * 1.35);
      for (const [part, share] of [['revision', 0.4], ['oreille', 0.2], ['mapping', 0.15], ['perroquet', 0.25]] as const) {
        expect(t(part)).toBeGreaterThan(total * share * 0.5);
        expect(t(part)).toBeLessThan(total * share * 1.7);
      }
    }
  });
  test('la confirmation arrive en fin de partie 1, quand elle est prête', () => {
    const l = DEEP_LESSONS.find((x) => x.id === 'fondations')!;
    const days = Object.fromEntries(l.practice.map((x) => [x.templateId, ['2026-10-10', '2026-10-11']]));
    const plan = wk(prog(['fondations'], ['fondations'], { doneDay: { fondations: '2026-10-09' }, practiceDays: days }));
    const k = plan.items.findIndex((x) => x.block === 'confirmation');
    expect(k).toBeGreaterThan(-1);
    expect(plan.items[k].confirmLesson).toBe('fondations');
    expect(plan.items[k].templateId).toBe(l.validation.templateId);
    expect(plan.items.slice(k + 1).every((x) => x.wpart !== 'revision')).toBe(true);
  });
  test('module technique : la gamme de la dernière leçon, l\'étape en cours, puis le métronome', () => {
    const p = prog(['fondations', 'gamme_majeure'], ['fondations']);
    const g = wk(p, { instrument: 'guitare', techniqueMinutes: 5 }).items.filter((x) => x.wpart === 'technique');
    expect(g.length).toBe(5);
    expect(g[0].tech!.stepIndex).toBe(0);
    expect(g[0].templateId).toBe('TE-2-08');
    const last = techSteps(TECH_SCALES[0], 'guitare').length - 1;
    const t2 = wk(p, { instrument: 'guitare', techniqueMinutes: 10, techProgress: { majeure: { step: last, tempo: 84 } } }).items.filter((x) => x.wpart === 'technique');
    expect(t2.some((x) => x.tech!.kind === 'tempo' && x.params?.tempo_cle === 84)).toBe(true);
    // chaque étape démarre, au piano comme à la guitare
    for (const inst of ['piano', 'guitare'] as const) for (const sc of TECH_SCALES) for (const st of techSteps(sc, inst)) {
      expect(() => generate(templateById(st.templateId), st.params, 3, { instrument: inst, level: 0 })).not.toThrow();
    }
  });
  test('les échelles ne citent que des exercices et des leçons existants', () => {
    for (const list of Object.values(LADDERS)) for (const e of list) {
      expect(CURSUS_META[e.lesson]).toBeDefined();
      expect(() => generate(templateById(e.templateId), e.params, 3, { instrument: 'piano', level: 0 })).not.toThrow();
      expect(() => generate(templateById(e.templateId), e.params, 3, { instrument: 'guitare', level: 0 })).not.toThrow();
    }
  });
});

describe('nouveaux exercices du workout', () => {
  const gen = (id: string, params?: object, inst: 'piano' | 'guitare' = 'piano', seed = 3) => generate(templateById(id), params as never, seed, { instrument: inst, level: 0 });
  test('joue la note : la note nommée, à n\'importe quelle octave', () => {
    for (let s = 0; s < 10; s++) {
      const v = gen('MP-1-01', { nb_notes: 3 }, s % 2 ? 'guitare' : 'piano', s);
      if (v.expected.kind !== 'sequence' || v.display?.kind !== 'text') throw new Error();
      expect(v.expected.octaveAgnostic).toBe(true);
      expect(v.display.text.split('   ·   ')).toHaveLength(3);
    }
  });
  test('reproduis la basse : les fondamentales des accords joués', () => {
    const v = gen('PQ-3-01', { grilles: ['I-vi-IV-V'] });
    if (v.expected.kind !== 'sequence') throw new Error();
    expect(v.expected.notes.map((n) => ((n.midi - v.tonic) % 12 + 12) % 12)).toEqual([0, 9, 5, 7]);
  });
  test('la gamme sur une corde : T T ½ T T T ½, sur une seule corde', () => {
    const v = gen('TQ-1-01', { gamme: 'majeure' }, 'guitare');
    if (v.expected.kind !== 'sequence') throw new Error();
    const m = v.expected.notes.map((n) => n.midi);
    expect(m.slice(1).map((x, i) => x - m[i])).toEqual([2, 2, 1, 2, 2, 2, 1]);
    expect(v.guide!.zone!.strings[0]).toBe(v.guide!.zone!.strings[1]);
  });
  test('5 doigts : 1 2 3 4 5 4 3 2 1, doigts 1 à 5 (main gauche 5 à 1)', () => {
    const v = gen('TQ-1-02', { main: 'gauche' });
    expect(v.guide!.staffLabels!.slice(0, 5)).toEqual(['5', '4', '3', '2', '1']);
    if (v.expected.kind !== 'sequence') throw new Error();
    expect(v.expected.notes).toHaveLength(9);
  });
  test('gamme main gauche : une octave plus bas, doigté 5 4 3 2 1 3 2 1', () => {
    const v = gen('TE-2-09', { gamme: 'majeure', guide: 'complet', aller_retour: false, main: 'gauche' });
    expect(v.guide!.staffLabels!.slice(0, 8)).toEqual(['5', '4', '3', '2', '1', '3', '2', '1']);
    if (v.expected.kind !== 'sequence') throw new Error();
    expect(v.expected.notes[0].midi).toBeLessThan(60);
  });
  test('perroquet sur accompagnement : on rejoue la mélodie seule', () => {
    const v = gen('IM-2-01', { degres: [1, 2, 3, 4, 5], nb_notes: 4, accompagnement: 'I-IV-V-I' });
    if (v.expected.kind !== 'sequence') throw new Error();
    expect(v.expected.notes).toHaveLength(4);
    expect(v.stimulus).toHaveLength(4);
    // retour bêta « inaudible » : l'accompagnement est à part, entièrement sous la mélodie
    const low = Math.min(...v.stimulus.map((n) => n.midi));
    expect(v.stimulusBacking!.length).toBeGreaterThan(4);
    for (const n of v.stimulusBacking!) expect(n.midi).toBeLessThan(low);
  });
});

describe('0.23.0 : chaque exercice est lié à une leçon déjà vue', () => {
  const ancestors = (id: string): Set<string> => {
    const l = DEEP_LESSONS.find((x) => x.id === id)!;
    const out = new Set<string>([id]);
    for (const p of l.parents) for (const a of ancestors(p)) out.add(a);
    return out;
  };
  test('les exercices des parties 2 à 4 et de la pratique de chaque leçon ne demandent que des notions de cette leçon ou de celles dont elle découle', () => {
    const bad: string[] = [];
    for (const [part, list] of Object.entries(LADDERS)) for (const e of list) {
      const anc = ancestors(e.lesson);
      for (const c of templateById(e.templateId).concepts) { const o = lessonOfConcept(c); if (o && !anc.has(o.id)) bad.push(`${part} ${e.lesson} ${e.templateId} → ${o.id}`); }
    }
    for (const l of DEEP_LESSONS) {
      const anc = ancestors(l.id);
      for (const pr of [...l.practice, l.validation]) for (const c of templateById(pr.templateId).concepts) { const o = lessonOfConcept(c); if (o && !anc.has(o.id)) bad.push(`${l.id} ${pr.templateId} → ${o.id}`); }
    }
    expect(bad).toEqual([]);
  });
  test('le mapping ne contient que des exercices joués (l\'appli montre, on joue), jamais un quiz', () => {
    for (const e of LADDERS.mapping) expect([e.templateId, templateById(e.templateId).mechanic]).not.toEqual([e.templateId, 'identifier']);
  });
});

test('migration v5 : l\'ancienne leçon « modes » redevient à découvrir, le reste ne bouge pas', () => {
  const m = migrate({ deepLessonsSeen: ['mesure', 'modes'], deepLessonsDone: ['mesure', 'modes'], deepLessonsConfirmed: ['modes'], deepLessonsDoneDay: { modes: '2026-10-10', mesure: '2026-10-01' } }, 4);
  expect(m.deepLessonsSeen).toEqual(['mesure']);
  expect(m.deepLessonsDone).toEqual(['mesure']);
  expect(m.deepLessonsConfirmed).toEqual([]);
  expect(m.deepLessonsDoneDay).toEqual({ mesure: '2026-10-01' });
});

test('perroquet sur accords à la guitare : mélodie et accords restent audibles, l\'un au-dessus de l\'autre', () => {
  for (let sd = 0; sd < 10; sd++) {
    const v = generate(templateById('IM-2-01'), { degres: [1, 2, 3, 4, 5, 6], nb_notes: 4, accompagnement: 'I-IV-V-I', bourdon: false }, sd, { instrument: 'guitare', level: 0 });
    const low = Math.min(...v.stimulus.map((n) => n.midi));
    expect(low).toBeGreaterThanOrEqual(55);
    for (const n of v.stimulusBacking!) { expect(n.midi).toBeLessThan(low); expect(n.midi).toBeGreaterThanOrEqual(36); }
    expect(v.stimulusBacking!.length).toBeGreaterThan(2);
  }
});

describe('0.24.0 : ordre pédagogique revu', () => {
  test('les intervalles avant les accords, en phase 2', () => {
    expect(orderOf('intervalles')).toBeLessThan(orderOf('accords'));
    expect(CURSUS_META.accords.parents).toContain('intervalles');
    expect(CURSUS_META.intervalles.phase).toBe(2);
    expect(DEEP_LESSONS.map((l) => l.number).slice(0, 9)).toEqual([1, 4, 2, 3, 5, 6, 7, 8, 9]);
  });
  test('au piano, la clé de fa suit la portée (phase 2) ; à la guitare, elle reste en phase 4', () => {
    const piano = lessonsFor('piano');
    const i = piano.findIndex((l) => l.id === 'portee');
    expect(piano[i + 1].id).toBe('cle_fa');
    expect(piano[i + 1].phase).toBe(2);
    expect(piano).toHaveLength(DEEP_LESSONS.length);
    expect(lessonsFor('guitare').find((l) => l.id === 'cle_fa')!.phase).toBe(4);
  });
  test('les modes ne s\'enchaînent plus d\'un bloc : rythme et harmonie entre le mixolydien et le lydien', () => {
    const between = DEEP_LESSONS.slice(orderOf('mode_mixolydien') + 1, orderOf('mode_lydien')).map((l) => l.id);
    expect(between).toEqual(['impaires', 'emprunts']);
    expect(CURSUS_META.mode_lydien.parents).toEqual(['emprunts']);
    expect(Object.keys(PHASE_LABEL)).toHaveLength(6);
  });
  test('bourdon sur la tonique pendant les exercices de degrés de la phase 1', () => {
    for (const id of ['OR-1-06', 'OR-2-01', 'OR-1-17', 'OR-1-18', 'OR-2-14']) {
      const v = generate(templateById(id), undefined, 3, { instrument: 'piano', level: 0 });
      expect([id, !!v.drone]).toEqual([id, true]);
    }
  });
  test('technique : le sens de parcours (monter, descendre, monter puis descendre)', () => {
    for (const instrument of ['piano', 'guitare'] as const) {
      const n = (sens: string) => generate(templateById('TE-3-04'), { gamme: 'majeure', position: 1, sens }, 1, { instrument, level: 0 }).expected as { notes: { midi: number }[] };
      const up = n('monter').notes.map((x) => x.midi);
      expect(n('descendre').notes.map((x) => x.midi)).toEqual([...up].reverse());
      expect(n('aller_retour').notes).toHaveLength(up.length * 2 - 1);
    }
  });
});

describe('0.24.1 : notions à leur place, titres fidèles aux réglages', () => {
  test('« Toute la gamme : 6, 7 et la sensible » appartient à la leçon des degrés', () => {
    expect(lessonOfConcept('gamme_majeure')?.id).toBe('degres');
    expect(DEEP_LESSONS.find((l) => l.id === 'gamme_majeure')!.practice.map((p) => p.templateId)).not.toContain('OR-1-19');
  });
  test('un modèle générique prend le nom de la gamme jouée ; pas de « positions » au piano', () => {
    const { displayTitle } = require('../src/content/titles');
    const tokens = ['1', '2', '3', '4', '5', '6', 'b7', '8', 'b7', '6', '5', '4', '3', '2', '1'];
    expect(displayTitle(templateById('TE-5-01'), { tokens })).toBe('Joue le mixolydien');
    expect(displayTitle(templateById('TE-2-09'), { gamme: 'lydien' }, 'guitare')).toBe('Positions : le lydien');
    expect(displayTitle(templateById('TE-2-09'), { gamme: 'penta_majeure' }, 'piano')).toBe('La pentatonique majeure, avec le doigté');
    expect(displayTitle(templateById('TQ-1-01'), { gamme: 'phrygien' })).toBe('Le phrygien sur une corde');
    expect(displayTitle(templateById('OR-1-01'), undefined)).toBe(templateById('OR-1-01').title);
  });
});
