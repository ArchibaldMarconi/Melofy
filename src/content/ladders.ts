// Échelles de niveau des parties 2 à 4 du workout (0.20.0) : ce que propose chaque partie après chaque leçon vue.
// La ligne de la leçon la plus avancée donne le travail du jour ; les lignes d'avant reviennent en révision.
// Une ligne n'entre dans le workout que si sa leçon a été vue (l'explication avant la pratique).
import type { Params } from './types';

export type LadderPart = 'oreille' | 'mapping' | 'perroquet';
export interface LadderEntry { lesson: string; templateId: string; params?: Params }

export const LADDERS: Record<LadderPart, LadderEntry[]> = {
  // ---------- 2. Ear training ----------
  oreille: [
    { lesson: 'fondations', templateId: 'OR-1-01', params: { questions: 5 } }, // plus aigu ou plus grave ?
    { lesson: 'fondations', templateId: 'OR-1-15', params: { questions: 5 } }, // ton ou demi-ton ?
    { lesson: 'mesure', templateId: 'RY-1-07', params: { questions: 4 } }, // binaire ou ternaire ?
    { lesson: 'mesure', templateId: 'RY-1-10', params: { questions: 4, mesures_possibles: [2, 3, 4] } }, // combien de temps par mesure ?
    { lesson: 'gamme_majeure', templateId: 'OR-1-16', params: { questions: 4 } }, // la gamme est-elle juste ?
    { lesson: 'degres', templateId: 'OR-2-01', params: { degres: [1, 2, 3], questions: 5 } }, // quel degré après la cadence
    { lesson: 'degres', templateId: 'OR-1-17', params: { questions: 5 } }, // stable ou instable ?
    { lesson: 'degres', templateId: 'OR-2-01', params: { degres: [1, 2, 3, 4, 5], questions: 5 } },
    { lesson: 'accords', templateId: 'OR-2-08', params: { questions: 5 } }, // I, IV ou V, la tonique d'abord
    { lesson: 'armure', templateId: 'OR-2-16', params: { questions: 4 } }, // la mélodie respecte-t-elle l'armure ?
    { lesson: 'pentatonique', templateId: 'OR-2-10', params: { questions: 4 } }, // penta ou pas ?
    { lesson: 'pentatonique', templateId: 'OR-2-03', params: { degres: [1, 2, 3, 5, 6], questions: 5 } },
    { lesson: 'intervalles', templateId: 'OR-3-05', params: { questions: 5 } },
    { lesson: 'intervalles', templateId: 'OR-3-06', params: { questions: 5 } },
    { lesson: 'mineurs', templateId: 'OR-3-01', params: { questions: 5 } },
    { lesson: 'mineurs', templateId: 'OR-3-02' },
    { lesson: 'mineurs', templateId: 'OR-3-13', params: { questions: 4 } }, // naturel, harmonique ou mélodique ?
    { lesson: 'accords_gamme', templateId: 'OR-2-08', params: { accords: [1, 4, 5, 6], questions: 5 } }, // + vi
    { lesson: 'accords_gamme', templateId: 'OR-3-11' }, // dictée de grille
    { lesson: 'quintes', templateId: 'OR-4-02' },
    { lesson: 'ii_v_i', templateId: 'OR-4-01', params: { questions: 5, qualites: ['maj7', 'dom7', 'm7'] } }, // couleur des 7e
    { lesson: 'ii_v_i', templateId: 'OR-4-03' },
    { lesson: 'swing', templateId: 'OR-4-04', params: { questions: 4 } },
    { lesson: 'modes', templateId: 'OR-5-01', params: { modes: ['ionien', 'eolien'] } },
    { lesson: 'mode_dorien', templateId: 'OR-5-01', params: { modes: ['eolien', 'dorien'] } },
    { lesson: 'mode_mixolydien', templateId: 'OR-5-01', params: { modes: ['ionien', 'mixolydien', 'dorien'] } },
    { lesson: 'mode_lydien', templateId: 'OR-5-01', params: { modes: ['ionien', 'lydien', 'mixolydien'] } },
    { lesson: 'mode_phrygien', templateId: 'OR-5-01', params: { modes: ['eolien', 'dorien', 'phrygien'] } },
    { lesson: 'emprunts', templateId: 'OR-5-03' },
    { lesson: 'emprunts', templateId: 'OR-5-05' },
    { lesson: 'impaires', templateId: 'RY-5-03', params: { questions: 4 } },
    { lesson: 'dominantes_secondaires', templateId: 'OR-6-01', params: { questions: 4 } },
    { lesson: 'extensions', templateId: 'OR-6-02', params: { questions: 4 } },
    { lesson: 'modes_melodique', templateId: 'OR-6-03', params: { questions: 4 } },
  ],
  // ---------- 3. Mapping : l'appli affiche, tu joues ----------
  mapping: [
    { lesson: 'fondations', templateId: 'MP-1-01' }, // une note nommée
    { lesson: 'fondations', templateId: 'TE-1-09' }, // un ton, un demi-ton depuis une note
    { lesson: 'gamme_majeure', templateId: 'TE-1-07' }, // la gamme de do
    { lesson: 'degres', templateId: 'TE-1-08' }, // un degré depuis la tonique marquée
    { lesson: 'portee', templateId: 'TE-1-06' }, // une note lue sur la portée
    { lesson: 'accords', templateId: 'TE-2-05' }, // un accord I, IV ou V
    { lesson: 'armure', templateId: 'TE-2-13' }, // la gamme d'une armure
    { lesson: 'pentatonique', templateId: 'TH-2-07', params: { tonalites: ['C', 'G', 'F'] } }, // la penta d'une tonalité
    { lesson: 'intervalles', templateId: 'TH-2-04' }, // un intervalle depuis une note
    { lesson: 'intervalles', templateId: 'TE-3-07', params: { intervalles: [3, 4, 5, 7, 8, 9] } }, // l'intervalle affiché, joué
    { lesson: 'mineurs', templateId: 'TE-3-01' }, // une gamme mineure
    { lesson: 'mineurs', templateId: 'TE-3-08' }, // naturel, harmonique ou mélodique, à jouer
    { lesson: 'accords_gamme', templateId: 'TE-3-03' }, // un accord de la gamme
    { lesson: 'accords_gamme', templateId: 'TE-3-09' }, // la basse d'une grille
    { lesson: 'quintes', templateId: 'TE-4-06', params: { longueur: 4, tonalites: ['C', 'G', 'F'] } }, // basses de quinte en quinte
    { lesson: 'ii_v_i', templateId: 'TE-4-01' }, // un accord de 7e
    { lesson: 'cle_fa', templateId: 'TE-4-03' }, // lire en clé de fa
    { lesson: 'modes', templateId: 'TE-5-01', params: { tokens: ['1', '2', 'b3', '4', '5', '6', 'b7', '8', 'b7', '6', '5', '4', 'b3', '2', '1'], tonalite: 'D', tempo: 60 } }, // ré dorien : do majeur de ré à ré
    { lesson: 'mode_dorien', templateId: 'TE-5-01' }, // le dorien depuis une tonique
    { lesson: 'mode_mixolydien', templateId: 'TE-5-01', params: { tokens: ['1', '2', '3', '4', '5', '6', 'b7', '8', 'b7', '6', '5', '4', '3', '2', '1'] } },
    { lesson: 'mode_lydien', templateId: 'TE-5-01', params: { tokens: ['1', '2', '3', '#4', '5', '6', '7', '8', '7', '6', '5', '#4', '3', '2', '1'] } },
    { lesson: 'mode_phrygien', templateId: 'TE-5-01', params: { tokens: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7', '8', 'b7', 'b6', '5', '4', 'b3', 'b2', '1'] } },
    { lesson: 'emprunts', templateId: 'TE-5-05' }, // arpèges avec accord emprunté
    { lesson: 'portee', templateId: 'TE-2-16', params: { figures: ['noire'], mesures: 1 } }, // lecture à vue en rythme
    { lesson: 'dominantes_secondaires', templateId: 'TH-6-01' },
    { lesson: 'extensions', templateId: 'TH-6-02' },
    { lesson: 'conduite_voix', templateId: 'TE-6-02' },
    { lesson: 'modes_melodique', templateId: 'TE-6-01' },
  ],
  // ---------- 4. Perroquet : l'appli joue, tu rejoues ----------
  perroquet: [
    { lesson: 'fondations', templateId: 'IM-1-04', params: { degres: [1, 2, 3], nb_notes: 2, conjoint: true } }, // 2 notes
    { lesson: 'degres', templateId: 'IM-1-01', params: { degres: [1, 2, 3], nb_notes: 2, conjoint: true } }, // 2 notes
    { lesson: 'mesure', templateId: 'RY-1-04' }, // perroquet rythmique
    { lesson: 'degres', templateId: 'IM-2-01', params: { degres: [1, 2, 3, 4, 5], nb_notes: 3, conjoint: true } },
    { lesson: 'degres', templateId: 'IM-2-01', params: { degres: [1, 2, 3, 4, 5], nb_notes: 4 } },
    { lesson: 'armure', templateId: 'RP-2-03' }, // la mélodie, puis l'écrire
    { lesson: 'accords', templateId: 'IM-2-01', params: { degres: [1, 2, 3, 4, 5, 6], nb_notes: 4, accompagnement: 'I-IV-V-I', bourdon: false } }, // sur un accompagnement
    { lesson: 'armure', templateId: 'IM-2-01', params: { degres: [1, 2, 3, 4, 5, 6, 7], nb_notes: 5, tonalite: 'varie', bourdon: false } },
    { lesson: 'pentatonique', templateId: 'IM-2-01', params: { degres: [1, 2, 3, 5, 6], nb_notes: 5 } },
    { lesson: 'pentatonique', templateId: 'IM-2-03' }, // question-réponse
    { lesson: 'intervalles', templateId: 'IM-2-01', params: { degres: [1, 2, 3, 4, 5, 6, 7], nb_notes: 5, conjoint: false } }, // avec des sauts
    { lesson: 'accords_gamme', templateId: 'IM-3-01' },
    { lesson: 'accords_gamme', templateId: 'PQ-3-01' }, // reproduire la basse
    { lesson: 'syncopes', templateId: 'RY-3-02' },
    { lesson: 'ii_v_i', templateId: 'IM-2-01', params: { degres: [1, 2, 3, 4, 5, 6, 7], nb_notes: 5, accompagnement: 'ii-V-I-I', bourdon: false } },
    { lesson: 'swing', templateId: 'RY-4-02' },
    { lesson: 'mode_dorien', templateId: 'IM-5-01' },
    { lesson: 'mode_dorien', templateId: 'OR-5-06' }, // chanter la note du mode (si l'élève chante)
    { lesson: 'mode_mixolydien', templateId: 'IM-5-01', params: { degres: ['1', '2', '3', '4', '5', '6', 'b7'] } },
    { lesson: 'mode_lydien', templateId: 'IM-5-01', params: { degres: ['1', '2', '3', '#4', '5', '6', '7'] } },
    { lesson: 'mode_phrygien', templateId: 'IM-5-01', params: { degres: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'] } },
    { lesson: 'emprunts', templateId: 'PQ-3-01', params: { grilles: ['I-vi-IV-V', 'I-V-vi-IV', 'I-ii-V-I'] } },
    { lesson: 'impaires', templateId: 'RY-5-02' },
    { lesson: 'ii_v_i', templateId: 'RP-4-01' }, // repiquer une phrase plus longue
    { lesson: 'conduite_voix', templateId: 'TE-6-03' },
  ],
};
