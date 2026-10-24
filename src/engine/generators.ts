// Générateurs : un gabarit + des paramètres + un seed → une variante jouable.
// Déterministes : le même seed produit toujours la même variante (réinjection, débogage).
import type {
  DegreeItem, ExerciseTemplate, Instrument, NoteEvent, Params, QuizItem, RhythmSymbol, Variant,
} from '../content/types';
import { mulberry32, pick, randInt, shuffle, type Rng } from './rng';
import {
  beatsToMs, degreeItemsFromNotes, degreeNoteName, degreeToMidi, diatonicTriad, GUITAR_OPEN, KEY_LABEL, KEY_PC, mod12, noteName,
  pcName, resolveTonic, ROMAN, stepAfter, triad, droneFor, naturalsBetween, VARIED_KEYS, degreeToSemitone,
} from './music';
import { alternatePicking, arpeggioPosition, chordShape, CHORD_SHAPES, pianoLeftFingering, pianoScaleFingering, scalePosition } from './positions';
import { alteredLetters, applyKeySig, FLAT_NAMES, keyBySig, MAJOR_KEYS, nameInKey, referenceEvents, SHARP_NAMES } from './music';
import { BORROWED, MODES, CADENCES, chordName, diatonicSeventh, DIATONIC7_ROMAN, scaleNote, SEVENTH_LABEL, SEVENTH_SEMI, DEG_SEMI, DIATONIC_QUALITY, DIATONIC_ROMAN, INTERVAL_LABEL, MAJOR, MINOR, MINOR_PENTA, TRIAD_LABEL, TRIAD_SEMI, tokenMelody, tokLabel, tokMidi, tokToItem, triadOf } from './chroma';
import { tunesFor, tuneDegreeSemis, TUNES } from '../content/tunes';
import { maxLevel, resolveParams } from './difficulty';

export interface GenContext { /** accordage de la guitare (corde 0 = la plus grave) */ tuning?: number[]; instrument: Instrument }

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);
const nums = (v: unknown, d: number[]) => (Array.isArray(v) ? (v as number[]) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

/** tempo : nombre fixe ou [min, max] */
function tempoFrom(p: Params, r: Rng, d = 80): number {
  const t = p.tempo;
  if (Array.isArray(t)) return randInt(r, Number(t[0]), Number(t[1]));
  return num(t, d);
}

/** réglages du gabarit < palier de difficulté atteint < réglages imposés par le contexte (voir engine/difficulty) */
export const mergeParams = resolveParams;
export { maxLevel };

function baseVariant(t: ExerciseTemplate, seed: number, tonic: number, tempo: number): Variant {
  return {
    seed, tempo, tonic, prompt: t.description, stimulus: [], stimulusKind: 'none', referenceTonic: false,
    countInBeats: 0, clickDuringCapture: false, simultaneous: false, drone: null, captureMs: 0,
    answerUI: 'quiz', expected: { kind: 'free' }, hint: '',
  };
}

/** Mélodie en degrés : conjointe (pas par pas dans le réservoir) ou libre. */
export function makeMelody(
  r: Rng, tonic: number, pool: number[], n: number,
  opts: { conjoint?: boolean; rythme?: 'noires' | 'mixte'; endOn?: number; startOn?: number } = {},
): { notes: NoteEvent[]; degrees: number[] } {
  const sorted = [...pool].sort((a, b) => a - b);
  const degrees: number[] = [];
  let prev = opts.startOn ?? (sorted.includes(1) ? 1 : pick(r, sorted));
  degrees.push(prev);
  for (let i = 1; i < n; i++) {
    let cands = sorted.filter((d) => d !== prev && (!opts.conjoint || Math.abs(sorted.indexOf(d) - sorted.indexOf(prev)) === 1));
    if (cands.length === 0) cands = sorted;
    prev = pick(r, cands);
    degrees.push(prev);
  }
  if (opts.endOn !== undefined && n > 1) {
    degrees[n - 1] = opts.endOn;
  }
  const notes: NoteEvent[] = [];
  let t = 0;
  degrees.forEach((d, i) => {
    let dur = 1;
    if (opts.rythme === 'mixte') {
      dur = i === n - 1 ? 2 : pick(r, [1, 1, 0.5, 0.5, 2]);
    }
    notes.push({ midi: degreeToMidi(tonic, d), start: t, dur });
    t += dur;
  });
  return { notes, degrees };
}

/** Rythme en mesures de 4/4 composé de noires, blanches et soupirs. */
/** durée d'une figure en temps (noire = 1) */
export const figureBeats = (s: RhythmSymbol) => (s === 'blanche' || s === 'syncope' ? 2 : 1);
/** attaques d'une figure, en temps depuis son début. Syncope = croche, noire, croche. */
export function figureOnsets(s: RhythmSymbol): number[] {
  switch (s) {
    case 'soupir': return [];
    case 'croches': return [0, 0.5];
    case 'doubles': return [0, 0.25, 0.5, 0.75];
    case 'syncope': return [0, 0.5, 1.5];
    case 'triolet': return [0, 1 / 3, 2 / 3];
    default: return [0];
  }
}

/** Comptage à dire pour un rythme : « 1 · 2-et · 3 — · (4) » ; entre parenthèses, on ne tape pas. */
export function countingHint(items: RhythmSymbol[], perBar: number): string {
  let beat = 0;
  const parts = items.map((s) => {
    const n = (beat % perBar) + 1;
    const next = ((beat + 1) % perBar) + 1;
    beat += figureBeats(s);
    switch (s) {
      case 'soupir': return `(${n})`;
      case 'croches': return `${n}-et`;
      case 'doubles': return `${n}-e-et-a`;
      case 'triolet': return `${n}-tri-o`;
      case 'syncope': return `${n}-et (${next}) et`;
      case 'blanche': return `${n} — (${next})`;
      default: return String(n);
    }
  });
  return parts.join(' · ');
}

function makeRhythmBars(r: Rng, bars: number, symbols: RhythmSymbol[], perBar = 4): { items: RhythmSymbol[]; onsets: number[]; total: number } {
  const items: RhythmSymbol[] = [];
  const onsets: number[] = [];
  let beat = 0;
  for (let b = 0; b < bars; b++) {
    let inBar = 0;
    while (inBar < perBar) {
      const choices = symbols.filter((s) => (figureBeats(s) === 2 ? inBar <= perBar - 2 : true) && !(s === 'soupir' && b === 0 && inBar === 0));
      const s = pick(r, choices);
      items.push(s);
      onsets.push(...figureOnsets(s).map((o) => beat + o));
      const len = figureBeats(s);
      inBar += len;
      beat += len;
    }
  }
  return { items, onsets, total: beat };
}

const choice = (id: string, label: string) => ({ id, label });

/** grille « I-IV-V-I » → un accord par mesure, voix graves sous la mélodie */
export function backingFor(grid: string, tonic: number): { chords: number[][]; beatsPerBar: number } {
  const base = tonic >= 55 ? tonic - 12 : tonic;
  if (grid === 'blues') {
    // blues de 12 mesures : I7 I7 I7 I7 | IV7 IV7 I7 I7 | V7 IV7 I7 V7
    const dom7 = (root: number) => [root, root + 4, root + 7, root + 10];
    const roots = [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];
    return { chords: roots.map((x) => dom7(base + x)), beatsPerBar: 4 };
  }
  const deg: Record<string, number> = { I: 1, ii: 2, iii: 3, IV: 4, V: 5, vi: 6 };
  return { chords: grid.split('-').map((g) => diatonicTriad(base, deg[g] ?? 1)), beatsPerBar: 4 };
}

const blockAndArp = (notes: number[], start = 0) => [
  ...notes.map((m, i) => ({ midi: m, start: start + i * 0.5, dur: 0.5 })),
  ...notes.map((m) => ({ midi: m, start: start + notes.length * 0.5, dur: 2 })),
];

const keyFrom = (p: Params, r: Rng) => {
  const keys = Array.isArray(p.tonalites) ? (p.tonalites as unknown as string[]) : ['C', 'G', 'F'];
  return pick(r, keys);
};

export function generate(t: ExerciseTemplate, overrides: Params | undefined, seed: number, ctx: GenContext & { level?: number }): Variant {
  const p = mergeParams(t, overrides, ctx.level ?? 0);
  const r = mulberry32(seed);
  const tempo = tempoFrom(p, r, 80);
  const voice = t.mechanic === 'chanter';
  // « varie » : une tonique différente à chaque variante (trouver la maison devient un vrai travail d'oreille)
  const tonic = p.tonalite === 'varie' ? resolveTonic({ tonalite: pick(r, VARIED_KEYS) }, ctx.instrument, voice) : resolveTonic(p, ctx.instrument, voice);
  const v = baseVariant(t, seed, tonic, tempo);
  const nQ = num(p.questions, 5);

  switch (t.generator) {
    case 'pulse_tap': {
      const beats = num(p.temps, 8);
      const mel = makeMelody(r, tonic, [1, 2, 3, 4, 5], beats + 2, { rythme: 'mixte' });
      const notes = mel.notes.filter((n) => n.start < beats);
      return {
        ...v, prompt: 'Tape la pulsation pendant que la musique joue.',
        stimulus: notes, stimulusKind: 'melody', simultaneous: true, countInBeats: 4,
        // 1er niveau : le clic continue sous la musique ; ensuite on le retire pour trouver la pulsation seul
        clickDuringCapture: bool(p.clic, false),
        captureMs: beatsToMs(beats, tempo) + 400, answerUI: 'tap',
        expected: { kind: 'rhythm', onsetsBeats: Array.from({ length: beats }, (_, i) => i), absolute: true },
        hint: 'Écoute le clic du décompte : garde exactement cet écart entre chaque tape.',
      };
    }
    case 'tempo_compare': {
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const fast = r() < 0.5;
        const tp = fast ? randInt(r, 120, 140) : randInt(r, 60, 72);
        return {
          stimulus: makeMelody(r, tonic, [1, 2, 3, 4, 5], 6, { conjoint: true }).notes, tempo: tp,
          choices: [choice('lent', 'Lent'), choice('rapide', 'Rapide')], answerId: fast ? 'rapide' : 'lent',
        };
      });
      return { ...v, prompt: 'Ce morceau est-il rapide ou lent ?', answerUI: 'quiz', expected: { kind: 'quiz', items }, hint: 'Tape du pied : si ton pied se dépêche, c\'est rapide.' };
    }
    case 'play_on_beat': {
      const beats = num(p.temps, 8);
      const notes = Array.from({ length: beats }, (_, i) => ({ midi: tonic, start: i, dur: 1 }));
      return {
        ...v, prompt: `Joue la tonique (${pcName(tonic)}) sur chacun des ${beats} clics.`, countInBeats: 4, clickDuringCapture: true,
        simultaneous: true, captureMs: beatsToMs(beats, tempo) + 400, answerUI: 'sequence',
        expected: { kind: 'sequence', notes, checkRhythm: true, octaveAgnostic: true },
        hint: 'Joue exactement avec le clic, ni avant ni après.',
      };
    }
    case 'up_down': {
      const minE = num(p.ecart_min, 2);
      const maxE = num(p.ecart_max, 12);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const a = tonic + randInt(r, -5, 5);
        const up = r() < 0.5;
        const b = a + (up ? 1 : -1) * randInt(r, minE, maxE);
        return {
          stimulus: [{ midi: a, start: 0, dur: 1 }, { midi: b, start: 1, dur: 1.5 }], tempo: 70,
          choices: [choice('monte', 'Ça monte'), choice('descend', 'Ça descend')], answerId: up ? 'monte' : 'descend',
        };
      });
      return { ...v, prompt: 'La 2e note monte ou descend ?', expected: { kind: 'quiz', items }, hint: 'Chante les deux notes : ta voix monte-t-elle ?' };
    }
    case 'same_diff': {
      const maxE = num(p.ecart_max, 4);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const a = tonic + randInt(r, -5, 5);
        const same = r() < 0.5;
        const b = same ? a : a + (r() < 0.5 ? 1 : -1) * randInt(r, 1, maxE);
        return {
          stimulus: [{ midi: a, start: 0, dur: 1 }, { midi: b, start: 1, dur: 1.5 }], tempo: 70,
          choices: [choice('pareil', 'Même note'), choice('different', 'Différente')], answerId: same ? 'pareil' : 'different',
        };
      });
      return { ...v, prompt: 'Même note ou différente ?', expected: { kind: 'quiz', items }, hint: 'Chante la 1re note en tenant le son pendant la 2e.' };
    }
    case 'find_keys': {
      if (ctx.instrument === 'guitare') {
        // retour bêta : « toucher les cordes à vide » n'apprenait rien. On repère TOUTES les positions d'une note
        // sur les cases 0 à 7 (les hauteurs identiques sur deux cordes comptent une fois).
        const STD = ctx.tuning ?? [40, 45, 50, 55, 59, 64];
        const pc = pick(r, Array.isArray(p.notes) ? (p.notes as number[]) : [4, 9, 2, 7]);
        const midis = [...new Set(STD.flatMap((open) => Array.from({ length: 8 }, (_, f) => open + f).filter((m) => mod12(m) === pc)))].sort((x, y) => x - y);
        return {
          ...v, hideTonic: true, prompt: `Touche tous les ${pcName(pc)} du manche (cases 0 à 7).`, answerUI: 'select',
          expected: { kind: 'set', midis, octaveAgnostic: false },
          hint: `Pars de la corde à vide la plus proche de ${pcName(pc)}, puis compte les cases (1 case = 1 demi-ton). Il y a ${midis.length} hauteurs différentes à trouver.`,
        };
      }
      const groupe = num(p.groupe, 2);
      const midis = groupe === 2 ? [61, 63, 73, 75] : [66, 68, 70, 78, 80, 82];
      return {
        ...v, prompt: `Touche toutes les touches noires groupées par ${groupe}.`, answerUI: 'select',
        expected: { kind: 'set', midis, octaveAgnostic: false },
        hint: groupe === 2 ? 'Le groupe de 2 noires est juste au-dessus de do et ré.' : 'Le groupe de 3 noires est au-dessus de fa, sol et la.',
      };
    }
    case 'sing_note': {
      const m = tonic + randInt(r, 0, 9);
      return {
        ...v, tonic: m, prompt: 'Écoute puis chante la même note.', stimulus: [{ midi: m, start: 0, dur: 2 }], stimulusKind: 'melody',
        answerUI: 'sing', captureMs: 0,
        expected: { kind: 'sequence', notes: [{ midi: m, start: 0, dur: 2 }], checkRhythm: false, octaveAgnostic: true },
        hint: 'Fredonne doucement, puis ajuste en suivant l\'aiguille.',
      };
    }
    case 'figure_duration': {
      const labels: Record<string, string> = { noire: '1 temps', blanche: '2 temps', soupir: 'Silence d\'1 temps' };
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const f = pick(r, ['noire', 'blanche', 'soupir'] as const);
        return {
          stimulus: [], tempo, display: { kind: 'figure', figure: f },
          choices: shuffle(r, Object.entries(labels).map(([id, l]) => choice(id, l))), answerId: f,
        };
      });
      return { ...v, prompt: 'Combien dure cette figure ?', expected: { kind: 'quiz', items }, hint: 'Tête noire = 1 temps, tête blanche = 2 temps, zigzag = silence.' };
    }
    case 'rhythm_read': {
      const bars = num(p.mesures, 4);
      const perBar = num(p.mesure, 4);
      const figures = (Array.isArray(p.figures) ? p.figures : ['noire', 'noire', 'blanche', 'soupir']) as unknown as RhythmSymbol[];
      const rb = makeRhythmBars(r, bars, figures, perBar);
      // anacrouse : une noire de levée sur le dernier temps avant la 1re mesure
      const pick_up = bool(p.anacrouse, false);
      const items: RhythmSymbol[] = pick_up ? ['noire', ...rb.items] : rb.items;
      const onsets = pick_up ? [0, ...rb.onsets.map((o) => o + 1)] : rb.onsets;
      const total = rb.total + (pick_up ? 1 : 0);
      const count = Array.from({ length: perBar }, (_, i) => i + 1).join(' ');
      return {
        ...v, prompt: pick_up ? `Lis et tape ce rythme : il commence par une levée, sur le ${perBar}e temps.` : `Lis et tape ce rythme avec le clic (${perBar} temps par mesure).`,
        perBar, display: { kind: 'rhythm', items, perBar, pickup: pick_up ? 1 : 0 },
        countInBeats: pick_up ? perBar - 1 : perBar, clickDuringCapture: true, simultaneous: true, captureMs: beatsToMs(total, tempo) + 400, answerUI: 'tap',
        expected: { kind: 'rhythm', onsetsBeats: onsets, absolute: true },
        hint: pick_up ? `Compte « ${count} » : la première note tombe sur le ${perBar}, juste avant la mesure.` : `Dis en tapant : ${countingHint(rb.items, perBar)}. Tape sur chaque chiffre et chaque « et », jamais entre parenthèses.`,
      };
    }
    case 'rhythm_echo': {
      const bars = num(p.mesures, 2);
      const symbols: RhythmSymbol[] = Array.isArray(p.figures) ? (p.figures as unknown as RhythmSymbol[])
        : bool(p.croches, false) ? ['noire', 'blanche', 'croches'] : ['noire', 'noire', 'blanche'];
      const perBarE = num(p.mesure, 4);
      const rb = makeRhythmBars(r, bars, symbols, perBarE);
      // métronome (retour bêta : « difficile sans métronome ») : décompte puis clic sous le modèle ET sous la réponse.
      // Retiré au dernier niveau : garder le tempo seul fait partie de la compétence.
      const metro = bool(p.metronome, true);
      const shift = metro ? perBarE : 0; // décompte d'une mesure
      const stim = rb.onsets.map((o) => ({ midi: 84, start: o + shift, dur: 0.25 }));
      return {
        ...v, prompt: metro ? 'Écoute le rythme sur le clic, puis tape-le à l\'identique après le décompte.' : 'Écoute le rythme puis tape-le à l\'identique, sans clic.',
        stimulus: stim, stimulusKind: 'rhythm', answerUI: 'tap', captureMs: 0,
        perBar: perBarE, clickWithStimulus: metro, metronomeCapture: metro ? rb.total : undefined,
        expected: { kind: 'rhythm', onsetsBeats: rb.onsets, absolute: false },
        hint: `Il y a ${rb.onsets.length} coups en tout.${metro ? ' Le clic marque chaque temps : cale-toi dessus.' : ''}`,
      };
    }
    case 'finished_or_not': {
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const fin = r() < 0.5;
        const mel = makeMelody(r, tonic, [1, 2, 3, 4, 5], randInt(r, 4, 6), { conjoint: true, endOn: fin ? 1 : pick(r, [2, 4, 5]) });
        return {
          stimulus: mel.notes, tempo: 90, referenceTonic: true,
          choices: [choice('finie', 'Finie'), choice('pas_finie', 'Pas finie')], answerId: fin ? 'finie' : 'pas_finie',
        };
      });
      return { ...v, drone: bool(p.bourdon, false) ? droneFor(tonic) : null, prompt: 'La mélodie est-elle rentrée à la maison ?', expected: { kind: 'quiz', items }, hint: 'Après la dernière note, as-tu envie d\'entendre une suite ?' };
    }
    case 'sing_tonic': {
      const mel = makeMelody(r, tonic, [1, 2, 3, 4, 5], 5, { conjoint: true, endOn: pick(r, [2, 3, 5]) });
      return {
        ...v, drone: bool(p.bourdon, false) ? droneFor(tonic) : null, prompt: 'Écoute la mélodie, puis chante la tonique.', stimulus: mel.notes, stimulusKind: 'melody', answerUI: 'sing',
        expected: { kind: 'sequence', notes: [{ midi: tonic, start: 0, dur: 2 }], checkRhythm: false, octaveAgnostic: true },
        hint: 'La tonique est la 1re note de la mélodie.',
      };
    }
    case 'find_tonic': {
      return {
        ...v, prompt: `Écoute la tonique, puis joue-la sur ton instrument (c'est ${pcName(tonic)}).`, stimulus: [{ midi: tonic, start: 0, dur: 2 }], stimulusKind: 'melody',
        answerUI: 'sequence', expected: { kind: 'sequence', notes: [{ midi: tonic, start: 0, dur: 1 }], checkRhythm: false, octaveAgnostic: true },
        hint: ctx.instrument === 'guitare' ? 'Corde de la à vide (5e corde).' : 'Do est juste à gauche du groupe de 2 noires.',
      };
    }
    case 'degree_identify': {
      const pool = nums(p.degres, [1, 2, 3]);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const d = pick(r, pool);
        return {
          stimulus: [{ midi: tonic, start: 0, dur: 1 }, { midi: degreeToMidi(tonic, d), start: 1.5, dur: 1.5 }], tempo: 80,
          choices: pool.map((x) => choice(String(x), String(x))), answerId: String(d),
        };
      });
      // 0.24.0 : bourdon par défaut — l'oreille ancre les degrés sur la tonique tenue
      return { ...v, drone: bool(p.bourdon, true) ? droneFor(tonic) : null, prompt: 'Écoute 1, puis une autre note : quel est son degré ?', expected: { kind: 'quiz', items }, hint: 'Chante 1-2-3 depuis la tonique et arrête-toi sur la note entendue.' };
    }
    case 'sing_pattern': {
      if (Array.isArray(p.accords)) {
        // chante l'arpège 1-3-5-3-1 de l'accord entendu (I, IV ou V de la tonalité)
        const d = pick(r, nums(p.accords, [1, 4, 5]));
        let tri = diatonicTriad(tonic, d);
        if (tri[0] - tonic > 5) tri = tri.map((m) => m - 12); // reste dans la voix
        const motif = [0, 1, 2, 1, 0];
        return {
          ...v, prompt: `Écoute la tonique, puis l'accord ${ROMAN[d]}. Chante ses notes : fondamentale, tierce, quinte, tierce, fondamentale.`,
          stimulus: [...referenceEvents(tonic).map((n) => ({ ...n })), ...tri.map((m) => ({ midi: m, start: 4.5, dur: 2.5 }))], stimulusKind: 'melody',
          display: { kind: 'degrees', degrees: ['1', '3', '5', '3', '1'] }, answerUI: 'sing',
          expected: { kind: 'sequence', notes: motif.map((k, i) => ({ midi: tri[k], start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: true },
          hint: 'Pars de la note la plus grave de l\'accord (la basse) : c\'est la fondamentale. La tierce est deux marches plus haut, la quinte encore deux.',
        };
      }
      const motif = nums(p.motif, [1, 2, 3, 2, 1]);
      const notes = motif.map((d, i) => ({ midi: degreeToMidi(tonic, d), start: i, dur: 1 }));
      return {
        ...v, drone: bool(p.bourdon, false) ? droneFor(tonic) : null, prompt: 'Écoute la tonique (1), puis chante les degrés affichés.', stimulus: [{ midi: tonic, start: 0, dur: 2 }], stimulusKind: 'melody',
        display: { kind: 'degrees', degrees: motif.map(String) }, answerUI: 'sing',
        expected: { kind: 'sequence', notes, checkRhythm: false, octaveAgnostic: true },
        hint: 'Pense à « do-ré-mi » : chaque degré est une marche d\'escalier.',
      };
    }
    case 'melody_echo': {
      const pool = nums(p.degres, [1, 2, 3]);
      const n = num(p.nb_notes, 3);
      const mel = makeMelody(r, tonic, pool, n, { conjoint: bool(p.conjoint, true), rythme: (p.rythme as 'noires' | 'mixte') ?? 'noires' });
      const drone = bool(p.bourdon, false) ? droneFor(tonic) : null;
      const transcription: DegreeItem[] | undefined = t.etapes?.includes('transcrire_degres') ? degreeItemsFromNotes(tonic, mel.notes) : undefined;
      // accompagnement (perroquet d'un niveau plus élevé) : les accords de la grille sous la mélodie, à reproduire seule
      const acc = typeof p.accompagnement === 'string' ? backingFor(p.accompagnement, tonic).chords : null;
      // retour bêta (« inaudible ») : la mélodie et les accords avaient le même son et le même registre. Les accords passent
      // sous la mélodie (aucune note d'accord au-dessus de sa note la plus grave), avec une basse, et sont joués à part,
      // moins fort et avec un autre timbre (voir stimulusBacking dans le lecteur).
      // registre grave (guitare) : la mélodie se joue une octave plus haut pour laisser la place aux accords dessous
      // (la réponse reste acceptée à toutes les octaves)
      const lift = Math.min(...mel.notes.map((x) => x.midi)) < 57 ? 12 : 0;
      const lead = mel.notes.map((x) => ({ ...x, midi: x.midi + lift }));
      const melLow = Math.min(...lead.map((x) => x.midi));
      const voice = (c: number[]) => { const out = c.map((m) => { let x = m; while (x > melLow - 3) x -= 12; while (x < 43) x += 12; return x; }).filter((x) => x < melLow); if (!out.length) return []; const bass = Math.min(...out) - 12; return bass >= 36 ? [bass, ...out] : out; };
      const accNotes = acc ? Array.from({ length: Math.ceil(n / 2) }, (_, k) => voice(acc[k % acc.length]).map((m) => ({ midi: m, start: k * 2, dur: 1.9 }))).flat() : [];
      if (acc) {
        return {
          ...v, prompt: `Écoute la phrase de ${n} notes sur les accords, puis rejoue la mélodie seule.`, stimulus: lead, stimulusBacking: accNotes, stimulusKind: 'melody', referenceTonic: true, drone: null,
          answerUI: 'sequence', expected: { kind: 'sequence', notes: mel.notes, checkRhythm: false, octaveAgnostic: true },
          hint: `La mélodie est la voix du dessus ; elle commence sur le degré ${mel.degrees[0]}.`,
        };
      }
      return {
        ...v, prompt: transcription ? `Étape 1 sur 2 : écoute la phrase de ${n} notes et rejoue-la.` : `Écoute la phrase de ${n} notes, puis rejoue-la${drone ? ' sur le bourdon' : ''}.`, stimulus: mel.notes, stimulusKind: 'melody', referenceTonic: !drone, drone,
        answerUI: 'sequence', transcription,
        expected: { kind: 'sequence', notes: mel.notes, checkRhythm: bool(p.rythme_note, false), octaveAgnostic: !bool(p.octave_exacte, false) },
        hint: `La phrase commence sur le degré ${mel.degrees[0]}.`,
      };
    }
    case 'dictation': {
      const pool = nums(p.degres, [1, 2, 3]);
      const n = num(p.nb_notes, 3);
      const mel = makeMelody(r, tonic, pool, n, { conjoint: false });
      return {
        ...v, drone: bool(p.bourdon, false) ? droneFor(tonic) : null,
        prompt: bool(p.memoire, false) ? `Une seule écoute : retiens les ${n} notes, chante-les, puis écris leurs degrés.` : `Écoute et écris les ${n} notes en degrés.`, stimulus: mel.notes, stimulusKind: 'melody', referenceTonic: true,
        answerUI: 'degrees', expected: { kind: 'transcribe', items: degreeItemsFromNotes(tonic, mel.notes), checkDur: false },
        hint: `La 1re note est le degré ${mel.degrees[0]}.`,
      };
    }
    case 'qa_constraints': {
      const pool = nums(p.degres, [1, 2, 3]);
      const bars = num(p.mesures, 2);
      const q = makeMelody(r, tonic, pool, bars * 2, { rythme: 'noires', endOn: pick(r, pool.filter((d) => d !== 1)) });
      const notes = q.notes.map((n, i) => ({ ...n, start: i * 2, dur: 2 }));
      return {
        ...v, prompt: `Écoute la question, puis réponds avec ${pool.join(', ')} en finissant sur 1.`, stimulus: notes, stimulusKind: 'melody',
        drone: p.grille ? null : droneFor(tonic), backing: p.grille ? backingFor(String(p.grille), tonic) : undefined,
        answerUI: 'sequence', allowedDegrees: pool,
        expected: { kind: 'constraints', allowedDegrees: pool, endDegree: 1, minNotes: 2 },
        hint: 'Reprends le début de la question, puis descends vers 1.',
      };
    }
    case 'free_play': {
      const pool = nums(p.degres, [1, 2, 3]);
      return {
        ...v, prompt: `Improvise ${num(p.duree_s, 60)} s avec les notes en couleur (${Array.isArray(p.tokens) ? (p.tokens as unknown as string[]).map(tokLabel).join(' ') : pool.join(', ')}).`, drone: p.grille ? null : droneFor(tonic),
        backing: p.grille ? backingFor(String(p.grille), tonic) : undefined, answerUI: 'free',
        captureMs: num(p.duree_s, 60) * 1000, expected: { kind: 'free' },
        ...(Array.isArray(p.tokens)
          ? { allowedPcs: (p.tokens as unknown as string[]).map((tk) => ((tonic + DEG_SEMI[tk]) % 12 + 12) % 12) }
          : { allowedDegrees: pool }),
        hint: 'Laisse des silences : une phrase, une pause, une réponse.',
      };
    }
    case 'tune_echo': {
      const pool = nums(p.degres, [1, 2, 3]);
      const tunes = tunesFor(pool);
      const tune = pick(r, tunes.length ? tunes : tunesFor([1, 2, 3, 4, 5]));
      let t0 = 0;
      const notes = tune.notes.map(([d, dur]) => { const n = { midi: tonic + tuneDegreeSemis(d), start: t0, dur }; t0 += dur; return n; });
      return {
        ...v, prompt: t.etapes?.includes('transcrire_degres') ? `Étape 1 sur 2 : écoute « ${tune.title} » et rejoue-la.` : `Écoute « ${tune.title} », puis rejoue-la sur ton instrument.`, stimulus: notes, stimulusKind: 'melody', referenceTonic: true, answerUI: 'sequence',
        transcription: t.etapes?.includes('transcrire_degres') ? degreeItemsFromNotes(tonic, notes) : undefined,
        expected: { kind: 'sequence', notes, checkRhythm: bool(p.rythme_note, false), octaveAgnostic: true },
        hint: `Elle commence sur le degré ${tune.notes[0][0]} : chante-la dans ta tête avant de jouer.`,
      };
    }
    case 'degree_staff': {
      // retour bêta : l'ancienne « échelle » (des lignes sans interlignes) n'existait dans aucune écriture musicale.
      // On lit maintenant les degrés sur une vraie portée, en do : la 1re note est do (1), la 2de est le degré à trouver.
      const top = num(p.max_degre, 5);
      const MAJ = [0, 2, 4, 5, 7, 9, 11];
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const d = randInt(r, 1, top);
        return { stimulus: [], tempo, display: { kind: 'staff', midis: [60, 60 + MAJ[d - 1]] }, choices: Array.from({ length: top }, (_, i) => choice(String(i + 1), String(i + 1))), answerId: String(d) };
      });
      return { ...v, prompt: 'En do majeur, la 1re note est do, le degré 1. Quel degré est la 2de note ?', expected: { kind: 'quiz', items },
        hint: 'Compte les marches depuis do : chaque ligne et chaque interligne est une marche (do 1, ré 2, mi 3…).' };
    }
    case 'steps_quiz': {
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const d = randInt(r, 1, 7);
        const n2 = d === 7 ? 8 : d + 1;
        return { stimulus: [], tempo, display: { kind: 'text', text: `${d} → ${n2}` }, choices: [choice('ton', 'Un ton'), choice('demi-ton', 'Un demi-ton')], answerId: stepAfter(d) };
      });
      return { ...v, prompt: 'Entre ces deux degrés de la gamme majeure : un ton ou un demi-ton ?', expected: { kind: 'quiz', items }, hint: 'T-T-dT-T-T-T-dT : les demi-tons sont entre 3-4 et 7-8.' };
    }
    case 'degree_name': {
      const ecoute = bool(p.ecoute, false);
      const pool = nums(p.degres, [1, 2, 3, 4, 5, 6, 7]);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const key = keyFrom(p, r);
        const d = pick(r, pool);
        const answer = degreeNoteName(key, d);
        const others = shuffle(r, pool.filter((x) => x !== d).map((x) => degreeNoteName(key, x))).slice(0, 3);
        const kt = resolveTonic({ tonalite: key }, ctx.instrument);
        return {
          stimulus: ecoute ? [{ midi: kt, start: 0, dur: 1 }, { midi: degreeToMidi(kt, d), start: 1.5, dur: 1.5 }] : [], tempo: 80, referenceTonic: false,
          display: ecoute ? { kind: 'text', text: `1 = ${KEY_LABEL[key]}` } : { kind: 'text', text: `En ${KEY_LABEL[key]} majeur, degré ${d}` },
          choices: shuffle(r, [answer, ...others]).map((n) => choice(n, n)), answerId: answer,
        };
      });
      return {
        ...v, prompt: ecoute ? 'Tu entends 1, puis un degré : quelle note est-ce ?' : 'Quelle note correspond à ce degré ?', expected: { kind: 'quiz', items },
        hint: ecoute ? 'Trouve d\'abord le degré à l\'oreille, puis compte dans la gamme.' : 'Récite la gamme depuis la tonique : chaque degré est la note suivante.',
      };
    }
    case 'interval_identify': {
      const LABELS = INTERVAL_LABEL;
      const set = nums(p.intervalles, [2, 4]);
      // sens : montant, descendant, harmonique (ensemble) ou, par défaut, montant puis ensemble
      const sens = String(p.sens ?? 'mixte');
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const st = pick(r, set);
        const a = tonic + randInt(r, -3, 5);
        const stim = sens === 'montant' ? [{ midi: a, start: 0, dur: 1 }, { midi: a + st, start: 1, dur: 1.5 }]
          : sens === 'descendant' ? [{ midi: a + st, start: 0, dur: 1 }, { midi: a, start: 1, dur: 1.5 }]
          : sens === 'harmonique' ? [{ midi: a, start: 0, dur: 2 }, { midi: a + st, start: 0, dur: 2 }]
          : [{ midi: a, start: 0, dur: 1 }, { midi: a + st, start: 1, dur: 1 }, { midi: a, start: 2.5, dur: 1.5 }, { midi: a + st, start: 2.5, dur: 1.5 }];
        return { stimulus: stim, tempo: 80, choices: set.map((x) => choice(String(x), LABELS[x])), answerId: String(st) };
      });
      return { ...v, intervalSens: sens as Variant['intervalSens'], prompt: sens === 'descendant' ? 'Quel intervalle descendant entends-tu ?' : sens === 'harmonique' ? 'Deux notes ensemble : quel intervalle ?' : 'Quel intervalle entends-tu ?', expected: { kind: 'quiz', items },
        hint: sens === 'descendant'
          ? 'En descendant, l\'oreille entend autrement : ne retourne pas l\'intervalle dans ta tête. Chante la 1re note, puis descends marche par marche jusqu\'à la 2de en comptant les notes de la gamme (do → la en descendant : do, si, la = une tierce).'
          : set.length > 4 ? 'Classe d\'abord par famille : ouvert et calme (quinte, octave), doux (tierces, sixtes), frottant (secondes, septièmes), instable (triton).' : 'Tierce majeure : début de « Frère Jacques » 1-3 ; tierce mineure : plus sombre, plus serrée.' };
    }
    case 'chord_quality': {
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const q = r() < 0.5 ? 'majeur' : 'mineur';
        return { stimulus: blockAndArp(triad(tonic - 12 + randInt(r, 0, 7), q)), tempo: 90, choices: [choice('majeur', 'Majeur'), choice('mineur', 'Mineur')], answerId: q };
      });
      return { ...v, prompt: 'Cet accord est-il majeur ou mineur ?', expected: { kind: 'quiz', items }, hint: 'Majeur sonne lumineux, mineur sonne plus sombre ; écoute la note du milieu.' };
    }
    case 'chord_function': {
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const set = nums(p.accords, [1, 4, 5]);
        const d = pick(r, set);
        const ref = diatonicTriad(base, 1).map((m) => ({ midi: m, start: 0, dur: 2 }));
        const tgt = diatonicTriad(base, d).map((m) => ({ midi: m, start: 3, dur: 2 }));
        return { stimulus: [...ref, ...tgt], tempo: 90, choices: set.map((x) => choice(String(x), ROMAN[x])), answerId: String(d) };
      });
      const set = nums(p.accords, [1, 4, 5]);
      // méthode « fonction » : la tonique d'abord, puis la sensation de l'accord ou la basse qu'on redescend jusqu'à 1
      return { ...v, prompt: `Après l'accord I, quel accord entends-tu : ${set.map((x) => ROMAN[x]).join(', ')} ? Chante d'abord la tonique.`, expected: { kind: 'quiz', items },
        hint: 'Deux façons, pas plus. Sentir : I repose, IV flotte (suspendu), V tend et veut rentrer. Ou chanter la basse, puis descendre la gamme jusqu\'à 1 en comptant les marches.' };
    }
    case 'chord_change': {
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const bar = randInt(r, 2, 4);
        const other = pick(r, [4, 5]);
        const stim = [0, 1, 2, 3].flatMap((b) => diatonicTriad(base, b + 1 >= bar ? other : 1).flatMap((m) => [0, 1, 2, 3].map((k) => ({ midi: m, start: b * 4 + k, dur: 0.9 }))));
        return { stimulus: stim, tempo: 100, choices: [2, 3, 4].map((x) => choice(String(x), `Mesure ${x}`)), answerId: String(bar) };
      });
      return { ...v, prompt: 'À quelle mesure l\'accord change-t-il ?', expected: { kind: 'quiz', items }, hint: 'Compte les mesures à voix basse : « 1 2 3 4, 2 2 3 4… ».' };
    }
    case 'penta_or_not': {
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const penta = r() < 0.5;
        const pool = penta ? [1, 2, 3, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
        const mel = makeMelody(r, tonic, pool, 7, { conjoint: true });
        let notes = mel.notes;
        // garantie : une phrase « pas penta » contient au moins un 4 ou un 7 (sinon la bonne réponse serait fausse)
        if (!penta && !mel.degrees.some((d) => d === 4 || d === 7)) {
          const k = randInt(r, 1, notes.length - 2);
          const near = mel.degrees[k] <= 5 ? 4 : 7;
          notes = notes.map((n, i) => (i === k ? { ...n, midi: degreeToMidi(tonic, near) } : n));
        }
        return { stimulus: notes, tempo: 100, referenceTonic: true, choices: [choice('oui', 'Pentatonique'), choice('non', 'Pas pentatonique')], answerId: penta ? 'oui' : 'non' };
      });
      return { ...v, drone: bool(p.bourdon, false) ? droneFor(tonic) : null, prompt: 'Cette phrase n\'utilise-t-elle que la pentatonique (1-2-3-5-6) ?', expected: { kind: 'quiz', items }, hint: 'Les degrés 4 et 7 créent des demi-tons tendus : la penta n\'en a aucun.' };
    }
    case 'build_chord': {
      const key = keyFrom(p, r);
      const d = pick(r, nums(p.degres_accord, [1, 4, 5]));
      const kt = resolveTonic({ tonalite: key }, 'piano');
      const notes = diatonicTriad(kt, d);
      return {
        ...v, tonic: kt, prompt: `Construis l'accord ${ROMAN[d]} en ${KEY_LABEL[key]} majeur.`, answerUI: 'select',
        expected: { kind: 'set', midis: notes, octaveAgnostic: true },
        hint: `Pars du degré ${d} (${degreeNoteName(key, d)}) et empile deux tierces : une note sur deux.`,
      };
    }
    case 'grid_read': {
      const key = keyFrom(p, r);
      // blues de 12 mesures (palier 3) ou grille de 8 mesures au hasard
      const blues = p.grille === 'blues';
      const grid = blues ? [1, 1, 1, 1, 4, 4, 1, 1, 5, 4, 1, 5] : Array.from({ length: 8 }, (_, i) => (i === 0 || i === 7 ? 1 : pick(r, [1, 4, 5])));
      const bars = shuffle(r, grid.map((_, k) => k).slice(1)).slice(0, Math.min(nQ, grid.length - 1));
      const items: QuizItem[] = bars.map((bar) => ({
        stimulus: [], tempo,
        display: { kind: 'grid', bars: grid.map((x, k) => (k === bar ? `▶ ${ROMAN[x]}` : ROMAN[x])) },
        choices: [1, 4, 5].map((x) => choice(degreeNoteName(key, x), `${degreeNoteName(key, x)} majeur`)),
        answerId: degreeNoteName(key, grid[bar]),
      }));
      return {
        ...v, prompt: blues ? `Blues en ${KEY_LABEL[key]} : quel accord joue-t-on dans la case en couleur ?` : `Grille en ${KEY_LABEL[key]} majeur : quel accord joue-t-on dans la case en couleur ?`, expected: { kind: 'quiz', items },
        hint: `I = ${degreeNoteName(key, 1)}, IV = ${degreeNoteName(key, 4)}, V = ${degreeNoteName(key, 5)}.`,
      };
    }
    case 'build_scale': {
      const key = keyFrom(p, r);
      const pattern = nums(p.motif_gamme, [1, 2, 3, 5, 6]);
      const kt = resolveTonic({ tonalite: key }, 'piano');
      const nom = String(p.nom ?? 'pentatonique majeure');
      return {
        ...v, tonic: kt, prompt: `Touche les 5 notes de la ${nom} de ${KEY_LABEL[key]}.`, answerUI: 'select',
        expected: { kind: 'set', midis: pattern.map((d) => degreeToMidi(kt, d)), octaveAgnostic: true },
        hint: `Degrés ${pattern.join('-')} à partir de ${KEY_LABEL[key]}.`,
      };
    }
    case 'find_note': {
      const pc = pick(r, [0, 2, 4, 5, 7, 9, 11]);
      const range = ctx.instrument === 'guitare' ? [40, 71] : [60, 84];
      const midis: number[] = [];
      for (let m = range[0]; m <= range[1]; m++) if (mod12(m) === pc) midis.push(m);
      return {
        ...v, prompt: `Touche tous les ${pcName(pc)} ${ctx.instrument === 'guitare' ? 'des cases 0 à 7' : 'du clavier'}.`, answerUI: 'select',
        expected: { kind: 'set', midis, octaveAgnostic: false },
        hint: ctx.instrument === 'guitare' ? 'Une même note revient 5 cases plus loin sur la corde du dessous (4 entre sol et si).' : 'Repère-toi aux groupes de touches noires : la note revient toutes les 7 blanches.',
      };
    }
    case 'play_pattern': {
      const motif = nums(p.motif, [1, 2, 3, 4, 5, 4, 3, 2, 1]);
      const dur = num(p.duree_note, 1);
      // degrés chromatiques (palier 3 : gamme mineure…) : p.tokens remplace le motif en chiffres
      const toks = Array.isArray(p.tokens) ? (p.tokens as unknown as string[]) : null;
      const notes = toks
        ? toks.map((tk, i) => ({ midi: tokMidi(tonic, tk), start: i * dur, dur }))
        : motif.map((d, i) => ({ midi: degreeToMidi(tonic, d), start: i * dur, dur }));
      if (toks) {
        return {
          ...v, prompt: `Joue la gamme sur la portée, une note par clic.`,
          display: bool(p.noms, false) ? { kind: 'text', text: notes.map((n) => pcName(n.midi)).join(' ') } : { kind: 'degrees', degrees: toks.map(tokLabel) },
          countInBeats: 4, clickDuringCapture: true, simultaneous: true, captureMs: beatsToMs(toks.length * dur, tempo) + 500, answerUI: 'sequence',
          expected: { kind: 'sequence', notes, checkRhythm: true, octaveAgnostic: true },
          hint: toks.some((x) => x === 'b2' || x === '#4' || x === 'b5') || (toks.includes('6') && toks.includes('b3')) || (toks.includes('3') && toks.includes('b7'))
            ? 'Un ♭ ou un ♯ devant un degré : la note est un demi-ton sous ou au-dessus de celle de la gamme majeure.'
            : 'En mineur, les degrés 3, 6 et 7 sont abaissés d\'un demi-ton : ♭3, ♭6, ♭7.',
        };
      }
      return {
        ...v, prompt: bool(p.noms, false) ? `Joue la gamme de ${pcName(tonic)} : une note par clic.` : `Joue les notes de la portée, une par ${dur >= 4 ? 'mesure, sur le 1er temps' : 'clic'}.`, display: bool(p.noms, false) ? { kind: 'text', text: motif.map((d) => pcName(degreeToMidi(tonic, d))).join(' ') } : { kind: 'degrees', degrees: motif.map((d) => String(d > 7 ? d - 7 : d)) },
        countInBeats: 4, clickDuringCapture: true, simultaneous: true, captureMs: beatsToMs(motif.length * dur, tempo) + 500, answerUI: 'sequence',
        expected: { kind: 'sequence', notes, checkRhythm: true, octaveAgnostic: true },
        hint: ctx.instrument === 'guitare' ? 'Un doigt par case ; reste dans la même position.' : 'Prépare le passage du pouce sous la main juste après le 3.',
      };
    }
    case 'play_chord': {
      const names = Array.isArray(p.accords) ? (p.accords as unknown as string[]) : ['C', 'F', 'G'];
      const name = pick(r, names);
      const guitar = ctx.instrument === 'guitare';
      const midis = guitar ? GUITAR_OPEN[name] ?? GUITAR_OPEN.C : triad(resolveTonic({ tonalite: name }, 'piano'), 'majeur');
      return {
        ...v, prompt: `Place l'accord de ${KEY_LABEL[name]} majeur${guitar ? ' (forme ouverte)' : ''}.`, answerUI: 'select',
        expected: { kind: 'set', midis, octaveAgnostic: !guitar },
        hint: guitar ? 'Toutes les cordes jouées, du grave à l\'aigu : vérifie les cordes à vide.' : `${KEY_LABEL[name]}, puis une note sur deux : fondamentale, tierce, quinte.`,
      };
    }
    case 'name_the_note': {
      // une note montrée sur l'instrument : la nommer
      const guitar = ctx.instrument === 'guitare';
      const lvl = num(p.etendue, 0);
      const pool = guitar
        ? (lvl === 0 ? [40, 45, 50, 55, 59, 64] : naturalsBetween(40, 69).filter((m) => [40, 45, 50, 55, 59, 64].some((o) => m - o >= 0 && m - o <= 4)))
        : (lvl === 0 ? naturalsBetween(60, 71) : naturalsBetween(60, 83));
      // guitare : une position précise (corde, case), pour ne marquer qu'un seul endroit du manche
      const OPEN = [40, 45, 50, 55, 59, 64];
      const positions = OPEN.flatMap((o, si) => Array.from({ length: lvl === 0 ? 1 : 5 }, (_, f) => ({ si, f, m: o + f }))).filter((x) => naturalsBetween(x.m, x.m).length);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const pos = guitar ? pick(r, positions) : null;
        const m = pos ? pos.m : pick(r, pool);
        const name = pcName(m);
        const others = shuffle(r, ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'].filter((n) => n !== name)).slice(0, 3);
        return { stimulus: [{ midi: m, start: 0, dur: 1.5 }], tempo: 80, display: { kind: 'instrumentNote', midi: m, string: pos?.si, fret: pos?.f },
          choices: shuffle(r, [name, ...others]).map((n) => choice(n, n)), answerId: name };
      });
      return { ...v, prompt: guitar ? 'Quelle note est marquée sur le manche ?' : 'Quelle note est marquée sur le clavier ?', expected: { kind: 'quiz', items },
        hint: guitar ? 'Pars du nom de la corde à vide et monte d\'une note par case (sauf mi-fa et si-do : une seule case).' : 'Repère le groupe de 2 touches noires : do est juste à gauche.' };
    }
    case 'find_notes_series': {
      const n = num(p.nb_notes, 3);
      const names = shuffle(r, [0, 2, 4, 5, 7, 9, 11]).slice(0, n);
      const notes = names.map((pc, i) => ({ midi: 60 + pc, start: i, dur: 1 }));
      return {
        ...v, prompt: 'Joue ces notes dans l\'ordre, à n\'importe quelle octave.', display: { kind: 'text', text: names.map((pc) => pcName(pc)).join('  ·  ') },
        answerUI: 'sequence', expected: { kind: 'sequence', notes, checkRhythm: false, octaveAgnostic: true },
        hint: ctx.instrument === 'guitare' ? 'Cordes à vide : mi-la-ré-sol-si-mi. Une case = un demi-ton.' : 'do est à gauche du groupe de 2 noires ; fa à gauche du groupe de 3.',
      };
    }
    case 'read_staff': {
      const lo = num(p.de, 60);
      const hi = num(p.a, 67);
      const pool = naturalsBetween(lo, hi);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const m = pick(r, pool);
        const name = pcName(m);
        const others = shuffle(r, ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'].filter((x) => x !== name)).slice(0, 3);
        return { stimulus: [{ midi: m, start: 0, dur: 1.5 }], tempo: 80, display: { kind: 'staff', midis: [m], clef: p.clef === 'fa' ? 'fa' : 'sol' },
          choices: shuffle(r, [name, ...others]).map((x) => choice(x, x)), answerId: name };
      });
      return { ...v, prompt: p.clef === 'fa' ? 'Clé de fa : quelle est cette note ?' : 'Quelle est cette note ?', expected: { kind: 'quiz', items },
        hint: p.clef === 'fa' ? 'Clé de fa : la 1re ligne en bas est sol, la 4e ligne (entre les deux points de la clé) est fa.' : 'Clé de sol : la 1re ligne en bas est mi. Monte d\'une note à chaque ligne ou interligne.' };
    }
    case 'play_staff_notes': {
      const n = num(p.nb_notes, 3);
      const pool = naturalsBetween(num(p.de, 60), num(p.a, 67));
      if (Array.isArray(p.armures)) {
        // lecture avec armure : les notes touchées par l'armure se jouent altérées (au moins une par lecture)
        const sig = pick(r, nums(p.armures, [1]));
        const alt = alteredLetters(sig);
        const written = Array.from({ length: n }, () => pick(r, pool));
        if (!written.some((m) => alt.includes(mod12(m)))) written[randInt(r, 0, n - 1)] = pick(r, pool.filter((m) => alt.includes(mod12(m))));
        const midis = written.map((m) => applyKeySig(m, sig));
        const altNames = (sig > 0 ? SHARP_NAMES : FLAT_NAMES).slice(0, Math.abs(sig));
        return {
          ...v, prompt: `Lis ces ${n} notes en tenant compte de l'armure, puis joue-les.`, display: { kind: 'staff', midis, keySig: sig },
          answerUI: 'sequence', expected: { kind: 'sequence', notes: midis.map((m, i) => ({ midi: m, start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: true },
          hint: `L'armure dit : ${altNames.map((x) => `tous les ${x.replace(/[♯♭]/, '')} deviennent ${x}`).join(', ')}.`,
        };
      }
      const midis = Array.from({ length: n }, () => pick(r, pool));
      return {
        ...v, ...(p.clef === 'fa' ? { tonic: 48 } : {}), // clé de fa : clavier descendu d'une octave (do3 à do5) pour jouer les notes graves où elles sont
        prompt: `Lis ces ${n} notes${p.clef === 'fa' ? ' en clé de fa' : ''}, puis joue-les sur ton instrument.`, display: { kind: 'staff', midis, clef: p.clef === 'fa' ? 'fa' : 'sol' },
        answerUI: 'sequence', expected: { kind: 'sequence', notes: midis.map((m, i) => ({ midi: m, start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: true },
        hint: `La 1re note est un ${pcName(midis[0])}.`,
      };
    }
    case 'scale_next': {
      const order = ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'];
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const i = randInt(r, 0, 6);
        const after = r() < 0.6;
        const ans = order[(i + (after ? 1 : 6)) % 7];
        const others = shuffle(r, order.filter((x) => x !== ans && x !== order[i])).slice(0, 3);
        return { stimulus: [], tempo, display: { kind: 'text', text: `${after ? 'Après' : 'Avant'} ${order[i]} ?` },
          choices: shuffle(r, [ans, ...others]).map((x) => choice(x, x)), answerId: ans };
      });
      return { ...v, prompt: 'Dans la gamme de do, quelle note vient juste après (ou juste avant) ?', expected: { kind: 'quiz', items },
        hint: 'Récite : do, ré, mi, fa, sol, la, si, do. Après si revient do.' };
    }
    case 'name_by_ear': {
      // une note de référence nommée (do, ou une autre), puis retrouver le nom des notes suivantes à l'oreille
      const NAMES = ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'];
      const NAT = [0, 2, 4, 5, 7, 9, 11];
      const refs = Array.isArray(p.references) ? (p.references as unknown as string[]) : ['C'];
      const pool = nums(p.notes, [1, 2, 3, 4, 5, 6, 7]); // 1 = do … 7 = si
      const n = num(p.nb_notes, 1);
      const refMidi = (key: string) => 60 + (KEY_PC[key] ?? 0);
      // une note de la gamme de do, à moins d'une quinte de la référence (on compte des marches, pas des sauts énormes)
      const near = (rm: number) => {
        const cands: number[] = [];
        for (let m = rm - 7; m <= rm + 7; m++) if (NAT.includes(mod12(m)) && m !== rm && pool.includes(NAT.indexOf(mod12(m)) + 1)) cands.push(m);
        return cands.length ? pick(r, cands) : rm + 2;
      };
      if (n === 1) {
        const items: QuizItem[] = Array.from({ length: nQ }, () => {
          const key = pick(r, refs);
          const rm = refMidi(key);
          const m = near(rm);
          const choices = NAMES.filter((x, i) => pool.includes(i + 1) || x === pcName(m));
          return { stimulus: [{ midi: rm, start: 0, dur: 1.5 }, { midi: m, start: 2.5, dur: 1.5 }], tempo: 80,
            display: { kind: 'text', text: `Référence : ${KEY_LABEL[key]}` }, choices: choices.map((x) => choice(x, x)), answerId: pcName(m) };
        });
        return { ...v, prompt: refs.length === 1 && refs[0] === 'C' ? 'Tu entends do, puis une autre note : comment s\'appelle-t-elle ?' : 'Tu entends la note de référence, puis une autre note : comment s\'appelle-t-elle ?',
          tonic: 60, expected: { kind: 'quiz', items }, hint: 'Chante depuis la référence en nommant les notes de la gamme (do, ré, mi…) jusqu\'à retrouver la note entendue.' };
      }
      const key = pick(r, refs);
      const rm = refMidi(key);
      const midis: number[] = [];
      let prev = rm;
      for (let k = 0; k < n; k++) { const m = near(prev); midis.push(m); prev = m; }
      const stimulus = [{ midi: rm, start: 0, dur: 1.5 }, ...midis.map((m, k) => ({ midi: m, start: 2.5 + k, dur: 1 }))];
      return {
        ...v, tonic: 60, prompt: `Tu entends ${KEY_LABEL[key]}, puis ${n} notes : écris leurs noms dans l'ordre.`, stimulus, stimulusKind: 'melody',
        display: { kind: 'text', text: `Référence : ${KEY_LABEL[key]}` }, answerUI: 'degrees', padNames: NAMES,
        expected: { kind: 'transcribe', items: midis.map((m) => ({ degree: NAT.indexOf(mod12(m)) + 1, acc: 0 as const, dur: 1 })), checkDur: false },
        hint: `La 1re note est ${midis[0] > rm ? 'au-dessus' : 'en dessous'} de ${KEY_LABEL[key]}.`,
      };
    }
    case 'find_home': {
      // une suite d'accords qui ne se termine pas sur I : il faut sentir où elle veut se poser
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const prog = pick(r, [[1, 4, 6, 5], [1, 6, 4, 5], [1, 4, 2, 5], [6, 4, 1, 5]]);
      const stimulus = prog.flatMap((d, i) => [
        { midi: degreeToMidi(base, d) - 12, start: i * 2, dur: 1.9 },
        ...diatonicTriad(base, d).map((m) => ({ midi: m, start: i * 2, dur: 1.9 })),
      ]);
      return {
        ...v, prompt: 'Écoute la suite d\'accords, puis chante la maison : la note où elle veut se poser.', stimulus, stimulusKind: 'melody',
        answerUI: 'sing', revealTonic: true,
        expected: { kind: 'sequence', notes: [{ midi: tonic, start: 0, dur: 2 }], checkRhythm: false, octaveAgnostic: true },
        hint: 'N\'écoute pas une note en particulier : écoute toute la suite, puis fredonne la note qui donnerait l\'impression que c\'est fini.',
      };
    }
    case 'find_function': {
      // la fondamentale est marquée sur l'instrument ; trouver son 3, son 5… au-dessus ou en dessous (méthode des fonctions)
      const guitar = ctx.instrument === 'guitare';
      const fonctions = nums(p.fonctions, [2, 3]);
      const dirs = bool(p.dessous, false) ? [1, -1] : [1];
      const n = num(p.nb_cibles, 2);
      const [lo, hi] = guitar ? [40, 71] : [60, 84];
      const root = guitar ? randInt(r, 45, 59) : randInt(r, 62, 71);
      const modeToks = typeof p.mode === 'string' && MODES[p.mode as string] ? MODES[p.mode as string].tokens : bool(p.mineur, false) ? MINOR : null;
      const semi = (deg: number) => (modeToks ? DEG_SEMI[modeToks[(deg - 1) % 7]] + (deg === 8 ? 12 : 0) : degreeToSemitone(deg));
      const target = (deg: number, dir: number) => (dir > 0 ? root + semi(deg) : root - (12 - semi(deg)));
      const tasks: { deg: number; dir: number; midi: number }[] = [];
      for (let guard = 0; tasks.length < n && guard < 50; guard++) {
        const deg = pick(r, fonctions);
        const dir = pick(r, dirs);
        const m = deg === 8 ? root + 12 * dir : target(deg, dir);
        if (m < lo || m > hi || tasks.some((x) => x.midi === m)) continue;
        tasks.push({ deg, dir, midi: m });
      }
      const label = (x: { deg: number; dir: number }) => `${x.deg === 8 ? '1 (octave)' : modeToks ? tokLabel(modeToks[(x.deg - 1) % 7]) : x.deg} ${x.dir > 0 ? '↑' : '↓'}`;
      return {
        ...v, tonic: root, markRoot: root,
        prompt: `La fondamentale (1) est marquée en or. Joue les fonctions affichées, dans l'ordre${modeToks ? ` (mode ${typeof p.mode === 'string' ? p.mode : 'mineur'})` : ''}.`,
        display: { kind: 'text', text: tasks.map(label).join('   ·   ') },
        answerUI: 'sequence', expected: { kind: 'sequence', notes: tasks.map((x, i) => ({ midi: x.midi, start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: false },
        hint: `${label(tasks[0])} : ${Math.abs(tasks[0].midi - root)} demi-ton${Math.abs(tasks[0].midi - root) > 1 ? 's' : ''} ${tasks[0].dir > 0 ? 'au-dessus' : 'en dessous'} de la fondamentale.`,
      };
    }
    case 'write_staff_note': {
      // écrire sur la portée des notes nommées ; l'étendue reste sous l'octave pour qu'un nom désigne une seule place
      const pool = naturalsBetween(num(p.de, 64), num(p.a, 71));
      const n = Math.min(num(p.nb_notes, 2), pool.length);
      const midis = shuffle(r, pool).slice(0, n);
      const names = midis.map((m) => pcName(m));
      return {
        ...v, prompt: n === 1 ? 'Écris cette note sur la portée.' : 'Écris ces notes sur la portée, dans l\'ordre.',
        display: { kind: 'text', text: names.join('  ·  ') }, answerUI: 'staff',
        expected: { kind: 'sequence', notes: midis.map((m, i) => ({ midi: m, start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: false },
        hint: 'Mi est sur la ligne du bas. Compte une note par ligne ou interligne : mi, fa, sol, la, si, do…',
      };
    }
    case 'staff_dictation': {
      // dictée mélodique écrite sur la portée, en do ; la 1re note (do) est déjà écrite
      const pool = nums(p.degres, [1, 2, 3]);
      const n = num(p.nb_notes, 3);
      const mel = makeMelody(r, 60, pool, n, { conjoint: bool(p.conjoint, true) });
      return {
        ...v, tonic: 60, prompt: `Écoute ${n} notes, puis écris-les sur la portée. La 1re (do) est déjà écrite.`,
        stimulus: mel.notes, stimulusKind: 'melody', referenceTonic: true, answerUI: 'staff', staffGiven: [mel.notes[0].midi],
        expected: { kind: 'sequence', notes: mel.notes, checkRhythm: false, octaveAgnostic: false },
        hint: 'Pour chaque note : monte, descend ou reste ? De combien de marches ? Une marche = une ligne ou un interligne.',
      };
    }
    case 'rhythm_dictation': {
      // dictée rythmique : 4 clics de décompte, puis le rythme joué avec le clic ; on l'écrit en figures
      const bars = num(p.mesures, 1);
      const figures = (Array.isArray(p.figures) ? p.figures : ['noire', 'noire', 'blanche', 'soupir']) as unknown as RhythmSymbol[];
      const rb = makeRhythmBars(r, bars, figures, 4);
      const stim: NoteEvent[] = [];
      let beat = 4;
      for (const s of rb.items) {
        if (s === 'noire') stim.push({ midi: 67, start: beat, dur: 0.9 });
        else if (s === 'blanche') stim.push({ midi: 67, start: beat, dur: 1.9 });
        else if (s !== 'soupir') stim.push(...figureOnsets(s).map((o) => ({ midi: 67, start: beat + o, dur: 0.4 })));
        beat += figureBeats(s);
      }
      return {
        ...v, prompt: `Écoute ${bars} mesure${bars > 1 ? 's' : ''} après les 4 clics de décompte, puis écris le rythme.`,
        stimulus: stim, stimulusKind: 'melody', clickWithStimulus: true, answerUI: 'figures',
        expected: { kind: 'figures', items: rb.items, perBar: 4, palette: [...new Set(figures)] },
        hint: `Compte les temps à voix haute pendant l'écoute : il y a ${rb.items.length} figure${rb.items.length > 1 ? 's' : ''}.`,
      };
    }
    case 'chroma_identify': {
      // degré chromatique après la cadence (majeure ou mineure) : ♭3, ♭6, ♭7… reconnus à leur couleur
      const pool = (Array.isArray(p.degres) ? p.degres : MINOR).map(String);
      const minor = bool(p.mineur, false);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const tk = pick(r, pool.filter((x) => x !== '1').length ? pool.filter((x) => x !== '1' || r() < 0.15) : pool);
        return { stimulus: [{ midi: tokMidi(tonic, tk), start: 0, dur: 1.8 }], tempo: 80, referenceTonic: true,
          choices: pool.map((x) => choice(x, tokLabel(x))), answerId: tk };
      });
      return { ...v, minorContext: minor, drone: bool(p.bourdon, false) ? droneFor(tonic) : null,
        prompt: minor ? 'Après la cadence mineure, quel degré entends-tu ?' : 'Après la cadence, quel degré entends-tu ?', expected: { kind: 'quiz', items },
        hint: minor ? '♭3 sonne sombre et stable ; ♭6 est lourd, tendu vers 5 ; ♭7 est plus léger, il descend volontiers vers 6 ou remonte à 1.' : 'Les degrés abaissés assombrissent : ♭3 est mineur, ♭7 sonne « rock », ♭6 sonne grave et dramatique.' };
    }
    case 'chroma_dictation': {
      const pool = (Array.isArray(p.degres) ? p.degres : MINOR).map(String);
      const n = num(p.nb_notes, 4);
      const minor = bool(p.mineur, true);
      const mel = tokenMelody(r, tonic, pool, n, { conjoint: bool(p.conjoint, true) });
      return { ...v, minorContext: minor, prompt: `Écoute ${n} notes après la cadence, puis écris leurs degrés (avec ♭ si besoin).`,
        stimulus: mel.notes, stimulusKind: 'melody', referenceTonic: true, answerUI: 'degrees',
        expected: { kind: 'transcribe', items: mel.tokens.map((tk) => tokToItem(tk)), checkDur: false },
        hint: `La 1re note est 1. En mineur : 1 2 ♭3 4 5 ♭6 ♭7.` };
    }
    case 'major_minor': {
      // la même phrase, en majeur ou en mineur : seule la couleur change
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const minor = r() < 0.5;
        const shape = tokenMelody(r, tonic, MAJOR, 7, { conjoint: true, endOnTonic: true });
        const toks = shape.tokens.map((tk) => (minor ? MINOR[MAJOR.indexOf(tk)] : tk));
        const notes = shape.notes.map((n, i) => ({ ...n, midi: tokMidi(tonic, toks[i]) }));
        return { stimulus: notes, tempo: 100, choices: [choice('majeur', 'Majeur'), choice('mineur', 'Mineur')], answerId: minor ? 'mineur' : 'majeur' };
      });
      return { ...v, prompt: 'Cette phrase est-elle en majeur ou en mineur ?', expected: { kind: 'quiz', items },
        hint: 'Écoute le 3e degré : majeur, il est lumineux ; mineur (♭3), il est sombre.' };
    }
    case 'sing_interval': {
      const set = nums(p.intervalles, [3, 4, 7]);
      const st = pick(r, set);
      const root = tonic + randInt(r, -2, 3);
      return { ...v, prompt: `Écoute la note, puis chante une ${INTERVAL_LABEL[st].toLowerCase()} au-dessus.`,
        display: { kind: 'text', text: `${INTERVAL_LABEL[st]} ↑` }, stimulus: [{ midi: root, start: 0, dur: 2 }], stimulusKind: 'melody', answerUI: 'sing',
        expected: { kind: 'sequence', notes: [{ midi: root + st, start: 0, dur: 2 }], checkRhythm: false, octaveAgnostic: true },
        hint: 'Chante les notes de la gamme entre les deux pour mesurer le chemin, puis tiens la note d\'arrivée.' };
    }
    case 'triad_quality': {
      const quals = (Array.isArray(p.qualites) ? p.qualites : ['majeur', 'mineur', 'dim', 'aug']).map(String);
      const inv = bool(p.renverse, false);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const q = pick(r, quals);
        const notes = triadOf(tonic - 12 + randInt(r, 0, 9), q, inv ? randInt(r, 0, 2) : 0);
        return { stimulus: blockAndArp(notes), tempo: 90, choices: quals.map((x) => choice(x, TRIAD_LABEL[x])), answerId: q };
      });
      return { ...v, prompt: inv ? 'Quel est cet accord (il peut être renversé) ?' : 'Quel est cet accord ?', expected: { kind: 'quiz', items },
        hint: 'Majeur : lumineux. Mineur : sombre. Diminué : serré, inquiet. Augmenté : flottant, comme en suspens.' };
    }
    case 'build_triad': {
      const quals = (Array.isArray(p.qualites) ? p.qualites : ['majeur', 'mineur']).map(String);
      const q = pick(r, quals);
      const root = pick(r, naturalsBetween(60, 67));
      return { ...v, tonic: root, prompt: `Construis l'accord de ${pcName(root)} ${TRIAD_LABEL[q].toLowerCase()}.`, answerUI: 'select',
        expected: { kind: 'set', midis: triadOf(root, q), octaveAgnostic: true },
        hint: `Depuis ${pcName(root)} : ${TRIAD_SEMI[q][1]} demi-tons pour la tierce, ${TRIAD_SEMI[q][2]} pour la quinte.` };
    }
    case 'diatonic_chord': {
      // après la cadence, un accord de la gamme : lequel ?
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const pool = nums(p.degres, [1, 2, 4, 5, 6]);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const d = pick(r, pool);
        return { stimulus: diatonicTriad(base, d).map((m) => ({ midi: m, start: 0, dur: 2.2 })).concat([{ midi: degreeToMidi(base, d) - 12, start: 0, dur: 2.2 }]), tempo: 80, referenceTonic: true,
          choices: pool.map((x) => choice(String(x), DIATONIC_ROMAN[x])), answerId: String(d) };
      });
      return { ...v, prompt: 'Après la cadence, quel accord de la gamme entends-tu ?', expected: { kind: 'quiz', items },
        hint: 'Chante la basse et compte depuis 1 ; puis écoute la couleur : majeur (I, IV, V) ou mineur (ii, iii, vi).' };
    }
    case 'progression_dictation': {
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const pool = nums(p.degres, [1, 4, 5, 6]);
      const n = num(p.nb_accords, 4);
      const degs = [1, ...Array.from({ length: n - 1 }, () => pick(r, pool.filter((x) => x !== 1)))];
      // palier 4 : accords de 7e (ii7 V7 Imaj7…) ; le ii-V-I peut être imposé en fin de grille
      const sept = bool(p.septiemes, false);
      if (sept && bool(p.finir_ii_v_i, false) && n >= 4) { degs[n - 3] = 2; degs[n - 2] = 5; degs[n - 1] = 1; }
      const stim = degs.flatMap((d, i) => [...(sept ? diatonicSeventh(base, d) : diatonicTriad(base, d)).map((m) => ({ midi: m, start: i * 2, dur: 1.9 })), { midi: degreeToMidi(base, d) - 12, start: i * 2, dur: 1.9 }]);
      return { ...v, prompt: `Écoute ${n} accords (le 1er est I), puis écris la grille en chiffres romains.`, stimulus: stim, stimulusKind: 'melody', referenceTonic: true,
        answerUI: 'degrees', padNames: [1, 2, 3, 4, 5, 6, 7].map((x) => (sept ? DIATONIC7_ROMAN[x] : DIATONIC_ROMAN[x])),
        expected: { kind: 'transcribe', items: degs.map((d) => ({ degree: d, acc: 0 as const, dur: 1 })), checkDur: false },
        hint: 'Écoute surtout la basse : elle dit le degré. Puis la couleur : majeur ou mineur.' };
    }
    case 'diatonic_theory': {
      const order = ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'];
      const QL: Record<string, string> = { majeur: 'Majeur', mineur: 'Mineur', dim: 'Diminué' };
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        if (r() < 0.5) {
          const d = randInt(r, 1, 7);
          return { stimulus: [], tempo, display: { kind: 'text', text: `Accord sur le degré ${d} (${DIATONIC_ROMAN[d]}) ?` },
            choices: ['majeur', 'mineur', 'dim'].map((x) => choice(x, QL[x])), answerId: DIATONIC_QUALITY[d] };
        }
        const k = randInt(r, 0, 6);
        const ans = order[(k + 5) % 7];
        const others = shuffle(r, order.filter((x) => x !== ans)).slice(0, 3);
        return { stimulus: [], tempo, display: { kind: 'text', text: `Relative mineure de ${order[k]} majeur ?` },
          choices: shuffle(r, [ans, ...others]).map((x) => choice(x, `${x} mineur`)), answerId: ans };
      });
      return { ...v, prompt: 'Les accords de la gamme et les relatives mineures.', expected: { kind: 'quiz', items },
        hint: 'Majeur : I, IV, V. Mineur : ii, iii, vi. Diminué : vii°. La relative mineure part du 6e degré.' };
    }
    case 'lick_echo': {
      // lick de blues : pentatonique mineure (avec ♯4, la « blue note », au 2e niveau), rythme compris
      const pool = (Array.isArray(p.degres) ? p.degres : MINOR_PENTA).map(String);
      const n = num(p.nb_notes, 4);
      const mel = tokenMelody(r, tonic, pool, n, { conjoint: true, endOnTonic: true, rhythm: true });
      return { ...v, prompt: `Écoute ce lick de ${n} notes sur le bourdon, puis rejoue-le.`, stimulus: mel.notes, stimulusKind: 'melody',
        drone: droneFor(tonic), allowedPcs: pool.map((tk) => ((tonic + DEG_SEMI[tk]) % 12 + 12) % 12), answerUI: 'sequence',
        expected: { kind: 'sequence', notes: mel.notes, checkRhythm: false, octaveAgnostic: true },
        hint: Array.isArray(p.degres) ? `Notes en couleur : ${pool.map(tokLabel).join(' ')}. La phrase finit sur 1.` : `Notes en couleur : la pentatonique mineure (1 ♭3 4 5 ♭7). Le lick commence et finit sur 1.` };
    }
    case 'seventh_quality': {
      const quals = (Array.isArray(p.qualites) ? p.qualites : ['maj7', 'dom7', 'm7']).map(String);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const q = pick(r, quals);
        const root = tonic - 12 + randInt(r, 0, 9);
        return { stimulus: blockAndArp(SEVENTH_SEMI[q].map((x) => root + x)), tempo: 90, choices: quals.map((x) => choice(x, SEVENTH_LABEL[x])), answerId: q };
      });
      return { ...v, prompt: 'Quel accord de 7e entends-tu ?', expected: { kind: 'quiz', items },
        hint: 'maj7 : doux, rêveur (la 7e frotte contre la fondamentale). 7 : tendu, il veut aller ailleurs. m7 : mineur et détendu. m7♭5 : sombre et instable.' };
    }
    case 'build_seventh': {
      const quals = (Array.isArray(p.qualites) ? p.qualites : ['maj7', 'dom7', 'm7']).map(String);
      const q = pick(r, quals);
      const root = pick(r, naturalsBetween(60, 67));
      return { ...v, tonic: root, prompt: `Construis l'accord ${chordName(pcName(root), q)}.`, answerUI: 'select',
        expected: { kind: 'set', midis: SEVENTH_SEMI[q].map((x) => root + x), octaveAgnostic: true },
        hint: `Triade ${SEVENTH_SEMI[q][1] === 4 ? 'majeure' : 'mineure'}${q === 'm7b5' ? ' à quinte diminuée' : ''}, plus la 7e à ${SEVENTH_SEMI[q][3]} demi-tons de la fondamentale.` };
    }
    case 'cadence_identify': {
      // une phrase de 4 accords ; les deux derniers forment la cadence. Pas de contexte avant : la phrase installe elle-même la tonalité.
      const kinds = (Array.isArray(p.cadences) ? p.cadences : ['parfaite', 'plagale']).map(String);
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const k = pick(r, kinds);
        const degs = [1, pick(r, [4, 6, 2]), ...CADENCES[k].pair];
        if (degs[1] === degs[2]) degs[1] = 6;
        const stim = degs.flatMap((d, i) => [...diatonicTriad(base, d).map((m) => ({ midi: m, start: i * 1.5, dur: 1.4 })), { midi: degreeToMidi(base, d) - 12, start: i * 1.5, dur: 1.4 }]);
        return { stimulus: stim, tempo: 80, choices: kinds.map((x) => choice(x, CADENCES[x].label)), answerId: k };
      });
      return { ...v, prompt: 'Écoute la fin de la phrase : quelle cadence ?', expected: { kind: 'quiz', items },
        hint: 'Finit-elle sur I (parfaite, plagale), sur V (demi-cadence, en suspens) ou sur vi (rompue, « surprise ») ? Puis : l\'avant-dernier accord est-il V ou IV ?' };
    }
    case 'cadence_theory': {
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const k = pick(r, Object.keys(CADENCES));
        const [a, b2] = CADENCES[k].pair;
        return { stimulus: [], tempo, display: { kind: 'text', text: `${DIATONIC_ROMAN[a]} → ${DIATONIC_ROMAN[b2]}` },
          choices: Object.keys(CADENCES).map((x) => choice(x, CADENCES[x].label.split(' (')[0])), answerId: k };
      });
      return { ...v, prompt: 'Comment s\'appelle cet enchaînement final ?', expected: { kind: 'quiz', items },
        hint: 'Parfaite V-I, plagale IV-I (« amen »), rompue V-vi, demi-cadence : on s\'arrête sur V.' };
    }
    case 'ii_v_i_theory': {
      const order = ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'];
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const key = pick(r, ['C', 'F', 'G']);
        const kt = resolveTonic({ tonalite: key }, 'piano');
        const names = [2, 5, 1].map((d) => pcName(scaleNote(kt, d)));
        if (r() < 0.5) {
          return { stimulus: [], tempo, display: { kind: 'text', text: `${chordName(names[0], 'm7')} – ${chordName(names[1], 'dom7')} – ${chordName(names[2], 'maj7')} : de quelle tonalité est ce ii-V-I ?` },
            choices: shuffle(r, [KEY_LABEL[key], ...shuffle(r, order.filter((x) => x !== KEY_LABEL[key])).slice(0, 3)]).map((x) => choice(x, `${x} majeur`)), answerId: KEY_LABEL[key] };
        }
        const others = shuffle(r, order.filter((x) => x !== names[1])).slice(0, 3);
        return { stimulus: [], tempo, display: { kind: 'text', text: `Quel est l'accord V7 de ${KEY_LABEL[key]} majeur ?` },
          choices: shuffle(r, [names[1], ...others]).map((x) => choice(x, chordName(x, 'dom7'))), answerId: names[1] };
      });
      return { ...v, prompt: 'Réponds à la question sur le ii-V-I.', expected: { kind: 'quiz', items },
        hint: 'Le ii-V-I d\'une tonalité : accords des degrés 2, 5 et 1. En do : ré m7 – sol 7 – do maj7.' };
    }
    case 'guide_tones': {
      // notes-guides : la tierce et la septième d'un accord, l'essentiel de sa couleur
      const quals = (Array.isArray(p.qualites) ? p.qualites : ['m7', 'dom7', 'maj7']).map(String);
      const q = pick(r, quals);
      const root = pick(r, naturalsBetween(60, 67));
      const guide = [SEVENTH_SEMI[q][1], SEVENTH_SEMI[q][3]].map((x) => root + x);
      return { ...v, tonic: root, prompt: `Touche les notes-guides (3 et 7) de ${chordName(pcName(root), q)}.`, answerUI: 'select',
        expected: { kind: 'set', midis: guide, octaveAgnostic: true },
        hint: `La tierce est à ${SEVENTH_SEMI[q][1]} demi-tons de ${pcName(root)}, la septième à ${SEVENTH_SEMI[q][3]}.` };
    }
    case 'swing_or_straight': {
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const swing = r() < 0.5;
        const notes = Array.from({ length: 8 }, (_, k) => ({ midi: tonic + pick(r, [0, 2, 4, 7, 9]), start: Math.floor(k / 2) + (k % 2 ? (swing ? 2 / 3 : 0.5) : 0), dur: 0.3 }));
        return { stimulus: notes, tempo: 120, choices: [choice('droit', 'Droit'), choice('swing', 'Swing')], answerId: swing ? 'swing' : 'droit' };
      });
      return { ...v, prompt: 'Ces croches sont-elles jouées droites ou swing ?', expected: { kind: 'quiz', items },
        hint: 'Droit : deux croches égales. Swing : la 1re longue, la 2e courte, comme un triolet « taa-ta ».' };
    }
    case 'chord_tone': {
      // un accord tenu, puis une note : est-ce sa fondamentale, sa tierce, sa quinte ou sa septième ?
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const roles = (Array.isArray(p.roles) ? p.roles : ['1', '3', '5']).map(String);
      const idx: Record<string, number> = { '1': 0, '3': 1, '5': 2, '7': 3 };
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const d = pick(r, nums(p.degres, [1, 4, 5]));
        const chord = roles.includes('7') ? diatonicSeventh(base, d) : diatonicTriad(base, d);
        const role = pick(r, roles);
        const target = chord[idx[role]] + 12;
        return { stimulus: [...chord.map((m) => ({ midi: m, start: 0, dur: 3 })), { midi: target, start: 1, dur: 1.8 }], tempo: 80,
          choices: roles.map((x) => choice(x, x === '1' ? 'Fondamentale (1)' : x === '3' ? 'Tierce (3)' : x === '5' ? 'Quinte (5)' : 'Septième (7)')), answerId: role };
      });
      return { ...v, prompt: 'Sur cet accord, quelle note de l\'accord entends-tu au-dessus ?', expected: { kind: 'quiz', items },
        hint: 'La fondamentale se fond dans l\'accord ; la tierce donne sa couleur ; la quinte sonne creuse ; la septième frotte.' };
    }
    case 'target_thirds': {
      // impro guidée : jouer la tierce de chaque accord sur le 1er temps de sa mesure, sur l'accompagnement
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const grid = nums(p.grille_degres, [1, 4, 5, 1]);
      const sept = bool(p.septiemes, false);
      const chordsEv = grid.flatMap((d, b) => (sept ? diatonicSeventh(base, d) : diatonicTriad(base, d)).flatMap((m) => [0, 2].map((k) => ({ midi: m, start: b * 4 + k, dur: 1.8 }))));
      const thirds = grid.map((d, b) => ({ midi: scaleNote(base, d + 2) + 12, start: b * 4, dur: 1 }));
      return { ...v, prompt: 'Sur chaque accord, joue sa tierce au 1er temps de la mesure.', stimulus: chordsEv, stimulusKind: 'melody',
        display: { kind: 'text', text: grid.map((d) => (sept ? DIATONIC7_ROMAN[d] : DIATONIC_ROMAN[d])).join('  |  ') },
        countInBeats: 4, clickDuringCapture: true, simultaneous: true, captureMs: beatsToMs(grid.length * 4, tempo) + 600, answerUI: 'sequence',
        expected: { kind: 'sequence', notes: thirds, checkRhythm: true, octaveAgnostic: true },
        hint: 'Prépare la tierce suivante pendant la mesure : elle est souvent à un demi-ton ou un ton de la précédente.' };
    }
    case 'scale_identify': {
      // une gamme jouée en montant depuis la tonique : laquelle ? (gammes et modes au choix)
      const SC: Record<string, [string, string[]]> = {
        majeure: ['Majeure', ['1', '2', '3', '4', '5', '6', '7']], mineure: ['Mineure', ['1', '2', 'b3', '4', '5', 'b6', 'b7']],
        penta_majeure: ['Penta majeure', ['1', '2', '3', '5', '6']], penta_mineure: ['Penta mineure', ['1', 'b3', '4', '5', 'b7']],
        blues: ['Blues', ['1', 'b3', '4', '#4', '5', 'b7']], dorien: ['Dorien', ['1', '2', 'b3', '4', '5', '6', 'b7']],
        mixolydien: ['Mixolydien', ['1', '2', '3', '4', '5', '6', 'b7']], lydien: ['Lydien', ['1', '2', '3', '#4', '5', '6', '7']],
        phrygien: ['Phrygien', ['1', 'b2', 'b3', '4', '5', 'b6', 'b7']],
      };
      const pool = (Array.isArray(p.gammes) ? p.gammes : ['majeure', 'mineure']).map(String).filter((x) => SC[x]);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const sc = pick(r, pool);
        const root = tonic + randInt(r, -3, 3);
        const toks = [...SC[sc][1], '8'];
        return { stimulus: toks.map((tk, i) => ({ midi: root + DEG_SEMI[tk], start: i * 0.5, dur: 0.48 })), tempo: 100,
          choices: pool.map((x) => choice(x, SC[x][0])), answerId: sc };
      });
      return { ...v, prompt: 'Quelle gamme entends-tu ?', expected: { kind: 'quiz', items },
        hint: 'Écoute la tierce (majeure ou mineure), puis les notes caractéristiques : 6 naturel (dorien), ♭7 (mixolydien), ♯4 (lydien), ♭2 (phrygien).' };
    }
    case 'mode_identify': {
      // une phrase dans un mode, sur un bourdon de tonique, qui insiste sur la note caractéristique
      const pool = (Array.isArray(p.modes) ? p.modes : ['ionien', 'mixolydien']).map(String).filter((x) => MODES[x]);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const m = pick(r, pool);
        const toks = MODES[m].tokens;
        const mel = tokenMelody(r, tonic, toks, 6, { conjoint: true, endOnTonic: true });
        // la note caractéristique au moins deux fois, sur des temps forts
        const tk = [...mel.tokens];
        tk[2] = MODES[m].char; tk[4] = MODES[m].char;
        const notes = mel.notes.map((n, i) => ({ ...n, midi: tokMidi(tonic, tk[i]) }));
        // exemple de chaque mode : sa gamme en montant puis en descendant (le bourdon tient la tonique)
        const scale = (x: string) => { const up = [...MODES[x].tokens, '8'].map((tk) => tonic + DEG_SEMI[tk]); return [...up, ...[...up].reverse().slice(1)].map((midi, i) => ({ midi, start: i * 0.5, dur: 0.48 })); };
        return { stimulus: notes, tempo: 90,
          choices: pool.map((x) => ({ ...choice(x, MODES[x].label), ...(bool(p.apercus, true) ? { preview: scale(x) } : {}) })), answerId: m };
      });
      return { ...v, drone: droneFor(tonic), prompt: 'Dans quel mode est cette phrase ? (▶ pour écouter chaque mode)', expected: { kind: 'quiz', items },
        hint: 'Majeur ou mineur d\'abord (la tierce), puis la note caractéristique : 6 (dorien), ♭2 (phrygien), ♯4 (lydien), ♭7 (mixolydien), ♭6 (éolien).' };
    }
    case 'mode_theory': {
      const keys = Object.keys(MODES);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const m = pick(r, keys);
        if (r() < 0.5) {
          const opts = shuffle(r, [MODES[m].char, ...shuffle(r, ['6', 'b2', '#4', 'b7', 'b6', '7'].filter((x) => x !== MODES[m].char)).slice(0, 3)]);
          return { stimulus: [], tempo, display: { kind: 'text', text: `Note caractéristique du ${MODES[m].label.split(' (')[0].toLowerCase()} ?` }, choices: opts.map((x) => choice(x, tokLabel(x))), answerId: MODES[m].char };
        }
        const others = shuffle(r, keys.filter((x) => x !== m)).slice(0, 3);
        return { stimulus: [], tempo, display: { kind: 'text', text: MODES[m].tokens.map(tokLabel).join(' ') }, choices: shuffle(r, [m, ...others]).map((x) => choice(x, MODES[x].label)), answerId: m };
      });
      return { ...v, prompt: 'Les modes et leur note caractéristique.', expected: { kind: 'quiz', items },
        hint: 'Chaque mode = la gamme majeure avec une ou deux notes changées. Dorien : ♭3 ♭7 mais 6 naturel. Mixolydien : seulement ♭7.' };
    }
    case 'borrowed_chord': {
      // I – X – V – I en majeur : X est-il l'accord de la gamme (IV) ou un emprunt au mineur (iv, ♭VII, ♭VI, ♭III) ?
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const pool = (Array.isArray(p.accords) ? p.accords : ['IV', 'iv', 'bVII']).map(String).filter((x) => BORROWED[x]);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const x = pick(r, pool);
        const chords = [[0, 4, 7], BORROWED[x].semis, [7, 11, 14], [0, 4, 7]];
        const stim = chords.flatMap((c, i) => [...c.map((s) => ({ midi: base + s, start: i * 2, dur: 1.9 })), { midi: base + c[0] - 12, start: i * 2, dur: 1.9 }]);
        return { stimulus: stim, tempo: 80, choices: pool.map((k) => choice(k, BORROWED[k].label)), answerId: x };
      });
      return { ...v, prompt: 'I – ? – V – I : quel est le 2e accord ?', expected: { kind: 'quiz', items },
        hint: 'iv mineur : comme IV mais assombri (sa tierce descend). ♭VII : un ton sous la tonique, son « rock ». ♭VI : grand et dramatique.' };
    }
    case 'outsider_chord': {
      // 5 accords de la gamme, dont un seul hors tonalité : lequel ? (Use Your Ear, étape 5)
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const pos = randInt(r, 1, 4);
        const degs = [1, ...Array.from({ length: 4 }, () => pick(r, [2, 4, 5, 6]))];
        const out = pick(r, ['iv', 'bVII', 'bVI', 'bIII']);
        const stim = degs.flatMap((d, i) => {
          const c = i === pos ? BORROWED[out].semis.map((s) => base + s) : diatonicTriad(base, d);
          return [...c.map((m) => ({ midi: m, start: i * 2, dur: 1.9 })), { midi: c[0] - 12, start: i * 2, dur: 1.9 }];
        });
        return { stimulus: stim, tempo: 85, referenceTonic: true, choices: [1, 2, 3, 4, 5].map((k) => choice(String(k), `${k}e accord`)), answerId: String(pos + 1) };
      });
      return { ...v, prompt: 'Après la cadence, 5 accords : lequel sort de la tonalité ?', expected: { kind: 'quiz', items },
        hint: 'Garde la tonalité bien en tête : l\'accord qui sort donne un « oh, je ne l\'attendais pas ».' };
    }
    case 'modulation_identify': {
      // la phrase reste-t-elle en do, ou part-elle vers la dominante, la sous-dominante ou le relatif mineur ?
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const kinds = (Array.isArray(p.modulations) ? p.modulations : ['reste', 'V', 'vi']).map(String);
      const LBL: Record<string, string> = { reste: 'Reste dans la tonalité', V: 'Va vers la dominante (V)', IV: 'Va vers la sous-dominante (IV)', vi: 'Va vers le relatif mineur (vi)' };
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const k = pick(r, kinds);
        const home = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]];
        // pivot + cadence parfaite dans la nouvelle tonalité (V7 → I)
        const target = k === 'V' ? 7 : k === 'IV' ? 5 : k === 'vi' ? 9 : 0;
        const minor = k === 'vi';
        const away = k === 'reste' ? [[9, 12, 16], [5, 9, 12], [7, 11, 14, 17], [0, 4, 7]]
          // pivot (ii de la nouvelle tonalité majeure, ou iv du relatif mineur), V7, puis la nouvelle tonique
          : [minor ? [target + 5, target + 8, target + 12] : [target + 2, target + 5, target + 9], [target + 7, target + 11, target + 14, target + 17], minor ? [target, target + 3, target + 7] : [target, target + 4, target + 7]];
        const chords = [...home, ...away];
        const stim = chords.flatMap((c, i) => [...c.map((s) => ({ midi: base + s, start: i * 1.6, dur: 1.5 })), { midi: base + c[0] - 12, start: i * 1.6, dur: 1.5 }]);
        return { stimulus: stim, tempo: 90, choices: kinds.map((x) => choice(x, LBL[x])), answerId: k };
      });
      return { ...v, prompt: 'Écoute la fin : la musique change-t-elle de tonalité, et vers où ?', expected: { kind: 'quiz', items },
        hint: 'Chante la tonique du début, puis celle de la fin. Si elles diffèrent : une quinte au-dessus = V ; une quarte = IV ; une tierce mineure en dessous, en mineur = vi.' };
    }
    case 'meter_identify': {
      // des temps accentués : combien de temps par mesure ?
      const meters = nums(p.mesures_possibles, [3, 4, 5]);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const m = pick(r, meters);
        const notes = Array.from({ length: m * 3 }, (_, k) => ({ midi: k % m === 0 ? 84 : 77, start: k, dur: 0.3 }));
        return { stimulus: notes, tempo: 140, choices: meters.map((x) => choice(String(x), `${x} temps`)), answerId: String(m) };
      });
      return { ...v, prompt: 'Le 1er temps est accentué : combien de temps par mesure ?', expected: { kind: 'quiz', items },
        hint: 'Compte entre deux sons aigus (les 1ers temps) : 1 2 3, 1 2 3 4, ou 1 2 3 4 5.' };
    }
    case 'position_scale':
    case 'position_arpeggio': {
      // sens de parcours (page Pratique) : monter, descendre ou aller-retour ; sinon l'ancien réglage aller_retour
      const sens = p.sens === 'monter' || p.sens === 'descendre' || p.sens === 'aller_retour' ? String(p.sens) : (bool(p.aller_retour, true) ? 'aller_retour' : 'monter');
      const route = <T,>(up: T[]): T[] => (sens === 'descendre' ? [...up].reverse() : sens === 'aller_retour' ? [...up, ...[...up].reverse().slice(1)] : up);
      const sensText = sens === 'descendre' ? ', de l\'aigu au grave' : sens === 'aller_retour' ? ', du grave à l\'aigu puis retour' : ', du grave à l\'aigu';
      // positions : gamme ou arpège dans une fenêtre de 5 cases ; mémorisation en 3 temps (guidé, fondamentale seule, de mémoire)
      const STD = ctx.tuning ?? [40, 45, 50, 55, 59, 64];
      const SC: Record<string, string[]> = {
        majeure: ['1', '2', '3', '4', '5', '6', '7'], mineure: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
        penta_majeure: ['1', '2', '3', '5', '6'], penta_mineure: ['1', 'b3', '4', '5', 'b7'], blues: ['1', 'b3', '4', '#4', '5', 'b7'],
        ...Object.fromEntries(Object.entries(MODES).map(([k, m]) => [k, m.tokens])),
      };
      const CH: Record<string, number[]> = { majeur: [0, 4, 7], mineur: [0, 3, 7], dom7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10] };
      const guide = String(p.guide ?? 'complet');
      const speed = typeof p.tempo_cle === 'number';
      const dur = speed ? 0.5 : 1;
      const tmp = speed ? num(p.tempo_cle, 60) : tempo;
      const rootPc = mod12(tonic);
      const arp = t.generator === 'position_arpeggio';
      const quality = arp ? pick(r, (Array.isArray(p.accords) ? p.accords : ['majeur', 'mineur']).map(String)) : '';
      if (ctx.instrument === 'guitare') {
        const box = p.position === 'alea' ? randInt(r, 1, 5) : num(p.position, 1);
        if (!arp && bool(p.relier, false)) {
          // relier deux positions voisines : monter dans l'une, glisser dans la suivante, redescendre
          const toks = SC[String(p.gamme ?? 'penta_majeure')] ?? SC.penta_majeure;
          const wrap = (k: number) => ((k - 1 + 5) % 5) + 1;
          // la position la plus basse sur le manche d'abord, puis sa voisine plus haut
          let first = box, second = wrap(box + 1);
          let a = scalePosition(rootPc, toks, STD, first), b = scalePosition(rootPc, toks, STD, second);
          if (b.start <= a.start) { second = box; first = wrap(box - 1); a = scalePosition(rootPc, toks, STD, first); b = scalePosition(rootPc, toks, STD, second); }
          const seqPos = [...a.notes, ...[...b.notes].reverse()];
          const notes = seqPos.map((n, i) => ({ midi: n.midi, start: i, dur: 1 }));
          const lab = (n: { degree: string }) => n.degree.replace('b', '♭').replace('#', '♯');
          const marks = guide === 'complet' ? [...a.notes, ...b.notes].map((n) => ({ string: n.string, fret: n.fret, label: lab(n) }))
            : guide === 'fondamentale' ? [...a.notes, ...b.notes].filter((n) => n.degree === '1').map((n) => ({ string: n.string, fret: n.fret, label: '1' })) : [];
          return {
            ...v, prompt: `Monte la position ${first}, puis glisse dans la position ${second} et redescends.`,
            guide: { marks, zone: { strings: [0, 5], frets: [a.start, b.start + 4] }, staffLabels: guide === 'aucun' ? undefined : seqPos.map(lab), text: 'Les deux positions partagent des notes : passe de l\'une à l\'autre en glissant sur une corde.' },
            answerUI: 'sequence', expected: { kind: 'sequence', notes, checkRhythm: false, octaveAgnostic: false },
            hint: 'Dis les degrés à voix basse : ce sont les mêmes notes, seule la main se déplace.',
          };
        }
        const pos = arp ? arpeggioPosition(rootPc, CH[quality], STD, box) : scalePosition(rootPc, SC[String(p.gamme ?? 'penta_mineure')] ?? SC.penta_mineure, STD, box);
        const up = pos.notes;
        const seqPos = route(up);
        const notes = seqPos.map((n, i) => ({ midi: n.midi, start: i * dur, dur }));
        const label = (n: { degree: string; finger: number }) => (p.etiquettes === 'doigts' ? String(n.finger) : n.degree.replace('b', '♭').replace('#', '♯'));
        const marks = guide === 'complet' ? up.map((n) => ({ string: n.string, fret: n.fret, label: label(n) }))
          : guide === 'fondamentale' ? up.filter((n) => n.degree === '1').map((n) => ({ string: n.string, fret: n.fret, label: '1' })) : [];
        const what = arp ? `l'arpège de ${pcName(tonic)} ${quality === 'majeur' ? 'majeur' : quality === 'mineur' ? 'mineur' : quality}` : `la position ${box}`;
        return {
          ...v, tempo: tmp, prompt: speed ? `Vitesse : ${what}${sensText}, à ${tmp} BPM, en croches, coups de médiator alternés.` : `Joue ${what}${sensText}.`,
          guide: { marks, zone: { strings: [0, 5], frets: [pos.start, pos.start + 4] }, staffLabels: speed ? alternatePicking(seqPos.length) : guide === 'aucun' ? undefined : seqPos.map((n) => label(n)), text: guide === 'aucun' ? 'De mémoire : seule la zone est indiquée.' : guide === 'fondamentale' ? 'Seules les fondamentales sont marquées : retrouve le reste.' : undefined },
          answerUI: 'sequence', countInBeats: speed ? 4 : 0, clickDuringCapture: speed, simultaneous: speed, captureMs: speed ? beatsToMs(notes.length * dur, tmp) + 600 : 0,
          expected: { kind: 'sequence', notes, checkRhythm: speed, octaveAgnostic: false },
          hint: `Un doigt par case : l'index sur la case ${Math.max(1, pos.start + 1)}. Dis les degrés à voix basse en jouant.`,
        };
      }
      // piano : gamme (ou arpège) sur une octave, avec les doigtés de la main droite
      const left = p.main === 'gauche';
      const base = (left ? 48 : 60) + rootPc;
      const toks = arp ? null : SC[String(p.gamme ?? 'majeure')] ?? SC.majeure;
      const upMidis = arp ? [...CH[quality].map((s) => base + s), base + 12] : [...toks!.map((tk) => base + DEG_SEMI[tk]), base + 12];
      const fingersUp = arp ? (CH[quality].length === 4 ? [1, 2, 3, 4, 5] : [1, 2, 3, 5])
        : left ? pianoLeftFingering(rootPc, toks!.length + 1) : p.gamme === 'lydien' && rootPc === 0 ? [1, 2, 3, 4, 1, 2, 3, 4] : toks!.length === 7 ? pianoScaleFingering(rootPc) : [1, 2, 3, 1, 2, 3];
      const midis = route(upMidis);
      const fingers = route(fingersUp);
      const notes = midis.map((m, i) => ({ midi: m, start: i * dur, dur }));
      return {
        ...v, tempo: tmp, ...(left ? { tonic: base } : {}), prompt: speed ? `Vitesse : la gamme${sensText}, à ${tmp} BPM, en croches.` : `Joue ${arp ? 'l\'arpège' : 'la gamme'} de ${pcName(tonic)}${left ? ' à la main gauche' : ''} avec les doigtés indiqués.`,
        guide: { marks: [], staffLabels: guide === 'aucun' ? undefined : fingers.map(String), text: guide === 'aucun' ? `De mémoire : le doigté n'est plus affiché${left ? ' (main gauche)' : ''}.` : `Les chiffres sous la portée sont les doigts de la main ${left ? 'gauche' : 'droite'} (1 = pouce).` },
        answerUI: 'sequence', countInBeats: speed ? 4 : 0, clickDuringCapture: speed, simultaneous: speed, captureMs: speed ? beatsToMs(notes.length * dur, tmp) + 600 : 0,
        expected: { kind: 'sequence', notes, checkRhythm: speed, octaveAgnostic: false },
        hint: 'Le pouce passe sous la main après le 3e doigt : il ne doit pas faire de bruit ni de retard.',
      };
    }
    case 'chord_shape': {
      const STD = ctx.tuning ?? [40, 45, 50, 55, 59, 64];
      const qualities = (Array.isArray(p.accords) ? p.accords : ['majeur', 'mineur']).map(String);
      const q = pick(r, qualities);
      const guide = String(p.guide ?? 'complet');
      const rootPc = Math.floor(r() * 12);
      const QL: Record<string, string> = { majeur: 'majeur', mineur: 'mineur', dom7: '7', maj7: 'maj7', m7: 'm7' };
      if (ctx.instrument === 'guitare') {
        const shape = pick(r, (Array.isArray(p.formes) ? p.formes : ['E', 'A']).map(String)) as 'E' | 'A';
        const pos = chordShape(rootPc, q, shape, STD);
        const rootFret = pos[0].fret - (CHORD_SHAPES[shape][q].find((x) => x !== null) ?? 0);
        const marks = guide === 'complet' ? pos.map((n) => ({ string: n.string, fret: n.fret, label: n.degree.replace('b', '♭') }))
          : guide === 'fondamentale' ? pos.filter((n) => n.degree === '1').map((n) => ({ string: n.string, fret: n.fret, label: '1' })) : [];
        return { ...v, tonic: STD[0] + mod12(rootPc - STD[0]), prompt: `Place ${pcName(60 + rootPc)} ${QL[q]}, forme de ${shape === 'E' ? 'mi' : 'la'} (fondamentale sur la ${shape === 'E' ? '6e' : '5e'} corde, case ${rootFret}).`,
          guide: { marks, zone: { strings: [0, 5], frets: [Math.max(0, rootFret - 1), rootFret + 3] }, text: guide === 'aucun' ? 'De mémoire : place toute la forme.' : undefined },
          answerUI: 'select', expected: { kind: 'set', midis: pos.map((n) => n.midi), octaveAgnostic: false },
          hint: `Barre (ou index) case ${rootFret} ; les degrés de l'accord : ${[...new Set(pos.map((n) => n.degree))].join(' ')}.` };
      }
      // piano : l'accord dans un renversement précis
      const inv = randInt(r, 0, 2);
      const notes = triad(60 + rootPc, q === 'mineur' ? 'mineur' : 'majeur');
      for (let k = 0; k < inv; k++) notes.push(notes.shift()! + 12);
      return { ...v, tonic: 60 + rootPc, prompt: `Place ${pcName(60 + rootPc)} ${q === 'mineur' ? 'mineur' : 'majeur'} en ${['position fondamentale', '1er renversement', '2e renversement'][inv]}.`,
        answerUI: 'select', expected: { kind: 'set', midis: notes, octaveAgnostic: false },
        hint: `Note du bas : ${pcName(notes[0])}. Doigtés main droite : 1-3-5.` };
    }
    case 'ear_in_position': {
      // l'oreille dans la position : après la cadence, un degré joue ; trouve-le DANS la position affichée
      const STD = ctx.tuning ?? [40, 45, 50, 55, 59, 64];
      const toks = p.gamme === 'penta_majeure' ? ['1', '2', '3', '5', '6'] : ['1', '2', '3', '4', '5', '6', '7'];
      const pool = (Array.isArray(p.degres) ? p.degres : ['1', '3', '5']).map(String);
      const tk = pick(r, pool.filter((x) => x !== '1').length ? pool.filter((x) => x !== '1') : pool);
      const rootPc = mod12(tonic);
      const target = tonic + DEG_SEMI[tk];
      if (ctx.instrument === 'guitare') {
        const pos = scalePosition(rootPc, toks, STD, num(p.position, 1));
        const marks = pos.notes.filter((n) => n.degree === '1').map((n) => ({ string: n.string, fret: n.fret, label: '1' }));
        return { ...v, prompt: 'Après la cadence, écoute la note : trouve-la dans la position (les 1 sont marqués).',
          stimulus: [{ midi: target, start: 0, dur: 1.8 }], stimulusKind: 'melody', referenceTonic: true,
          guide: { marks, zone: { strings: [0, 5], frets: [pos.start, pos.start + 4] } },
          answerUI: 'sequence', expected: { kind: 'sequence', notes: [{ midi: target, start: 0, dur: 1 }], checkRhythm: false, octaveAgnostic: true },
          hint: 'Reconnais d\'abord le degré à sa couleur, puis vise-le depuis le 1 le plus proche.' };
      }
      return { ...v, prompt: 'Après la cadence, écoute la note et joue-la.', stimulus: [{ midi: target, start: 0, dur: 1.8 }], stimulusKind: 'melody', referenceTonic: true,
        answerUI: 'sequence', expected: { kind: 'sequence', notes: [{ midi: target, start: 0, dur: 1 }], checkRhythm: false, octaveAgnostic: true },
        hint: 'Reconnais d\'abord le degré à sa couleur, puis compte depuis la tonique.' };
    }
    case 'audiate_pattern': {
      // audiation : voir un motif en degrés, l'entendre dans sa tête (après la cadence), puis le jouer ou le chanter
      const pool = nums(p.degres, [1, 2, 3]);
      const n = num(p.nb_notes, 3);
      const sing = bool(p.chanter, false);
      const degs = [1];
      for (let k = 1; k < n; k++) {
        const prev = degs[k - 1];
        const steps = pool.filter((d) => d !== prev && Math.abs(d - prev) <= (bool(p.sauts, false) ? 4 : 2));
        degs.push(pick(r, steps.length ? steps : pool));
      }
      const notes = degs.map((d, i) => ({ midi: degreeToMidi(tonic, d), start: i, dur: 0.95 }));
      return { ...v, audiate: true, prompt: sing ? 'Entends ce motif dans ta tête, puis chante-le.' : 'Entends ce motif dans ta tête, puis joue-le.',
        display: { kind: 'degrees', degrees: degs.map(String) }, stimulus: notes, stimulusKind: 'none', referenceTonic: true,
        answerUI: sing ? 'sing' : 'sequence', expected: { kind: 'sequence', notes, checkRhythm: false, octaveAgnostic: true },
        hint: 'Chante intérieurement la tonique de la cadence, puis monte ou descends degré par degré dans ta tête avant de toucher la moindre note.' };
    }
    case 'audiate_tune': {
      // une mélodie connue, sans l'entendre : la retrouver de tête sur l'instrument
      const pool = nums(p.degres, [1, 2, 3, 4, 5]);
      const tunes = tunesFor(pool);
      const tune = pick(r, tunes.length ? tunes : TUNES.slice(0, 3));
      const len = Math.min(tune.notes.length, num(p.nb_notes, 7));
      let t0 = 0;
      const notes = tune.notes.slice(0, len).map(([d, dur]) => { const nn = { midi: tonic + tuneDegreeSemis(d), start: t0, dur }; t0 += dur; return nn; });
      const first = tune.notes[0][0];
      return { ...v, audiate: true, prompt: `Sans l'écouter : joue le début de « ${tune.title} » (${len} notes).`,
        stimulus: notes, stimulusKind: 'none', referenceTonic: true, answerUI: 'sequence',
        expected: { kind: 'sequence', notes, checkRhythm: false, octaveAgnostic: true },
        hint: `Chante-la dans ta tête. Elle commence sur le degré ${Math.abs(first)}${first < 0 ? ' (sous la tonique)' : ''}.` };
    }
    case 'predict_next': {
      // la phrase s'arrête sur une note qui « tire » : entends où elle va, et joue la note qui la termine
      const TEND: Record<number, number> = { 7: 1, 2: 1, 4: 3, 6: 5 };
      const pool = nums(p.tensions, [7, 2]);
      const tense = pick(r, pool);
      const target = TEND[tense];
      const path: number[] = [];
      let d = pick(r, [1, 3, 5]);
      for (let k = 0; k < 3; k++) { path.push(d); d = Math.max(1, Math.min(7, d + pick(r, [-1, 1]))); }
      path.push(tense);
      const notes = path.map((x, i) => ({ midi: degreeToMidi(tonic, x) - (x === 7 && target === 1 ? 12 : 0), start: i, dur: 0.9 }));
      const goal = degreeToMidi(tonic, target);
      return { ...v, drone: bool(p.bourdon, true) ? droneFor(tonic) : null, prompt: 'La phrase s\'arrête avant la fin : joue la note qui la termine.', stimulus: notes, stimulusKind: 'melody', referenceTonic: true,
        answerUI: 'sequence', expected: { kind: 'sequence', notes: [{ midi: goal, start: 0, dur: 1 }], checkRhythm: false, octaveAgnostic: true },
        hint: '7 monte vers 1, 2 descend vers 1, 4 descend vers 3, 6 descend vers 5 : la note où la phrase « veut » aller.' };
    }
    case 'step_size': {
      // ton ou demi-ton ? deux notes voisines, montantes ou descendantes
      const dirs = String(p.sens ?? 'montant');
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const st = r() < 0.5 ? 1 : 2;
        const a = tonic + randInt(r, -4, 7);
        const down = dirs === 'les_deux' ? r() < 0.5 : dirs === 'descendant';
        const [x, y] = down ? [a + st, a] : [a, a + st];
        return { stimulus: [{ midi: x, start: 0, dur: 0.9 }, { midi: y, start: 1, dur: 1.4 }], tempo: 76,
          choices: [choice('1', 'Demi-ton'), choice('2', 'Ton')], answerId: String(st) };
      });
      return { ...v, prompt: 'Ces deux notes sont-elles à un ton ou à un demi-ton ?', expected: { kind: 'quiz', items },
        hint: 'Le demi-ton est très serré, les deux notes se frôlent ; le ton laisse un petit espace entre elles.' };
    }
    case 'step_on_instrument': {
      // depuis une note marquée en or : un ton ou un demi-ton, au-dessus ou en dessous
      const root = ctx.instrument === 'guitare' ? pick(r, [45, 47, 48, 50, 52]) : pick(r, naturalsBetween(62, 69));
      // retour bêta : jamais deux fois la même consigne (« un ton ↑ · un ton ↑ » faisait jouer deux fois la même note)
      const combos = [{ st: 2, up: true }, { st: 1, up: true }, ...(bool(p.dessous, true) ? [{ st: 2, up: false }, { st: 1, up: false }] : [])];
      const tasks = shuffle(r, combos).slice(0, Math.min(num(p.nb_cibles, 2), combos.length));
      const nm = pcName(root);
      const label = (t: { st: number; up: boolean }, i: number) => `${['①', '②', '③', '④'][i]} ${t.st === 2 ? 'un ton' : 'un demi-ton'} ${t.up ? 'au-dessus' : 'en dessous'} de ${nm}`;
      return { ...v, tonic: root, markRoot: root, prompt: tasks.length === 1 ? `Pars du ${nm} (en or) et joue la note demandée.` : `Pars du ${nm} (en or). Joue les notes ${tasks.map((_, i) => ['①', '②', '③', '④'][i]).join(', ')} dans l'ordre, en repartant chaque fois du ${nm}.`,
        display: { kind: 'text', text: tasks.map(label).join('\n') }, answerUI: 'sequence',
        expected: { kind: 'sequence', notes: tasks.map((t, i) => ({ midi: root + (t.up ? t.st : -t.st), start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: false },
        hint: ctx.instrument === 'guitare' ? 'Une case = un demi-ton ; deux cases = un ton, sur la même corde.' : 'Une touche voisine (noire comprise) = un demi-ton ; deux touches = un ton.' };
    }
    case 'step_theory': {
      // ton ou demi-ton entre deux notes nommées (repère : mi-fa et si-do sont des demi-tons)
      const NAT = ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'];
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        if (bool(p.alterations, false) && r() < 0.3) {
          const k = pick(r, [0, 2, 3, 5, 7, 9]);
          const nm = NAT[[0, 2, 4, 5, 7, 9, 11].indexOf(k)];
          return { stimulus: [], tempo, display: { kind: 'text', text: `${nm} → ${nm}♯` }, choices: [choice('1', 'Demi-ton'), choice('2', 'Ton')], answerId: '1' };
        }
        const i = randInt(r, 0, 6);
        const a = NAT[i], b = NAT[(i + 1) % 7];
        const half = a === 'mi' || a === 'si';
        return { stimulus: [], tempo, display: { kind: 'text', text: `${a} → ${b}` }, choices: [choice('1', 'Demi-ton'), choice('2', 'Ton')], answerId: half ? '1' : '2' };
      });
      return { ...v, prompt: 'Entre ces deux notes voisines : un ton ou un demi-ton ?', expected: { kind: 'quiz', items },
        hint: 'Seuls mi-fa et si-do sont des demi-tons : c\'est là qu\'il n\'y a pas de touche noire entre les deux.' };
    }
    case 'scale_right_wrong': {
      // une gamme majeure jouée juste, ou avec une note décalée d'un demi-ton
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const base = bool(p.varie, false) ? tonic + randInt(r, -3, 4) : tonic;
        const semis = [0, 2, 4, 5, 7, 9, 11, 12];
        const wrong = r() < 0.5;
        const k = randInt(r, 1, 6);
        const notes = semis.map((s, i) => ({ midi: base + s + (wrong && i === k ? (r() < 0.5 ? -1 : 1) : 0), start: i * 0.55, dur: 0.5 }));
        return { stimulus: notes, tempo: 96, choices: [choice('juste', 'Juste'), choice('fausse', 'Une note est fausse')], answerId: wrong ? 'fausse' : 'juste' };
      });
      return { ...v, prompt: 'Cette gamme majeure est-elle juste ?', expected: { kind: 'quiz', items },
        hint: 'Chante « do ré mi fa sol la si do » en même temps : la note fausse accroche, comme une marche mal placée.' };
    }
    case 'major_scale_theory': {
      const NAT = ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'];
      const lvl = num(p.niveau_q, 0);
      const SCALES: Record<string, string[]> = {
        do: ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'], sol: ['sol', 'la', 'si', 'do', 'ré', 'mi', 'fa♯'],
        fa: ['fa', 'sol', 'la', 'si♭', 'do', 'ré', 'mi'], ré: ['ré', 'mi', 'fa♯', 'sol', 'la', 'si', 'do♯'],
      };
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const kind = randInt(r, 0, Math.min(3, lvl + 1));
        if (kind === 0) {
          const i = randInt(r, 0, 5);
          const ans = NAT[i + 1];
          const opts = shuffle(r, [ans, ...shuffle(r, NAT.filter((x) => x !== ans && x !== NAT[i])).slice(0, 2), `${ans}♯`].slice(0, 4));
          return { stimulus: [], tempo, display: { kind: 'text', text: `Gamme de do majeur : après ${NAT[i]} ?` }, choices: opts.map((x) => choice(x, x)), answerId: ans };
        }
        if (kind === 1) {
          const i = randInt(r, 0, 6);
          const half = i === 2 || i === 6;
          return { stimulus: [], tempo, display: { kind: 'text', text: `Dans la gamme, entre le degré ${i + 1} et le degré ${i + 2 > 7 ? '8' : i + 2} ?` }, choices: [choice('½', 'Demi-ton'), choice('T', 'Ton')], answerId: half ? '½' : 'T' };
        }
        if (kind === 2) {
          const key = pick(r, ['sol', 'fa', 'ré']);
          const alt = SCALES[key].filter((x) => x.includes('♯') || x.includes('♭'));
          const ans = alt.join(' et ');
          const opts = shuffle(r, [ans, ...['fa♯', 'si♭', 'do♯', 'mi♭', 'fa♯ et do♯'].filter((x) => x !== ans).slice(0, 3)]);
          return { stimulus: [], tempo, display: { kind: 'text', text: `Gamme de ${key} majeur : quelle(s) note(s) altérée(s) ?` }, choices: opts.map((x) => choice(x, x)), answerId: ans };
        }
        const good = 'T T ½ T T T ½';
        const opts = shuffle(r, [good, 'T ½ T T T ½ T', 'T T T ½ T T ½', '½ T T T ½ T T']);
        return { stimulus: [], tempo, display: { kind: 'text', text: 'La formule de la gamme majeure ?' }, choices: opts.map((x) => choice(x, x)), answerId: good };
      });
      return { ...v, prompt: 'La gamme majeure : ses notes et sa structure.', expected: { kind: 'quiz', items },
        hint: 'Les demi-tons tombent entre 3 et 4, puis entre 7 et 8. Partout ailleurs : un ton.' };
    }
    // ---------- leçons approfondies 9 à 15 (0.21.0) ----------
    case 'interval_theory': {
      // nommer un intervalle écrit sur la portée (nom + qualité), le renverser, le retrouver par sa taille
      const lvl = num(p.niveau_q, 0);
      const NATPC = [0, 2, 4, 5, 7, 9, 11];
      const NUM = ['', 'unisson', 'seconde', 'tierce', 'quarte', 'quinte', 'sixte', 'septième', 'octave'];
      const nameOf = (n: number, st: number) => {
        if (n === 8) return 'octave';
        if (n === 4) return st === 5 ? 'quarte juste' : 'quarte augmentée';
        if (n === 5) return st === 7 ? 'quinte juste' : 'quinte diminuée';
        const major = { 2: 2, 3: 4, 6: 9, 7: 11 }[n as 2 | 3 | 6 | 7];
        return `${NUM[n]} ${st === major ? 'majeure' : 'mineure'}`;
      };
      const INV: Record<string, string> = {
        'seconde majeure': 'septième mineure', 'seconde mineure': 'septième majeure', 'tierce majeure': 'sixte mineure', 'tierce mineure': 'sixte majeure',
        'quarte juste': 'quinte juste', 'quinte juste': 'quarte juste', 'sixte majeure': 'tierce mineure', 'sixte mineure': 'tierce majeure',
        'septième majeure': 'seconde mineure', 'septième mineure': 'seconde majeure',
      };
      const all = Object.keys(INV);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const kind = randInt(r, 0, Math.min(2, lvl + 1));
        if (kind === 0) {
          const i = randInt(r, 0, 6), n = randInt(r, 2, 7);
          const a = 60 + NATPC[i], j = i + n - 1;
          const b = 60 + 12 * Math.floor(j / 7) + NATPC[j % 7];
          const ans = nameOf(n, b - a);
          const near = [nameOf(n, b - a + 1), nameOf(n, b - a - 1), nameOf(Math.min(7, n + 1), b - a + 2), nameOf(Math.max(2, n - 1), b - a - 2)].filter((x) => x !== ans);
          const opts = shuffle(r, [ans, ...shuffle(r, [...new Set(near)]).slice(0, 3)]);
          return { stimulus: [{ midi: a, start: 0, dur: 0.9 }, { midi: b, start: 1, dur: 1.2 }], tempo: 70, display: { kind: 'staff', midis: [a, b] }, choices: opts.map((x) => choice(x, x)), answerId: ans };
        }
        if (kind === 1) {
          const x = pick(r, all);
          const opts = shuffle(r, [INV[x], ...shuffle(r, all.filter((y) => y !== INV[x] && y !== x)).slice(0, 3)]);
          return { stimulus: [], tempo, display: { kind: 'text', text: `Le renversement d'une ${x} ?` }, choices: opts.map((y) => choice(y, y)), answerId: INV[x] };
        }
        const st = pick(r, [3, 4, 5, 7, 8, 9, 10, 11]);
        const ans = INTERVAL_LABEL[st].toLowerCase();
        const opts = shuffle(r, [ans, ...shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((x) => x !== st)).slice(0, 3).map((x) => INTERVAL_LABEL[x].toLowerCase())]);
        return { stimulus: [], tempo, display: { kind: 'text', text: `${st} demi-tons, c'est… ?` }, choices: opts.map((y) => choice(y, y)), answerId: ans };
      });
      return { ...v, prompt: 'Nomme l\'intervalle écrit sur la portée, ou réponds à la question affichée.', expected: { kind: 'quiz', items },
        hint: 'Le nom compte les notes (do-mi : do, ré, mi = tierce). La qualité compte les demi-tons. Renversé, les noms font 9 et majeur devient mineur.' };
    }
    case 'interval_play': {
      // mapping : depuis une note en or, joue l'intervalle demandé au-dessus
      const sts = nums(p.intervalles, [3, 4, 7]);
      const root = ctx.instrument === 'guitare' ? pick(r, [45, 47, 48, 50, 52]) : pick(r, naturalsBetween(60, 67));
      const st = pick(r, sts);
      return {
        ...v, tonic: root, markRoot: root, prompt: 'Pars de la note en or et joue l\'intervalle affiché, au-dessus.',
        display: { kind: 'text', text: `${pcName(root)} + ${INTERVAL_LABEL[st].toLowerCase()} ↑` }, answerUI: 'sequence',
        expected: { kind: 'sequence', notes: [{ midi: root + st, start: 0, dur: 1 }], checkRhythm: false, octaveAgnostic: false },
        hint: `${st} demi-tons au-dessus : ${ctx.instrument === 'guitare' ? `${st} cases plus loin sur la même corde` : `${st} touches plus à droite, noires comprises`}.`,
      };
    }
    case 'minor_type_identify': {
      // naturel, harmonique ou mélodique ? la gamme jouée en montant, sur un bourdon
      const TYPES: Record<string, { label: string; semis: number[] }> = {
        naturel: { label: 'Naturel', semis: [0, 2, 3, 5, 7, 8, 10, 12] },
        harmonique: { label: 'Harmonique', semis: [0, 2, 3, 5, 7, 8, 11, 12] },
        melodique: { label: 'Mélodique', semis: [0, 2, 3, 5, 7, 9, 11, 12] },
      };
      const keys = Array.isArray(p.types) ? (p.types as unknown as string[]) : Object.keys(TYPES);
      const base = tonic >= 62 ? tonic - 12 : tonic;
      const scale = (k: string) => TYPES[k].semis.map((x, i) => ({ midi: base + x, start: i * 0.55, dur: 0.5 }));
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const k = pick(r, keys);
        return { stimulus: scale(k), tempo: 96, choices: keys.map((x) => ({ ...choice(x, TYPES[x].label), ...(bool(p.exemples, false) ? { preview: scale(x) } : {}) })), answerId: k };
      });
      return { ...v, drone: droneFor(base), prompt: 'Ce mineur est-il naturel, harmonique ou mélodique ?', expected: { kind: 'quiz', items },
        hint: 'Écoute la fin : un grand saut oriental entre 6 et 7 = harmonique ; une montée toute lumineuse (6 et 7 hauts) = mélodique ; sans sensible = naturel.' };
    }
    case 'minor_scale_play': {
      // technique : joue le mineur demandé (naturel, harmonique, mélodique) depuis la même tonique
      const TYPES: Record<string, { label: string; toks: string[] }> = {
        naturel: { label: 'naturel', toks: ['1', '2', 'b3', '4', '5', 'b6', 'b7', '8'] },
        harmonique: { label: 'harmonique', toks: ['1', '2', 'b3', '4', '5', 'b6', '7', '8'] },
        melodique: { label: 'mélodique', toks: ['1', '2', 'b3', '4', '5', '6', '7', '8'] },
      };
      const k = pick(r, Array.isArray(p.types) ? (p.types as unknown as string[]) : Object.keys(TYPES));
      const root = ctx.instrument === 'guitare' ? 45 : 57;
      return {
        ...v, tonic: root, markRoot: root, prompt: `Joue la mineur ${TYPES[k].label}, en montant, de la à la.`,
        display: { kind: 'text', text: TYPES[k].toks.map((x) => tokLabel(x === '8' ? '1' : x)).join('  ') }, answerUI: 'sequence',
        expected: { kind: 'sequence', notes: TYPES[k].toks.map((x, i) => ({ midi: root + DEG_SEMI[x], start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: true },
        hint: k === 'naturel' ? 'Les touches blanches de la à la.' : k === 'harmonique' ? 'Comme le naturel, mais sol devient sol♯.' : 'En montant : fa♯ et sol♯.',
      };
    }
    case 'sing_tokens': {
      // chant : des degrés (même altérés) à chanter sur le bourdon, ex. 5 ♭6 7 1 en mineur harmonique, la note d'un mode
      const toks = Array.isArray(p.tokens) ? (p.tokens as unknown as string[]) : ['5', 'b6', '7', '8'];
      const label = typeof p.titre === 'string' ? p.titre : '';
      return {
        ...v, drone: droneFor(tonic), prompt: `Sur le bourdon, chante ${label || 'les degrés affichés'}, l'un après l'autre.`,
        stimulus: [{ midi: tonic, start: 0, dur: 2 }], stimulusKind: 'melody',
        display: { kind: 'degrees', degrees: toks.map((x) => tokLabel(x === '8' ? '1' : x)) }, answerUI: 'sing',
        expected: { kind: 'sequence', notes: toks.map((x, i) => ({ midi: tonic + DEG_SEMI[x], start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: true },
        hint: 'Pars de la tonique que tu entends dans le bourdon et monte marche par marche ; une note altérée est à un demi-ton de sa voisine.',
      };
    }
    case 'function_family': {
      // théorie : à quelle famille appartient cet accord de la gamme (tonique, sous-dominante, dominante) ?
      const ROM = ['', 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
      const SUF = ['', '', ' m', ' m', '', '', ' m', '°'];
      const FAM: Record<number, string> = { 1: 'tonique', 3: 'tonique', 6: 'tonique', 4: 'sous', 2: 'sous', 5: 'dominante', 7: 'dominante' };
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const key = pick(r, Array.isArray(p.tonalites) ? (p.tonalites as unknown as string[]) : ['C', 'G', 'F']);
        const d = randInt(r, 1, 7);
        return { stimulus: [], tempo, display: { kind: 'text', text: `En ${KEY_LABEL[key]} majeur : ${degreeNoteName(key, d)}${SUF[d]} (${ROM[d]})` },
          choices: [choice('tonique', 'Tonique · repos'), choice('sous', 'Sous-dominante · départ'), choice('dominante', 'Dominante · tension')], answerId: FAM[d] };
      });
      return { ...v, prompt: 'À quelle famille appartient cet accord ?', expected: { kind: 'quiz', items },
        hint: 'Tonique : I, vi, iii. Sous-dominante : IV, ii. Dominante : V, vii°. Deux accords voisins d\'une tierce partagent deux notes, donc souvent la même famille.' };
    }
    case 'grid_bass_play': {
      // technique : la basse d'une grille dans plusieurs tonalités (la fondamentale de chaque accord)
      const grid = pick(r, Array.isArray(p.grilles) ? (p.grilles as unknown as string[]) : ['I-vi-IV-V']);
      const key = pick(r, Array.isArray(p.tonalites) ? (p.tonalites as unknown as string[]) : ['C', 'G', 'F']);
      const kt = resolveTonic({ tonalite: key }, ctx.instrument);
      const DEG: Record<string, number> = { I: 1, ii: 2, iii: 3, IV: 4, V: 5, vi: 6 };
      const degs = grid.split('-').map((g) => DEG[g] ?? 1);
      return {
        ...v, tonic: kt, prompt: `En ${KEY_LABEL[key]} majeur, joue la basse de la grille : la fondamentale de chaque accord.`,
        display: { kind: 'text', text: grid.split('-').join(' – ') }, answerUI: 'sequence',
        expected: { kind: 'sequence', notes: degs.map((d, i) => ({ midi: degreeToMidi(kt, d), start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: true },
        hint: `En ${KEY_LABEL[key]} : ${degs.map((d) => degreeNoteName(key, d)).join(', ')}.`,
      };
    }
    case 'circle_theory': {
      // le cycle des quintes : la suite, le nombre d'altérations, les voisines
      const SH = ['do', 'sol', 'ré', 'la', 'mi', 'si', 'fa♯'], FL = ['do', 'fa', 'si♭', 'mi♭', 'la♭', 'ré♭'];
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const kind = randInt(r, 0, 2);
        if (kind === 0) {
          const sharps = r() < 0.6;
          const list = sharps ? SH : FL;
          const i = randInt(r, 0, list.length - 3);
          const ans = list[i + 2];
          const opts = shuffle(r, [ans, ...shuffle(r, [...SH, ...FL].filter((x) => x !== ans && x !== list[i] && x !== list[i + 1])).slice(0, 3)]);
          return { stimulus: [], tempo, display: { kind: 'text', text: `${list[i]} → ${list[i + 1]} → ?` }, choices: [...new Set(opts)].map((x) => choice(x, x)), answerId: ans };
        }
        if (kind === 1) {
          const k = pick(r, MAJOR_KEYS.filter((x) => x.sig !== 0 && Math.abs(x.sig) <= 4));
          const lab = (sg: number) => (sg === 0 ? 'aucune' : `${Math.abs(sg)} ${sg > 0 ? '♯' : '♭'}`);
          const opts = shuffle(r, [...new Set([k.sig, -k.sig, k.sig + (k.sig > 0 ? 1 : -1), k.sig - (k.sig > 0 ? 1 : -1)])]);
          return { stimulus: [], tempo, display: { kind: 'text', text: `${k.name.charAt(0).toUpperCase()}${k.name.slice(1)} majeur : combien d'altérations ?` }, choices: opts.map((x) => choice(String(x), lab(x))), answerId: String(k.sig) };
        }
        const k = pick(r, MAJOR_KEYS.filter((x) => Math.abs(x.sig) <= 3));
        const up = MAJOR_KEYS.find((x) => x.sig === k.sig + 1), down = MAJOR_KEYS.find((x) => x.sig === k.sig - 1);
        const ans = [down?.name, up?.name].filter(Boolean).join(' et ');
        const far = shuffle(r, MAJOR_KEYS.filter((x) => Math.abs(x.sig - k.sig) >= 2 && Math.abs(x.sig) <= 4)).slice(0, 4).map((x) => x.name);
        const opts = shuffle(r, [ans, `${far[0]} et ${far[1]}`, `${down?.name ?? far[2]} et ${far[2]}`, `${far[3]} et ${up?.name ?? far[1]}`]);
        return { stimulus: [], tempo, display: { kind: 'text', text: `Les deux voisines de ${k.name} majeur sur le cercle ?` }, choices: [...new Set(opts)].map((x) => choice(x, x)), answerId: ans };
      });
      return { ...v, prompt: 'Le cycle des quintes.', expected: { kind: 'quiz', items },
        hint: 'En montant d\'une quinte : un dièse de plus (do, sol, ré, la…). En descendant : un bémol de plus (do, fa, si♭, mi♭…). Les voisines sont à une quinte de chaque côté.' };
    }
    case 'fifths_bass_play': {
      // technique : des basses qui descendent de quinte en quinte jusqu'à la tonique (… → ii → V → I)
      const n = num(p.longueur, 4);
      const key = pick(r, Array.isArray(p.tonalites) ? (p.tonalites as unknown as string[]) : ['C', 'G', 'F']);
      const kt = resolveTonic({ tonalite: key }, ctx.instrument);
      const roots = Array.from({ length: n }, (_, i) => kt + mod12(7 * (n - 1 - i)));
      return {
        ...v, tonic: kt, prompt: `Descends de quinte en quinte jusqu'à ${KEY_LABEL[key]} : ${n} basses, la dernière est la tonique.`,
        display: { kind: 'text', text: `${roots.map((m) => pcName(m)).slice(0, 1).join('')} → … → ${KEY_LABEL[key]}` }, answerUI: 'sequence',
        expected: { kind: 'sequence', notes: roots.map((m, i) => ({ midi: m, start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: true },
        hint: `Une quinte plus bas = une quarte plus haut. Ici : ${roots.map((m) => pcName(m)).join(' → ')}.`,
      };
    }
    case 'borrowed_origin': {
      // théorie : d'où vient cet accord ? de la gamme, ou emprunté au mineur de même tonique ; emprunt ou modulation ?
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        if (r() < 0.65) {
          const key = pick(r, ['C', 'G', 'F']);
          const kt = 60 + (KEY_PC[key] ?? 0);
          const kind = pick(r, ['IV', 'iv', 'bVII', 'bVI', 'bIII']);
          const root = kt + BORROWED[kind].semis[0];
          const qual = kind === 'iv' ? ' mineur' : ' majeur';
          const lab = { IV: 'IV', iv: 'iv', bVII: '♭VII', bVI: '♭VI', bIII: '♭III' }[kind];
          return { stimulus: [], tempo, display: { kind: 'text', text: `En ${KEY_LABEL[key]} majeur, l'accord de ${pcName(root)}${qual} (${lab}) ?` },
            choices: [choice('gamme', `De ${KEY_LABEL[key]} majeur`), choice('mineur', `Emprunté à ${KEY_LABEL[key]} mineur`), choice('autre', 'Une modulation')], answerId: kind === 'IV' ? 'gamme' : 'mineur' };
        }
        const cases = [
          { t: 'Un accord de la♭ majeur passe, puis tout revient se poser sur do.', a: 'emprunt' },
          { t: 'Fa mineur apparaît une mesure, et do reste la maison.', a: 'emprunt' },
          { t: 'Après un ré 7, la musique se pose sur sol et y reste : sol devient la maison.', a: 'modulation' },
          { t: 'Une cadence mi 7 → la mineur, puis toute la suite tourne autour de la.', a: 'modulation' },
        ];
        const c = pick(r, cases);
        return { stimulus: [], tempo, display: { kind: 'text', text: `En do majeur : ${c.t}` }, choices: [choice('emprunt', 'Emprunt'), choice('modulation', 'Modulation')], answerId: c.a };
      });
      return { ...v, prompt: 'D\'où vient cet accord ? La maison a-t-elle changé ?', expected: { kind: 'quiz', items },
        hint: 'iv, ♭VII, ♭VI et ♭III viennent du mineur de même tonique. Si la tonique reste la même, c\'est un emprunt ; si une nouvelle tonique s\'installe, c\'est une modulation.' };
    }
    case 'mode_parent': {
      // théorie des modes : le décalage (do majeur depuis une autre note), la gamme majeure parente, la formule, l'accord du mode
      const ORDER = ['ionien', 'dorien', 'phrygien', 'lydien', 'mixolydien', 'eolien', 'locrien'];
      const MAJ = [0, 2, 4, 5, 7, 9, 11];
      const NAME = ['do', 'ré♭', 'ré', 'mi♭', 'mi', 'fa', 'fa♯', 'sol', 'la♭', 'la', 'si♭', 'si'];
      const WHITE = ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'];
      const FORM: Record<string, string> = { ionien: 'T T ½ T T T ½', dorien: 'T ½ T T T ½ T', phrygien: '½ T T T ½ T T', lydien: 'T T T ½ T T ½', mixolydien: 'T T ½ T T ½ T', eolien: 'T ½ T T ½ T T', locrien: '½ T T ½ T T T' };
      const CHORD: Record<string, string> = { dorien: 'm6 · mineur avec 6', phrygien: 'm♭9 · mineur avec ♭2', lydien: 'maj7♯11 · majeur avec ♯4', mixolydien: '7 · la dominante', locrien: 'm7♭5 · demi-diminué' };
      const pool = (Array.isArray(p.modes) ? (p.modes as unknown as string[]) : ORDER).filter((x) => ORDER.includes(x));
      const kinds = Array.isArray(p.types) ? (p.types as unknown as string[]) : ['decalage', 'parent', 'formule', 'accord'];
      const short = (m: string) => MODES[m].label.split(' (')[0];
      const others = (m: string, list: string[]) => shuffle(r, list.filter((x) => x !== m)).slice(0, 3);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const m = pick(r, pool);
        const deg = ORDER.indexOf(m);
        let k = pick(r, kinds);
        if (k === 'accord' && !CHORD[m]) k = kinds.includes('parent') ? 'parent' : 'decalage';
        if (k === 'decalage') {
          // les choix ne portent que le nom du mode : la note de départ ne doit pas donner la réponse
          return { stimulus: [], tempo, display: { kind: 'text', text: `Touches blanches (les notes de do majeur), de ${WHITE[deg]} à ${WHITE[deg]}, avec ${WHITE[deg]} comme maison : quel mode ?` },
            choices: shuffle(r, [m, ...others(m, ORDER)]).map((x) => choice(x, short(x))), answerId: m };
        }
        if (k === 'parent') {
          const par = (x: string) => NAME[mod12(-MAJ[ORDER.indexOf(x)])];
          return { stimulus: [], tempo, display: { kind: 'text', text: `Do ${short(m).toLowerCase()} : ce sont les notes de quelle gamme majeure ?` },
            choices: shuffle(r, [m, ...others(m, ORDER)]).map((x) => choice(x, `${par(x)} majeur`)), answerId: m };
        }
        if (k === 'formule') {
          return { stimulus: [], tempo, display: { kind: 'text', text: `${FORM[m]} : quel mode ?` }, choices: shuffle(r, [m, ...others(m, ORDER)]).map((x) => choice(x, short(x))), answerId: m };
        }
        const withChord = Object.keys(CHORD);
        return { stimulus: [], tempo, display: { kind: 'text', text: `Quel accord fait le mieux entendre le ${short(m).toLowerCase()} ?` },
          choices: shuffle(r, [m, ...others(m, withChord)]).map((x) => choice(x, CHORD[x])), answerId: m };
      });
      return { ...v, prompt: 'D\'où vient ce mode ?', expected: { kind: 'quiz', items },
        hint: 'Compte le degré de départ dans do majeur : do 1 ionien, ré 2 dorien, mi 3 phrygien, fa 4 lydien, sol 5 mixolydien, la 6 éolien, si 7 locrien. Pour un mode sur do, cherche la gamme majeure dont do est ce degré : do dorien (2e degré) = si♭ majeur.' };
    }
    case 'progression_arpeggio_play': {
      // technique : arpège chaque accord d'un enchaînement avec emprunt (I – iv – I, I – ♭VII – I)
      const grid = pick(r, Array.isArray(p.grilles) ? (p.grilles as unknown as string[]) : ['I-iv-I', 'I-bVII-I']);
      const key = pick(r, Array.isArray(p.tonalites) ? (p.tonalites as unknown as string[]) : ['C', 'G']);
      const kt = resolveTonic({ tonalite: key }, ctx.instrument);
      const CH: Record<string, number[]> = { I: [0, 4, 7], IV: [5, 9, 12], iv: [5, 8, 12], bVII: [-2, 2, 5], bVI: [-4, 0, 3], V: [-5, -1, 2] };
      const chords = grid.split('-');
      const notes = chords.flatMap((c) => (CH[c] ?? CH.I).map((x) => kt + x)).map((m, i) => ({ midi: m, start: i, dur: 1 }));
      const lab = (c: string) => c.replace('b', '♭');
      return {
        ...v, tonic: kt, prompt: `En ${KEY_LABEL[key]} majeur, arpège chaque accord : fondamentale, tierce, quinte.`,
        display: { kind: 'text', text: chords.map(lab).join(' – ') }, answerUI: 'sequence',
        expected: { kind: 'sequence', notes, checkRhythm: false, octaveAgnostic: true },
        hint: chords.map((c) => `${lab(c)} : ${(CH[c] ?? CH.I).map((x) => pcName(kt + x)).join(' ')}`).join(' · '),
      };
    }
    // ---------- workout 0.20.0 : mapping, perroquet harmonique, routine technique ----------
    case 'name_play': {
      // mapping : l'appli nomme une note, tu la joues (aucun repère sur l'instrument)
      const NAT: [string, number][] = [['do', 0], ['ré', 2], ['mi', 4], ['fa', 5], ['sol', 7], ['la', 9], ['si', 11]];
      const pool: [string, number][] = bool(p.alterations, false) ? [...NAT, ['fa♯', 6], ['si♭', 10], ['do♯', 1], ['mi♭', 3], ['sol♯', 8]] : NAT;
      const n = num(p.nb_notes, 1);
      const chosen = shuffle(r, pool).slice(0, Math.min(n, pool.length));
      const base = ctx.instrument === 'guitare' ? 48 : 60;
      return {
        ...v, tonic: base, prompt: `Joue ${chosen.length === 1 ? 'la note affichée' : 'ces notes dans l\'ordre'}, à la hauteur que tu veux sur ${ctx.instrument === 'guitare' ? 'le manche' : 'le clavier'}.`,
        display: { kind: 'text', text: chosen.map((c) => c[0]).join('   ·   ') }, answerUI: 'sequence',
        expected: { kind: 'sequence', notes: chosen.map((c, i) => ({ midi: base + c[1], start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: true },
        hint: ctx.instrument === 'guitare' ? 'Pars d\'une corde à vide (mi, la, ré, sol, si) et compte les cases : une case = un demi-ton.' : 'Do est juste à gauche du groupe de 2 touches noires ; compte les touches blanches depuis do.',
      };
    }
    case 'bass_echo': {
      // perroquet harmonique : une grille joue, tu rejoues sa basse (la note la plus grave de chaque accord)
      const grids = Array.isArray(p.grilles) ? (p.grilles as unknown as string[]) : ['I-IV-V-I', 'I-vi-IV-V', 'I-V-vi-IV'];
      const grid = pick(r, grids);
      const DEG: Record<string, number> = { I: 1, ii: 2, iii: 3, IV: 4, V: 5, vi: 6 };
      const degs = grid.split('-').map((g) => DEG[g] ?? 1);
      const base = tonic >= 55 ? tonic - 12 : tonic;
      const stim = degs.flatMap((d, k) => [degreeToMidi(base, d) - 12, ...diatonicTriad(base, d)].map((m) => ({ midi: m, start: k * 2, dur: 1.9 })));
      return {
        ...v, prompt: `Écoute la grille de ${degs.length} accords, puis joue sa basse : la note la plus grave de chaque accord.`, stimulus: stim, stimulusKind: 'melody', referenceTonic: true,
        answerUI: 'sequence', expected: { kind: 'sequence', notes: degs.map((d, i) => ({ midi: degreeToMidi(tonic, d), start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: true },
        hint: 'Chante la basse de chaque accord, puis descends la gamme jusqu\'à 1 pour savoir quel degré c\'est. La grille commence sur I.',
      };
    }
    case 'one_string_scale': {
      // technique (guitare) : la gamme sur une seule corde, pour voir les tons et demi-tons comme des écarts de cases
      const STD = ctx.tuning ?? [40, 45, 50, 55, 59, 64];
      const SCALES: Record<string, string[]> = { majeure: ['1', '2', '3', '4', '5', '6', '7'], mineure: ['1', '2', 'b3', '4', '5', 'b6', 'b7'], penta_majeure: ['1', '2', '3', '5', '6'], penta_mineure: ['1', 'b3', '4', '5', 'b7'],
        ...Object.fromEntries(Object.entries(MODES).map(([k, m]) => [k, m.tokens])) };
      const FORMULA: Record<string, string> = { majeure: 'T T ½ T T T ½', mineure: 'T ½ T T ½ T T', penta_majeure: 'T T 1½ T 1½', penta_mineure: '1½ T T 1½ T',
        ionien: 'T T ½ T T T ½', dorien: 'T ½ T T T ½ T', phrygien: '½ T T T ½ T T', lydien: 'T T T ½ T T ½', mixolydien: 'T T ½ T T ½ T', eolien: 'T ½ T T ½ T T', locrien: '½ T T ½ T T T' };
      const g = String(p.gamme ?? 'majeure');
      const toks = SCALES[g] ?? SCALES.majeure;
      const rootPc = mod12(tonic);
      const strings = [1, 0, 2].map((sIdx) => ({ sIdx, fret: mod12(rootPc - STD[sIdx]) })).filter((x) => x.fret <= 7);
      const { sIdx, fret } = strings[0] ?? { sIdx: 1, fret: mod12(rootPc - STD[1]) };
      const root = STD[sIdx] + fret;
      const upM = [...toks.map((tk) => root + DEG_SEMI[tk]), root + 12];
      const upL = toks.concat(['1']).map((tk) => tk.replace('b', '♭'));
      const sens1 = String(p.sens ?? 'monter');
      const way = <T,>(xs: T[]): T[] => (sens1 === 'descendre' ? [...xs].reverse() : sens1 === 'aller_retour' ? [...xs, ...[...xs].reverse().slice(1)] : xs);
      const midis = way(upM);
      const NAMES_S = ['mi grave', 'la', 'ré', 'sol', 'si', 'mi aigu'];
      return {
        ...v, tonic: root, prompt: `Joue ${g.startsWith('penta') ? 'la pentatonique' : MODES[g] ? `le mode ${MODES[g].label.split(' (')[0].toLowerCase()}` : 'la gamme'} sur la seule corde de ${NAMES_S[sIdx]}, depuis la case ${fret} : ${FORMULA[g] ?? ''}${sens1 === 'descendre' ? ` (pars de l'octave, case ${fret + 12}, et descends)` : sens1 === 'aller_retour' ? ', puis redescends' : ''}.`,
        guide: { marks: [{ string: sIdx, fret, label: '1' }], zone: { strings: [sIdx, sIdx], frets: [fret, fret + 12] }, staffLabels: way(upL), text: 'Une case = un demi-ton, deux cases = un ton. Dis les degrés en jouant.' },
        answerUI: 'sequence', expected: { kind: 'sequence', notes: midis.map((m, i) => ({ midi: m, start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: false },
        hint: `Depuis le 1 (case ${fret}), avance de ${(FORMULA[g] ?? '').split(' ').map((x) => (x === 'T' ? 2 : x === '½' ? 1 : 3)).join(', ')} cases.`,
      };
    }
    case 'five_finger': {
      // technique (piano) : position de 5 doigts sur les degrés 1 à 5, sans déplacer la main
      const left = p.main === 'gauche';
      const minor = p.gamme === 'mineure' || p.gamme === 'penta_mineure';
      const semis = minor ? [0, 2, 3, 5, 7] : [0, 2, 4, 5, 7];
      const root = (left ? 48 : 60) + mod12(tonic);
      const up = semis.map((x) => root + x);
      const midis = [...up, ...[...up].reverse().slice(1)];
      const fUp = left ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5];
      const fingers = [...fUp, ...[...fUp].reverse().slice(1)];
      return {
        ...v, tonic: root, prompt: `Position de 5 doigts, main ${left ? 'gauche' : 'droite'} : monte de 1 à 5 puis redescends, un doigt par touche, sans bouger la main.`,
        guide: { marks: [], staffLabels: fingers.map(String), text: `Les chiffres sont les doigts de la main ${left ? 'gauche (5 = auriculaire, sur le 1)' : 'droite (1 = pouce, sur le 1)'}.` },
        answerUI: 'sequence', expected: { kind: 'sequence', notes: midis.map((m, i) => ({ midi: m, start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: false },
        hint: 'Pose les cinq doigts avant de commencer : chacun reste au-dessus de sa touche.',
      };
    }
    case 'hands_together': {
      // technique (piano, au vrai piano) : mains ensemble ; l'appli écoute que tu joues, sans pouvoir séparer les deux mains
      const contrary = p.mouvement !== 'parallele';
      const root = 60 + mod12(tonic);
      const tmp = num(p.tempo, 60);
      return {
        ...v, tempo: tmp, prompt: contrary
          ? `Mains ensemble, en miroir : les deux pouces sur le même ${pcName(root)}, la main droite monte, la gauche descend, une octave, puis retour.`
          : `Mains ensemble, côte à côte : la gauche une octave sous la droite, les deux montent puis redescendent la gamme de ${pcName(root)}.`,
        display: { kind: 'text', text: contrary ? 'Main droite : 1 2 3 · 1 2 3 4 5\nMain gauche : 1 2 3 · 1 2 3 4 5\n(mêmes doigts en même temps)' : 'Main droite : 1 2 3 · 1 2 3 4 5\nMain gauche : 5 4 3 2 1 · 3 2 1' },
        answerUI: 'free', captureMs: beatsToMs(16, tmp) + 1500, clickDuringCapture: true, countInBeats: 4, expected: { kind: 'free' },
        hint: contrary ? 'En miroir, les deux mains utilisent les mêmes doigts au même moment : c\'est plus facile qu\'en parallèle.' : 'Ralentis : le passage du pouce des deux mains ne tombe pas au même moment.',
      };
    }
    // ---------- leçons approfondies · palier 2 ----------
    case 'triad_theory': {
      // un accord = des tierces empilées : compléter, compter, construire sur un degré, majeur ou mineur
      const lvl = num(p.niveau_q, 0);
      const NAT = ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si'];
      const NATPC = [0, 2, 4, 5, 7, 9, 11];
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const kind = randInt(r, 0, lvl >= 1 ? 3 : 1);
        if (kind === 0) {
          const k = pick(r, MAJOR_KEYS.filter((x) => Math.abs(x.sig) <= (lvl >= 1 ? 3 : 1)));
          const nm = (semi: number) => nameInKey(k.pc + semi, k.sig);
          const ans = nm(7);
          const opts = shuffle(r, [...new Set([ans, nm(5), nm(9), nm(8)])].slice(0, 4));
          return { stimulus: [], tempo, display: { kind: 'text', text: `Accord de ${k.name} majeur :\n${k.name} · ${nm(4)} · ?` }, choices: opts.map((x) => choice(x, x)), answerId: ans };
        }
        if (kind === 1) {
          const i = randInt(r, 0, 6);
          const semis = mod12(NATPC[(i + 2) % 7] - NATPC[i]);
          return { stimulus: [], tempo, display: { kind: 'text', text: `${NAT[i]} → ${NAT[(i + 2) % 7]} : tierce majeure ou mineure ?` },
            choices: [choice('M', 'Tierce majeure (2 tons)'), choice('m', 'Tierce mineure (1 ton ½)')], answerId: semis === 4 ? 'M' : 'm' };
        }
        if (kind === 2) {
          const key = pick(r, ['C', 'G', 'F']);
          const d = pick(r, [1, 4, 5]);
          const tri = (a: number, b: number, c: number) => [a, b, c].map((x) => degreeNoteName(key, x)).join(' ');
          const ans = tri(d, d + 2, d + 4);
          const other = d === 1 ? 4 : 1;
          const opts = shuffle(r, [ans, tri(d, d + 1, d + 2), tri(d, d + 2, d + 5), tri(other, other + 2, other + 4)]);
          return { stimulus: [], tempo, display: { kind: 'text', text: `En ${KEY_LABEL[key]} majeur, l'accord du degré ${ROMAN[d]} ?` }, choices: opts.map((x) => choice(x, x)), answerId: ans };
        }
        const d = pick(r, [1, 2, 3, 4, 5, 6]);
        const names = [d, d + 2, d + 4].map((x) => NAT[(x - 1) % 7]).join(' · ');
        return { stimulus: [], tempo, display: { kind: 'text', text: `${names} : accord majeur ou mineur ?` }, choices: [choice('maj', 'Majeur'), choice('min', 'Mineur')], answerId: [1, 4, 5].includes(d) ? 'maj' : 'min' };
      });
      return { ...v, prompt: 'Les accords, des tierces empilées : réponds à la question.', expected: { kind: 'quiz', items },
        hint: 'Une note sur deux dans la gamme. Tierce majeure = 4 demi-tons (2 tons), mineure = 3 (1 ton ½). Majeur : la grande tierce en bas.' };
    }
    case 'key_sig_identify': {
      // armure → tonalité, ou tonalité → armure (jusqu'à `max` altérations)
      const max = num(p.max, 3);
      const sens = String(p.sens ?? 'mixte');
      const keys = MAJOR_KEYS.filter((k) => Math.abs(k.sig) <= max);
      const sigLabel = (sig: number) => (sig === 0 ? 'Aucune altération' : `${Math.abs(sig)} ${sig > 0 ? '♯' : '♭'} (${(sig > 0 ? SHARP_NAMES : FLAT_NAMES).slice(0, Math.abs(sig)).map((x) => x.replace(/[♯♭]/, '')).join(', ')})`);
      let prev = 99;
      const items: QuizItem[] = Array.from({ length: nQ }, (_, i) => {
        let k = pick(r, keys.filter((x) => x.sig !== 0 && x.sig !== prev));
        if (i > 0 && r() < 0.08) k = keys.find((x) => x.sig === 0)!; // do majeur (aucune altération), jamais en première question
        prev = k.sig;
        const toKey = sens === 'armure_vers_ton' || (sens === 'mixte' && i % 2 === 0);
        if (toKey) {
          const others = shuffle(r, keys.filter((x) => x.sig !== k.sig)).slice(0, 3);
          // distracteur classique : la note du dernier dièse elle-même (fa♯ → sol, pas fa♯)
          return { stimulus: [], tempo, display: { kind: 'staff', midis: [], keySig: k.sig },
            choices: shuffle(r, [k, ...others]).map((x) => choice(x.name, `${x.name.charAt(0).toUpperCase()}${x.name.slice(1)} majeur`)), answerId: k.name };
        }
        const near = shuffle(r, keys.filter((x) => x.sig !== k.sig && Math.abs(x.sig - k.sig) <= 2 || x.sig === -k.sig)).filter((x) => x.sig !== k.sig);
        const opts = [...new Set([k.sig, -k.sig, ...near.map((x) => x.sig)])].slice(0, 4);
        return { stimulus: [], tempo, display: { kind: 'text', text: `${k.name.charAt(0).toUpperCase()}${k.name.slice(1)} majeur : quelle armure ?` },
          choices: shuffle(r, opts).map((x) => choice(String(x), sigLabel(x))), answerId: String(k.sig) };
      });
      return { ...v, prompt: sens === 'ton_vers_armure' ? 'Quelle armure pour cette tonalité ?' : sens === 'armure_vers_ton' ? 'Quelle tonalité majeure pour cette armure ?' : 'Armures et tonalités majeures.', expected: { kind: 'quiz', items },
        hint: 'Dièses : la tonique est un demi-ton au-dessus du dernier dièse. Bémols : c\'est l\'avant-dernier bémol (avec un seul bémol : fa).' };
    }
    case 'key_sig_listen': {
      // l'œil et l'oreille : la mélodie jouée respecte-t-elle l'armure écrite ?
      const sigs = nums(p.armures, [1, -1, 2]);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const k = keyBySig(pick(r, sigs));
        const kt = 60 + mod12(k.pc);
        const base = kt > 65 ? kt - 12 : kt;
        const alt = alteredLetters(k.sig);
        const isAlt = (m: number) => alt.includes(mod12(m - Math.sign(k.sig)));
        const mel = makeMelody(r, base, [1, 2, 3, 4, 5, 6, 7, 8], 6, { conjoint: true });
        let midis = mel.notes.map((n) => n.midi);
        if (!midis.some(isAlt)) {
          const target = [1, 2, 3, 4, 5, 6, 7].find((d) => isAlt(degreeToMidi(base, d)))!;
          const kk = randInt(r, 1, 4);
          midis = midis.map((m, i) => (i === kk ? degreeToMidi(base, target) : m));
        }
        const wrong = r() < 0.5;
        const idx = midis.map((m, i) => (isAlt(m) ? i : -1)).filter((i) => i >= 0);
        const bad = wrong ? pick(r, idx) : -1;
        const played = midis.map((m, i) => (i === bad ? m - Math.sign(k.sig) : m));
        return { stimulus: played.map((m, i) => ({ midi: m, start: i * 0.75, dur: 0.7 })), tempo: 84, referenceTonic: true, tonic: base,
          display: { kind: 'staff', midis, keySig: k.sig },
          choices: [choice('ok', 'Conforme à la partition'), choice('faux', 'Une note oublie l\'armure')], answerId: wrong ? 'faux' : 'ok' };
      });
      return { ...v, prompt: 'Lis la partition pendant l\'écoute : la mélodie jouée respecte-t-elle l\'armure ?', expected: { kind: 'quiz', items },
        hint: 'Repère d\'abord les notes touchées par l\'armure (avec un ♯ : un demi-ton plus haut). Si l\'une d\'elles sonne « tombée », c\'est la fausse.' };
    }
    case 'key_sig_scale': {
      // joue la gamme majeure que désigne l'armure
      const k = keyBySig(pick(r, nums(p.armures, [1, 2, -1, -2])));
      const kt = ctx.instrument === 'guitare' ? 40 + mod12(k.pc - 40) : 60 + mod12(k.pc);
      const midis = [0, 2, 4, 5, 7, 9, 11, 12].map((x) => kt + x);
      return { ...v, tonic: kt, prompt: 'Quelle tonalité annonce cette armure ? Joue sa gamme majeure en montant, de la tonique à la tonique (8 notes).',
        display: { kind: 'staff', midis: [], keySig: k.sig }, answerUI: 'sequence',
        expected: { kind: 'sequence', notes: midis.map((m, i) => ({ midi: m, start: i, dur: 1 })), checkRhythm: false, octaveAgnostic: true },
        hint: k.sig > 0 ? 'Le dernier dièse + un demi-ton = la tonique. Puis T T ½ T T T ½.' : k.sig === -1 ? 'Un seul bémol : fa majeur. Puis T T ½ T T T ½.' : 'L\'avant-dernier bémol est la tonique. Puis T T ½ T T T ½.' };
    }
    case 'stable_or_not': {
      const pool = nums(p.degres, [1, 2, 3, 4, 5]);
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const d = pick(r, pool);
        return { stimulus: [{ midi: degreeToMidi(tonic, d), start: 0, dur: 2 }], tempo: 70, referenceTonic: true,
          choices: [choice('stable', 'Stable, on peut s\'y poser'), choice('instable', 'Instable, ça veut bouger')], answerId: [1, 3, 5, 8].includes(d) ? 'stable' : 'instable' };
      });
      return { ...v, drone: bool(p.bourdon, true) ? droneFor(tonic) : null, prompt: 'Après la cadence, cette note est-elle stable ou instable ?', expected: { kind: 'quiz', items },
        hint: 'Imagine que la musique s\'arrête sur cette note : est-ce une fin, ou une virgule qui attend la suite ?' };
    }
    case 'sing_resolution': {
      const TEND: Record<number, number> = { 2: 1, 4: 3, 7: 8, 6: 5 };
      const d = pick(r, nums(p.tensions, [2, 7]));
      const tense = degreeToMidi(tonic, d) - (d === 7 ? 12 : 0);
      const target = degreeToMidi(tonic, TEND[d]) - (d === 7 ? 12 : 0);
      return { ...v, drone: bool(p.bourdon, true) ? droneFor(tonic) : null, prompt: 'Après la cadence, une note instable : chante la note où elle veut aller.', stimulus: [{ midi: tense, start: 0, dur: 1.8 }], stimulusKind: 'melody', referenceTonic: true,
        answerUI: 'sing', expected: { kind: 'sequence', notes: [{ midi: target, start: 0, dur: 1.5 }], checkRhythm: false, octaveAgnostic: true },
        hint: 'Ne réfléchis pas : laisse ta voix glisser vers la note la plus proche qui « repose ».' };
    }
    case 'downbeat_tap': {
      // le clic bat tous les temps ; tu ne tapes QUE le 1er temps de chaque mesure
      const perBar = num(p.mesure, 4);
      const bars = num(p.mesures, 4);
      return { ...v, perBar, prompt: `Le clic compte ${perBar} temps par mesure : tape seulement sur le 1er (le temps fort, plus aigu).`,
        stimulus: [], stimulusKind: 'none', simultaneous: true, countInBeats: perBar, clickDuringCapture: true, answerUI: 'tap',
        captureMs: beatsToMs(bars * perBar, tempo) + 400,
        expected: { kind: 'rhythm', onsetsBeats: Array.from({ length: bars }, (_, k) => k * perBar), absolute: true },
        hint: `Compte à voix basse « ${Array.from({ length: perBar }, (_, k) => k + 1).join(' ')} » et tape sur le « 1 ».` };
    }
    case 'binary_ternary': {
      const items: QuizItem[] = Array.from({ length: nQ }, () => {
        const tern = r() < 0.5;
        const sub = tern ? [0, 1 / 3, 2 / 3] : [0, 0.5];
        const notes = Array.from({ length: 4 }, (_, b) => sub.map((o) => ({ midi: b % 2 ? 74 : 72, start: b + o, dur: 0.25 }))).flat();
        return { stimulus: notes, tempo: 84, choices: [choice('binaire', 'Binaire · 1-et 2-et'), choice('ternaire', 'Ternaire · 1-tri-o')], answerId: tern ? 'ternaire' : 'binaire' };
      });
      return { ...v, prompt: 'Chaque temps est-il divisé en deux (binaire) ou en trois (ternaire) ?', expected: { kind: 'quiz', items },
        hint: 'Dis « 1-et 2-et » puis « 1-tri-o 2-tri-o » par-dessus : lequel colle ?' };
    }
    case 'build_interval': {
      const ecart = num(p.demi_tons, 4);
      const nom = String(p.nom ?? 'tierce majeure');
      const root = pick(r, [60, 62, 65, 67, 69]);
      return {
        ...v, prompt: `Construis une ${nom} au-dessus de ${pcName(root)}.`, answerUI: 'select',
        expected: { kind: 'set', midis: [root, root + ecart], octaveAgnostic: false },
        hint: `Compte ${ecart} demi-tons en montant, touches noires comprises.`,
      };
    }
  }
}
