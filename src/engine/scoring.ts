// Analyse de la réponse → précision (0..1), erreurs détaillées et index fautifs.
// Pondérations : performance = 0,6 hauteur + 0,4 rythme ; transcription = 0,5 / 0,5.
import type {
  Answer, DegreeItem, ErrorItem, ExerciseTemplate, NoteEvent, PlayedNote, ScoreResult, Variant,
} from '../content/types';
import { beatsToMs, degreeLabel, midiDegreeLabel, midiToDegree, mod12, pcName, staffStep } from './music';

export type AlignOp = { type: 'match' | 'sub' | 'del' | 'ins'; e?: number; p?: number };

/** Alignement par distance d'édition : distingue note fausse, manquante, en trop. */
export function align<E, P>(exp: E[], pl: P[], eq: (e: E, p: P) => boolean): AlignOp[] {
  const n = exp.length;
  const m = pl.length;
  const D: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) D[i][0] = i;
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const c = eq(exp[i - 1], pl[j - 1]) ? 0 : 1;
      D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + c);
    }
  }
  const ops: AlignOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const same = eq(exp[i - 1], pl[j - 1]);
      if (D[i][j] === D[i - 1][j - 1] + (same ? 0 : 1)) {
        ops.push({ type: same ? 'match' : 'sub', e: i - 1, p: j - 1 });
        i--; j--; continue;
      }
    }
    if (i > 0 && D[i][j] === D[i - 1][j] + 1) { ops.push({ type: 'del', e: i - 1 }); i--; continue; }
    ops.push({ type: 'ins', p: j - 1 }); j--;
  }
  return ops.reverse();
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

interface SeqOpts { tempo: number; tolMs: number; tolCents: number; checkRhythm: boolean; octaveAgnostic: boolean; tonic: number; /** portée : noms de notes et positions plutôt que degrés et demi-tons */ staff?: boolean }

export function scoreSequence(exp: NoteEvent[], played: PlayedNote[], o: SeqOpts): Omit<ScoreResult, 'success'> {
  const eq = (e: NoteEvent, p: PlayedNote) =>
    o.octaveAgnostic ? mod12(p.midi - e.midi) === 0 : Math.round(p.midi) === e.midi;
  const ops = align(exp, played, eq);
  const errors: ErrorItem[] = [];
  const wrong = new Set<number>();
  let pitchPts = 0;

  for (const op of ops) {
    if (op.type === 'match') {
      const p = played[op.p!];
      const cents = Math.abs(p.midi - Math.round(p.midi)) * 100;
      if (cents > o.tolCents) {
        pitchPts += 0.5;
        errors.push({ type: 'justesse', index: op.e, message: `Note ${op.e! + 1} : juste mais ${p.midi > Math.round(p.midi) ? 'un peu haute' : 'un peu basse'} (${Math.round(cents)} cents).` });
      } else pitchPts += 1;
    } else if (op.type === 'sub') {
      const e = exp[op.e!];
      const p = played[op.p!];
      const diff = o.octaveAgnostic ? ((((Math.round(p.midi) - e.midi) % 12) + 18) % 12) - 6 : Math.round(p.midi) - e.midi;
      wrong.add(op.e!);
      if (o.staff) {
        const d = staffStep(Math.round(p.midi)) - staffStep(e.midi);
        errors.push({ type: 'note_fausse', index: op.e, expected: pcName(e.midi), played: pcName(p.midi), message: `Note ${op.e! + 1} : ${pcName(p.midi)} au lieu de ${pcName(e.midi)} (${Math.abs(d)} position${Math.abs(d) > 1 ? 's' : ''} trop ${d > 0 ? 'haut' : 'bas'} sur la portée).` });
        continue;
      }
      if (!o.octaveAgnostic && mod12(Math.round(p.midi) - e.midi) === 0) {
        // la bonne note, à la mauvaise octave : on le dit clairement (« 2 au lieu de 2 » ne voulait rien dire)
        errors.push({ type: 'note_fausse', index: op.e, expected: midiDegreeLabel(o.tonic, e.midi), played: midiDegreeLabel(o.tonic, p.midi),
          message: `Note ${op.e! + 1} : la bonne note (${pcName(e.midi)}), mais une octave trop ${diff > 0 ? 'haut' : 'bas'}.` });
        continue;
      }
      errors.push({
        type: 'note_fausse', index: op.e,
        expected: midiDegreeLabel(o.tonic, e.midi), played: midiDegreeLabel(o.tonic, p.midi),
        message: o.octaveAgnostic
          ? `Note ${op.e! + 1} : ${midiDegreeLabel(o.tonic, p.midi)} au lieu de ${midiDegreeLabel(o.tonic, e.midi)}.`
          : `Note ${op.e! + 1} : ${midiDegreeLabel(o.tonic, p.midi)} au lieu de ${midiDegreeLabel(o.tonic, e.midi)} (trop ${diff > 0 ? 'haute' : 'basse'} de ${Math.abs(diff)} demi-ton${Math.abs(diff) > 1 ? 's' : ''}).`,
      });
    } else if (op.type === 'del') {
      wrong.add(op.e!);
      errors.push({ type: 'note_manquante', index: op.e, message: `Note ${op.e! + 1} manquante (${o.staff ? pcName(exp[op.e!].midi) : midiDegreeLabel(o.tonic, exp[op.e!].midi)}).` });
    } else {
      errors.push({ type: 'note_en_trop', message: `Une note en trop (${o.staff ? pcName(played[op.p!].midi) : midiDegreeLabel(o.tonic, played[op.p!].midi)}).` });
    }
  }
  const pitch = clamp01(pitchPts / Math.max(exp.length, played.length, 1));

  let rhythm = 1;
  if (o.checkRhythm && exp.length > 0) {
    const pairs = ops.filter((x) => x.type === 'match' || x.type === 'sub');
    if (pairs.length === 0) rhythm = 0;
    else {
      const e0 = beatsToMs(exp[pairs[0].e!].start, o.tempo);
      const p0 = played[pairs[0].p!].tMs;
      let ok = 0;
      let reported = 0;
      for (const pr of pairs) {
        const eMs = beatsToMs(exp[pr.e!].start, o.tempo) - e0;
        const pMs = played[pr.p!].tMs - p0;
        const d = pMs - eMs;
        if (Math.abs(d) <= o.tolMs) ok++;
        else {
          wrong.add(pr.e!);
          if (reported++ < 3) errors.push({ type: d < 0 ? 'en_avance' : 'en_retard', index: pr.e, message: `Note ${pr.e! + 1} ${d < 0 ? 'en avance' : 'en retard'} de ${Math.round(Math.abs(d))} ms.` });
        }
      }
      rhythm = ok / exp.length;
    }
  }
  const precision = o.checkRhythm ? 0.6 * pitch + 0.4 * rhythm : pitch;
  return { precision, pitch, rhythm: o.checkRhythm ? rhythm : undefined, errors, wrongIndexes: [...wrong].sort((a, b) => a - b) };
}

/** Rythme : chaque attaque attendue est appariée à la tape la plus proche dans la tolérance. */
export function scoreRhythm(onsetsBeats: number[], taps: number[], o: { tempo: number; tolMs: number; absolute: boolean; latencyMs?: number }): Omit<ScoreResult, 'success'> {
  const expMs = onsetsBeats.map((b) => beatsToMs(b, o.tempo));
  let tapsRel = taps.map((t) => t - (o.latencyMs ?? 0));
  if (!o.absolute && tapsRel.length > 0) {
    const t0 = tapsRel[0];
    tapsRel = tapsRel.map((t) => t - t0);
    const e0 = expMs[0] ?? 0;
    for (let i = 0; i < expMs.length; i++) expMs[i] -= e0;
  }
  const used = new Set<number>();
  const errors: ErrorItem[] = [];
  const wrong: number[] = [];
  let ok = 0;
  expMs.forEach((e, i) => {
    let best = -1;
    let bestD = Infinity;
    tapsRel.forEach((t, j) => {
      if (used.has(j)) return;
      const d = Math.abs(t - e);
      if (d < bestD) { bestD = d; best = j; }
    });
    if (best >= 0 && bestD <= o.tolMs) { used.add(best); ok++; return; }
    wrong.push(i);
    if (best >= 0 && bestD <= o.tolMs * 3) {
      used.add(best);
      const d = tapsRel[best] - e;
      if (errors.length < 4) errors.push({ type: d < 0 ? 'en_avance' : 'en_retard', index: i, message: `Coup ${i + 1} ${d < 0 ? 'en avance' : 'en retard'} de ${Math.round(Math.abs(d))} ms.` });
    } else if (errors.length < 4) {
      errors.push({ type: 'note_manquante', index: i, message: `Coup ${i + 1} manquant.` });
    }
  });
  const extras = tapsRel.length - used.size;
  if (extras > 0) errors.push({ type: 'note_en_trop', message: `${extras} coup${extras > 1 ? 's' : ''} en trop.` });
  const rhythm = clamp01(ok / (expMs.length + 0.5 * extras || 1));
  return { precision: rhythm, rhythm, errors, wrongIndexes: wrong };
}

export function scoreSet(exp: number[], got: number[], octaveAgnostic: boolean): Omit<ScoreResult, 'success'> {
  const norm = (m: number) => (octaveAgnostic ? mod12(m) : Math.round(m));
  const E = new Set(exp.map(norm));
  const G = new Set(got.map(norm));
  const inter = [...E].filter((x) => G.has(x));
  const union = new Set([...E, ...G]);
  const errors: ErrorItem[] = [];
  const missing = [...E].filter((x) => !G.has(x)).length;
  const extra = [...G].filter((x) => !E.has(x)).length;
  if (missing) errors.push({ type: 'note_manquante', message: `${missing} note${missing > 1 ? 's' : ''} manquante${missing > 1 ? 's' : ''}.` });
  if (extra) errors.push({ type: 'note_en_trop', message: `${extra} note${extra > 1 ? 's' : ''} en trop.` });
  const wrong = exp.map((m, i) => (G.has(norm(m)) ? -1 : i)).filter((i) => i >= 0);
  return { precision: inter.length / Math.max(union.size, 1), errors, wrongIndexes: wrong };
}

export function scoreConstraints(played: PlayedNote[], tonic: number, allowed: number[], endDegree: number | undefined, minNotes: number): Omit<ScoreResult, 'success'> {
  const errors: ErrorItem[] = [];
  if (played.length < minNotes) {
    errors.push({ type: 'contrainte', message: `Joue au moins ${minNotes} notes.` });
    return { precision: 0, errors, wrongIndexes: [] };
  }
  const degs = played.map((p) => midiToDegree(tonic, p.midi));
  const inScale = degs.filter((d) => d.acc === 0 && allowed.includes(d.degree)).length;
  const frac = inScale / played.length;
  if (frac < 1) errors.push({ type: 'contrainte', message: `${played.length - inScale} note(s) hors des notes autorisées (${allowed.join(', ')}).` });
  const last = degs[degs.length - 1];
  const endOk = endDegree === undefined || (last.acc === 0 && last.degree === endDegree);
  if (!endOk) errors.push({ type: 'contrainte', message: `Ta réponse finit sur ${degreeLabel(last)}, il fallait finir sur ${endDegree}.` });
  return { precision: 0.7 * frac + 0.3 * (endOk ? 1 : 0), errors, wrongIndexes: [] };
}

export function scoreTranscription(exp: DegreeItem[], got: DegreeItem[], checkDur: boolean, label: (d: DegreeItem) => string = degreeLabel): Omit<ScoreResult, 'success'> {
  const normD = (d: DegreeItem) => `${((((d.degree - 1) % 7) + 7) % 7) + 1}:${d.acc}`;
  const ops = align(exp, got, (a, b) => normD(a) === normD(b));
  const errors: ErrorItem[] = [];
  const wrong = new Set<number>();
  let match = 0;
  let durOk = 0;
  for (const op of ops) {
    if (op.type === 'match') {
      match++;
      if (exp[op.e!].dur === got[op.p!].dur) durOk++;
      else if (checkDur) { wrong.add(op.e!); errors.push({ type: 'duree', index: op.e, message: `Note ${op.e! + 1} : bonne note, mauvaise durée.` }); }
    } else if (op.type === 'sub') {
      wrong.add(op.e!);
      errors.push({ type: 'note_fausse', index: op.e, message: `Note ${op.e! + 1} : ${label(got[op.p!])} au lieu de ${label(exp[op.e!])}.` });
    } else if (op.type === 'del') {
      wrong.add(op.e!);
      errors.push({ type: 'note_manquante', index: op.e, message: `Note ${op.e! + 1} manquante.` });
    } else errors.push({ type: 'note_en_trop', message: 'Une note en trop.' });
  }
  const pitch = match / Math.max(exp.length, got.length, 1);
  const rhythm = durOk / Math.max(exp.length, 1);
  const precision = checkDur ? 0.5 * pitch + 0.5 * rhythm : pitch;
  return { precision, pitch, rhythm: checkDur ? rhythm : undefined, errors, wrongIndexes: [...wrong] };
}

const FIG_LABEL: Record<string, string> = { noire: 'noire', blanche: 'blanche', soupir: 'soupir', croches: 'deux croches', doubles: 'quatre doubles croches', syncope: 'syncope', triolet: 'triolet' };

/** Dictée rythmique : on compare la suite de figures écrite à celle entendue. */
export function scoreFigures(exp: string[], got: string[]): Omit<ScoreResult, 'success'> {
  const ops = align(exp, got, (a, b) => a === b);
  const errors: ErrorItem[] = [];
  const wrong: number[] = [];
  let ok = 0;
  for (const op of ops) {
    if (op.type === 'match') ok++;
    else if (op.type === 'sub') { wrong.push(op.e!); errors.push({ type: 'duree', index: op.e, message: `Figure ${op.e! + 1} : ${FIG_LABEL[got[op.p!]]} au lieu de ${FIG_LABEL[exp[op.e!]]}.` }); }
    else if (op.type === 'del') { wrong.push(op.e!); errors.push({ type: 'note_manquante', index: op.e, message: `Figure ${op.e! + 1} manquante (${FIG_LABEL[exp[op.e!]]}).` }); }
    else errors.push({ type: 'note_en_trop', message: `Une figure en trop (${FIG_LABEL[got[op.p!]]}).` });
  }
  return { precision: ok / Math.max(exp.length, got.length, 1), errors, wrongIndexes: wrong };
}

/** Point d'entrée : analyse une réponse selon ce que la variante attend. */
export function scoreAnswer(t: ExerciseTemplate, v: Variant, a: Answer, latencyMs = 0): ScoreResult {
  const tol = t.tolerances;
  let r: Omit<ScoreResult, 'success'>;
  const e = v.expected;
  if (e.kind === 'quiz' && a.kind === 'quiz') {
    const errors: ErrorItem[] = [];
    const wrong: number[] = [];
    let ok = 0;
    e.items.forEach((it, i) => {
      if (a.ids[i] === it.answerId) ok++;
      else {
        wrong.push(i);
        const lab = it.choices.find((c) => c.id === it.answerId)?.label ?? it.answerId;
        errors.push({ type: 'mauvaise_reponse', index: i, message: `Question ${i + 1} : la réponse était « ${lab} ».` });
      }
    });
    r = { precision: ok / Math.max(e.items.length, 1), errors, wrongIndexes: wrong };
  } else if (e.kind === 'sequence' && a.kind === 'notes') {
    const opts = { tempo: v.tempo, tolMs: tol.ms, tolCents: tol.cents, checkRhythm: e.checkRhythm, octaveAgnostic: e.octaveAgnostic, tonic: v.tonic, staff: v.answerUI === 'staff' };
    r = scoreSequence(e.notes, a.notes, opts);
    // retour bêta 0.22 : toute la réponse jouée une octave (ou deux) plus haut ou plus bas est juste — la guitare sonne
    // une octave sous la portée, et chacun joue dans son registre. Les écarts entre les notes, eux, doivent être exacts.
    // Pas de décalage quand l'exercice part d'une note marquée sur l'instrument (un ton au-dessus de la note en or…).
    if (!e.octaveAgnostic && v.markRoot === undefined && r.precision < 1 && a.notes.length) {
      for (const k of [-24, -12, 12, 24]) {
        const shifted = scoreSequence(e.notes, a.notes.map((n) => ({ ...n, midi: n.midi + k })), opts);
        if (shifted.precision > r.precision) r = shifted;
      }
    }
  } else if (e.kind === 'rhythm' && a.kind === 'taps') {
    r = scoreRhythm(e.onsetsBeats, a.tMs, { tempo: v.tempo, tolMs: tol.ms, absolute: e.absolute, latencyMs });
  } else if (e.kind === 'set' && a.kind === 'set') {
    r = scoreSet(e.midis, a.midis, e.octaveAgnostic);
    if (!e.octaveAgnostic && v.markRoot === undefined && r.precision < 1 && a.midis.length) {
      for (const k of [-24, -12, 12, 24]) {
        const shifted = scoreSet(e.midis, a.midis.map((m) => m + k), false);
        if (shifted.precision > r.precision) r = shifted;
      }
    }
  } else if (e.kind === 'constraints' && a.kind === 'notes') {
    r = scoreConstraints(a.notes, v.tonic, e.allowedDegrees, e.endDegree, e.minNotes);
  } else if (e.kind === 'transcribe' && a.kind === 'degrees') {
    r = scoreTranscription(e.items, a.items, e.checkDur, v.padNames ? (d) => v.padNames![((d.degree - 1) % 7 + 7) % 7] : degreeLabel);
  } else if (e.kind === 'figures' && a.kind === 'figures') {
    r = scoreFigures(e.items, a.items);
  } else if (e.kind === 'free') {
    r = { precision: 1, errors: [], wrongIndexes: [] };
  } else {
    throw new Error(`Réponse ${a.kind} incompatible avec l'attendu ${e.kind}`);
  }
  return { ...r, success: r.precision >= t.reussite.precisionMin };
}
