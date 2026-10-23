// Le cursus (0.20.0, modes en phase propre depuis 0.22.0, réordonné en 0.24.0) : 23 leçons, dans l'ordre de l'arbre. Chaque notion de l'arbre appartient à une leçon ;
// une leçon s'ouvre quand les leçons dont elle découle sont validées.
import { PALIER1 } from './palier1';
import { PALIER2 } from './palier2';
import { PALIER3 } from './palier3';
import { PALIER4 } from './palier4';
import { PALIER5 } from './palier5';
import { MODES_LESSONS } from './modes';
import type { DeepLesson } from './types';
import type { Instrument } from '../types';

export type Phase = 1 | 2 | 3 | 4 | 5 | 6;
/** rattachement : leçons parentes, notions de l'arbre, phase du cursus */
export const CURSUS_META: Record<string, { parents: string[]; concepts: string[]; phase: Phase }> = {
  fondations: { parents: [], concepts: ['grave_aigu', 'notes_instrument'], phase: 1 },
  mesure: { parents: [], concepts: ['pulsation', 'noire_blanche_silence'], phase: 1 },
  // 0.24.1 : « Toute la gamme : 6, 7 et la sensible » passe à la leçon 3 (ses exercices parlent en degrés)
  gamme_majeure: { parents: ['fondations'], concepts: ['gamme_do'], phase: 1 },
  degres: { parents: ['gamme_majeure'], concepts: ['tonique', 'degres_1_3', 'degres_1_5', 'gamme_majeure', 'tierce_majeure', 'premiere_impro'], phase: 1 },
  portee: { parents: ['gamme_majeure'], concepts: ['lecture_portee'], phase: 2 },
  // 0.24.0 : les intervalles avant les accords (on empile des tierces qu'on connaît déjà)
  intervalles: { parents: ['degres'], concepts: ['intervalles_tous'], phase: 2 },
  accords: { parents: ['intervalles'], concepts: ['accords_145', 'enchainer'], phase: 2 },
  armure: { parents: ['degres', 'portee'], concepts: ['noms_notes'], phase: 2 },
  pentatonique: { parents: ['degres', 'accords'], concepts: ['penta_majeure'], phase: 2 },
  mineurs: { parents: ['armure', 'pentatonique'], concepts: ['mineur_relatif', 'degres_mineur'], phase: 3 },
  accords_gamme: { parents: ['accords', 'mineurs'], concepts: ['triades', 'accords_diatoniques', 'blues'], phase: 3 },
  syncopes: { parents: ['mesure'], concepts: ['syncopes'], phase: 3 },
  quintes: { parents: ['armure', 'accords_gamme'], concepts: ['cadences'], phase: 4 },
  ii_v_i: { parents: ['accords_gamme', 'quintes'], concepts: ['accords_7', 'ii_v_i', 'notes_cibles'], phase: 4 },
  swing: { parents: ['syncopes'], concepts: ['swing'], phase: 4 },
  // clé de fa : ouverte dès la portée ; au piano, elle se place juste après elle (voir lessonsFor)
  cle_fa: { parents: ['portee'], concepts: ['cle_fa'], phase: 4 },
  // 0.24.0 : les modes ne s'enchaînent plus d'un bloc ; une leçon de rythme et une d'harmonie laissent les couleurs décanter
  modes: { parents: ['mineurs', 'accords_gamme'], concepts: ['modes', 'impro_modale'], phase: 5 },
  mode_dorien: { parents: ['modes'], concepts: [], phase: 5 },
  mode_mixolydien: { parents: ['modes'], concepts: ['manche_complet'], phase: 5 },
  impaires: { parents: ['swing'], concepts: ['mesures_impaires'], phase: 5 },
  emprunts: { parents: ['mode_mixolydien'], concepts: ['emprunts', 'modulation'], phase: 5 },
  mode_lydien: { parents: ['emprunts'], concepts: [], phase: 5 },
  mode_phrygien: { parents: ['mode_dorien'], concepts: [], phase: 5 },
};
export const CURSUS_ORDER = Object.keys(CURSUS_META);

const ALL: DeepLesson[] = [...PALIER1, ...PALIER2, ...PALIER3, ...PALIER4, ...MODES_LESSONS, ...PALIER5];
export const DEEP_LESSONS: (DeepLesson & { parents: string[]; concepts: string[]; phase: Phase })[] = CURSUS_ORDER.map((id) => {
  const l = ALL.find((x) => x.id === id);
  if (!l) throw new Error(`leçon manquante : ${id}`);
  return { ...l, ...CURSUS_META[id] };
});
export const deepLessonById = (id: string) => DEEP_LESSONS.find((l) => l.id === id);
/** la leçon qui porte une notion de l'arbre */
export const lessonOfConcept = (conceptId: string) => DEEP_LESSONS.find((l) => l.concepts.includes(conceptId));
export const PHASE_LABEL: Record<number, string> = { 1: 'Premières victoires', 2: 'Fondations', 3: 'Couleurs', 4: 'Harmonie', 5: 'Les modes et leurs voisins' };
export const PHASES = Object.keys(PHASE_LABEL).map(Number) as Phase[];

/** Le cursus tel que le voit l'élève : au piano, la clé de fa (main gauche) arrive juste après la portée, en phase 2.
 *  L'ouverture des leçons ne change pas (elle dépend des leçons parentes) ; seuls l'ordre et la phase affichés bougent. */
export function lessonsFor(instrument?: Instrument): typeof DEEP_LESSONS {
  if (instrument !== 'piano') return DEEP_LESSONS;
  const fa = DEEP_LESSONS.find((l) => l.id === 'cle_fa')!;
  const rest = DEEP_LESSONS.filter((l) => l.id !== 'cle_fa');
  const at = rest.findIndex((l) => l.id === 'portee') + 1;
  return [...rest.slice(0, at), { ...fa, phase: 2 }, ...rest.slice(at)];
}
