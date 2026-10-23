// Premier lancement : choix de l'instrument et test du son (déverrouille l'audio sur iOS).
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Instrument } from '../content/types';
import { audio } from '../audio/RNAudioEngine';
import { useUserStore } from '../store/useUserStore';
import { Button } from '../components/Button';
import { colors, type } from '../theme';

const CHOICES: { id: Instrument; title: string; line: string; glyph: string }[] = [
  { id: 'piano', title: 'Piano', line: 'Clavier, tonique sur do', glyph: '🎹' },
  { id: 'guitare', title: 'Guitare', line: 'Manche, tonique sur la', glyph: '🎸' },
];

export function OnboardingScreen() {
  const finish = useUserStore((s) => s.finishOnboarding);
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [heard, setHeard] = useState(false);
  const [level, setLevel] = useState<'debut' | 'bases' | null>(null);

  const testSound = async () => {
    await audio.init();
    const t = instrument === 'guitare' ? 45 : 60;
    audio.play([0, 4, 7, 12].map((s, i) => ({ midi: t + s, start: i * 0.5, dur: 0.5 })), { tempo: 100, instrument: instrument ?? 'piano' });
    setHeard(true);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <Text style={styles.brand}>Melofy</Text>
        <Text style={type.title}>Tu joues de quoi ?</Text>
        <View style={styles.choices}>
          {CHOICES.map((c) => {
            const on = instrument === c.id;
            return (
              <Pressable key={c.id} onPress={() => setInstrument(c.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} style={[styles.choice, on && styles.choiceOn]}>
                <Text style={styles.glyph}>{c.glyph}</Text>
                <Text style={[type.title, on && { color: colors.onPrimary }]}>{c.title}</Text>
                <Text style={[type.small, on && { color: colors.onPrimarySoft }]}>{c.line}</Text>
              </Pressable>
            );
          })}
        </View>
        {instrument ? (
          <View style={styles.sound}>
            <Button variant="contour" label={heard ? 'Rejouer le son' : 'Tester le son'} onPress={testSound} />
            <Text style={type.small}>Pas de son ? Désactive le mode silencieux de ton téléphone et monte le volume.</Text>
          </View>
        ) : null}
        {heard ? (
          <View style={styles.sound}>
            <Text style={type.title}>Où en es-tu ?</Text>
            <View style={styles.choices}>
              {([['debut', 'Je débute', 'On part de zéro'], ['bases', 'J\'ai des bases', 'Test de 3 à 5 min']] as const).map(([id, title, line]) => {
                const on = level === id;
                return (
                  <Pressable key={id} onPress={() => setLevel(id)} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} style={[styles.choice, on && styles.choiceOn]}>
                    <Text style={[type.title, { fontSize: 17 }, on && { color: colors.onPrimary }]}>{title}</Text>
                    <Text style={[type.small, on && { color: colors.onPrimarySoft }]}>{line}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
      <Button label={level === 'bases' ? 'Passer le test' : 'Commencer'} disabled={!instrument || !heard || !level} onPress={() => instrument && finish(instrument, level === 'bases')} style={styles.cta} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, justifyContent: 'space-between' },
  body: { padding: 24, gap: 18 },
  brand: { fontSize: 44, fontWeight: '900', color: colors.ink, letterSpacing: -1, marginTop: 24 },
  choices: { flexDirection: 'row', gap: 12 },
  choice: { flex: 1, backgroundColor: colors.card, borderRadius: 22, padding: 18, gap: 4, borderWidth: 2, borderColor: colors.line },
  choiceOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  glyph: { fontSize: 36, marginBottom: 6 },
  sound: { gap: 8 },
  cta: { margin: 24 },
});
