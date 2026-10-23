// Clavier à l'écran : 2 octaves, degrés ou noms de notes, surlignage (aide, correction), mode sélection.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Hit } from './Hit';
import { colors } from '../theme';
import { midiDegreeLabel, noteName } from '../engine/music';

interface Props {
  startMidi?: number;
  octaves?: number;
  tonic?: number;
  labels?: 'aucun' | 'degres' | 'notes';
  highlights?: Record<number, string>;
  onPress: (midi: number) => void;
  disabled?: boolean;
  showTonic?: boolean;
  /** libellés des touches noires (altérations) : masqués tant qu'elles n'ont pas été vues */
  blackLabels?: boolean;
}

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER: Record<number, number> = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 };

export function Piano({ startMidi = 60, octaves = 2, tonic = 60, labels = 'degres', highlights = {}, onPress, disabled, showTonic = true, blackLabels = true }: Props) {
  const [w, setW] = useState(0);
  const whites: number[] = [];
  for (let o = 0; o < octaves; o++) WHITE_PCS.forEach((pc) => whites.push(startMidi + o * 12 + pc));
  whites.push(startMidi + octaves * 12);
  const kw = w / whites.length;
  const label = (m: number) => (labels === 'degres' ? midiDegreeLabel(tonic, m) : labels === 'notes' ? noteName(m).replace(/\d/, '') : '');

  return (
    <View style={styles.wrap} onLayout={(e) => setW(e.nativeEvent.layout.width)} role="group" accessibilityLabel="Clavier">
      <View style={styles.row}>
        {whites.map((m) => (
          <Hit
            key={m}
            disabled={disabled}
            onDown={() => onPress(m)}
            label={noteName(m)}
            style={[styles.white, { width: kw }, highlights[m] ? { backgroundColor: highlights[m] } : null, showTonic && m === tonic && !highlights[m] ? styles.tonic : null]}
          >
            <Text style={[styles.wlabel, highlights[m] ? { color: '#FFFFFF' } : null]}>{label(m)}</Text>
          </Hit>
        ))}
      </View>
      {whites.slice(0, -1).map((m, i) => {
        const pc = (m - startMidi + 1200) % 12;
        const b = BLACK_AFTER[pc];
        if (b === undefined) return null;
        const bm = m + 1;
        return (
          <Hit
            key={bm}
            disabled={disabled}
            onDown={() => onPress(bm)}
            label={noteName(bm)}
            style={[styles.black, { left: kw * (i + 1) - kw * 0.3, width: kw * 0.6 }, highlights[bm] ? { backgroundColor: highlights[bm] } : null]}
          >
            <Text style={styles.blabel}>{labels === 'degres' && blackLabels ? label(bm) : ''}</Text>
          </Hit>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 150, width: '100%' },
  row: { flexDirection: 'row', height: '100%' },
  white: { height: '100%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.staff, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 8 },
  tonic: { backgroundColor: colors.keyTonic },
  black: { position: 'absolute', top: 0, height: '60%', backgroundColor: '#211A45', borderBottomLeftRadius: 5, borderBottomRightRadius: 5, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, zIndex: 2 },
  wlabel: { fontSize: 12, fontWeight: '700', color: '#6A6389' },
  blabel: { fontSize: 10, color: colors.keyLabel },
});
