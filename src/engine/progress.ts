// Progression affichée (Moi) : les compétences, par domaine. Ouverte = une leçon vue y donne accès ;
// commencée = déjà réussie ; solide = bien retenue sur plusieurs jours (FSRS).
import type { CompetenceState } from '../content/types';
import { TEMPLATES } from '../content/templates';
import { AREAS, SKILLS, skillOf, type Area, type SkillId } from '../content/skills';
import { currentR, isAcquired, isMastered } from './fsrs';
import { templateAvailable, type LessonProgress } from './cursus';
import { cardOf } from './srs';

export type SkillState = 'ouverte' | 'commencee' | 'solide';
export interface AreaProgress { total: number; started: number; solid: number; recall: number; skills: { id: SkillId; title: string; state: SkillState }[] }

export function skillStates(comps: Record<string, CompetenceState>, p: LessonProgress, now: number): Map<SkillId, { state: SkillState; recall: number }> {
  const out = new Map<SkillId, { state: SkillState; recall: number }>();
  const bySkill = new Map<SkillId, typeof TEMPLATES>();
  for (const t of TEMPLATES) {
    if (!templateAvailable(t, p).ok) continue;
    const k = skillOf(t);
    bySkill.set(k, [...(bySkill.get(k) ?? []), t]);
  }
  for (const [k, ts] of bySkill) {
    const cards = [...new Set(ts.map((t) => cardOf(t, comps)).filter((c): c is CompetenceState => !!c && c.reps > 0))];
    const acquired = cards.filter((c) => isAcquired(c));
    const state: SkillState = acquired.length && acquired.every((c) => isMastered(c, now)) ? 'solide' : acquired.length ? 'commencee' : 'ouverte';
    const recall = acquired.length ? acquired.reduce((s, c) => s + currentR(c, now), 0) / acquired.length : 0;
    out.set(k, { state, recall });
  }
  return out;
}

export function areaProgress(comps: Record<string, CompetenceState>, p: LessonProgress, now: number): Record<Area, AreaProgress> {
  const states = skillStates(comps, p, now);
  const res = {} as Record<Area, AreaProgress>;
  for (const a of AREAS) {
    const skills = (Object.keys(SKILLS) as SkillId[]).filter((k) => SKILLS[k].area === a && states.has(k))
      .map((k) => ({ id: k, title: SKILLS[k].title, state: states.get(k)!.state }));
    const started = skills.filter((s) => s.state !== 'ouverte');
    res[a] = {
      total: skills.length, started: started.length, solid: skills.filter((s) => s.state === 'solide').length,
      recall: started.length ? started.reduce((s, x) => s + states.get(x.id)!.recall, 0) / started.length : 0,
      skills,
    };
  }
  return res;
}
