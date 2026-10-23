// Titre affiché d'un exercice selon ses réglages (0.24.1) : un même modèle sert pour plusieurs gammes ou modes
// (« Joue le dorien » réglé sur le mixolydien, « Positions de la pentatonique » réglé sur un mode…). Le titre suit
// alors la gamme réellement jouée, au lieu de garder le nom générique du modèle.
import type { ExerciseTemplate, Instrument, Params } from './types';
import { MODES } from '../engine/chroma';

const NAME: Record<string, string> = {
  majeure: 'la gamme majeure', mineure: 'la gamme mineure', penta_majeure: 'la pentatonique majeure',
  penta_mineure: 'la pentatonique mineure', blues: 'la gamme blues', ionien: 'le mode ionien', eolien: 'le mode éolien',
  dorien: 'le dorien', phrygien: 'le phrygien', lydien: 'le lydien', mixolydien: 'le mixolydien', locrien: 'le locrien',
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** gamme jouée d'après les réglages : `gamme` nommée, ou `tokens` reconnus parmi les modes */
export function scaleOf(params?: Params): string | null {
  if (!params) return null;
  if (typeof params.gamme === 'string' && NAME[params.gamme]) return params.gamme;
  if (Array.isArray(params.tokens)) {
    const head = (params.tokens as unknown[]).map(String).slice(0, 7).join(' ');
    const hit = Object.entries(MODES).find(([, m]) => m.tokens.join(' ') === head);
    if (hit) return hit[0];
  }
  return null;
}

/** instrument : au piano, pas de « positions » (une notion de guitare) mais la gamme avec son doigté */
export function displayTitle(t: ExerciseTemplate, params?: Params, instrument?: Instrument): string {
  const pos = t.id === 'TE-2-09' || t.id === 'TE-2-10' || t.id === 'TE-3-04';
  const g = scaleOf(params) ?? (pos && instrument === 'piano' ? ({ 'TE-2-09': 'penta_majeure', 'TE-2-10': 'majeure', 'TE-3-04': 'penta_mineure' } as Record<string, string>)[t.id] : null);
  if (!g) return t.title;
  const name = NAME[g];
  switch (t.id) {
    case 'TE-5-01': case 'TE-5-02': return `Joue ${name}`;
    case 'TE-2-09': case 'TE-2-10': case 'TE-3-04': return instrument === 'piano' ? `${cap(name)}, avec le doigté` : `Positions : ${name}`;
    case 'TQ-1-01': return `${cap(name)} sur une corde`;
    default: return t.title;
  }
}
