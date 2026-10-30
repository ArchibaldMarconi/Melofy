// Grande zone de frappe pour les exercices de rythme.
// Responder brut (pas Pressable) : l'appui est horodaté immédiatement, même pour des frappes très brèves.
import React, { useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export function TapPad({ onTap, color, label = 'Tape ici', disabled }: { onTap: () => void; color: string; label?: string; disabled?: boolean }) {
  const [scale] = useState(() => new Animated.Value(1));
  const hit = () => {
    if (disabled) return;
    onTap();
    scale.setValue(0.93);
    Animated.spring(scale, { toValue: 1, useNativeDriver: false, speed: 40 }).start();
  };
  return (
    <Animated.View
      accessibilityRole="button"
      accessibilityLabel={label}
      onStartShouldSetResponder={() => true}
      onResponderGrant={hit}
      style={[styles.pad, { backgroundColor: color, transform: [{ scale }], opacity: disabled ? 0.4 : 1 }]}
    >
      <Text style={styles.text} selectable={false}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pad: { height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', marginHorizontal: 30 },
  text: { color: colors.onFill, fontSize: 22, fontWeight: '800' },
});
