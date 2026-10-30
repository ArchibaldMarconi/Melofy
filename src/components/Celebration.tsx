// Fin d'exercice : compteur d'XP animé, note sur 4 en têtes de notes, confettis si c'est réussi.
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import type { Rating } from '../content/types';
import { colors, type } from '../theme';
import { useReduceMotion } from '../a11y';

const ND = Platform.OS !== 'web';

const RATING_COPY: Record<Rating, { title: string; line: string }> = {
  4: { title: 'Parfait !', line: 'Du premier coup, sans aide.' },
  3: { title: 'Bien joué', line: 'Réussi au premier essai.' },
  2: { title: 'Réussi', line: 'Avec un peu d\'effort : ça va rentrer.' },
  1: { title: 'On y reviendra', line: 'Cet exercice repassera bientôt dans tes séances.' },
};

export function useCountUp(target: number, ms = 700) {
  const reduce = useReduceMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const a = new Animated.Value(0);
    const id = a.addListener(({ value }) => setV(Math.round(value)));
    Animated.timing(a, { toValue: target, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => a.removeListener(id);
  }, [target, ms, reduce]);
  // animations réduites : la valeur finale tout de suite
  return reduce ? target : v;
}

function Confetti({ palette }: { palette: string[] }) {
  // positions pseudo-aléatoires mais stables (pas de diagonale régulière)
  const [pieces] = useState(() => Array.from({ length: 22 }, (_, i) => {
    const h = Math.sin(i * 12.9898) * 43758.5453;
    const r = h - Math.floor(h);
    const h2 = Math.sin(i * 78.233) * 12345.678;
    const r2 = h2 - Math.floor(h2);
    return {
      x: 4 + r * 92, drift: (r2 - 0.5) * 60, dist: 120 + r2 * 160, dur: 900 + r * 700, delay: Math.floor(r2 * 250),
      rot: Math.floor(r * 360), w: r > 0.5 ? 8 : 6, h: r2 > 0.5 ? 12 : 7, color: palette[i % palette.length], fall: new Animated.Value(0),
    };
  }));
  useEffect(() => {
    Animated.parallel(pieces.map((p) => Animated.timing(p.fall, { toValue: 1, duration: p.dur, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: ND }))).start();
  }, [pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View key={i} style={[styles.piece, {
          left: `${p.x}%`, width: p.w, height: p.h, backgroundColor: p.color,
          opacity: p.fall.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.9, 0] }),
          transform: [
            { translateY: p.fall.interpolate({ inputRange: [0, 1], outputRange: [-30, p.dist] }) },
            { translateX: p.fall.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
            { rotate: p.fall.interpolate({ inputRange: [0, 1], outputRange: [`${p.rot}deg`, `${p.rot + 540}deg`] }) },
          ],
        }]} />
      ))}
    </View>
  );
}

function RatingNotes({ rating, color }: { rating: Rating; color: string }) {
  const reduce = useReduceMotion();
  const [scales] = useState(() => [0, 1, 2, 3].map(() => new Animated.Value(reduce ? 1 : 0)));
  useEffect(() => {
    if (reduce) return;
    Animated.stagger(120, scales.map((s) => Animated.spring(s, { toValue: 1, friction: 4, useNativeDriver: ND }))).start();
  }, [scales, reduce]);
  return (
    <View style={styles.notes} role="img" accessibilityLabel={`Note ${rating} sur 4`}>
      {scales.map((s, i) => (
        <Animated.View key={i} style={[styles.head, {
          backgroundColor: i < rating ? color : 'transparent', borderColor: i < rating ? color : colors.staff,
          transform: [{ rotate: '-18deg' }, { scale: s }],
        }]} />
      ))}
    </View>
  );
}

export function Celebration({ xp, rating, precision, color, children }: { xp: number; rating: Rating; precision: number; color: string; children?: React.ReactNode }) {
  const shown = useCountUp(xp);
  const reduce = useReduceMotion();
  const copy = RATING_COPY[rating];
  return (
    <View style={styles.wrap}>
      {rating >= 3 && !reduce ? <Confetti palette={[color, colors.gold, colors.accent, colors.success]} /> : null}
      <View style={{ zIndex: 1, alignItems: 'center', gap: 10 }}>
      <RatingNotes rating={rating} color={color} />
      <Text style={[type.display, { color: rating === 1 ? colors.ink : color, textAlign: 'center' }]}>{copy.title}</Text>
      <Text style={[type.body, { textAlign: 'center', color: colors.inkSoft }]}>{copy.line}</Text>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={[styles.statValue, { color }]}>+{shown}</Text><Text style={type.small}>XP</Text></View>
        <View style={styles.stat}><Text style={[styles.statValue, { color }]}>{Math.round(precision * 100)} %</Text><Text style={type.small}>précision</Text></View>
      </View>
      {children}
      </View>
    </View>
  );
}

/** Secoue un élément (erreur). */
export function useShake(trigger: unknown) {
  const reduce = useReduceMotion();
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    x.setValue(0);
    if (reduce) return;
    Animated.sequence([10, -10, 7, -7, 3, 0].map((v) => Animated.timing(x, { toValue: v, duration: 45, useNativeDriver: ND }))).start();
  }, [trigger, x, reduce]);
  return { transform: [{ translateX: x }] };
}

/** Fait « éclore » un élément (réussite). */
export function usePop(trigger: unknown) {
  const reduce = useReduceMotion();
  const [s] = useState(() => new Animated.Value(reduce ? 1 : 0.6));
  useEffect(() => {
    if (reduce) { s.setValue(1); return; }
    s.setValue(0.6);
    Animated.spring(s, { toValue: 1, friction: 3, tension: 120, useNativeDriver: ND }).start();
  }, [trigger, s, reduce]);
  return { transform: [{ scale: s }] };
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, paddingTop: 16, minHeight: 260 },
  piece: { position: 'absolute', top: 0, borderRadius: 2 },
  notes: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  head: { width: 30, height: 22, borderRadius: 12, borderWidth: 3 },
  stats: { flexDirection: 'row', gap: 12, marginVertical: 6 },
  stat: { backgroundColor: colors.card, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 22, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '900' },
});
