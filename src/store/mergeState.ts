// Fusion de deux copies de la progression (deux appareils) : on ne perd jamais un jour joué ni une révision.
// Règle : on garde le meilleur des deux pour chaque élément (jour, compétence, niveau, point…).
type AnyState = Record<string, unknown>;

const maxRec = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
};
const union = (a: unknown[] = [], b: unknown[] = []) => [...new Set([...a, ...b])];

export function mergeStates(local: AnyState, remote: AnyState): AnyState {
  const out: AnyState = { ...remote, ...local };
  out.xpByDay = maxRec(local.xpByDay as Record<string, number>, remote.xpByDay as Record<string, number>);
  out.levels = maxRec(local.levels as Record<string, number>, remote.levels as Record<string, number>);
  for (const k of ['xpTotal', 'bestStreak', 'sessionsDone', 'perfectSessions']) out[k] = Math.max(Number(local[k] ?? 0), Number(remote[k] ?? 0));
  for (const k of ['seenConcepts', 'seenPoints', 'validatedPoints', 'badges', 'deepLessonsDone', 'deepLessonsSeen', 'deepLessonsConfirmed']) out[k] = union(local[k] as unknown[], remote[k] as unknown[]);
  // cursus : jours de réussite réunis, jour de validation le plus ancien, technique la plus avancée
  const lp = (local.practiceDays ?? {}) as Record<string, string[]>, rp = (remote.practiceDays ?? {}) as Record<string, string[]>;
  const pd: Record<string, string[]> = { ...rp };
  for (const [k, v] of Object.entries(lp)) pd[k] = (union(rp[k], v) as string[]).sort().slice(-6);
  out.practiceDays = pd;
  const ld = (local.deepLessonsDoneDay ?? {}) as Record<string, string>, rd = (remote.deepLessonsDoneDay ?? {}) as Record<string, string>;
  const dd: Record<string, string> = { ...rd };
  for (const [k, v] of Object.entries(ld)) dd[k] = !rd[k] || v < rd[k] ? v : rd[k];
  out.deepLessonsDoneDay = dd;
  const lt = (local.techProgress ?? {}) as Record<string, { step: number; tempo: number }>, rt = (remote.techProgress ?? {}) as Record<string, { step: number; tempo: number }>;
  const tp: Record<string, unknown> = { ...rt };
  for (const [k, v] of Object.entries(lt)) if (!rt[k] || v.step > rt[k].step || (v.step === rt[k].step && v.tempo >= rt[k].tempo)) tp[k] = v;
  out.techProgress = tp;
  // compétences : la plus récemment révisée l'emporte
  const lc = (local.competences ?? {}) as Record<string, { lastReview?: number }>;
  const rc = (remote.competences ?? {}) as Record<string, { lastReview?: number }>;
  const comps: Record<string, unknown> = { ...rc };
  for (const [k, v] of Object.entries(lc)) if (!rc[k] || (v.lastReview ?? 0) >= (rc[k].lastReview ?? 0)) comps[k] = v;
  out.competences = comps;
  // intervalles : l'historique le plus long
  const li = (local.intervalStats ?? {}) as Record<string, boolean[]>;
  const ri = (remote.intervalStats ?? {}) as Record<string, boolean[]>;
  const iv: Record<string, boolean[]> = { ...ri };
  for (const [k, v] of Object.entries(li)) if (!ri[k] || v.length >= ri[k].length) iv[k] = v;
  out.intervalStats = iv;
  // série : celle de l'appareil qui a joué le plus récemment
  const lDay = String(local.lastSessionDay ?? ''), rDay = String(remote.lastSessionDay ?? '');
  const recent = lDay >= rDay ? local : remote;
  out.lastSessionDay = recent.lastSessionDay ?? null;
  out.streak = recent.streak ?? 0;
  out.onboarded = !!(local.onboarded || remote.onboarded);
  return out;
}
