// Entraînement chronométré façon « Solo » : une cible après l'autre jusqu'à la fin du temps choisi.
// L'élève joue à l'écran (clavier, manche) ou sur son instrument (micro) ; l'appli vérifie note par note.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { audio } from '../audio/RNAudioEngine';
import { useMic } from '../audio/useMic';
import { Fretboard } from '../components/Fretboard';
import { Piano } from '../components/Piano';
import { Button } from '../components/Button';
import { mod12, pcName } from '../engine/music';
import { mulberry32, newSeed } from '../engine/rng';
import { useUserStore } from '../store/useUserStore';
import { getTuning } from '../tuning';
import { colors, type } from '../theme';
import { announce } from '../a11y';
import { makeTarget, positionsOf, step, type DrillConfig, type DrillTarget, type Pos, type Progress } from './engine';

const ADVANCE_MS = { trouve: 500, '2s': 2000, '5s': 5000 } as const;
const KIND_LABEL = { notes: 'Notes', intervalles: 'Intervalles', accords: 'Accords', gammes: 'Gammes' } as const;
const DRILL_SKILL = { notes: 'notes_instrument', intervalles: 'intervalles_instrument', accords: 'accords_instrument', gammes: 'gammes_instrument' } as const;

export function DrillRunner({ config, onExit }: { config: DrillConfig; onExit: () => void }) {
  const instrument = useUserStore((s) => s.settings.instrument);
  const gate = useUserStore((s) => s.settings.micGate);
  const tuning = useMemo(getTuning, []);
  const rng = useRef(mulberry32(newSeed()));
  const [target, setTarget] = useState<DrillTarget>(() => makeTarget(config, rng.current, instrument, tuning));
  const [prog, setProg] = useState<Progress>({ index: 0, found: [], errors: 0 });
  const [flash, setFlash] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [left, setLeft] = useState(config.minutes * 60);
  const stats = useRef({ targets: 0, errors: 0, notes: 0, t0: Date.now(), times: [] as number[] });
  const targetStart = useRef(Date.now());
  const locked = useRef(false);
  // positions (niveaux 2 et 3) : uniquement à l'écran, le micro ne distingue pas deux cases qui donnent la même note
  const useMicInput = config.input === 'micro' && !target.positions;

  useEffect(() => {
    const iv = setInterval(() => setLeft((s) => { if (s <= 1) { clearInterval(iv); setDone(true); return 0; } return s - 1; }), 1000);
    return () => clearInterval(iv);
  }, []);

  const next = () => {
    stats.current.targets++;
    stats.current.times.push((Date.now() - targetStart.current) / 1000);
    const t = makeTarget(config, rng.current, instrument, tuning);
    setTarget(t);
    setProg({ index: 0, found: [], errors: 0 });
    targetStart.current = Date.now();
    locked.current = false;
    announce(`${t.title}. ${t.sub}`);
  };

  const onPlayed = (midi: number, pos?: Pos) => {
    if (locked.current || done) return;
    if (!useMicInput) audio.playNote(midi, instrument);
    const r = step(target, prog, { midi, pos });
    stats.current.notes++;
    setProg(r.p);
    if (r.result === 'wrong') { stats.current.errors++; setFlash(colors.danger); setTimeout(() => setFlash(null), 300); return; }
    setFlash(colors.success); setTimeout(() => setFlash(null), 250);
    if (r.result === 'done') {
      locked.current = true;
      setTimeout(next, ADVANCE_MS[config.advance]);
    }
  };

  const { liveMidi, error: micError } = useMic(useMicInput && !done, 0, { onNote: (n) => onPlayed(n.midi) }, gate);

  // doigtés : toutes les positions des notes de la cible (option) ; trouvées en vert
  const highlights: Record<number, string> = {};
  if (config.showFingerings) for (const pc of new Set(target.sequence)) for (let m = 36; m <= 88; m++) if (mod12(m) === pc) highlights[m] = `${colors.accent}88`;
  const marks = target.positions && instrument === 'guitare'
    ? [...(config.showFingerings ? target.positions.map((p) => ({ string: p.string, fret: p.fret, color: `${colors.accent}88`, midi: p.midi })) : []),
       ...prog.found.map((p) => ({ string: p.string, fret: p.fret, color: colors.success, midi: p.midi }))]
    : undefined;
  if (target.positions && instrument === 'piano') for (const p of prog.found) highlights[p.midi] = colors.success;
  if (target.positions && instrument === 'piano' && target.positions.length === 1) highlights[target.positions[0].midi] = highlights[target.positions[0].midi] ?? `${colors.gold}66`;

  // XP de pratique : 1 par cible trouvée (20 au plus par série), crédité une fois à la fin
  const credited = useRef(false);
  useEffect(() => {
    if (done && !credited.current) {
      credited.current = true;
      const st = stats.current;
      useUserStore.getState().addPracticeXp(Math.min(20, st.targets));
      // la série compte aussi comme une révision de la compétence entraînée (si elle est due)
      if (st.targets >= 3) {
        const precision = st.notes ? (st.notes - st.errors) / st.notes : 0;
        useUserStore.getState().recordSkillPractice(DRILL_SKILL[config.kind], 'technique', precision >= 0.8, precision);
      }
    }
    if (!done) credited.current = false;
  }, [done]);

  if (done) {
    const s = stats.current;
    const precision = s.notes ? Math.round(((s.notes - s.errors) / s.notes) * 100) : 0;
    const avg = s.times.length ? (s.times.reduce((a, x) => a + x, 0) / s.times.length).toFixed(1) : '–';
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={type.display}>Temps écoulé</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statNum}>{s.targets}</Text><Text style={type.small}>trouvé{s.targets > 1 ? 's' : ''}</Text></View>
          <View style={styles.stat}><Text style={styles.statNum}>{precision} %</Text><Text style={type.small}>précision</Text></View>
          <View style={styles.stat}><Text style={styles.statNum}>{avg} s</Text><Text style={type.small}>par cible</Text></View>
        </View>
        <Text style={type.body}>{precision >= 90 ? 'Très solide : augmente la difficulté (zone, altérations, nouveaux intervalles).' : 'Refais une série : la vitesse vient avec la répétition.'}</Text>
        <Button label="Recommencer" onPress={() => { stats.current = { targets: 0, errors: 0, notes: 0, t0: Date.now(), times: [] }; setLeft(config.minutes * 60); setDone(false); next(); }} />
        <Button variant="texte" color={colors.inkSoft} label="Retour à la pratique" onPress={onExit} />
      </ScrollView>
    );
  }

  const fretsNeeded = 12;
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <View style={styles.top}>
        <Text style={styles.kind}>{KIND_LABEL[config.kind]}</Text>
        <Text style={styles.timer}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</Text>
        <Button small variant="texte" color={colors.inkSoft} label="Arrêter" onPress={() => setDone(true)} />
      </View>
      <View style={[styles.target, flash ? { borderColor: flash } : null]} accessibilityLiveRegion="polite">
        <Text style={styles.title}>{target.title}</Text>
        <Text style={type.body}>{target.sub}</Text>
        {target.positions ? (
          <Text style={styles.count}>{prog.found.length} / {target.positions.length}</Text>
        ) : target.sequence.length > 1 ? (
          <View style={styles.seq}>
            {target.sequence.map((pc, i) => (
              <Text key={i} style={[styles.seqItem, i < prog.index && { color: colors.success }, i === prog.index && styles.seqNext]}>
                {config.kind === 'notes' ? pcName(60 + pc) : i < prog.index || config.showFingerings ? pcName(60 + pc) : '•'}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      {useMicInput ? (
        <Text style={[type.small, { textAlign: 'center' }]}>{micError ?? (liveMidi !== null ? `J'entends : ${pcName(liveMidi)}` : 'Joue sur ton instrument, près du téléphone.')}</Text>
      ) : null}
      {instrument === 'guitare'
        ? <Fretboard frets={fretsNeeded} labels="aucun" showTonic={false} highlights={highlights} marks={marks} zone={target.zone}
            onPress={(m) => { if (!target.positions) onPlayed(m); }} onPressPos={(pos) => { if (target.positions) onPlayed(pos.midi, pos); }} />
        : <Piano startMidi={48} octaves={3} labels="aucun" showTonic={false} highlights={highlights} onPress={(m) => onPlayed(m)} />}
      <Text style={type.small}>Erreurs sur cette cible : {prog.errors}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kind: { color: colors.accent, fontWeight: '900' },
  timer: { fontSize: 20, fontWeight: '900', color: colors.ink, fontVariant: ['tabular-nums'] },
  target: { backgroundColor: colors.card, borderRadius: 20, padding: 18, gap: 6, borderWidth: 3, borderColor: colors.line, alignItems: 'center' },
  title: { fontSize: 34, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  count: { fontSize: 18, fontWeight: '800', color: colors.inkSoft },
  seq: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  seqItem: { fontSize: 18, fontWeight: '800', color: colors.inkSoft },
  seqNext: { color: colors.ink, textDecorationLine: 'underline' },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '900', color: colors.ink },
});

void positionsOf;
