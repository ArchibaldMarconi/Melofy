// Séance : un bouton. La séance du jour se compose seule à partir des leçons vues ; aucun réglage avant de jouer
// (durée, module technique, instrument sous la main et voix se règlent une fois, dans Moi). Le détail du programme
// reste consultable, replié.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PlanItem, WorkoutPart } from '../content/types';
import { AREAS, AREA_LABEL, skillArea, skillTitle, type Area } from '../content/skills';
import { TEMPLATES, templateById } from '../content/templates';
import { deepLessonById } from '../content/deep';
import { displayTitle } from '../content/titles';
import { buildWorkout, PART_LABEL, PART_ORDER } from '../engine/workout';
import { lessonsToDiscover } from '../engine/cursus';
import { dayKey, lessonProgressOf, useUserStore } from '../store/useUserStore';
import { SessionRunner, type SessionResult } from '../session/SessionRunner';
import { Button } from '../components/Button';
import { useCountUp, usePop } from '../components/Celebration';
import { BADGES } from '../content/badges';
import { colors, domainColor, type } from '../theme';
import type { RootStackParamList } from './navigation';

const AREA_COLOR: Record<Area, string> = { oreille: domainColor.oreille, mains: domainColor.technique, lecture: domainColor.theorie, rythme: domainColor.rythme };
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

type Mode = 'plan' | 'situation' | 'running' | 'done';
interface Summary { result: SessionResult; streak: number; bonus: number; badges: string[]; counted: boolean; progress: { d: Area; titles: string[] }[] }

export function WorkoutScreen() {
  const st = useUserStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [mode, setMode] = useState<Mode>('plan');
  const [items, setItems] = useState<PlanItem[]>([]);
  const [showPlan, setShowPlan] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const before = useRef<Set<string>>(new Set());

  // pas d'onglets pendant la séance : un seul objectif à l'écran
  useEffect(() => {
    navigation.setOptions({ tabBarStyle: mode === 'running' || mode === 'situation' ? { display: 'none' } : { backgroundColor: colors.card, borderTopColor: colors.line } } as never);
  }, [mode, navigation]);

  const hasInstrument = st.settings.hasInstrument ?? true;
  const canSing = st.settings.canSing ?? true;
  const techMin = st.settings.techniqueMinutes ?? 0;
  const progress = lessonProgressOf(st);
  const makePlan = (o: { hasInstrument: boolean; canSing: boolean }) => {
    const s = useUserStore.getState();
    return buildWorkout({
      templates: TEMPLATES, competences: s.competences, progress: lessonProgressOf(s), minutes: s.settings.sessionMinutes,
      techniqueMinutes: s.settings.techniqueMinutes ?? 0, instrument: s.settings.instrument, hasInstrument: o.hasInstrument, canSing: o.canSing,
      now: Date.now(), today: dayKey(), seed: hash(dayKey()), avgTimeS: s.avgTimeS, techProgress: s.techProgress,
    });
  };
  const plan = useMemo(() => makePlan({ hasInstrument, canSing }),
    [st.settings.sessionMinutes, techMin, hasInstrument, canSing, st.settings.instrument, mode === 'plan', st.deepLessonsSeen?.length, st.deepLessonsDone?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const discover = lessonsToDiscover(progress, st.settings.instrument)[0];
  const canStart = st.canStartWorkout();

  const start = (o: { hasInstrument: boolean; canSing: boolean }) => {
    st.setSettings(o);
    before.current = new Set(Object.values(st.competences).filter((c) => c.reps > 0 && (c.successes ?? 0) > 0).map((c) => c.key));
    setItems(makePlan(o).items);
    setMode('running');
  };
  // la situation (instrument sous la main, voix) n'est demandée qu'une fois ; ensuite elle se change dans Moi
  const onStart = () => (st.settings.hasInstrument === undefined || st.settings.canSing === undefined ? setMode('situation') : start({ hasInstrument, canSing }));

  const onEnd = (r: SessionResult) => {
    const now = useUserStore.getState();
    const advanced = Object.values(now.competences).filter((c) => c.reps > 0 && (c.successes ?? 0) > 0 && !before.current.has(c.key));
    const progressByDomain = AREAS.map((a) => ({
      d: a, titles: advanced.filter((c) => skillArea(c.key) === a).map((c) => skillTitle(c.key)),
    })).filter((x) => x.titles.length);
    if (!r.done) { setSummary({ result: r, streak: st.streak, bonus: 0, badges: [], counted: false, progress: [] }); setMode('done'); return; }
    const c = now.completeSession({ xp: r.xp, exercises: r.total, perfect: r.perfect, minutes: now.settings.sessionMinutes, done: r.done });
    setSummary({ result: r, streak: c.streak, bonus: c.bonusXp, badges: c.newBadges, counted: true, progress: progressByDomain });
    setMode('done');
  };

  if (mode === 'situation') {
    return <SituationScreen instrument={st.settings.instrument} initial={{ hasInstrument, canSing }} onCancel={() => setMode('plan')} onGo={start} />;
  }
  if (mode === 'running') return <SessionRunner items={items} onEnd={onEnd} />;
  if (mode === 'done' && summary) return <SessionSummary s={summary} onClose={() => setMode('plan')} />;

  const minutes = Math.max(1, Math.round(plan.estimatedS / 60));
  const where = hasInstrument ? (st.settings.instrument === 'guitare' ? 'avec ta guitare' : 'avec ton piano') : 'à l\'écran';
  const doneToday = st.lastSessionDay === dayKey();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={type.display}>Séance du jour</Text>
        <Text style={type.small}>{doneToday ? 'Séance faite aujourd\'hui ✓' : st.streak ? `🔥 ${st.streak} jour${st.streak > 1 ? 's' : ''} d'affilée` : 'Une séance par jour, et tout s\'enchaîne.'}</Text>

        {plan.needsLesson ? (
          <View style={styles.hero}>
            <Text style={[type.title, { color: colors.onPrimary }]}>Ta séance se construit à partir de tes leçons</Text>
            <Text style={styles.heroLine}>Commence par une leçon : quelques minutes pour écouter, essayer, comprendre. Ta séance s'ouvre ensuite.</Text>
            {lessonsToDiscover(progress, st.settings.instrument).map((l) => (
              <Pressable key={l.id} onPress={() => navigation.navigate('DeepLesson', { id: l.id })} accessibilityRole="button" accessibilityLabel={`Commencer la leçon ${l.number} : ${l.title}`}
                style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.85 }]}>
                <Text style={styles.heroBtnText}>▶  {l.title}</Text>
              </Pressable>
            ))}
          </View>
        ) : canStart ? (
          <View style={styles.hero}>
            <Pressable onPress={onStart} disabled={plan.items.length === 0} accessibilityRole="button" accessibilityLabel="Commencer la séance"
              style={({ pressed }) => [styles.heroBtn, styles.heroBtnBig, pressed && { opacity: 0.85 }, plan.items.length === 0 && { opacity: 0.5 }]}>
              <Text style={[styles.heroBtnText, { fontSize: 24 }]}>▶  Commencer</Text>
            </Pressable>
            <Pressable onPress={() => (navigation as unknown as { navigate: (r: string) => void }).navigate('Profil')} accessibilityRole="button" accessibilityLabel="Changer les réglages de la séance dans Moi">
              <Text style={styles.heroLine}>Environ {minutes} min · {where}{techMin ? ` · technique +${techMin} min` : ''} · <Text style={{ textDecorationLine: 'underline' }}>modifier</Text></Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={type.title}>Séance du jour terminée ✓</Text>
            <Text style={type.body}>Ta prochaine séance gratuite arrive demain. Jouer reste ouvert : métronome, accordeur, jam.</Text>
          </View>
        )}

        {!plan.needsLesson && discover ? (
          <Pressable onPress={() => navigation.navigate('DeepLesson', { id: discover.id })} accessibilityRole="button" accessibilityLabel={`Nouvelle leçon : ${discover.title}`} style={styles.newLesson}>
            <Text style={styles.kicker}>Nouvelle leçon</Text>
            <Text style={type.title}>{discover.title}</Text>
          </Pressable>
        ) : null}

        {plan.items.length ? (
          <Pressable onPress={() => setShowPlan((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: showPlan }} style={styles.disclosure}>
            <Text style={styles.disclosureText}>{showPlan ? 'Masquer le programme ▴' : `Voir le programme · ${plan.items.length} exercices ▾`}</Text>
          </Pressable>
        ) : null}
        {showPlan ? <PlanDetail items={plan.items} instrument={st.settings.instrument} /> : null}
        {!plan.needsLesson && plan.items.length === 0 ? <Text style={type.body}>Rien à pratiquer aujourd'hui : découvre une nouvelle leçon.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanDetail({ items, instrument }: { items: PlanItem[]; instrument: 'piano' | 'guitare' }) {
  const parts = PART_ORDER.filter((p) => items.some((x) => (x.wpart ?? 'revision') === p));
  const mins = (p: WorkoutPart) => Math.max(1, Math.round(items.filter((x) => (x.wpart ?? 'revision') === p).reduce((a, x) => a + (x.estS ?? 60), 0) / 60));
  return (
    <View style={styles.card}>
      {parts.map((p) => (
        <View key={p} style={{ gap: 4 }}>
          <Text style={styles.kicker}>{PART_LABEL[p]} · {mins(p)} min</Text>
          {items.filter((x) => (x.wpart ?? 'revision') === p).map((x, j) => {
            const t = templateById(x.templateId);
            return (
              <View key={j} style={styles.item}>
                <View style={[styles.dot, { backgroundColor: domainColor[t.domain] }]} />
                <Text style={[type.small, { flex: 1, color: colors.ink }]}>{x.tech ? x.tech.label : x.confirmLesson ? `Validation · ${deepLessonById(x.confirmLesson)?.title}` : displayTitle(t, x.params, instrument)}</Text>
                {x.input === 'micro' ? <Text style={type.small}>🎙</Text> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** « As-tu ton instrument ? Peux-tu chanter ? » : demandé une seule fois, puis modifiable dans Moi */
function SituationScreen({ instrument, initial, onGo, onCancel }: { instrument: 'piano' | 'guitare'; initial: { hasInstrument: boolean; canSing: boolean }; onGo: (o: { hasInstrument: boolean; canSing: boolean }) => void; onCancel: () => void }) {
  const [hasInstrument, setHas] = useState(initial.hasInstrument);
  const [canSing, setSing] = useState(initial.canSing);
  const name = instrument === 'guitare' ? 'ta guitare' : 'ton piano';
  const choice = (on: boolean, label: string, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="radio" aria-checked={on} accessibilityState={{ checked: on }} style={[styles.opt, on && styles.optOn]}>
      <Text style={[styles.optText, on && { color: colors.onFill }]}>{label}</Text>
    </Pressable>
  );
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 40 }]}>
        <Text style={type.display}>Avant ta 1re séance</Text>
        <Text style={type.title}>Joues-tu sur {name} ?</Text>
        <View style={styles.row}>
          {choice(hasInstrument, 'Oui, l\'appli m\'écoute', () => setHas(true))}
          {choice(!hasInstrument, 'Non, à l\'écran', () => setHas(false))}
        </View>
        <Text style={type.title}>Peux-tu chanter ?</Text>
        <View style={styles.row}>
          {choice(canSing, 'Oui', () => setSing(true))}
          {choice(!canSing, 'Non, en silence', () => setSing(false))}
        </View>
        <Text style={type.small}>Tu pourras changer ça à tout moment dans Moi.</Text>
        <Button label="C'est parti" onPress={() => onGo({ hasInstrument, canSing })} />
        <Button variant="texte" color={colors.inkSoft} label="Retour" onPress={onCancel} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionSummary({ s, onClose }: { s: Summary; onClose: () => void }) {
  const xp = useCountUp(s.result.xp + s.bonus, 900);
  const flame = usePop(s.streak);
  if (!s.counted) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <Text style={type.display}>Séance arrêtée</Text>
        <Text style={[type.body, { textAlign: 'center' }]}>Aucun exercice fait : relance-la quand tu veux.</Text>
        <Button label="Fermer" onPress={onClose} />
      </SafeAreaView>
    );
  }
  const r = s.result;
  const avg = r.done ? Math.round((r.precision / r.done) * 100) : 0;
  const won = BADGES.filter((b) => s.badges.includes(b.id));
  const lessons = r.confirmed.map((id) => deepLessonById(id)?.title).filter(Boolean) as string[];
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.center, { flexGrow: 1, paddingBottom: 40 }]}>
        <Animated.Text style={[styles.flame, flame]}>🔥</Animated.Text>
        <Text style={styles.streakNum}>{s.streak} jour{s.streak > 1 ? 's' : ''}</Text>
        <Text style={type.display}>{r.perfect ? 'Séance parfaite !' : 'Séance terminée'}</Text>
        <View style={styles.statGrid}>
          <View style={styles.statBox}><Text style={styles.statBig}>+{xp}</Text><Text style={type.small}>XP</Text></View>
          <View style={styles.statBox}><Text style={styles.statBig}>{r.ok}/{r.done}</Text><Text style={type.small}>réussis</Text></View>
          <View style={styles.statBox}><Text style={styles.statBig}>{avg} %</Text><Text style={type.small}>précision</Text></View>
        </View>
        {lessons.length ? (
          <View style={styles.box}>
            <Text style={type.title}>Leçon{lessons.length > 1 ? 's' : ''} maîtrisée{lessons.length > 1 ? 's' : ''} 🎉</Text>
            {lessons.map((l) => <Text key={l} style={type.body}>✓ {l}</Text>)}
          </View>
        ) : null}
        {s.progress.length || r.techUp.length ? (
          <View style={styles.box}>
            <Text style={type.title}>Tu as avancé</Text>
            {s.progress.map((x) => (
              <Text key={x.d} style={type.body}><Text style={{ fontWeight: '900', color: AREA_COLOR[x.d] }}>{AREA_LABEL[x.d]} · </Text>{x.titles.join(', ')}</Text>
            ))}
            {r.techUp.map((l, k) => <Text key={k} style={type.body}><Text style={{ fontWeight: '900', color: AREA_COLOR.mains }}>Technique · </Text>{l}</Text>)}
          </View>
        ) : null}
        {won.length ? <View style={styles.box}>{won.map((b) => <Text key={b.id} style={type.body}>{b.icon}  Badge « {b.title} »</Text>)}</View> : null}
        {r.skipped ? <Text style={type.small}>{r.skipped} exercice{r.skipped > 1 ? 's' : ''} passé{r.skipped > 1 ? 's' : ''} : ils reviendront.</Text> : null}
        <Button label="Fermer" onPress={onClose} style={{ alignSelf: 'stretch' }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  hero: { backgroundColor: colors.primary, borderRadius: 24, padding: 18, gap: 12 },
  heroBtn: { backgroundColor: colors.card, borderRadius: 18, minHeight: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  heroBtnBig: { minHeight: 84 },
  heroBtnText: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  heroLine: { color: colors.onPrimarySoft, fontSize: 13, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 12 },
  newLesson: { backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 4, borderWidth: 2, borderColor: '#E0457B' },
  kicker: { color: colors.accent, fontWeight: '900', fontSize: 13 },
  disclosure: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  disclosureText: { fontSize: 14, fontWeight: '800', color: colors.inkSoft },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', gap: 8 },
  opt: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center' },
  optOn: { backgroundColor: colors.primary },
  optText: { fontWeight: '800', color: colors.ink, textAlign: 'center' },
  flame: { fontSize: 64 },
  streakNum: { fontSize: 20, fontWeight: '900', color: colors.warn, marginTop: -8 },
  statGrid: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  statBox: { flex: 1, backgroundColor: colors.card, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  statBig: { fontSize: 24, fontWeight: '900', color: colors.accent },
  box: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 6, alignSelf: 'stretch' },
});
