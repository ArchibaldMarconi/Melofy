// Migrations de l'état sauvegardé : une mise à jour de l'appli ne doit jamais faire perdre de progression.
// Chaque version décrit ce qui change ; `migrate` applique toutes les étapes depuis la version sauvegardée.
// Règle pour les devs : tout renommage d'identifiant ou de champ = une nouvelle version ici + un test.

export const STORE_VERSION = 7;

/** identifiants d'exercices renommés */
export const RENAMED_TEMPLATES: Record<string, string> = {
  'TH-2-02': 'TH-1-05', // « Tons et demi-tons » passé au palier 1 (gamme de do)
};

import type { CompetenceState } from '../content/types';
import { lessonsFromCompetences } from '../engine/cursus';
import { TEMPLATES } from '../content/templates';
import { skillOf } from '../content/skills';

type AnyState = Record<string, unknown>;

const renameKeys = (obj: unknown) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) out[RENAMED_TEMPLATES[k] ?? k] = v;
  return out;
};

export function migrate(persisted: unknown, fromVersion: number): AnyState {
  const s: AnyState = { ...((persisted as AnyState) ?? {}) };
  if (fromVersion < 1) {
    // v0 → v1 : champs ajoutés au fil des sprints, avec leurs valeurs par défaut
    s.levels ??= {};
    s.avgTimeS ??= {};
    s.seenPoints ??= [];
    s.onboarded ??= true; // un ancien utilisateur a forcément déjà passé l'accueil
    s.placementPending ??= false;
  }
  if (fromVersion < 2) {
    // v1 → v2 : exercices renommés (niveaux et temps mesurés suivent l'exercice)
    s.levels = renameKeys(s.levels);
    s.avgTimeS = renameKeys(s.avgTimeS);
  }
  if (fromVersion < 3) {
    // v2 → v3 : écran « Nouveautés » ; un utilisateur existant n'a encore rien vu
    s.seenRelease ??= '0.9.0';
  }
  if (fromVersion < 4) {
    // v3 → v4 (0.20.0) : le cursus. Les leçons déjà faites restent vues et validées ; celles dont toutes les notions
    // sont acquises sont validées et confirmées d'office ; celles déjà pratiquées sont vues. Rien n'est perdu.
    const done = (s.deepLessonsDone as string[] | undefined) ?? [];
    const fromComps = lessonsFromCompetences((s.competences ?? {}) as Record<string, CompetenceState>);
    s.deepLessonsSeen = [...new Set([...done, ...fromComps.seen])];
    s.deepLessonsDone = [...new Set([...done, ...fromComps.acquired])];
    s.deepLessonsConfirmed = [...fromComps.acquired];
    s.deepLessonsDoneDay ??= {};
    s.practiceDays ??= {};
    s.techProgress ??= {};
  }
  if (fromVersion < 5) {
    // v4 → v5 (0.23.0) : la leçon « modes » (14) a été entièrement réécrite en présentation, suivie d'une leçon
    // par mode. L'ancienne lecture ne vaut plus : la leçon redevient à découvrir, et ses exercices attendent qu'elle soit vue.
    const drop = (k: string) => { if (Array.isArray(s[k])) s[k] = (s[k] as string[]).filter((x) => x !== 'modes'); };
    drop('deepLessonsSeen'); drop('deepLessonsDone'); drop('deepLessonsConfirmed');
    if (s.deepLessonsDoneDay && typeof s.deepLessonsDoneDay === 'object') {
      const d = { ...(s.deepLessonsDoneDay as Record<string, string>) };
      delete d.modes;
      s.deepLessonsDoneDay = d;
    }
  }
  if (fromVersion < 6) {
    // v5 → v6 (0.25.0) : la consigne complète n'est montrée qu'à la 1re rencontre d'un exercice ;
    // les exercices déjà faits (temps mesuré) comptent comme déjà vus.
    s.seenTemplates ??= Object.keys((s.avgTimeS as Record<string, number> | undefined) ?? {});
  }
  if (fromVersion < 7) {
    // v6 → v7 (0.25.0) : une carte de révision par compétence au lieu d'une par notion × domaine. Chaque ancienne carte
    // pratiquée passe à la compétence de ses exercices ; quand plusieurs se rejoignent, on garde la plus travaillée,
    // avec la révision due la plus proche (on revérifie tôt plutôt que trop tard). L'historique des intervalles disparaît.
    const old = (s.competences ?? {}) as Record<string, CompetenceState>;
    const out: Record<string, CompetenceState> = {};
    for (const t of TEMPLATES) {
      const c = old[`${t.concepts[0]}:${t.domain}`];
      if (!c || !c.reps) continue;
      const k = skillOf(t);
      const cur = out[k];
      out[k] = !cur ? { ...c, key: k, conceptId: k } : { ...(c.reps > cur.reps ? c : cur), key: k, conceptId: k, due: Math.min(c.due, cur.due) };
    }
    s.competences = out;
    s.levelRuns ??= {};
    delete s.intervalStats;
  }
  return s;
}
