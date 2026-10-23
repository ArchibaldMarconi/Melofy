// Point de leçon compact, intégré à l'exercice : une idée, une action à essayer tout de suite, un exemple.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Instrument } from '../content/types';
import type { LessonPoint } from '../content/lessons';
import { audio } from '../audio/RNAudioEngine';
import { colors, type } from '../theme';
import { Button } from './Button';
import { RhythmNotation } from './RhythmNotation';

export function PointTip({ point, color, instrument, label, onMore }: {
  point: LessonPoint; color: string; instrument: Instrument; label: string; onMore: () => void;
}) {
  const first = point.steps[0];
  const example = point.steps.find((s) => s.example)?.example;
  const notation = point.steps.find((s) => s.notation)?.notation;
  return (
    <View style={[styles.box, { borderColor: color }]} accessibilityLabel={`${label} : ${point.title}`}>
      <Text style={[styles.label, { color }]}>{label} · {point.title}</Text>
      <Text style={type.body}>{first.text}</Text>
      {notation ? <RhythmNotation items={notation} /> : null}
      <View style={styles.try}>
        <Text style={[styles.tryHead, { color }]}>Essaie</Text>
        <Text style={type.body}>{point.astuce}</Text>
      </View>
      <View style={styles.row}>
        {example ? (
          <Button small variant="contour" color={color} label={`▶ ${example.label}`}
            onPress={() => { audio.init().then(() => audio.play(example.notes, { tempo: example.tempo, instrument })); }} />
        ) : null}
        {point.steps.length > 1 ? <Button small variant="texte" color={color} label="En savoir plus" onPress={onMore} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, borderRadius: 18, padding: 14, gap: 8, backgroundColor: colors.card },
  label: { fontWeight: '900', fontSize: 13 },
  try: { backgroundColor: colors.hintBg, borderRadius: 12, padding: 10, gap: 2 },
  tryHead: { fontWeight: '900', fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
