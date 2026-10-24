// Les compétences : ce que l'élève sait FAIRE (entendre un degré, trouver une note sur le manche, construire un
// accord…). Chaque générateur d'exercice entraîne une compétence, et chaque compétence appartient à l'un des
// quatre domaines montrés à l'élève. C'est l'unité de la révision espacée et de la progression affichée.
import type { ExerciseTemplate, GeneratorId } from './types';

export type Area = 'oreille' | 'lecture' | 'mains' | 'rythme';
export const AREAS: Area[] = ['oreille', 'mains', 'lecture', 'rythme'];
export const AREA_LABEL: Record<Area, string> = { oreille: 'Oreille', lecture: 'Lecture et théorie', mains: 'Sur l\'instrument', rythme: 'Rythme' };
export const AREA_LINE: Record<Area, string> = {
  oreille: 'Entendre, chanter, rejouer d\'oreille',
  lecture: 'Lire, nommer, construire',
  mains: 'Trouver et jouer sur ton instrument',
  rythme: 'Pulsation, lecture et dictée rythmiques',
};

export const SKILLS = {
  // rythme
  pulsation: { title: 'Pulsation', area: 'rythme' },
  mesure: { title: 'Mesure et ressenti', area: 'rythme' },
  lire_rythme: { title: 'Lire un rythme', area: 'rythme' },
  rythme_oreille: { title: 'Rythme d\'oreille', area: 'rythme' },
  // oreille
  hauteurs: { title: 'Grave, aigu, distances', area: 'oreille' },
  chanter_juste: { title: 'Chanter juste', area: 'oreille' },
  tonique: { title: 'Sentir la tonique', area: 'oreille' },
  degres_oreille: { title: 'Entendre les degrés', area: 'oreille' },
  degres_chroma: { title: 'Degrés chromatiques', area: 'oreille' },
  dictee_melodique: { title: 'Dictée mélodique', area: 'oreille' },
  intervalles_oreille: { title: 'Entendre les intervalles', area: 'oreille' },
  couleur_accords: { title: 'Couleur des accords', area: 'oreille' },
  fonctions_accords: { title: 'Fonctions des accords', area: 'oreille' },
  grilles_oreille: { title: 'Grilles et cadences', area: 'oreille' },
  gammes_oreille: { title: 'Gammes à l\'oreille', area: 'oreille' },
  modes_oreille: { title: 'Couleurs des modes', area: 'oreille' },
  harmonie_oreille: { title: 'Emprunts et modulations', area: 'oreille' },
  audiation: { title: 'Entendre dans sa tête', area: 'oreille' },
  jouer_oreille: { title: 'Rejouer d\'oreille', area: 'oreille' },
  // lecture et théorie
  lire_portee: { title: 'Lire la portée', area: 'lecture' },
  construction_gammes: { title: 'Construction des gammes', area: 'lecture' },
  intervalles_theorie: { title: 'Nommer les intervalles', area: 'lecture' },
  accords_theorie: { title: 'Accords de la gamme', area: 'lecture' },
  harmonie_theorie: { title: 'Harmonie', area: 'lecture' },
  modes_theorie: { title: 'Construire les modes', area: 'lecture' },
  armures: { title: 'Armures', area: 'lecture' },
  grilles: { title: 'Lire une grille', area: 'lecture' },
  construire_intervalles: { title: 'Construire un intervalle', area: 'lecture' },
  construire_accords: { title: 'Construire un accord', area: 'lecture' },
  construire_gammes: { title: 'Construire une gamme', area: 'lecture' },
  // sur l'instrument
  notes_instrument: { title: 'Les notes sur l\'instrument', area: 'mains' },
  fonctions_instrument: { title: 'Les fonctions sous les doigts', area: 'mains' },
  intervalles_instrument: { title: 'Intervalles sur l\'instrument', area: 'mains' },
  accords_instrument: { title: 'Accords sur l\'instrument', area: 'mains' },
  gammes_instrument: { title: 'Gammes et positions', area: 'mains' },
  arpeges_instrument: { title: 'Arpèges', area: 'mains' },
  basses_instrument: { title: 'Lignes de basse', area: 'mains' },
  notes_cibles: { title: 'Notes cibles', area: 'mains' },
  improviser: { title: 'Improviser', area: 'mains' },
} as const satisfies Record<string, { title: string; area: Area }>;

export type SkillId = keyof typeof SKILLS;

/** la compétence entraînée par chaque générateur (exhaustif : un générateur ajouté doit être rangé ici) */
export const GENERATOR_SKILL: Record<GeneratorId, SkillId> = {
  pulse_tap: 'pulsation', play_on_beat: 'pulsation', tempo_compare: 'pulsation',
  downbeat_tap: 'mesure', meter_identify: 'mesure', binary_ternary: 'mesure', swing_or_straight: 'mesure',
  rhythm_read: 'lire_rythme', figure_duration: 'lire_rythme',
  rhythm_echo: 'rythme_oreille', rhythm_dictation: 'rythme_oreille',

  up_down: 'hauteurs', same_diff: 'hauteurs', step_size: 'hauteurs',
  sing_note: 'chanter_juste', sing_pattern: 'chanter_juste', sing_tokens: 'chanter_juste', sing_interval: 'chanter_juste',
  sing_tonic: 'tonique', find_home: 'tonique', finished_or_not: 'tonique', stable_or_not: 'tonique', predict_next: 'tonique', sing_resolution: 'tonique',
  degree_identify: 'degres_oreille', degree_name: 'degres_oreille', name_by_ear: 'degres_oreille',
  chroma_identify: 'degres_chroma',
  dictation: 'dictee_melodique', chroma_dictation: 'dictee_melodique', staff_dictation: 'dictee_melodique',
  interval_identify: 'intervalles_oreille',
  chord_quality: 'couleur_accords', triad_quality: 'couleur_accords', seventh_quality: 'couleur_accords', major_minor: 'couleur_accords',
  chord_function: 'fonctions_accords', chord_change: 'fonctions_accords', diatonic_chord: 'fonctions_accords', chord_tone: 'fonctions_accords',
  progression_dictation: 'grilles_oreille', cadence_identify: 'grilles_oreille',
  penta_or_not: 'gammes_oreille', scale_right_wrong: 'gammes_oreille', scale_identify: 'gammes_oreille', minor_type_identify: 'gammes_oreille', key_sig_listen: 'gammes_oreille',
  mode_identify: 'modes_oreille',
  borrowed_chord: 'harmonie_oreille', outsider_chord: 'harmonie_oreille', modulation_identify: 'harmonie_oreille',
  audiate_pattern: 'audiation', audiate_tune: 'audiation',
  melody_echo: 'jouer_oreille', lick_echo: 'jouer_oreille', bass_echo: 'jouer_oreille', tune_echo: 'jouer_oreille', ear_in_position: 'jouer_oreille',

  read_staff: 'lire_portee', write_staff_note: 'lire_portee', degree_staff: 'lire_portee', play_staff_notes: 'lire_portee',
  steps_quiz: 'construction_gammes', step_theory: 'construction_gammes', major_scale_theory: 'construction_gammes', scale_next: 'construction_gammes',
  interval_theory: 'intervalles_theorie',
  triad_theory: 'accords_theorie', diatonic_theory: 'accords_theorie', function_family: 'accords_theorie',
  cadence_theory: 'harmonie_theorie', ii_v_i_theory: 'harmonie_theorie', circle_theory: 'harmonie_theorie', borrowed_origin: 'harmonie_theorie',
  mode_theory: 'modes_theorie', mode_parent: 'modes_theorie',
  key_sig_identify: 'armures',
  grid_read: 'grilles',
  build_interval: 'construire_intervalles',
  build_chord: 'construire_accords', build_triad: 'construire_accords', build_seventh: 'construire_accords', guide_tones: 'construire_accords',
  build_scale: 'construire_gammes', key_sig_scale: 'construire_gammes',

  find_keys: 'notes_instrument', find_note: 'notes_instrument', find_notes_series: 'notes_instrument', name_play: 'notes_instrument', find_tonic: 'notes_instrument', name_the_note: 'notes_instrument',
  find_function: 'fonctions_instrument', step_on_instrument: 'fonctions_instrument',
  interval_play: 'intervalles_instrument',
  play_chord: 'accords_instrument', chord_shape: 'accords_instrument',
  play_pattern: 'gammes_instrument', position_scale: 'gammes_instrument', one_string_scale: 'gammes_instrument', five_finger: 'gammes_instrument', minor_scale_play: 'gammes_instrument', hands_together: 'gammes_instrument',
  position_arpeggio: 'arpeges_instrument', progression_arpeggio_play: 'arpeges_instrument',
  grid_bass_play: 'basses_instrument', fifths_bass_play: 'basses_instrument',
  target_thirds: 'notes_cibles',
  qa_constraints: 'improviser', free_play: 'improviser',
};

export const skillOf = (t: Pick<ExerciseTemplate, 'generator'>): SkillId => GENERATOR_SKILL[t.generator];
export const areaOf = (t: Pick<ExerciseTemplate, 'generator'>): Area => SKILLS[skillOf(t)].area;
export const skillTitle = (id: string) => (SKILLS as Record<string, { title: string }>)[id]?.title ?? id;
export const skillArea = (id: string): Area | undefined => (SKILLS as Record<string, { area: Area }>)[id]?.area;
