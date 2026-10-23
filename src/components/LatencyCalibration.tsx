// Calibrage de la latence : tape avec 12 clics ; la médiane de tes écarts devient la compensation.
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { audio } from '../audio/RNAudioEngine';
import { colors, type } from '../theme';
import { Button } from './Button';
import { TapPad } from './TapPad';
import { computeLatency } from '../engine/latency';

const TEMPO = 90;
const BEATS = 12;

export function LatencyCalibration({ current, onSave }: { current: number; onSave: (ms: number) => void }) {
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle');
  const [result, setResult] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const taps = useRef<number[]>([]);
  const start = useRef(0);

  const run = async () => {
    await audio.init();
    taps.current = [];
    setCount(0);
    setPhase('run');
    const pb = audio.clicks(BEATS, TEMPO, 300);
    start.current = pb.startMs;
    await pb.done;
    setTimeout(() => { setResult(computeLatency(taps.current)); setPhase('done'); }, 400);
  };

  return (
    <View style={styles.box}>
      <Text style={type.body}>Latence : {current} ms</Text>
      {phase === 'idle' ? (
        <>
          <Text style={type.small}>Tape en même temps que les 12 clics. Utilise le haut-parleur ou le casque que tu utilises pour pratiquer.</Text>
          <Button small variant="contour" label="Calibrer" onPress={run} />
        </>
      ) : null}
      {phase === 'run' ? <TapPad color={colors.primary} label={`${count} / ${BEATS}`} onTap={() => { taps.current.push(audio.now() - start.current); setCount((c) => c + 1); }} /> : null}
      {phase === 'done' ? (
        result === null ? (
          <>
            <Text style={type.body}>Pas assez de frappes régulières. On recommence ?</Text>
            <Button small variant="contour" label="Recommencer" onPress={run} />
          </>
        ) : (
          <>
            <Text style={type.body}>Mesuré : {result} ms.</Text>
            <View style={styles.row}>
              <Button small variant="contour" label="Recommencer" onPress={run} />
              <Button small label="Enregistrer" onPress={() => { onSave(result); setPhase('idle'); }} />
            </View>
          </>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8, paddingVertical: 6 },
  row: { flexDirection: 'row', gap: 8 },
});
