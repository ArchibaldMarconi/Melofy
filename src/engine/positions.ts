// Positions sur le manche (et doigtés au piano) : gammes, arpèges, formes d'accords, avec doigts et coups de médiator.
// Une position = une fenêtre de 5 cases autour d'une note de la gamme sur la corde grave ; chaque hauteur n'y est
// jouée qu'une fois (on passe à la corde suivante dès que la note y existe), du grave à l'aigu.
import { DEG_SEMI } from './chroma';
import { mod12 } from './music';

export interface FretPos { string: number; fret: number; midi: number; finger: number; degree: string }

const tokFromSemi = (s: number, tokens: string[]) => tokens.find((t) => mod12(DEG_SEMI[t]) === mod12(s)) ?? String(s);

/**
 * Position n° box (1 à nombre de notes de la gamme) d'une gamme, sur une fenêtre de 5 cases.
 * La position 1 met la fondamentale de la corde grave sous l'index ; chaque position suivante démarre
 * sur la note suivante de la gamme sur cette corde.
 */
export function scalePosition(rootPc: number, tokens: string[], tuning: number[], box: number): { notes: FretPos[]; start: number } {
  const semis = tokens.map((t) => mod12(DEG_SEMI[t])).sort((a, b) => a - b);
  const pcs = semis.map((s) => mod12(rootPc + s));
  const rootFret = mod12(rootPc - tuning[0]);
  const k = ((box - 1) % semis.length + semis.length) % semis.length;
  let anchor = rootFret + semis[k];
  if (anchor > 12) anchor -= 12;
  // fenêtre : une case sous la note d'appui (extension de l'index), trois au-dessus
  let start = Math.max(0, anchor - 1);
  if (start > 10) start -= 12;
  start = Math.max(0, start);
  const window = [start, start + 4];
  const perString = tuning.map((open, s) => {
    const out: FretPos[] = [];
    for (let f = window[0]; f <= window[1]; f++) {
      const m = open + f;
      if (!pcs.includes(mod12(m))) continue;
      const idx = f - start;
      out.push({ string: s, fret: f, midi: m, finger: Math.max(1, Math.min(4, idx)), degree: tokFromSemi(m - rootPc, tokens) });
    }
    return out;
  });
  // chaque hauteur une seule fois : sur une corde, on s'arrête avant la 1re note jouable sur la corde suivante
  const notes: FretPos[] = [];
  for (let s = 0; s < tuning.length; s++) {
    const nextMin = s + 1 < tuning.length && perString[s + 1].length ? Math.min(...perString[s + 1].map((n) => n.midi)) : Infinity;
    for (const n of perString[s]) if (n.midi < nextMin && (!notes.length || n.midi > notes[notes.length - 1].midi)) notes.push(n);
  }
  return { notes, start };
}

/** Arpège dans une position : les notes de l'accord (degrés de l'accord) dans la fenêtre de la position. */
export function arpeggioPosition(rootPc: number, chordSemis: number[], tuning: number[], box: number): { notes: FretPos[]; start: number } {
  const labels: Record<number, string> = { 0: '1', 3: '♭3', 4: '3', 6: '♭5', 7: '5', 8: '♯5', 10: '♭7', 11: '7' };
  const tokens = chordSemis.map((s) => Object.keys(DEG_SEMI).find((t) => DEG_SEMI[t] === s) ?? '1');
  const pos = scalePosition(rootPc, tokens, tuning, box);
  return { notes: pos.notes.map((n) => ({ ...n, degree: labels[mod12(n.midi - rootPc)] ?? n.degree })), start: pos.start };
}

/** Formes d'accords mobiles (système CAGED), en cases relatives à la fondamentale ; null = corde non jouée. */
export const CHORD_SHAPES: Record<string, Record<string, (number | null)[]>> = {
  // forme de mi (fondamentale sur la 6e corde)
  E: { majeur: [0, 2, 2, 1, 0, 0], mineur: [0, 2, 2, 0, 0, 0], dom7: [0, 2, 0, 1, 0, 0], maj7: [0, null, 1, 1, 0, null], m7: [0, 2, 0, 0, 0, 0] },
  // forme de la (fondamentale sur la 5e corde)
  A: { majeur: [null, 0, 2, 2, 2, 0], mineur: [null, 0, 2, 2, 1, 0], dom7: [null, 0, 2, 0, 2, 0], maj7: [null, 0, 2, 1, 2, 0], m7: [null, 0, 2, 0, 1, 0] },
};

export function chordShape(rootPc: number, quality: string, shape: 'E' | 'A', tuning: number[]): FretPos[] {
  const rootString = shape === 'E' ? 0 : 1;
  let rootFret = mod12(rootPc - tuning[rootString]);
  if (rootFret === 0) rootFret = 12; // forme barrée plutôt qu'à vide, pour qu'elle soit mobile
  if (rootFret > 9) rootFret -= 12;
  if (rootFret < 1) rootFret += 12;
  const labels: Record<number, string> = { 0: '1', 3: '♭3', 4: '3', 7: '5', 10: '♭7', 11: '7' };
  const tpl = CHORD_SHAPES[shape][quality];
  const out: FretPos[] = [];
  tpl.forEach((off, s) => {
    if (off === null) return;
    const fret = rootFret + off;
    const midi = tuning[s] + fret;
    out.push({ string: s, fret, midi, finger: off === 0 ? 1 : Math.min(4, off + 1), degree: labels[mod12(midi - rootPc)] ?? '?' });
  });
  return out;
}

/** Coups de médiator en aller-retour strict, en commençant vers le bas. */
export const alternatePicking = (n: number) => Array.from({ length: n }, (_, i) => (i % 2 === 0 ? '↓' : '↑'));

/** Doigtés standard de la gamme majeure, main droite, au piano (1 octave, montée) */
/** main gauche, en montant : 5 4 3 2 1 3 2 1 (si majeur : 4 3 2 1 4 3 2 1) ; pentatonique : 3 2 1 3 2 1 */
export function pianoLeftFingering(rootPc: number, notes = 8): number[] {
  if (notes === 6) return [3, 2, 1, 3, 2, 1];
  return rootPc === 11 ? [4, 3, 2, 1, 4, 3, 2, 1] : [5, 4, 3, 2, 1, 3, 2, 1];
}

export function pianoScaleFingering(rootPc: number): number[] {
  // fa majeur : 1234 1234 ; les autres gammes « blanches » : 123 12345
  return rootPc === 5 ? [1, 2, 3, 4, 1, 2, 3, 4] : [1, 2, 3, 1, 2, 3, 4, 5];
}
