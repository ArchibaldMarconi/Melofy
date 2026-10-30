// Curseur à crans façon iOS : une barre en capsule, et une pilule qui glisse à l'intérieur d'un cran à l'autre.
// Sans module natif (il marche aussi dans Expo Go et sur le web) : on fait glisser la pilule, ou on touche un cran.
// VoiceOver et TalkBack l'ajustent d'un cran par balayage vers le haut ou le bas.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { useReduceMotion } from '../a11y';
import { colors, radius } from '../theme';
import { ND } from './motion';

// la barre est une capsule concentrique aux coins d'une carte (rayon = celui des commandes posées dedans) ;
// la pilule l'est à son tour dans la barre
const BAR = 2 * radius.control;
const PAD = 3;

export function StepSlider({ label, value, min, max, step, format, onChange, onSliding, ink = colors.ink, soft = colors.inkSoft, pill = colors.card }: {
  /** titre affiché au-dessus et lu par le lecteur d'écran */
  label: string;
  value: number; min: number; max: number; step: number;
  /** valeur affichée à droite du titre, et lue par le lecteur d'écran */
  format: (v: number) => string;
  onChange: (v: number) => void;
  /** début et fin du glissement : sert à bloquer le défilement de la page pendant le geste */
  onSliding?: (active: boolean) => void;
  /** couleurs : valeur et barre (une version pâle de cette couleur), titre, pilule */
  ink?: string; soft?: string; pill?: string;
}) {
  const [width, setWidth] = useState(0);
  const reduce = useReduceMotion();
  const [x] = useState(() => new Animated.Value(0));
  // la durée affichée rebondit à chaque cran franchi
  const [pop] = useState(() => new Animated.Value(1));
  const grab = useRef({ x: 0, pageX: 0, last: value, sliding: false });
  const count = Math.round((max - min) / step);
  // une case par cran ; la pilule occupe une case et se déplace de case en case
  const seg = width > 0 ? (width - 2 * PAD) / (count + 1) : 0;
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const indexOf = (v: number) => Math.round((v - min) / step);

  // la pilule rejoint sa case en ressort (sans mouvement si les animations sont réduites)
  const slideTo = (k: number) => (reduce ? x.setValue(k * seg) : Animated.spring(x, { toValue: k * seg, useNativeDriver: ND, speed: 24, bounciness: 4 }).start());
  // posée sans mouvement au premier affichage ; ensuite elle glisse (après un toucher, ou si la durée change ailleurs)
  const placed = useRef(false);
  useEffect(() => {
    if (!seg || grab.current.sliding) return;
    if (!placed.current) { placed.current = true; x.setValue(indexOf(value) * seg); return; }
    slideTo(indexOf(value));
  }, [value, seg]); // eslint-disable-line react-hooks/exhaustive-deps

  const bump = () => {
    if (reduce) return;
    pop.setValue(1.18);
    Animated.spring(pop, { toValue: 1, useNativeDriver: ND, speed: 30, bounciness: 12 }).start();
  };
  const set = (v: number) => { if (v !== grab.current.last) { grab.current.last = v; onChange(v); bump(); } };
  // position du doigt → pilule centrée sous le doigt, sans sortir de la barre
  const follow = (fx: number) => {
    const tx = Math.max(0, Math.min(count * seg, fx - PAD - seg / 2));
    x.setValue(tx);
    set(clamp(min + Math.round(tx / (seg || 1)) * step));
  };
  const begin = (e: GestureResponderEvent) => {
    const fx = e.nativeEvent.locationX;
    grab.current = { x: fx, pageX: e.nativeEvent.pageX, last: value, sliding: false };
    // un toucher : la pilule saute sur la case touchée
    const k = Math.max(0, Math.min(count, Math.floor((fx - PAD) / (seg || 1))));
    set(min + k * step);
    slideTo(k);
  };
  const move = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.pageX - grab.current.pageX;
    if (!grab.current.sliding && Math.abs(dx) < 4) return;
    if (!grab.current.sliding) { grab.current.sliding = true; onSliding?.(true); }
    follow(grab.current.x + dx);
  };
  const end = () => {
    if (!grab.current.sliding) return;
    grab.current.sliding = false;
    onSliding?.(false);
    // la pilule se pose sur le cran le plus proche
    slideTo(indexOf(grab.current.last));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={[styles.label, { color: soft }]}>{label}</Text>
        <Animated.Text style={[styles.value, { color: ink, transform: [{ scale: pop }] }]}>{format(value)}</Animated.Text>
      </View>
      <View
        style={styles.touch}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={begin}
        onResponderMove={move}
        onResponderRelease={end}
        onResponderTerminate={end}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: format(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const v = clamp(value + (e.nativeEvent.actionName === 'increment' ? step : e.nativeEvent.actionName === 'decrement' ? -step : 0));
          if (v !== value) { onChange(v); bump(); }
        }}
      >
        {/* rien ne capte le toucher à l'intérieur : locationX reste mesuré depuis le bord de la barre */}
        <View style={styles.inner}>
          <View style={[styles.bar, { backgroundColor: ink }]} />
          {seg ? (
            <>
              {/* un point par cran, recouvert par la pilule là où elle se trouve */}
              {Array.from({ length: count + 1 }, (_, k) => (
                <View key={k} style={[styles.dot, { left: PAD + (k + 0.5) * seg - 2, backgroundColor: ink }]} />
              ))}
              <Animated.View style={[styles.pill, { width: seg, backgroundColor: pill, transform: [{ translateX: x }] }]} />
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 6 },
  label: { fontSize: 13, fontWeight: '700' },
  value: { fontSize: 16, fontWeight: '900' },
  // zone de toucher de 44 pt, la barre au milieu
  touch: { paddingVertical: (44 - BAR) / 2 },
  // pas de sélection de texte quand on glisse sur le web
  inner: { height: BAR, pointerEvents: 'none', userSelect: 'none' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: BAR / 2, opacity: 0.18 },
  dot: { position: 'absolute', top: BAR / 2 - 2, width: 4, height: 4, borderRadius: 2, opacity: 0.45 },
  pill: { position: 'absolute', left: PAD, top: PAD, height: BAR - 2 * PAD, borderRadius: (BAR - 2 * PAD) / 2, boxShadow: '0 1px 4px rgba(0, 0, 0, 0.25)' },
});
