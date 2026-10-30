// Curseur à crans façon iOS : une barre en capsule, et une pilule qui glisse à l'intérieur d'un cran à l'autre ;
// la barre se remplit jusqu'à la pilule, pour que la quantité choisie se lise d'un coup d'œil.
// Le geste (Gesture Handler) et les animations (Reanimated) tournent sur le fil de l'interface : la pilule suit le
// doigt sans passer par le JavaScript, qui n'apprend que le cran affiché et, au lâcher, la valeur choisie.
// VoiceOver et TalkBack l'ajustent d'un cran par balayage vers le haut ou le bas.
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { colors, radius } from '../theme';

// la barre est une capsule concentrique aux coins d'une carte (rayon = celui des commandes posées dedans) ;
// la pilule l'est à son tour dans la barre
const BAR = 2 * radius.control;
const PAD = 3;
const SNAP = { damping: 20, stiffness: 320 };
// la durée grossit et reprend sa taille sans rebond : un simple zoom
const ZOOM = { duration: 160, easing: Easing.out(Easing.quad) };

export function StepSlider({ label, value, values, format, onChange, onSliding, ink = colors.ink, soft = colors.inkSoft, pill = colors.card, fill = colors.accent }: {
  /** titre affiché au-dessus et lu par le lecteur d'écran */
  label: string;
  /** valeur choisie, parmi `values` : un cran par valeur, dans l'ordre (les écarts peuvent être inégaux : 1, 2, 5, 10…) */
  value: number; values: number[];
  /** valeur affichée à droite du titre, et lue par le lecteur d'écran */
  format: (v: number) => string;
  onChange: (v: number) => void;
  /** début et fin du glissement : sert à bloquer le défilement de la page pendant le geste */
  onSliding?: (active: boolean) => void;
  /** couleurs : valeur et barre (une version pâle de cette couleur), titre, pilule, partie remplie à gauche de la pilule */
  ink?: string; soft?: string; pill?: string; fill?: string;
}) {
  const [width, setWidth] = useState(0);
  const count = values.length - 1;
  // cran de la valeur reçue (la plus proche si elle n'est pas dans la liste)
  const nearest = (v: number) => values.reduce((best, x, k) => (Math.abs(x - v) < Math.abs(values[best] - v) ? k : best), 0);
  // une case par cran ; la pilule occupe une case et se déplace de case en case
  const seg = width > 0 ? (width - 2 * PAD) / (count + 1) : 0;
  const k0 = nearest(value);
  // pendant le geste, le cran reste local (affichage, points) ; la valeur n'est transmise qu'au lâcher : l'écran
  // parent ne se recalcule pas à chaque cran
  const [live, setLive] = useState<number | null>(null);
  const shownK = live ?? k0;
  const shown = values[shownK];

  const x = useSharedValue(0); // décalage de la pilule
  const pop = useSharedValue(1); // taille de la durée affichée : grossie tant qu'on tient la pilule
  const cur = useSharedValue(k0); // cran sous le doigt
  const held = useSharedValue(false); // geste actif (défilement de la page bloqué)

  // posée sans mouvement au premier affichage ; ensuite elle glisse (au lâcher, ou si la durée change ailleurs)
  const placed = useRef(false);
  useEffect(() => {
    cur.set(k0);
    if (!seg) return;
    if (!placed.current) { placed.current = true; x.set(k0 * seg); return; }
    x.set(withSpring(k0 * seg, SNAP));
  }, [k0, seg, x, cur]);

  // fin du geste, côté JavaScript : la page défile de nouveau, la valeur est transmise si elle a changé
  const commit = (k: number, wasHeld: boolean) => {
    setLive(null);
    if (wasHeld) onSliding?.(false);
    const v = values[Math.max(0, Math.min(count, k))];
    if (v !== value) onChange(v);
  };
  const hold = () => onSliding?.(true);

  const pan = usePanGesture({
    minDistance: 0,
    onBegin: (e) => {
      // un toucher : la durée grossit, la pilule saute sur la case touchée
      const k = Math.max(0, Math.min(count, Math.floor((e.x - PAD) / (seg || 1))));
      cur.set(k);
      pop.set(withTiming(1.18, ZOOM));
      x.set(withSpring(k * seg, SNAP));
      scheduleOnRN(setLive, k);
    },
    onActivate: () => {
      held.set(true);
      scheduleOnRN(hold);
    },
    onUpdate: (e) => {
      if (Math.abs(e.translationX) < 4) return;
      // la pilule suit le doigt, centrée dessous, sans sortir de la barre
      const tx = Math.max(0, Math.min(count * seg, e.x - PAD - seg / 2));
      x.set(tx);
      const k = Math.round(tx / (seg || 1));
      if (k !== cur.get()) { cur.set(k); scheduleOnRN(setLive, k); }
    },
    onFinalize: () => {
      // doigt levé (ou geste repris par le système) : la durée reprend sa taille, la pilule se pose sur son cran
      pop.set(withTiming(1, ZOOM));
      x.set(withSpring(cur.get() * seg, SNAP));
      scheduleOnRN(commit, cur.get(), held.get());
      held.set(false);
    },
  });

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  // partie remplie : une capsule aussi large que la barre, décalée pour que son bout arrondi entoure la pilule
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() + seg + 2 * PAD - width }] }));
  const valueStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={[styles.label, { color: soft }]}>{label}</Text>
        <Animated.Text style={[styles.value, { color: ink }, valueStyle]}>{format(shown)}</Animated.Text>
      </View>
      <GestureDetector gesture={pan}>
        <View
          style={styles.touch}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: values[0], max: values[count], now: shown, text: format(shown) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const k = Math.max(0, Math.min(count, k0 + (e.nativeEvent.actionName === 'increment' ? 1 : e.nativeEvent.actionName === 'decrement' ? -1 : 0)));
            if (values[k] !== value) onChange(values[k]);
          }}
        >
          <View style={styles.inner}>
            <View style={styles.clip}>
              <View style={[styles.bar, { backgroundColor: ink }]} />
              {/* la barre coupe le remplissage à gauche ; il suit la pilule par translation */}
              {seg ? <Animated.View style={[styles.fill, { width, backgroundColor: fill }, fillStyle]} /> : null}
            </View>
            {/* ombre intérieure, sans décalage (lumière venue d'en face), sur la barre et son remplissage : la barre paraît
                creusée dans la carte. La pilule, posée au fond, est dessinée par-dessus : elle ne la reçoit pas. */}
            <View style={styles.inset} />
            {seg ? (
              <>
                {/* un point par cran encore libre, à droite de la pilule */}
                {Array.from({ length: count + 1 }, (_, k) => k).filter((k) => k > shownK).map((k) => (
                  <View key={k} style={[styles.dot, { left: PAD + (k + 0.5) * seg - 2, backgroundColor: ink }]} />
                ))}
                <Animated.View style={[styles.pill, { width: seg, backgroundColor: pill }, pillStyle]} />
              </>
            ) : null}
          </View>
        </View>
      </GestureDetector>
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
  // rien ne capte le toucher à l'intérieur ; pas de sélection de texte quand on glisse sur le web
  inner: { height: BAR, pointerEvents: 'none', userSelect: 'none' },
  clip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: BAR / 2, overflow: 'hidden' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.18 },
  fill: { position: 'absolute', top: 0, left: 0, height: BAR, borderRadius: BAR / 2 },
  inset: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: BAR / 2, boxShadow: 'inset 0 0 4px rgba(0, 0, 0, 0.22)' },
  dot: { position: 'absolute', top: BAR / 2 - 2, width: 4, height: 4, borderRadius: 2, opacity: 0.45 },
  pill: { position: 'absolute', left: PAD, top: PAD, height: BAR - 2 * PAD, borderRadius: (BAR - 2 * PAD) / 2, boxShadow: '0 1px 4px rgba(0, 0, 0, 0.25)' },
});
