import { TEMPLATES, templateById } from '../src/content/templates';
import { CONCEPTS } from '../src/content/concepts';
import { generate } from '../src/engine/generators';
import { align, scoreAnswer, scoreRhythm, scoreSequence, scoreTranscription } from '../src/engine/scoring';
import { isMastered, newCompetence, review } from '../src/engine/fsrs';
import { computeRating, computeXp, levelFromXp } from '../src/engine/xp';
import { degreeToMidi, midiToDegree } from '../src/engine/music';
import { yin } from '../src/audio/yin';
import { NoteSegmenter } from '../src/audio/segmenter';

describe('musique', () => {
  test('degrés ↔ MIDI', () => {
    expect(degreeToMidi(60, 3)).toBe(64);
    expect(degreeToMidi(60, 8)).toBe(72);
    expect(midiToDegree(60, 63)).toEqual({ degree: 3, acc: -1 });
    expect(midiToDegree(45, 49)).toEqual({ degree: 3, acc: 0 });
  });
});

describe('générateurs', () => {
  test('tous les gabarits génèrent une variante, piano et guitare, de façon déterministe', () => {
    for (const t of TEMPLATES) {
      for (const instrument of ['piano', 'guitare'] as const) {
        const a = generate(t, undefined, 42, { instrument });
        const b = generate(t, undefined, 42, { instrument });
        expect(a).toEqual(b);
        expect(a.prompt.length).toBeGreaterThan(0);
      }
    }
  });
  test('chaque concept référencé existe et les 13 mécaniques sont couvertes', () => {
    for (const t of TEMPLATES) for (const c of t.concepts) expect(CONCEPTS.some((x) => x.id === c)).toBe(true);
    expect(new Set(TEMPLATES.map((t) => t.mechanic)).size).toBe(13);
  });
  test('RP-2-03 prépare une transcription en degrés', () => {
    const v = generate(templateById('RP-2-03'), undefined, 7, { instrument: 'piano' });
    expect(v.transcription).toHaveLength(5);
  });
});

describe('scoring', () => {
  test('alignement : note fausse, manquante, en trop', () => {
    const ops = align([1, 2, 3], [1, 4, 3, 5], (a, b) => a === b);
    expect(ops.map((o) => o.type)).toEqual(['match', 'sub', 'match', 'ins']);
  });
  test('séquence parfaite = 1', () => {
    const exp = [60, 62, 64].map((m, i) => ({ midi: m, start: i, dur: 1 }));
    const played = exp.map((e, i) => ({ midi: e.midi, tMs: 1000 + i * 750 }));
    const r = scoreSequence(exp, played, { tempo: 80, tolMs: 100, tolCents: 50, checkRhythm: true, octaveAgnostic: false, tonic: 60 });
    expect(r.precision).toBeCloseTo(1);
  });
  test('séquence : une note fausse est signalée avec son degré', () => {
    const exp = [60, 62, 64].map((m, i) => ({ midi: m, start: i, dur: 1 }));
    const r = scoreSequence(exp, [{ midi: 60, tMs: 0 }, { midi: 64, tMs: 750 }, { midi: 64, tMs: 1500 }], { tempo: 80, tolMs: 100, tolCents: 50, checkRhythm: false, octaveAgnostic: false, tonic: 60 });
    expect(r.wrongIndexes).toEqual([1]);
    expect(r.errors[0].message).toContain('3 au lieu de 2');
  });
  test('rythme absolu avec une tape en retard', () => {
    const r = scoreRhythm([0, 1, 2, 3], [0, 750, 1700, 2250], { tempo: 80, tolMs: 80, absolute: true });
    expect(r.precision).toBeCloseTo(0.75);
    expect(r.errors[0].type).toBe('en_retard');
  });
  test('transcription avec durées', () => {
    const r = scoreTranscription([{ degree: 1, acc: 0, dur: 1 }, { degree: 3, acc: 0, dur: 2 }], [{ degree: 1, acc: 0, dur: 1 }, { degree: 3, acc: 0, dur: 1 }], true);
    expect(r.precision).toBeCloseTo(0.75);
  });
  test('question-réponse : contraintes', () => {
    const t = templateById('IM-1-02');
    const v = generate(t, undefined, 3, { instrument: 'piano' });
    const ok = scoreAnswer(t, v, { kind: 'notes', notes: [{ midi: 64, tMs: 0 }, { midi: 62, tMs: 500 }, { midi: 60, tMs: 1000 }] });
    const bad = scoreAnswer(t, v, { kind: 'notes', notes: [{ midi: 64, tMs: 0 }, { midi: 67, tMs: 500 }, { midi: 62, tMs: 1000 }] });
    expect(ok.success).toBe(true);
    expect(bad.success).toBe(false);
  });
});

describe('FSRS, XP, niveaux', () => {
  test('une réussite éloigne la révision, un échec la ramène', () => {
    const now = Date.now();
    let c = review(newCompetence('pulsation', 'rythme'), 3, now);
    c = review(c, 3, now + 86_400_000 * 3);
    expect(c.due).toBeGreaterThan(now + 86_400_000 * 4);
    expect(isMastered(c, now + 86_400_000 * 3)).toBe(true);
    const f = review(c, 1, now + 86_400_000 * 10);
    expect(f.stability).toBeLessThan(c.stability);
  });
  test('note SRS selon essais et aides', () => {
    const base = { success: true, attempt: 1, precision: 1, helps: [] as number[], timeMs: 1000 };
    expect(computeRating(base, 5000)).toBe(4);
    expect(computeRating({ ...base, helps: [2] }, 5000)).toBe(3);
    expect(computeRating({ ...base, attempt: 2 }, 5000)).toBe(2);
    expect(computeRating({ ...base, helps: [4] }, 5000)).toBe(2);
    expect(computeRating({ ...base, success: false }, 5000)).toBe(1);
  });
  test('XP jamais sous 1, 0 hors SRS si maîtrisé', () => {
    const t = templateById('OR-1-06');
    expect(computeXp(t, 4, [])).toBe(13);
    expect(computeXp(t, 1, [2, 3, 4])).toBe(1);
    expect(computeXp(t, 4, [], { alreadyMasteredOutsideSrs: true })).toBe(0);
    expect(levelFromXp(350).level).toBe(3);
  });
});


describe('audio pur', () => {
  test('YIN retrouve un la 440', () => {
    const sr = 44100;
    const buf = new Float32Array(2048).map((_, i) => Math.sin((2 * Math.PI * 440 * i) / sr));
    expect(yin(buf, sr)!).toBeGreaterThan(437);
    expect(yin(buf, sr)!).toBeLessThan(443);
  });
  test('segmentation : deux notes distinctes', () => {
    const s = new NoteSegmenter();
    const out = [];
    for (let t = 0; t < 400; t += 20) { const n = s.push({ freq: 261.6, rms: 0.1, tMs: t }); if (n) out.push(n); }
    for (let t = 400; t < 800; t += 20) { const n = s.push({ freq: 329.6, rms: 0.1, tMs: t }); if (n) out.push(n); }
    const last = s.flush(800); if (last) out.push(last);
    expect(out.map((n) => Math.round(n.midi))).toEqual([60, 64]);
  });
});

describe('synthèse', () => {
  const { renderGuitar, renderPiano } = require('../src/audio/synth');
  const centsOff = (buf: Float32Array, midi: number) => {
    const f = yin(buf.subarray(4410, 4410 + 4096), 44100)!;
    return 1200 * Math.log2(f / (440 * Math.pow(2, (midi - 69) / 12)));
  };
  test.each([40, 45, 52, 57, 64, 71, 76])('guitare juste à ±5 cents (midi %i)', (m) => {
    expect(Math.abs(centsOff(renderGuitar(m, 44100), m))).toBeLessThan(5);
  });
  test.each([48, 60, 64, 67, 72, 79])('piano juste à ±8 cents (midi %i)', (m) => {
    expect(Math.abs(centsOff(renderPiano(m, 44100), m))).toBeLessThan(8);
  });
  // la fréquence de rendu de l'appli (22 050 Hz) : fondamentale mesurée finement (balayage au 1/10 de cent)
  const { renderPerc } = require('../src/audio/synth');
  const { SR } = require('../src/audio/mixer');
  const peakCents = (buf: Float32Array, midi: number) => {
    const f0 = 440 * Math.pow(2, (midi - 69) / 12);
    const len = Math.min(buf.length, Math.round(0.4 * SR));
    const seg = Float64Array.from(buf.subarray(0, len), (x, i) => x * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (len - 1))));
    const power = (f: number) => {
      const k = 2 * Math.cos((2 * Math.PI * f) / SR);
      let s1 = 0, s2 = 0;
      for (let i = 0; i < seg.length; i++) { const s = seg[i] + k * s1 - s2; s2 = s1; s1 = s; }
      return s1 * s1 + s2 * s2 - k * s1 * s2;
    };
    let best = 0, bm = -1;
    for (let c = -60; c <= 60; c += 0.1) { const m = power(f0 * Math.pow(2, c / 1200)); if (m > bm) { bm = m; best = c; } }
    return best;
  };
  test.each([40, 52, 64, 76, 88])('guitare en tempérament égal à ±1 cent, à la fréquence de l\'appli (midi %i)', (m) => {
    expect(Math.abs(peakCents(renderGuitar(m, SR), m))).toBeLessThan(1);
  });
  test.each([31, 48, 60, 72, 84, 96])('piano en tempérament égal à ±1 cent, à la fréquence de l\'appli (midi %i)', (m) => {
    expect(Math.abs(peakCents(renderPiano(m, SR), m))).toBeLessThan(1);
  });
  test.each([['clic', 93], ['clic_fort', 100], ['bloc', 81]])('percussion %s sur une note du tempérament égal (midi %i)', (kind, m) => {
    expect(Math.abs(peakCents(renderPerc(kind, SR), m as number))).toBeLessThan(3);
  });
  test('rendu piano rapide', () => {
    const t = Date.now();
    for (let m = 60; m < 72; m++) renderPiano(m, 44100);
    expect(Date.now() - t).toBeLessThan(1500);
  });
});

describe('calibrage de latence', () => {
  const { computeLatency } = require('../src/engine/latency');
  test('médiane des écarts, frappes d\'échauffement ignorées', () => {
    const beat = 60000 / 90;
    const taps = Array.from({ length: 12 }, (_, k) => k * beat + (k < 3 ? 200 : 80 + (k % 2) * 10));
    expect(computeLatency(taps)).toBeGreaterThanOrEqual(80);
    expect(computeLatency(taps)).toBeLessThanOrEqual(90);
    expect(computeLatency([0, 100])).toBeNull();
  });
});

describe('pédagogie v2', () => {
  const { isAcquired } = require('../src/engine/fsrs');
  const { mergeParams } = require('../src/engine/generators');
  const DAY = 86_400_000;

  test('une réussite ouvre la suite, deux réussites le même soir ne font pas une maîtrise', () => {
    const now = Date.now();
    let c = review(newCompetence('pulsation', 'rythme'), 3, now);
    expect(isAcquired(c)).toBe(true);
    c = review(c, 3, now + 3_600_000);
    expect(isMastered(c, now + 3_600_000)).toBe(false);
    c = review(c, 3, now + 2 * DAY);
    expect(isMastered(c, now + 2 * DAY)).toBe(true);
  });
  test('un échec seul n\'ouvre rien', () => {
    const c = review(newCompetence('pulsation', 'rythme'), 1, Date.now());
    expect(isAcquired(c)).toBe(false);
  });
  test('difficulté adaptative : le niveau s\'applique, les réglages utilisateur priment', () => {
    const t = templateById('OR-1-01');
    expect(mergeParams(t, undefined, 2).ecart_min).toBe(1);
    expect(mergeParams(t, { ecart_min: 5 }, 2).ecart_min).toBe(5);
  });
  test('comptines : notes dans les degrés demandés', () => {
    const v = generate(templateById('RP-1-02'), undefined, 11, { instrument: 'piano' });
    expect(v.expected.kind).toBe('sequence');
    if (v.expected.kind === 'sequence') for (const n of v.expected.notes) expect([60, 62, 64]).toContain(n.midi);
  });
});

describe('micro', () => {
  const { gateFromNoise } = require('../src/engine/micgate');
  test('seuil = 3 × bruit, borné', () => {
    expect(gateFromNoise(Array(50).fill(0.004))).toBeCloseTo(0.012);
    expect(gateFromNoise(Array(50).fill(0.0001))).toBe(0.008);
    expect(gateFromNoise(Array(50).fill(0.1))).toBe(0.08);
  });
});

describe('palier 2 : justesse musicale', () => {
  const M = require('../src/engine/music');
  const { BOSS_2 } = require('../src/content/templates');
  const gen = (id: string, seed: number, instrument: 'piano' | 'guitare' = 'piano', params?: Record<string, unknown>) =>
    generate(templateById(id), params as never, seed, { instrument });
  const seeds = Array.from({ length: 25 }, (_, i) => i * 7919 + 3);

  test('théorie de base', () => {
    expect(M.diatonicTriad(60, 4)).toEqual([65, 69, 72]);
    expect(M.diatonicTriad(60, 5)).toEqual([67, 71, 74]);
    expect(M.degreeNoteName('G', 7)).toBe('fa♯');
    expect(M.degreeNoteName('F', 4)).toBe('si♭');
    expect(M.stepAfter(3)).toBe('demi-ton');
    expect(M.stepAfter(7)).toBe('demi-ton');
    expect(M.stepAfter(5)).toBe('ton');
  });
  test('majeur / mineur : la tierce correspond à la réponse', () => {
    for (const s of seeds) {
      const v = gen('OR-2-07', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const [r, t] = it.stimulus.slice(0, 2).map((n) => n.midi);
        expect(t - r).toBe(it.answerId === 'majeur' ? 4 : 3);
      }
    }
  });
  test('intervalles : l\'écart joué est la réponse', () => {
    for (const s of seeds) {
      const v = gen('OR-2-06', s, 'piano', { intervalles: [2, 3, 4] });
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) expect(String(it.stimulus[1].midi - it.stimulus[0].midi)).toBe(it.answerId);
    }
  });
  test('changement d\'accord : la basse change à la mesure annoncée', () => {
    for (const s of seeds) {
      const v = gen('OR-2-09', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const lowest = (bar: number) => Math.min(...it.stimulus.filter((n) => n.start >= bar * 4 && n.start < bar * 4 + 4).map((n) => n.midi));
        const first = [1, 2, 3].find((b) => lowest(b) !== lowest(0))!;
        expect(String(first + 1)).toBe(it.answerId);
      }
    }
  });
  test('pentatonique : les phrases « oui » n\'ont ni 4 ni 7, les « non » en ont', () => {
    for (const s of seeds) {
      const v = gen('OR-2-10', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const degs = it.stimulus.map((n) => M.midiToDegree(v.tonic, n.midi).degree);
        const tense = degs.some((d: number) => d === 4 || d === 7);
        expect(tense).toBe(it.answerId === 'non');
      }
    }
  });
  test('I, IV, V : l\'accord joué est celui de la réponse', () => {
    for (const s of seeds) {
      const v = gen('OR-2-08', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const root = Math.min(...it.stimulus.filter((n) => n.start >= 3).map((n) => n.midi));
        const base = Math.min(...it.stimulus.filter((n) => n.start < 3).map((n) => n.midi));
        expect(M.midiToDegree(base, root).degree).toBe(Number(it.answerId));
      }
    }
  });
  test('grille : la réponse est l\'accord de la mesure marquée', () => {
    const v = gen('TH-2-06', 5);
    if (v.expected.kind !== 'quiz') throw new Error();
    for (const it of v.expected.items) {
      if (it.display?.kind !== 'grid') throw new Error();
      const roman = it.display.bars.find((b) => b.startsWith('▶'))!.replace('▶ ', '');
      expect(['I', 'IV', 'V']).toContain(roman);
      expect(it.choices.some((c) => c.id === it.answerId)).toBe(true);
    }
  });
  test('3/4 et anacrouse', () => {
    const v = gen('RY-2-03', 4);
    if (v.expected.kind !== 'rhythm') throw new Error();
    expect(v.countInBeats).toBe(3);
    const a = gen('RY-2-05', 4);
    if (a.expected.kind !== 'rhythm') throw new Error();
    expect(a.countInBeats).toBe(3);
    expect(a.expected.onsetsBeats[0]).toBe(0);
    expect(a.expected.onsetsBeats[1]).toBe(1);
  });
  test('accords ouverts de guitare et accompagnement', () => {
    const v = gen('TE-2-05', 1, 'guitare', { accords: ['G'] });
    if (v.expected.kind !== 'set') throw new Error();
    expect(v.expected.midis).toEqual(M.GUITAR_OPEN.G);
    const q = gen('IM-2-03', 2);
    expect(q.backing?.chords).toHaveLength(4);
    expect(q.drone).toBeNull();
  });
  test('boss du palier 2', () => {
    for (const st of BOSS_2.steps) expect(() => templateById(st.templateId)).not.toThrow();
  });
});

describe('consignes et points de leçon', () => {
  const { CONSIGNES } = require('../src/content/consignes');
  const { LESSON_POINTS } = require('../src/content/lessons');
  const { howToAnswer, successText } = require('../src/engine/consigne');
  test('chaque exercice a une consigne et des points de leçon existants', () => {
    for (const t of TEMPLATES) {
      expect(CONSIGNES[t.id]).toBeDefined();
      expect(CONSIGNES[t.id].faire.length).toBeGreaterThan(30);
      expect(CONSIGNES[t.id].lecons.length).toBeGreaterThan(0);
      for (const id of CONSIGNES[t.id].lecons) expect(LESSON_POINTS[id]).toBeDefined();
    }
  });
  test('réussite exprimée en mots concrets, jamais en pourcentage', () => {
    for (const t of TEMPLATES) {
      const v = generate(t, undefined, 3, { instrument: 'piano' });
      const s = successText(t, v);
      expect(s).not.toMatch(/%/);
      expect(howToAnswer(t, v, t.inputs[0], 'piano').length).toBeGreaterThan(20);
    }
  });
  test('aucun énoncé ne montre de numéro d\'octave (do4, sol4…)', () => {
    for (const t of TEMPLATES) for (const inst of ['piano', 'guitare'] as const) {
      expect(generate(t, undefined, 9, { instrument: inst }).prompt).not.toMatch(/(do|ré|mi|fa|sol|la|si)[♯♭]?\d/);
    }
  });
});

describe('bourdon', () => {
  const { renderDrone } = require('../src/audio/synth');
  const M = require('../src/engine/music');
  test('voicing 1-5-8 dans un registre audible', () => {
    expect(M.droneFor(60)).toEqual([48, 55, 60]);
    expect(M.droneFor(45)).toEqual([45, 52, 57]);
    for (const m of M.droneFor(45)) expect(M.midiToFreq(m)).toBeGreaterThan(100);
  });
  test('on entend la tonique : la hauteur perçue est la tonique', () => {
    const b = renderDrone(M.droneFor(60), 44100);
    const f = yin(b.subarray(1000, 1000 + 4096), 44100)!;
    expect(M.mod12(M.freqToMidi(f))).toBe(0); // do
  });
  test('boucle sans craquement', () => {
    const b = renderDrone([48, 55, 60], 44100);
    let maxStep = 0;
    for (let i = 1; i < b.length; i++) maxStep = Math.max(maxStep, Math.abs(b[i] - b[i - 1]));
    expect(Math.abs(b[0] - b[b.length - 1])).toBeLessThan(maxStep * 1.2);
  });
  test('les exercices de résolution ont un bourdon', () => {
    for (const id of ['OR-1-04', 'OR-1-05', 'OR-1-06', 'OR-2-01']) expect(generate(templateById(id), undefined, 1, { instrument: 'piano' }).drone).not.toBeNull();
  });
});

describe('séance du jour v2', () => {
  test('ordre des notions : notes → gamme → tonique → degrés → … → intervalles → accords', () => {
    const order = ['notes_instrument', 'gamme_do', 'tonique', 'degres_1_3', 'degres_1_5', 'gamme_majeure', 'tierce_majeure', 'noms_notes', 'accords_145'];
    const idx = order.map((id) => CONCEPTS.findIndex((c) => c.id === id));
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    const req = (id: string) => CONCEPTS.find((c) => c.id === id)!.prerequis;
    expect(req('gamme_do')).toContain('notes_instrument');
    expect(req('tierce_majeure')).toContain('gamme_majeure');
    expect(req('accords_145')).toContain('noms_notes');
  });
  test('lecture sur la portée : mi sur la 1re ligne, do sous la portée', () => {
    const M = require('../src/engine/music');
    expect(M.staffStep(64)).toBe(0);
    expect(M.staffStep(60)).toBe(-2);
    expect(M.staffStep(77)).toBe(8);
  });
});

describe('nommer à l\'oreille', () => {
  const M = require('../src/engine/music');
  const t = templateById('OR-1-09');
  test('une note : la référence est jouée d\'abord, la réponse est le nom de la 2e note', () => {
    for (const s of [1, 2, 3, 4, 5]) for (const level of [0, 1]) {
      const v = generate(t, undefined, s, { instrument: 'piano', level });
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        expect(it.stimulus).toHaveLength(2);
        expect(M.pcName(it.stimulus[1].midi)).toBe(it.answerId);
        expect(it.choices.some((c) => c.id === it.answerId)).toBe(true);
        if (level === 0) expect(M.pcName(it.stimulus[0].midi)).toBe('do');
      }
    }
  });
  test('plusieurs notes : pavé en noms de notes, réponse dans l\'ordre', () => {
    const v = generate(t, undefined, 8, { instrument: 'guitare', level: 4 });
    expect(v.answerUI).toBe('degrees');
    expect(v.padNames?.[0]).toBe('do');
    if (v.expected.kind !== 'transcribe') throw new Error();
    const names = v.stimulus.slice(1).map((n) => M.pcName(n.midi));
    expect(v.expected.items.map((d) => v.padNames![d.degree - 1])).toEqual(names);
  });
});

describe('apports Use Your Ear et Tom Quayle', () => {
  const M = require('../src/engine/music');
  test('le contexte tonal est une cadence I-IV-V-I dans la tonalité', () => {
    for (const tonic of [60, 62, 67, 45]) {
      const ev = M.referenceEvents(tonic);
      const pcs = new Set(ev.map((e: { midi: number }) => M.mod12(e.midi - tonic)));
      for (const pc of pcs) expect([0, 2, 4, 5, 7, 9, 11]).toContain(pc); // tout dans la gamme
      const last = ev.filter((e: { start: number }) => e.start === 3).map((e: { midi: number }) => M.mod12(e.midi - tonic));
      expect(new Set(last)).toEqual(new Set([0, 4, 7])); // finit sur I
    }
  });
  test('tonique variée : plusieurs tonalités selon les variantes', () => {
    const keys = new Set(Array.from({ length: 30 }, (_, s) => M.mod12(generate(templateById('OR-1-06'), { tonalite: 'varie' }, s, { instrument: 'piano' }).tonic)));
    expect(keys.size).toBeGreaterThanOrEqual(4);
  });
  test('trouve la maison : la progression ne finit pas sur I, la réponse est la tonique, elle est révélée', () => {
    for (let s = 0; s < 20; s++) {
      const v = generate(templateById('OR-1-10'), undefined, s, { instrument: 'piano' });
      expect(v.revealTonic).toBe(true);
      if (v.expected.kind !== 'sequence') throw new Error();
      expect(M.mod12(v.expected.notes[0].midi - v.tonic)).toBe(0);
      const lastBass = Math.min(...v.stimulus.filter((n) => n.start === 6).map((n) => n.midi));
      expect(M.mod12(lastBass - v.tonic)).not.toBe(0);
    }
  });
  test('trouve la fonction : chaque cible est la bonne fonction de la fondamentale, dans la zone jouable', () => {
    for (const inst of ['piano', 'guitare'] as const) for (let s = 0; s < 30; s++) {
      const v = generate(templateById('TE-2-08'), undefined, s, { instrument: inst, level: 2 });
      if (v.expected.kind !== 'sequence' || v.display?.kind !== 'text') throw new Error();
      const asked = v.display.text.split('   ·   ');
      v.expected.notes.forEach((n, i) => {
        const [deg, arrow] = asked[i].replace(' (octave)', '').split(' ');
        expect(M.mod12(n.midi - v.markRoot!)).toBe(M.mod12(M.degreeToSemitone(Number(deg))));
        expect(arrow === '↑' ? n.midi > v.markRoot! : n.midi < v.markRoot!).toBe(true);
        expect(n.midi).toBeGreaterThanOrEqual(inst === 'guitare' ? 40 : 60);
        expect(n.midi).toBeLessThanOrEqual(inst === 'guitare' ? 71 : 84);
      });
    }
  });
  test('mémoire : une seule écoute (réécouter coûte une aide)', () => {
    expect(templateById('OR-1-11').reecoutesMax).toBe(0);
    expect(generate(templateById('OR-1-11'), undefined, 1, { instrument: 'piano' }).prompt).toMatch(/Une seule écoute/);
  });
});

describe('placement par domaine', () => {
  const PL = require('../src/content/placement');
  const simulate = (domain: string, profile: string, level: number) => {
    const n = PL.DOMAIN_PROBES[domain].length;
    const results: Record<number, boolean> = {};
    let k = PL.nextProbe(results, profile, n);
    let probes = 0;
    while (k !== null && probes < 30) { results[k] = k < level; probes++; k = PL.nextProbe(results, profile, n); }
    return { probes, results };
  };
  test('chaque sonde porte sur la bonne notion, dans le bon domaine', () => {
    for (const d of PL.PLACEMENT_DOMAINS) for (const pr of PL.DOMAIN_PROBES[d]) {
      const t = templateById(pr.templateId);
      expect(t.concepts[0]).toBe(pr.conceptId);
      expect(t.domain).toBe(d);
    }
  });
  test('dans chaque domaine, chaque profil trouve le bon niveau', () => {
    for (const d of PL.PLACEMENT_DOMAINS) for (const profile of ['bases', 'confirme', 'avance']) {
      const n = PL.DOMAIN_PROBES[d].length;
      for (const level of [0, 1, Math.floor(n / 2), n]) expect(PL.highestPassed(simulate(d, profile, level).results)).toBe(level - 1);
    }
  });
  test('débutant partout : 2 questions par domaine', () => {
    for (const d of PL.PLACEMENT_DOMAINS) expect(simulate(d, 'bases', 0).probes).toBe(2);
  });
  test('excellent en technique, débutant en rythme : bases en rythme, défis en technique', () => {
    const nT = PL.DOMAIN_PROBES.technique.length;
    const tech = simulate('technique', 'avance', nT).results;
    const ryt = simulate('rythme', 'bases', 0).results;
    const pairs = [...PL.placedPairs('technique', tech), ...PL.placedPairs('rythme', ryt)];
    expect(pairs.some((p: { domain: string }) => p.domain === 'rythme')).toBe(false);
    expect(pairs.filter((p: { domain: string }) => p.domain === 'technique').length).toBeGreaterThan(8);
    // les leçons acquises suivent : rien en rythme au-delà des bases
    const { lessonsFromConcepts } = require('../src/engine/cursus');
    const got = lessonsFromConcepts(new Set(pairs.map((p: { conceptId: string }) => p.conceptId))).acquired;
    expect(got).not.toContain('syncopes');
  });
});

describe('écriture', () => {
  const M = require('../src/engine/music');
  const { scoreFigures } = require('../src/engine/scoring');
  test('portée : position ↔ note, dans les deux sens', () => {
    for (let st = -4; st <= 12; st++) expect(M.staffStep(M.stepToMidi(st))).toBe(st);
    expect(M.stepToMidi(0)).toBe(64);
    expect(M.stepToMidi(-2)).toBe(60);
  });
  test('écris les notes : chaque nom désigne une seule place dans l\'étendue', () => {
    const t = templateById('TH-1-06');
    for (const level of [0, 1, 2]) for (let s = 0; s < 15; s++) {
      const v = generate(t, undefined, s, { instrument: 'piano', level });
      if (v.expected.kind !== 'sequence' || v.display?.kind !== 'text') throw new Error();
      const names = v.expected.notes.map((n) => M.pcName(n.midi));
      expect(new Set(names).size).toBe(names.length);
      expect(v.display.text.split('  ·  ')).toEqual(names);
    }
  });
  test('dictée sur la portée : la 1re note écrite est do, en do', () => {
    const v = generate(templateById('OR-1-12'), undefined, 4, { instrument: 'guitare' });
    expect(v.staffGiven).toEqual([60]);
    expect(v.tonic).toBe(60);
  });
  test('dictée rythmique : le son joué correspond exactement aux figures attendues', () => {
    for (let s = 0; s < 20; s++) {
      const v = generate(templateById('RY-2-07'), undefined, s, { instrument: 'piano', level: 1 });
      if (v.expected.kind !== 'figures') throw new Error();
      let b = 4;
      const onsets: number[] = [];
      for (const f of v.expected.items) { if (f === 'croches') onsets.push(b, b + 0.5); else if (f !== 'soupir') onsets.push(b); b += f === 'blanche' ? 2 : 1; }
      expect(v.stimulus.map((n) => n.start)).toEqual(onsets);
      expect(b - 4).toBe(8); // 2 mesures de 4 temps
    }
  });
  test('score des figures', () => {
    expect(scoreFigures(['noire', 'blanche', 'noire'], ['noire', 'blanche', 'noire']).precision).toBe(1);
    const r = scoreFigures(['noire', 'blanche', 'noire'], ['noire', 'noire', 'noire']);
    expect(r.errors[0].message).toContain('noire au lieu de blanche');
  });
});

describe('migration des données', () => {
  const { migrate, STORE_VERSION, RENAMED_TEMPLATES } = require('../src/store/migrate');
  test('un utilisateur v0 garde sa progression et reçoit les nouveaux champs', () => {
    const old = { xpTotal: 640, streak: 12, levels: { 'TH-2-02': 2, 'OR-1-01': 1 }, competences: { 'pulsation:rythme': { reps: 3 } } };
    const s = migrate(old, 0);
    expect(s.xpTotal).toBe(640);
    expect(s.streak).toBe(12);
    // v7 : la carte « pulsation × rythme » devient celle de la compétence de ses exercices
    expect(s.competences.pulsation.reps).toBe(3);
    expect(s.levels).toEqual({ 'TH-1-05': 2, 'OR-1-01': 1 });
    expect(s.seenPoints).toEqual([]);
    expect(s.onboarded).toBe(true);
  });
  test('les exercices renommés existent bien', () => {
    for (const to of Object.values(RENAMED_TEMPLATES) as string[]) expect(() => templateById(to)).not.toThrow();
    expect(STORE_VERSION).toBeGreaterThanOrEqual(2);
  });
});

describe('palier 1 allégé', () => {
  test('parcours principal : 2 à 3 exercices par notion', () => {
    for (const c of CONCEPTS.filter((x) => x.palier === 1)) {
      const core = TEMPLATES.filter((t) => t.concepts[0] === c.id && !t.optionnel);
      expect(core.length).toBeGreaterThanOrEqual(2);
      expect(core.length).toBeLessThanOrEqual(3);
    }
  });
});

describe('tablature', () => {
  const M = require('../src/engine/music');
  test('la position jouée sonne bien la note écrite, une octave plus bas', () => {
    const OPEN = [64, 59, 55, 50, 45, 40];
    for (const w of M.naturalsBetween(57, 79)) {
      const p = M.tabPosition(w);
      expect(OPEN[p.string] + p.fret).toBe(w - 12);
    }
    expect(M.tabPosition(60)).toEqual({ string: 4, fret: 3 }); // do : corde de la, case 3
    expect(M.tabPosition(64)).toEqual({ string: 3, fret: 2 }); // mi : corde de ré, case 2
  });
});

describe('version et nouveautés', () => {
  const V = require('../src/version');
  const { migrate } = require('../src/store/migrate');
  test('un utilisateur existant voit les nouveautés une fois, un nouveau non', () => {
    const migrated = migrate({ xpTotal: 50 }, 2);
    expect(V.unseenReleases(migrated.seenRelease).map((r: { version: string }) => r.version)).toEqual([V.APP_VERSION]);
    expect(V.unseenReleases(V.APP_VERSION)).toEqual([]);
  });
  test('chaque version a des notes, la plus récente en premier', () => {
    for (const r of V.RELEASES) expect(r.notes.length).toBeGreaterThan(0);
    expect(V.APP_VERSION).toBe(V.RELEASES[0].version);
  });
});



describe('portée en direct', () => {
  const M = require('../src/engine/music');
  test('naturelles sur leur ligne, altérations en dièse sur la note du dessous', () => {
    expect(M.spellOnStaff(64)).toEqual({ step: 0, sharp: false }); // mi
    expect(M.spellOnStaff(61)).toEqual({ step: -2, sharp: true }); // do♯
    expect(M.spellOnStaff(66)).toEqual({ step: 1, sharp: true }); // fa♯
  });
});

describe('affichage sans doublon (retour bêta)', () => {
  test('les notes à jouer ne sont jamais écrites à la fois dans l\'énoncé et dans l\'affichage', () => {
    for (const t of TEMPLATES) for (const inst of ['piano', 'guitare'] as const) for (const level of [0, 1, 2]) {
      const v = generate(t, undefined, 3, { instrument: inst, level });
      const d = v.display;
      const tokens = d?.kind === 'text' ? d.text.split(/\s*·\s*|\s+/).filter((x) => x.length > 1) : d?.kind === 'degrees' ? d.degrees : [];
      if (tokens.length >= 2) expect(tokens.every((x) => v.prompt.includes(x))).toBe(false);
    }
  });
  test('perroquet rythmique : métronome aux premiers niveaux, retiré au dernier', () => {
    const t = templateById('RY-1-04');
    expect(generate(t, undefined, 1, { instrument: 'piano', level: 0 }).metronomeCapture).toBeGreaterThan(0);
    expect(generate(t, undefined, 1, { instrument: 'piano', level: 2 }).metronomeCapture).toBeUndefined();
    const v = generate(t, undefined, 1, { instrument: 'piano', level: 0 });
    expect(Math.min(...v.stimulus.map((n) => n.start))).toBeGreaterThanOrEqual(4); // décompte avant le modèle
  });
});

describe('palier 3 : justesse musicale', () => {
  const M = require('../src/engine/music');
  const C = require('../src/engine/chroma');
  const G = require('../src/engine/generators');
  const gen = (id: string, level = 0, inst: 'piano' | 'guitare' = 'piano', seed = 3) => generate(templateById(id), undefined, seed, { instrument: inst, level });
  test('degrés en mineur : la note jouée est bien le degré attendu, après une cadence mineure', () => {
    for (let s = 0; s < 15; s++) {
      const v = gen('OR-3-02', 2, 'piano', s);
      expect(v.minorContext).toBe(true);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) expect(M.mod12(it.stimulus[0].midi - v.tonic)).toBe(M.mod12(C.DEG_SEMI[it.answerId]));
    }
    const ev = C.minorReference(57);
    expect(new Set(ev.filter((e: { start: number }) => e.start === 3).map((e: { midi: number }) => M.mod12(e.midi - 57)))).toEqual(new Set([0, 3, 7]));
  });
  test('dictée en mineur : les degrés attendus correspondent aux notes jouées', () => {
    for (let s = 0; s < 15; s++) {
      const v = gen('OR-3-03', 1, 'guitare', s);
      if (v.expected.kind !== 'transcribe') throw new Error();
      v.expected.items.forEach((d, i) => {
        const tok = `${d.acc === -1 ? 'b' : d.acc === 1 ? '#' : ''}${d.degree}`;
        expect(M.mod12(v.stimulus[i].midi - v.tonic)).toBe(M.mod12(C.DEG_SEMI[tok]));
      });
    }
  });
  test('majeur ou mineur : la version mineure contient un ♭3, jamais de 3', () => {
    for (let s = 0; s < 15; s++) {
      const v = gen('OR-3-01', 0, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const pcs = it.stimulus.map((n) => M.mod12(n.midi - v.tonic));
        if (it.answerId === 'mineur') expect(pcs).not.toContain(4);
        else expect(pcs).not.toContain(3);
      }
    }
  });
  test('triades : chaque accord a bien la structure de sa qualité, renversé ou non', () => {
    for (let s = 0; s < 20; s++) {
      const v = gen('OR-3-09', 2, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const block = it.stimulus.slice(3).map((n) => n.midi);
        const pcs = new Set(block.map((m) => M.mod12(m)));
        const roots = [...pcs].filter((root) => C.TRIAD_SEMI[it.answerId].every((x: number) => pcs.has(M.mod12(root + x))));
        expect(roots.length).toBeGreaterThan(0);
      }
    }
  });
  test('accords de la gamme et dictée de grille : la basse est le degré attendu', () => {
    for (let s = 0; s < 15; s++) {
      const v = gen('OR-3-10', 2, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const bass = Math.min(...it.stimulus.map((n) => n.midi));
        expect(M.mod12(bass - v.tonic)).toBe(M.mod12(M.degreeToSemitone(Number(it.answerId))));
      }
      const g = gen('OR-3-11', 2, 'piano', s);
      if (g.expected.kind !== 'transcribe') throw new Error();
      expect(g.expected.items[0].degree).toBe(1);
      g.expected.items.forEach((d, i) => {
        const bass = Math.min(...g.stimulus.filter((n) => n.start === i * 2).map((n) => n.midi));
        expect(M.mod12(bass - g.tonic)).toBe(M.mod12(M.degreeToSemitone(d.degree)));
      });
    }
  });
  test('intervalles : bon écart, dans le bon sens', () => {
    for (const [id, sens] of [['OR-3-05', 1], ['OR-3-06', -1]] as const) for (let s = 0; s < 10; s++) {
      const v = gen(id, 2, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) expect((it.stimulus[1].midi - it.stimulus[0].midi) * sens).toBe(Number(it.answerId));
    }
    const sv = gen('OR-3-08', 2, 'piano', 4);
    if (sv.expected.kind !== 'sequence') throw new Error();
    expect(C.INTERVAL_LABEL[sv.expected.notes[0].midi - sv.stimulus[0].midi]).toBeDefined();
  });
  test('syncopes et doubles croches : attaques justes, mesures complètes', () => {
    expect(G.figureOnsets('syncope')).toEqual([0, 0.5, 1.5]);
    expect(G.figureOnsets('doubles')).toEqual([0, 0.25, 0.5, 0.75]);
    for (let s = 0; s < 15; s++) {
      const v = gen('RY-3-03', 1, 'piano', s);
      if (v.expected.kind !== 'figures') throw new Error();
      expect(v.expected.items.reduce((a, f) => a + G.figureBeats(f), 0) % 4).toBe(0);
    }
  });
  test('blues : 12 mesures en 7e de dominante, licks dans la pentatonique mineure', () => {
    const b = G.backingFor('blues', 60);
    expect(b.chords).toHaveLength(12);
    for (const c of b.chords) expect(c.map((m: number) => m - c[0])).toEqual([0, 4, 7, 10]);
    for (let s = 0; s < 10; s++) {
      const v = gen('IM-3-01', 1, 'guitare', s);
      if (v.expected.kind !== 'sequence') throw new Error();
      for (const n of v.expected.notes) expect([0, 3, 5, 7, 10]).toContain(M.mod12(n.midi - v.tonic));
    }
  });
  test('gamme mineure jouée : 1 2 ♭3 4 5 ♭6 ♭7 8', () => {
    const v = gen('TE-3-01', 0, 'piano');
    if (v.expected.kind !== 'sequence') throw new Error();
    expect(v.expected.notes.slice(0, 8).map((n) => n.midi - v.tonic)).toEqual([0, 2, 3, 5, 7, 8, 10, 12]);
  });
});

describe('leçons : tous les exemples sonnent', () => {
  test('aucune note hors du registre audible dans les découvertes et les leçons', () => {
    for (const c of CONCEPTS) {
      const clips = [c.discover?.a, c.discover?.b, ...c.lecon.map((st: { example?: { notes: { midi: number }[] } }) => st.example)].filter(Boolean) as { notes: { midi: number }[] }[];
      for (const clip of clips) for (const n of clip.notes) {
        expect(n.midi).toBeGreaterThanOrEqual(28);
        expect(n.midi).toBeLessThanOrEqual(96);
      }
    }
  });
});

describe('palier 4 : justesse musicale', () => {
  const M = require('../src/engine/music');
  const C = require('../src/engine/chroma');
  const G = require('../src/engine/generators');
  const gen = (id: string, level = 0, inst: 'piano' | 'guitare' = 'piano', seed = 3) => generate(templateById(id), undefined, seed, { instrument: inst, level });
  test('accords de 7e de la gamme : Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7', () => {
    for (let d = 1; d <= 7; d++) {
      const ch = C.diatonicSeventh(48, d);
      expect(ch.map((m: number) => m - ch[0])).toEqual(C.SEVENTH_SEMI[C.DIATONIC7_QUALITY[d]]);
    }
  });
  test('couleur des 7e : la structure entendue est celle de la réponse', () => {
    for (let s = 0; s < 15; s++) {
      const v = gen('OR-4-01', 2, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const block = it.stimulus.slice(4).map((n) => n.midi);
        expect(block.map((m) => m - block[0])).toEqual(C.SEVENTH_SEMI[it.answerId]);
      }
    }
  });
  test('cadences : les deux derniers accords sont bien ceux de la cadence', () => {
    for (let s = 0; s < 20; s++) {
      const v = gen('OR-4-02', 2, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const bassAt = (t: number) => Math.min(...it.stimulus.filter((n) => Math.abs(n.start - t) < 0.01).map((n) => n.midi));
        const [a, b] = C.CADENCES[it.answerId].pair;
        expect(M.mod12(bassAt(3) - v.tonic)).toBe(M.mod12(M.degreeToSemitone(a)));
        expect(M.mod12(bassAt(4.5) - v.tonic)).toBe(M.mod12(M.degreeToSemitone(b)));
      }
    }
  });
  test('dictée en 7e : grille finissant par ii-V-I, chiffrage en 7e', () => {
    const v = gen('OR-4-03', 0, 'piano', 5);
    if (v.expected.kind !== 'transcribe') throw new Error();
    expect(v.expected.items.slice(-3).map((d) => d.degree)).toEqual([2, 5, 1]);
    expect(v.padNames).toEqual(['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']);
    expect(v.stimulus.filter((n) => n.start === 0)).toHaveLength(5); // 4 notes + basse
  });
  test('ii-V-I théorie : la bonne réponse est toujours proposée, et pas toujours au même rang', () => {
    const ranks = new Set<number>();
    for (let s = 0; s < 20; s++) {
      const v = gen('TH-4-03', 0, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) { const k = it.choices.findIndex((c) => c.id === it.answerId); expect(k).toBeGreaterThanOrEqual(0); ranks.add(k); }
    }
    expect(ranks.size).toBeGreaterThan(1);
  });
  test('notes-guides : tierce et septième de l\'accord nommé', () => {
    for (let s = 0; s < 10; s++) {
      const v = gen('TE-4-02', 0, 'piano', s);
      if (v.expected.kind !== 'set') throw new Error();
      expect(v.expected.midis).toHaveLength(2);
      const q = v.prompt.includes('maj7') ? 'maj7' : v.prompt.includes('m7') ? 'm7' : 'dom7';
      expect(v.expected.midis.map((m) => m - v.tonic)).toEqual([C.SEVENTH_SEMI[q][1], C.SEVENTH_SEMI[q][3]]);
    }
  });
  test('clé de fa : sol2 sur la 1re ligne, fa3 sur la 4e', () => {
    expect(M.spellOnStaff(43, 'fa').step).toBe(0);
    expect(M.spellOnStaff(53, 'fa').step).toBe(6);
    const v = gen('TH-4-04', 0, 'piano');
    if (v.expected.kind !== 'quiz') throw new Error();
    expect(v.expected.items[0].display).toMatchObject({ kind: 'staff', clef: 'fa' });
  });
  test('swing et triolets', () => {
    expect(G.figureOnsets('triolet').map((x: number) => +x.toFixed(3))).toEqual([0, 0.333, 0.667]);
    const v = gen('OR-4-04', 0, 'piano', 2);
    if (v.expected.kind !== 'quiz') throw new Error();
    for (const it of v.expected.items) {
      const off = +(it.stimulus[1].start % 1).toFixed(3);
      expect(off).toBe(it.answerId === 'swing' ? 0.667 : 0.5);
    }
  });
  test('notes cibles : la note au-dessus est bien la fonction annoncée ; la tierce visée est celle de chaque accord', () => {
    for (let s = 0; s < 15; s++) {
      const v = gen('OR-4-05', 1, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const chord = it.stimulus.filter((n) => n.start === 0).map((n) => n.midi);
        const top = it.stimulus.find((n) => n.start === 1)!.midi;
        const idx = { '1': 0, '3': 1, '5': 2, '7': 3 }[it.answerId as '1' | '3' | '5' | '7'];
        expect(M.mod12(top)).toBe(M.mod12(chord[idx]));
      }
    }
    const t = gen('IM-4-01', 0, 'piano');
    if (t.expected.kind !== 'sequence') throw new Error();
    // I-IV-V-I en do : mi, la, si, mi
    expect(t.expected.notes.map((n) => M.mod12(n.midi - t.tonic))).toEqual([4, 9, 11, 4]);
  });
});

describe('pratique : exercices façon Solo', () => {
  const D = require('../src/drills/engine');
  const { mulberry32 } = require('../src/engine/rng');
  const M = require('../src/engine/music');
  const STD = [40, 45, 50, 55, 59, 64];
  const cfg = (o: object) => ({ ...D.DEFAULT_DRILL, ...o });
  test('notes niveau 2 : toutes les positions de la note sur le manche, et rien d\'autre', () => {
    const r = mulberry32(3);
    for (let k = 0; k < 20; k++) {
      const t = D.makeTarget(cfg({ kind: 'notes', noteLevel: 2, accidentals: true }), r, 'guitare', STD);
      for (const p of t.positions) expect(M.mod12(STD[p.string] + p.fret)).toBe(t.rootPc);
      const count = STD.reduce((a: number, o: number) => a + Array.from({ length: 13 }, (_, f) => f).filter((f) => M.mod12(o + f) === t.rootPc).length, 0);
      expect(t.positions).toHaveLength(count);
    }
  });
  test('notes niveau 3 : positions toutes dans la zone, au moins 2', () => {
    const r = mulberry32(5);
    for (let k = 0; k < 20; k++) {
      const t = D.makeTarget(cfg({ kind: 'notes', noteLevel: 3 }), r, 'guitare', STD);
      expect(t.positions.length).toBeGreaterThanOrEqual(2);
      for (const p of t.positions) { expect(p.fret).toBeGreaterThanOrEqual(t.zone.frets[0]); expect(p.fret).toBeLessThanOrEqual(t.zone.frets[1]); }
    }
  });
  test('intervalles, accords, gammes : les notes attendues sont justes', () => {
    const r = mulberry32(7);
    for (let k = 0; k < 20; k++) {
      const i = D.makeTarget(cfg({ kind: 'intervalles', intervals: [7], playRootFirst: true }), r, 'piano', STD);
      expect(i.sequence).toEqual([i.rootPc, M.mod12(i.rootPc + 7)]);
      const a = D.makeTarget(cfg({ kind: 'accords', chordTypes: ['m7'], order: 'montant' }), r, 'piano', STD);
      expect(a.sequence).toEqual([0, 3, 7, 10].map((s) => M.mod12(a.rootPc + s)));
      const g = D.makeTarget(cfg({ kind: 'gammes', scales: ['dorien'], order: 'aller_retour' }), r, 'piano', STD);
      expect(g.sequence.slice(0, 8)).toEqual([0, 2, 3, 5, 7, 9, 10, 0].map((s) => M.mod12(g.rootPc + s)));
      expect(g.sequence).toHaveLength(15);
    }
  });
  test('progression : une mauvaise note est refusée et comptée ; le bon ordre termine la cible', () => {
    const t = { title: '', sub: '', sequence: [0, 4, 7], rootPc: 0 };
    let p = { index: 0, found: [], errors: 0 };
    let res = D.step(t, p, { midi: 62 }); expect(res.result).toBe('wrong'); p = res.p;
    for (const m of [60, 64]) { res = D.step(t, p, { midi: m }); expect(res.result).toBe('ok'); p = res.p; }
    res = D.step(t, p, { midi: 79 }); expect(res.result).toBe('done'); expect(res.p.errors).toBe(1);
  });
  test('notation : maj7 ou Δ7', () => {
    expect(D.chordLabel('do', 'maj7', 'maj7')).toBe('do maj7');
    expect(D.chordLabel('do', 'maj7', 'delta')).toBe('doΔ7');
    expect(D.chordLabel('si', 'm7b5', 'delta')).toBe('siø7');
  });
});


describe('points de leçon validés', () => {
  test('réussir un exercice valide ses points de leçon ; échouer ne valide rien', () => {
    const { validatePoints } = require('../src/engine/points');
    const { CONSIGNES } = require('../src/content/consignes');
    expect(validatePoints([], 'RY-1-03', false)).toEqual([]);
    expect(validatePoints([], 'RY-1-03', true)).toEqual(expect.arrayContaining(CONSIGNES['RY-1-03'].lecons));
    expect(validatePoints(['pulsation'], 'RY-1-03', true)).toContain('pulsation');
  });
});

describe('palier 5 : justesse musicale', () => {
  const M = require('../src/engine/music');
  const C = require('../src/engine/chroma');
  const gen = (id: string, level = 0, inst: 'piano' | 'guitare' = 'piano', seed = 3) => generate(templateById(id), undefined, seed, { instrument: inst, level });
  test('modes : la phrase ne contient que les notes du mode, et sa note caractéristique', () => {
    for (let s = 0; s < 20; s++) {
      const v = gen('OR-5-01', 2, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const mode = C.MODES[it.answerId];
        const allowed = mode.tokens.map((tk: string) => C.DEG_SEMI[tk]);
        const mel = it.stimulus.filter((n) => n.dur < 6);
        for (const n of mel) expect(allowed).toContain(M.mod12(n.midi - v.tonic));
        expect(mel.some((n) => M.mod12(n.midi - v.tonic) === C.DEG_SEMI[mode.char])).toBe(true);
      }
    }
  });
  test('emprunts : le 2e accord a bien la structure annoncée', () => {
    for (let s = 0; s < 15; s++) {
      const v = gen('OR-5-03', 2, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const second = it.stimulus.filter((n) => n.start === 2).map((n) => n.midi).sort((a, b) => a - b).slice(1);
        const base = v.tonic >= 55 ? v.tonic - 12 : v.tonic;
        expect(second.map((m) => m - base)).toEqual(C.BORROWED[it.answerId].semis);
      }
    }
  });
  test('l\'intrus : un seul accord hors gamme, à la position annoncée', () => {
    const SCALE = [0, 2, 4, 5, 7, 9, 11];
    for (let s = 0; s < 15; s++) {
      const v = gen('OR-5-04', 1, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const outside = [0, 1, 2, 3, 4].filter((i) => it.stimulus.filter((n) => n.start === i * 2).some((n) => !SCALE.includes(M.mod12(n.midi - v.tonic))));
        expect(outside).toEqual([Number(it.answerId) - 1]);
      }
    }
  });
  test('modulation : le dernier accord est la tonique de la tonalité d\'arrivée', () => {
    const TARGET: Record<string, [number, number[]]> = { reste: [0, [0, 4, 7]], V: [7, [0, 4, 7]], IV: [5, [0, 4, 7]], vi: [9, [0, 3, 7]] };
    for (let s = 0; s < 20; s++) {
      const v = gen('OR-5-05', 2, 'piano', s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const lastStart = Math.max(...it.stimulus.map((n) => n.start));
        const last = it.stimulus.filter((n) => n.start === lastStart).map((n) => n.midi).sort((a, b) => a - b);
        const [t, shape] = TARGET[it.answerId];
        expect(M.mod12(last[0] - v.tonic)).toBe(t); // basse = nouvelle tonique
        expect(new Set(last.slice(1).map((m) => M.mod12(m - last[0])))).toEqual(new Set(shape));
      }
    }
  });
  test('mesures impaires : un accent tous les N temps', () => {
    const v = gen('RY-5-03', 1, 'piano', 4);
    if (v.expected.kind !== 'quiz') throw new Error();
    for (const it of v.expected.items) {
      const accents = it.stimulus.filter((n) => n.midi === 84).map((n) => n.start);
      expect(accents[1] - accents[0]).toBe(Number(it.answerId));
    }
  });
  test('fonctions modales : chaque cible est la bonne fonction du mode', () => {
    for (let s = 0; s < 15; s++) {
      const v = gen('TE-5-03', 2, 'piano', s);
      if (v.expected.kind !== 'sequence' || v.display?.kind !== 'text') throw new Error();
      const toks = C.MODES.lydien.tokens;
      const notes = v.expected.notes;
      v.display.text.split('   ·   ').forEach((lab, i) => {
        const [deg, arrow] = lab.replace(' (octave)', '').split(' ');
        const n = notes[i].midi - v.markRoot!;
        const tk = deg === '1' ? '1' : toks.find((x: string) => C.tokLabel(x) === deg);
        expect(M.mod12(n)).toBe(M.mod12(C.DEG_SEMI[tk]));
        expect(arrow === '↑' ? n > 0 : n < 0).toBe(true);
      });
    }
  });
});

describe('positions sur le manche', () => {
  const P = require('../src/engine/positions');
  const STD = [40, 45, 50, 55, 59, 64];
  const PENTA_MIN = ['1', 'b3', '4', '5', 'b7'];
  test('pentatonique mineure de la, position 1 : la boîte classique, doigts 1-4 / 1-3', () => {
    const { notes, start } = P.scalePosition(9, PENTA_MIN, STD, 1);
    expect(start).toBe(4);
    expect(notes.map((n: { string: number; fret: number }) => `${n.string}:${n.fret}`)).toEqual(['0:5', '0:8', '1:5', '1:7', '2:5', '2:7', '3:5', '3:7', '4:5', '4:8', '5:5', '5:8']);
    expect(notes.map((n: { finger: number }) => n.finger)).toEqual([1, 4, 1, 3, 1, 3, 1, 3, 1, 4, 1, 4]);
    expect(notes.map((n: { degree: string }) => n.degree).slice(0, 5)).toEqual(['1', 'b3', '4', '5', 'b7']);
  });
  test('toutes les positions : uniquement des notes de la gamme, montantes, sans doublon, sur 5 cases', () => {
    for (const box of [1, 2, 3, 4, 5]) for (const root of [0, 4, 7, 9]) {
      const { notes, start } = P.scalePosition(root, PENTA_MIN, STD, box);
      expect(notes.length).toBeGreaterThanOrEqual(10);
      for (let i = 1; i < notes.length; i++) expect(notes[i].midi).toBeGreaterThan(notes[i - 1].midi);
      for (const n of notes) {
        expect([0, 3, 5, 7, 10]).toContain(((n.midi - root) % 12 + 12) % 12);
        expect(n.fret).toBeGreaterThanOrEqual(start);
        expect(n.fret).toBeLessThanOrEqual(start + 4);
      }
    }
  });
  test('formes d\'accords : sol majeur en forme de mi (case 3), do mineur en forme de la (case 3)', () => {
    const g = P.chordShape(7, 'majeur', 'E', STD);
    expect(g.map((n: { fret: number }) => n.fret)).toEqual([3, 5, 5, 4, 3, 3]);
    const cm = P.chordShape(0, 'mineur', 'A', STD);
    expect(cm.map((n: { string: number; fret: number }) => `${n.string}:${n.fret}`)).toEqual(['1:3', '2:5', '3:5', '4:4', '5:3']);
    for (const n of cm) expect([0, 3, 7]).toContain(((n.midi - 0) % 12 + 12) % 12);
  });
  test('arpèges : seulement les notes de l\'accord, étiquetées 1, 3, 5', () => {
    const { notes } = P.arpeggioPosition(0, [0, 4, 7], STD, 1);
    for (const n of notes) expect(['1', '3', '5']).toContain(n.degree);
    expect(P.alternatePicking(4)).toEqual(['↓', '↑', '↓', '↑']);
  });
});

describe('technique : positions, formes, vitesse', () => {
  const P = require('../src/engine/positions');
  const M = require('../src/engine/music');
  const STD = [40, 45, 50, 55, 59, 64];
  const gen = (id: string, level = 0, inst: 'piano' | 'guitare' = 'guitare', seed = 3) => generate(templateById(id), undefined, seed, { instrument: inst, level, tuning: STD });
  test('position guidée, puis fondamentales seules, puis de mémoire', () => {
    const [a, b, c] = [0, 1, 2].map((l) => gen('TE-3-04', l));
    expect(a.guide!.marks.length).toBeGreaterThanOrEqual(10);
    expect(b.guide!.marks.every((m) => m.label === '1')).toBe(true);
    expect(c.guide!.marks).toHaveLength(0);
    expect(c.guide!.zone).toBeDefined();
    if (a.expected.kind !== 'sequence') throw new Error();
    const up = P.scalePosition(M.mod12(a.tonic), ['1', 'b3', '4', '5', 'b7'], STD, 1).notes.map((n: { midi: number }) => n.midi);
    expect(a.expected.notes.map((n) => n.midi)).toEqual([...up, ...[...up].reverse().slice(1)]);
  });
  test('la progression parcourt les 5 positions une par une', () => {
    const boxes = new Set([0, 3, 6, 9, 12].map((l) => gen('TE-2-09', l).guide!.zone!.frets[0]));
    expect(boxes.size).toBe(5);
  });
  test('vitesse : tempos clés et un coup de médiator par note, en alternance', () => {
    const tempos = [0, 1, 2, 3, 4].map((l) => gen('TE-2-11', l).tempo);
    expect(tempos).toEqual([60, 80, 100, 120, 140]);
    const v = gen('TE-2-11', 2);
    if (v.expected.kind !== 'sequence') throw new Error();
    expect(v.guide!.staffLabels).toHaveLength(v.expected.notes.length);
    expect(v.guide!.staffLabels!.slice(0, 4)).toEqual(['↓', '↑', '↓', '↑']);
    expect(v.expected.checkRhythm).toBe(true);
  });
  test('formes d\'accords : les notes attendues sont exactement la forme', () => {
    for (let s = 0; s < 15; s++) {
      const v = gen('TE-3-06', 0, 'guitare', s);
      if (v.expected.kind !== 'set') throw new Error();
      expect(v.expected.midis).toHaveLength(v.guide!.marks.length);
      const pcs = new Set(v.expected.midis.map((m) => M.mod12(m)));
      expect(pcs.size).toBe(3); // une triade
    }
  });
  test('piano : doigtés sous chaque note de la gamme', () => {
    const v = gen('TE-2-10', 0, 'piano');
    if (v.expected.kind !== 'sequence') throw new Error();
    expect(v.guide!.staffLabels).toHaveLength(v.expected.notes.length);
    expect(v.guide!.staffLabels!.slice(0, 8)).toEqual(['1', '2', '3', '1', '2', '3', '4', '5']);
  });
  test('entends, trouve dans la position : la note jouée est un degré de la gamme', () => {
    for (let s = 0; s < 10; s++) {
      const v = gen('TE-2-12', 2, 'guitare', s);
      if (v.expected.kind !== 'sequence') throw new Error();
      expect([0, 2, 4, 5, 7, 9, 11]).toContain(M.mod12(v.expected.notes[0].midi - v.tonic));
    }
  });
});

describe('audiation et théorie utile', () => {
  const { UTILE } = require('../src/content/utile');
  const { TUNES, tuneDegreeSemis } = require('../src/content/tunes');
  const gen = (id: string, level = 0, seed = 3) => generate(templateById(id), undefined, seed, { instrument: 'piano', level });
  test('chaque notion a son « À quoi ça sert »', () => {
    for (const c of CONCEPTS) expect(UTILE[c.id]?.length).toBeGreaterThan(20);
  });
  test('audiation : le modèle n\'est pas joué avant, seulement la cadence ; il reste pour comparer', () => {
    for (const id of ['OR-1-13', 'RP-1-03']) {
      const v = gen(id, 1);
      expect(v.audiate).toBe(true);
      expect(v.referenceTonic).toBe(true);
      expect(v.stimulus.length).toBeGreaterThan(0);
      if (v.expected.kind !== 'sequence') throw new Error();
      expect(v.expected.notes.map((n) => n.midi)).toEqual(v.stimulus.map((n) => n.midi));
    }
    const v = gen('OR-1-13', 0);
    if (v.display?.kind !== 'degrees' || v.expected.kind !== 'sequence') throw new Error();
    const S = [0, 2, 4, 5, 7, 9, 11];
    v.display.degrees.forEach((d, i) => expect((v.expected as { notes: { midi: number }[] }).notes[i].midi - v.tonic).toBe(S[Number(d) - 1]));
  });
  test('où va la phrase : la réponse est la résolution de la note tendue', () => {
    const RES: Record<number, number> = { 11: 0, 2: 0, 5: 4, 9: 7 };
    for (let s = 0; s < 20; s++) {
      const v = gen('OR-2-14', 2, s);
      if (v.expected.kind !== 'sequence') throw new Error();
      const last = ((v.stimulus[v.stimulus.length - 1].midi - v.tonic) % 12 + 12) % 12;
      expect(((v.expected.notes[0].midi - v.tonic) % 12 + 12) % 12).toBe(RES[last]);
    }
  });
  test('mélodies : notes sous la tonique bien placées (sol grave d\'Amazing Grace)', () => {
    expect(tuneDegreeSemis(-5)).toBe(-5);
    expect(tuneDegreeSemis(-6)).toBe(-3);
    expect(tuneDegreeSemis(8)).toBe(12);
    const ag = TUNES.find((t: { id: string }) => t.id === 'amazing_grace');
    expect(ag.notes.map(([d]: [number]) => tuneDegreeSemis(d))).toEqual([-5, 0, 4, 0, 4, 2, 0, -3, -5]);
    for (const t of TUNES) for (const [, dur] of t.notes) expect(dur).toBeGreaterThan(0);
  });
});

describe('synchronisation : fusion de deux appareils', () => {
  const { mergeStates } = require('../src/store/mergeState');
  test('les jours joués sur chaque appareil sont tous gardés', () => {
    const phone = { xpByDay: { '2026-10-05': 40, '2026-10-06': 30 }, xpTotal: 70, competences: { 'a:rythme': { lastReview: 5 } }, seenConcepts: ['pulsation'], lastSessionDay: '2026-10-06', streak: 2 };
    const laptop = { xpByDay: { '2026-10-04': 25, '2026-10-06': 10 }, xpTotal: 35, competences: { 'a:rythme': { lastReview: 2 }, 'b:oreille': { lastReview: 3 } }, seenConcepts: ['grave_aigu'], lastSessionDay: '2026-10-04', streak: 1 };
    const m = mergeStates(phone, laptop);
    expect(m.xpByDay).toEqual({ '2026-10-04': 25, '2026-10-05': 40, '2026-10-06': 30 });
    expect(m.competences['a:rythme'].lastReview).toBe(5);
    expect(m.competences['b:oreille']).toBeDefined();
    expect(m.seenConcepts.sort()).toEqual(['grave_aigu', 'pulsation']);
    expect(m.streak).toBe(2);
  });
});

describe('indice rythmique : le comptage exact', () => {
  const G = require('../src/engine/generators');
  test('noire, croches, blanche, soupir en 4/4', () => {
    expect(G.countingHint(['noire', 'croches', 'blanche'], 4)).toBe('1 · 2-et · 3 — (4)');
    expect(G.countingHint(['croches', 'noire', 'soupir', 'noire'], 4)).toBe('1-et · 2 · (3) · 4');
    expect(G.countingHint(['noire', 'blanche'], 3)).toBe('1 · 2 — (3)');
  });
});

describe('retours bêta du 6-7 octobre', () => {
  const M = require('../src/engine/music');
  test('se repérer (guitare) : toutes les hauteurs de la note sur les cases 0 à 7, sans repère qui les donne', () => {
    for (let s = 0; s < 8; s++) {
      const v = generate(templateById('TE-1-02'), undefined, s, { instrument: 'guitare', level: 0 });
      if (v.expected.kind !== 'set') throw new Error();
      expect(v.hideTonic).toBe(true);
      const pc = M.mod12(v.expected.midis[0]);
      for (const m of v.expected.midis) expect(M.mod12(m)).toBe(pc);
      const all = new Set([40, 45, 50, 55, 59, 64].flatMap((o) => Array.from({ length: 8 }, (_, f) => o + f)).filter((m) => M.mod12(m) === pc));
      expect(v.expected.midis.length).toBe(all.size);
    }
  });
  test('valse : 1 mesure au 1er niveau, en 3 temps, décompte d\'une mesure', () => {
    const v = generate(templateById('RY-2-03'), undefined, 1, { instrument: 'piano', level: 0 });
    expect(v.perBar).toBe(3);
    expect(v.countInBeats).toBe(3);
    if (v.display?.kind !== 'rhythm') throw new Error();
    const G = require('../src/engine/generators');
    expect(v.display.items.reduce((a: number, f: string) => a + G.figureBeats(f), 0)).toBe(3);
  });
  test('quel mode ? : 2 modes au départ, un exemple à écouter pour chacun, sur un bourdon', () => {
    const v = generate(templateById('OR-5-01'), undefined, 2, { instrument: 'piano', level: 0 });
    if (v.expected.kind !== 'quiz') throw new Error();
    expect(v.drone).toBeTruthy();
    for (const it of v.expected.items) { expect(it.choices).toHaveLength(2); for (const c of it.choices) expect(c.preview!.length).toBeGreaterThan(8); }
  });
});

describe('leçons approfondies', () => {
  const { DEEP_LESSONS } = require('../src/content/deep');
  const { CONSIGNES } = require('../src/content/consignes');
  test('chaque exercice de pratique et de validation existe, avec sa consigne, et démarre', () => {
    for (const l of DEEP_LESSONS) {
      expect(CONCEPTS.some((c) => c.id === l.conceptId)).toBe(true);
      for (const pr of [...l.practice, l.validation, ...(l.guitarValidation ? [l.guitarValidation] : [])]) {
        const t = templateById(pr.templateId);
        expect(t).toBeDefined();
        expect(CONSIGNES[t.id]).toBeDefined();
        for (const inst of ['piano', 'guitare'] as const) expect(() => generate(t, pr.params, 3, { instrument: inst, level: 0 })).not.toThrow();
      }
    }
  });
  test('chaque écran a un titre, du texte posé (2 paragraphes au plus) et une illustration', () => {
    for (const l of DEEP_LESSONS) {
      expect(l.screens.length).toBeGreaterThanOrEqual(4);
      for (const s of l.screens) {
        expect(s.title.length).toBeGreaterThan(5);
        expect(s.paragraphs.length).toBeGreaterThanOrEqual(1);
        expect(s.paragraphs.length).toBeLessThanOrEqual(2);
        expect(s.illustration).toBeDefined();
        if (s.audio) for (const n of s.audio.notes) { expect(n.midi).toBeGreaterThanOrEqual(28); expect(n.midi).toBeLessThanOrEqual(96); }
      }
    }
  });
});

describe('leçons approfondies · palier 1 : justesse des nouveaux exercices', () => {
  const M = require('../src/engine/music');
  const gen = (id: string, params?: object, level = 0, seed = 3, inst: 'piano' | 'guitare' = 'piano') => generate(templateById(id), params as never, seed, { instrument: inst, level });
  test('ton ou demi-ton : l\'écart joué est la réponse', () => {
    for (let s = 0; s < 10; s++) {
      const v = gen('OR-1-15', { sens: 'les_deux', questions: 8 }, 0, s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) expect(Math.abs(it.stimulus[1].midi - it.stimulus[0].midi)).toBe(Number(it.answerId));
    }
  });
  test('la règle : mi-fa et si-do sont les seuls demi-tons entre notes naturelles', () => {
    const v = gen('TH-1-07', { questions: 30 }, 0, 4);
    if (v.expected.kind !== 'quiz') throw new Error();
    for (const it of v.expected.items) {
      const t = (it.display as { text: string }).text;
      const half = t.startsWith('mi →') || t.startsWith('si →') || t.includes('♯');
      expect(it.answerId).toBe(half ? '1' : '2');
    }
  });
  test('un ton, un demi-ton : les cibles sont à la bonne distance de la note en or', () => {
    for (let s = 0; s < 10; s++) {
      const v = gen('TE-1-09', { nb_cibles: 3, dessous: true }, 0, s, 'guitare');
      if (v.expected.kind !== 'sequence' || v.display?.kind !== 'text') throw new Error();
      const notes = v.expected.notes;
      const labs = v.display.text.split('\n');
      expect(new Set(labs.map((l) => l.slice(2))).size).toBe(labs.length); // jamais deux fois la même consigne
      labs.forEach((lab, i) => {
        const d = notes[i].midi - v.markRoot!;
        expect(Math.abs(d)).toBe(lab.includes('un ton') ? 2 : 1);
        expect(d > 0).toBe(lab.includes('au-dessus'));
      });
      expect(new Set(notes.map((n) => n.midi)).size).toBe(notes.length);
    }
  });
  test('gamme juste ou fausse : la version juste suit T T ½ T T T ½', () => {
    for (let s = 0; s < 10; s++) {
      const v = gen('OR-1-16', { questions: 6 }, 0, s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const steps = it.stimulus.slice(1).map((n, i) => n.midi - it.stimulus[i].midi);
        expect(steps.join(',') === '2,2,1,2,2,2,1').toBe(it.answerId === 'juste');
      }
    }
  });
  test('stable ou instable : 1, 3, 5 stables', () => {
    const v = gen('OR-1-17', { degres: [1, 2, 3, 4, 5, 6, 7], questions: 20 }, 0, 2);
    if (v.expected.kind !== 'quiz') throw new Error();
    for (const it of v.expected.items) {
      const st = ((it.stimulus[0].midi - v.tonic) % 12 + 12) % 12;
      expect(it.answerId).toBe([0, 4, 7].includes(st) ? 'stable' : 'instable');
    }
  });
  test('chante la résolution : 2 → 1 et 7 → 1', () => {
    for (let s = 0; s < 10; s++) {
      const v = gen('OR-1-18', { tensions: [2, 7] }, 0, s);
      if (v.expected.kind !== 'sequence') throw new Error();
      expect(M.mod12(v.expected.notes[0].midi - v.tonic)).toBe(0);
      expect(Math.abs(v.expected.notes[0].midi - v.stimulus[0].midi)).toBeLessThanOrEqual(2);
    }
  });
  test('le temps fort : une frappe au début de chaque mesure', () => {
    const v = gen('RY-1-06', { mesure: 3, mesures: 4 });
    if (v.expected.kind !== 'rhythm') throw new Error();
    expect(v.expected.onsetsBeats).toEqual([0, 3, 6, 9]);
    expect(v.perBar).toBe(3);
  });
});

describe('leçons approfondies · palier 2 : justesse des nouveaux exercices', () => {
  const M = require('../src/engine/music');
  const gen = (id: string, params?: object, level = 0, seed = 3, inst: 'piano' | 'guitare' = 'piano') => generate(templateById(id), params as never, seed, { instrument: inst, level });
  test('armure : écriture des notes (fa♯ sans accident en sol, fa naturel avec ♮, si♭ en fa)', () => {
    expect(M.spellWithKey(66, 1)).toEqual({ step: M.staffStep(65), acc: null });
    expect(M.spellWithKey(65, 1)).toEqual({ step: M.staffStep(65), acc: '♮' });
    expect(M.spellWithKey(70, -1)).toEqual({ step: M.staffStep(71), acc: null });
    expect(M.spellWithKey(61, 0).acc).toBe('♯');
    expect(M.nameInKey(73, 2)).toBe('do♯');
    expect(M.nameInKey(70, -2)).toBe('si♭');
    expect(M.MAJOR_KEYS.find((k: { sig: number }) => k.sig === 3).name).toBe('la');
  });
  test('tierces empilées : la quinte complète l\'accord, la taille de la tierce est juste', () => {
    for (let sd = 0; sd < 8; sd++) {
      const v = gen('TH-2-08', { questions: 12, niveau_q: 1 }, 0, sd);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const t = (it.display as { text: string }).text.split(' : ')[0];
        if (t.includes('→')) {
          const [a, b] = t.split(' → ');
          const big = ['do', 'fa', 'sol'].includes(a); // do-mi, fa-la, sol-si : tierces majeures
          expect(it.answerId).toBe(big ? 'M' : 'm');
          expect(b.length).toBeGreaterThan(1);
        }
        if (t.startsWith('Accord de')) expect(it.choices.some((c) => c.id === it.answerId)).toBe(true);
        if (t.includes(' · ') && !t.startsWith('Accord')) expect(it.answerId).toBe(['do · mi · sol', 'fa · la · do', 'sol · si · ré'].includes(t) ? 'maj' : 'min');
      }
    }
  });
  test('armure → tonalité : la réponse correspond à l\'armure affichée', () => {
    for (let sd = 0; sd < 8; sd++) {
      const v = gen('TH-2-09', { questions: 8, max: 3, sens: 'mixte' }, 0, sd);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        if (it.display?.kind === 'staff') expect(M.keyBySig(it.display.keySig).name).toBe(it.answerId);
        else expect(M.MAJOR_KEYS.find((k: { name: string }) => (it.display as { text: string }).text.toLowerCase().startsWith(k.name + ' ')).sig).toBe(Number(it.answerId));
        expect(it.choices.filter((c) => c.id === it.answerId)).toHaveLength(1);
      }
    }
  });
  test('l\'armure à l\'oreille : « conforme » si et seulement si on joue ce qui est écrit', () => {
    for (let sd = 0; sd < 10; sd++) {
      const v = gen('OR-2-16', { questions: 6, armures: [1, -1, 2] }, 0, sd);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        if (it.display?.kind !== 'staff') throw new Error();
        const same = it.stimulus.map((n) => n.midi).join() === it.display.midis.join();
        expect(it.answerId).toBe(same ? 'ok' : 'faux');
        // la partition est bien dans la tonalité : chaque note appartient à la gamme
        const k = M.keyBySig(it.display.keySig);
        for (const m of it.display.midis) expect([0, 2, 4, 5, 7, 9, 11]).toContain(M.mod12(m - k.pc));
      }
    }
  });
  test('la gamme de l\'armure : 8 notes T T ½ T T T ½ depuis la bonne tonique', () => {
    for (const inst of ['piano', 'guitare'] as const) for (let sd = 0; sd < 8; sd++) {
      const v = gen('TE-2-13', { armures: [1, 2, 3, -1, -2, -3] }, 0, sd, inst);
      if (v.expected.kind !== 'sequence' || v.display?.kind !== 'staff') throw new Error();
      const ms = v.expected.notes.map((n) => n.midi);
      expect(ms.slice(1).map((m, i) => m - ms[i]).join()).toBe('2,2,1,2,2,2,1');
      expect(M.mod12(ms[0])).toBe(M.keyBySig(v.display.keySig!).pc);
    }
  });
  test('lire avec l\'armure : on joue les notes altérées, au moins une', () => {
    for (let sd = 0; sd < 10; sd++) {
      const v = gen('TE-2-14', { nb_notes: 4, armures: [1, -1, 2] }, 0, sd);
      if (v.expected.kind !== 'sequence' || v.display?.kind !== 'staff') throw new Error();
      expect(v.expected.notes.map((n) => n.midi)).toEqual(v.display.midis);
      expect(v.display.midis.some((m) => !M.isNatural(m))).toBe(true);
      for (const m of v.display.midis) expect(M.spellWithKey(m, v.display.keySig!).acc).toBeNull();
    }
  });
  test('chante l\'arpège : 1-3-5-3-1 d\'un accord majeur', () => {
    for (let sd = 0; sd < 10; sd++) {
      const v = gen('OR-2-15', { accords: [1, 4, 5] }, 0, sd);
      if (v.expected.kind !== 'sequence') throw new Error();
      const m = v.expected.notes.map((n) => n.midi);
      expect([m[1] - m[0], m[2] - m[0], m[3] - m[1], m[4] - m[0]]).toEqual([4, 7, 0, 0]);
    }
  });
  test('relier deux positions : on monte puis on redescend, avec les seules notes de la penta', () => {
    for (const pos of [1, 2, 3, 4, 5]) {
      const v = gen('TE-2-15', { position: pos, guide: 'complet' }, 0, 1, 'guitare');
      if (v.expected.kind !== 'sequence') throw new Error();
      const m = v.expected.notes.map((n) => n.midi);
      const top = m.indexOf(Math.max(...m));
      for (let i = 1; i <= top; i++) expect(m[i]).toBeGreaterThan(m[i - 1]);
      for (let i = top + 1; i < m.length; i++) expect(m[i]).toBeLessThan(m[i - 1]);
      for (const x of m) expect([0, 2, 4, 7, 9]).toContain(M.mod12(x - v.tonic));
      expect(v.guide!.zone!.frets[1] - v.guide!.zone!.frets[0]).toBeGreaterThan(4);
    }
  });
  test('I, IV ou V : le jeu d\'accords demandé', () => {
    const v = gen('OR-2-08', { accords: [1, 4, 5, 6], questions: 12 }, 0, 5);
    if (v.expected.kind !== 'quiz') throw new Error();
    expect(v.expected.items[0].choices.map((c) => c.id)).toEqual(['1', '4', '5', '6']);
    expect(v.prompt).toContain('tonique');
  });
});

describe('leçons approfondies · paliers 3 à 5 : justesse des nouveaux exercices (0.21.0)', () => {
  const M = require('../src/engine/music');
  const gen = (id: string, params?: object, level = 0, seed = 3, inst: 'piano' | 'guitare' = 'piano') => generate(templateById(id), params as never, seed, { instrument: inst, level });
  const SEMIS: Record<string, number> = {
    'seconde mineure': 1, 'seconde majeure': 2, 'tierce mineure': 3, 'tierce majeure': 4, 'quarte juste': 5, 'quarte augmentée': 6,
    'quinte diminuée': 6, 'quinte juste': 7, 'sixte mineure': 8, 'sixte majeure': 9, 'septième mineure': 10, 'septième majeure': 11, octave: 12,
  };
  test('intervalle écrit : le nom correspond à la taille et aux lettres ; un renversement fait 12 demi-tons', () => {
    let staff = 0, inv = 0;
    for (let s = 0; s < 12; s++) {
      const v = gen('TH-3-05', { questions: 8, niveau_q: 1 }, 0, s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        expect(it.choices.map((c) => c.id)).toContain(it.answerId);
        expect(new Set(it.choices.map((c) => c.id)).size).toBe(it.choices.length);
        if (it.display?.kind === 'staff') {
          staff++;
          expect(SEMIS[it.answerId]).toBe(it.stimulus[1].midi - it.stimulus[0].midi);
        } else if (it.display?.kind === 'text' && it.display.text.startsWith('Le renversement')) {
          inv++;
          const x = it.display.text.replace("Le renversement d'une ", '').replace(' ?', '');
          expect(SEMIS[x] + SEMIS[it.answerId]).toBe(12);
        }
      }
    }
    expect(staff).toBeGreaterThan(5);
    expect(inv).toBeGreaterThan(5);
  });
  test('joue l\'intervalle : la note attendue est à la bonne distance de la note en or', () => {
    for (const inst of ['piano', 'guitare'] as const) for (let s = 0; s < 10; s++) {
      const v = gen('TE-3-07', { intervalles: [4] }, 0, s, inst);
      if (v.expected.kind !== 'sequence') throw new Error();
      expect(v.expected.notes[0].midi - v.markRoot!).toBe(4);
    }
  });
  test('les trois mineurs : la gamme jouée est celle de la réponse ; la gamme à jouer aussi', () => {
    const want: Record<string, number[]> = { naturel: [0, 2, 3, 5, 7, 8, 10, 12], harmonique: [0, 2, 3, 5, 7, 8, 11, 12], melodique: [0, 2, 3, 5, 7, 9, 11, 12] };
    const v = gen('OR-3-13', { questions: 12 }, 0, 2);
    if (v.expected.kind !== 'quiz') throw new Error();
    for (const it of v.expected.items) expect(it.stimulus.map((n) => n.midi - it.stimulus[0].midi)).toEqual(want[it.answerId]);
    for (const k of Object.keys(want)) {
      const w = gen('TE-3-08', { types: [k] });
      if (w.expected.kind !== 'sequence') throw new Error();
      expect(w.expected.notes.map((n) => n.midi - w.tonic)).toEqual(want[k]);
      expect(M.mod12(w.tonic)).toBe(9);
    }
  });
  test('familles de fonctions : I, iii, vi tonique ; ii, IV sous-dominante ; V, vii° dominante', () => {
    const FAM: Record<string, string> = { 'I)': 'tonique', 'iii)': 'tonique', 'vi)': 'tonique', 'ii)': 'sous', 'IV)': 'sous', 'V)': 'dominante', 'vii°)': 'dominante' };
    const v = gen('TH-3-06', { questions: 20 }, 0, 4);
    if (v.expected.kind !== 'quiz') throw new Error();
    for (const it of v.expected.items) {
      const rom = (it.display as { text: string }).text.split('(')[1];
      expect(it.answerId).toBe(FAM[rom]);
    }
  });
  test('basse d\'une grille : la fondamentale de chaque degré', () => {
    const v = gen('TE-3-09', { grilles: ['I-vi-IV-V'], tonalites: ['G'] });
    if (v.expected.kind !== 'sequence') throw new Error();
    expect(v.expected.notes.map((n) => M.mod12(n.midi))).toEqual([7, 4, 0, 2]);
  });
  test('cycle des quintes : la suite monte d\'une quinte ; les altérations et les voisines sont justes', () => {
    const SIG: Record<string, number> = { do: 0, sol: 1, 'ré': 2, la: 3, mi: 4, si: 5, 'fa♯': 6, fa: -1, 'si♭': -2, 'mi♭': -3, 'la♭': -4, 'ré♭': -5 };
    let seen = 0;
    for (let s = 0; s < 10; s++) {
      const v = gen('TH-4-05', { questions: 8 }, 0, s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const t = (it.display as { text: string }).text;
        expect(it.choices.map((c) => c.id)).toContain(it.answerId);
        if (t.includes('→ ?')) {
          const [a, b] = t.split(' → ');
          const step = SIG[b] - SIG[a];
          expect(SIG[it.answerId] - SIG[b]).toBe(step);
          seen++;
        } else if (t.startsWith('Les deux voisines')) {
          const k = t.replace('Les deux voisines de ', '').replace(' majeur sur le cercle ?', '');
          const names = it.answerId.split(' et ');
          expect(names.map((x) => SIG[x] - SIG[k]).sort()).toEqual([-1, 1]);
          seen++;
        }
      }
    }
    expect(seen).toBeGreaterThan(10);
  });
  test('quintes descendantes : chaque basse tombe d\'une quinte, la dernière est la tonique', () => {
    for (const inst of ['piano', 'guitare'] as const) {
      const v = gen('TE-4-06', { longueur: 5, tonalites: ['F'] }, 0, 1, inst);
      if (v.expected.kind !== 'sequence') throw new Error();
      const m = v.expected.notes.map((n) => n.midi);
      for (let i = 1; i < m.length; i++) expect(M.mod12(m[i - 1] - m[i])).toBe(7);
      expect(M.mod12(m[m.length - 1])).toBe(5);
    }
  });
  test('chante la note du mode : 1 ♭3 5 6 5 sur le bourdon', () => {
    const v = gen('OR-5-06');
    const e = v.expected;
    if (e.kind !== 'sequence') throw new Error();
    expect(e.notes.map((n) => n.midi - e.notes[0].midi)).toEqual([0, 3, 7, 9, 7]);
    expect(v.drone).toBeTruthy();
  });
  test('emprunt ou modulation : IV est de la gamme, iv, ♭VII, ♭VI, ♭III viennent du mineur', () => {
    const v = gen('TH-5-02', { questions: 30 }, 0, 6);
    if (v.expected.kind !== 'quiz') throw new Error();
    for (const it of v.expected.items) {
      const t = (it.display as { text: string }).text;
      if (t.includes('(IV)')) expect(it.answerId).toBe('gamme');
      else if (/\((iv|♭VII|♭VI|♭III)\)/.test(t)) expect(it.answerId).toBe('mineur');
    }
  });
  test('arpèges avec emprunt : I – iv – I en do = do mi sol, fa la♭ do, do mi sol', () => {
    const v = gen('TE-5-05', { grilles: ['I-iv-I'], tonalites: ['C'] });
    if (v.expected.kind !== 'sequence') throw new Error();
    expect(v.expected.notes.map((n) => M.mod12(n.midi))).toEqual([0, 4, 7, 5, 8, 0, 0, 4, 7]);
    const w = gen('TE-5-05', { grilles: ['I-bVII-I'], tonalites: ['G'] });
    if (w.expected.kind !== 'sequence') throw new Error();
    expect(w.expected.notes.map((n) => M.mod12(n.midi))).toEqual([7, 11, 2, 5, 9, 0, 7, 11, 2]);
  });
});

describe('modes (0.22.0) : justesse', () => {
  const M = require('../src/engine/music');
  const { MODES } = require('../src/engine/chroma');
  const gen = (id: string, params?: object, level = 0, seed = 3, inst: 'piano' | 'guitare' = 'piano') => generate(templateById(id), params as never, seed, { instrument: inst, level });
  const ORDER = ['ionien', 'dorien', 'phrygien', 'lydien', 'mixolydien', 'eolien', 'locrien'];
  const WHITE = ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'];
  const NAME_PC: Record<string, number> = { do: 0, 'ré♭': 1, 'ré': 2, 'mi♭': 3, mi: 4, fa: 5, 'fa♯': 6, sol: 7, 'la♭': 8, la: 9, 'si♭': 10, si: 11 };
  test('d\'où vient ce mode : décalage, gamme parente et formule sont justes', () => {
    let n = 0;
    for (let s = 0; s < 12; s++) {
      const v = gen('TH-5-03', { questions: 10, types: ['decalage', 'parent', 'formule'] }, 0, s);
      if (v.expected.kind !== 'quiz') throw new Error();
      for (const it of v.expected.items) {
        const t = (it.display as { text: string }).text;
        const m = it.answerId;
        expect(it.choices.map((c) => c.id)).toContain(m);
        expect(new Set(it.choices.map((c) => c.label)).size).toBe(it.choices.length);
        if (t.startsWith('Touches blanches')) {
          expect(t).toContain(`de ${WHITE[ORDER.indexOf(m)]} à`);
          // la réponse n'est pas devinable : aucun choix ne contient de nom de note
          for (const c of it.choices) for (const w of WHITE) expect(c.label.toLowerCase().split(' ')).not.toContain(w);
        }
        if (t.includes('quelle gamme majeure')) {
          // la gamme parente : ses notes, depuis do, donnent exactement le mode
          const parent = NAME_PC[it.choices.find((c) => c.id === m)!.label.replace(' majeur', '')];
          const majorPcs = [0, 2, 4, 5, 7, 9, 11].map((x) => M.mod12(parent + x)).sort((a: number, b: number) => a - b);
          const modePcs = MODES[m].tokens.map((tk: string) => M.mod12(({ '1': 0, b2: 1, '2': 2, b3: 3, '3': 4, '4': 5, '#4': 6, b5: 6, '5': 7, b6: 8, '6': 9, b7: 10, '7': 11 } as Record<string, number>)[tk])).sort((a: number, b: number) => a - b);
          expect(modePcs).toEqual(majorPcs);
        }
        if (/^[T½ ]+ : quel mode/.test(t)) {
          const steps = t.split(' : ')[0].split(' ').map((x) => (x === 'T' ? 2 : 1));
          const semis = steps.reduce((acc: number[], x) => [...acc, acc[acc.length - 1] + x], [0]).slice(0, 7);
          const want = MODES[m].tokens.map((tk: string) => ({ '1': 0, b2: 1, '2': 2, b3: 3, '3': 4, '4': 5, '#4': 6, b5: 6, '5': 7, b6: 8, '6': 9, b7: 10, '7': 11 } as Record<string, number>)[tk]);
          expect(semis).toEqual(want);
        }
        n++;
      }
    }
    expect(n).toBeGreaterThan(100);
  });
  test('un mode sur une corde (guitare) et en octave (piano) : les bonnes notes, le doigté du lydien', () => {
    for (const m of ['dorien', 'mixolydien', 'lydien', 'phrygien']) {
      const v = gen('TQ-1-01', { gamme: m }, 0, 1, 'guitare');
      if (v.expected.kind !== 'sequence') throw new Error();
      expect(v.expected.notes.map((n) => n.midi - v.tonic)).toEqual([...MODES[m].tokens.map((tk: string) => ({ '1': 0, b2: 1, '2': 2, b3: 3, '3': 4, '4': 5, '#4': 6, '5': 7, b6: 8, '6': 9, b7: 10, '7': 11 } as Record<string, number>)[tk]), 12]);
      const w = gen('TE-2-09', { gamme: m, guide: 'complet', aller_retour: false }, 0, 1, 'piano');
      if (w.expected.kind !== 'sequence') throw new Error();
      expect(w.expected.notes).toHaveLength(8);
      const g = gen('TE-2-09', { gamme: m, position: 1, guide: 'complet', aller_retour: false }, 0, 1, 'guitare');
      if (g.expected.kind !== 'sequence') throw new Error();
      const pcs = new Set(MODES[m].tokens.map((tk: string) => M.mod12(g.tonic + ({ '1': 0, b2: 1, '2': 2, b3: 3, '3': 4, '4': 5, '#4': 6, '5': 7, b6: 8, '6': 9, b7: 10, '7': 11 } as Record<string, number>)[tk])));
      for (const n of g.expected.notes) expect(pcs.has(M.mod12(n.midi))).toBe(true);
    }
    const ly = gen('TE-2-09', { gamme: 'lydien', guide: 'complet', aller_retour: false }, 0, 1, 'piano');
    expect(ly.guide!.staffLabels).toEqual(['1', '2', '3', '4', '1', '2', '3', '4']);
  });
  test('le perroquet modal annonce les notes du mode, pas la pentatonique', () => {
    const v = gen('IM-5-01', { degres: ['1', '2', '3', '#4', '5', '6', '7'] });
    expect(v.hint).toContain('♯4');
    expect(v.hint).not.toContain('pentatonique');
  });
});

describe('retours du 12 octobre : octave', () => {
  test('une réponse jouée entièrement une octave plus bas (guitare) est juste ; un ton au-dessus d\'une note marquée, non', () => {
    const t = templateById('TE-1-06');
    const v = generate(t, { nb_notes: 3, de: 64, a: 71 }, 2, { instrument: 'guitare', level: 0 });
    if (v.expected.kind !== 'sequence') throw new Error();
    const low = v.expected.notes.map((n, i) => ({ midi: n.midi - 12, tMs: i * 500 }));
    expect(scoreAnswer(t, { ...v, expected: { ...v.expected, octaveAgnostic: false } }, { kind: 'notes', notes: low } as never).success).toBe(true);
    const s = templateById('TE-1-09');
    const w = generate(s, { nb_cibles: 1, dessous: false }, 2, { instrument: 'piano', level: 0 });
    if (w.expected.kind !== 'sequence') throw new Error();
    const wrong = w.expected.notes.map((n, i) => ({ midi: n.midi - 12, tMs: i * 500 }));
    expect(scoreAnswer(s, w, { kind: 'notes', notes: wrong } as never).success).toBe(false);
  });
  test('la bonne note à la mauvaise octave : message clair', () => {
    const { scoreSequence } = require('../src/engine/scoring');
    const r = scoreSequence([{ midi: 62, start: 0, dur: 1 }, { midi: 64, start: 1, dur: 1 }], [{ midi: 62, tMs: 0 }, { midi: 52, tMs: 500 }], { tempo: 60, tolMs: 200, tolCents: 50, checkRhythm: false, octaveAgnostic: false, tonic: 60 });
    expect(r.errors[0].message).toContain('une octave trop bas');
  });
});

test('les degrés se lisent sur une vraie portée en do (plus d\'échelle sans interlignes)', () => {
  const v = generate(templateById('TH-2-01'), { questions: 10, max_degre: 7 }, 4, { instrument: 'piano', level: 0 });
  if (v.expected.kind !== 'quiz') throw new Error();
  const MAJ = [0, 2, 4, 5, 7, 9, 11];
  for (const it of v.expected.items) {
    expect(it.display).toEqual({ kind: 'staff', midis: [60, 60 + MAJ[Number(it.answerId) - 1]] });
  }
});
