// Petites animations d'interface partagées. Chaque bouton en tire sa propre réaction (s'enfoncer, faire avancer
// sa flèche, tourner…) ; avec « Réduire les animations », l'état change sans mouvement.
import { useState } from 'react';
import { Animated, Platform, Pressable } from 'react-native';
import { useReduceMotion } from '../a11y';

/** le pilote natif n'existe pas sur le web */
export const ND = Platform.OS !== 'web';

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** 0 → 1 pendant l'appui, retour en ressort au relâchement */
export function usePress() {
  const reduce = useReduceMotion();
  const [p] = useState(() => new Animated.Value(0));
  const to = (v: number) => () => {
    if (reduce) { p.setValue(v); return; }
    Animated.spring(p, { toValue: v, useNativeDriver: ND, speed: 40, bounciness: v ? 0 : 10 }).start();
  };
  return { p, onPressIn: to(1), onPressOut: to(0) };
}

/** valeur interpolée de `from` (repos) à `to` (appuyé) */
export const lerp = (p: Animated.Value, from: number, to: number) => p.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
