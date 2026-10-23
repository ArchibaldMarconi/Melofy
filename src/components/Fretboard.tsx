// Manche à l'écran : 6 cordes (mi grave en bas, comme vu par le guitariste), cases 0 à N.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Hit } from './Hit';
import { colors } from '../theme';
import { midiDegreeLabel, noteName } from '../engine/music';
import { useTuning } from '../tuning';
import { useUserStore } from '../store/useUserStore';

export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64];

interface Props {
  frets?: number;
  tonic?: number;
  labels?: 'aucun' | 'degres' | 'notes';
  highlights?: Record<number, string>;
  onPress: (midi: number) => void;
  disabled?: boolean;
  /** repères de tonique (inutiles et trompeurs quand l'exercice n'est pas en degrés) */
  showTonic?: boolean;
  /** positions précises à marquer (corde 0 = mi grave), prioritaires sur les surlignages par note */
  marks?: { string: number; fret: number; color: string; midi?: number; label?: string }[];
  /** 1re case affichée (fenêtre du manche) */
  startFret?: number;
  /** zone surlignée (niveau 3 de « retrouver la note ») : cordes et cases incluses */
  zone?: { strings: [number, number]; frets: [number, number] };
  /** appelé avec la position précise touchée */
  onPressPos?: (pos: { string: number; fret: number; midi: number }) => void;
}

export function Fretboard({ frets = 7, tonic = 45, labels = 'degres', highlights = {}, onPress, disabled, showTonic = true, marks, startFret = 0, zone, onPressPos }: Props) {
  const tuning = useTuning();
  const lefty = useUserStore((st) => !!st.settings.lefty);
  const strings = [...tuning].reverse(); // corde aiguë en haut
  // gaucher : le manche est vu en miroir (le sillet à droite)
  const fretList = Array.from({ length: frets + 1 }, (_, k) => startFret + k);
  const cols = lefty ? [...fretList].reverse() : fretList;
  return (
    <View style={styles.wrap} role="group" accessibilityLabel="Manche de guitare">
      <View style={styles.header}>
        {cols.map((f) => (
          <Text key={f} style={[styles.fretNum, f === 0 && styles.nut]}>{f}</Text>
        ))}
      </View>
      {strings.map((open, s) => (
        <View key={s} style={styles.string}>
          {/* corde aiguë (en haut) la plus fine, corde grave (en bas) la plus épaisse */}
          <View style={[styles.wire, { height: 1 + s * 0.45 }]} />
          {cols.map((f) => {
            const m = open + f;
            const stringIdx = 5 - s; // 0 = corde grave
            const inZone = zone && stringIdx >= zone.strings[0] && stringIdx <= zone.strings[1] && f >= zone.frets[0] && f <= zone.frets[1];
            const mk = marks?.find((k) => k.string === stringIdx && k.fret === f);
            // la même note ailleurs sur le manche reste masquée si une position précise la marque (fondamentale unique)
            const suppressed = !mk && marks?.some((k) => k.midi === m);
            // une note jouée ou sélectionnée reste visible par-dessus un point du guide
            const hl = mk ? (highlights[m] ?? mk.color) : suppressed ? undefined : highlights[m];
            return (
              <Hit key={f} disabled={disabled} onDown={() => { onPress(m); onPressPos?.({ string: stringIdx, fret: f, midi: m }); }}
                style={[styles.cell, f === 0 && (lefty ? styles.nutCellLefty : styles.nutCell), inZone && styles.zoneCell]} label={`${noteName(m)} corde ${s + 1} case ${f}`} /* convention des guitaristes : corde 1 = la plus aiguë */>
                <View style={[styles.dot, hl ? { backgroundColor: hl } : showTonic && m % 12 === tonic % 12 ? styles.tonicDot : null]}>
                  {mk?.label ? <Text style={styles.dotText}>{mk.label}</Text> : labels !== 'aucun' && (hl || (showTonic && m % 12 === tonic % 12)) ? (
                    <Text style={styles.dotText}>{labels === 'degres' ? midiDegreeLabel(tonic, m) : noteName(m).replace(/\d/, '')}</Text>
                  ) : null}
                </View>
              </Hit>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#3A2C24', borderRadius: 10, paddingVertical: 6 },
  header: { flexDirection: 'row' },
  fretNum: { flex: 1, textAlign: 'center', color: '#D8C9B8', fontSize: 11 },
  nut: { fontWeight: '800' },
  string: { flexDirection: 'row', height: 38, alignItems: 'center' }, // compact : la portée et le manche tiennent ensemble à l'écran
  wire: { position: 'absolute', left: 0, right: 0, backgroundColor: '#D9D2C5' },
  cell: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', borderRightWidth: 2, borderRightColor: '#8C7B6B' },
  nutCell: { borderRightWidth: 5, borderRightColor: '#EFE6D8' },
  nutCellLefty: { borderLeftWidth: 5, borderLeftColor: '#EFE6D8' },
  zoneCell: { backgroundColor: 'rgba(232,185,58,0.22)' },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tonicDot: { backgroundColor: 'rgba(255,255,255,0.18)' },
  dotText: { color: colors.onFill, fontSize: 11, fontWeight: '800' },
});
