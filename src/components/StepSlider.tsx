// Curseur à crans, sans module natif (il marche aussi dans Expo Go et sur le web) : on glisse, ou on touche un cran.
// VoiceOver et TalkBack l'ajustent d'un cran par balayage vers le haut ou le bas.
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { colors } from '../theme';

const THUMB = 26;
const TRACK_H = 44;

export function StepSlider({ label, value, min, max, step, format, onChange, onSliding, ink = colors.ink, soft = colors.inkSoft }: {
  /** titre affiché au-dessus et lu par le lecteur d'écran */
  label: string;
  value: number; min: number; max: number; step: number;
  /** valeur affichée à droite du titre, et lue par le lecteur d'écran */
  format: (v: number) => string;
  onChange: (v: number) => void;
  /** début et fin du glissement : sert à bloquer le défilement de la page pendant le geste */
  onSliding?: (active: boolean) => void;
  /** couleurs : texte et partie remplie (le rail vide en est une version pâle), texte secondaire */
  ink?: string; soft?: string;
}) {
  const [width, setWidth] = useState(0);
  const grab = useRef({ x: 0, pageX: 0, last: value });
  const count = Math.round((max - min) / step);
  const marks = Array.from({ length: count + 1 }, (_, k) => min + k * step);
  const usable = Math.max(0, width - THUMB);
  const xOf = (v: number) => THUMB / 2 + ((v - min) / (max - min)) * usable;
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const pick = (x: number) => {
    const v = clamp(min + Math.round(((x - THUMB / 2) / (usable || 1)) * count) * step);
    if (v !== grab.current.last) { grab.current.last = v; onChange(v); }
  };
  const begin = (e: GestureResponderEvent) => {
    grab.current = { x: e.nativeEvent.locationX, pageX: e.nativeEvent.pageX, last: value };
    onSliding?.(true);
    pick(e.nativeEvent.locationX);
  };
  const end = () => onSliding?.(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={[styles.label, { color: soft }]}>{label}</Text>
        <Text style={[styles.value, { color: ink }]}>{format(value)}</Text>
      </View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={begin}
        onResponderMove={(e) => pick(grab.current.x + e.nativeEvent.pageX - grab.current.pageX)}
        onResponderRelease={end}
        onResponderTerminate={end}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: format(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const v = clamp(value + (e.nativeEvent.actionName === 'increment' ? step : e.nativeEvent.actionName === 'decrement' ? -step : 0));
          if (v !== value) onChange(v);
        }}
      >
        {/* rien ne capte le toucher à l'intérieur : locationX reste mesuré depuis le bord du curseur */}
        <View style={styles.inner}>
          {width > 0 ? (
            <>
              <View style={[styles.rail, styles.empty, { left: THUMB / 2, right: THUMB / 2, backgroundColor: ink }]} />
              <View style={[styles.rail, { left: THUMB / 2, width: xOf(value) - THUMB / 2, backgroundColor: ink }]} />
              {marks.map((m) => (
                <View key={m} style={[styles.tick, { left: xOf(m) - 3, backgroundColor: ink }, m > value && styles.tickOff]} />
              ))}
              <View style={[styles.thumb, { left: xOf(value) - THUMB / 2, backgroundColor: ink }]} />
              {marks.map((m) => (
                <Text key={`l${m}`} style={[styles.mark, { left: xOf(m) - 20, color: m === value ? ink : soft }, m === value && styles.markOn]}>{m}</Text>
              ))}
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 13, fontWeight: '700' },
  value: { fontSize: 16, fontWeight: '900' },
  // pas de sélection de texte quand on glisse sur le web
  inner: { height: TRACK_H + 16, pointerEvents: 'none', userSelect: 'none' },
  rail: { position: 'absolute', top: TRACK_H / 2 - 2, height: 4, borderRadius: 2 },
  empty: { opacity: 0.25 },
  tick: { position: 'absolute', top: TRACK_H / 2 - 3, width: 6, height: 6, borderRadius: 3 },
  tickOff: { opacity: 0.55 },
  thumb: { position: 'absolute', top: TRACK_H / 2 - THUMB / 2, width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
  mark: { position: 'absolute', top: TRACK_H - 4, width: 40, textAlign: 'center', fontSize: 12, fontVariant: ['tabular-nums'] },
  markOn: { fontWeight: '900' },
});
