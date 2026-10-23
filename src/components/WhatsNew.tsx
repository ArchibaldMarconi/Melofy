// « Nouveautés » : affiché une fois après une mise à jour, pour que les testeurs sachent quoi essayer
// (et ne signalent pas ce qui est déjà corrigé). Réouvrable depuis Profil.
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Release } from '../version';
import { colors, type } from '../theme';
import { Button } from './Button';

export function WhatsNew({ releases, onClose }: { releases: Release[]; onClose: () => void }) {
  if (!releases.length) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.kicker}>Mise à jour</Text>
          <Text style={type.title}>Quoi de neuf dans Melofy {releases[0].version}</Text>
          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 14 }}>
            {releases.map((r) => (
              <View key={r.version} style={{ gap: 6 }}>
                {releases.length > 1 ? <Text style={styles.version}>Version {r.version}</Text> : null}
                {r.notes.map((n, i) => <Text key={i} style={type.body}>• {n}</Text>)}
              </View>
            ))}
          </ScrollView>
          <Text style={type.small}>Un souci ou une idée ? Le bouton « 💬 Donner un retour » est en haut de chaque exercice.</Text>
          <Button label="C'est parti" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,17,42,0.55)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 22, gap: 12 },
  kicker: { color: colors.accent, fontWeight: '900', fontSize: 13 },
  version: { fontWeight: '900', color: colors.inkSoft },
});
