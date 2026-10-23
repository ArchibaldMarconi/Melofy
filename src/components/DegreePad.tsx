// Pavé de degrés pour la dictée et la transcription (degrés + altérations + durées).
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DegreeItem } from '../content/types';
import { degreeLabel } from '../engine/music';
import { colors } from '../theme';

interface Props { items: DegreeItem[]; onChange: (items: DegreeItem[]) => void; withDurations?: boolean; wrongIndexes?: number[]; color: string; names?: string[] }

const DURS = [{ v: 0.5, l: 'croche' }, { v: 1, l: 'noire' }, { v: 2, l: 'blanche' }];

export function DegreePad({ items, onChange, withDurations, wrongIndexes = [], color, names }: Props) {
  const [acc, setAcc] = useState<-1 | 0 | 1>(0);
  const [dur, setDur] = useState(1);
  const long = !!names && names.some((n) => n.length > 3);
  const add = (d: number) => { onChange([...items, { degree: d, acc, dur: withDurations ? dur : 1 }]); setAcc(0); };
  return (
    <View>
      <View style={styles.answer} accessibilityLabel="Ta réponse">
        {items.length === 0 ? <Text style={styles.placeholder}>{names?.[0] === 'I' ? 'Touche les accords dans l\'ordre' : names ? 'Touche les noms dans l\'ordre' : 'Touche les degrés dans l\'ordre'}</Text> : null}
        {items.map((it, i) => (
          <View key={i} style={[styles.chip, { borderColor: wrongIndexes.includes(i) ? colors.danger : color }]}>
            <Text style={styles.chipText}>{names ? names[((it.degree - 1) % 7 + 7) % 7] : degreeLabel(it)}</Text>
            {withDurations ? <Text style={styles.chipDur}>{DURS.find((d) => d.v === it.dur)?.l}</Text> : null}
          </View>
        ))}
      </View>
      {withDurations ? (
        <View style={styles.row}>
          {DURS.map((d) => (
            <Pressable key={d.v} onPress={() => setDur(d.v)} style={[styles.opt, dur === d.v && { backgroundColor: color }]}>
              <Text style={[styles.optText, dur === d.v && { color: colors.onFill }]}>{d.l}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.row}>
        {(names ? [] : ([-1, 0, 1] as const)).map((a) => (
          <Pressable key={a} onPress={() => setAcc(a)} style={[styles.opt, acc === a && { backgroundColor: color }]}>
            <Text style={[styles.optText, acc === a && { color: colors.onFill }]}>{a === -1 ? 'b' : a === 1 ? '#' : '♮'}</Text>
          </Pressable>
        ))}
      </View>
      {/* noms longs (IVmaj7, vi7…) : 4 + 3 touches sur deux lignes pour que rien ne soit coupé */}
      <View style={[styles.row, long && styles.wrap]}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <Pressable key={d} onPress={() => add(d)} style={[styles.key, long && styles.keyWide, { backgroundColor: color }]} accessibilityLabel={names ? names[d - 1] : `Degré ${d}`}>
            <Text style={[styles.keyText, names && { fontSize: long ? 17 : 15 }]} numberOfLines={1} adjustsFontSizeToFit>{names ? names[d - 1] : d}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  answer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 56, padding: 10, backgroundColor: colors.card, borderRadius: 14, marginBottom: 12, alignItems: 'center' },
  placeholder: { color: colors.inkSoft },
  chip: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  chipText: { fontSize: 18, fontWeight: '800', color: colors.ink },
  chipDur: { fontSize: 10, color: colors.inkSoft },
  row: { flexDirection: 'row', gap: 6, marginBottom: 8, justifyContent: 'center' },
  opt: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.line },
  optText: { fontWeight: '700', color: colors.ink },
  key: { flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexWrap: 'wrap' },
  keyWide: { flex: 0, flexBasis: '23%', flexGrow: 1 },
  keyText: { color: colors.onFill, fontSize: 20, fontWeight: '800' },
});
