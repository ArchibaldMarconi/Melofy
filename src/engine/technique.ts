// Module technique du workout (0.20.0) : une gamme à la fois, celle de la dernière leçon vue, en étapes.
// On ne passe à l'étape suivante qu'après l'avoir réussie ; la dernière se joue au métronome à vitesse évolutive
// (+4 BPM après 2 réussites propres, −4 après 2 échecs : voir recordTechnique dans le store).
//  Guitare : degrés → une corde → positions (guidée, fondamentales, de mémoire) et liaisons → métronome.
//  Piano : degrés → 5 doigts (droite, gauche) → une octave main droite puis gauche → mains ensemble → accords → métronome.
//  Modes (0.22.0) : sans degrés ni 5 doigts ni accords : une corde puis positions (guitare), une octave par main (piano), métronome.
import type { Instrument, Params } from '../content/types';
import type { LessonProgress } from './cursus';
import { lessonSeen } from './cursus';
import { DEEP_LESSONS } from '../content/deep';

export interface TechScale { key: string; lesson: string; label: string; gamme: string; fonctions: number[]; mineur?: boolean; /** un mode (0.22.0) : ni degrés majeurs/mineurs, ni 5 doigts, ni accords I-IV-V */ mode?: boolean }
export const TECH_SCALES: TechScale[] = [
  { key: 'majeure', lesson: 'gamme_majeure', label: 'la gamme majeure', gamme: 'majeure', fonctions: [2, 3, 4, 5, 6, 7] },
  { key: 'penta_majeure', lesson: 'pentatonique', label: 'la pentatonique majeure', gamme: 'penta_majeure', fonctions: [2, 3, 5, 6] },
  { key: 'mineure', lesson: 'mineurs', label: 'la gamme mineure', gamme: 'mineure', fonctions: [2, 3, 4, 5, 6, 7], mineur: true },
  { key: 'penta_mineure', lesson: 'accords_gamme', label: 'la pentatonique mineure', gamme: 'penta_mineure', fonctions: [3, 4, 5, 7], mineur: true },
  { key: 'dorien', lesson: 'mode_dorien', label: 'le dorien', gamme: 'dorien', fonctions: [], mode: true },
  { key: 'mixolydien', lesson: 'mode_mixolydien', label: 'le mixolydien', gamme: 'mixolydien', fonctions: [], mode: true },
  { key: 'lydien', lesson: 'mode_lydien', label: 'le lydien', gamme: 'lydien', fonctions: [], mode: true },
  { key: 'phrygien', lesson: 'mode_phrygien', label: 'le phrygien', gamme: 'phrygien', fonctions: [], mode: true },
];

export interface TechStep { label: string; templateId: string; params: Params; kind: 'step' | 'tempo'; needsInstrument?: boolean }

export function techSteps(sc: TechScale, instrument: Instrument): TechStep[] {
  const g = sc.gamme;
  const degrees: TechStep = { label: `Les degrés de ${sc.label}`, templateId: 'TE-2-08', params: { fonctions: sc.fonctions, mineur: !!sc.mineur, nb_cibles: 3 }, kind: 'step' };
  if (instrument === 'guitare') {
    const steps: TechStep[] = [...(sc.mode ? [] : [degrees]), { label: sc.mode ? 'Le mode sur une corde' : 'La gamme sur une corde', templateId: 'TQ-1-01', params: { gamme: g }, kind: 'step' }];
    for (let pos = 1; pos <= 5; pos++) {
      for (const [guide, what] of [['complet', 'guidée'], ['fondamentale', 'fondamentales seules'], ['aucun', 'de mémoire']] as const) {
        steps.push({ label: `Position ${pos}, ${what}`, templateId: 'TE-2-09', params: { gamme: g, position: pos, guide, aller_retour: true }, kind: 'step' });
      }
      if (pos > 1) steps.push({ label: `Relier les positions ${pos - 1} et ${pos}`, templateId: 'TE-2-15', params: { gamme: g, position: pos - 1, relier: true, guide: 'fondamentale' }, kind: 'step' });
    }
    steps.push({ label: 'Au métronome, vitesse évolutive', templateId: 'TE-2-11', params: { gamme: g, position: 1, guide: 'aucun' }, kind: 'tempo' });
    return steps;
  }
  const steps: TechStep[] = [
    ...(sc.mode ? [] : [
      degrees,
      { label: 'Position de 5 doigts, main droite', templateId: 'TQ-1-02', params: { main: 'droite', gamme: g }, kind: 'step' as const },
      { label: 'Position de 5 doigts, main gauche', templateId: 'TQ-1-02', params: { main: 'gauche', gamme: g }, kind: 'step' as const },
    ]),
    { label: 'Une octave, main droite, doigté affiché', templateId: 'TE-2-09', params: { gamme: g, guide: 'complet', aller_retour: true }, kind: 'step' },
    { label: 'Une octave, main droite, de mémoire', templateId: 'TE-2-09', params: { gamme: g, guide: 'aucun', aller_retour: true }, kind: 'step' },
    { label: 'Une octave, main gauche, doigté affiché', templateId: 'TE-2-09', params: { gamme: g, guide: 'complet', aller_retour: true, main: 'gauche' }, kind: 'step' },
    { label: 'Une octave, main gauche, de mémoire', templateId: 'TE-2-09', params: { gamme: g, guide: 'aucun', aller_retour: true, main: 'gauche' }, kind: 'step' },
    ...(sc.mode ? [] : [
      { label: 'Mains ensemble, en miroir', templateId: 'TQ-1-03', params: { mouvement: 'contraire', tempo: 60 }, kind: 'step' as const, needsInstrument: true },
      { label: 'Mains ensemble, côte à côte', templateId: 'TQ-1-03', params: { mouvement: 'parallele', tempo: 60 }, kind: 'step' as const, needsInstrument: true },
    ]),
  ];
  if (!sc.mineur && !sc.mode) steps.push({ label: 'Les accords I, IV, V', templateId: 'TE-2-05', params: { accords: ['C', 'F', 'G'] }, kind: 'step' });
  steps.push({ label: 'Au métronome, vitesse évolutive', templateId: 'TE-2-11', params: { gamme: g, guide: 'aucun' }, kind: 'tempo' });
  return steps;
}

/** gamme travaillée : la plus récente des leçons vues dont la routine n'est pas finie ; sinon la plus récente */
export function currentTechScale(p: LessonProgress, tp: Record<string, { step: number }>, instrument: Instrument): TechScale | null {
  const order = (id: string) => DEEP_LESSONS.findIndex((l) => l.id === id);
  const seen = TECH_SCALES.filter((s) => lessonSeen(s.lesson, p)).sort((a, b) => order(b.lesson) - order(a.lesson));
  if (!seen.length) return null;
  return seen.find((s) => (tp[s.key]?.step ?? 0) < techSteps(s, instrument).length - 1) ?? seen[0];
}

export interface TechPick { step: TechStep; stepIndex: number; scale: TechScale; maxStep: number }

/**
 * Exercices du module pour `minutes` : l'étape en cours (deux fois), une révision de l'étape d'avant,
 * et le métronome dès qu'il est atteint. Sans instrument, les étapes qui en ont besoin sont sautées.
 */
export function techniquePicks(sc: TechScale, stepNow: number, minutes: number, instrument: Instrument, hasInstrument: boolean): TechPick[] {
  const steps = techSteps(sc, instrument);
  const maxStep = steps.length - 1;
  const usable = (i: number) => i >= 0 && i <= maxStep && (hasInstrument || !steps[i].needsInstrument);
  let cur = Math.min(stepNow, maxStep);
  while (!usable(cur) && cur < maxStep) cur++;
  const prev = (() => { for (let i = cur - 1; i >= 0; i--) if (usable(i)) return i; return -1; })();
  const n = minutes >= 10 ? 9 : 5;
  const seq: number[] = [];
  for (let k = 0; seq.length < n && k < 12; k++) {
    if (steps[cur].kind === 'tempo') seq.push(cur, cur, ...(prev >= 0 ? [prev] : []));
    else seq.push(cur, ...(prev >= 0 ? [prev] : []), cur);
  }
  return seq.slice(0, n).map((i) => ({ step: steps[i], stepIndex: i, scale: sc, maxStep }));
}
