// Jam : un accompagnement en boucle (batterie légère, basse, accords) sur une grille, dans un style, pour improviser.
// Tout est calculé ici (pur, testable) ; l'écran ne fait que le jouer et l'afficher.
import type { NoteEvent } from '../content/types';
import { mod12, NAMES_FR } from './music';

export type Quality = 'maj' | 'min' | 'dom7' | 'maj7' | 'm7';
export interface JamChord { root: number; quality: Quality }
export interface Progression { id: string; label: string; line: string; bars: JamChord[]; scale: number[]; scaleLabel: string }
export interface Style { id: string; label: string; swing: boolean; tempo: number }

const Q: Record<Quality, { semis: number[]; suffix: string }> = {
  maj: { semis: [0, 4, 7], suffix: '' }, min: { semis: [0, 3, 7], suffix: 'm' }, dom7: { semis: [0, 4, 7, 10], suffix: '7' },
  maj7: { semis: [0, 4, 7, 11], suffix: 'maj7' }, m7: { semis: [0, 3, 7, 10], suffix: 'm7' },
};
const c = (root: number, quality: Quality): JamChord => ({ root, quality });

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const PENTA_MAJ = [0, 2, 4, 7, 9];
const PENTA_MIN = [0, 3, 5, 7, 10];
const BLUES = [0, 3, 5, 6, 7, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

export const PROGRESSIONS: Progression[] = [
  { id: 'pop', label: 'I – V – vi – IV', line: 'La grille de mille chansons pop', bars: [c(0, 'maj'), c(7, 'maj'), c(9, 'min'), c(5, 'maj')], scale: PENTA_MAJ, scaleLabel: 'penta majeure' },
  { id: 'doowop', label: 'I – vi – IV – V', line: 'Années 50, ballades', bars: [c(0, 'maj'), c(9, 'min'), c(5, 'maj'), c(7, 'maj')], scale: MAJOR, scaleLabel: 'gamme majeure' },
  { id: 'blues', label: 'Blues en 12 mesures', line: 'I7 – IV7 – V7, la base du blues et du rock', bars: [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7].map((r) => c(r, 'dom7')), scale: BLUES, scaleLabel: 'gamme blues' },
  { id: 'ii_v_i', label: 'ii – V – I', line: 'Le cœur du jazz', bars: [c(2, 'm7'), c(7, 'dom7'), c(0, 'maj7'), c(0, 'maj7')], scale: MAJOR, scaleLabel: 'gamme majeure' },
  { id: 'rock_mineur', label: 'i – ♭VII – ♭VI – ♭VII', line: 'Rock mineur, épique', bars: [c(0, 'min'), c(10, 'maj'), c(8, 'maj'), c(10, 'maj')], scale: PENTA_MIN, scaleLabel: 'penta mineure' },
  { id: 'dorien', label: 'i7 – IV7 (dorien)', line: 'Funk et soul modale', bars: [c(0, 'm7'), c(0, 'm7'), c(5, 'dom7'), c(5, 'dom7')], scale: DORIAN, scaleLabel: 'mode dorien' },
];

export const STYLES: Style[] = [
  { id: 'pop', label: 'Pop', swing: false, tempo: 92 },
  { id: 'rock', label: 'Rock', swing: false, tempo: 112 },
  { id: 'shuffle', label: 'Shuffle', swing: true, tempo: 96 },
  { id: 'funk', label: 'Funk', swing: false, tempo: 98 },
  { id: 'bossa', label: 'Bossa', swing: false, tempo: 120 },
  { id: 'ballade', label: 'Ballade', swing: false, tempo: 70 },
];

export const JAM_KEYS: { id: string; pc: number }[] = [
  { id: 'C', pc: 0 }, { id: 'G', pc: 7 }, { id: 'D', pc: 2 }, { id: 'A', pc: 9 }, { id: 'E', pc: 4 }, { id: 'F', pc: 5 },
];

export const chordLabel = (ch: JamChord, keyPc: number) => `${NAMES_FR[(keyPc + ch.root) % 12]}${Q[ch.quality].suffix ? ` ${Q[ch.quality].suffix}` : ''}`;
/** notes de l'accord (classes de hauteur) pour viser les notes de l'accord en improvisant */
export const chordPcs = (ch: JamChord, keyPc: number) => Q[ch.quality].semis.map((s) => (keyPc + ch.root + s) % 12);

/** placements dans une mesure de 4 temps : accords (début, durée), basse (début, intervalle depuis la fondamentale, durée) */
const COMP: Record<string, { at: number; dur: number }[]> = {
  pop: [{ at: 0, dur: 1.4 }, { at: 1.5, dur: 0.45 }, { at: 2, dur: 1.4 }, { at: 3.5, dur: 0.45 }],
  rock: [0, 1, 2, 3].map((at) => ({ at, dur: 0.6 })),
  shuffle: [0, 1, 2, 3].flatMap((b) => [{ at: b, dur: 0.55 }, { at: b + 2 / 3, dur: 0.3 }]),
  funk: [{ at: 0, dur: 0.2 }, { at: 0.75, dur: 0.2 }, { at: 1.5, dur: 0.2 }, { at: 2.5, dur: 0.2 }, { at: 3.25, dur: 0.2 }],
  bossa: [{ at: 0, dur: 0.9 }, { at: 1.5, dur: 0.9 }, { at: 3, dur: 0.9 }],
  ballade: [{ at: 0, dur: 3.8 }],
};
const BASS: Record<string, { at: number; iv: number; dur: number }[]> = {
  pop: [{ at: 0, iv: 0, dur: 1.4 }, { at: 2, iv: 0, dur: 0.9 }, { at: 3, iv: 7, dur: 0.9 }],
  rock: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((at) => ({ at, iv: 0, dur: 0.45 })),
  // boogie : fondamentale, tierce, quinte, sixte, en croches swing
  shuffle: [0, 1, 2, 3].flatMap((b, k) => [{ at: b, iv: [0, 4, 7, 9][k], dur: 0.6 }, { at: b + 2 / 3, iv: [0, 4, 7, 9][k], dur: 0.3 }]),
  funk: [{ at: 0, iv: 0, dur: 0.4 }, { at: 0.75, iv: 12, dur: 0.2 }, { at: 1.5, iv: 0, dur: 0.3 }, { at: 2.5, iv: 7, dur: 0.3 }, { at: 3.5, iv: 10, dur: 0.3 }],
  bossa: [{ at: 0, iv: 0, dur: 1.4 }, { at: 1.5, iv: 7, dur: 0.45 }, { at: 2, iv: 0, dur: 1.4 }, { at: 3.5, iv: 7, dur: 0.45 }],
  ballade: [{ at: 0, iv: 0, dur: 1.9 }, { at: 2, iv: 7, dur: 1.9 }],
};

export interface JamTrack {
  /** couches à mixer : voix et volume relatifs */
  layers: { notes: NoteEvent[]; voice: 'piano' | 'guitare' | 'clic' | 'clic_fort' | 'bloc'; volume: number }[];
  beats: number;
  tempo: number;
  bars: string[];
}

/** une boucle complète de la grille (au moins 8 mesures pour les grilles de 4, pour que la boucle respire) */
export function buildJam(prog: Progression, style: Style, keyPc: number, tempo: number, instrument: 'piano' | 'guitare'): JamTrack {
  const reps = prog.bars.length >= 8 ? 1 : 2;
  const bars = Array.from({ length: reps }, () => prog.bars).flat();
  const bassBase = 36 + keyPc;
  // accords : chaque note de l'accord placée dans la même octave glissante (de ré3 à do♯4 en do), voicing serré
  const chordLow = 50 + keyPc;
  const comp: NoteEvent[] = [];
  const bass: NoteEvent[] = [];
  const hat: NoteEvent[] = [];
  const back: NoteEvent[] = [];
  const down: NoteEvent[] = [];
  bars.forEach((ch, b) => {
    const t0 = b * 4;
    // voicing serré autour du milieu du clavier (pas de sauts d'un accord à l'autre)
    const voice = chordPcs(ch, keyPc).map((pc) => chordLow + mod12(pc - chordLow));
    for (const h of COMP[style.id]) for (const m of voice) comp.push({ midi: m, start: t0 + h.at, dur: h.dur });
    // fondamentale ramenée entre sol grave et fa♯ (31 à 42) : la basse reste grave sans tomber dans l'inaudible
    let root = bassBase + ch.root;
    while (root > 42) root -= 12;
    while (root < 31) root += 12;
    for (const h of BASS[style.id]) bass.push({ midi: root + h.iv, start: t0 + h.at, dur: h.dur });
    const eighths = style.swing ? [0, 2 / 3] : [0, 0.5];
    if (style.id !== 'ballade') for (let k = 0; k < 4; k++) for (const e of eighths) hat.push({ midi: 0, start: t0 + k + e, dur: 0.1 });
    else for (let k = 0; k < 4; k++) hat.push({ midi: 0, start: t0 + k, dur: 0.1 });
    back.push({ midi: 0, start: t0 + 1, dur: 0.1 }, { midi: 0, start: t0 + 3, dur: 0.1 });
    down.push({ midi: 0, start: t0, dur: 0.1 });
  });
  const compVoice = instrument === 'piano' ? 'guitare' : 'piano';
  return {
    tempo, beats: bars.length * 4, bars: bars.map((ch) => chordLabel(ch, keyPc)),
    layers: [
      { notes: comp, voice: compVoice, volume: style.id === 'ballade' ? 0.35 : 0.3 },
      { notes: bass, voice: 'piano', volume: 0.55 },
      { notes: hat, voice: 'clic', volume: 0.18 },
      { notes: back, voice: 'bloc', volume: style.id === 'ballade' ? 0.15 : 0.35 },
      { notes: down, voice: 'clic_fort', volume: 0.12 },
    ],
  };
}
