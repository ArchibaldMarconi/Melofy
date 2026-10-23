// Utilitaires musicaux : degrés relatifs (do mobile), MIDI, fréquences, noms de notes.
import type { DegreeItem, Instrument, Params } from '../content/types';

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const KEY_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES_FR = ['do', 'do♯', 'ré', 'mi♭', 'mi', 'fa', 'fa♯', 'sol', 'la♭', 'la', 'si♭', 'si'];

export const mod12 = (n: number) => ((Math.round(n) % 12) + 12) % 12;

/** degré 1..7 (8 = octave au-dessus, 0 = 7 en dessous) → demi-tons depuis la tonique */
export function degreeToSemitone(degree: number, acc = 0): number {
  const idx = degree - 1;
  const oct = Math.floor(idx / 7);
  const d = ((idx % 7) + 7) % 7;
  return MAJOR[d] + 12 * oct + acc;
}

export const degreeToMidi = (tonic: number, degree: number, acc = 0) => tonic + degreeToSemitone(degree, acc);

/** MIDI → degré relatif (dans l'octave), avec altération si hors gamme majeure */
export function midiToDegree(tonic: number, midi: number): { degree: number; acc: -1 | 0 | 1 } {
  const st = mod12(midi - tonic);
  const exact = MAJOR.indexOf(st);
  if (exact >= 0) return { degree: exact + 1, acc: 0 };
  if (st === 6) return { degree: 4, acc: 1 }; // #4
  const up = MAJOR.indexOf(st + 1); // b2, b3, b6, b7
  return { degree: up + 1, acc: -1 };
}

export function degreeLabel(d: { degree: number; acc: number }): string {
  const deg = ((((d.degree - 1) % 7) + 7) % 7) + 1;
  return `${d.acc === -1 ? 'b' : d.acc === 1 ? '#' : ''}${deg}`;
}

export const midiDegreeLabel = (tonic: number, midi: number) => degreeLabel(midiToDegree(tonic, midi));

export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const freqToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);
export const noteName = (midi: number) => `${NAMES_FR[mod12(midi)]}${Math.floor(Math.round(midi) / 12) - 1}`;
export const pcName = (midi: number) => NAMES_FR[mod12(midi)];
export const beatsToMs = (beats: number, tempo: number) => (beats * 60000) / tempo;

/**
 * Tonique selon le paramètre `tonalite` et l'instrument.
 * 'auto' : do au piano (do4 = 60), la à la guitare (la2 = 45, corde à vide), comme au palier 1.
 */
export function resolveTonic(p: Params, instrument: Instrument, voice = false): number {
  const key = String(p.tonalite ?? 'auto');
  const pc = key === 'auto' ? (instrument === 'guitare' ? 9 : 0) : KEY_PC[key] ?? 0;
  const base = voice ? 55 : instrument === 'guitare' ? 45 : 60;
  let m = base;
  while (mod12(m) !== pc) m++;
  return m;
}

/**
 * Contexte tonal joué avant un exercice d'oreille : une cadence I-IV-V-I (basse + accord),
 * qui installe la tonalité bien plus solidement qu'une tonique ou un arpège seuls.
 */
export function referenceEvents(tonic: number): { midi: number; start: number; dur: number }[] {
  const base = tonic >= 55 ? tonic - 12 : tonic; // accords sous la mélodie
  const chords: [number, number[]][] = [[1, [0, 4, 7]], [4, [5, 9, 12]], [5, [7, 11, 14]], [1, [0, 4, 7]]];
  return chords.flatMap(([deg, notes], i) => [
    { midi: base + degreeToSemitone(deg) - 12, start: i, dur: i === 3 ? 1.6 : 0.95 }, // basse
    ...notes.map((n) => ({ midi: base + n, start: i, dur: i === 3 ? 1.6 : 0.95 })),
  ]);
}
export const REFERENCE_TEMPO = 100;
export const REFERENCE_BEATS = 4.6;

/** Tonalités utilisées quand un exercice d'oreille fait varier la tonique */
export const VARIED_KEYS = ['C', 'D', 'E', 'F', 'G', 'A'];

export function degreeItemsFromNotes(tonic: number, notes: { midi: number; dur: number }[]): DegreeItem[] {
  return notes.map((n) => {
    const d = midiToDegree(tonic, n.midi);
    const octave = Math.floor((n.midi - tonic) / 12);
    return { degree: d.degree + 7 * octave, acc: d.acc, dur: n.dur };
  });
}

// ---------- accords et gammes (palier 2) ----------
export const ROMAN: Record<number, string> = { 1: 'I', 2: 'ii', 3: 'iii', 4: 'IV', 5: 'V', 6: 'vi', 7: 'vii°' };

/** accord diatonique (3 sons) sur un degré de la gamme majeure, à partir de la tonique */
export function diatonicTriad(tonic: number, degree: number): number[] {
  return [degree, degree + 2, degree + 4].map((d) => degreeToMidi(tonic, d));
}

export function triad(root: number, quality: 'majeur' | 'mineur'): number[] {
  return [root, root + (quality === 'majeur' ? 4 : 3), root + 7];
}

/** ton (2 demi-tons) ou demi-ton entre le degré d et d+1 de la gamme majeure */
export const stepAfter = (d: number) => (degreeToSemitone(d + 1) - degreeToSemitone(d) === 2 ? 'ton' : 'demi-ton');

export const KEY_LABEL: Record<string, string> = { C: 'do', D: 'ré', E: 'mi', F: 'fa', G: 'sol', A: 'la', B: 'si' };

/** nom (sans octave) du degré d dans la tonalité donnée */
export const degreeNoteName = (key: string, d: number) => pcName((KEY_PC[key] ?? 0) + degreeToSemitone(d));

/** accords ouverts de guitare (MIDI, corde grave → aiguë), cordes non jouées omises */
export const GUITAR_OPEN: Record<string, number[]> = {
  C: [48, 52, 55, 60, 64], G: [43, 47, 50, 55, 59, 67], D: [50, 57, 62, 66], A: [45, 52, 57, 61, 64], E: [40, 47, 52, 56, 59, 64],
  F: [41, 48, 53, 57, 60, 65],
};

/**
 * Voicing du bourdon : tonique, quinte et octave (1-5-8), dans un registre que le téléphone restitue.
 * Piano (tonique do4) : do3-sol3-do4. Guitare (tonique la2) : la2-mi3-la3.
 */
const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];
export const isNatural = (midi: number) => NATURAL_PCS.includes(mod12(midi));
/** notes naturelles (touches blanches) entre deux MIDI inclus */
export const naturalsBetween = (lo: number, hi: number) => { const r: number[] = []; for (let m = lo; m <= hi; m++) if (isNatural(m)) r.push(m); return r; };
/** position sur la portée en clé de sol : 0 = 1re ligne (mi4), 1 = 1er interligne (fa4)… (notes naturelles) */
export function staffStep(midi: number): number {
  const letter = NATURAL_PCS.indexOf(mod12(midi));
  const octave = Math.floor(Math.round(midi) / 12) - 1;
  return letter + 7 * octave - (2 + 7 * 4);
}

/** Écriture d'une note quelconque sur la portée (clé de sol) : position + dièse éventuel (orthographe en dièses). */
export function spellOnStaff(midi: number, clef: 'sol' | 'fa' = 'sol'): { step: number; sharp: boolean } {
  const m = Math.round(midi);
  const shift = clef === 'fa' ? 12 : 0; // clé de fa : ligne du bas = sol2, 12 pas sous le mi4 de la clé de sol
  return isNatural(m) ? { step: staffStep(m) + shift, sharp: false } : { step: staffStep(m - 1) + shift, sharp: true };
}

/** inverse de staffStep : position sur la portée → note naturelle */
export function stepToMidi(step: number): number {
  const diat = step + 30;
  const letter = ((diat % 7) + 7) % 7;
  const octave = Math.floor(diat / 7);
  return (octave + 1) * 12 + NATURAL_PCS[letter];
}

/**
 * Position en tablature d'une note écrite en clé de sol (la guitare sonne une octave sous l'écrit).
 * Corde 0 = mi aigu (ligne du haut). 1re position : la corde la plus aiguë où la case est entre 0 et 4.
 */
export function tabPosition(written: number): { string: number; fret: number } {
  const OPEN = [64, 59, 55, 50, 45, 40];
  const m = written - 12;
  const cands = OPEN.map((o, s) => ({ string: s, fret: m - o })).filter((x) => x.fret >= 0);
  return cands.find((x) => x.fret <= 4) ?? [...cands].sort((a, b) => a.fret - b.fret)[0] ?? { string: 5, fret: Math.max(0, m - 40) };
}

export function droneFor(tonic: number): number[] {
  const base = tonic >= 55 ? tonic - 12 : tonic;
  return [base, base + 7, base + 12];
}

// ---------- armure (leçon 8) ----------
/** lettres altérées, dans l'ordre : dièses fa do sol ré la mi si ; bémols si mi la ré sol do fa (hauteurs naturelles) */
export const SHARP_ORDER = [5, 0, 7, 2, 9, 4, 11];
export const FLAT_ORDER = [11, 4, 9, 2, 7, 0, 5];
export const SHARP_NAMES = ['fa♯', 'do♯', 'sol♯', 'ré♯', 'la♯', 'mi♯', 'si♯'];
export const FLAT_NAMES = ['si♭', 'mi♭', 'la♭', 'ré♭', 'sol♭', 'do♭', 'fa♭'];
/** place de chaque altération de l'armure sur la portée (0 = 1re ligne) */
export const KEYSIG_STEPS = { sol: { sharp: [8, 5, 9, 6, 3, 7, 4], flat: [4, 7, 3, 6, 2, 5, 1] }, fa: { sharp: [6, 3, 7, 4, 1, 5, 2], flat: [2, 5, 1, 4, 0, 3, -1] } };
/** tonalités majeures et leur armure (+ dièses, − bémols) */
export const MAJOR_KEYS: { name: string; pc: number; sig: number }[] = [
  { name: 'do', pc: 0, sig: 0 }, { name: 'sol', pc: 7, sig: 1 }, { name: 'ré', pc: 2, sig: 2 }, { name: 'la', pc: 9, sig: 3 }, { name: 'mi', pc: 4, sig: 4 }, { name: 'si', pc: 11, sig: 5 },
  { name: 'fa', pc: 5, sig: -1 }, { name: 'si♭', pc: 10, sig: -2 }, { name: 'mi♭', pc: 3, sig: -3 }, { name: 'la♭', pc: 8, sig: -4 }, { name: 'ré♭', pc: 1, sig: -5 },
];
export const keyBySig = (sig: number) => MAJOR_KEYS.find((k) => k.sig === sig)!;
/** les hauteurs naturelles altérées par une armure */
export const alteredLetters = (sig: number) => (sig > 0 ? SHARP_ORDER.slice(0, sig) : FLAT_ORDER.slice(0, -sig));
/** applique l'armure à une note naturelle écrite (fa → fa♯ en sol majeur) */
export const applyKeySig = (natural: number, sig: number) => (alteredLetters(sig).includes(mod12(natural)) ? natural + (sig > 0 ? 1 : -1) : natural);
/** nom d'une note dans une tonalité donnée (fa♯ en ré, si♭ en fa) */
export function nameInKey(midi: number, sig: number): string {
  const pc = mod12(midi);
  if (sig > 0 && alteredLetters(sig).includes(mod12(pc - 1))) return `${pcName(pc - 1)}♯`;
  if (sig < 0 && alteredLetters(sig).includes(mod12(pc + 1))) return `${pcName(pc + 1)}♭`;
  return pcName(pc);
}
/**
 * Écriture d'une note sur une portée qui porte une armure : position, et accident à dessiner
 * (aucun si l'armure s'en charge ; ♮ si la note naturelle contredit l'armure).
 */
export function spellWithKey(midi: number, sig: number, clef: 'sol' | 'fa' = 'sol'): { step: number; acc: '♯' | '♭' | '♮' | null } {
  const m = Math.round(midi);
  const shift = clef === 'fa' ? 12 : 0;
  const alt = alteredLetters(sig);
  if (sig > 0 && !isNatural(m) && alt.includes(mod12(m - 1))) return { step: staffStep(m - 1) + shift, acc: null };
  if (sig < 0 && !isNatural(m) && alt.includes(mod12(m + 1))) return { step: staffStep(m + 1) + shift, acc: null };
  if (isNatural(m)) return { step: staffStep(m) + shift, acc: alt.includes(mod12(m)) ? '♮' : null };
  return sig < 0 ? { step: staffStep(m + 1) + shift, acc: '♭' } : { step: staffStep(m - 1) + shift, acc: '♯' };
}
