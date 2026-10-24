// Le cursus (0.20.0) : tout s'ouvre par les leçons.
//  - une leçon s'ouvre quand toutes les leçons dont elle découle sont validées (validation rapide en fin de leçon) ;
//  - ses notions et leurs exercices entrent dans le workout dès que ses écrans ont été vus : l'explication
//    précède toujours la pratique, aucun exercice ne demande une notion jamais expliquée ;
//  - la confirmation, quelques jours plus tard dans le workout, valide définitivement la leçon.
import type { CompetenceState, ExerciseTemplate, Instrument } from '../content/types';
import { DEEP_LESSONS, lessonOfConcept, lessonsFor } from '../content/deep';
import { TEMPLATES } from '../content/templates';
import { isAcquired } from './fsrs';

export interface LessonProgress {
  /** leçons dont les écrans ont été vus (l'explication est connue) */
  seen: string[];
  /** leçons validées (validation rapide en fin de leçon) */
  done: string[];
  /** leçons confirmées dans le workout, quelques jours après */
  confirmed: string[];
  /** jour de la validation rapide, par leçon */
  doneDay?: Record<string, string>;
  /** jours où chaque exercice a été réussi (pour savoir quand la confirmation est prête) */
  practiceDays?: Record<string, string[]>;
  /** tout ouvert (réglage de test) */
  unlockAll?: boolean;
}

export type LessonState = 'verrouillee' | 'ouverte' | 'vue' | 'validee' | 'confirmee';
type Lesson = (typeof DEEP_LESSONS)[number];

export const lessonOpen = (l: Lesson, p: LessonProgress) => !!p.unlockAll || l.parents.every((x) => p.done.includes(x));
export const lessonSeen = (id: string, p: LessonProgress) => p.seen.includes(id) || p.done.includes(id) || p.confirmed.includes(id);

export function lessonState(l: Lesson, p: LessonProgress): LessonState {
  if (p.confirmed.includes(l.id)) return 'confirmee';
  if (p.done.includes(l.id)) return 'validee';
  if (lessonSeen(l.id, p)) return 'vue';
  return lessonOpen(l, p) ? 'ouverte' : 'verrouillee';
}

/** une notion est pratiquable quand la leçon qui la porte a été vue (une notion sans leçon l'est toujours) */
export function conceptAvailable(conceptId: string, p: LessonProgress): boolean {
  if (p.unlockAll) return true;
  const l = lessonOfConcept(conceptId);
  return !l || lessonSeen(l.id, p);
}

export function templateAvailable(t: ExerciseTemplate, p: LessonProgress): { ok: boolean; reason?: string } {
  for (const cid of t.concepts) {
    if (conceptAvailable(cid, p)) continue;
    const l = lessonOfConcept(cid)!;
    const missing = l.parents.filter((x) => !p.done.includes(x)).map((x) => DEEP_LESSONS.find((y) => y.id === x)?.title ?? x);
    return { ok: false, reason: lessonOpen(l, p)
      ? `Fais d'abord la leçon ${l.number} « ${l.title} » : l'explication avant la pratique.`
      : `S'ouvre avec la leçon ${l.number} « ${l.title} », après la validation de : ${missing.join(', ')}.` };
  }
  return { ok: true };
}

/** les leçons dont l'élève doit d'abord voir l'explication, prêtes à être ouvertes */
export const lessonsToDiscover = (p: LessonProgress, instrument?: Instrument) => lessonsFor(instrument).filter((l) => lessonState(l, p) === 'ouverte');

/** exercices de pratique d'une leçon pour cet instrument */
export const practiceOf = (l: Lesson, instrument: Instrument) => l.practice.filter((x) => !x.only || x.only === instrument);

/**
 * Confirmation prête : la leçon est validée (pas aujourd'hui), pas encore confirmée, et chacun de ses exercices de
 * pratique a été réussi au moins 2 fois, sur 2 jours différents.
 */
export function readyToConfirm(l: Lesson, p: LessonProgress, instrument: Instrument, today: string): boolean {
  if (!p.done.includes(l.id) || p.confirmed.includes(l.id)) return false;
  if ((p.doneDay?.[l.id] ?? '') === today) return false;
  return practiceOf(l, instrument).every((x) => new Set(p.practiceDays?.[x.templateId] ?? []).size >= 2);
}

/** progression vers la confirmation : exercices de pratique réussis sur 2 jours / total */
export function confirmProgress(l: Lesson, p: LessonProgress, instrument: Instrument): { done: number; total: number } {
  const xs = practiceOf(l, instrument);
  return { done: xs.filter((x) => new Set(p.practiceDays?.[x.templateId] ?? []).size >= 2).length, total: xs.length };
}

/**
 * Leçons déjà acquises d'après les compétences (anciens profils, test de placement) :
 * toutes les notions de la leçon qui ont des exercices sont acquises → vue, validée et confirmée ;
 * toutes au moins pratiquées → vue.
 */
export function lessonsFromCompetences(comps: Record<string, CompetenceState>): { seen: string[]; acquired: string[] } {
  const cs = Object.values(comps);
  const acquired = new Set(cs.filter((c) => isAcquired(c)).map((c) => c.conceptId));
  const practiced = new Set(cs.filter((c) => c.reps > 0).map((c) => c.conceptId));
  return lessonsFromConcepts(acquired, practiced);
}

/**
 * Leçons acquises d'après des notions acquises (placement, anciens profils), dans l'ordre du cursus :
 *  - une leçon n'est acquise que si ses leçons parentes le sont (jamais une confirmation au-dessus d'un trou) ;
 *  - une leçon sans notion propre (les modes un par un) l'est quand les notions de sa validation le sont ;
 *  - une leçon dont toutes les notions sont au moins pratiquées, et dont les parents sont acquis, est vue.
 */
export function lessonsFromConcepts(acquired: Set<string>, practiced: Set<string> = acquired): { seen: string[]; acquired: string[] } {
  const seen: string[] = [];
  const got = new Set<string>();
  for (const l of DEEP_LESSONS) {
    if (!l.parents.every((p) => got.has(p))) continue;
    let own = l.concepts.filter((cid) => TEMPLATES.some((t) => t.concepts.includes(cid)));
    if (!own.length) own = TEMPLATES.find((t) => t.id === l.validation.templateId)?.concepts ?? [];
    if (!own.length) continue;
    if (own.every((cid) => acquired.has(cid))) { got.add(l.id); seen.push(l.id); }
    else if (own.every((cid) => practiced.has(cid) || acquired.has(cid))) seen.push(l.id);
  }
  return { seen, acquired: [...got] };
}

/** la plus avancée des leçons vues (ordre du cursus), pour régler le niveau des parties du workout */
export const latestSeen = (p: LessonProgress) => [...DEEP_LESSONS].reverse().find((l) => lessonSeen(l.id, p));
