// Pratique libre depuis l'arbre (premium) et boss de palier.
import React, { useEffect, useRef, useState } from 'react';
import type { Params } from '../content/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BOSSES, templateById } from '../content/templates';
import { newSeed } from '../engine/rng';
import { ExercisePlayer } from '../exercise/ExercisePlayer';
import { useUserStore } from '../store/useUserStore';
import { Button } from '../components/Button';
import { FeedbackButton } from '../components/FeedbackButton';
import { colors, type } from '../theme';
import type { RootStackParamList } from './navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Practice'>;

export function PracticeScreen({ route, navigation }: Props) {
  const p = route.params;
  const completeBoss = useUserStore((s) => s.completeBoss);
  const [i, setI] = useState(0);
  const [bossResult, setBossResult] = useState<boolean | null>(null);
  const successes = useRef<boolean[]>([]);
  const BOSS = BOSSES.find((b) => 'boss' in p && b.id === p.boss) ?? BOSSES[0];
  const [seeds] = useState(() => BOSS.steps.map(() => newSeed()));

  if ('boss' in p) {
    if (bossResult !== null) {
      return (
        <SafeAreaView style={styles.center}>
          <Text style={type.display}>{bossResult ? `Palier ${BOSS.palier} validé !` : 'Presque !'}</Text>
          <Text style={type.body}>{bossResult ? '+200 XP et un badge dans ton profil.' : `Il faut réussir les ${BOSS.steps.length} épreuves. Retente quand tu veux.`}</Text>
          <Button label="Retour à l'arbre" onPress={() => navigation.goBack()} />
        </SafeAreaView>
      );
    }
    const s = BOSS.steps[i];
    const advance = () => {
      if (i + 1 < BOSS.steps.length) setI(i + 1);
      else {
        const ok = BOSS.steps.every((_, k) => successes.current[k]);
        if (ok) completeBoss(BOSS.id);
        setBossResult(ok);
      }
    };
    return (
      <SafeAreaView style={styles.screen}>
        <TopBar title={`${BOSS.title} · ${i + 1}/${BOSS.steps.length}`} onClose={() => navigation.goBack()} />
        <ExercisePlayer
          key={i} template={templateById(s.templateId)} params={s.params} seed={seeds[i]} inSession={false}
          onFinished={(_, o) => { successes.current[i] = o.success; }}
          onNext={() => advance()}
          onSkip={() => { successes.current[i] = false; advance(); }}
        />
      </SafeAreaView>
    );
  }

  if (p.minutes) return <TimedSeries templateId={p.templateId} params={p.params} minutes={p.minutes} tempoStep={p.tempoStep} onClose={() => navigation.goBack()} />;
  return (
    <SafeAreaView style={styles.screen}>
      <TopBar title="Pratique libre" onClose={() => navigation.goBack()} />
      <ExercisePlayer
        onSkip={() => navigation.goBack()}
        template={templateById(p.templateId)} params={p.params} seed={p.seed} inSession={false}
        onFinished={() => undefined} onNext={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
}

/** Série chronométrée (retour bêta : « pouvoir choisir la durée d'entraînement ») : on enchaîne les exercices
 *  jusqu'à la fin du temps, puis bilan. L'exercice en cours se termine avant le bilan. */
function TimedSeries({ templateId, params: params0, minutes, tempoStep, onClose }: { templateId: string; params?: Params; minutes: number; tempoStep?: number; onClose: () => void }) {
  const [k, setK] = useState(0);
  // technique (page Pratique) : le tempo monte du pas choisi après chaque exécution réussie
  const [params, setParams] = useState<Params | undefined>(params0);
  const bpm = typeof params?.tempo_cle === 'number' ? params.tempo_cle : null;
  const [left, setLeft] = useState(minutes * 60);
  const [over, setOver] = useState(false);
  const [seeds, setSeeds] = useState<number[]>(() => [newSeed()]);
  const [results, setResults] = useState<boolean[]>([]);
  useEffect(() => {
    const iv = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(iv);
  }, []);
  const next = () => {
    if (left <= 0) { setOver(true); return; }
    const seed = newSeed();
    setSeeds((s) => [...s, seed]);
    setK((x) => x + 1);
  };
  if (over) {
    const ok = results.filter(Boolean).length;
    return (
      <SafeAreaView style={styles.center}>
        <Text style={type.display}>Série terminée</Text>
        <Text style={type.body}>{results.length} exercice{results.length > 1 ? 's' : ''} en {minutes} min · {ok} réussi{ok > 1 ? 's' : ''}</Text>
        {bpm !== null && tempoStep ? <Text style={type.body}>Tempo atteint : {bpm} BPM</Text> : null}
        <Button label="Retour à la pratique" onPress={onClose} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.screen}>
      <TopBar title={`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} · ${k + 1}e exercice${bpm !== null ? ` · ${bpm} BPM` : ''}`} onClose={() => (results.length ? setOver(true) : onClose())} />
      <ExercisePlayer
        key={k} template={templateById(templateId)} params={params} seed={seeds[k]} inSession={false}
        onFinished={(_, o) => {
          setResults((r) => { const c = [...r]; c[k] = o.success; return c; });
          if (o.success && tempoStep && bpm !== null) setParams((x) => ({ ...x, tempo_cle: Math.min(240, bpm + tempoStep) }));
        }}
        onNext={next} onSkip={next}
      />
    </SafeAreaView>
  );
}

function TopBar({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10}><Text style={styles.close}>✕</Text></Pressable>
      <Text style={styles.progress}>{title}</Text>
      <FeedbackButton where="pratique libre" compact />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6 },
  close: { fontSize: 22, color: colors.inkSoft },
  screen: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  progress: { textAlign: 'center', fontWeight: '800', color: colors.inkSoft },
});
