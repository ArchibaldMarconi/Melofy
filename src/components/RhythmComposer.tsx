// Écrire un rythme : on touche les figures dans l'ordre, la partition se construit et les temps se comptent.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RhythmSymbol } from '../content/types';
import { colors } from '../theme';
import { Button } from './Button';
import { FigureGlyph, RhythmNotation } from './RhythmNotation';

const FIGS: { s: RhythmSymbol; label: string; beats: number }[] = [
  { s: 'noire', label: 'noire', beats: 1 }, { s: 'blanche', label: 'blanche', beats: 2 },
  { s: 'soupir', label: 'soupir', beats: 1 }, { s: 'croches', label: '2 croches', beats: 1 },
  { s: 'doubles', label: '4 doubles', beats: 1 }, { s: 'syncope', label: 'syncope', beats: 2 },
  { s: 'triolet', label: 'triolet', beats: 1 },
];
export const beatsOf = (items: RhythmSymbol[]) => items.reduce((a, s) => a + (s === 'blanche' || s === 'syncope' ? 2 : 1), 0);

export function RhythmComposer({ items, onChange, color, total, figures, wrongIndexes = [] }: {
  items: RhythmSymbol[]; onChange: (items: RhythmSymbol[]) => void; color: string; total: number; figures: RhythmSymbol[]; wrongIndexes?: number[];
}) {
  const used = beatsOf(items);
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.score} accessibilityLabel={`Ton rythme : ${items.join(', ') || 'vide'}`}>
        {items.length ? <RhythmNotation items={items} highlight={wrongIndexes} /> : <Text style={styles.placeholder}>Touche les figures dans l'ordre</Text>}
      </View>
      <Text style={[styles.count, used > total && { color: colors.danger }]}>{used} / {total} temps écrits</Text>
      <View style={styles.row}>
        {FIGS.filter((f) => figures.includes(f.s)).map((f) => (
          <Pressable key={f.s} onPress={() => onChange([...items, f.s])} style={[styles.fig, { borderColor: color }]} accessibilityRole="button" accessibilityLabel={f.label}>
            <FigureGlyph figure={f.s} size={48} />
            <Text style={[styles.figLabel, { color }]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  score: { backgroundColor: colors.card, borderRadius: 16, minHeight: 72, justifyContent: 'center', padding: 6 },
  placeholder: { color: colors.inkSoft, textAlign: 'center' },
  count: { color: colors.inkSoft, textAlign: 'center', fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  fig: { width: 76, alignItems: 'center', borderWidth: 2, borderRadius: 14, paddingVertical: 4, backgroundColor: colors.card },
  figLabel: { fontSize: 12, fontWeight: '800' },
});
