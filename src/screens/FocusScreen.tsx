// Entraînement ciblé : quelques minutes sur un domaine, lancées d'un toucher depuis « Jouer ».
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TEMPLATES } from '../content/templates';
import { AREA_LABEL } from '../content/skills';
import { buildFocus } from '../engine/focus';
import { newSeed } from '../engine/rng';
import { lessonProgressOf, useUserStore } from '../store/useUserStore';
import { SessionRunner, type SessionResult } from '../session/SessionRunner';
import { Button } from '../components/Button';
import { colors, type } from '../theme';
import type { RootStackParamList } from './navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Focus'>;

const FOCUS_MINUTES = 5;

export function FocusScreen({ route, navigation }: Props) {
  const { area } = route.params;
  const make = () => {
    const s = useUserStore.getState();
    return buildFocus({
      area, templates: TEMPLATES, competences: s.competences, progress: lessonProgressOf(s), instrument: s.settings.instrument,
      hasInstrument: s.settings.hasInstrument ?? true, canSing: s.settings.canSing ?? true, minutes: FOCUS_MINUTES, now: Date.now(), seed: newSeed(), avgTimeS: s.avgTimeS,
    });
  };
  const [run, setRun] = useState(() => ({ key: 0, items: make() }));
  const [done, setDone] = useState<SessionResult | null>(null);

  if (!run.items.length) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={type.title}>{AREA_LABEL[area]}</Text>
        <Text style={[type.body, { textAlign: 'center' }]}>Ce domaine s'ouvre avec tes premières leçons.</Text>
        <Button label="Retour" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }
  if (done) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={type.display}>{AREA_LABEL[area]}</Text>
        <Text style={type.body}>{done.done ? `${done.ok} réussi${done.ok > 1 ? 's' : ''} sur ${done.done}` : 'Aucun exercice fait.'}</Text>
        <Button label="Encore 5 minutes" onPress={() => { setDone(null); setRun((r) => ({ key: r.key + 1, items: make() })); }} style={{ alignSelf: 'stretch' }} />
        <Button variant="texte" color={colors.inkSoft} label="Retour" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }
  return <SessionRunner key={run.key} items={run.items} where={`entraînement ${area}`} onEnd={(r) => setDone(r)} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
});
