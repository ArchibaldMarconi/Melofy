// « Voir … / Masquer … » : un libellé et un chevron fixe, vers le bas (fermé) ou vers le haut (ouvert). C'est le
// contenu dévoilé qui s'anime, pas le bouton.
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';
import { Chevron } from './Chevron';

export function Disclosure({ open, label, openLabel, onPress }: { open: boolean; label: string; openLabel: string; onPress: () => void }) {
  const text = open ? openLabel : label;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ expanded: open }} style={styles.disclosure}>
      <Text style={styles.text}>{text}</Text>
      <Chevron dir={open ? 'up' : 'down'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disclosure: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12, minHeight: 44 },
  text: { fontSize: 14, fontWeight: '800', color: colors.inkSoft },
});
