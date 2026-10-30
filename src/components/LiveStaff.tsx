// Portée en direct (retour bêta) : ce que l'élève joue s'écrit en clé de sol, note après note,
// au piano comme à la guitare (la guitare s'écrit une octave au-dessus du son réel) ; en tablature si choisie.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Instrument } from '../content/types';
import { pcName } from '../engine/music';
import { colors } from '../theme';
import { Staff, Tab } from './DisplayView';

const MAX = 6;

export function LiveStaff({ midis, instrument, tab, color }: { midis: number[]; instrument: Instrument; tab: boolean; color: string }) {
  const written = midis.slice(-MAX).map((m) => Math.round(m) + (instrument === 'guitare' ? 12 : 0));
  return (
    <View style={styles.box}>
      <Text style={styles.label}>{tab && instrument === 'guitare' ? 'Tablature en direct' : 'Portée en direct'}</Text>
      {written.length ? (
        tab && instrument === 'guitare'
          ? <Tab midis={written} color={color} />
          : <Staff midis={written} color={color} label={`Notes jouées : ${midis.slice(-MAX).map((m) => pcName(m)).join(', ')}`} />
      ) : <Text style={styles.empty}>{'Joue : tes notes s\'écrivent ici.'}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  // hauteur fixe : la première note jouée ne doit pas faire bouger le clavier ou le manche en dessous
  box: { backgroundColor: colors.card, borderRadius: 16, paddingVertical: 2, paddingHorizontal: 10, height: 156, justifyContent: 'center', overflow: 'hidden' },
  label: { fontSize: 11, fontWeight: '800', color: colors.inkSoft },
  empty: { color: colors.inkSoft, textAlign: 'center', paddingVertical: 14 },
});
