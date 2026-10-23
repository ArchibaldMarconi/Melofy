// Retour visuel sur le rythme : les temps attendus (traits) et tes frappes (points),
// vert dans la tolérance, orange proche, rouge hors cible. On voit si on se presse ou si on traîne.
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

export function RhythmTimeline({ expectedMs, tapsMs, tolMs }: { expectedMs: number[]; tapsMs: number[]; tolMs: number }) {
  if (!expectedMs.length) return null;
  const end = Math.max(...expectedMs, ...tapsMs, 1) + 300;
  const W = 340;
  const x = (ms: number) => 10 + (Math.max(0, ms) / end) * (W - 20);
  const nearest = (t: number) => Math.min(...expectedMs.map((e) => Math.abs(e - t)));
  const mean = tapsMs.length ? tapsMs.reduce((s, t) => {
    const e = expectedMs.reduce((b, v) => (Math.abs(v - t) < Math.abs(b - t) ? v : b), expectedMs[0]);
    return s + (t - e);
  }, 0) / tapsMs.length : 0;
  const tendency = Math.abs(mean) < tolMs / 2 ? 'Bien centré' : mean < 0 ? 'Tu te presses' : 'Tu traînes';
  return (
    <View role="img" accessibilityLabel={`Frise rythmique : ${tendency}`}>
      <Svg width="100%" height={64} viewBox={`0 0 ${W} 64`}>
        <Line x1={10} y1={30} x2={W - 10} y2={30} stroke={colors.line} strokeWidth={2} />
        {expectedMs.map((e, i) => <Line key={`e${i}`} x1={x(e)} y1={16} x2={x(e)} y2={44} stroke={colors.inkSoft} strokeWidth={2} />)}
        {tapsMs.map((t, i) => {
          const d = nearest(t);
          const c = d <= tolMs ? colors.success : d <= tolMs * 2 ? colors.warn : colors.danger;
          return <Circle key={`t${i}`} cx={x(t)} cy={30} r={6} fill={c} />;
        })}
        <SvgText x={10} y={60} fontSize={11} fill={colors.inkSoft}>│ attendu   ● ta frappe   · {tendency}</SvgText>
      </Svg>
    </View>
  );
}
