// Petites animations d'interface partagées, sur Reanimated : elles tournent sur le fil de l'interface, sans attendre
// le JavaScript. Chaque bouton tire sa propre réaction de `usePress` (s'enfoncer, faire avancer sa flèche…) ;
// avec « Réduire les animations », Reanimated pose directement la valeur finale.
import { Pressable } from 'react-native';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// enfoncement sans rebond, retour avec un léger rebond
const IN = { damping: 40, stiffness: 600 };
const OUT = { damping: 14, stiffness: 320 };

/** 0 → 1 pendant l'appui, retour en ressort au relâchement */
export function usePress() {
  const p = useSharedValue(0);
  return { p, onPressIn: () => p.set(withSpring(1, IN)), onPressOut: () => p.set(withSpring(0, OUT)) };
}
