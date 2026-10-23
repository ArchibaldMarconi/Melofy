// Onglet Leçons (0.22.0) : uniquement les leçons. Leurs exercices nourrissent la révision du workout (0.24.0).
// Vue allégée par défaut : la prochaine leçon, puis les leçons en cours et les 3 suivantes ; les leçons validées et
// celles plus lointaines sont masquées, et « Afficher tout le cursus » montre les 23 leçons rangées par phase.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEEP_LESSONS, PHASE_LABEL, lessonsFor } from '../content/deep';
import { confirmProgress, lessonState, lessonsToDiscover, type LessonState } from '../engine/cursus';
import { lessonProgressOf, useUserStore } from '../store/useUserStore';
import { colors, type } from '../theme';
import type { RootStackParamList } from './navigation';

const ACCENT = '#E0457B';
const STATE: Record<LessonState, { label: string; color: string; glyph?: string }> = {
  verrouillee: { label: 'Verrouillée', color: colors.inkSoft, glyph: '🔒' },
  ouverte: { label: 'À découvrir', color: ACCENT },
  vue: { label: 'Vue · à valider', color: colors.primary },
  validee: { label: 'Validée · à confirmer en séance', color: colors.success, glyph: '✓' },
  confirmee: { label: 'Confirmée', color: colors.gold, glyph: '★' },
};
/** leçons montrées dans la vue allégée : les 4 premières non validées (la prochaine et les 3 suivantes), plus toute leçon vue */
const AHEAD = 4;

export function TreeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const st = useUserStore();
  const { settings } = st;
  // spécification « Leçons » : un « Afficher plus » avant la leçon en cours (l'historique validé), un autre après (la suite)
  const [past, setPast] = useState(false);
  const [future, setFuture] = useState(false);
  const progress = lessonProgressOf(st);
  // l'ordre du cursus selon l'instrument (au piano, la clé de fa suit la portée)
  const LESSONS = lessonsFor(settings.instrument);
  const states = useMemo(() => Object.fromEntries(DEEP_LESSONS.map((l) => [l.id, lessonState(l, progress)])), [st.deepLessonsSeen, st.deepLessonsDone, st.deepLessonsConfirmed, settings.unlockAll]); // eslint-disable-line react-hooks/exhaustive-deps
  const discover = lessonsToDiscover(progress, settings.instrument)[0];
  const toValidate = LESSONS.find((l) => states[l.id] === 'vue');
  const isDone = (id: string) => states[id] === 'validee' || states[id] === 'confirmee';
  const doneCount = LESSONS.filter((l) => isDone(l.id)).length;
  const toConfirm = LESSONS.filter((l) => states[l.id] === 'validee').length;
  const pending = LESSONS.filter((l) => !isDone(l.id));
  const ahead = new Set([...pending.slice(0, AHEAD).map((l) => l.id), ...pending.filter((l) => states[l.id] === 'vue').map((l) => l.id)]);
  const shown = LESSONS.filter((l) => ahead.has(l.id));
  const done = LESSONS.filter((l) => isDone(l.id));
  const later = pending.filter((l) => !ahead.has(l.id));

  const card = (l: (typeof DEEP_LESSONS)[number], withPhase: boolean) => {
    const s = states[l.id] as LessonState;
    const meta = STATE[s];
    const locked = s === 'verrouillee';
    const parents = l.parents.map((x) => LESSONS.find((y) => y.id === x)!).filter((x) => !isDone(x.id));
    const cp = s === 'validee' ? confirmProgress(l, progress, settings.instrument) : null;
    return (
      <Pressable key={l.id} onPress={() => nav.navigate('DeepLesson', { id: l.id })} accessibilityRole="button"
        accessibilityLabel={`Leçon approfondie ${l.number} : ${l.title}, ${meta.label}`}
        style={({ pressed }) => [styles.lesson, { borderLeftColor: meta.color }, locked && { opacity: 0.75 }, pressed && { opacity: 0.85 }]}>
        <View style={[styles.num, { borderColor: meta.color }, isDone(l.id) && { backgroundColor: meta.color }]}>
          <Text style={[styles.numText, { color: isDone(l.id) ? colors.onFill : meta.color }]}>{meta.glyph && s !== 'verrouillee' ? meta.glyph : l.number}</Text>
        </View>
        <View style={{ flex: 1 }}>
          {withPhase ? <Text style={styles.lessonPhase}>Phase {l.phase} · {PHASE_LABEL[l.phase]}</Text> : null}
          <Text style={type.title}>{l.title}</Text>
          <Text style={[styles.state, { color: meta.color }]}>{locked ? `🔒 Après : ${parents.map((x) => `${x.number}. ${x.title}`).join(' et ')}` : cp ? `Validée · confirmation : ${cp.done}/${cp.total} exercices sur deux jours` : meta.label}</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={[type.display, styles.title]}>Ton parcours</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>{doneCount} leçon{doneCount > 1 ? 's' : ''} validée{doneCount > 1 ? 's' : ''} sur {LESSONS.length}</Text>
          <View style={styles.heroBar}><View style={[styles.heroFill, { width: `${(doneCount / LESSONS.length) * 100}%` }]} /></View>
          {toValidate || discover ? (
            <>
              <Text style={styles.heroLabel}>{toValidate ? 'À valider' : 'Ta prochaine leçon'}</Text>
              <Text style={styles.heroTitle}>Leçon {(toValidate ?? discover)!.number} · {(toValidate ?? discover)!.title}</Text>
              <Text style={styles.heroText}>{toValidate ? 'Tu l\'as vue : finis sa pratique et sa validation pour ouvrir la suite.' : 'Écoute, comprends, pratique : ses notions et exercices entreront ensuite dans la révision de ta séance du jour.'}</Text>
              <View style={styles.heroRow}>
                <Pressable onPress={() => nav.navigate('DeepLesson', { id: (toValidate ?? discover)!.id })} style={styles.heroBtn} accessibilityRole="button">
                  <Text style={styles.heroBtnText}>{toValidate ? 'Reprendre la leçon' : 'Commencer la leçon'}</Text>
                </Pressable>
                <Pressable onPress={() => (nav as unknown as { navigate: (r: string) => void }).navigate('Workout')} style={[styles.heroBtn, styles.heroBtnGhost]} accessibilityRole="button">
                  <Text style={[styles.heroBtnText, { color: colors.onPrimary }]}>Séance du jour →</Text>
                </Pressable>
              </View>
            </>
          ) : <Text style={styles.heroTitle}>Tout le cursus est validé : place aux confirmations et aux révisions.</Text>}
        </View>

        <View style={styles.phase}>
          {doneCount ? (
            <Pressable onPress={() => setPast((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: past }} style={styles.allBtn}>
              <Text style={styles.allText}>{past ? 'Afficher moins ▾' : `Afficher plus : ${doneCount} leçon${doneCount > 1 ? 's' : ''} validée${doneCount > 1 ? 's' : ''} ▴`}</Text>
            </Pressable>
          ) : null}
          {past ? done.map((l) => card(l, true)) : null}
          <Text style={styles.phaseTitle}>À suivre</Text>
          {shown.map((l) => card(l, true))}
          {future ? later.map((l) => card(l, true)) : null}
          {later.length ? (
            <Pressable onPress={() => setFuture((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: future }} style={styles.allBtn}>
              <Text style={styles.allText}>{future ? 'Afficher moins ▴' : `Afficher plus : ${later.length} leçon${later.length > 1 ? 's' : ''} à venir ▾`}</Text>
            </Pressable>
          ) : null}
          {doneCount && toConfirm ? <Text style={styles.doneLine}>✓ Dont {toConfirm} à confirmer dans ta séance.</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  title: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 6 },
  hero: { backgroundColor: colors.primary, borderRadius: 22, padding: 18, gap: 6, marginBottom: 12 },
  heroKicker: { color: colors.onPrimaryFaint, fontWeight: '800', fontSize: 12 },
  heroBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', marginBottom: 6 },
  heroFill: { height: '100%', backgroundColor: colors.gold },
  heroLabel: { color: colors.onPrimarySoft, fontSize: 13, fontWeight: '700' },
  heroTitle: { color: colors.onPrimary, fontSize: 22, fontWeight: '900' },
  heroText: { color: colors.onPrimarySoft, fontSize: 14 },
  heroRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  heroBtn: { backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  heroBtnGhost: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.onPrimarySoft },
  heroBtnText: { fontWeight: '900', color: colors.ink },
  phase: { marginTop: 10, gap: 8 },
  phaseKicker: { fontSize: 12, fontWeight: '900', color: colors.inkSoft, marginLeft: 4 },
  phaseTitle: { fontSize: 24, fontWeight: '900', color: colors.ink, marginLeft: 4, marginTop: -4 },
  lesson: { backgroundColor: colors.card, borderRadius: 18, padding: 12, borderLeftWidth: 5, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  lessonPhase: { fontSize: 11, fontWeight: '900', color: colors.inkSoft },
  doneLine: { fontSize: 13, fontWeight: '800', color: colors.success, marginLeft: 4, marginTop: 4 },
  allBtn: { alignSelf: 'center', borderWidth: 1.5, borderColor: colors.inkSoft, borderRadius: 14, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', marginTop: 12 },
  allText: { fontSize: 14, fontWeight: '900', color: colors.ink },
  num: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  numText: { fontWeight: '900', fontSize: 15 },
  state: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  chev: { fontSize: 24, color: colors.inkSoft },
  toggle: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, minHeight: 44, justifyContent: 'center' },
  toggleText: { fontSize: 13, fontWeight: '800', color: colors.inkSoft },
  concept: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 8 },
  conceptTitle: { fontWeight: '800', color: colors.ink, fontSize: 15, flex: 1 },
  unitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitCount: { fontSize: 12, fontWeight: '900', color: colors.inkSoft },
  notesRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  noteWrap: { width: 70, alignItems: 'center' },
  noteHead: { width: 50, height: 38, borderRadius: 25, borderWidth: 4, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] },
  noteText: { fontWeight: '900', fontSize: 18, transform: [{ rotate: '18deg' }] },
  noteLabel: { fontSize: 11, textAlign: 'center', color: colors.ink, marginTop: 4 },
  more: { alignSelf: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inkSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  moreText: { fontSize: 12, fontWeight: '800', color: colors.inkSoft },
  boss: { backgroundColor: colors.primary, borderRadius: 22, padding: 20, gap: 6, marginTop: 8 },
});
