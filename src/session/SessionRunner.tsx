// Déroulé d'une séance (séance du jour, entraînement ciblé) : les exercices s'enchaînent sans écran intermédiaire.
// Une bande fine en haut (quitter, progression) ; à l'entrée d'une partie, une ligne seulement, quand elle change
// quelque chose pour l'élève (prendre l'instrument, un casque).
import React, { useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../screens/navigation';
import { lessonOfConcept } from '../content/deep';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Outcome, PlanItem } from '../content/types';
import { templateById } from '../content/templates';
import { newSeed } from '../engine/rng';
import { PART_LABEL } from '../engine/workout';
import { techSteps, TECH_SCALES } from '../engine/technique';
import { ExercisePlayer } from '../exercise/ExercisePlayer';
import { useUserStore, type ResultInfo } from '../store/useUserStore';
import { ConfirmBar } from '../components/ConfirmBar';
import { FeedbackButton } from '../components/FeedbackButton';
import { colors, domainColor } from '../theme';

export interface SessionResult {
  xp: number; ok: number; done: number; precision: number; perfect: boolean; skipped: number;
  /** leçons confirmées pendant la séance, étapes de technique franchies */
  confirmed: string[]; techUp: string[];
  total: number;
}

export function SessionRunner({ items: initial, onEnd, where = 'séance' }: {
  items: PlanItem[];
  /** fin de la séance : `early` quand l'élève l'arrête avant la fin */
  onEnd: (r: SessionResult, early: boolean) => void;
  where?: string;
}) {
  const instrument = useUserStore((s) => s.settings.instrument);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<PlanItem[]>(initial);
  const [i, setI] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const res = useRef<SessionResult>({ xp: 0, ok: 0, done: 0, precision: 0, perfect: true, skipped: 0, confirmed: [], techUp: [], total: initial.length });
  const reinjected = useRef(new Set<string>());

  const end = (early: boolean) => onEnd({ ...res.current, total: items.length }, early);
  const next = () => { if (i + 1 < items.length) setI(i + 1); else end(false); };

  const it = items[i];
  if (!it) return <SafeAreaView style={styles.screen} />;
  const t = templateById(it.templateId);
  const part = it.wpart;
  const prev = i > 0 ? items[i - 1].wpart : undefined;
  const instrName = instrument === 'guitare' ? 'ta guitare' : 'ton piano';
  // une ligne à l'entrée d'une partie, seulement si elle change quelque chose pour l'élève
  const banner = part && part !== prev
    ? it.input === 'micro' ? `${PART_LABEL[part]} · prends ${instrName} : l'appli t'écoute au micro.`
      : part === 'oreille' ? `${PART_LABEL[part]} · un casque aide.`
      : PART_LABEL[part]
    : null;

  // la leçon qui explique cet exercice (pour « Je n'ai pas appris ça »)
  const lesson = lessonOfConcept(t.concepts[0]);
  const lessonOf = (x: PlanItem) => (x.confirmLesson ? x.confirmLesson : lessonOfConcept(templateById(x.templateId).concepts[0])?.id);
  const notLearned = lesson ? () => {
    // sans pénalité : la leçon redevient à découvrir, ses exercices quittent la séance, et on l'ouvre tout de suite
    const ids = items.filter((x) => lessonOf(x) === lesson.id).map((x) => x.templateId);
    useUserStore.getState().notLearned(lesson.id, [...new Set([t.id, ...ids])]);
    const rest = items.filter((x, k) => k <= i || lessonOf(x) !== lesson.id);
    setItems(rest);
    navigation.navigate('DeepLesson', { id: lesson.id });
    if (i + 1 < rest.length) setI(i + 1); else onEnd({ ...res.current, total: rest.length }, false);
  } : undefined;

  const onFinished = (info: ResultInfo, o: Outcome) => {
    const r = res.current;
    r.xp += info.xp;
    r.done += 1;
    r.ok += o.success ? 1 : 0;
    r.precision += o.precision;
    if (o.helps.length || info.rating === 1) r.perfect = false;
    const store = useUserStore.getState();
    if (it.confirmLesson && o.success && !r.confirmed.includes(it.confirmLesson)) {
      store.confirmDeepLesson(it.confirmLesson);
      r.confirmed.push(it.confirmLesson);
    }
    if (it.tech) {
      const cur = store.techProgress?.[it.tech.scale]?.step ?? 0;
      if (it.tech.kind === 'tempo') store.recordTechnique(it.tech.scale, 'tempo', o.success && o.precision >= 0.9, it.tech.maxStep);
      else if (o.success && it.tech.stepIndex === cur) {
        store.recordTechnique(it.tech.scale, 'step', true, it.tech.maxStep);
        r.techUp.push(it.tech.label);
        // étape franchie : la suite du module passe à l'étape suivante, dans la même séance
        const sc = TECH_SCALES.find((x) => x.key === it.tech!.scale);
        const nx = sc ? techSteps(sc, instrument)[cur + 1] : undefined;
        if (sc && nx) {
          const tempo = useUserStore.getState().techProgress?.[sc.key]?.tempo ?? 60;
          setItems((xs) => xs.map((x, k) => (k > i && x.tech && x.tech.scale === sc.key && x.tech.stepIndex === cur
            ? { ...x, templateId: nx.templateId, params: nx.kind === 'tempo' ? { ...nx.params, tempo_cle: tempo } : nx.params, seed: newSeed(), tech: { ...x.tech, stepIndex: cur + 1, kind: nx.kind, label: nx.label } } : x)));
        }
      }
    }
    // une variante du même exercice revient en fin de séance, une seule fois (sauf validation et technique)
    if (!o.success && !it.confirmLesson && !it.tech && it.block !== 'reinjection' && !reinjected.current.has(t.id)) {
      reinjected.current.add(t.id);
      setItems((xs) => [...xs, { ...it, seed: newSeed(), block: 'reinjection' }]);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => setConfirmQuit(true)} accessibilityRole="button" accessibilityLabel="Terminer la séance" hitSlop={10}><Text style={styles.quit}>✕</Text></Pressable>
        <View style={styles.track} accessibilityLabel={`Exercice ${i + 1} sur ${items.length}`}>
          <View style={[styles.fill, { width: `${(i / items.length) * 100}%`, backgroundColor: domainColor[t.domain] }]} />
        </View>
        <Text style={styles.count}>{i + 1}/{items.length}</Text>
        <FeedbackButton where={`${where}, ${t.id}`} compact />
      </View>
      {confirmQuit ? (
        <ConfirmBar
          text={res.current.done ? 'Terminer la séance ici ? Ce que tu as fait compte.' : 'Quitter la séance ?'}
          confirmLabel="Terminer" cancelLabel="Continuer"
          onConfirm={() => { setConfirmQuit(false); end(true); }} onCancel={() => setConfirmQuit(false)}
        />
      ) : null}
      {banner ? <Text style={styles.banner}>{banner}</Text> : null}
      <ExercisePlayer
        key={`${i}-${it.seed}`} template={t} params={it.params} seed={it.seed} inSession
        inputOverride={it.input ?? 'ecran'}
        onFinished={onFinished}
        onNext={next}
        onSkip={() => { res.current.perfect = false; res.current.skipped += 1; next(); }}
        onNotLearned={notLearned}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6 },
  quit: { fontSize: 22, color: colors.inkSoft },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%' },
  count: { fontSize: 12, fontWeight: '800', color: colors.inkSoft },
  banner: { marginHorizontal: 20, marginTop: 10, fontSize: 13, fontWeight: '800', color: colors.inkSoft },
});
