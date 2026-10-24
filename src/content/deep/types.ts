// Leçons approfondies : un module court sur une notion clé et complexe.
// Écouter d'abord (découverte), comprendre (écrans illustrés, posés), pratiquer par domaine, valider.
import type { Domain, Instrument, NoteEvent, Params } from '../types';

/** Illustrations dessinées dans l'appli (aucun fichier image). */
export type Illustration =
  /** grave et aigu : deux ondes (lente et serrée) et des images (instruments, animaux) */
  | { kind: 'waves' }
  /** l'échelle des hauteurs : du plus grave au plus aigu, avec des repères concrets */
  | { kind: 'pitchLadder' }
  /** clavier : touches marquées, et arcs « ton » / « demi-ton » entre deux touches */
  | { kind: 'keyboard'; from: number; to: number; names?: boolean; marks?: { midi: number; label?: string; color?: string }[]; arcs?: { a: number; b: number; label: string; color?: string }[] }
  /** manche : cases marquées (corde 0 = la plus grave), arcs entre cases voisines */
  | { kind: 'fretboard'; frets: number; marks?: { string: number; fret: number; label?: string; color?: string }[]; arcs?: { string: number; a: number; b: number; label: string; color?: string }[] }
  /** escalier de la gamme : les marches (T ou ½) entre les notes */
  | { kind: 'steps'; notes: string[]; steps: ('T' | '½' | '1½')[] }
  /** échelle des degrés : stables / instables, et flèches de tendance */
  | { kind: 'ladder'; degrees: { d: string; name?: string; stable: boolean; to?: string }[] }
  /** grille de pulsation : mesures, temps forts, subdivisions et comptage */
  | { kind: 'pulseGrid'; perBar: number; bars: number; subdiv: 1 | 2 | 3 | 4; plain?: boolean; /** temps mis en avant dans la mesure (0 = 1er temps) : groupes 3+2, backbeat sur 2 et 4 */ accents?: number[] }
  /** portée : notes, repères, étiquettes */
  | { kind: 'staff'; notes: { midi: number; label?: string; color?: string }[]; landmarks?: boolean; /** armure : + dièses, − bémols ; sigLabels : nom sous chaque altération */ keySig?: number; sigLabels?: boolean; clef?: 'sol' | 'fa'; /** altération de l'armure à mettre en couleur (index) */ sigHighlight?: number }
  /** rythme écrit en figures (noire, croches, syncope, triolet…) ; `counts` = comptage sous chaque temps */
  | { kind: 'rhythm'; items: import('../types').RhythmSymbol[]; perBar?: number; counts?: string }
  /** le cercle des quintes : 12 tonalités majeures, do en haut ; `highlight` met des tonalités en couleur, `arrows` les relie */
  | { kind: 'circle'; highlight?: string[]; arrows?: [string, string][]; center?: string }
  /** cartes côte à côte (comparaison simple, sans image) */
  | { kind: 'cards'; items: { title: string; sub: string; color?: string }[] };

export interface DeepScreen {
  title: string;
  /** paragraphes courts, posés */
  paragraphs: string[];
  illustration?: Illustration;
  /** variante d'illustration pour la guitare (sinon la même) */
  guitarIllustration?: Illustration;
  /** variantes guitare du texte, de l'« à retenir » et du son, quand le manche se pense autrement que le clavier */
  guitarParagraphs?: string[];
  guitarKeep?: string;
  guitarAudio?: { label: string; notes: NoteEvent[]; tempo: number };
  /** exemple sonore, seulement s'il éclaire vraiment l'écran */
  audio?: { label: string; notes: NoteEvent[]; tempo: number };
  /** à retenir, en une phrase */
  keep?: string;
  /** écran réservé à un instrument (ex. les positions : guitare) */
  only?: Instrument;
}

/**
 * « À toi d'essayer » : une étape où l'élève cherche avec ses mains AVANT qu'on lui donne le nom (le son, puis les
 * doigts, puis le nom). Rien n'est noté : on peut se tromper, réécouter, ou demander « Montre-moi ».
 *  - play : jouer une suite de notes (comparée en noms de notes, à n'importe quelle octave), ou explorer librement ;
 *  - build : choisir les notes d'un accord ;
 *  - tap : taper un rythme avec le clic.
 */
export type LessonTry =
  | { kind: 'play'; prompt: string; guitarPrompt?: string; target?: number[]; guitarTarget?: number[]; drone?: number; allowed?: number[]; minNotes?: number; success: string }
  | { kind: 'build'; prompt: string; guitarPrompt?: string; target: number[]; success: string }
  | { kind: 'tap'; prompt: string; onsets: number[]; tempo: number; perBar: number; success: string };

export interface DeepPractice {
  domain: Domain | 'chant' | 'audiation' | 'lecture';
  label: string;
  templateId: string;
  params?: Params;
  /** réservé à un instrument (ex. positions : guitare) */
  only?: Instrument;
}

export interface DeepLesson {
  id: string;
  /** numéro affiché (1, 2… ou « R1 », « 5b » pour les leçons ajoutées au cursus) */
  number: number | string;
  /** cursus (0.20.0) : leçons dont celle-ci découle, notions de l'arbre rattachées, phase 1 à 5 */
  parents?: string[];
  concepts?: string[];
  phase?: 1 | 2 | 3 | 4 | 5 | 6;
  /** leçon courte provisoire, en attendant la version approfondie */
  provisional?: boolean;
  title: string;
  palier: number;
  /** notion de l'arbre à laquelle la leçon se rattache (ouverte quand la notion est vue) */
  conceptId: string;
  why: string;
  discover?: { question: string; a: { notes: NoteEvent[]; tempo: number }; b: { notes: NoteEvent[]; tempo: number }; answer: 'A' | 'B'; reveal: string };
  screens: DeepScreen[];
  practice: DeepPractice[];
  validation: { label: string; templateId: string; params?: Params; criterion: string };
  /** validation propre à la guitare (ex. positions de mémoire) */
  guitarValidation?: { label: string; templateId: string; params?: Params; criterion: string };
}
