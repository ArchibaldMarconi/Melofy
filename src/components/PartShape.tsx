// Une forme par partie de la séance, comme les têtes de notes en notation « shape notes » : la forme guide l'œil,
// la couleur (une nuance du violet principal) ne fait que suivre l'avancée dans la séance.
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { WorkoutPart } from '../content/types';
import { partColor } from '../theme';

type Shape = 'rond' | 'carre' | 'triangle' | 'losange' | 'hexagone' | 'etoile';

export const PART_SHAPE: Record<WorkoutPart, Shape> = {
  technique: 'rond', revision: 'carre', oreille: 'triangle', mapping: 'losange', perroquet: 'hexagone', creer: 'etoile',
};

// polygones aux coins arrondis (un arc à chaque sommet ; creux de l'étoile arrondis aussi)
const PATHS: Partial<Record<Shape, string>> = {
  triangle: 'M9.38 7.11 A3 3 0 0 1 14.62 7.11 L19.32 15.54 A3 3 0 0 1 16.7 20 L7.3 20 A3 3 0 0 1 4.68 15.54 Z',
  losange: 'M9.74 3.86 A3.2 3.2 0 0 1 14.26 3.86 L20.14 9.74 A3.2 3.2 0 0 1 20.14 14.26 L14.26 20.14 A3.2 3.2 0 0 1 9.74 20.14 L3.86 14.26 A3.2 3.2 0 0 1 3.86 9.74 Z',
  hexagone: 'M10.6 2.41 A2.8 2.8 0 0 1 13.4 2.41 L19.61 5.99 A2.8 2.8 0 0 1 21.01 8.42 L21.01 15.58 A2.8 2.8 0 0 1 19.61 18.01 L13.4 21.59 A2.8 2.8 0 0 1 10.6 21.59 L4.39 18.01 A2.8 2.8 0 0 1 2.99 15.58 L2.99 8.42 A2.8 2.8 0 0 1 4.39 5.99 Z',
  etoile: 'M10.52 5.2 A1.6 1.6 0 0 1 13.48 5.2 L14.7 8.18 A1 1 0 0 0 15.55 8.8 L18.77 9.04 A1.6 1.6 0 0 1 19.68 11.86 L17.23 13.95 A1 1 0 0 0 16.9 14.94 L17.66 18.08 A1.6 1.6 0 0 1 15.27 19.82 L12.53 18.12 A1 1 0 0 0 11.47 18.12 L8.73 19.82 A1.6 1.6 0 0 1 6.34 18.08 L7.1 14.94 A1 1 0 0 0 6.77 13.95 L4.32 11.86 A1.6 1.6 0 0 1 5.23 9.04 L8.45 8.8 A1 1 0 0 0 9.3 8.18 Z',
};

export function PartShape({ part, size = 18 }: { part: WorkoutPart; size?: number }) {
  const shape = PART_SHAPE[part];
  const c = partColor[part];
  return (
    // décorative : le nom de la partie est écrit à côté
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {shape === 'rond' ? <Circle cx={12} cy={12} r={8.6} fill={c} />
          : shape === 'carre' ? <Rect x={4} y={4} width={16} height={16} rx={5} fill={c} />
          : <Path d={PATHS[shape]} fill={c} />}
      </Svg>
    </View>
  );
}
