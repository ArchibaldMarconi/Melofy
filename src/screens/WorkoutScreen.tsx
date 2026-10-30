// Séance : un bouton, et la durée juste dessous (de 10 à 30 min). La séance du jour se compose seule à partir des
// leçons vues ; le reste (module technique, instrument sous la main, voix) se règle une fois, dans Moi. Le détail du
// programme reste consultable, replié sous la carte.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
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
import { Flame } from '../components/Flame';
import { StepSlider } from '../components/StepSlider';
import { PartShape } from '../components/PartShape';
import { AnimatedPressable, lerp, ND, usePress } from '../components/motion';
import { useReduceMotion } from '../a11y';
import { BADGES } from '../content/badges';
import { colors, curve, domainColor, mixHex, partColor, radius, type } from '../theme';
import type { RootStackParamList } from './navigation';

const AREA_COLOR: Record<Area, string> = { oreille: domainColor.oreille, mains: domainColor.technique, lecture: domainColor.theorie, rythme: domainColor.rythme };
// marge du haut de la page, comptée dans le centrage de la carte de lancement
const CONTENT_TOP = 8;
// marge intérieure de la carte de lancement, identique en X et en Y
const HERO_PAD = 2 * radius.cardInset;
// hauteur du fondu au-dessus de la carte de leçon
const FADE = 48;
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

type Mode = 'plan' | 'situation' | 'running' | 'done';
interface Summary { result: SessionResult; streak: number; bonus: number; badges: string[]; counted: boolean; progress: { d: Area; titles: string[] }[] }

export function WorkoutScreen() {
  const st = useUserStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [mode, setMode] = useState<Mode>('plan');
  const [items, setItems] = useState<PlanItem[]>([]);
  // programme : ce qui est demandé (libellé, flèche), ce qui est à l'écran (la carte reste le temps de se replier),
  // et l'avancée du dépliage (0 → 1)
  const reduce = useReduceMotion();
  const [planOpen, setPlanOpen] = useState(false);
  const [planShown, setPlanShown] = useState(false);
  const [planT] = useState(() => new Animated.Value(0));
  const [summary, setSummary] = useState<Summary | null>(null);
  // pendant qu'on fait glisser la durée, la page ne défile pas
  const [sliding, setSliding] = useState(false);
  // programme replié : la carte de lancement se tient au milieu de la page (entre la barre de titre et la carte de
  // leçon). On mesure la hauteur visible et la place de la carte dans son bloc, puis on fait glisser le contenu.
  const [viewH, setViewH] = useState(0);
  const [heroBox, setHeroBox] = useState({ y: 0, h: 0 });
  const [offset] = useState(() => new Animated.Value(0));
  const placed = useRef(false);
  // carte de leçon posée en bas (avec son fondu) : sa hauteur, pour laisser la place au contenu et centrer la carte
  const [dockH, setDockH] = useState(0);
  const before = useRef<Set<string>>(new Set());
  // heure de référence du programme affiché : relevée à l'arrivée sur l'onglet et au retour au programme
  const [planNow, setPlanNow] = useState(() => Date.now());
  useEffect(() => navigation.addListener('focus', () => setPlanNow(Date.now())), [navigation]);
  const backToPlan = () => { setPlanNow(Date.now()); setMode('plan'); };

  // pas d'onglets pendant la séance : un seul objectif à l'écran
  useEffect(() => {
    navigation.setOptions({ tabBarStyle: mode === 'running' || mode === 'situation' ? { display: 'none' } : { backgroundColor: colors.card, borderTopColor: colors.line } } as never);
  }, [mode, navigation]);

  const hasInstrument = st.settings.hasInstrument ?? true;
  const canSing = st.settings.canSing ?? true;
  const techMin = st.settings.techniqueMinutes ?? 0;
  const progress = lessonProgressOf(st);
  const makePlan = (o: { hasInstrument: boolean; canSing: boolean }, now: number) => {
    const s = useUserStore.getState();
    return buildWorkout({
      templates: TEMPLATES, competences: s.competences, progress: lessonProgressOf(s), minutes: s.settings.sessionMinutes,
      techniqueMinutes: s.settings.techniqueMinutes ?? 0, instrument: s.settings.instrument, hasInstrument: o.hasInstrument, canSing: o.canSing,
      now, today: dayKey(), seed: hash(dayKey()), avgTimeS: s.avgTimeS, techProgress: s.techProgress,
    });
  };
  const isPlan = mode === 'plan';
  const plan = useMemo(() => makePlan({ hasInstrument, canSing }, planNow),
    [st.settings.sessionMinutes, techMin, hasInstrument, canSing, st.settings.instrument, isPlan, planNow, st.deepLessonsSeen?.length, st.deepLessonsDone?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const discover = lessonsToDiscover(progress, st.settings.instrument)[0];
  const canStart = st.canStartWorkout();
  const showDock = !plan.needsLesson && !!discover;
  // centrage dans l'espace libre, entre la barre de titre et le haut de la carte de leçon
  const dockSpace = showDock ? dockH : 0;
  const measured = viewH > 0 && heroBox.h > 0 && (!showDock || dockH > 0);
  const avail = viewH - Math.max(0, dockSpace - FADE);
  const centered = measured ? Math.max(0, Math.round(avail / 2 - CONTENT_TOP - heroBox.y - heroBox.h / 2)) : 0;
  useEffect(() => {
    if (planOpen || !measured) return;
    // au premier affichage, directement au centre ; ensuite (programme replié, carte qui change de taille) en glissant
    if (!placed.current || reduce) { placed.current = true; offset.setValue(centered); return; }
    Animated.timing(offset, { toValue: centered, duration: 320, easing: Easing.inOut(Easing.cubic), useNativeDriver: ND }).start();
  }, [centered, measured, planOpen, reduce, offset]);

  const start = (o: { hasInstrument: boolean; canSing: boolean }) => {
    st.setSettings(o);
    before.current = new Set(Object.values(st.competences).filter((c) => c.reps > 0 && (c.successes ?? 0) > 0).map((c) => c.key));
    setItems(makePlan(o, Date.now()).items);
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
    return <SituationScreen instrument={st.settings.instrument} initial={{ hasInstrument, canSing }} onCancel={backToPlan} onGo={start} />;
  }
  if (mode === 'running') return <SessionRunner items={items} onEnd={onEnd} />;
  if (mode === 'done' && summary) return <SessionSummary s={summary} onClose={backToPlan} />;

  const doneToday = st.lastSessionDay === dayKey();
  // dépliage lent et doux, repli vif ; la carte quitte l'écran une fois repliée (sauf si on la rouvre entre-temps)
  const togglePlan = () => {
    const open = !planOpen;
    setPlanOpen(open);
    if (open) setPlanShown(true);
    if (reduce) { planT.setValue(open ? 1 : 0); if (open) offset.setValue(0); else setPlanShown(false); return; }
    // à l'ouverture la carte remonte en haut pendant que le programme se déplie ; au repli elle redescend (effet plus haut)
    if (open) Animated.timing(offset, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
    Animated.timing(planT, { toValue: open ? 1 : 0, duration: open ? 700 : 260, easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.quad), useNativeDriver: ND })
      .start(({ finished }) => { if (finished && !open) setPlanShown(false); });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* barre de titre : la série du jour à droite, toujours visible */}
      <View style={styles.titleBar}>
        <Text style={[type.display, { flex: 1 }]} accessibilityRole="header">Séance du jour</Text>
        <View style={styles.streak} accessible accessibilityLabel={st.streak ? `Série : ${st.streak} jour${st.streak > 1 ? 's' : ''} d'affilée` : 'Série : aucun jour pour l\'instant'}>
          <Text style={styles.streakCount}>{st.streak}</Text>
          <Flame size={24} lit={st.streak > 0} />
        </View>
      </View>
      <View style={styles.body}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 + dockSpace }]} scrollEnabled={!sliding} onLayout={(e) => setViewH(e.nativeEvent.layout.height)}>
          {/* tout le contenu glisse d'un bloc (translation : animée sur le fil natif, sans recalculer la mise en page) ;
              invisible le temps de la première mesure, pour ne pas voir la carte sauter du haut vers le centre */}
          <Animated.View style={[styles.flow, { opacity: measured ? 1 : 0, transform: [{ translateY: offset }] }]}>
            <View style={styles.block}>
              {doneToday ? <Text style={type.small}>{'Séance faite aujourd\'hui ✓'}</Text> : !st.streak ? <Text style={type.small}>{'Une séance par jour, et tout s\'enchaîne.'}</Text> : null}

              <View onLayout={(e) => {
                const { y, height } = e.nativeEvent.layout;
                if (y !== heroBox.y || height !== heroBox.h) setHeroBox({ y, h: height });
              }}>
                {plan.needsLesson ? (
                  <View style={styles.hero}>
                    <Text style={[type.title, styles.heroText, { color: colors.onPrimary }]}>Ta séance se construit à partir de tes leçons</Text>
                    <Text style={styles.heroLine}>{'Commence par une leçon : quelques minutes pour écouter, essayer, comprendre. Ta séance s\'ouvre ensuite.'}</Text>
                    {lessonsToDiscover(progress, st.settings.instrument).map((l) => (
                      <PlayButton key={l.id} label={l.title} onPress={() => navigation.navigate('DeepLesson', { id: l.id })} accessibilityLabel={`Commencer la leçon ${l.number} : ${l.title}`} />
                    ))}
                  </View>
                ) : canStart ? (
                  <View style={styles.hero}>
                    <PlayButton big label="Commencer" onPress={onStart} disabled={plan.items.length === 0} accessibilityLabel="Commencer la séance" />
                    <StepSlider label="Durée de la séance" value={st.settings.sessionMinutes} min={10} max={30} step={5} format={(m) => `${m} min`}
                      onChange={(m) => st.setSettings({ sessionMinutes: m })} onSliding={setSliding}
                      ink={colors.onPrimary} soft={colors.onPrimarySoft} fill={colors.onPrimaryTint} />
                  </View>
                ) : (
                  <View style={styles.card}>
                    <Text style={type.title}>Séance du jour terminée ✓</Text>
                    <Text style={type.body}>Ta prochaine séance gratuite arrive demain. Jouer reste ouvert : métronome, accordeur, jam.</Text>
                  </View>
                )}
              </View>

              {plan.items.length ? <Disclosure open={planOpen} onPress={togglePlan} /> : null}
            </View>
            {planShown && plan.items.length ? <PlanDetail items={plan.items} instrument={st.settings.instrument} t={planT} /> : null}
            {!plan.needsLesson && plan.items.length === 0 ? <Text style={type.body}>{'Rien à pratiquer aujourd\'hui : découvre une nouvelle leçon.'}</Text> : null}
          </Animated.View>
        </ScrollView>

        {/* la prochaine leçon reste à portée de pouce, posée sur la barre d'onglets ; au-dessus et autour d'elle, le contenu
            qui défile s'efface dans le fond (transparent en haut, couleur du fond en bas) */}
        {showDock && discover ? (
          <View style={styles.dock} pointerEvents="box-none" onLayout={(e) => setDockH(e.nativeEvent.layout.height)}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
              <Defs>
                <LinearGradient id="fondu" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.paper} stopOpacity={0} />
                  {/* plein dès les trois quarts : rien ne transparaît sous la carte, entre elle et la barre d'onglets.
                      Le dernier arrêt, à 1, est indispensable sur iOS : sans lui, rien n'est peint après 0,75. */}
                  <Stop offset="0.75" stopColor={colors.paper} stopOpacity={1} />
                  <Stop offset="1" stopColor={colors.paper} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#fondu)" />
            </Svg>
            <NextLessonCard title={discover.title} onPress={() => navigation.navigate('DeepLesson', { id: discover.id })} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/** bouton « lecture » : sous le doigt il s'enfonce et son ▶ avance, prêt à partir */
function PlayButton({ label, onPress, disabled, big, accessibilityLabel }: { label: string; onPress: () => void; disabled?: boolean; big?: boolean; accessibilityLabel: string }) {
  const { p, onPressIn, onPressOut } = usePress();
  const text = [styles.heroBtnText, big && styles.heroBtnTextBig];
  return (
    <AnimatedPressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
      style={[styles.heroBtn, big && styles.heroBtnBig, disabled && { opacity: 0.5 }, { transform: [{ scale: lerp(p, 1, 0.96) }] }]}>
      <Animated.Text style={[...text, { transform: [{ translateX: lerp(p, 0, 6) }] }]}>▶</Animated.Text>
      <Text style={[...text, { flexShrink: 1 }]}>{label}</Text>
    </AnimatedPressable>
  );
}

/** « Voir le programme » : un chevron fixe, vers le bas (fermé) ou vers le haut (ouvert) ; c'est la carte qui s'anime */
function Disclosure({ open, onPress }: { open: boolean; onPress: () => void }) {
  const label = open ? 'Masquer le programme' : 'Voir le programme';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} style={styles.disclosure}>
      <Text style={styles.disclosureText}>{label}</Text>
      <Svg width={15} height={15} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path d={open ? 'M5 15.5 L12 8.5 L19 15.5' : 'M5 8.5 L12 15.5 L19 8.5'} stroke={colors.inkSoft} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Pressable>
  );
}

/** la prochaine leçon, posée sur la barre d'onglets : sous le doigt la carte se tasse et sa flèche file vers la droite */
function NextLessonCard({ title, onPress }: { title: string; onPress: () => void }) {
  const { p, onPressIn, onPressOut } = usePress();
  return (
    <AnimatedPressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button" accessibilityLabel={`Nouvelle leçon : ${title}`}
      style={[styles.newLesson, { transform: [{ scale: lerp(p, 1, 0.98) }] }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.kicker}>Nouvelle leçon</Text>
        <Text style={styles.newLessonTitle} numberOfLines={1}>{title}</Text>
      </View>
      <Animated.Text style={[styles.newLessonGo, { transform: [{ translateX: lerp(p, 0, 6) }] }]}>›</Animated.Text>
    </AnimatedPressable>
  );
}

// programme : colonne de gauche (formes et ligne), axe de la ligne, hauteur du coude (milieu de la 1re ligne de texte)
const GUTTER = 30;
const STEM_X = 10;
const BRANCH_H = 15;

/**
 * Programme : chaque partie a sa forme ; une ligne en descend et se courbe vers chacun de ses exercices, comme la hampe
 * d'un accord qui relie ses notes. `t` (0 → 1) le déroule de haut en bas : la forme éclot, puis les exercices
 * s'écoulent le long de la ligne ; au repli, le même chemin à l'envers.
 */
// mémorisé : l'écran se redessine souvent (réglages, dépliage), le programme seulement quand ses exercices changent
const PlanDetail = React.memo(function PlanDetail({ items, instrument, t }: { items: PlanItem[]; instrument: 'piano' | 'guitare'; t: Animated.Value }) {
  const of = (p: WorkoutPart) => items.filter((x) => (x.wpart ?? 'revision') === p);
  const parts = PART_ORDER.filter((p) => of(p).length);
  const titleOf = (x: PlanItem) => {
    const tp = templateById(x.templateId);
    return x.tech ? x.tech.label : x.confirmLesson ? `Validation · ${deepLessonById(x.confirmLesson)?.title}` : displayTitle(tp, x.params, instrument);
  };
  const rows = parts.flatMap((p) => [
    { key: p, part: p, head: true, label: '', last: false },
    ...of(p).map((x, j, all) => ({ key: `${p}-${j}`, part: p, head: false, label: titleOf(x), last: j === all.length - 1 })),
  ]);
  // chaque rangée a sa fenêtre dans t : elles apparaissent l'une après l'autre
  const win = (i: number, from: number, to: number) => {
    const s = (i / rows.length) * 0.6;
    return t.interpolate({ inputRange: [s, s + 0.4], outputRange: [from, to], extrapolate: 'clamp' });
  };
  const card = {
    opacity: t.interpolate({ inputRange: [0, 0.15], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [{ translateY: t.interpolate({ inputRange: [0, 0.3], outputRange: [-10, 0], extrapolate: 'clamp' }) }],
  };
  return (
    <Animated.View style={[styles.card, styles.plan, card]}>
      {rows.map((r, i) => {
        // la ligne : la nuance de la partie, adoucie vers le fond de la carte
        const line = mixHex(partColor[r.part], colors.card, 0.45);
        return r.head ? (
          <Animated.View key={r.key} style={[styles.planRow, i > 0 && { marginTop: 14 }, { opacity: win(i, 0, 1) }]}>
            <View style={styles.gutter}>
              <View style={[styles.stem, { top: '50%', backgroundColor: line }]} />
              <Animated.View style={[styles.shape, { transform: [{ scale: win(i, 0.3, 1) }] }]}><PartShape part={r.part} size={18} /></Animated.View>
            </View>
            <Text style={styles.planPart}>{PART_LABEL[r.part]}</Text>
          </Animated.View>
        ) : (
          <Animated.View key={r.key} style={[styles.planRow, { opacity: win(i, 0, 1), transform: [{ translateY: win(i, -6, 0) }] }]}>
            <View style={styles.gutter}>
              {r.last ? null : <View style={[styles.stem, { top: 0, backgroundColor: line }]} />}
              <View style={[styles.branch, { borderColor: line }]} />
            </View>
            <Text style={[type.small, styles.planItem]}>{r.label}</Text>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
});

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
  titleBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.card, borderRadius: radius.capsule, paddingHorizontal: 12, minHeight: 40 },
  streakCount: { fontSize: 20, fontWeight: '900', color: colors.ink, fontVariant: ['tabular-nums'] },
  body: { flex: 1 },
  content: { padding: 20, paddingTop: CONTENT_TOP, gap: 14, paddingBottom: 24 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: FADE },
  flow: { gap: 14 },
  block: { gap: 14 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  // carte de lancement : la même marge partout ; ses coins suivent ceux du bouton logé dans ses coins du haut
  // (rayon du bouton + marge), resserrés de quelques points pour une carte moins ronde
  hero: { backgroundColor: colors.primary, borderRadius: radius.play + HERO_PAD - 6, ...curve, padding: HERO_PAD, gap: 12 },
  heroText: { paddingHorizontal: 6 },
  heroBtn: { flexDirection: 'row', gap: 10, backgroundColor: colors.card, borderRadius: radius.play, ...curve, minHeight: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  heroBtnBig: { minHeight: 84 },
  heroBtnText: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  heroBtnTextBig: { fontSize: 24 },
  heroLine: { color: colors.onPrimarySoft, fontSize: 13, textAlign: 'center', paddingHorizontal: 6 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, ...curve, padding: 16, gap: 12 },
  newLesson: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 16, ...curve, paddingVertical: 10, paddingHorizontal: 14, marginHorizontal: 20, marginBottom: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: `${colors.accent}99` },
  newLessonTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  newLessonGo: { fontSize: 26, fontWeight: '700', color: colors.accent },
  kicker: { color: colors.accent, fontWeight: '900', fontSize: 13 },
  disclosure: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12, minHeight: 44 },
  disclosureText: { fontSize: 14, fontWeight: '800', color: colors.inkSoft },
  // programme : rangées collées (la ligne passe de l'une à l'autre sans trou)
  plan: { gap: 0 },
  planRow: { flexDirection: 'row' },
  gutter: { width: GUTTER, alignSelf: 'stretch', justifyContent: 'center' },
  shape: { marginLeft: STEM_X - 9 },
  stem: { position: 'absolute', left: STEM_X - 1, width: 2, bottom: 0 },
  branch: { position: 'absolute', left: STEM_X - 1, top: 0, width: GUTTER - STEM_X - 4, height: BRANCH_H, borderLeftWidth: 2, borderBottomWidth: 2, borderBottomLeftRadius: 9 },
  planPart: { flex: 1, paddingVertical: 2, fontSize: 14, fontWeight: '800', color: colors.ink },
  planItem: { flex: 1, paddingVertical: 5, color: colors.ink },
  row: { flexDirection: 'row', gap: 8 },
  opt: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, borderRadius: radius.capsule, backgroundColor: colors.card, alignItems: 'center' },
  optOn: { backgroundColor: colors.primary },
  optText: { fontWeight: '800', color: colors.ink, textAlign: 'center' },
  flame: { fontSize: 64 },
  streakNum: { fontSize: 20, fontWeight: '900', color: colors.warn, marginTop: -8 },
  statGrid: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  statBox: { flex: 1, backgroundColor: colors.card, borderRadius: radius.tile, ...curve, paddingVertical: 14, alignItems: 'center' },
  statBig: { fontSize: 24, fontWeight: '900', color: colors.accent },
  box: { backgroundColor: colors.card, borderRadius: radius.card, ...curve, padding: 16, gap: 6, alignSelf: 'stretch' },
});
