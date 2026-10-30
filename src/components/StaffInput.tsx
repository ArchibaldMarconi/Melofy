// Portée tactile : toucher place une note à la hauteur touchée (ligne ou interligne la plus proche).
// ▲ ▼ ajustent la dernière note d'un cran (un doigt n'est pas assez précis pour viser un interligne), ⌫ l'efface.
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, Line } from 'react-native-svg';
import { staffStep, stepToMidi } from '../engine/music';
import { colors } from '../theme';
import { Button } from './Button';
import { TrebleClef } from './TrebleClef';

const GAP = 20; // interligne
const MIN_STEP = -4; // sol3
const MAX_STEP = 12; // do6
const TOP = 16;
const H = TOP * 2 + ((MAX_STEP - MIN_STEP) * GAP) / 2;
const y = (step: number) => TOP + ((MAX_STEP - step) * GAP) / 2;

/** positions de la portée décrites sans nom de note (du grave à l'aigu) */
const POSITIONS: [number, string][] = [
  [-2, 'petite ligne sous la portée'], [-1, 'juste sous la 1re ligne'],
  [0, '1re ligne'], [1, '1er interligne'], [2, '2e ligne'], [3, '2e interligne'], [4, '3e ligne'],
  [5, '3e interligne'], [6, '4e ligne'], [7, '4e interligne'], [8, '5e ligne'],
  [9, 'juste au-dessus de la 5e ligne'], [10, 'petite ligne au-dessus'],
];

export function StaffInput({ notes, given = [], onChange, color, wrongIndexes = [] }: {
  notes: number[]; given?: number[]; onChange: (midis: number[]) => void; color: string; wrongIndexes?: number[];
}) {
  const all = [...given, ...notes];
  // saisie par boutons : pour VoiceOver (on ne vise pas une hauteur sans la voir) et pour les doigts imprécis.
  // Les libellés décrivent la POSITION, jamais le nom : sinon « écris un fa » donnerait la réponse.
  const [buttons, setButtons] = useState(false);
  // sur le web, isScreenReaderEnabled n'est pas fiable (répond toujours oui) : activation automatique sur mobile seulement
  useEffect(() => { if (Platform.OS === 'web') return; AccessibilityInfo.isScreenReaderEnabled?.().then((on) => { if (on) setButtons(true); }).catch(() => undefined); }, []);
  const add = (locY: number) => {
    const step = Math.max(MIN_STEP, Math.min(MAX_STEP, Math.round(MAX_STEP - ((locY - TOP) * 2) / GAP)));
    onChange([...notes, stepToMidi(step)]);
  };
  const nudge = (d: number) => {
    if (!notes.length) return;
    const last = notes[notes.length - 1];
    const st = Math.max(MIN_STEP, Math.min(MAX_STEP, staffStep(last) + d));
    onChange([...notes.slice(0, -1), stepToMidi(st)]);
  };
  const W = 340;
  const x0 = 118; // à droite de la clé de sol
  const dx = Math.min(46, (W - x0 - 20) / Math.max(1, all.length));
  return (
    <View style={{ gap: 8 }}>
      <View
        style={styles.staff}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => add(e.nativeEvent.locationY)}
        accessibilityRole="adjustable"
        accessibilityLabel={`Portée : ${all.length} note${all.length > 1 ? 's' : ''} écrite${all.length > 1 ? 's' : ''}. Touche à la hauteur voulue pour ajouter une note.`}
      >
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} pointerEvents="none">
          {[0, 2, 4, 6, 8].map((st) => <Line key={st} x1={6} y1={y(st)} x2={W - 6} y2={y(st)} stroke={colors.inkSoft} strokeWidth={1.5} />)}
          <TrebleClef x={32} gLineY={y(2)} gap={GAP} color={colors.ink} />
          {all.map((m, i) => {
            const st = staffStep(m);
            const cx = x0 + i * dx;
            const isGiven = i < given.length;
            const c = isGiven ? colors.inkSoft : wrongIndexes.includes(i) ? colors.danger : color;
            const ledgers: number[] = [];
            for (let l = -2; l >= st; l -= 2) ledgers.push(l);
            for (let l = 10; l <= st; l += 2) ledgers.push(l);
            return (
              <React.Fragment key={i}>
                {ledgers.map((l) => <Line key={l} x1={cx - 16} y1={y(l)} x2={cx + 16} y2={y(l)} stroke={colors.inkSoft} strokeWidth={1.5} />)}
                <Ellipse cx={cx} cy={y(st)} rx={11} ry={8} fill={c} transform={`rotate(-20 ${cx} ${y(st)})`} />
                <Line x1={st >= 4 ? cx - 10 : cx + 10} y1={y(st)} x2={st >= 4 ? cx - 10 : cx + 10} y2={st >= 4 ? y(st) + 52 : y(st) - 52} stroke={c} strokeWidth={2} />
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
      {buttons ? (
        <View style={styles.grid}>
          {POSITIONS.map(([st, label]) => (
            <Button key={st} small variant="contour" color={color} label={label} onPress={() => onChange([...notes, stepToMidi(st)])} style={styles.posBtn} />
          ))}
        </View>
      ) : null}
      <Button small variant="texte" color={color} label={buttons ? 'Masquer la saisie par boutons' : 'Saisie par boutons (position sur la portée)'} onPress={() => setButtons((b) => !b)} />
      <View style={styles.row}>
        <Button small variant="contour" color={color} label="▲" onPress={() => nudge(1)} disabled={!notes.length} />
        <Button small variant="contour" color={color} label="▼" onPress={() => nudge(-1)} disabled={!notes.length} />
        <Text style={styles.count}>{notes.length} note{notes.length > 1 ? 's' : ''} écrite{notes.length > 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  staff: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  count: { color: colors.inkSoft, marginLeft: 'auto' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  posBtn: { flexGrow: 1 },
  toggle: { fontWeight: '700', fontSize: 13 },
});
