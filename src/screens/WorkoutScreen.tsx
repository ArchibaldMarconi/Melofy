// Page 2 — Workout (0.20.0) : la séance du jour en 5 parties, tirée des leçons vues, jouée d'une traite.
// 1 Révision et validation · 2 Ear training · 3 Mapping · 4 Perroquet · 5 Technique (option).
// Au lancement, l'appli demande la situation (instrument sous la main, voix possible) et adapte les réponses.
import { displayTitle } from '../content/titles';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlanItem, WorkoutPart } from '../content/types';
import { CONCEPTS } from '../content/concepts';
import { TEMPLATES, templateById } from '../content/templates';
import { DEEP_LESSONS, deepLessonById } from '../content/deep';
import { newSeed } from '../engine/rng';
import { buildWorkout, PART_LABEL, PART_LINE, PART_ORDER } from '../engine/workout';
import { confirmProgress, lessonsToDiscover } from '../engine/cursus';
import { techSteps, TECH_SCALES } from '../engine/technique';
import { LESSON_POINTS } from '../content/lessons';
import { ExercisePlayer } from '../exercise/ExercisePlayer';
import { dayKey, lessonProgressOf, useUserStore } from '../store/useUserStore';
import { Button } from '../components/Button';
import { ConfirmBar } from '../components/ConfirmBar';
import { FeedbackButton } from '../components/FeedbackButton';
import { useCountUp, usePop } from '../components/Celebration';
import { BADGES } from '../content/badges';
import { Animated } from 'react-native';
import { colors, domainColor, type } from '../theme';
import type { RootStackParamList } from './navigation';
const DOMAIN_LABEL: Record<string, string> = { rythme: 'Rythme', oreille: 'Oreille', theorie: 'Théorie', technique: 'Technique', impro: 'Impro', repiquage: 'Repiquage' };

const BLOCK_LABEL: Partial<Record<PlanItem['block'], string>> = {
  confirmation: 'Validation', application: 'Pratique de la leçon', revision: 'Révision', consolidation: 'Consolidation', reinjection: 'À retenter',
  oreille: 'Ear training', mapping: 'Mapping', perroquet: 'Perroquet', technique: 'Technique',
};
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

type Mode = 'plan' | 'situation' | 'running' | 'done';

export function WorkoutScreen() {
  const st = useUserStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [mode, setMode] = useState<Mode>('plan');
  const [items, setItems] = useState<PlanItem[]>([]);
  const [i, setI] = useState(0);
  /** écran de titre de partie déjà montré pour cette partie */
  const [introDone, setIntroDone] = useState<WorkoutPart | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [summary, setSummary] = useState<{ xp: number; streak: number; badges: string[]; perfect: boolean; counted: boolean } | null>(null);
  // instantané au départ : pour montrer, à la fin, ce qui a avancé dans chaque domaine et les points validés
  const before = useRef<{ acquired: Set<string>; points: Set<string> }>({ acquired: new Set(), points: new Set() });
  const confirmed = useRef<string[]>([]);
  const techUp = useRef<string[]>([]);
  const earned = useRef(0);
  const perfect = useRef(true);
  const stats = useRef({ ok: 0, done: 0, precision: 0 });
  const reinjected = useRef(new Set<string>());

  // Pas d'onglets pendant la séance : un seul objectif à l'écran.
  useEffect(() => {
    navigation.setOptions({ tabBarStyle: mode === 'running' || mode === 'situation' ? { display: 'none' } : { backgroundColor: colors.card, borderTopColor: colors.line } } as never);
  }, [mode, navigation]);

  const hasInstrument = st.settings.hasInstrument ?? true;
  const canSing = st.settings.canSing ?? true;
  const techMin = st.settings.techniqueMinutes ?? 0;
  const progress = lessonProgressOf(st);
  const makePlan = (o: { hasInstrument: boolean; canSing: boolean }) => buildWorkout({
    templates: TEMPLATES, competences: st.competences, progress: lessonProgressOf(useUserStore.getState()), minutes: st.settings.sessionMinutes,
    techniqueMinutes: useUserStore.getState().settings.techniqueMinutes ?? 0, instrument: st.settings.instrument, hasInstrument: o.hasInstrument, canSing: o.canSing,
    now: Date.now(), today: dayKey(), seed: hash(dayKey()), avgTimeS: st.avgTimeS, techProgress: useUserStore.getState().techProgress,
  });
  const plan = useMemo(() => makePlan({ hasInstrument, canSing }),
    [st.settings.sessionMinutes, techMin, hasInstrument, canSing, st.settings.instrument, mode === 'plan', st.deepLessonsSeen?.length, st.deepLessonsDone?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const discover = lessonsToDiscover(progress, st.settings.instrument)[0];
  const canStart = st.canStartWorkout();

  const start = (o: { hasInstrument: boolean; canSing: boolean }) => {
    st.setSettings(o);
    earned.current = 0;
    perfect.current = true;
    stats.current = { ok: 0, done: 0, precision: 0 };
    reinjected.current.clear();
    confirmed.current = [];
    techUp.current = [];
    setItems(makePlan(o).items);
    setI(0);
    setIntroDone(null);
    setSkipped(0);
    setConfirmQuit(false);
    before.current = { acquired: new Set(Object.values(st.competences).filter((c) => c.reps > 0 && (c.successes ?? 0) > 0).map((c) => c.key)), points: new Set(st.validatedPoints ?? []) };
    setMode('running');
  };

  const next = (stopNow = false) => {
    if (!stopNow && i + 1 < items.length) { setI(i + 1); return; }
    const done = stats.current.done;
    if (done === 0) {
      setSummary({ xp: 0, streak: st.streak, badges: [], perfect: false, counted: false });
      setMode('done');
      return;
    }
    const res = st.completeSession({ xp: earned.current, exercises: items.length, perfect: perfect.current, minutes: st.settings.sessionMinutes, done });
    setSummary({ xp: earned.current + res.bonusXp, streak: res.streak, badges: res.newBadges, perfect: perfect.current, counted: true });
    setMode('done');
  };

  // ---------- situation : demandée à chaque séance, pré-remplie avec la dernière réponse ----------
  if (mode === 'situation') {
    return <SituationScreen instrument={st.settings.instrument} initial={{ hasInstrument, canSing }} onCancel={() => setMode('plan')} onGo={start} />;
  }

  if (mode === 'running') {
    const it = items[i];
    if (!it) { setTimeout(() => next(true), 0); return <SafeAreaView style={styles.screen} />; }
    const t = templateById(it.templateId);
    const part = it.wpart ?? 'revision';
    const prevPart = i > 0 ? items[i - 1].wpart ?? 'revision' : null;
    // écran de titre à l'entrée de chaque partie
    if (part !== prevPart && introDone !== part) {
      const partsLeft = PART_ORDER.filter((pp) => items.some((x) => (x.wpart ?? 'revision') === pp));
      const k = partsLeft.indexOf(part) + 1;
      const mins = Math.max(1, Math.round(items.filter((x) => (x.wpart ?? 'revision') === part).reduce((a, x) => a + (x.estS ?? 60), 0) / 60));
      const instrName = st.settings.instrument === 'guitare' ? 'ta guitare' : 'ton piano';
      const how = part === 'oreille' ? 'Un casque aide : réponds à l\'écran.'
        : part === 'revision' ? 'À l\'écran, et sur ton instrument quand un exercice le demande.'
        : it.input === 'micro' ? `Avec ${instrName} : l'appli t'écoute au micro. Installe-toi au calme, téléphone posé près de toi.` : `À l'écran, sur ${st.settings.instrument === 'guitare' ? 'le manche' : 'le clavier'} affiché.`;
      return (
        <SafeAreaView style={styles.screen}>
          <ScrollView contentContainerStyle={[styles.content, { paddingTop: 40 }]}>
            <Text style={styles.partKicker}>Partie {k} sur {partsLeft.length} · environ {mins} min</Text>
            <Text style={type.display}>{PART_LABEL[part]}</Text>
            <Text style={type.body}>{PART_LINE[part]}</Text>
            <Text style={type.small}>{how}</Text>
            <Button label="C'est parti" onPress={() => setIntroDone(part)} />
            <Button variant="texte" color={colors.inkSoft} label="Terminer la séance ici" onPress={() => next(true)} />
          </ScrollView>
        </SafeAreaView>
      );
    }
    const label = it.tech ? `Technique · ${it.tech.label}` : it.confirmLesson ? `Validation · leçon ${deepLessonById(it.confirmLesson)?.number} « ${deepLessonById(it.confirmLesson)?.title} »` : `${PART_LABEL[part]}${BLOCK_LABEL[it.block] && part === 'revision' ? ` · ${BLOCK_LABEL[it.block]}` : ''}`;
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => setConfirmQuit(true)} accessibilityLabel="Quitter la séance" hitSlop={10}><Text style={styles.quit}>✕</Text></Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(i / items.length) * 100}%`, backgroundColor: domainColor[t.domain] }]} />
          </View>
          <Text style={styles.xpLive}>{earned.current} XP</Text>
        </View>
        {confirmQuit ? (
          <ConfirmBar
            text="Quitter la séance ? L'XP des exercices faits est gardée, mais la séance ne compte pas pour ta série."
            confirmLabel="Quitter" cancelLabel="Continuer" danger
            onConfirm={() => { setConfirmQuit(false); setMode('plan'); }} onCancel={() => setConfirmQuit(false)}
          />
        ) : null}
        <Text style={styles.blockLabel}>{label} · {i + 1}/{items.length}</Text>
        <View style={{ alignItems: 'center' }}><FeedbackButton where={`séance, ${label}`} compact /></View>
        <ExercisePlayer
          key={`${i}-${it.seed}`} template={t} params={it.params} seed={it.seed} inSession
          inputOverride={it.input ?? 'ecran'}
          onFinished={(info, o) => {
            earned.current += info.xp;
            stats.current.done += 1;
            stats.current.ok += o.success ? 1 : 0;
            stats.current.precision += o.precision;
            if (o.helps.length || info.rating === 1) perfect.current = false;
            const store = useUserStore.getState();
            // confirmation réussie : la leçon est définitivement validée
            if (it.confirmLesson && o.success && !confirmed.current.includes(it.confirmLesson)) {
              store.confirmDeepLesson(it.confirmLesson);
              confirmed.current.push(it.confirmLesson);
            }
            // module technique : on franchit l'étape en cours, ou le tempo évolue
            if (it.tech) {
              const cur = store.techProgress?.[it.tech.scale]?.step ?? 0;
              if (it.tech.kind === 'tempo') store.recordTechnique(it.tech.scale, 'tempo', o.success && o.precision >= 0.9, it.tech.maxStep);
              else if (o.success && it.tech.stepIndex === cur) {
                store.recordTechnique(it.tech.scale, 'step', true, it.tech.maxStep);
                techUp.current.push(it.tech.label);
                // étape franchie : la suite du module passe à l'étape suivante, dans la même séance
                const sc = TECH_SCALES.find((x) => x.key === it.tech!.scale);
                const steps = sc ? techSteps(sc, st.settings.instrument) : [];
                const nx = steps[cur + 1];
                if (nx) {
                  const tempo = useUserStore.getState().techProgress?.[sc!.key]?.tempo ?? 60;
                  setItems((xs) => xs.map((x, k) => (k > i && x.tech && x.tech.scale === sc!.key && x.tech.stepIndex === cur
                    ? { ...x, templateId: nx.templateId, params: nx.kind === 'tempo' ? { ...nx.params, tempo_cle: tempo } : nx.params, seed: newSeed(), tech: { ...x.tech, stepIndex: cur + 1, kind: nx.kind, label: nx.label } } : x)));
                }
              }
            }
            // Réinjection : une variante du même exercice en fin de séance, une seule fois (sauf validation et technique)
            if (!o.success && !it.confirmLesson && !it.tech && it.block !== 'reinjection' && !reinjected.current.has(t.id)) {
              reinjected.current.add(t.id);
              setItems((xs) => [...xs, { ...it, seed: newSeed(), block: 'reinjection' }]);
            }
          }}
          onNext={() => next()}
          onSkip={() => { perfect.current = false; setSkipped((k) => k + 1); next(); }}
        />
      </SafeAreaView>
    );
  }

  if (mode === 'done' && summary) {
    const now = useUserStore.getState();
    const advanced = Object.values(now.competences).filter((c) => c.reps > 0 && (c.successes ?? 0) > 0 && !before.current.acquired.has(c.key));
    const progressByDomain = (['rythme', 'oreille', 'theorie', 'technique', 'impro', 'repiquage'] as const).map((d) => ({
      d, titles: advanced.filter((c) => c.domain === d).map((c) => CONCEPTS.find((x) => x.id === c.conceptId)?.title ?? c.conceptId),
    })).filter((x) => x.titles.length);
    const points = (now.validatedPoints ?? []).filter((p) => !before.current.points.has(p)).map((p) => LESSON_POINTS[p]?.title).filter(Boolean) as string[];
    const lessonsOk = confirmed.current.map((id) => deepLessonById(id)).filter(Boolean).map((l) => `Leçon ${l!.number} · ${l!.title}`);
    return <SessionSummary summary={summary} stats={stats.current} skipped={skipped} progress={progressByDomain} points={points} lessons={lessonsOk} tech={techUp.current} onClose={() => setMode('plan')} />;
  }

  // ---------- page du workout ----------
  const partMin = (part: WorkoutPart) => Math.max(1, Math.round(plan.items.filter((x) => (x.wpart ?? 'revision') === part).reduce((a, x) => a + (x.estS ?? 60), 0) / 60));
  const minutes = Math.max(1, Math.round(plan.estimatedS / 60));
  const pendingConfirm = DEEP_LESSONS.filter((l) => progress.done.includes(l.id) && !progress.confirmed.includes(l.id));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={type.display}>Séance du jour</Text>
        <View style={styles.streakRow}>
          {st.streak ? <Text style={styles.streakChip}>🔥 {st.streak} jour{st.streak > 1 ? 's' : ''}</Text> : null}
          <Text style={type.small}>{st.lastSessionDay === dayKey() ? 'Séance faite aujourd\'hui ✓' : st.streak ? 'Fais ta séance pour garder ta série' : 'Ta première série commence aujourd\'hui'}</Text>
        </View>

        {plan.needsLesson ? (
          <View style={styles.hero}>
            <Text style={styles.heroKicker}>Pour commencer</Text>
            <Text style={[type.title, { color: colors.onPrimary }]}>Ta séance se construit à partir de tes leçons</Text>
            <Text style={styles.heroLine}>Fais ta première leçon : en quelques minutes, tu écoutes, tu comprends, et la séance du jour s'ouvre avec ses exercices.</Text>
            {lessonsToDiscover(progress, st.settings.instrument).map((l) => (
              <Pressable key={l.id} onPress={() => navigation.navigate('DeepLesson', { id: l.id })} accessibilityRole="button" accessibilityLabel={`Commencer la leçon ${l.number} : ${l.title}`}
                style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.85 }]}>
                <Text style={styles.heroBtnText}>▶  Leçon {l.number} · {l.title}</Text>
              </Pressable>
            ))}
          </View>
        ) : canStart ? (
          <View style={styles.hero}>
            <Text style={styles.heroKicker}>{plan.items.length} exercices · environ {minutes} min</Text>
            <Pressable onPress={() => setMode('situation')} disabled={plan.items.length === 0} accessibilityRole="button" accessibilityLabel="Commencer la séance"
              style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.85 }, plan.items.length === 0 && { opacity: 0.5 }]}>
              <Text style={styles.heroBtnText}>▶  Commencer la séance</Text>
            </Pressable>
            <Text style={styles.heroLine}>{hasInstrument ? (st.settings.instrument === 'guitare' ? 'Avec ta guitare' : 'Avec ton piano') : 'À l\'écran'} · {canSing ? 'chant possible' : 'sans chant'} · modifiable au lancement.</Text>
          </View>
        ) : (
          <View style={styles.locked}>
            <Text style={type.title}>Séance du jour terminée ✓</Text>
            <Text style={type.body}>Ta prochaine séance gratuite arrive demain. Le premium débloque des séances supplémentaires ; le métronome et l'accordeur restent accessibles.</Text>
          </View>
        )}

        {!plan.needsLesson && discover ? (
          <Pressable onPress={() => navigation.navigate('DeepLesson', { id: discover.id })} accessibilityRole="button" accessibilityLabel={`Nouvelle leçon : ${discover.title}`} style={styles.newLesson}>
            <Text style={styles.partKicker}>Nouvelle leçon ouverte</Text>
            <Text style={type.title}>Leçon {discover.number} · {discover.title}</Text>
            <Text style={type.small}>Ses exercices entreront dans ta séance dès que tu l'auras vue.</Text>
          </Pressable>
        ) : null}

        <View style={styles.durRow}>
          <Text style={type.small}>Durée</Text>
          <View style={styles.durations}>
            {[10, 15, 20, 25, 30].map((m) => {
              const on = st.settings.sessionMinutes === m;
              return (
                <Pressable key={m} onPress={() => st.setSettings({ sessionMinutes: m })} style={[styles.dur, on && styles.durOn]} accessibilityRole="radio" aria-checked={on} accessibilityState={{ checked: on }}>
                  <Text style={[styles.durText, on && { color: colors.onFill }]}>{m} min</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={type.small}>Module technique</Text>
          <View style={styles.durations}>
            {([0, 5, 10] as const).map((m) => {
              const on = techMin === m;
              return (
                <Pressable key={m} onPress={() => st.setSettings({ techniqueMinutes: m })} style={[styles.dur, on && styles.durOn]} accessibilityRole="radio" aria-checked={on} accessibilityState={{ checked: on }} accessibilityLabel={m ? `Technique plus ${m} minutes` : 'Sans technique'}>
                  <Text style={[styles.durText, on && { color: colors.onFill }]}>{m ? `+ ${m} min` : 'Non'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {pendingConfirm.length ? (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>À confirmer dans tes séances</Text>
            {pendingConfirm.map((l) => {
              const c = confirmProgress(l, progress, st.settings.instrument);
              return <Text key={l.id} style={type.small}>Leçon {l.number} · {l.title} : {c.done}/{c.total} exercices réussis sur deux jours</Text>;
            })}
          </View>
        ) : null}

        {plan.items.length ? <Text style={[type.title, { marginTop: 4 }]}>Au programme</Text> : null}
        {PART_ORDER.filter((part) => plan.items.some((x) => (x.wpart ?? 'revision') === part)).map((part, k) => (
          <View key={part} style={styles.partBox}>
            <Text style={styles.partKicker}>Partie {k + 1} · environ {partMin(part)} min{part === 'technique' ? ' en plus' : ''}</Text>
            <Text style={type.title}>{PART_LABEL[part]}</Text>
            <Text style={type.small}>{PART_LINE[part]}</Text>
            {plan.items.filter((x) => (x.wpart ?? 'revision') === part).map((x, j) => {
              const t = templateById(x.templateId);
              return (
                <View key={j} style={styles.item}>
                  <View style={[styles.dot, { backgroundColor: domainColor[t.domain] }]} />
                  <Text style={[type.body, { flex: 1 }]}>{x.tech ? x.tech.label : x.confirmLesson ? `Validation de la leçon ${deepLessonById(x.confirmLesson)?.number}` : displayTitle(t, x.params, st.settings.instrument)}</Text>
                  {x.input === 'micro' ? <Text style={styles.badge}>🎙</Text> : null}
                  <Text style={styles.badge}>{Math.max(1, Math.round((x.estS ?? 60) / 60))} min</Text>
                </View>
              );
            })}
          </View>
        ))}
        {!plan.needsLesson && plan.items.length === 0 ? <Text style={type.body}>Rien à pratiquer aujourd'hui : découvre une nouvelle leçon dans l'arbre.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** « As-tu ton instrument ? Peux-tu chanter ? » : un écran, deux réponses, retenues pour la prochaine fois */
function SituationScreen({ instrument, initial, onGo, onCancel }: { instrument: 'piano' | 'guitare'; initial: { hasInstrument: boolean; canSing: boolean }; onGo: (o: { hasInstrument: boolean; canSing: boolean }) => void; onCancel: () => void }) {
  const [hasInstrument, setHas] = useState(initial.hasInstrument);
  const [canSing, setSing] = useState(initial.canSing);
  const name = instrument === 'guitare' ? 'ta guitare' : 'ton piano';
  const choice = (on: boolean, label: string, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="radio" aria-checked={on} accessibilityState={{ checked: on }} style={[styles.dur, on && styles.durOn]}>
      <Text style={[styles.durText, on && { color: colors.onFill }]}>{label}</Text>
    </Pressable>
  );
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 40 }]}>
        <Text style={type.display}>Ta situation</Text>
        <Text style={type.body}>La séance s'adapte : mêmes parties, autre façon de répondre.</Text>
        <Text style={type.title}>As-tu {name} sous la main ?</Text>
        <View style={styles.durations}>
          {choice(hasInstrument, 'Oui', () => setHas(true))}
          {choice(!hasInstrument, 'Non, à l\'écran', () => setHas(false))}
        </View>
        <Text style={type.small}>{hasInstrument ? 'Mapping, perroquet et technique se jouent sur ton instrument : l\'appli t\'écoute au micro.' : 'Tout se fait sur le clavier ou le manche affiché ; les exercices qui demandent ton instrument reviendront plus tard.'}</Text>
        <Text style={type.title}>Peux-tu chanter (ou faire un peu de bruit) ?</Text>
        <View style={styles.durations}>
          {choice(canSing, 'Oui', () => setSing(true))}
          {choice(!canSing, 'Non, en silence', () => setSing(false))}
        </View>
        <Text style={type.small}>{canSing ? 'Les exercices chantés sont au programme.' : 'Pas de chant aujourd\'hui : il reviendra à une séance où tu peux chanter.'}</Text>
        <Button label="C'est parti" onPress={() => onGo({ hasInstrument, canSing })} />
        <Button variant="texte" color={colors.inkSoft} label="Retour" onPress={onCancel} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionSummary({ summary, stats, skipped, progress, points, lessons = [], tech = [], onClose }: {
  summary: { xp: number; streak: number; badges: string[]; perfect: boolean; counted: boolean };
  stats: { ok: number; done: number; precision: number }; skipped: number; onClose: () => void;
  progress: { d: string; titles: string[] }[]; points: string[]; lessons?: string[]; tech?: string[];
}) {
  const xp = useCountUp(summary.xp, 900);
  const flame = usePop(summary.streak);
  if (!summary.counted) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={type.display}>Séance passée</Text>
        <Text style={[type.body, { textAlign: 'center' }]}>Tu as passé tous les exercices : la séance ne compte pas pour ta série. Relance-la quand tu veux.</Text>
        <Button label="Fermer" onPress={onClose} />
      </SafeAreaView>
    );
  }
  const avg = stats.done ? Math.round((stats.precision / stats.done) * 100) : 0;
  const won = BADGES.filter((b) => summary.badges.includes(b.id));
  // retour bêta : le récapitulatif doit défiler quand il dépasse l'écran
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.center, { flexGrow: 1, paddingBottom: 40 }]}>
      <Animated.Text style={[styles.flame, flame]}>🔥</Animated.Text>
      <Text style={styles.streakNum}>{summary.streak} jour{summary.streak > 1 ? 's' : ''}</Text>
      <Text style={type.display}>{summary.perfect ? 'Séance parfaite !' : 'Séance terminée'}</Text>
      <View style={styles.statGrid}>
        <View style={styles.statBox}><Text style={styles.statBig}>+{xp}</Text><Text style={type.small}>XP</Text></View>
        <View style={styles.statBox}><Text style={styles.statBig}>{stats.ok}/{stats.done}</Text><Text style={type.small}>réussis</Text></View>
        <View style={styles.statBox}><Text style={styles.statBig}>{avg} %</Text><Text style={type.small}>précision</Text></View>
      </View>
      {lessons.length ? (
        <View style={styles.badgeBox}>
          <Text style={type.title}>Leçons validées 🎉</Text>
          {lessons.map((l) => <Text key={l} style={type.body}>✓ {l}</Text>)}
          <Text style={type.small}>Confirmées : elles restent dans tes révisions, de plus en plus espacées.</Text>
        </View>
      ) : null}
      {tech.length ? (
        <View style={styles.badgeBox}>
          <Text style={type.title}>Technique : étape franchie</Text>
          {tech.map((l, k) => <Text key={k} style={type.body}>✓ {l}</Text>)}
        </View>
      ) : null}
      {progress.length ? (
        <View style={styles.badgeBox}>
          <Text style={type.title}>Tu as avancé</Text>
          {progress.map((x) => (
            <Text key={x.d} style={type.body}><Text style={{ fontWeight: '900', color: domainColor[x.d as keyof typeof domainColor] ?? colors.ink }}>{DOMAIN_LABEL[x.d] ?? x.d} · </Text>{x.titles.join(', ')}</Text>
          ))}
        </View>
      ) : null}
      {points.length ? (
        <View style={styles.badgeBox}>
          <Text style={type.title}>Points de leçon validés</Text>
          {points.map((p) => <Text key={p} style={type.body}>✓ {p}</Text>)}
        </View>
      ) : null}
      {won.length ? (
        <View style={styles.badgeBox}>
          {won.map((b) => <Text key={b.id} style={type.body}>{b.icon}  Badge « {b.title} »</Text>)}
        </View>
      ) : null}
      {skipped ? <Text style={type.small}>{skipped} exercice{skipped > 1 ? 's' : ''} passé{skipped > 1 ? 's' : ''} : ils reviendront plus tard.</Text> : null}
      <Button label="Fermer" onPress={onClose} style={{ alignSelf: 'stretch' }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, borderRadius: 24, padding: 18, gap: 12 },
  heroKicker: { color: colors.onPrimarySoft, fontWeight: '800', fontSize: 14 },
  heroBtn: { backgroundColor: colors.card, borderRadius: 18, minHeight: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  heroBtnText: { color: colors.ink, fontSize: 21, fontWeight: '900' },
  heroLine: { color: colors.onPrimarySoft, fontSize: 13 },
  durRow: { gap: 6 },
  partBox: { backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 8 },
  partKicker: { color: colors.accent, fontWeight: '900', fontSize: 13 },
  flame: { fontSize: 64 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakChip: { backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontWeight: '900', color: colors.warn, overflow: 'hidden' },
  streakNum: { fontSize: 20, fontWeight: '900', color: colors.warn, marginTop: -8 },
  statGrid: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  statBox: { flex: 1, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  statBig: { fontSize: 24, fontWeight: '900', color: colors.accent },
  badgeBox: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 6, alignSelf: 'stretch' },
  screen: { flex: 1, backgroundColor: colors.paper },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  durations: { flexDirection: 'row', gap: 8 },
  dur: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center' },
  durOn: { backgroundColor: colors.primary },
  durText: { fontWeight: '800', color: colors.ink },
  group: { backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 8 },
  groupTitle: { fontWeight: '900', color: colors.inkSoft, fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  badge: { fontSize: 12, fontWeight: '800', color: colors.inkSoft },
  locked: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 6 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6 },
  quit: { fontSize: 22, color: colors.inkSoft },
  progressTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { height: '100%' },
  xpLive: { fontWeight: '800', color: colors.ink },
  blockLabel: { textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.inkSoft, marginTop: 6 },
  bigXp: { fontSize: 48, fontWeight: '900', color: colors.accent },
  newLesson: { backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 4, borderWidth: 2, borderColor: '#E0457B' },
});
