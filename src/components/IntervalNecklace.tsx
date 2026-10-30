// Collier d'intervalles : une perle par demi-ton, rangées comme les heures d'une horloge (l'octave en haut, le triton
// en bas). Les intervalles en jeu sont de grosses perles à toucher ; les autres restent de petits grains sur le fil,
// pour que la distance se voie : plus l'intervalle est grand, plus on tourne.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { INTERVAL_SHORT } from '../drills/engine';
import { colors } from '../theme';

const PEARL = 56;
const GRAIN = 12;
const MAX = 340;

export function IntervalNecklace({ choices, color, picked, pickedColor, correct, disabled, caption, onPick }: {
  /** une réponse par intervalle : id = nombre de demi-tons (1 à 12) */
  choices: { id: string; label: string }[];
  color: string;
  /** dernière réponse donnée, et sa couleur (réussite ou erreur) */
  picked?: string; pickedColor?: string;
  /** bonne réponse montrée après une erreur : les autres perles passent en retrait */
  correct?: string;
  disabled?: boolean;
  /** texte au centre du collier */
  caption: string;
  onPick: (id: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const byStep = new Map(choices.map((c) => [Number(c.id), c]));
  const D = Math.min(width, MAX);
  const R = (D - PEARL) / 2;
  // k demi-tons : à k heures
  const at = (k: number) => {
    const a = ((k * 30 - 90) * Math.PI) / 180;
    return { x: D / 2 + R * Math.cos(a), y: D / 2 + R * Math.sin(a) };
  };
  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {D > 0 ? (
        <View style={{ width: D, height: D }}>
          <View style={[styles.thread, { left: PEARL / 2, top: PEARL / 2, width: 2 * R, height: 2 * R, borderRadius: R }]} />
          <View style={[styles.center, { left: PEARL, top: PEARL, width: D - 2 * PEARL, height: D - 2 * PEARL }]} pointerEvents="none">
            <Text style={styles.caption} accessibilityLiveRegion="polite">{caption}</Text>
          </View>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((k) => {
            const { x, y } = at(k);
            const c = byStep.get(k);
            if (!c) return <View key={k} style={[styles.grain, { left: x - GRAIN / 2, top: y - GRAIN / 2 }]} />;
            const mine = picked === c.id;
            const good = correct === c.id;
            const fill = good ? colors.success : mine ? pickedColor ?? color : correct ? 'transparent' : color;
            const ink = fill === 'transparent' ? color : colors.onFill;
            return (
              <Pressable key={k} onPress={() => !disabled && onPick(c.id)} disabled={disabled}
                accessibilityRole="button" accessibilityLabel={c.label} accessibilityState={{ disabled: !!disabled, selected: mine || good }}
                style={({ pressed }) => [styles.pearl, { left: x - PEARL / 2, top: y - PEARL / 2, backgroundColor: fill, borderColor: good ? colors.success : mine ? pickedColor ?? color : color }, pressed && { opacity: 0.8 }]}>
                <Text style={[styles.short, INTERVAL_SHORT[k].length > 3 && styles.long, { color: ink }]} numberOfLines={1}>{INTERVAL_SHORT[k]}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center' },
  thread: { position: 'absolute', borderWidth: 2, borderColor: colors.line },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center', padding: 8 },
  caption: { fontSize: 15, fontWeight: '700', color: colors.inkSoft, textAlign: 'center' },
  grain: { position: 'absolute', width: GRAIN, height: GRAIN, borderRadius: GRAIN / 2, backgroundColor: colors.staff },
  pearl: { position: 'absolute', width: PEARL, height: PEARL, borderRadius: PEARL / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  short: { fontSize: 15, fontWeight: '800' },
  long: { fontSize: 12 },
});
