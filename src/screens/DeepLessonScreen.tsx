// Leçon : écouter d'abord, essayer avec les mains (« À toi d'essayer », avant qu'on donne le nom), comprendre
// (écrans illustrés et jouables, un à la fois), pratiquer, valider. Qui sait déjà peut passer directement la validation.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from './navigation';
import { DEEP_LESSONS, deepLessonById } from '../content/deep';
import { lessonOpen, lessonState } from '../engine/cursus';
import type { DeepPractice } from '../content/deep/types';
import { templateById } from '../content/templates';
import { audio } from '../audio/RNAudioEngine';
import { soundGroup } from '../audio/soundGroup';
import { newSeed } from '../engine/rng';
import { ExercisePlayer } from '../exercise/ExercisePlayer';
import { DeepIllustration } from '../components/DeepIllustration';
import { TryPanel } from '../components/TryPanel';
import { triesFor } from '../content/deep/tries';
import { Button } from '../components/Button';
import { XP } from '../engine/xp';
import { lessonProgressOf, useUserStore } from '../store/useUserStore';
import { colors, type } from '../theme';

const DOMAIN_LABEL: Record<DeepPractice['domain'], string> = {
  oreille: 'Oreille', rythme: 'Rythme', theorie: 'Théorie', technique: 'Technique', impro: 'Impro', repiquage: 'Repiquage',
  chant: 'Chant', audiation: 'Audiation', lecture: 'Lecture',
};
const DOMAIN_COLOR: Record<DeepPractice['domain'], string> = {
  oreille: '#2F6FCF', rythme: '#B5651D', theorie: '#7A4FC9', technique: '#16806A', impro: '#C03F7A', repiquage: '#8A5A2B',
  chant: '#2F6FCF', audiation: '#C03F7A', lecture: '#7A4FC9',
};

type Phase = { kind: 'intro' } | { kind: 'screen'; i: number } | { kind: 'practiceIntro' } | { kind: 'practice'; i: number } | { kind: 'validation' } | { kind: 'result'; ok: boolean; xp?: number };

export function DeepLessonScreen() {
  const nav = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DeepLesson'>>();
  const lessonAll = deepLessonById(params.id)!;
  const instrument = useUserStore((s) => s.settings.instrument);
  const markDone = useUserStore((s) => s.markDeepLessonDone);
  const markSeen = useUserStore((s) => s.markDeepLessonSeen);
  const storeAll = useUserStore();
  const progress = lessonProgressOf(storeAll);
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [guess, setGuess] = useState<'A' | 'B' | null>(null);
  /** étapes « À toi d'essayer » déjà faites (par écran) : le nom et l'explication s'affichent ensuite */
  const [tried, setTried] = useState<Record<number, number>>({});
  /** « je connais déjà » : on passe directement à la validation */
  const [testOut, setTestOut] = useState(false);
  // une graine fixe par exercice (sinon il changerait à chaque rafraîchissement) ; renouvelée pour réessayer
  const seeds = useRef<Record<string, number>>({});
  const seedFor = (key: string) => (seeds.current[key] ??= newSeed());
  // écrans réservés à un instrument (positions de guitare…) : filtrés une fois pour toutes
  const lesson = useMemo(() => ({ ...lessonAll, screens: lessonAll.screens.filter((x) => !x.only || x.only === instrument) }), [lessonAll, instrument]);
  const practice = useMemo(() => lesson.practice.filter((p) => !p.only || p.only === instrument), [lesson, instrument]);
  const validation = instrument === 'guitare' && lesson.guitarValidation ? lesson.guitarValidation : lesson.validation;
  const results = useRef<Record<number, boolean>>({});
  const accent = '#E0457B';
  // un exemple à la fois : écouter B coupe A, changer d'écran coupe l'exemple en cours
  const sounds = useRef(soundGroup()).current;
  const play = (notes: { midi: number; start: number; dur: number }[], tempo: number) => { audio.init().then(() => { sounds.fresh(); sounds.play(notes, { tempo, instrument }); }); };
  useEffect(() => { sounds.stop(); }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => sounds.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => nav.goBack();

  const steps = lesson.screens.length + practice.length + 2;
  const position = phase.kind === 'intro' ? 0 : phase.kind === 'screen' ? 1 + phase.i : phase.kind === 'practiceIntro' ? 1 + lesson.screens.length
    : phase.kind === 'practice' ? 1 + lesson.screens.length + phase.i : steps;

  const header = (
    <View style={styles.header}>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fermer la leçon" style={styles.close}><Text style={styles.closeText}>✕</Text></Pressable>
      <View style={styles.progress} accessibilityLabel={`Étape ${position + 1} sur ${steps + 1}`}>
        <View style={[styles.progressFill, { width: `${Math.round((position / steps) * 100)}%`, backgroundColor: accent }]} />
      </View>
    </View>
  );

  // ---------- leçon pas encore ouverte : elle découle d'autres leçons à valider d'abord ----------
  if (lessonState(lessonAll, progress) === 'verrouillee') {
    const missing = (lessonAll.parents ?? []).filter((x) => !progress.done.includes(x)).map((x) => deepLessonById(x)).filter(Boolean);
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={[styles.kicker, { color: accent }]}>Leçon {lesson.number}</Text>
          <Text style={type.display}>{lesson.title}</Text>
          <Text style={type.body}>{'Cette leçon s\'appuie sur '}{missing.length > 1 ? 'des leçons' : 'une leçon'}{' que tu n\'as pas encore validée'}{missing.length > 1 ? 's' : ''} :</Text>
          {missing.map((l) => (
            <Button key={l!.id} variant="contour" color={accent} label={`Leçon ${l!.number} · ${l!.title}`} onPress={() => (nav as unknown as { replace: (r: string, p: object) => void }).replace('DeepLesson', { id: l!.id })} />
          ))}
          <Button variant="texte" color={colors.inkSoft} label="Fermer" onPress={close} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------- découverte ----------
  if (phase.kind === 'intro') {
    const d = lesson.discover;
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={[styles.kicker, { color: accent }]}>Leçon {lesson.number}</Text>
          <Text style={type.display}>{lesson.title}</Text>
          <Text style={type.body}>{lesson.why}</Text>
          {lesson.provisional ? <Text style={type.small}>{'Version courte : l\'essentiel pour commencer à pratiquer. La leçon approfondie arrive dans une prochaine version.'}</Text> : null}
          {d ? (
            <View style={styles.card}>
              <Text style={styles.cardKicker}>{'Écoute d\'abord'}</Text>
              <Text style={type.title}>{d.question}</Text>
              <View style={styles.row}>
                <Button variant="contour" color={accent} label="▶ Écouter A" onPress={() => play(d.a.notes, d.a.tempo)} style={{ flex: 1 }} />
                <Button variant="contour" color={accent} label="▶ Écouter B" onPress={() => play(d.b.notes, d.b.tempo)} style={{ flex: 1 }} />
              </View>
              {guess === null ? (
                <View style={styles.row}>
                  <Button color={accent} label="C'est A" onPress={() => setGuess('A')} style={{ flex: 1 }} />
                  <Button color={accent} label="C'est B" onPress={() => setGuess('B')} style={{ flex: 1 }} />
                </View>
              ) : (
                <View style={{ gap: 6 }} accessibilityLiveRegion="polite">
                  <Text style={[type.title, { color: guess === d.answer ? colors.success : colors.ink }]}>{guess === d.answer ? 'Bien entendu !' : `C'était ${d.answer}.`}</Text>
                  <Text style={type.body}>{d.reveal}</Text>
                </View>
              )}
            </View>
          ) : null}
          <Button color={accent} label="Commencer la leçon" disabled={!!d && guess === null} onPress={() => setPhase({ kind: 'screen', i: 0 })} />
          {d && guess === null ? <Button variant="texte" color={colors.inkSoft} label="Passer l'écoute" onPress={() => setPhase({ kind: 'screen', i: 0 })} /> : null}
          {!progress.done.includes(lessonAll.id) ? (
            <Button variant="texte" color={colors.inkSoft} label="Je connais déjà : passer la validation" onPress={() => { setTestOut(true); setPhase({ kind: 'validation' }); }} />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------- comprendre : un écran à la fois ----------
  if (phase.kind === 'screen') {
    const s = lesson.screens[phase.i];
    const g = instrument === 'guitare';
    const ill = g && s.guitarIllustration ? s.guitarIllustration : s.illustration;
    const paragraphs = g && s.guitarParagraphs ? s.guitarParagraphs : s.paragraphs;
    const keep = g && s.guitarKeep ? s.guitarKeep : s.keep;
    const sound = g && s.guitarAudio ? s.guitarAudio : s.audio;
    const last = phase.i === lesson.screens.length - 1;
    // « À toi d'essayer » : d'abord chercher avec les mains ; le nom (l'écran) vient ensuite
    const tries = triesFor(lessonAll.id, s.title);
    const pending = tries[tried[phase.i] ?? 0];
    if (pending) {
      return (
        <SafeAreaView style={styles.screen}>
          {header}
          <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
            <Text style={[styles.kicker, { color: accent }]}>{phase.i + 1} / {lesson.screens.length}</Text>
            <TryPanel key={`${phase.i}-${tried[phase.i] ?? 0}`} t={pending} accent={accent} onDone={() => setTried((x) => ({ ...x, [phase.i]: (x[phase.i] ?? 0) + 1 }))} />
            <Button variant="texte" color={colors.inkSoft} label="← Précédent" onPress={() => setPhase(phase.i ? { kind: 'screen', i: phase.i - 1 } : { kind: 'intro' })} />
          </ScrollView>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={[styles.kicker, { color: accent }]}>{phase.i + 1} / {lesson.screens.length}</Text>
          <Text style={type.title}>{s.title}</Text>
          {ill ? <DeepIllustration ill={ill} accent={accent} onNote={(m) => { audio.init().then(() => audio.playNote(m, instrument)); }} /> : null}
          {sound ? <Button variant="contour" color={accent} label={`▶ ${sound.label}`} onPress={() => play(sound.notes, sound.tempo)} /> : null}
          {paragraphs.map((p, k) => <Text key={k} style={[type.body, styles.para]}>{p}</Text>)}
          {keep ? (
            <View style={[styles.keep, { borderColor: accent }]}>
              <Text style={[styles.cardKicker, { color: accent }]}>À retenir</Text>
              <Text style={[type.body, { fontWeight: '800' }]}>{keep}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Button variant="contour" color={colors.inkSoft} label="← Précédent" onPress={() => setPhase(phase.i ? { kind: 'screen', i: phase.i - 1 } : { kind: 'intro' })} style={{ flex: 1 }} />
            <Button color={accent} label={last ? 'Passer à la pratique' : 'Suivant →'} onPress={() => {
              // l'explication est vue : les notions de la leçon entrent dans le workout
              if (last) markSeen(lessonAll.id, lessonAll.concepts ?? [lessonAll.conceptId]);
              setPhase(last ? { kind: 'practiceIntro' } : { kind: 'screen', i: phase.i + 1 });
            }} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------- pratique par domaine ----------
  if (phase.kind === 'practiceIntro') {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={type.display}>À toi de jouer</Text>
          <Text style={type.body}>{'Un exercice dans chaque domaine où cette notion compte. Prends ton temps : l\'important est de comprendre, pas d\'aller vite.'}</Text>
          <View style={{ gap: 8 }}>
            {practice.map((p, i) => (
              <View key={i} style={[styles.practiceRow, { borderLeftColor: DOMAIN_COLOR[p.domain] }]}>
                <Text style={[styles.domain, { color: DOMAIN_COLOR[p.domain] }]}>{DOMAIN_LABEL[p.domain]}</Text>
                <Text style={type.body}>{p.label}</Text>
              </View>
            ))}
            <View style={[styles.practiceRow, { borderLeftColor: accent }]}>
              <Text style={[styles.domain, { color: accent }]}>Validation</Text>
              <Text style={type.body}>{validation.label} · {validation.criterion}</Text>
            </View>
          </View>
          <Button color={accent} label="Commencer la pratique" onPress={() => setPhase({ kind: 'practice', i: 0 })} />
          <Button variant="texte" color={colors.inkSoft} label="Revoir la leçon" onPress={() => setPhase({ kind: 'screen', i: 0 })} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const runExercise = (templateId: string, p: DeepPractice['params'] | undefined, key: string, label: string, color: string, onDone: (ok: boolean) => void) => {
    return (
      <SafeAreaView style={styles.screen}>
        {header}
        <Text style={[styles.exLabel, { color }]}>{label}</Text>
        <ExercisePlayer key={`${key}-${seedFor(key)}`} template={templateById(templateId)} params={p} seed={seedFor(key)} inSession // retour bêta : les exercices d'une leçon rapportent des XP comme en séance
          onFinished={(_, o) => { results.current[-1] = o.success; }}
          onNext={() => onDone(!!results.current[-1])} onSkip={() => onDone(false)} />
      </SafeAreaView>
    );
  };

  if (phase.kind === 'practice') {
    const p = practice[phase.i];
    const next = () => setPhase(phase.i + 1 < practice.length ? { kind: 'practice', i: phase.i + 1 } : { kind: 'validation' });
    return runExercise(p.templateId, p.params, `p${phase.i}`, `${DOMAIN_LABEL[p.domain]} · ${p.label}`, DOMAIN_COLOR[p.domain], next);
  }

  if (phase.kind === 'validation') {
    return runExercise(validation.templateId, validation.params, 'validation', `Validation · ${validation.criterion}`, accent,
      (ok) => {
        const first = ok && !(useUserStore.getState().deepLessonsDone ?? []).includes(lesson.id);
        // passée directement (« je connais déjà ») : la leçon compte aussi comme vue, ses exercices entrent dans la séance
        if (ok && testOut) markSeen(lessonAll.id, lessonAll.concepts ?? [lessonAll.conceptId]);
        if (ok) markDone(lesson.id, [validation.templateId, ...practice.map((x) => x.templateId)]);
        setPhase({ kind: 'result', ok, xp: first ? XP.lessonDone : 0 });
      });
  }

  // ---------- résultat ----------
  const after = { ...progress, done: [...new Set([...progress.done, lessonAll.id])] };
  const children = DEEP_LESSONS.filter((l) => l.parents.includes(lessonAll.id) && lessonOpen(l, after));
  return (
    <SafeAreaView style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={[styles.pad, { paddingTop: 40 }]}>
        <Text style={type.display}>{phase.ok ? 'Leçon validée ✓' : 'Presque'}</Text>
        {phase.xp ? <Text style={[styles.xp, { color: accent }]}>+ {phase.xp} XP</Text> : null}
        <Text style={type.body}>{phase.ok
          ? `Ses exercices entrent dans ta séance du jour${children.length ? `. ${children.length > 1 ? 'Nouvelles leçons' : 'Nouvelle leçon'} : ${children.map((c) => c.title).join(' · ')}` : ''}.`
          : testOut ? `La validation demande ${validation.criterion}. Pas grave : la leçon t'attend, elle va vite quand on connaît déjà.`
          : `La validation demande ${validation.criterion}. Relis l'écran qui t'a posé problème, puis réessaie : c'est normal d'y revenir.`}</Text>
        {phase.ok ? (
          <Button color={accent} label="Terminer" onPress={close} />
        ) : (
          <>
            <Button color={accent} label="Réessayer la validation" onPress={() => { delete seeds.current.validation; setPhase({ kind: 'validation' }); }} />
            <Button variant="contour" color={accent} label={testOut ? 'Faire la leçon' : 'Revoir la leçon'} onPress={() => { setTestOut(false); setPhase({ kind: 'screen', i: 0 }); }} />
            <Button variant="texte" color={colors.inkSoft} label="Plus tard" onPress={close} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  pad: { padding: 20, gap: 14, paddingBottom: 40 },
  xp: { fontSize: 22, fontWeight: '900' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 6 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, color: colors.inkSoft },
  progress: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  kicker: { fontWeight: '900', fontSize: 13 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 10 },
  cardKicker: { fontWeight: '900', fontSize: 12, color: colors.inkSoft },
  row: { flexDirection: 'row', gap: 10 },
  para: { lineHeight: 24 },
  keep: { borderWidth: 2, borderRadius: 14, padding: 12, gap: 4, backgroundColor: colors.card },
  practiceRow: { backgroundColor: colors.card, borderRadius: 14, padding: 12, borderLeftWidth: 5, gap: 2 },
  domain: { fontWeight: '900', fontSize: 12 },
  exLabel: { fontWeight: '900', fontSize: 13, paddingHorizontal: 20, paddingTop: 4 },
});
