import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors } from '../theme';

interface Props { label: string; onPress: () => void; color?: string; variant?: 'plein' | 'contour' | 'texte'; disabled?: boolean; style?: ViewStyle; small?: boolean;
  /** nom lu par VoiceOver quand le texte affiché ne suffit pas (ex. « ▶ ») */
  accessibilityLabel?: string }

export function Button({ label, onPress, color = colors.primary, variant = 'plein', disabled, style, small, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base, small && styles.small,
        variant === 'plein' && { backgroundColor: color },
        variant === 'contour' && { borderWidth: 2, borderColor: color },
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <Text style={[styles.label, small && { fontSize: 14 }, { color: variant === 'plein' ? colors.onFill : color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // retour bêta : un libellé long passe à la ligne au lieu de dépasser du cadre
  base: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center', maxWidth: '100%', flexShrink: 1 },
  small: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, minHeight: 44 },
  label: { fontSize: 16, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
});
