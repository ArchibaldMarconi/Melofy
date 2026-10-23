// Aiguille de justesse. Sans cible : écart à la note la plus proche.
// Avec cible : écart à la note visée (à l'octave près), et la consigne « monte / descends ».
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { noteName } from '../engine/music';

/** écart en cents à la cible, ramené dans [−600, 600] (octave indifférente) */
export function centsToTarget(midi: number, target: number): number {
  const d = (((midi - target) % 12) + 18) % 12 - 6;
  return d * 100;
}

export function PitchMeter({ midi, tolCents = 50, target, hold }: { midi: number | null; tolCents?: number; target?: number; hold?: number }) {
  const nearest = midi === null ? null : Math.round(midi);
  const cents = midi === null ? 0 : target !== undefined ? centsToTarget(midi, target) : (midi - nearest!) * 100;
  const ok = midi !== null && Math.abs(cents) <= tolCents;
  // échelle : ±100 cents sur la largeur ; au-delà, l'aiguille reste en butée
  const pos = 50 + Math.max(-100, Math.min(100, cents)) / 2;
  const advice = midi === null ? (target !== undefined ? `Vise ${noteName(target).replace(/\d/, '')}` : 'Chante ou joue une note')
    : ok ? (target !== undefined ? 'Juste : tiens-la !' : `${Math.round(cents)} cents`)
    : target !== undefined ? `${cents < 0 ? 'Monte' : 'Descends'}${Math.abs(cents) <= 150 ? ' un peu' : ''}` : `${cents > 0 ? '+' : ''}${Math.round(cents)} cents`;
  return (
    <View style={styles.wrap} role="status" accessibilityLabel={midi === null ? 'Aucun son' : `${noteName(nearest!)}, ${advice}`} accessibilityLiveRegion="polite">
      <Text style={styles.note}>{nearest === null ? '…' : noteName(nearest).replace(/\d/, '')}</Text>
      <View style={styles.track}>
        <View style={[styles.zone, { width: `${tolCents}%`, left: `${50 - tolCents / 2}%` }]} />
        <View style={styles.center} />
        {midi !== null ? <View style={[styles.needle, { left: `${pos}%`, backgroundColor: ok ? colors.success : colors.warn }]} /> : null}
      </View>
      <Text style={[styles.advice, ok && { color: colors.success }]}>{advice}</Text>
      {hold !== undefined ? (
        <View style={styles.holdTrack}><View style={[styles.holdFill, { width: `${Math.min(100, hold * 100)}%` }]} /></View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 12, gap: 6 },
  note: { fontSize: 40, fontWeight: '900', color: colors.ink },
  track: { width: '85%', height: 16, borderRadius: 8, backgroundColor: colors.line },
  zone: { position: 'absolute', height: '100%', backgroundColor: colors.successBg, borderRadius: 8 },
  center: { position: 'absolute', left: '50%', width: 2, marginLeft: -1, height: '100%', backgroundColor: colors.success },
  needle: { position: 'absolute', width: 6, height: 26, top: -5, borderRadius: 3, marginLeft: -3 },
  advice: { color: colors.inkSoft, fontWeight: '700', fontSize: 16 },
  holdTrack: { width: '60%', height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  holdFill: { height: '100%', backgroundColor: colors.success },
});
