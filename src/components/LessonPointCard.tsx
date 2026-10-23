// Point de leçon complet, à la demande : une seule page (jamais une suite d'écrans à lire).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Instrument } from '../content/types';
import type { LessonPoint } from '../content/lessons';
import { audio } from '../audio/RNAudioEngine';
import { colors, type } from '../theme';
import { Button } from './Button';
import { RhythmNotation } from './RhythmNotation';

export function LessonPointCard({ point, color, instrument, onDone, doneLabel = 'J\'ai compris', kicker = 'Point de leçon' }: {
  point: LessonPoint; color: string; instrument: Instrument; onDone: () => void; doneLabel?: string; kicker?: string;
}) {
  return (
    <View style={styles.card} accessibilityLabel={`${kicker} : ${point.title}`}>
      <Text style={[styles.kicker, { color }]}>{kicker}</Text>
      <Text style={type.title}>{point.title}</Text>
      {point.steps.map((step, i) => (
        <View key={i} style={styles.step}>
          <Text style={type.body}>{step.text}</Text>
          {step.notation ? <RhythmNotation items={step.notation} perBar={point.id === 'mesure_3' ? 3 : 4} /> : null}
          {step.example ? (
            <Button variant="contour" color={color} small label={`▶ ${step.example.label}`}
              onPress={() => { audio.init().then(() => audio.play(step.example!.notes, { tempo: step.example!.tempo, instrument })); }} />
          ) : null}
        </View>
      ))}
      <View style={styles.tip}>
        <Text style={[styles.tipTitle, { color }]}>Essaie</Text>
        <Text style={type.body}>{point.astuce}</Text>
      </View>
      <Button color={color} label={doneLabel} onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 22, gap: 12 },
  kicker: { fontWeight: '800', fontSize: 13 },
  step: { gap: 8 },
  tip: { backgroundColor: colors.hintBg, borderRadius: 14, padding: 14, gap: 6 },
  tipTitle: { fontWeight: '800' },
});
