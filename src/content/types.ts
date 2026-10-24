// Types partagés : contenu (concepts, gabarits), variantes générées, réponses, scores.
// Correspond à la section « Spéc dev — données et score » du document Melofy.

export type Domain = 'rythme' | 'oreille' | 'theorie' | 'technique' | 'impro' | 'repiquage';

export type Mechanic =
  | 'identifier' | 'comparer' | 'chanter' | 'perroquet' | 'dictee' | 'taper' | 'lecture'
  | 'construire' | 'trouver' | 'jouer_tempo' | 'question_reponse' | 'jeu_libre' | 'repiquer';

export type InputMode = 'tap' | 'micro' | 'clavier' | 'manche';
export type Instrument = 'piano' | 'guitare';
export type ParamValue = number | string | boolean | number[] | string[];
export type Params = Record<string, ParamValue>;

/** Note d'un stimulus ou d'une réponse attendue. start et dur en temps (beats). */
export interface NoteEvent { midi: number; start: number; dur: number }

/** Note jouée par l'utilisateur. midi peut être fractionnaire (micro). tMs relatif au début de la capture. */
export interface PlayedNote { midi: number; tMs: number; durMs?: number }

export interface LessonStep {
  text: string;
  /** figures de rythme dessinées sous le texte */
  notation?: RhythmSymbol[];
  example?: { label: string; notes: NoteEvent[]; tempo: number };
}

/** Découverte active : on écoute deux extraits et on devine avant l'explication. */
export interface Discover {
  question: string;
  a: { notes: NoteEvent[]; tempo: number };
  b: { notes: NoteEvent[]; tempo: number };
  answer: 'A' | 'B';
  reveal: string;
}

export interface Concept {
  discover?: Discover;
  id: string;
  title: string;
  palier: number;
  unite: string;
  prerequis: string[];
  lecon: LessonStep[];
  confusions?: string[];
}

export interface ParamSpec {
  key: string;
  label: string;
  kind: 'enum' | 'range' | 'toggle';
  options?: { value: ParamValue; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

export type GeneratorId =
  | 'pulse_tap' | 'tempo_compare' | 'play_on_beat' | 'up_down' | 'same_diff' | 'find_keys'
  | 'sing_note' | 'figure_duration' | 'rhythm_read' | 'rhythm_echo' | 'finished_or_not'
  | 'sing_tonic' | 'find_tonic' | 'degree_identify' | 'sing_pattern' | 'melody_echo'
  | 'dictation' | 'qa_constraints' | 'free_play' | 'build_interval' | 'tune_echo'
  | 'degree_staff' | 'steps_quiz' | 'degree_name' | 'interval_identify' | 'chord_quality' | 'chord_function'
  | 'chord_change' | 'penta_or_not' | 'build_chord' | 'grid_read' | 'build_scale' | 'find_note' | 'play_pattern' | 'play_chord'
  | 'name_the_note' | 'find_notes_series' | 'read_staff' | 'play_staff_notes' | 'scale_next' | 'name_by_ear'
  | 'find_home' | 'find_function' | 'write_staff_note' | 'staff_dictation' | 'rhythm_dictation'
  | 'chroma_identify' | 'chroma_dictation' | 'major_minor' | 'sing_interval' | 'triad_quality' | 'build_triad'
  | 'diatonic_chord' | 'progression_dictation' | 'diatonic_theory' | 'lick_echo'
  | 'seventh_quality' | 'build_seventh' | 'cadence_identify' | 'cadence_theory' | 'ii_v_i_theory' | 'guide_tones'
  | 'swing_or_straight' | 'chord_tone' | 'target_thirds' | 'scale_identify'
  | 'mode_identify' | 'mode_theory' | 'borrowed_chord' | 'outsider_chord' | 'modulation_identify' | 'meter_identify'
  | 'position_scale' | 'position_arpeggio' | 'chord_shape' | 'ear_in_position'
  | 'audiate_pattern' | 'audiate_tune' | 'predict_next'
  | 'step_size' | 'step_on_instrument' | 'step_theory' | 'scale_right_wrong' | 'major_scale_theory' | 'stable_or_not' | 'sing_resolution' | 'downbeat_tap' | 'binary_ternary'
  | 'triad_theory' | 'key_sig_identify' | 'key_sig_listen' | 'key_sig_scale'
  | 'name_play' | 'bass_echo' | 'one_string_scale' | 'five_finger' | 'hands_together'
  | 'interval_theory' | 'interval_play' | 'minor_type_identify' | 'minor_scale_play' | 'sing_tokens' | 'function_family'
  | 'grid_bass_play' | 'circle_theory' | 'fifths_bass_play' | 'borrowed_origin' | 'progression_arpeggio_play' | 'mode_parent'
  | 'secondary_dominant_identify' | 'secondary_dominant_build' | 'extension_quality' | 'build_extension'
  | 'melodic_mode_identify' | 'melodic_mode_theory' | 'voice_leading_next' | 'guide_tone_line' | 'sight_read';

export interface ExerciseTemplate {
  id: string;
  title: string;
  description: string;
  domain: Domain;
  concepts: string[];
  palier: number;
  niveau: 1 | 2 | 3 | 4 | 5;
  mechanic: Mechanic;
  inputs: InputMode[];
  generator: GeneratorId;
  params: Params;
  paramSpecs: ParamSpec[];
  tolerances: { cents: number; ms: number };
  reussite: { precisionMin: number };
  dureeS: number;
  /** null = réécoutes illimitées */
  reecoutesMax: number | null;
  etapes?: ('rejouer' | 'transcrire_degres')[];
  /** hors du parcours principal : « pour aller plus loin » (arbre replié, jamais en nouveauté) */
  optionnel?: boolean;
  /** paliers de difficulté adaptative : réglages appliqués selon le niveau atteint sur cet exercice */
  progression?: Params[];
}

export type RhythmSymbol = 'noire' | 'blanche' | 'soupir' | 'croches' | 'doubles' | 'syncope' | 'triolet';

export type Display =
  | { kind: 'rhythm'; items: RhythmSymbol[]; perBar?: number; pickup?: number }
  | { kind: 'degrees'; degrees: string[] }
  | { kind: 'figure'; figure: RhythmSymbol }
  | { kind: 'text'; text: string }
  | { kind: 'degreeStaff'; degree: number; top: number }
  | { kind: 'grid'; bars: string[] }
  | { kind: 'instrumentNote'; midi: number; string?: number; fret?: number }
  | { kind: 'staff'; midis: number[]; clef?: 'sol' | 'fa'; /** armure : + dièses, − bémols */ keySig?: number }
  /** lecture à vue : le rythme écrit au-dessus des notes de la portée (une note par attaque) */
  | { kind: 'staffRhythm'; midis: number[]; items: RhythmSymbol[]; perBar: number };

export interface QuizItem {
  stimulus: NoteEvent[];
  tempo: number;
  referenceTonic?: boolean;
  /** tonique propre à cette question (cadence de référence dans une autre tonalité) */
  tonic?: number;
  /** preview : exemple à écouter pour chaque réponse (ex. la gamme de chaque mode sur le bourdon) */
  choices: { id: string; label: string; preview?: NoteEvent[] }[];
  answerId: string;
  display?: Display;
}

/** Degré relatif à la tonique : degree 1..7 (8 = octave), acc -1 bémol / +1 dièse, dur en temps. */
export interface DegreeItem { degree: number; acc: -1 | 0 | 1; dur: number }

export type Expected =
  | { kind: 'quiz'; items: QuizItem[] }
  | { kind: 'sequence'; notes: NoteEvent[]; checkRhythm: boolean; octaveAgnostic: boolean }
  | { kind: 'rhythm'; onsetsBeats: number[]; absolute: boolean }
  | { kind: 'set'; midis: number[]; octaveAgnostic: boolean }
  | { kind: 'constraints'; allowedDegrees: number[]; endDegree?: number; minNotes: number }
  | { kind: 'free' }
  | { kind: 'transcribe'; items: DegreeItem[]; checkDur: boolean }
  | { kind: 'figures'; items: RhythmSymbol[]; perBar: number; palette: RhythmSymbol[] };

export type AnswerUI = 'quiz' | 'sequence' | 'tap' | 'select' | 'degrees' | 'sing' | 'free' | 'staff' | 'figures';

export interface Variant {
  seed: number;
  tempo: number;
  tonic: number;
  prompt: string;
  stimulus: NoteEvent[];
  stimulusKind: 'melody' | 'rhythm' | 'none';
  /** joue la tonique avant le stimulus */
  referenceTonic: boolean;
  /** temps de décompte au clic avant la capture */
  countInBeats: number;
  /** le clic continue pendant la capture */
  clickDuringCapture: boolean;
  /** la capture commence en même temps que le stimulus (taper la pulsation d'un morceau) */
  simultaneous: boolean;
  /** notes MIDI tenues en bourdon (backing minimal), null = aucun */
  drone: number[] | null;
  /** durée de capture auto (ms), 0 = jusqu'à « Valider » */
  captureMs: number;
  answerUI: AnswerUI;
  expected: Expected;
  display?: Display;
  /** texte de l'aide niveau 3 (indice) */
  hint: string;
  /** notes proposées à l'écran (impro, jeu libre) */
  allowedDegrees?: number[];
  /** accompagnement du modèle (perroquet sur accords) : joué en même temps que la mélodie, plus bas, moins fort, avec un autre timbre */
  stimulusBacking?: NoteEvent[];
  /** accompagnement joué pendant la saisie : un accord (MIDI) par mesure, en boucle */
  backing?: { chords: number[][]; beatsPerBar: number };
  /** guide de position sur le manche : points étiquetés (degré, doigt), zone, étiquettes sous la portée */
  guide?: { marks: { string: number; fret: number; label?: string }[]; zone?: { strings: [number, number]; frets: [number, number] }; staffLabels?: string[]; text?: string };
  /** ne pas marquer la tonique sur l'instrument (elle donnerait la réponse) */
  hideTonic?: boolean;
  /** temps par mesure (métronome : accent sur le 1er temps ; décompte d'une mesure) */
  perBar?: number;
  /** audiation : le modèle n'est PAS joué avant la réponse (seulement la cadence) ; il sert à comparer après */
  audiate?: boolean;
  /** quiz d'intervalles : sens joué, pour le suivi par intervalle */
  intervalSens?: 'montant' | 'descendant' | 'harmonique' | 'mixte';
  /** perroquet avec métronome : nombre de temps de clic pendant la réponse (après 4 temps de décompte) */
  metronomeCapture?: number;
  /** contexte tonal mineur (cadence i-iv-V-i) au lieu de la cadence majeure */
  minorContext?: boolean;
  /** classes de hauteur à mettre en couleur sur l'instrument (gammes chromatiques : blues, mineur…) */
  allowedPcs?: number[];
  /** le clic accompagne le modèle (dictée rythmique : décompte puis pulsation) */
  clickWithStimulus?: boolean;
  /** notes déjà écrites sur la portée (la 1re note d'une dictée) */
  staffGiven?: number[];
  /** après la réponse, la vraie tonique est jouée pour comparer (« trouve la maison ») */
  revealTonic?: boolean;
  /** fondamentale marquée sur l'instrument (« trouve la fonction ») */
  markRoot?: number;
  /** pavé de réponse en noms de notes (do = 1 … si = 7) au lieu de degrés */
  padNames?: string[];
  /** étape 2 du repiquage : ce qu'il faut retranscrire */
  transcription?: DegreeItem[];
}

export type Answer =
  | { kind: 'quiz'; ids: string[] }
  | { kind: 'notes'; notes: PlayedNote[] }
  | { kind: 'taps'; tMs: number[] }
  | { kind: 'set'; midis: number[] }
  | { kind: 'degrees'; items: DegreeItem[] }
  | { kind: 'free'; notes: PlayedNote[] }
  | { kind: 'figures'; items: RhythmSymbol[] };

export type ErrorType =
  | 'note_fausse' | 'note_manquante' | 'note_en_trop' | 'en_avance' | 'en_retard'
  | 'justesse' | 'mauvaise_reponse' | 'contrainte' | 'duree';

export interface ErrorItem { type: ErrorType; index?: number; message: string; expected?: string; played?: string }

export interface ScoreResult {
  precision: number;
  pitch?: number;
  rhythm?: number;
  success: boolean;
  errors: ErrorItem[];
  /** index des éléments attendus mal joués (aide 4 : montrer la partie fausse) */
  wrongIndexes: number[];
}

export type Rating = 1 | 2 | 3 | 4;

export interface Outcome {
  templateId: string;
  seed: number;
  params: Params;
  attempt: number;
  precision: number;
  success: boolean;
  /** niveaux d'aide utilisés (2 à 5 ; la réécoute dans la limite n'est pas une aide) */
  helps: number[];
  errors: ErrorItem[];
  timeMs: number;
}

export interface CompetenceState {
  /** la compétence (voir content/skills) ; anciennes sauvegardes : `${notion}:${domaine}` avant migration */
  key: string;
  conceptId: string;
  domain: Domain;
  stability: number;
  difficulty: number;
  lastReview: number; // ms epoch
  due: number; // ms epoch
  reps: number;
  lapses: number;
  tempoCible: number | null;
  /** réussites (note ≥ 2) et date de la première : la maîtrise exige des réussites sur des jours différents */
  successes?: number;
  firstSuccess?: number;
}

export type SessionBlock = 'echauffement' | 'remediation' | 'revision' | 'nouveaute' | 'impro' | 'reinjection'
  | 'routine_rythme' | 'routine_intervalles' | 'routine_audiation' | 'routine_repiquage' | 'routine_oreille' | 'routine_perroquet' | 'routine_noms' | 'routine_instrument' | 'routine_lecture' | 'consolidation'
  // workout 0.20.0
  | 'confirmation' | 'application' | 'oreille' | 'mapping' | 'perroquet' | 'technique' | 'creer';

/** les parties de la séance : échauffement (technique), révision, entendre, trouver, rejouer, créer */
export type WorkoutPart = 'revision' | 'oreille' | 'mapping' | 'perroquet' | 'technique' | 'creer';

export interface PlanItem {
  templateId: string;
  seed: number;
  block: SessionBlock;
  params?: Params;
  /** 1 = partout à l'écran ; 2 = à l'instrument */
  part?: 1 | 2;
  /** durée estimée (s) : réaliste, puis apprise sur les temps mesurés */
  estS?: number;
  /** workout 0.20.0 : partie, réponse au micro (vrai instrument) ou à l'écran */
  wpart?: WorkoutPart;
  input?: 'micro' | 'ecran';
  /** confirmation d'une leçon : sa réussite la valide définitivement */
  confirmLesson?: string;
  /** module technique : gamme, étape, type (étape à franchir ou tempo évolutif) */
  tech?: { scale: string; stepIndex: number; maxStep: number; kind: 'step' | 'tempo'; label: string };
}
