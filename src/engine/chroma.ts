// Degrés chromatiques (palier 3 et suivants) : 1, b2, 2, b3, 3, 4, #4, 5, b6, 6, b7, 7.
// Une même notation pour le mineur, les couleurs empruntées, puis les modes : chaque degré se lit
// par rapport à la tonique et à la gamme majeure, comme le font Use Your Ear et Tom Quayle.
import type { DegreeItem, NoteEvent } from '../content/types';
import { pick, type Rng } from './rng';

export const DEG_SEMI: Record<string, number> = {
  '1': 0, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5, '#4': 6, 'b5': 6, '5': 7, '#5': 8, 'b6': 8, '6': 9, 'b7': 10, '7': 11, '8': 12,
};
export const MAJOR = ['1', '2', '3', '4', '5', '6', '7'];
export const MINOR = ['1', '2', 'b3', '4', '5', 'b6', 'b7'];
export const MINOR_PENTA = ['1', 'b3', '4', '5', 'b7'];
export const BLUES = ['1', 'b3', '4', '#4', '5', 'b7'];

/** affichage : b3 → ♭3, #4 → ♯4 */
export const tokLabel = (tok: string) => tok.replace('b', '♭').replace('#', '♯');
export const tokMidi = (tonic: number, tok: string) => tonic + DEG_SEMI[tok];
/** degré chromatique → élément du pavé de degrés (chiffre + altération) */
export function tokToItem(tok: string, dur = 1): DegreeItem {
  return { degree: Number(tok.replace(/[b#]/g, '')), acc: tok.startsWith('b') ? -1 : tok.startsWith('#') ? 1 : 0, dur };
}

/** Mélodie sur un ensemble de degrés : part de 1, avance par voisins dans l'ordre de l'ensemble (conjointe), finit souvent sur 1. */
export function tokenMelody(r: Rng, tonic: number, pool: string[], n: number, opts: { conjoint?: boolean; endOnTonic?: boolean; rhythm?: boolean } = {}): { notes: NoteEvent[]; tokens: string[] } {
  const order = [...pool].sort((a, b) => DEG_SEMI[a] - DEG_SEMI[b]);
  let i = 0;
  const tokens: string[] = ['1'];
  for (let k = 1; k < n; k++) {
    if (opts.conjoint !== false) i = Math.max(0, Math.min(order.length - 1, i + pick(r, [-1, 1, 1, -1, 2, -2].filter((s) => i + s >= 0 && i + s < order.length) || [1])));
    else i = Math.floor(r() * order.length);
    tokens.push(order[i]);
  }
  if (opts.endOnTonic && n > 2) tokens[n - 1] = '1';
  let t = 0;
  const notes = tokens.map((tok) => {
    const dur = opts.rhythm ? pick(r, [0.5, 0.5, 1, 1, 1.5]) : 1;
    const ev = { midi: tokMidi(tonic, tok), start: t, dur: dur * 0.95 };
    t += dur;
    return ev;
  });
  return { notes, tokens };
}

/** Cadence mineure i - iv - V - i (mineur harmonique : V majeur, pour une vraie attraction vers la tonique). */
export function minorReference(tonic: number): NoteEvent[] {
  const base = tonic >= 55 ? tonic - 12 : tonic;
  const chords: [number, number[]][] = [[0, [0, 3, 7]], [5, [5, 8, 12]], [7, [7, 11, 14]], [0, [0, 3, 7]]];
  return chords.flatMap(([bass, notes], i) => [
    { midi: base + bass - 12, start: i, dur: i === 3 ? 1.6 : 0.95 },
    ...notes.map((n) => ({ midi: base + n, start: i, dur: i === 3 ? 1.6 : 0.95 })),
  ]);
}

/** Les 4 triades, éventuellement renversées. */
export const TRIAD_SEMI: Record<string, number[]> = { majeur: [0, 4, 7], mineur: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };
export const TRIAD_LABEL: Record<string, string> = { majeur: 'Majeur', mineur: 'Mineur', dim: 'Diminué', aug: 'Augmenté' };
export function triadOf(root: number, quality: string, inversion = 0): number[] {
  const notes = TRIAD_SEMI[quality].map((s) => root + s);
  for (let k = 0; k < inversion; k++) notes.push(notes.shift()! + 12);
  return notes;
}

/** Chiffrage des accords de la gamme majeure */
export const DIATONIC_ROMAN: Record<number, string> = { 1: 'I', 2: 'ii', 3: 'iii', 4: 'IV', 5: 'V', 6: 'vi', 7: 'vii°' };
export const DIATONIC_QUALITY: Record<number, string> = { 1: 'majeur', 2: 'mineur', 3: 'mineur', 4: 'majeur', 5: 'majeur', 6: 'mineur', 7: 'dim' };

/** Intervalles (demi-tons → nom) */
export const INTERVAL_LABEL: Record<number, string> = {
  1: 'Seconde mineure', 2: 'Seconde majeure', 3: 'Tierce mineure', 4: 'Tierce majeure', 5: 'Quarte', 6: 'Triton',
  7: 'Quinte', 8: 'Sixte mineure', 9: 'Sixte majeure', 10: 'Septième mineure', 11: 'Septième majeure', 12: 'Octave',
};

// ---------- Palier 4 : accords de 7e, cadences, ii-V-I ----------
export const SEVENTH_SEMI: Record<string, number[]> = { maj7: [0, 4, 7, 11], dom7: [0, 4, 7, 10], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10] };
export const SEVENTH_LABEL: Record<string, string> = { maj7: 'Majeur 7 (maj7)', dom7: 'Dominante (7)', m7: 'Mineur 7 (m7)', m7b5: 'Demi-diminué (m7♭5)' };
export const SEVENTH_SHORT: Record<string, string> = { maj7: 'maj7', dom7: '7', m7: 'm7', m7b5: 'm7♭5' };
const MAJ_SCALE = [0, 2, 4, 5, 7, 9, 11];
/** note du degré k (1 = tonique, 8 = octave, 9…) de la gamme majeure */
export const scaleNote = (base: number, k: number) => base + MAJ_SCALE[(k - 1) % 7] + 12 * Math.floor((k - 1) / 7);
/** accord de 7e construit sur le degré d de la gamme (empilement de tierces dans la gamme) */
export const diatonicSeventh = (base: number, d: number) => [0, 2, 4, 6].map((k) => scaleNote(base, d + k));
export const DIATONIC7_QUALITY: Record<number, string> = { 1: 'maj7', 2: 'm7', 3: 'm7', 4: 'maj7', 5: 'dom7', 6: 'm7', 7: 'm7b5' };
export const DIATONIC7_ROMAN: Record<number, string> = { 1: 'Imaj7', 2: 'ii7', 3: 'iii7', 4: 'IVmaj7', 5: 'V7', 6: 'vi7', 7: 'viiø7' };
/** nom français d'un accord : « ré m7 », « sol 7 », « do maj7 » */
export const chordName = (rootName: string, quality: string) => `${rootName}${quality === 'dom7' ? ' 7' : ` ${SEVENTH_SHORT[quality] ?? quality}`}`;

export const CADENCES: Record<string, { label: string; pair: [number, number] }> = {
  parfaite: { label: 'Parfaite (V → I)', pair: [5, 1] },
  plagale: { label: 'Plagale (IV → I)', pair: [4, 1] },
  rompue: { label: 'Rompue (V → vi)', pair: [5, 6] },
  demi: { label: 'Demi-cadence (→ V)', pair: [2, 5] },
};

// ---------- Palier 5 : modes et emprunts ----------
export const MODES: Record<string, { label: string; tokens: string[]; char: string; color: string }> = {
  ionien: { label: 'Ionien (majeur)', tokens: ['1', '2', '3', '4', '5', '6', '7'], char: '7', color: 'lumineux, la sensible tire vers 1' },
  dorien: { label: 'Dorien', tokens: ['1', '2', 'b3', '4', '5', '6', 'b7'], char: '6', color: 'mineur, mais éclairé par le 6 naturel' },
  phrygien: { label: 'Phrygien', tokens: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'], char: 'b2', color: 'sombre, espagnol, le ♭2 colle à la tonique' },
  lydien: { label: 'Lydien', tokens: ['1', '2', '3', '#4', '5', '6', '7'], char: '#4', color: 'flottant, rêveur, le ♯4 décolle' },
  mixolydien: { label: 'Mixolydien', tokens: ['1', '2', '3', '4', '5', '6', 'b7'], char: 'b7', color: 'majeur mais « rock », sans sensible' },
  eolien: { label: 'Éolien (mineur)', tokens: ['1', '2', 'b3', '4', '5', 'b6', 'b7'], char: 'b6', color: 'mineur, mélancolique, le ♭6 pèse' },
  locrien: { label: 'Locrien', tokens: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'], char: 'b5', color: 'instable, sans quinte juste' },
};

/** Accords empruntés au mineur (en majeur) : chiffrage et notes relatives à la tonique */
export const BORROWED: Record<string, { label: string; semis: number[] }> = {
  IV: { label: 'IV (de la gamme)', semis: [5, 9, 12] },
  iv: { label: 'iv (mineur, emprunté)', semis: [5, 8, 12] },
  bVII: { label: '♭VII (emprunté)', semis: [10, 14, 17] },
  bVI: { label: '♭VI (emprunté)', semis: [8, 12, 15] },
  bIII: { label: '♭III (emprunté)', semis: [3, 7, 10] },
};
