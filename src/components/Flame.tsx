// Flamme de la série, dessinée : l'émoji 🔥 change d'un appareil à l'autre, celle-ci garde le même trait partout.
// Éteinte (grise) tant que la série est à zéro.
import React from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../theme';

const OUTER = 'M12.6 1.2C13.4 5.6 19.5 9 19.5 16.4C19.5 21.6 16.2 25.6 12 25.6C7.8 25.6 4.5 22.2 4.5 17.4C4.5 13.6 6.6 10.9 8.4 9.4C8.5 11.6 9.4 13.1 10.6 13.8C10.1 9.1 10.9 4.4 12.6 1.2Z';
const INNER = 'M12.2 13.4C13 16.4 16.2 18 16.2 21.1C16.2 23.7 14.4 25.6 12 25.6C9.6 25.6 7.8 23.8 7.8 21.5C7.8 19.4 9 18 9.9 17.3C10.1 18.5 10.8 19.2 11.4 19.4C11.1 17.1 11.4 15 12.2 13.4Z';

export function Flame({ size = 24, lit = true }: { size?: number; lit?: boolean }) {
  return (
    <Svg width={(size * 24) / 28} height={size} viewBox="0 0 24 28">
      <Defs>
        <LinearGradient id="flamme-ext" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFC23D" />
          <Stop offset="1" stopColor="#F2542D" />
        </LinearGradient>
        <LinearGradient id="flamme-int" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFF1B8" />
          <Stop offset="1" stopColor="#FFC23D" />
        </LinearGradient>
      </Defs>
      <Path d={OUTER} fill={lit ? 'url(#flamme-ext)' : colors.staff} />
      <Path d={INNER} fill={lit ? 'url(#flamme-int)' : colors.line} />
    </Svg>
  );
}
