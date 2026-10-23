// Exercices d'entretien sur l'instrument, façon « Solo » de Tom Quayle : une cible s'affiche (note, intervalle,
// accord, gamme), l'élève la joue (à l'écran ou au micro), l'appli vérifie et enchaîne. Logique pure, testée.
import { DEG_SEMI, SEVENTH_SEMI, TRIAD_SEMI } from '../engine/chroma';
import { mod12, pcName } from '../engine/music';
import { pick, shuffle, type Rng } from '../engine/rng';

export type DrillKind = 'notes' | 'intervalles' | 'accords' | 'gammes';
export type Order = 'montant' | 'descendant' | 'aller_retour' | 'aleatoire';

export interface DrillConfig {
  kind: DrillKind;
  minutes: number;
  /** passage à la cible suivante : dès que c'est trouvé, ou après quelques secondes pour réécouter */
  advance: 'trouve' | '2s' | '5s';
  showFingerings: boolean;
  input: 'ecran' | 'micro';
  /** notes : 1 = une fois n'importe où ; 2 = toutes les positions du manche ; 3 = dans une zone précise */
  noteLevel: 1 | 2 | 3;
  accidentals: boolean;
  intervals: number[];
  randomRoot: boolean;
  playRootFirst: boolean;
  chordTypes: string[];
  scales: string[];
  order: Order;
  notation: 'maj7' | 'delta';
}

export const DEFAULT_DRILL: Omit<DrillConfig, 'kind'> = {
  minutes: 2, advance: 'trouve', showFingerings: false, input: 'ecran', noteLevel: 1, accidentals: false,
  intervals: [3, 4, 7, 12], randomRoot: true, playRootFirst: true, chordTypes: ['majeur', 'mineur'], scales: ['majeure', 'penta_mineure'],
  order: 'montant', notation: 'maj7',
};

export const SCALES: Record<string, { label: string; tokens: string[] }> = {
  majeure: { label: 'Majeure', tokens: ['1', '2', '3', '4', '5', '6', '7'] },
  mineure: { label: 'Mineure naturelle', tokens: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
  penta_majeure: { label: 'Pentatonique majeure', tokens: ['1', '2', '3', '5', '6'] },
  penta_mineure: { label: 'Pentatonique mineure', tokens: ['1', 'b3', '4', '5', 'b7'] },
  blues: { label: 'Blues', tokens: ['1', 'b3', '4', '#4', '5', 'b7'] },
  dorien: { label: 'Dorien', tokens: ['1', '2', 'b3', '4', '5', '6', 'b7'] },
  mixolydien: { label: 'Mixolydien', tokens: ['1', '2', '3', '4', '5', '6', 'b7'] },
  lydien: { label: 'Lydien', tokens: ['1', '2', '3', '#4', '5', '6', '7'] },
  phrygien: { label: 'Phrygien', tokens: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'] },
};

export const CHORD_TYPES: Record<string, { semis: number[]; label: string }> = {
  majeur: { semis: TRIAD_SEMI.majeur, label: 'Majeur' }, mineur: { semis: TRIAD_SEMI.mineur, label: 'Mineur' },
  dim: { semis: TRIAD_SEMI.dim, label: 'Diminué' }, aug: { semis: TRIAD_SEMI.aug, label: 'Augmenté' },
  maj7: { semis: SEVENTH_SEMI.maj7, label: 'maj7 / Δ7' }, dom7: { semis: SEVENTH_SEMI.dom7, label: '7' },
  m7: { semis: SEVENTH_SEMI.m7, label: 'm7' }, m7b5: { semis: SEVENTH_SEMI.m7b5, label: 'm7♭5 / ø7' },
};

/** nom d'accord selon la notation choisie (réglage façon Solo : maj7 ou Δ7) */
export function chordLabel(root: string, type: string, notation: 'maj7' | 'delta'): string {
  const suffix: Record<string, [string, string]> = {
    majeur: ['', ''], mineur: [' m', 'm'], dim: [' dim', '°'], aug: [' aug', '+'],
    maj7: [' maj7', 'Δ7'], dom7: [' 7', '7'], m7: [' m7', '–7'], m7b5: [' m7♭5', 'ø7'],
  };
  const [a, b] = suffix[type] ?? ['', ''];
  return `${root}${notation === 'delta' ? b : a}`;
}

const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];

/** une position sur le manche (corde 0 = la plus grave) */
export interface Pos { string: number; fret: number; midi: number }
export function positionsOf(pc: number, tuning: number[], maxFret = 12, zone?: { strings: [number, number]; frets: [number, number] }): Pos[] {
  const out: Pos[] = [];
  tuning.forEach((open, s) => {
    for (let f = 0; f <= maxFret; f++) {
      if (mod12(open + f) !== pc) continue;
      if (zone && (s < zone.strings[0] || s > zone.strings[1] || f < zone.frets[0] || f > zone.frets[1])) continue;
      out.push({ string: s, fret: f, midi: open + f });
    }
  });
  return out;
}

export interface DrillTarget {
  /** ce qu'on affiche en grand */
  title: string;
  /** précision en petit (consigne de la cible) */
  sub: string;
  /** classes de hauteur à jouer, dans l'ordre */
  sequence: number[];
  /** « toutes les positions » / « dans la zone » : positions précises à toucher (dans n'importe quel ordre) */
  positions?: Pos[];
  zone?: { strings: [number, number]; frets: [number, number] };
  /** fondamentale (pour afficher les doigtés et rejouer le modèle) */
  rootPc: number;
}

function ordered(pcs: number[], order: Order, r: Rng): number[] {
  if (order === 'descendant') return [...pcs].reverse();
  if (order === 'aller_retour') return [...pcs, ...[...pcs].reverse().slice(1)];
  if (order === 'aleatoire') return shuffle(r, pcs);
  return pcs;
}

export function makeTarget(c: DrillConfig, r: Rng, instrument: 'piano' | 'guitare', tuning: number[]): DrillTarget {
  const rootPc = c.accidentals || c.kind !== 'notes' ? (c.randomRoot || c.kind === 'notes' ? Math.floor(r() * 12) : 0) : pick(r, NATURAL_PCS);
  const name = pcName(60 + rootPc);
  switch (c.kind) {
    case 'notes': {
      if (c.noteLevel === 1) return { title: name, sub: 'Joue cette note, n\'importe où.', sequence: [rootPc], rootPc };
      if (instrument === 'guitare') {
        if (c.noteLevel === 2) return { title: name, sub: 'Touche-la partout sur le manche (cases 0 à 12).', sequence: [rootPc], rootPc, positions: positionsOf(rootPc, tuning, 12) };
        // zone : 4 cases consécutives sur toutes les cordes, contenant au moins 2 positions
        for (let k = 0; k < 20; k++) {
          const start = Math.floor(r() * 9);
          const zone = { strings: [0, 5] as [number, number], frets: [start, start + 3] as [number, number] };
          const pos = positionsOf(rootPc, tuning, 12, zone);
          if (pos.length >= 2) return { title: name, sub: `Touche-la partout dans la zone (cases ${start} à ${start + 3}).`, sequence: [rootPc], rootPc, positions: pos, zone };
        }
        return { title: name, sub: 'Touche-la partout sur le manche.', sequence: [rootPc], rootPc, positions: positionsOf(rootPc, tuning, 12) };
      }
      // piano : toutes les octaves du clavier (niveau 2) ou une octave précise (niveau 3)
      const all = [48, 60, 72].map((o) => o + rootPc).filter((m) => m <= 83);
      if (c.noteLevel === 2) return { title: name, sub: 'Touche-la dans toutes les octaves du clavier.', sequence: [rootPc], rootPc, positions: all.map((m) => ({ string: 0, fret: 0, midi: m })) };
      const oct = pick(r, [48, 60]);
      return { title: name, sub: `Touche-la dans l'octave ${oct === 48 ? 'grave' : 'du milieu'} (en surbrillance).`, sequence: [rootPc], rootPc, positions: [{ string: 0, fret: 0, midi: oct + rootPc }] };
    }
    case 'intervalles': {
      const st = pick(r, c.intervals);
      const target = mod12(rootPc + st);
      return {
        title: `${INTERVAL_SHORT[st]} au-dessus de ${name}`, sub: c.playRootFirst ? `Joue ${name}, puis l'intervalle.` : 'Joue la note d\'arrivée.',
        sequence: c.playRootFirst ? [rootPc, target] : [target], rootPc,
      };
    }
    case 'accords': {
      const type = pick(r, c.chordTypes);
      const pcs = CHORD_TYPES[type].semis.map((s) => mod12(rootPc + s));
      return { title: chordLabel(name, type, c.notation), sub: ORDER_LABEL[c.order], sequence: ordered(pcs, c.order, r), rootPc };
    }
    case 'gammes': {
      const sc = pick(r, c.scales);
      const pcs = [...SCALES[sc].tokens.map((tk) => mod12(rootPc + DEG_SEMI[tk])), rootPc];
      return { title: `${SCALES[sc].label} de ${name}`, sub: ORDER_LABEL[c.order], sequence: ordered(pcs, c.order, r), rootPc };
    }
  }
}

export const ORDER_LABEL: Record<Order, string> = { montant: 'Dans l\'ordre, en montant.', descendant: 'Dans l\'ordre, en descendant.', aller_retour: 'En montant puis en redescendant.', aleatoire: 'Dans l\'ordre indiqué.' };
export const INTERVAL_SHORT: Record<number, string> = { 1: '2m', 2: '2M', 3: '3m', 4: '3M', 5: '4', 6: 'Triton', 7: '5', 8: '6m', 9: '6M', 10: '7m', 11: '7M', 12: '8' };

/** Progression dans une cible : renvoie l'état après une note jouée (classe de hauteur + position éventuelle). */
export interface Progress { index: number; found: Pos[]; errors: number }
export function step(t: DrillTarget, p: Progress, played: { midi: number; pos?: Pos }): { p: Progress; result: 'ok' | 'done' | 'wrong' } {
  if (t.positions) {
    const hit = t.positions.find((x) => (played.pos ? x.string === played.pos.string && x.fret === played.pos.fret : x.midi === played.midi));
    if (!hit) return { p: { ...p, errors: p.errors + 1 }, result: 'wrong' };
    if (p.found.some((x) => x.string === hit.string && x.fret === hit.fret && x.midi === hit.midi)) return { p, result: 'ok' };
    const found = [...p.found, hit];
    return { p: { ...p, found }, result: found.length === t.positions.length ? 'done' : 'ok' };
  }
  if (mod12(Math.round(played.midi)) !== t.sequence[p.index]) return { p: { ...p, errors: p.errors + 1 }, result: 'wrong' };
  const index = p.index + 1;
  return { p: { ...p, index }, result: index === t.sequence.length ? 'done' : 'ok' };
}
