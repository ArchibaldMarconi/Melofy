// Bouton « lecture » : sous le doigt il s'enfonce et son ▶ avance, prêt à partir (Reanimated, fil de l'interface).
// Trois tons : clair (posé sur une carte violette), plein (violet, posé sur une carte claire), contour (action secondaire).
// Grand et moyen : coins de rayon `play` (concentriques à la carte qui les porte) ; petit : capsule.
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { colors, curve, radius } from '../theme';
import { AnimatedPressable, usePress } from './motion';

type Tone = 'clair' | 'plein' | 'contour';
const INK: Record<Tone, string> = { clair: colors.ink, plein: colors.onPrimary, contour: colors.primary };

export function PlayButton({ label, onPress, disabled, size = 'moyen', tone = 'clair', accessibilityLabel }: {
  label: string; onPress: () => void; disabled?: boolean; size?: 'grand' | 'moyen' | 'petit'; tone?: Tone; accessibilityLabel?: string;
}) {
  const { p, onPressIn, onPressOut } = usePress();
  const sink = useAnimatedStyle(() => ({ transform: [{ scale: 1 - (size === 'petit' ? 0.06 : 0.04) * p.get() }] }));
  const push = useAnimatedStyle(() => ({ transform: [{ translateX: (size === 'petit' ? 4 : 6) * p.get() }] }));
  const text = [styles.text, styles[size], { color: INK[tone] }];
  return (
    <AnimatedPressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.btn, styles[`${size}Btn`], styles[tone], disabled && { opacity: 0.5 }, sink]}>
      <Animated.Text style={[...text, push]}>▶</Animated.Text>
      <Text style={[...text, { flexShrink: 1 }]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, ...curve },
  grandBtn: { minHeight: 84, borderRadius: radius.play },
  moyenBtn: { minHeight: 64, borderRadius: radius.play },
  petitBtn: { minHeight: 44, borderRadius: radius.capsule, alignSelf: 'flex-start', paddingHorizontal: 18, gap: 8 },
  clair: { backgroundColor: colors.card },
  plein: { backgroundColor: colors.primary },
  contour: { borderWidth: 2, borderColor: colors.primary },
  text: { fontWeight: '900' },
  grand: { fontSize: 24 },
  moyen: { fontSize: 19 },
  petit: { fontSize: 15 },
});
