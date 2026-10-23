// Radar des 4 domaines principaux : montre un domaine en retard.
import React from 'react';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import type { Domain } from '../content/types';
import { colors, domainColor, domainLabel } from '../theme';

export function Radar({ values, size = 220 }: { values: Partial<Record<Domain, number>>; size?: number }) {
  const axes: Domain[] = ['rythme', 'oreille', 'theorie', 'technique'];
  // marge latérale pour que les libellés « Technique » et « Oreille » ne soient jamais coupés
  const W = size + 120;
  const cx = W / 2;
  const c = size / 2;
  const R = size / 2 - 34;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    return [cx + Math.cos(a) * R * v, c + Math.sin(a) * R * v];
  };
  const poly = axes.map((d, i) => pt(i, Math.max(0.05, values[d] ?? 0)).join(',')).join(' ');
  return (
    <Svg width={W} height={size} accessibilityLabel={axes.map((d) => `${domainLabel[d]} ${Math.round((values[d] ?? 0) * 100)} %`).join(', ')}>
      {[0.25, 0.5, 0.75, 1].map((k) => <Circle key={k} cx={cx} cy={c} r={R * k} stroke={colors.line} fill="none" />)}
      {axes.map((d, i) => {
        const [x, y] = pt(i, 1);
        const [lx, ly] = pt(i, 1.22);
        return (
          <React.Fragment key={d}>
            <Line x1={cx} y1={c} x2={x} y2={y} stroke={colors.line} />
            <SvgText x={lx} y={ly + 4} fill={domainColor[d]} fontSize={12} fontWeight="700" textAnchor="middle">{domainLabel[d]}</SvgText>
          </React.Fragment>
        );
      })}
      <Polygon points={poly} fill="rgba(115,72,201,0.22)" stroke="#7348C9" strokeWidth={2} />
    </Svg>
  );
}
