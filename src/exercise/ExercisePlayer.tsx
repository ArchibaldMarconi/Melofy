// Lecteur d'exercice : la machine à états unique décrite dans la spéc.
// CONSIGNE → ECOUTE → SAISIE → ANALYSE → (SUCCES | FEEDBACK → ECOUTE | DEMO) → RESULTAT
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { QuizRunner } from './QuizRunner';
import { figureBeats, figureOnsets } from '../engine/generators';
import { minorReference } from '../engine/chroma';
import { getTuning } from '../tuning';
import { availableInputs, INPUT_LABEL, labelsOfExpected } from './helpers';
import { ConsigneCard, FeedbackPanel } from './panels';
import type {
  Answer, DegreeItem, ExerciseTemplate, InputMode, Outcome, Params, PlayedNote, ScoreResult, Variant,
} from '../content/types';
import { MECHANIC_LABEL } from '../content/templates';
import { displayTitle } from '../content/titles';
import { audio } from '../audio/RNAudioEngine';
import { DEFAULT_GATE, useMic } from '../audio/useMic';
import { centsToTarget } from '../components/PitchMeter';
import { generate, mergeParams } from '../engine/generators';
import { beatsToMs, degreeItemsFromNotes, degreeLabel, degreeToMidi, midiDegreeLabel, noteName, pcName, referenceEvents, REFERENCE_TEMPO } from '../engine/music';
import { RhythmTimeline } from '../components/RhythmTimeline';
import { usePop, useShake } from '../components/Celebration';
import { Animated } from 'react-native';
import { scoreAnswer, scoreTranscription } from '../engine/scoring';
import { HELPS, XP } from '../engine/xp';
import { useUserStore, type ResultInfo } from '../store/useUserStore';
import { colors, domainColor, domainLabel, type } from '../theme';
import { Button } from '../components/Button';
import { DegreePad } from '../components/DegreePad';
import { Fretboard } from '../components/Fretboard';
import { Piano } from '../components/Piano';
import { PitchMeter } from '../components/PitchMeter';
import { FigureGlyph, RhythmNotation } from '../components/RhythmNotation';
import { TapPad } from '../components/TapPad';
import { DisplayView } from '../components/DisplayView';
import { StaffInput } from '../components/StaffInput';
import { LiveStaff } from '../components/LiveStaff';
import { ScoreStaff } from '../components/ScoreStaff';
import { RhythmComposer } from '../components/RhythmComposer';
import { announce } from '../a11y';
import { setCurrentExercise } from '../feedback';
import { CONSIGNES } from '../content/consignes';
import { LESSON_POINTS, type LessonPoint } from '../content/lessons';
import { howToAnswer, successText } from '../engine/consigne';
import { LessonPointCard } from '../components/LessonPointCard';
import { PointTip } from '../components/PointTip';

type Phase = 'CONSIGNE' | 'ECOUTE' | 'SAISIE' | 'FEEDBACK' | 'DEMO' | 'SUCCES' | 'RESULTAT';

export interface PlayerProps {
  template: ExerciseTemplate;
  params?: Params;
  seed: number;
  inSession: boolean;
  onFinished: (info: ResultInfo, outcome: Outcome) => void;
  onNext: () => void;
  /** passer l'exercice : aucune XP, aucune mise à jour du SRS */
  onSkip?: () => void;
  /** placement : un seul essai, pas d'aide, pas d'XP ni d'enregistrement */
  placement?: boolean;
  /** imposé par la séance : à l'écran (partie 1) ou à l'instrument réel (partie 2) */
  inputOverride?: 'ecran' | 'micro';
}


export function ExercisePlayer({ template: t, params, seed, inSession, onFinished, onNext, onSkip, placement, inputOverride }: PlayerProps) {
  const settings = useUserStore((s) => s.settings);
  const recordResult = useUserStore((s) => s.recordResult);
  const color = domainColor[t.domain];
  const instrument = settings.instrument;
  // niveau de difficulté adaptative figé au début de l'exercice
  const [level] = useState(() => useUserStore.getState().levels?.[t.id] ?? 0);
  const v: Variant = useMemo(() => generate(t, params, seed, { tuning: getTuning(), instrument, level }), [t, params, seed, instrument, level]);

  const inputOptions = useMemo(() => availableInputs(t, v, instrument), [t, v, instrument]);
  // « ecran » : clavier, manche ou pad à l'écran (partie 1 de la séance) ; « micro » : l'instrument réel (partie 2)
  const screenInput = inputOptions.find((m) => m !== 'micro') ?? inputOptions[0];
  const initialInput: InputMode = inputOverride === 'micro' && inputOptions.includes('micro') ? 'micro'
    : inputOverride === 'ecran' ? (inputOptions.includes(settings.inputPref) && settings.inputPref !== 'micro' ? settings.inputPref : screenInput)
    : inputOptions.includes(settings.inputPref) ? settings.inputPref : inputOptions[0];
  const [input, setInput] = useState<InputMode>(initialInput);
  const inputRef = useRef(input);
  inputRef.current = input;

  // points de leçon de l'exercice : montrés une fois avant le 1er essai, puis toujours accessibles
  const consigne = CONSIGNES[t.id];
  const points: LessonPoint[] = (consigne?.lecons ?? []).map((id) => LESSON_POINTS[id]).filter(Boolean);
  // Un seul point nouveau à la fois : il est intégré à la consigne ; le suivant n'arrive qu'après une erreur.
  const [seenAtStart] = useState<string[]>(() => useUserStore.getState().seenPoints ?? []);
  const unseen = placement ? [] : points.filter((pt) => !seenAtStart.includes(pt.id));
  const introPoint = unseen[0] ?? null;
  const errorPoint = unseen[1] ?? null;
  const [openPoint, setOpenPoint] = useState<LessonPoint | null>(null);
  const markPointSeen = useUserStore((s) => s.markPointSeen);
  const markTemplateSeen = useUserStore((s) => s.markTemplateSeen);
  // la consigne complète à la 1re rencontre seulement ; ensuite, la question et un bouton (le détail reste à un toucher)
  const [firstTime] = useState(() => placement || !(useUserStore.getState().seenTemplates ?? []).includes(t.id));
  const [showConsigne, setShowConsigne] = useState(false);
  const [phase, setPhase] = useState<Phase>('CONSIGNE');
  const [step, setStep] = useState<0 | 1>(0); // repiquage : 0 rejouer, 1 transcrire
  const [attempt, setAttempt] = useState(1);
  const [rate, setRate] = useState(1);
  const [quizIndex, setQuizIndex] = useState(0);
  const [helps, setHelps] = useState<number[]>([]);
  const [replays, setReplays] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [last, setLast] = useState<ScoreResult | null>(null);
  const [prevWrong, setPrevWrong] = useState<number[]>([]);
  const [stepPrecisions, setStepPrecisions] = useState<number[]>([]);
  const [result, setResult] = useState<ResultInfo | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  /** décompte affiché pendant que l'instrument est déjà jouable (4, 3, 2, 1, puis « Joue ! ») */
  const [count, setCount] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // réponses en cours
  const [origin, setOrigin] = useState(0);
  const [notes, setNotes] = useState<PlayedNote[]>([]);
  const [taps, setTaps] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [degrees, setDegrees] = useState<DegreeItem[]>([]);
  const [staffNotes, setStaffNotes] = useState<number[]>([]);
  const [figs, setFigs] = useState<import('../content/types').RhythmSymbol[]>([]);
  const [quizIds, setQuizIds] = useState<string[]>([]);
  const [freeLeft, setFreeLeft] = useState(0);

  const startedAt = useRef(audio.now());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const answerRef = useRef<() => Answer>(() => ({ kind: 'free', notes: [] }));

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => { clearTimers(); audio.stopAll(); audio.stopDrone(); audio.stopMic(); }, []);

  const addHelp = useCallback((lv: number) => setHelps((h) => (h.includes(lv) ? h : [...h, lv])), []);
  const capturing = phase === 'SAISIE';
  const transcribing = step === 1;

  // ---------- micro ----------
  // repli : si le micro échoue, on répond au clavier / manche / écran
  const [fallback, setFallback] = useState(false);
  const fallbackRef = useRef(false);
  fallbackRef.current = fallback;
  const singing = v.answerUI === 'sing' && !fallback;
  const micOn = capturing && !transcribing && (input === 'micro' || singing);
  const gate = settings.micGate ?? DEFAULT_GATE;
  // chant d'une seule note : validé quand la note juste est tenue HOLD_MS
  const HOLD_MS = 800;
  const singTarget = v.expected.kind === 'sequence' && v.answerUI === 'sing'
    ? v.expected.notes[Math.min(notes.length, v.expected.notes.length - 1)].midi : undefined;
  const singOne = v.expected.kind === 'sequence' && v.answerUI === 'sing' && v.expected.notes.length === 1;
  // guidage progressif : l'oreille seule au 1er essai ; la cible et « monte / descends » après un échec ou l'indice
  const guided = attempt > 1 || helps.includes(3);
  const holdStart = useRef<number | null>(null);
  const holdRef = useRef<number | null>(null);
  const guidedRef = useRef(guided);
  guidedRef.current = guided;
  const holdDone = useRef(false);
  const [hold, setHold] = useState(0);
  const { liveMidi, error: micError } = useMic(micOn, origin, {
    onNote: (n) => { if (v.answerUI !== 'tap') setNotes((xs) => [...xs, n]); },
    onOnset: (tm) => { if (v.answerUI === 'tap') setTaps((xs) => [...xs, tm]); },
    onFrame: (f) => {
      if (!singOne || singTarget === undefined || holdDone.current) return;
      const m = f.freq && f.rms >= gate ? 69 + 12 * Math.log2(f.freq / 440) : null;
      // guidé : il faut tenir la note JUSTE ; non guidé : toute note STABLE tenue devient la réponse
      const ok = m !== null && (guidedRef.current
        ? Math.abs(centsToTarget(m, singTarget)) <= t.tolerances.cents
        : holdRef.current === null || Math.abs(m - holdRef.current) <= 0.35);
      if (ok) {
        if (holdStart.current === null) { holdStart.current = f.tMs; holdRef.current = m; }
        const k = (f.tMs - holdStart.current) / HOLD_MS;
        setHold(k);
        if (k >= 1) { holdDone.current = true; submitRef.current({ kind: 'notes', notes: [{ midi: m!, tMs: 0 }] }); }
      } else { holdStart.current = null; holdRef.current = null; setHold(0); }
    },
  }, gate);
  useEffect(() => { if (phase === 'SAISIE') { holdDone.current = false; holdStart.current = null; holdRef.current = null; setHold(0); } }, [phase, attempt]);
  const switchToFallback = () => {
    setFallback(true);
    setInput(v.answerUI === 'tap' ? 'tap' : instrument === 'guitare' ? 'manche' : 'clavier');
  };

  const shake = useShake(`${phase}-${attempt}`);
  const shownTitle = displayTitle(t, params, instrument);
  useEffect(() => { setCurrentExercise({ id: t.id, title: shownTitle, attempt, phase }); }, [t.id, shownTitle, attempt, phase]);
  useEffect(() => () => setCurrentExercise(null), []);
  const pop = usePop(phase === 'SUCCES');

  // ---------- écoute et capture ----------
  const resetAnswers = () => { setNotes([]); setTaps([]); setSelected([]); setDegrees([]); setQuizIds([]); setStaffNotes([]); setFigs([]); };

  // accompagnement (grille I-IV-V…) joué en boucle pendant la saisie : accords sur les temps 1 et 3
  const backingRef = useRef<{ stop: () => void } | null>(null);
  const startBacking = () => {
    if (!v.backing) return;
    const { chords, beatsPerBar } = v.backing;
    const loops = Math.ceil((v.captureMs || 60000) / ((chords.length * beatsPerBar * 60000) / v.tempo)) + 1;
    const ev = Array.from({ length: loops }, (_, l) => chords.flatMap((c, b) => [0, 2].flatMap((k) => c.map((m) => ({ midi: m, start: (l * chords.length + b) * beatsPerBar + k, dur: 1.8 }))))).flat();
    backingRef.current = audio.play(ev, { tempo: v.tempo, instrument, volume: 0.35 });
  };
  const stopBacking = () => { backingRef.current?.stop(); backingRef.current = null; };
  useEffect(() => () => stopBacking(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // le micro capterait le bourdon ou l'accompagnement (et validerait la tonique tout seul) :
  // on les coupe pendant que le micro écoute, ils restent pendant l'écoute du modèle
  const micListening = () => inputRef.current === 'micro' || (v.answerUI === 'sing' && !fallbackRef.current);
  const startCapture = useCallback(() => {
    setOrigin(audio.now());
    setPhase('SAISIE');
    if (v.metronomeCapture) {
      // perroquet avec métronome : décompte de 4 temps puis clic sous la réponse
      // (au micro, pas de clic sonore : le micro le prendrait pour une frappe ; le décompte reste affiché)
      const beatMs = 60000 / (v.tempo * rate);
      if (!micListening()) audio.clicks((v.perBar ?? 4) + v.metronomeCapture, v.tempo * rate, undefined, v.perBar ?? 4);
      const cin = v.perBar ?? 4;
      setCount(cin);
      for (let k = 1; k <= cin; k++) timers.current.push(setTimeout(() => setCount(cin - k), k * beatMs));
      timers.current.push(setTimeout(() => setCount(null), (cin + 1) * beatMs));
    }
    if (micListening()) { audio.stopDrone(); return; }
    startBacking();
    if (v.captureMs > 0 && v.answerUI === 'free') {
      setFreeLeft(Math.round(v.captureMs / 1000));
      const iv = setInterval(() => setFreeLeft((s) => Math.max(0, s - 1)), 1000);
      timers.current.push(iv as unknown as ReturnType<typeof setTimeout>);
      timers.current.push(setTimeout(() => { clearInterval(iv); submitRef.current(); }, v.captureMs));
    }
  }, [v, rate]); // eslint-disable-line react-hooks/exhaustive-deps

  const playTonic = () => audio.play([{ midi: v.tonic, start: 0, dur: 1 }], { tempo: 80, instrument }).done;

  // contexte tonal (arpège + accord de tonique) avant les exercices d'oreille
  const playReference = () => audio.play(v.minorContext ? minorReference(v.tonic) : referenceEvents(v.tonic), { tempo: REFERENCE_TEMPO, instrument }).done;

  const melodyOnly = useRef(false);
  const playStimulus = useCallback(async () => {
    if (v.referenceTonic) await playReference();
    if (v.clickWithStimulus) audio.clicks(Math.ceil(Math.max(...v.stimulus.map((n) => n.start + n.dur))), v.tempo * rate, undefined, v.perBar ?? 4);
    // audiation : on n'entend pas le modèle avant de répondre, on se l'imagine (il reste disponible pour comparer)
    if (v.stimulus.length && !v.audiate) {
      // perroquet sur accords : l'accompagnement sonne en dessous, moins fort, avec l'autre timbre et feutré (aigus coupés) : la mélodie se détache
      if (v.stimulusBacking?.length && !melodyOnly.current) audio.play(v.stimulusBacking, { tempo: v.tempo, rate, instrument: instrument === 'piano' ? 'guitare' : 'piano', volume: 0.4, lowpassHz: 700 });
      melodyOnly.current = false;
      await audio.play(v.stimulus, { tempo: v.tempo, rate, instrument: v.stimulusKind === 'rhythm' ? 'bloc' : instrument }).done;
    }
  }, [v, rate, instrument]); // eslint-disable-line react-hooks/exhaustive-deps

  const listen = useCallback(async () => {
    await audio.init();
    if (introPoint) markPointSeen(introPoint.id);
    if (!placement) markTemplateSeen(t.id);
    resetAnswers();
    if (v.drone) audio.startDrone(v.drone);
    if (v.answerUI === 'quiz') { setPhase('SAISIE'); return; }
    setPhase('ECOUTE');
    if (v.simultaneous) {
      const tempo = v.tempo * rate;
      const beatMs = 60000 / tempo;
      const captureBeats = Math.ceil(v.captureMs / beatMs);
      const clickBeats = v.countInBeats + (v.clickDuringCapture ? captureBeats : 0);
      const pb = clickBeats > 0 ? audio.clicks(clickBeats, tempo, undefined, v.perBar ?? 4) : null;
      const zero = (pb ? pb.startMs : audio.now() + 60) + v.countInBeats * beatMs;
      if (v.stimulus.length) audio.play(v.stimulus, { tempo: v.tempo, rate, instrument, delayMs: 60 + v.countInBeats * beatMs });
      // l'instrument (ou le pad) est affiché dès le décompte : on se place et on frappe le 1er temps pile
      setOrigin(zero);
      setPhase('SAISIE');
      setCount(v.countInBeats || null);
      for (let k = 1; k <= v.countInBeats; k++) {
        const left = v.countInBeats - k;
        timers.current.push(setTimeout(() => setCount(left > 0 ? left : 0), Math.max(0, zero - audio.now() - left * beatMs)));
      }
      timers.current.push(setTimeout(() => setCount(null), Math.max(0, zero - audio.now() + beatMs)));
      timers.current.push(setTimeout(() => submitRef.current(), zero - audio.now() + v.captureMs / rate));
      setOrigin(zero);
      return;
    }
    await playStimulus();
    startCapture();
  }, [v, rate, instrument, playStimulus, startCapture]); // eslint-disable-line react-hooks/exhaustive-deps

  const replay = async () => {
    const n = replays + 1;
    setReplays(n);
    if (t.reecoutesMax !== null && n > t.reecoutesMax) addHelp(2);
    await playStimulus();
  };

  // ---------- analyse ----------
  answerRef.current = (): Answer => {
    switch (v.answerUI) {
      case 'quiz': return { kind: 'quiz', ids: quizIds };
      case 'tap': return { kind: 'taps', tMs: taps };
      case 'select': return { kind: 'set', midis: selected };
      case 'degrees': return { kind: 'degrees', items: degrees };
      case 'free': return { kind: 'free', notes };
      case 'staff': return { kind: 'notes', notes: [...(v.staffGiven ?? []), ...staffNotes].map((m, i) => ({ midi: m, tMs: i * 500 })) };
      case 'figures': return { kind: 'figures', items: figs };
      default: return { kind: 'notes', notes };
    }
  };

  // les minuteries appellent toujours la version à jour (évite les états périmés)
  const submitRef = useRef<(o?: Answer) => void>(() => undefined);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  submitRef.current = (o?: Answer) => submit(o);

  function submit(override?: Answer) {
    clearTimers();
    stopBacking();
    let res: ScoreResult;
    if (transcribing && v.transcription) {
      const r = scoreTranscription(v.transcription, degrees, true);
      res = { ...r, success: r.precision >= t.reussite.precisionMin };
    } else {
      res = scoreAnswer(t, { ...v, tempo: v.tempo * rate }, override ?? answerRef.current(), settings.latencyMs);
    }
    setLast(res);
    // « trouve la maison » : la vraie tonique joue juste après ta réponse, pour comparer
    if (v.revealTonic && !transcribing) {
      setRevealed(true);
      timers.current.push(setTimeout(() => { audio.play([{ midi: v.tonic, start: 0, dur: 2.5 }], { tempo: 60, instrument }); }, 350));
    }
    if (res.success) {
      audio.stopDrone();
      if (!transcribing && v.transcription && t.etapes?.includes('transcrire_degres')) {
        setStepPrecisions([res.precision]);
        setStep(1);
        setAttempt(1);
        setDegrees([]);
        setShowCorrection(false);
        setShowHint(false);
        setPhase('SAISIE');
        return;
      }
      finish(true, res);
      return;
    }
    if (placement) { audio.stopDrone(); finish(false, res); return; }
    if (attempt >= XP.maxAttempts) {
      audio.stopDrone();
      addHelp(5);
      setPhase('DEMO');
      playDemo();
      return;
    }
    // aides automatiques
    if (attempt === 2) {
      if (res.wrongIndexes.some((i) => prevWrong.includes(i))) { addHelp(3); setShowHint(true); }
      addHelp(4);
      setShowCorrection(true);
    }
    setPrevWrong(res.wrongIndexes);
    if (errorPoint) markPointSeen(errorPoint.id);
    audio.stopDrone();
    announce(`${res.precision >= 0.6 ? 'Presque' : 'Pas encore'}, ${Math.round(res.precision * 100)} %. ${res.errors.slice(0, 2).map((e) => e.message).join(' ')}`);
    setPhase('FEEDBACK');
  }

  function retry() {
    setShowAllErrors(false);
    setRevealed(false);
    setAttempt((a) => a + 1);
    if (transcribing || v.stimulusKind === 'none' && !v.simultaneous && v.answerUI !== 'quiz') {
      resetAnswers();
      if (v.drone) audio.startDrone(v.drone);
      startCapture();
    } else listen();
  }

  function finish(success: boolean, res: ScoreResult | null) {
    const precisions = transcribing ? [...stepPrecisions, res?.precision ?? 0] : [res?.precision ?? 0];
    const outcome: Outcome = {
      templateId: t.id, seed, params: mergeParams(t, params, level), attempt, success,
      precision: precisions.reduce((a, b) => a + b, 0) / precisions.length,
      helps: helps.filter((h) => h >= 2), errors: res?.errors ?? [], timeMs: audio.now() - startedAt.current,
    };
    if (!success) outcome.helps = [...new Set([...outcome.helps, 5])];
    const transcription = v.transcription && success
      ? { tonic: v.tonic, items: v.transcription }
      : t.mechanic === 'question_reponse' && success ? { tonic: v.tonic, items: degreeItemsFromNotes(v.tonic, notes.map((n) => ({ midi: Math.round(n.midi), dur: 1 }))) } : undefined;
    if (placement) {
      onFinished({ rating: success ? 3 : 1, xp: 0, newBadges: [], levelChange: 0, level }, outcome);
      onNext();
      return;
    }
    const info = recordResult(t, outcome, { inSession, transcription });
    announce(`${success ? 'Réussi' : 'Exercice terminé'}. Plus ${info.xp} XP. Précision ${Math.round(outcome.precision * 100)} %.`);
    setResult(info);
    onFinished(info, outcome);
    setPhase(success ? 'SUCCES' : 'RESULTAT');
    // réussi : on enchaîne tout seul (la vraie tonique de « trouve la maison » a le temps de sonner)
    if (success) timers.current.push(setTimeout(() => onNextRef.current(), v.revealTonic ? 3000 : 1100));
  }

  function playDemo() {
    const e = v.expected;
    if (e.kind === 'figures') { replay(); return; }
    if (e.kind === 'sequence') audio.play(e.notes, { tempo: v.tempo * 0.8, instrument });
    else if (e.kind === 'rhythm') audio.play(e.onsetsBeats.map((b) => ({ midi: 84, start: b, dur: 0.25 })), { tempo: v.tempo, instrument: 'bloc' });
    else if (e.kind === 'set') audio.play(e.midis.map((m, i) => ({ midi: m, start: i * 0.5, dur: 1 })), { tempo: 80, instrument });
    else if (e.kind === 'transcribe') audio.play(e.items.map((d, i) => ({ midi: degreeToMidi(v.tonic, d.degree, d.acc), start: i, dur: 1 })), { tempo: 80, instrument });
    else if (e.kind === 'quiz') {
      // quiz : la question en cours, puis l'exemple de la bonne réponse s'il existe
      const it = e.items[Math.min(quizIndex, e.items.length - 1)];
      const ok = it.choices.find((c) => c.id === it.answerId);
      audio.play(ok?.preview ?? it.stimulus, { tempo: ok?.preview ? 110 : it.tempo, instrument });
    }
  }

  function skip() {
    clearTimers();
    stopBacking();
    audio.stopAll(); audio.stopDrone(); audio.stopMic();
    onSkip?.();
  }

  // ---------- écoute comparative (ta version / le modèle) ----------
  const e = v.expected;
  const canCompare = !transcribing && (e.kind === 'sequence' || e.kind === 'rhythm' || e.kind === 'transcribe' || e.kind === 'figures') && (notes.length > 0 || taps.length > 0 || degrees.length > 0 || staffNotes.length > 0 || figs.length > 0);
  const beatMs = 60000 / (v.tempo * rate);
  const timeline = e.kind === 'rhythm' && taps.length ? (() => {
    let exp = e.onsetsBeats.map((b) => b * beatMs);
    let tp = taps.map((x) => x - settings.latencyMs);
    if (!e.absolute) { const e0 = exp[0]; const t0 = tp[0]; exp = exp.map((x) => x - e0); tp = tp.map((x) => x - t0); }
    return { expected: exp, taps: tp };
  })() : null;

  function playMine() {
    if (e.kind === 'figures') {
      let b = 0;
      const ev = figs.flatMap((f) => { const st = b; b += figureBeats(f); return figureOnsets(f).map((o) => ({ midi: 67, start: st + o, dur: f === 'blanche' ? 1.9 : 0.4 })); });
      audio.clicks(Math.max(1, b), v.tempo * rate, undefined, v.perBar ?? 4);
      audio.play(ev, { tempo: v.tempo * rate, instrument });
      return;
    }
    if (v.answerUI === 'staff') {
      audio.play([...(v.staffGiven ?? []), ...staffNotes].map((m, i) => ({ midi: m, start: i, dur: 0.9 })), { tempo: 90, instrument });
      return;
    }
    if (e.kind === 'rhythm') {
      const t0 = Math.min(...taps);
      audio.play(taps.map((x) => ({ midi: 84, start: (x - t0) / beatMs, dur: 0.25 })), { tempo: v.tempo * rate, instrument: 'bloc' });
    } else if (e.kind === 'transcribe') {
      audio.play(degrees.map((d, i) => ({ midi: degreeToMidi(v.tonic, d.degree, d.acc), start: i, dur: 0.9 })), { tempo: 90, instrument });
    } else if (notes.length) {
      const t0 = notes[0].tMs;
      audio.play(notes.map((n) => ({ midi: Math.round(n.midi), start: (n.tMs - t0) / beatMs, dur: 0.8 })), { tempo: v.tempo * rate, instrument });
    }
  }
  function playModel() {
    if (v.stimulusKind !== 'none' && !v.simultaneous) { replay(); return; }
    addHelp(3);
    playDemo();
  }

  // ---------- aides à la demande ----------
  // ralentir n'a pas de sens sans son, ni quand le tempo est justement la question
  const hasAudio = v.stimulus.length > 1 || v.simultaneous || (v.expected.kind === 'quiz' && v.expected.items.some((q) => q.stimulus.length > 2));
  const slowable = hasAudio && t.generator !== 'tempo_compare';
  const nextHelp = HELPS.find((h) => !helps.includes(h.level) && (h.level !== 2 || slowable));
  function applyHelp() {
    if (!nextHelp) return;
    addHelp(nextHelp.level);
    if (nextHelp.level === 2) setRate(0.7);
    if (nextHelp.level === 3) { setShowHint(true); playTonic(); }
    if (nextHelp.level === 4) setShowCorrection(true);
    if (nextHelp.level === 5) { clearTimers(); audio.stopDrone(); setPhase('DEMO'); playDemo(); }
  }

  // ---------- surlignages (indice, correction, démo, sélection) ----------
  const highlights = useMemo(() => {
    const h: Record<number, string> = {};
    const e = v.expected;
    const reveal = showCorrection || phase === 'DEMO';
    if (e.kind === 'sequence' && reveal) e.notes.forEach((n, i) => { h[n.midi] = last?.wrongIndexes.includes(i) ? colors.danger : color; });
    if (e.kind === 'sequence' && showHint && !reveal) h[e.notes[0].midi] = colors.warn;
    if (e.kind === 'set' && reveal) e.midis.forEach((m) => { h[m] = color; });
    if (e.kind === 'set' && showHint && !reveal) h[e.midis[0]] = colors.warn;
    if (v.allowedDegrees && capturing) v.allowedDegrees.forEach((d) => { h[degreeToMidi(v.tonic, d)] = `${color}AA`; });
    if (v.allowedPcs && capturing) for (let m = 36; m <= 96; m++) if (v.allowedPcs.includes(((m % 12) + 12) % 12)) h[m] = `${color}AA`;
    if (v.answerUI === 'select') selected.forEach((m) => { h[m] = colors.ink; });
    if (v.markRoot !== undefined && h[v.markRoot] === undefined) h[v.markRoot] = colors.gold;
    return h;
  }, [v, showCorrection, showHint, phase, last, selected, capturing, color]);

  const onInstrumentPress = (m: number) => {
    audio.playNote(m, instrument);
    if (!capturing) return;
    if (v.answerUI === 'select') { setSelected((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m])); return; }
    if (v.answerUI === 'sing' && singOne) { submit({ kind: 'notes', notes: [{ midi: m, tMs: 0 }] }); return; }
    setNotes((xs) => [...xs, { midi: m, tMs: audio.now() - origin }]);
  };

  // ---------- rendu ----------
  // exercices posés en noms de notes (construire, trouver, placer un accord) : pas de degrés ni de repère de tonique
  const namedTask = ['build_chord', 'build_scale', 'build_interval', 'find_note', 'play_chord'].includes(t.generator);
  // exercices de repérage : aucun nom ni degré sur les touches, sinon la réponse est écrite dessus
  const findTask = ['find_notes_series', 'play_staff_notes', 'find_note', 'find_tonic', 'find_function', 'step_on_instrument', 'key_sig_scale', 'name_play', 'five_finger', 'interval_play', 'minor_scale_play', 'grid_bass_play', 'fifths_bass_play', 'progression_arpeggio_play'].includes(t.generator);
  const keyLabels = findTask ? 'aucun' : namedTask || settings.showNoteNames ? 'notes' : 'degres';
  // audiation : pas de degrés sur les touches (sinon on lit au lieu d'entendre) ; seule la tonique reste marquée
  const instrumentLabels = v.audiate ? 'aucun' as const : keyLabels;
  if (openPoint) {
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <LessonPointCard point={openPoint} color={color} instrument={instrument} doneLabel="Retour à l'exercice" onDone={() => setOpenPoint(null)} />
      </ScrollView>
    );
  }

  const how = howToAnswer(t, v, input, instrument, keyLabels);
  // guitare : la fondamentale n'est marquée qu'à un seul endroit (la case la plus basse), pas sur toutes les cordes
  const rootMark = v.markRoot !== undefined && instrument === 'guitare' ? (() => {
    const open = [40, 45, 50, 55, 59, 64];
    const opts = open.map((o, si) => ({ si, f: v.markRoot! - o })).filter((x) => x.f >= 0 && x.f <= 7).sort((a, b) => a.f - b.f);
    return opts.length ? [{ string: opts[0].si, fret: opts[0].f, color: colors.gold, midi: v.markRoot }] : undefined;
  })() : undefined;
  // une seule portée quand les notes à jouer sont connues (gamme, motifs, lecture) : à jouer en gris, joué par-dessus
  const tabReading = instrument === 'guitare' && settings.guitarReading === 'tab';
  const unified = !transcribing && v.expected.kind === 'sequence' && !(tabReading && t.generator === 'play_staff_notes')
    && (t.generator === 'play_pattern' || t.generator === 'play_staff_notes' || t.generator === 'position_scale' || t.generator === 'position_arpeggio' || t.generator === 'five_finger' || t.generator === 'one_string_scale');
  const unifiedTargets = !unified || v.expected.kind !== 'sequence' ? [] : t.generator === 'play_staff_notes' && v.display?.kind === 'staff'
    ? v.display.midis : v.expected.notes.map((n) => n.midi + (instrument === 'guitare' ? 12 : 0));
  const unifiedLabels = v.guide ? v.guide.staffLabels
    : t.generator === 'play_staff_notes' ? undefined // lecture : pas de nom sous les notes
    : v.display?.kind === 'text' ? v.display.text.split(' ') : v.display?.kind === 'degrees' ? v.display.degrees : undefined;
  // portée en direct (retour bêta) : les notes jouées s'écrivent en clé de sol, au piano comme à la guitare
  const showLiveStaff = !unified && !v.guide && !(tabReading && t.generator === 'play_staff_notes') && settings.liveStaff !== false && (phase === 'SAISIE' || phase === 'FEEDBACK') && !transcribing
    && ['clavier', 'manche', 'micro'].includes(input) && ['sequence', 'select', 'free'].includes(v.answerUI);
  const liveMidis = v.answerUI === 'select' ? selected : notes.map((n) => n.midi);
  const showInstrument = (v.answerUI === 'sequence' || v.answerUI === 'select' || v.answerUI === 'free' || (v.answerUI === 'sing' && fallback)) && input !== 'micro';
  const expectedLabels = labelsOfExpected(v);
  const resultMidis = phase === 'RESULTAT' && !transcribing && ['sequence', 'select'].includes(v.answerUI)
    ? [...new Set((v.expected.kind === 'sequence' ? v.expected.notes.map((n) => n.midi) : v.expected.kind === 'set' ? v.expected.midis : [])
      // guitare : la partition s'écrit une octave au-dessus du son réel ; on montre la case qui sonne
      .map((m) => (instrument === 'guitare' && t.generator === 'play_staff_notes' && m >= 60 ? m - 12 : m)))] : [];
  const resultHL: Record<number, string> = Object.fromEntries(resultMidis.map((m) => [m, color]));

  return (
    <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={[styles.tag, { color }]}>{domainLabel[t.domain]} · {MECHANIC_LABEL[t.mechanic]}{transcribing ? ' · transcription' : ''}</Text>
        <View style={styles.headRight}>
          {placement ? <Text style={styles.attempt}>Une seule tentative</Text> : attempt > 1 || rate < 1 ? <Text style={styles.attempt}>{`Essai ${attempt}/${XP.maxAttempts}${rate < 1 ? ' · 70 %' : ''}`}</Text> : null}
          {onSkip && phase !== 'RESULTAT' && phase !== 'SUCCES' ? (
            <Pressable onPress={skip} accessibilityRole="button" accessibilityLabel="Passer cet exercice" hitSlop={10}>
              <Text style={[styles.skip, { color }]}>{placement ? 'Je ne sais pas' : 'Passer'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={type.title}>{transcribing ? 'Étape 2 sur 2 : écris la phrase en degrés, avec la durée de chaque note.' : v.prompt}</Text>
      {transcribing && capturing ? <Text style={styles.howLine}>Choisis la durée (croche, noire, blanche), puis touche le degré. ⌫ efface la dernière note. Puis Valider.</Text> : null}

      {unified ? (
        <ScoreStaff targets={unifiedTargets} labels={unifiedLabels} color={color} clef={v.display?.kind === 'staff' ? v.display.clef : 'sol'} keySig={v.display?.kind === 'staff' ? v.display.keySig : 0} octaveAgnostic={v.expected.kind === 'sequence' ? v.expected.octaveAgnostic : true}
          // guitare : la portée s'écrit une octave au-dessus du son réel, les notes jouées aussi (sinon elles tombaient une octave trop bas, en rouge)
          played={phase === 'SAISIE' || phase === 'FEEDBACK' ? notes.map((n) => n.midi + (instrument === 'guitare' ? 12 : 0)) : []} />
      ) : null}
      {!transcribing && !unified ? <DisplayView d={v.display} color={color} instrument={instrument} tab={settings.guitarReading === 'tab'} highlight={showCorrection ? last?.wrongIndexes ?? [] : []} /> : null}
      {resultMidis.length ? (
        // retour bêta : à la fin, la partition et les touches (ou cases) se voient ensemble, avec le nom des notes
        <View style={styles.resultInstr}>
          <Text style={styles.resultInstrLabel}>{instrument === 'guitare' ? 'Sur le manche' : 'Sur le clavier'} : {resultMidis.map((m) => pcName(m)).join(' · ')}</Text>
          {instrument === 'guitare'
            ? <Fretboard tonic={v.tonic} highlights={resultHL} labels="notes" showTonic={false} onPress={(m) => audio.playNote(m, instrument)} />
            : <Piano tonic={v.tonic} startMidi={Math.min(...resultMidis) < 60 ? 48 : 60} highlights={resultHL} labels="notes" showTonic={false} onPress={(m) => audio.playNote(m, instrument)} blackLabels />}
        </View>
      ) : null}
      {showHint && phase !== 'RESULTAT' && phase !== 'SUCCES' ? <View style={styles.hint}><Text style={type.body}>💡 {v.hint}</Text></View> : null}
      {showCorrection && capturing && expectedLabels ? <Text style={[styles.correction, { borderColor: color }]}>Attendu : {expectedLabels}</Text> : null}

      {inputOptions.length > 1 && ((phase === 'CONSIGNE' && (firstTime || showConsigne)) || phase === 'FEEDBACK') && !transcribing ? (
        <View style={styles.inputs}>
          {inputOptions.map((m) => (
            <Button key={m} small variant={m === input ? 'plein' : 'contour'} color={color} label={INPUT_LABEL[m]} onPress={() => setInput(m)} />
          ))}
        </View>
      ) : null}

      {phase === 'CONSIGNE' && !firstTime && !showConsigne ? (
        <View style={styles.block}>
          {introPoint ? <PointTip point={introPoint} color={color} instrument={instrument} label="Nouveau" onMore={() => setOpenPoint(introPoint)} /> : null}
          <Button color={color} label={v.stimulusKind !== 'none' || v.simultaneous ? '▶  Écouter' : '▶  Commencer'} onPress={listen} />
          <Button small variant="texte" color={colors.inkSoft} label="Comment répondre ?" onPress={() => setShowConsigne(true)} />
        </View>
      ) : null}
      {phase === 'CONSIGNE' && (firstTime || showConsigne) ? (
        <ConsigneCard
          color={color} instrument={instrument} faire={consigne?.faire ?? t.description} how={how} success={successText(t, v)} placement={!!placement}
          introPoint={introPoint} otherPoints={points.filter((pt) => pt !== introPoint && seenAtStart.includes(pt.id))}
          onOpenPoint={setOpenPoint} startLabel={v.stimulusKind !== 'none' || v.simultaneous ? 'Écouter et commencer' : 'Commencer'} onStart={listen}
        />
      ) : null}
      {capturing && !transcribing ? <Text style={styles.howLine}>{how}</Text> : null}
      {v.guide?.text && (capturing || phase === 'CONSIGNE') ? <Text style={[styles.howLine, { fontWeight: '800' }]}>{v.guide.text}</Text> : null}
      {v.drone && (phase === 'ECOUTE' || (capturing && !(input === 'micro' || (v.answerUI === 'sing' && !fallback)))) ? (
        <View style={styles.droneTag} accessibilityRole="text">
          <Text style={styles.droneText}>🔊 En fond : la tonique (1), la « maison ».</Text>
        </View>
      ) : null}
      {v.drone && capturing && (input === 'micro' || (v.answerUI === 'sing' && !fallback)) ? (
        <Text style={styles.howLine}>Le son de fond s'arrête pendant que tu chantes, pour ne pas tromper le micro. Garde la tonique en tête.</Text>
      ) : null}

      {phase === 'ECOUTE' ? <Text style={[styles.listening, { color }]}>{v.countInBeats ? 'Décompte… prépare-toi' : 'Écoute…'}</Text> : null}
      {/* hauteur réservée pendant toute la saisie : le clavier, le manche ou le pad ne bougent jamais
          quand le décompte s'efface (retour bêta : ils sautaient au moment de frapper le 1er temps) */}
      {capturing && (v.simultaneous || v.metronomeCapture) ? (
        <View style={styles.countBox}>
          <Text style={[styles.countIn, { color }]} accessibilityLiveRegion="assertive">{count === null ? '' : count > 0 ? count : 'Joue !'}</Text>
        </View>
      ) : null}

      {capturing ? (
        <View style={styles.block}>
          {v.answerUI === 'quiz' && v.expected.kind === 'quiz' ? (
            <QuizRunner items={v.expected.items} color={color} tonic={v.tonic} instrument={instrument} rate={rate} minor={!!v.minorContext} onIndex={setQuizIndex}
              onReplay={() => { if (t.reecoutesMax !== null && replays + 1 > t.reecoutesMax) addHelp(2); setReplays((r) => r + 1); }}
              onDone={(ids) => {
                setQuizIds(ids);
                submit({ kind: 'quiz', ids });
              }} />
          ) : null}

          {v.answerUI === 'tap' ? (
            input === 'micro'
              ? <Text style={type.body}>Frappe dans tes mains ou sur ton instrument : {taps.length} coup(s) détecté(s).</Text>
              : <TapPad color={color} onTap={() => setTaps((xs) => [...xs, audio.now() - origin])} label={`${taps.length} tape${taps.length > 1 ? 's' : ''}`} />
          ) : null}

          {!micError && (singing || (input === 'micro' && !transcribing && v.answerUI !== 'tap' && v.answerUI !== 'quiz')) ? (
            <View>
              <PitchMeter midi={liveMidi} tolCents={t.tolerances.cents} target={singing && guided ? singTarget : undefined} hold={singOne && singing && guided ? hold : undefined} />
              {singOne && singing ? (
                <Text style={styles.notesLine}>{guided ? 'Suis l\'aiguille et tiens la note juste' : 'Chante, puis tiens la note : ton oreille d\'abord'}</Text>
              ) : (
                <Text style={styles.notesLine}>{notes.map((n) => midiDegreeLabel(v.tonic, n.midi)).join(' · ') || 'Aucune note détectée'}</Text>
              )}
            </View>
          ) : null}
          {micError && micOn ? (
            <View style={styles.fallback}>
              <Text style={styles.error}>{micError}</Text>
              <Button small color={color} label={v.answerUI === 'tap' ? 'Taper sur l\'écran' : `Répondre ${instrument === 'guitare' ? 'au manche' : 'au clavier'}`} onPress={switchToFallback} />
            </View>
          ) : null}

          {v.answerUI === 'staff' && !transcribing ? (
            <StaffInput notes={staffNotes} given={v.staffGiven} onChange={(ns) => {
              // retour bêta : chaque note posée sur la portée sonne, pour entendre aussi son octave
              if (ns.length > staffNotes.length) audio.play([{ midi: ns[ns.length - 1], start: 0, dur: 0.8 }], { tempo: 80, instrument: 'piano' });
              setStaffNotes(ns);
            }} color={color} wrongIndexes={showCorrection ? last?.wrongIndexes : []} />
          ) : null}
          {v.answerUI === 'figures' && v.expected.kind === 'figures' ? (
            <RhythmComposer items={figs} onChange={setFigs} color={color} figures={v.expected.palette}
              total={v.expected.items.reduce((a, x) => a + figureBeats(x), 0)} wrongIndexes={showCorrection ? last?.wrongIndexes : []} />
          ) : null}
          {transcribing || v.answerUI === 'degrees' ? (
            <DegreePad items={degrees} onChange={setDegrees} withDurations={transcribing} names={transcribing ? undefined : v.padNames} color={color} wrongIndexes={showCorrection ? last?.wrongIndexes : []} />
          ) : null}

          {v.answerUI === 'free' ? <Text style={[styles.listening, { color }]}>{freeLeft} s · {notes.length} notes jouées</Text> : null}

          {showLiveStaff ? <LiveStaff midis={liveMidis} instrument={instrument} tab={settings.guitarReading === 'tab'} color={color} /> : null}
          {showInstrument && !transcribing ? (
            <View>
              {/* les notes jouées sont déjà écrites sur la portée : pas de 3e affichage en degrés */}
              {v.answerUI === 'sequence' && !unified && !showLiveStaff ? <Text style={styles.notesLine}>{notes.map((n) => midiDegreeLabel(v.tonic, n.midi)).join(' · ') || ' '}</Text> : null}
              {instrument === 'guitare' && input === 'manche'
                ? <Fretboard tonic={v.tonic} highlights={highlights} zone={v.guide?.zone}
                {...(v.guide?.zone ? { startFret: Math.max(0, v.guide.zone.frets[0] - 1), frets: Math.max(7, v.guide.zone.frets[1] - v.guide.zone.frets[0] + 3) } : {})} marks={[...(v.guide?.marks.map((m) => ({ ...m, color: `${color}CC` })) ?? []), ...(rootMark ?? [])].length ? [...(v.guide?.marks.map((m) => ({ ...m, color: `${color}CC` })) ?? []), ...(rootMark ?? [])] : undefined} onPress={onInstrumentPress} labels={instrumentLabels} showTonic={((!(namedTask || findTask) && !v.guide) || !!v.audiate) && !v.hideTonic} />
                : <Piano tonic={v.tonic} startMidi={v.tonic < 60 ? 48 : 60} highlights={highlights} onPress={onInstrumentPress} labels={instrumentLabels} showTonic={!(namedTask || findTask) || !!v.audiate} blackLabels={t.palier >= 2} />}
            </View>
          ) : null}

          {v.answerUI !== 'quiz' && !(v.simultaneous && !transcribing) && v.answerUI !== 'free' && !(singOne && singing && !guided) ? (
            <View style={styles.row}>
              {notes.length || selected.length || degrees.length || taps.length || staffNotes.length || figs.length ? (
                <Button variant="texte" color={colors.inkSoft} label="⌫ Dernière note" accessibilityLabel="Effacer la dernière note"
                  onPress={() => {
                    // retour bêta : effacer seulement la dernière note, pas toute la réponse
                    // un seul bouton d'effacement par écran : il agit sur la saisie en cours, quelle qu'elle soit
                    if (transcribing || v.answerUI === 'degrees') setDegrees((xs) => xs.slice(0, -1));
                    else if (v.answerUI === 'staff') setStaffNotes((xs) => xs.slice(0, -1));
                    else if (v.answerUI === 'figures') setFigs((xs) => xs.slice(0, -1));
                    else if (v.answerUI === 'select') setSelected((xs) => xs.slice(0, -1));
                    else if (taps.length && !notes.length) setTaps((xs) => xs.slice(0, -1));
                    else setNotes((xs) => xs.slice(0, -1));
                  }} />
              ) : <View />}
              <Button color={color} label="Valider" onPress={() => submit()} />
            </View>
          ) : null}
        </View>
      ) : null}

      {phase === 'FEEDBACK' && last ? (
        <FeedbackPanel
          last={last} color={color} instrument={instrument} revealed={revealed} shake={shake}
          showAllErrors={showAllErrors} onShowAllErrors={() => setShowAllErrors(true)}
          correction={showCorrection ? expectedLabels : null}
          timeline={timeline ? { ...timeline, tolMs: t.tolerances.ms } : null}
          compare={canCompare ? { onMine: playMine, onModel: playModel, modelIsHint: v.stimulusKind === 'none' && !v.audiate } : null}
          tip={placement ? null : errorPoint ? { point: errorPoint, kind: 'conseil' } : points[0] ? { point: points[0], kind: 'rappel' } : null}
          onOpenPoint={setOpenPoint} onRetry={retry}
        />
      ) : null}

      {phase === 'DEMO' ? (
        <View style={styles.block}>
          <Text style={type.title}>Démonstration</Text>
          {expectedLabels ? <Text style={[styles.correction, { borderColor: color }]}>{expectedLabels}</Text> : null}
          <Button variant="contour" color={color} label="Réécouter la démonstration" onPress={playDemo} />
          <Button color={color} label="Continuer" onPress={() => finish(false, last)} />
        </View>
      ) : null}

      {phase === 'SUCCES' ? (
        <Pressable onPress={() => { clearTimers(); onNext(); }} accessibilityRole="button" accessibilityLabel="Réussi. Suivant">
          <Animated.Text style={[styles.success, pop]}>✓ Bravo !</Animated.Text>
        </Pressable>
      ) : null}

      {phase === 'RESULTAT' && result ? (
        <View style={styles.block}>
          <Text style={type.body}>Pas grave : il reviendra bientôt, un peu plus facile.</Text>
          {revealed ? <Button small variant="contour" color={color} label="▶ Réécouter la vraie tonique" onPress={() => audio.play([{ midi: v.tonic, start: 0, dur: 2.5 }], { tempo: 60, instrument })} /> : null}
          <Button color={color} label="Suivant" onPress={onNext} />
        </View>
      ) : null}

      {!placement && (capturing || phase === 'FEEDBACK') && !(v.simultaneous && capturing) ? (
        <View style={styles.helpBar}>
          {v.stimulusKind !== 'none' && v.answerUI !== 'quiz' ? (
            <Button small variant="contour" color={colors.inkSoft}
              label={t.reecoutesMax === null ? 'Réécouter' : `Réécouter (${Math.max(0, t.reecoutesMax - replays)})`} onPress={replay} />
          ) : null}
          {v.stimulusBacking?.length && v.answerUI !== 'quiz' ? (
            <Button small variant="contour" color={colors.inkSoft} label="La mélodie seule" onPress={() => { melodyOnly.current = true; replay(); }} />
          ) : null}
          {nextHelp ? <Button small variant="contour" color={colors.inkSoft} label={`Aide : ${nextHelp.label}`} onPress={applyHelp} /> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  pad: { padding: 20, gap: 14, paddingBottom: 60 },
  resultInstr: { gap: 6 },
  resultInstrLabel: { fontSize: 13, fontWeight: '800', color: colors.inkSoft },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  skip: { fontWeight: '800', fontSize: 15 },
  tag: { fontWeight: '800', fontSize: 13 },
  attempt: { color: colors.inkSoft, fontSize: 13 },
  degrees: { fontSize: 34, fontWeight: '800', textAlign: 'center', letterSpacing: 4 },
  hint: { backgroundColor: colors.hintBg, borderRadius: 14, padding: 12 },
  inputs: { flexDirection: 'row', gap: 8 },
  block: { gap: 12 },
  listening: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginVertical: 30 },
  notesLine: { textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.ink, minHeight: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  correction: { borderLeftWidth: 4, paddingLeft: 10, fontSize: 16, fontWeight: '700', color: colors.ink },
  success: { fontSize: 36, fontWeight: '900', color: colors.success, textAlign: 'center', marginVertical: 30 },
  compare: { gap: 6 },
  consigne: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 4 },
  cHead: { fontWeight: '900', fontSize: 13, marginTop: 8 },
  points: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  droneTag: { backgroundColor: colors.card, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.line },
  droneText: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  countIn: { fontSize: 44, lineHeight: 52, fontWeight: '900', textAlign: 'center' },
  countBox: { height: 56, justifyContent: 'center' },
  reminder: { backgroundColor: colors.hintBg, borderRadius: 14, padding: 12, gap: 6 },
  howLine: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  fallback: { gap: 8, alignItems: 'center', backgroundColor: colors.dangerBg, borderRadius: 14, padding: 12 },
  helpBar: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  choices: { gap: 10 },
  choice: { paddingVertical: 18 },
  error: { color: colors.danger, textAlign: 'center' },
});
