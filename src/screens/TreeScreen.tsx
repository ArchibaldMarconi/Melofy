// Onglet Leçons : la prochaine leçon en grand, puis les leçons à suivre ; la suite lointaine est repliée, et les leçons
// faites forment l'historique, replié tout en bas. Trois états pour l'élève : nouvelle, en cours, maîtrisée.
// La confirmation dans les séances reste interne : une leçon validée est « en cours » jusqu'à ce qu'elle soit retenue.
// Mêmes règles graphiques que la Séance : coins continus, violet seul (l'état se lit à la pastille, pas à la couleur),
// chevrons dessinés, une animation par action.
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, useAnimatedStyle } from 'react-native-reanimated';
import { DEEP_LESSONS, PHASE_LABEL, lessonsFor } from '../content/deep';
import { lessonState, lessonsToDiscover, type LessonState } from '../engine/cursus';
import { lessonProgressOf, useUserStore } from '../store/useUserStore';
import { Check, Chevron } from '../components/Chevron';
import { Disclosure } from '../components/Disclosure';
import { PlayButton } from '../components/PlayButton';
import { Shape } from '../components/Shape';
import { AnimatedPressable, usePress } from '../components/motion';
import { colors, curve, radius, type } from '../theme';
import type { RootStackParamList } from './navigation';

type Lesson = (typeof DEEP_LESSONS)[number];

const STATE_LABEL: Record<LessonState, string> = {
  verrouillee: 'Plus tard', ouverte: 'Nouvelle', vue: 'En cours', validee: 'En cours · se consolide dans tes séances', confirmee: 'Maîtrisée',
};
/** leçons montrées dans la vue allégée : les 4 premières non validées (la prochaine et les 3 suivantes), plus toute leçon vue */
const AHEAD = 4;

export function TreeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const st = useUserStore();
  const { settings } = st;
  // la suite lointaine et l'historique (leçons faites) sont repliés
  const [past, setPast] = useState(false);
  const [future, setFuture] = useState(false);
  const progress = lessonProgressOf(st);
  // l'ordre du cursus selon l'instrument (au piano, la clé de fa suit la portée)
  const LESSONS = lessonsFor(settings.instrument);
  const states = useMemo(() => Object.fromEntries(DEEP_LESSONS.map((l) => [l.id, lessonState(l, progress)])), [st.deepLessonsSeen, st.deepLessonsDone, st.deepLessonsConfirmed, settings.unlockAll]); // eslint-disable-line react-hooks/exhaustive-deps
  const discover = lessonsToDiscover(progress, settings.instrument)[0];
  const toValidate = LESSONS.find((l) => states[l.id] === 'vue');
  const next = toValidate ?? discover;
  const isDone = (id: string) => states[id] === 'validee' || states[id] === 'confirmee';
  const doneCount = LESSONS.filter((l) => isDone(l.id)).length;
  const pending = LESSONS.filter((l) => !isDone(l.id));
  const ahead = new Set([...pending.slice(0, AHEAD).map((l) => l.id), ...pending.filter((l) => states[l.id] === 'vue').map((l) => l.id)]);
  const shown = LESSONS.filter((l) => ahead.has(l.id));
  const done = LESSONS.filter((l) => isDone(l.id));
  const later = pending.filter((l) => !ahead.has(l.id));

  const card = (l: Lesson) => {
    const s = states[l.id] as LessonState;
    const parents = l.parents.map((x) => LESSONS.find((y) => y.id === x)!).filter((x) => !isDone(x.id));
    return <LessonCard key={l.id} lesson={l} state={s} after={parents.map((x) => x.title).join(' et ')} onPress={() => nav.navigate('DeepLesson', { id: l.id })} />;
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.titleBar}>
        <Text style={type.display} accessibilityRole="header">Leçons</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>{doneCount} leçon{doneCount > 1 ? 's' : ''} faite{doneCount > 1 ? 's' : ''} sur {LESSONS.length}</Text>
          <Track value={doneCount / LESSONS.length} />
          {next ? (
            <>
              <Text style={styles.heroLabel}>{toValidate ? 'À terminer' : 'Ta prochaine leçon'}</Text>
              <Text style={styles.heroTitle}>{next.title}</Text>
              <PlayButton label={toValidate ? 'Reprendre' : 'Commencer'} onPress={() => nav.navigate('DeepLesson', { id: next.id })}
                accessibilityLabel={`${toValidate ? 'Reprendre' : 'Commencer'} la leçon ${next.number} : ${next.title}`} />
            </>
          ) : <Text style={styles.heroTitle}>Toutes les leçons sont faites : tes séances les consolident.</Text>}
        </View>

        {shown.length ? <Text style={styles.section}>À suivre</Text> : null}
        {shown.map(card)}
        {later.length ? <Disclosure open={future} label="Voir la suite" openLabel="Masquer la suite" onPress={() => setFuture((x) => !x)} /> : null}
        {future ? <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)} style={styles.list}>{later.map(card)}</Animated.View> : null}

        {/* l'historique : les leçons faites, tout en bas */}
        {done.length ? <Disclosure open={past} label="Voir l'historique" openLabel="Masquer l'historique" onPress={() => setPast((x) => !x)} /> : null}
        {past ? <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)} style={styles.list}>{done.map(card)}</Animated.View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** progression des leçons : la même barre creusée que le curseur de durée, remplie en violet clair */
function Track({ value }: { value: number }) {
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <View style={styles.trackBar} />
      {value > 0 ? <View style={[styles.trackFill, { width: `${Math.max(value * 100, 6)}%` }]} /> : null}
      <View style={styles.trackInset} />
    </View>
  );
}

/** une leçon : pastille d'état (numéro, coche, étoile), titre ; sous le doigt la carte se tasse et son chevron avance */
function LessonCard({ lesson: l, state: s, after, onPress }: { lesson: Lesson; state: LessonState; after: string; onPress: () => void }) {
  const { p, onPressIn, onPressOut } = usePress();
  const settle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.02 * p.get() }] }));
  const push = useAnimatedStyle(() => ({ transform: [{ translateX: 5 * p.get() }] }));
  const locked = s === 'verrouillee';
  const filled = s === 'vue' || s === 'validee' || s === 'confirmee';
  const live = s === 'ouverte' || s === 'vue';
  return (
    <AnimatedPressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button"
      accessibilityLabel={`Leçon ${l.number} : ${l.title}, ${STATE_LABEL[s]}`}
      style={[styles.lesson, locked && { opacity: 0.6 }, settle]}>
      <View style={[styles.badge, filled ? styles.badgeOn : { borderColor: locked ? colors.staff : colors.accent }]}>
        {s === 'confirmee' ? <Shape name="etoile" color={colors.onFill} size={22} />
          : s === 'validee' ? <Check />
          : <Text style={[styles.badgeText, { color: filled ? colors.onFill : locked ? colors.inkSoft : colors.accent }]}>{l.number}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.lessonPhase}>Chapitre {l.phase} · {PHASE_LABEL[l.phase]}</Text>
        <Text style={type.title}>{l.title}</Text>
        <Text style={[styles.state, { color: live ? colors.accent : colors.inkSoft }]}>{locked ? `Après : ${after}` : STATE_LABEL[s]}</Text>
      </View>
      <Animated.View style={push}><Chevron dir="right" /></Animated.View>
    </AnimatedPressable>
  );
}

const TRACK = 12;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  titleBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  content: { padding: 20, paddingTop: 8, paddingBottom: 40, gap: 10 },
  hero: { backgroundColor: colors.primary, borderRadius: radius.hero, ...curve, padding: radius.heroInset, gap: 8, marginBottom: 8 },
  heroKicker: { color: colors.onPrimarySoft, fontWeight: '800', fontSize: 13, paddingHorizontal: 6 },
  heroLabel: { color: colors.onPrimarySoft, fontSize: 13, fontWeight: '700', marginTop: 6, paddingHorizontal: 6 },
  heroTitle: { color: colors.onPrimary, fontSize: 22, fontWeight: '900', marginBottom: 6, paddingHorizontal: 6 },
  track: { height: TRACK, borderRadius: TRACK / 2, overflow: 'hidden' },
  trackBar: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.onPrimary, opacity: 0.18 },
  trackFill: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: TRACK / 2, backgroundColor: colors.onPrimaryTint },
  trackInset: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: TRACK / 2, boxShadow: 'inset 0 0 4px rgba(0, 0, 0, 0.22)' },
  section: { fontSize: 22, fontWeight: '900', color: colors.ink, marginLeft: 4, marginTop: 4 },
  list: { gap: 10 },
  lesson: { backgroundColor: colors.card, borderRadius: radius.row, ...curve, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  lessonPhase: { fontSize: 11, fontWeight: '900', color: colors.inkSoft },
  badge: { width: 40, height: 40, borderRadius: radius.capsule, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  badgeText: { fontWeight: '900', fontSize: 15 },
  state: { fontSize: 12, fontWeight: '800', marginTop: 2 },
});
