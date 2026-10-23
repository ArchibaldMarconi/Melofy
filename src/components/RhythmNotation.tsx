// Notation rythmique dessinée (noire, blanche, soupir, croches) : pas de dépendance aux polices musicales.
import React from 'react';
import { View } from 'react-native';
import Svg, { Text as SvgText, Ellipse, Line, Path } from 'react-native-svg';
import type { RhythmSymbol } from '../content/types';
import { colors } from '../theme';

function Glyph({ s, x, active }: { s: RhythmSymbol; x: number; active?: boolean }) {
  const c = active ? colors.danger : colors.ink;
  if (s === 'soupir') return <Path d={`M${x + 6} 18 l8 10 l-7 8 l8 10 q-10 -4 -6 6`} stroke={c} strokeWidth={3} fill="none" />;
  const head = (hx: number) => (
    <>
      <Ellipse cx={hx} cy={44} rx={8} ry={6} fill={s === 'blanche' ? 'none' : c} stroke={c} strokeWidth={2.5} transform={`rotate(-20 ${hx} 44)`} />
      <Line x1={hx + 7} y1={42} x2={hx + 7} y2={10} stroke={c} strokeWidth={2.5} />
    </>
  );
  if (s === 'croches') return (<>{head(x + 4)}{head(x + 26)}<Line x1={x + 11} y1={10} x2={x + 33} y2={10} stroke={c} strokeWidth={5} /></>);
  // 4 doubles croches : deux barres
  if (s === 'doubles') return (<>{[0, 1, 2, 3].map((k) => <React.Fragment key={k}>{head(x + 4 + k * 17)}</React.Fragment>)}<Line x1={x + 11} y1={10} x2={x + 62} y2={10} stroke={c} strokeWidth={5} /><Line x1={x + 11} y1={18} x2={x + 62} y2={18} stroke={c} strokeWidth={5} /></>);
  // triolet : 3 croches dans un temps, avec le « 3 » au-dessus
  if (s === 'triolet') return (<>{[0, 1, 2].map((k) => <React.Fragment key={k}>{head(x + 4 + k * 20)}</React.Fragment>)}<Line x1={x + 11} y1={10} x2={x + 51} y2={10} stroke={c} strokeWidth={5} /><SvgText x={x + 28} y={6} fontSize={11} fontWeight="900" fill={c} textAnchor="middle">3</SvgText></>);
  // syncope : croche, noire, croche (la noire chevauche le temps)
  if (s === 'syncope') return (<>{head(x + 4)}<Path d={`M${x + 11} 10 q10 6 8 16`} stroke={c} strokeWidth={3} fill="none" />{head(x + 30)}{head(x + 56)}<Path d={`M${x + 63} 10 q10 6 8 16`} stroke={c} strokeWidth={3} fill="none" /></>);
  return head(x + 8);
}

export function RhythmNotation({ items, highlight = [], perBar = 4, pickup = 0 }: { items: RhythmSymbol[]; highlight?: number[]; perBar?: number; pickup?: number }) {
  const widths = items.map((s) => (s === 'blanche' ? 64 : s === 'croches' ? 48 : s === 'doubles' ? 76 : s === 'syncope' ? 84 : s === 'triolet' ? 64 : 36));
  // chiffrage de la mesure en tête (retour bêta : plus lisible), puis les figures
  const meterW = 22;
  const total = widths.reduce((a, b) => a + b, 0) + 20 + meterW + 6;
  let x = 10 + meterW;
  let beat = 0;
  const bars: number[] = [];
  const glyphs = items.map((s, i) => {
    const g = <Glyph key={i} s={s} x={x} active={highlight.includes(i)} />;
    x += widths[i];
    beat += s === 'blanche' || s === 'syncope' ? 2 : 1;
    if (i === items.length - 1 && !(beat === pickup || (beat > pickup && (beat - pickup) % perBar === 0))) bars.push(x - 6);
    if (beat === pickup || (beat > pickup && (beat - pickup) % perBar === 0)) bars.push(x - 6);
    return g;
  });
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width="100%" height={60} viewBox={`0 0 ${total} 60`}>
        <Line x1={0} y1={44} x2={total} y2={44} stroke={colors.staff} strokeWidth={1} />
        {glyphs}
        <SvgText x={14} y={30} fontSize={17} fontWeight="900" fill={colors.ink} textAnchor="middle">{perBar}</SvgText>
        <SvgText x={14} y={50} fontSize={17} fontWeight="900" fill={colors.ink} textAnchor="middle">4</SvgText>
        {bars.map((bx, i) => (i === bars.length - 1
          // double barre finale
          ? <React.Fragment key={i}><Line x1={bx - 4} y1={14} x2={bx - 4} y2={54} stroke={colors.inkSoft} strokeWidth={1.5} /><Line x1={bx} y1={14} x2={bx} y2={54} stroke={colors.ink} strokeWidth={4} /></React.Fragment>
          : <Line key={i} x1={bx} y1={14} x2={bx} y2={54} stroke={colors.inkSoft} strokeWidth={1.5} />))}
      </Svg>
    </View>
  );
}

export function FigureGlyph({ figure, size = 90 }: { figure: RhythmSymbol; size?: number }) {
  return (
    <Svg width={size} height={size * 0.78} viewBox={figure === 'croches' ? '0 0 46 60' : figure === 'doubles' ? '0 0 78 60' : figure === 'syncope' ? '0 0 86 60' : figure === 'triolet' ? '0 0 66 60' : '0 0 40 60'}>
      <Glyph s={figure} x={4} />
    </Svg>
  );
}
