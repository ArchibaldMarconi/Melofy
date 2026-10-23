// Test du micro : 2 s de silence pour mesurer le bruit ambiant, puis essai en direct.
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMic } from '../audio/useMic';
import { gateFromNoise } from '../engine/micgate';
import { colors, type } from '../theme';
import { Button } from './Button';
import { PitchMeter } from './PitchMeter';

type Phase = 'idle' | 'noise' | 'live';

export function MicTest({ gate, onSave }: { gate: number | undefined; onSave: (g: number) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [measured, setMeasured] = useState<number | null>(null);
  const levels = useRef<number[]>([]);
  const t0 = useRef(0);
  const active = phase !== 'idle';
  const { liveMidi, level, error } = useMic(active, 0, {
    onFrame: (f) => {
      if (phase !== 'noise') return;
      if (!t0.current) t0.current = f.tMs;
      if (f.tMs - t0.current < 300) return; // on laisse le micro se stabiliser
      levels.current.push(f.rms);
      if (f.tMs - t0.current > 2300) {
        const g = gateFromNoise(levels.current);
        setMeasured(g);
        setPhase('live');
      }
    },
  }, measured ?? gate ?? 0.02);

  const start = () => { levels.current = []; t0.current = 0; setMeasured(null); setPhase('noise'); };
  const meter = Math.min(1, level / 0.2);
  const g = measured ?? gate ?? 0.02;

  return (
    <View style={styles.box}>
      <Text style={type.body}>Micro{gate ? ` · seuil ${Math.round(gate * 1000)}` : ' · pas encore testé'}</Text>
      {phase === 'idle' ? (
        <>
          <Text style={type.small}>Règle le micro selon ta pièce : 2 secondes de silence, puis joue ou chante.</Text>
          <Button small variant="contour" label="Tester le micro" onPress={start} />
        </>
      ) : null}
      {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
      {active && !error ? (
        <>
          <View style={styles.levelTrack} role="img" accessibilityLabel="Niveau du micro">
            <View style={[styles.levelFill, { width: `${meter * 100}%`, backgroundColor: level >= g ? colors.success : colors.staff }]} />
            <View style={[styles.gateMark, { left: `${Math.min(100, (g / 0.2) * 100)}%` }]} />
          </View>
          {phase === 'noise' ? <Text style={type.body}>Silence… je mesure le bruit de la pièce.</Text> : null}
          {phase === 'live' ? (
            <>
              <Text style={type.body}>Joue ou chante une note : elle doit s'afficher et l'aiguille se stabiliser.</Text>
              <PitchMeter midi={liveMidi} />
              {g >= 0.06 ? <Text style={[type.small, { color: colors.warn }]}>Pièce bruyante : rapproche-toi du téléphone ou coupe la source de bruit.</Text> : null}
              <View style={styles.row}>
                <Button small variant="contour" label="Recommencer" onPress={start} />
                <Button small label="Enregistrer" onPress={() => { onSave(g); setPhase('idle'); }} />
              </View>
            </>
          ) : null}
        </>
      ) : null}
      {active && error ? <Button small variant="contour" label="Fermer" onPress={() => setPhase('idle')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8, paddingVertical: 6 },
  row: { flexDirection: 'row', gap: 8 },
  levelTrack: { height: 12, borderRadius: 6, backgroundColor: colors.line, overflow: 'hidden' },
  levelFill: { height: '100%' },
  gateMark: { position: 'absolute', width: 2, height: '100%', backgroundColor: colors.primary },
});
