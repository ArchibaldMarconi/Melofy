// Une forme par partie de la séance, comme les têtes de notes en notation « shape notes » : la forme guide l'œil,
// la couleur (une nuance du violet principal) ne fait que suivre l'avancée dans la séance.
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { WorkoutPart } from '../content/types';
import { partColor } from '../theme';

type Shape = 'rond' | 'carre' | 'triangle' | 'losange' | 'hexagone' | 'etoile';

export const PART_SHAPE: Record<WorkoutPart, Shape> = {
  technique: 'rond', revision: 'carre', oreille: 'triangle', mapping: 'losange', perroquet: 'hexagone', creer: 'etoile',
};

const PATHS: Partial<Record<Shape, string>> = {
  triangle: 'M12 3.4 L20.8 19.2 L3.2 19.2 Z',
  losange: 'M12 2.6 L21.4 12 L12 21.4 L2.6 12 Z',
  hexagone: 'M12 2.4 L20.31 7.2 L20.31 16.8 L12 21.6 L3.69 16.8 L3.69 7.2 Z',
  etoile: 'M12 2.5 L14.65 9.26 L21.89 9.69 L16.28 14.29 L18.11 21.31 L12 17.4 L5.89 21.31 L7.72 14.29 L2.11 9.69 L9.35 9.26 Z',
};

export function PartShape({ part, size = 18 }: { part: WorkoutPart; size?: number }) {
  const shape = PART_SHAPE[part];
  const c = partColor[part];
  // un trait de la même couleur, aux jointures rondes, adoucit les pointes
  const soft = { fill: c, stroke: c, strokeWidth: 1.6, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {shape === 'rond' ? <Circle cx={12} cy={12} r={8.6} fill={c} />
        : shape === 'carre' ? <Rect x={4} y={4} width={16} height={16} rx={3.5} fill={c} />
        : <Path d={PATHS[shape]} {...soft} />}
    </Svg>
  );
}
