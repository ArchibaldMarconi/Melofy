// Chevron dessiné, au trait épais et arrondi : plus net qu'un caractère (▾, ›), le même sur tous les appareils.
import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

const D = { down: 'M5 8.5 L12 15.5 L19 8.5', up: 'M5 15.5 L12 8.5 L19 15.5', right: 'M8.5 5 L15.5 12 L8.5 19' } as const;

export function Chevron({ dir = 'down', color = colors.inkSoft, size = 15 }: { dir?: keyof typeof D; color?: string; size?: number }) {
  return (
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={D[dir]} stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}

/** coche dessinée (leçon validée) */
export function Check({ color = colors.onFill, size = 18 }: { color?: string; size?: number }) {
  return (
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 12.5 L10 17.5 L19 7" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}
