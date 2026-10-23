// Confirmation dans la page (Alert ne fonctionne pas sur le web).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../theme';
import { Button } from './Button';

export function ConfirmBar({ text, confirmLabel, cancelLabel = 'Annuler', danger, onConfirm, onCancel }: {
  text: string; confirmLabel: string; cancelLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <View style={styles.bar} accessibilityRole="alert">
      <Text style={type.body}>{text}</Text>
      <View style={styles.row}>
        <Button small variant="contour" color={colors.inkSoft} label={cancelLabel} onPress={onCancel} />
        <Button small color={danger ? colors.danger : colors.ink} label={confirmLabel} onPress={onConfirm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 10, margin: 12, borderWidth: 2, borderColor: colors.line },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
