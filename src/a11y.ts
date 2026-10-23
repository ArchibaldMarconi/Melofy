// Accessibilité : annonces VoiceOver / TalkBack et respect du réglage « Réduire les animations ».
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function announce(message: string) {
  try { AccessibilityInfo.announceForAccessibility(message); } catch { /* plateforme sans lecteur d'écran */ }
}

let reduceMotionCache = false;
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(reduceMotionCache);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduceMotionCache = !!v; if (alive) setReduce(!!v); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => { reduceMotionCache = v; setReduce(v); });
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduce;
}
