// Pour les musiciens avancés (0.25.0) : un chapitre « pour aller plus loin », la lecture à vue en rythme,
// le repiquage de phrases longues, et le jam pour improviser sur une grille.
import { templateById } from '../src/content/templates';
import { generate } from '../src/engine/generators';
import { buildJam, chordLabel, chordPcs, PROGRESSIONS, STYLES } from '../src/engine/jam';
import { DEEP_LESSONS } from '../src/content/deep';
import { lessonsFromConcepts } from '../src/engine/cursus';
import { mod12 } from '../src/engine/music';

const gen = (id: string, seed = 3, instrument: 'piano' | 'guitare' = 'piano', level = 0) => generate(templateById(id), undefined, seed, { instrument, level });

describe('pour aller plus loin', () => {
  test('dominante secondaire : un accord de 7 une quinte au-dessus de sa cible', () => {
    for (let s = 0; s < 20; s++) {
      const e = gen('TH-6-01', s).expected;
      if (e.kind !== 'set') throw new Error('forme inattendue');
      const [r, t, f, sv] = e.midis.map((m) => m - e.midis[0]);
      expect([r, t, f, sv]).toEqual([0, 4, 7, 10]);
    }
  });
  test('conduite des voix : la réponse bouge moins que n\'importe quel autre renversement', () => {
    for (let s = 0; s < 20; s++) {
      const v = gen('TE-6-02', s);
      if (v.expected.kind !== 'set' || v.display?.kind !== 'staff') throw new Error('forme inattendue');
      const start = [...v.display.midis].sort((a, b) => a - b);
      const best = [...v.expected.midis].sort((a, b) => a - b);
      const moved = best.reduce((acc, m, i) => acc + Math.abs(m - start[i]), 0);
      // sans note commune (IV → V), chaque voix bouge d'un ton : 6 demi-tons au total au plus
      expect(moved).toBeLessThanOrEqual(6);
    }
  });
  test('ligne des notes-guides : une note par accord, au 1er temps, rythme vérifié', () => {
    const v = gen('TE-6-03');
    expect(v.expected.kind).toBe('sequence');
    if (v.expected.kind === 'sequence') {
      expect(v.expected.notes.map((n) => n.start)).toEqual([0, 4, 8]);
      expect(v.expected.checkRhythm).toBe(true);
    }
  });
  test('une fois ii – V – I et les modes acquis, le chapitre s\'ouvre au placement', () => {
    const all = new Set(DEEP_LESSONS.flatMap((l) => l.concepts));
    const r = lessonsFromConcepts(all);
    for (const id of ['dominantes_secondaires', 'extensions', 'conduite_voix', 'modes_melodique']) expect(r.acquired).toContain(id);
  });
});

describe('lecture à vue en rythme', () => {
  test('une note par attaque du rythme écrit, rythme vérifié, du plus simple au plus riche', () => {
    for (const level of [0, 1, 2, 3]) for (const inst of ['piano', 'guitare'] as const) {
      const v = gen('TE-2-16', 5, inst, level);
      if (v.display?.kind !== 'staffRhythm' || v.expected.kind !== 'sequence') throw new Error('forme inattendue');
      expect(v.display.midis.length).toBe(v.expected.notes.length);
      expect(v.expected.checkRhythm).toBe(true);
      expect(v.simultaneous).toBe(true);
    }
  });
});

describe('repiquage de phrases longues', () => {
  test('la phrase s\'allonge avec le niveau, et se transcrit ensuite en degrés', () => {
    const short = gen('RP-4-01', 2, 'piano', 0);
    const long = gen('RP-4-01', 2, 'piano', 2);
    expect(long.transcription!.length).toBeGreaterThan(short.transcription!.length);
    expect(long.transcription!.length).toBe(10);
  });
});

describe('jam', () => {
  test('chaque grille, chaque style : une boucle de mesures entières, basse grave, accords au milieu', () => {
    for (const p of PROGRESSIONS) for (const st of STYLES) {
      const j = buildJam(p, st, 7, st.tempo, 'piano');
      expect(j.beats % 4).toBe(0);
      expect(j.bars.length * 4).toBe(j.beats);
      const [comp, bass] = j.layers;
      const avg = (xs: { midi: number }[]) => xs.reduce((a, n) => a + n.midi, 0) / xs.length;
      expect(avg(bass.notes)).toBeLessThan(avg(comp.notes) - 7);
      expect(Math.min(...bass.notes.map((n) => n.midi))).toBeGreaterThanOrEqual(28);
      for (const l of j.layers) for (const n of l.notes) expect(n.start).toBeLessThan(j.beats);
    }
  });
  test('noms d\'accords et notes à viser', () => {
    const pop = PROGRESSIONS.find((p) => p.id === 'pop')!;
    expect(pop.bars.map((c) => chordLabel(c, 0))).toEqual(['do', 'sol', 'la m', 'fa']);
    expect(chordPcs(pop.bars[2], 0)).toEqual([9, 0, 4]);
    const blues = PROGRESSIONS.find((p) => p.id === 'blues')!;
    expect(blues.bars).toHaveLength(12);
    expect(chordLabel(blues.bars[4], 7)).toBe('do 7');
    expect(mod12(7 + blues.scale[2])).toBe(0);
  });
});
