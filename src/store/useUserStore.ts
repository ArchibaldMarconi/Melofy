// État joueur persistant (Zustand + AsyncStorage, inclus dans Expo Go) : XP, série, compétences FSRS, badges, réglages, freemium.
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CompetenceState, DegreeItem, Domain, ExerciseTemplate, InputMode, Instrument, Outcome, Rating } from '../content/types';
import { BADGES, type BadgeState } from '../content/badges';
import { isMastered, review } from '../engine/fsrs';
import { computeRating, computeXp, XP } from '../engine/xp';
import { maxDifficulty, maxLevel, staircase } from '../engine/difficulty';
import { cardKeyOf, newSkillCard } from '../engine/srs';
import type { SkillId } from '../content/skills';
import { TEMPLATES } from '../content/templates';
import { PAYWALL_ENABLED } from '../config';
import { migrate, STORE_VERSION } from './migrate';
import { validatePoints } from '../engine/points';
import { APP_VERSION } from '../version';
import { lessonsFromConcepts, type LessonProgress } from '../engine/cursus';
import type { PlacementProfile } from '../content/placement';

// clé identique à la version web (« melofy-user:<nom> ») : même format de sauvegarde
const mmkvStorage: StateStorage = {
  getItem: (k) => AsyncStorage.getItem(`melofy-user:${k}`),
  setItem: (k, v) => AsyncStorage.setItem(`melofy-user:${k}`, v),
  removeItem: (k) => AsyncStorage.removeItem(`melofy-user:${k}`),
};

const DAY = 86_400_000;
export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface Settings { instrument: Instrument; inputPref: InputMode; sessionMinutes: number; latencyMs: number; showNoteNames: boolean; unlockAll: boolean; micGate?: number; droneVolume?: number; guitarReading?: 'portee' | 'tab'; liveStaff?: boolean;
  /** façon Solo : gaucher (manche inversé), notation des accords, accordage */
  lefty?: boolean; chordNotation?: 'maj7' | 'delta'; tuning?: string;
  /** situation de l'élève pour le workout (retenue, modifiable à chaque séance) : instrument sous la main, voix possible */
  hasInstrument?: boolean; canSing?: boolean;
  /** module technique ajouté au workout : 0 (non), 5 ou 10 minutes */
  techniqueMinutes?: 0 | 5 | 10;
  /** tests automatisés seulement : affiche dans Pratique le catalogue complet des exercices (jamais montré aux élèves) */
  catalogueTest?: boolean;
  /** suivi des intervalles (entraînement quotidien jusqu'à ce qu'ils soient tous acquis) */ }
export interface CarnetEntry { id: string; templateId: string; date: string; tonic: number; items: DegreeItem[] }

export interface ResultInfo { rating: Rating; xp: number; newBadges: string[]; levelChange: -1 | 0 | 1; level: number }
export interface SessionSummary { xp: number; exercises: number; perfect: boolean; minutes: number; done?: number }

interface UserState {
  xpTotal: number;
  xpByDay: Record<string, number>;
  streak: number;
  bestStreak: number;
  freezes: number;
  lastSessionDay: string | null;
  sessionsDone: number;
  perfectSessions: number;
  premium: boolean;
  competences: Record<string, CompetenceState>;
  /** niveau de difficulté atteint par exercice (progression écrite, puis paliers sans plafond) */
  levels: Record<string, number>;
  /** escalier : réussites nettes d'affilée au niveau en cours, par exercice */
  levelRuns: Record<string, number>;
  /** temps moyen réellement passé par exercice (s), pour composer des séances à la bonne durée */
  avgTimeS: Record<string, number>;
  /** XP de la pratique libre (onglet Pratique) : une journée de pratique compte dans la semaine */
  addPracticeXp: (xp: number) => void;
  seenConcepts: string[];
  /** points de leçon déjà montrés (une fois avant le 1er essai de l'exercice) */
  seenPoints: string[];
  /** points de leçon validés : réussite d'un exercice qui s'y rattache (pas seulement lus) */
  validatedPoints: string[];
  /** leçons approfondies validées (validation rapide en fin de leçon) */
  deepLessonsDone: string[];
  markDeepLessonDone: (id: string, templateIds: string[]) => void;
  /** cursus : leçons dont les écrans ont été vus, jour de validation, confirmations, réussites par jour */
  deepLessonsSeen: string[];
  deepLessonsDoneDay: Record<string, string>;
  deepLessonsConfirmed: string[];
  practiceDays: Record<string, string[]>;
  markDeepLessonSeen: (id: string, conceptIds: string[]) => void;
  confirmDeepLesson: (id: string) => void;
  /** module technique : étape et tempo atteints, par gamme */
  techProgress: Record<string, { step: number; tempo: number; ok: number; ko: number }>;
  recordTechnique: (scale: string, kind: 'step' | 'tempo', success: boolean, maxStep: number) => void;
  markPointSeen: (id: string) => void;
  /** exercices dont la consigne complète a déjà été montrée : ensuite, une ligne suffit */
  seenTemplates: string[];
  markTemplateSeen: (id: string) => void;
  badges: string[];
  bossDone: string[];
  mechanicsDone: string[];
  carnet: CarnetEntry[];
  settings: Settings;
  inSessionStreak: number;
  onboarded: boolean;
  /** dernière version dont l'utilisateur a vu les nouveautés */
  seenRelease: string;
  markReleaseSeen: () => void;
  /** fin de l'accueil ; un niveau déclaré (bases, confirmé, avancé) lance le test de placement à ce point de départ */
  finishOnboarding: (instrument: Instrument, profile?: PlacementProfile) => void;
  placementPending: boolean;
  /** niveau déclaré à l'accueil : le test de placement ne le redemande pas */
  placementProfile: PlacementProfile | null;
  setPlacementPending: (v: boolean) => void;
  /** valide les notions réussies au test de placement (note 2 : le SRS les revérifie vite) */
  /** placement par domaine : compétences (notion × domaine) validées ; les exercices concernés passent au niveau le plus difficile */
  placeOut: (pairs: { conceptId: string; domain: Domain }[]) => void;
  /**
   * « Je n'ai pas appris ça » : un élève mal placé (test de placement trop généreux) rencontre une notion qu'il ne
   * connaît pas. La leçon redevient à découvrir (ses exercices sortent des séances jusqu'à ce qu'il l'ait vue), et
   * ses exercices repartent du niveau le plus simple.
   */
  notLearned: (lessonId: string, templateIds: string[]) => void;
  /** pratique hors exercice (séries chronométrées « Solo ») : une révision de la compétence, si elle est due */
  recordSkillPractice: (skill: SkillId, domain: Domain, success: boolean, precision: number) => void;

  recordResult: (t: ExerciseTemplate, o: Outcome, ctx: { inSession: boolean; transcription?: { tonic: number; items: DegreeItem[] } }) => ResultInfo;
  completeSession: (s: SessionSummary) => { streak: number; bonusXp: number; newBadges: string[] };
  completeBoss: (id: string) => string[];
  setSettings: (s: Partial<Settings>) => void;
  setPremium: (v: boolean) => void;
  canStartWorkout: () => boolean;
  canPractice: () => boolean;
  reset: () => void;
}

const initial = {
  xpTotal: 0, xpByDay: {}, streak: 0, bestStreak: 0, freezes: 0, lastSessionDay: null, sessionsDone: 0, perfectSessions: 0,
  premium: false, competences: {}, levels: {}, levelRuns: {}, avgTimeS: {}, seenConcepts: [], seenPoints: [], validatedPoints: [], deepLessonsDone: [], deepLessonsSeen: [], deepLessonsDoneDay: {}, deepLessonsConfirmed: [], practiceDays: {}, techProgress: {}, seenTemplates: [], badges: [], bossDone: [], mechanicsDone: [], carnet: [],
  settings: { instrument: 'piano' as Instrument, inputPref: 'clavier' as InputMode, sessionMinutes: 10, latencyMs: 0, showNoteNames: false, unlockAll: false },
  inSessionStreak: 0,
  onboarded: false,
  placementPending: false,
  placementProfile: null as PlacementProfile | null,
  seenRelease: APP_VERSION,
};

function awardBadges(s: UserState): string[] {
  const bs: BadgeState = {
    xpTotal: s.xpTotal, streak: s.streak, sessionsDone: s.sessionsDone, perfectSessions: s.perfectSessions,
    bossDone: s.bossDone, carnetCount: s.carnet.length, competences: s.competences, mechanicsDone: s.mechanicsDone,
  };
  return BADGES.filter((b) => !s.badges.includes(b.id) && b.check(bs)).map((b) => b.id);
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...initial,

      recordResult: (t, o, ctx) => {
        const s = get();
        const now = Date.now();
        const rating = computeRating(o, t.dureeS * 1000);
        // une carte par compétence ; une 2e réussite dans les mêmes heures ne compte pas comme une révision de plus
        const comps = { ...s.competences };
        const key = cardKeyOf(t);
        const prev = comps[key] ?? newSkillCard(key, t.domain);
        const reviewAfterDays = prev.reps > 0 ? (now - prev.lastReview) / DAY : 0;
        const alreadyMastered = !ctx.inSession && isMastered(prev, now);
        const sameSitting = prev.reps > 0 && now - prev.lastReview < 4 * 3_600_000 && rating >= 2;
        // hors séance (pratique libre), la carte n'est mise à jour que si elle est due
        if (!sameSitting && (ctx.inSession || prev.reps === 0 || prev.due <= now)) comps[key] = review(prev, rating, now);
        let xp = computeXp(t, rating, o.helps, { reviewAfterDays, alreadyMasteredOutsideSrs: alreadyMastered });
        const streakRun = o.success && o.helps.length === 0 && o.attempt === 1 ? s.inSessionStreak + 1 : 0;
        if (streakRun > 0 && streakRun % 5 === 0) xp += XP.streak5Bonus;

        const today = dayKey(now);
        const mechanicsDone = o.success && !s.mechanicsDone.includes(t.mechanic) ? [...s.mechanicsDone, t.mechanic] : s.mechanicsDone;
        const carnet = o.success && ctx.transcription && (t.domain === 'repiquage' || t.domain === 'impro')
          ? [...s.carnet, { id: `${t.id}-${o.seed}`, templateId: t.id, date: today, tonic: ctx.transcription.tonic, items: ctx.transcription.items }]
          : s.carnet;

        // escalier de difficulté : un cran plus dur après 3 réussites nettes, un cran plus facile après un échec
        const levels = s.levels ?? {};
        const runs = s.levelRuns ?? {};
        const step = staircase(levels[t.id] ?? 0, runs[t.id] ?? 0, o, maxDifficulty(t));
        const level = step.level;

        const prevAvg = (s.avgTimeS ?? {})[t.id];
        const tS = Math.min(900, Math.max(5, o.timeMs / 1000));
        const avgTimeS = { ...(s.avgTimeS ?? {}), [t.id]: Math.round(prevAvg ? prevAvg * 0.6 + tS * 0.4 : tS) };

        // un point de leçon est validé quand on réussit un exercice qui s'y rattache
        const validatedPoints = validatePoints(s.validatedPoints ?? [], t.id, o.success);

        // jours de réussite par exercice : la confirmation d'une leçon demande 2 réussites sur 2 jours
        const pd = s.practiceDays ?? {};
        const practiceDays = o.success ? { ...pd, [t.id]: [...new Set([...(pd[t.id] ?? []), today])].slice(-6) } : pd;

        set({
          practiceDays,
          validatedPoints,
          avgTimeS,
          levels: { ...levels, [t.id]: level }, levelRuns: { ...runs, [t.id]: step.run },
          competences: comps, xpTotal: s.xpTotal + xp, xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + xp },
          inSessionStreak: streakRun, mechanicsDone, carnet,
        });
        const newBadges = awardBadges(get());
        if (newBadges.length) set({ badges: [...get().badges, ...newBadges] });
        return { rating, xp, newBadges, levelChange: step.change, level };
      },

      completeSession: (sum) => {
        const s = get();
        const today = dayKey();
        const yesterday = dayKey(Date.now() - DAY);
        const dayBefore = dayKey(Date.now() - 2 * DAY);
        let streak = s.streak;
        let freezes = s.freezes;
        if (s.lastSessionDay === today) { /* déjà comptée */ } else if (s.lastSessionDay === yesterday) streak += 1;
        else if (s.lastSessionDay === dayBefore && freezes > 0) { freezes -= 1; streak += 1; } else streak = 1;
        if (s.lastSessionDay !== today && streak > 0 && streak % 7 === 0) freezes += 1;
        // bonus de séance seulement si au moins la moitié des exercices a été faite (pas passée)
        const full = (sum.done ?? sum.exercises) * 2 >= sum.exercises;
        const bonusXp = full ? XP.sessionDone + (sum.perfect ? XP.sessionPerfect : 0) : 0;
        set({
          streak, bestStreak: Math.max(s.bestStreak, streak), freezes, lastSessionDay: today, sessionsDone: s.sessionsDone + 1,
          perfectSessions: s.perfectSessions + (sum.perfect ? 1 : 0), xpTotal: s.xpTotal + bonusXp,
          xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + bonusXp }, inSessionStreak: 0,
        });
        const newBadges = awardBadges(get());
        if (newBadges.length) set({ badges: [...get().badges, ...newBadges] });
        return { streak, bonusXp, newBadges };
      },

      completeBoss: (id) => {
        const s = get();
        if (!s.bossDone.includes(id)) set({ bossDone: [...s.bossDone, id], xpTotal: s.xpTotal + XP.boss });
        const newBadges = awardBadges(get());
        if (newBadges.length) set({ badges: [...get().badges, ...newBadges] });
        return newBadges;
      },

      markTemplateSeen: (id) => { const s = get().seenTemplates ?? []; if (!s.includes(id)) set({ seenTemplates: [...s, id] }); },
      markPointSeen: (id) => { const s = get().seenPoints ?? []; if (!s.includes(id)) set({ seenPoints: [...s, id] }); },
      setSettings: (p) => set({ settings: { ...get().settings, ...p } }),
      setPremium: (v) => set({ premium: v }),
      canStartWorkout: () => !PAYWALL_ENABLED || get().premium || get().lastSessionDay !== dayKey(),
      canPractice: () => !PAYWALL_ENABLED || get().premium,
      markReleaseSeen: () => set({ seenRelease: APP_VERSION }),
      markDeepLessonDone: (id, templateIds) => {
        const s = get();
        const pts = templateIds.reduce((acc, tid) => validatePoints(acc, tid, true), s.validatedPoints ?? []);
        const gain = (s.deepLessonsDone ?? []).includes(id) ? 0 : XP.lessonDone;
        const today = dayKey();
        set({
          xpTotal: s.xpTotal + gain, xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + gain },
          deepLessonsDone: [...new Set([...(s.deepLessonsDone ?? []), id])], validatedPoints: pts,
          deepLessonsSeen: [...new Set([...(s.deepLessonsSeen ?? []), id])],
          deepLessonsDoneDay: { ...(s.deepLessonsDoneDay ?? {}), [id]: s.deepLessonsDoneDay?.[id] ?? dayKey() },
        });
      },
      markDeepLessonSeen: (id, conceptIds) => {
        const s = get();
        const gain = (s.deepLessonsSeen ?? []).includes(id) ? 0 : XP.lessonSeen;
        const today = dayKey();
        set({ deepLessonsSeen: [...new Set([...(s.deepLessonsSeen ?? []), id])], seenConcepts: [...new Set([...s.seenConcepts, ...conceptIds])],
          xpTotal: s.xpTotal + gain, xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + gain } });
      },
      confirmDeepLesson: (id) => {
        const s = get();
        const gain = (s.deepLessonsConfirmed ?? []).includes(id) ? 0 : XP.lessonConfirmed;
        const today = dayKey();
        set({ deepLessonsConfirmed: [...new Set([...(s.deepLessonsConfirmed ?? []), id])], xpTotal: s.xpTotal + gain, xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + gain } });
      },
      recordTechnique: (scale, kind, success, maxStep) => {
        const s = get();
        const cur = s.techProgress?.[scale] ?? { step: 0, tempo: 60, ok: 0, ko: 0 };
        let next = { ...cur };
        if (kind === 'step') next = { ...cur, step: success ? Math.min(maxStep, cur.step + 1) : cur.step };
        else {
          // tempo évolutif : +4 BPM après 2 réussites propres, −4 après 2 échecs (40 à 200 BPM)
          const ok = success ? cur.ok + 1 : 0, ko = success ? 0 : cur.ko + 1;
          next = { ...cur, ok: ok >= 2 ? 0 : ok, ko: ko >= 2 ? 0 : ko, tempo: Math.max(40, Math.min(200, cur.tempo + (ok >= 2 ? 4 : 0) - (ko >= 2 ? 4 : 0))) };
        }
        set({ techProgress: { ...(s.techProgress ?? {}), [scale]: next } });
      },
      addPracticeXp: (xp) => { if (xp <= 0) return; const s = get(); const today = dayKey(); set({ xpTotal: s.xpTotal + xp, xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + xp } }); },
      notLearned: (lessonId, templateIds) => {
        const s = get();
        const drop = (xs: string[] | undefined) => (xs ?? []).filter((x) => x !== lessonId);
        const doneDay = { ...(s.deepLessonsDoneDay ?? {}) };
        delete doneDay[lessonId];
        const levels = { ...(s.levels ?? {}) };
        const levelRuns = { ...(s.levelRuns ?? {}) };
        for (const id of templateIds) { levels[id] = 0; levelRuns[id] = 0; }
        set({ deepLessonsSeen: drop(s.deepLessonsSeen), deepLessonsDone: drop(s.deepLessonsDone), deepLessonsConfirmed: drop(s.deepLessonsConfirmed), deepLessonsDoneDay: doneDay, levels, levelRuns });
      },
      recordSkillPractice: (skill, domain, success, precision) => {
        const s = get();
        const now = Date.now();
        const prev = s.competences[skill] ?? newSkillCard(skill, domain);
        if (prev.reps > 0 && prev.due > now) return;
        const rating = !success ? 1 : precision >= 0.95 ? 4 : precision >= 0.85 ? 3 : 2;
        set({ competences: { ...s.competences, [skill]: review(prev, rating, now) } });
      },
      // un nouvel utilisateur n'a pas de « nouveautés » : tout est nouveau pour lui
      finishOnboarding: (instrument, profile) => set({ onboarded: true, placementPending: !!profile, placementProfile: profile ?? null, seenRelease: APP_VERSION, settings: { ...get().settings, instrument, inputPref: instrument === 'guitare' ? 'manche' : 'clavier' } }),
      setPlacementPending: (v) => set({ placementPending: v, ...(v ? {} : { placementProfile: null }) }),
      placeOut: (pairs) => {
        const s = get();
        const now = Date.now();
        const comps = { ...s.competences };
        const levels = { ...s.levels };
        const has = (cid: string, d: Domain) => pairs.some((p) => p.conceptId === cid && p.domain === d);
        for (const t of TEMPLATES) {
          if (!has(t.concepts[0], t.domain)) continue;
          const key = cardKeyOf(t);
          const prev = comps[key] ?? newSkillCard(key, t.domain);
          // note « difficile » : validée, mais à confirmer vite en révision
          if (prev.reps === 0) comps[key] = review(prev, 2, now);
          // domaine fort : l'exercice démarre à la fin de sa progression écrite (les paliers sans plafond restent à gagner)
          levels[t.id] = Math.max(levels[t.id] ?? 0, maxLevel(t));
        }
        const conceptIds = [...new Set(pairs.map((p) => p.conceptId))];
        // le placement valide aussi les leçons dont toutes les notions sont réussies : un musicien confirmé ne refait pas tout
        const fromComps = lessonsFromConcepts(new Set(conceptIds));
        set({
          competences: comps, levels, seenConcepts: [...new Set([...s.seenConcepts, ...conceptIds])], placementPending: false, placementProfile: null,
          deepLessonsSeen: [...new Set([...(s.deepLessonsSeen ?? []), ...fromComps.seen])],
          deepLessonsDone: [...new Set([...(s.deepLessonsDone ?? []), ...fromComps.acquired])],
          deepLessonsConfirmed: [...new Set([...(s.deepLessonsConfirmed ?? []), ...fromComps.acquired])],
        });
      },
      reset: () => set({ ...initial }),
    }),
    {
      name: 'melofy-user-v1', storage: createJSONStorage(() => mmkvStorage),
      version: STORE_VERSION,
      migrate: (persisted, fromVersion) => migrate(persisted, fromVersion) as unknown as UserState,
    },
  ),
);

/** progression du cursus, telle que la lisent l'arbre, les leçons et le workout */
export const lessonProgressOf = (s: Pick<UserState, 'deepLessonsSeen' | 'deepLessonsDone' | 'deepLessonsConfirmed' | 'deepLessonsDoneDay' | 'practiceDays' | 'settings'>): LessonProgress => ({
  seen: s.deepLessonsSeen ?? [], done: s.deepLessonsDone ?? [], confirmed: s.deepLessonsConfirmed ?? [],
  doneDay: s.deepLessonsDoneDay ?? {}, practiceDays: s.practiceDays ?? {}, unlockAll: s.settings.unlockAll,
});
