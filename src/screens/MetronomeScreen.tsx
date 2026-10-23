// Page 4 : Métronome. Tempo saisi au clavier (20 à 300), signatures simples et composées, roue centrale
// (tap tempo au centre, glisser vers le haut ou le bas pour accélérer ou ralentir), automate d'accélération,
// presets, swing et travail du sens du rythme (mesures muettes).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { audio } from '../audio/RNAudioEngine';
import { Button } from '../components/Button';
import {
  automationEndBar, buildTrack, clampTempo, loopBars, positionAt, SIGNATURES, signatureById, tapTempo, TEMPO_MAX, TEMPO_MIN,
  type Automation, type MetronomeConfig, type Track,
} from '../engine/metronome';
import { useToolsStore } from '../store/useToolsStore';
import { colors, type } from '../theme';

const ACCENT = colors.accent;
/** durée maximale d'un segment audio rendu d'un coup (automate) : au-delà, on enchaîne le segment suivant */
const SEGMENT_S = 60;

function Stepper({ label, value, onChange, step = 1, min, max, suffix = '' }: { label: string; value: number; onChange: (v: number) => void; step?: number; min: number; max: number; suffix?: string }) {
  return (
    <View style={styles.stepper}>
      <Text style={[type.small, { flex: 1 }]}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} : moins`} onPress={() => onChange(Math.max(min, value - step))} style={styles.stepBtn}><Text style={styles.stepTxt}>−</Text></Pressable>
      <Text style={styles.stepVal}>{value > 0 && label.startsWith('Pas') ? '+' : ''}{value}{suffix}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} : plus`} onPress={() => onChange(Math.min(max, value + step))} style={styles.stepBtn}><Text style={styles.stepTxt}>+</Text></Pressable>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress} style={[styles.chip, on && { backgroundColor: ACCENT }]}>
      <Text style={[styles.chipTxt, { color: on ? colors.onFill : ACCENT }]}>{label}</Text>
    </Pressable>
  );
}

export function MetronomeScreen() {
  const st = useToolsStore();
  const focused = useIsFocused();
  const [running, setRunning] = useState(false);
  const [tempoText, setTempoText] = useState(String(st.tempo));
  const [auto, setAuto] = useState<{ on: boolean; start: number; step: number; everyBars: number; ceiling: string }>({ on: false, start: st.tempo, step: 5, everyBars: 4, ceiling: '' });
  const [pos, setPos] = useState({ bar: 0, beat: -1, tempo: st.tempo });
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const sig = signatureById(st.signature);

  useEffect(() => { setTempoText(String(st.tempo)); }, [st.tempo]);
  useEffect(() => { if (!auto.on) setAuto((a) => ({ ...a, start: st.tempo })); }, [st.tempo]); // eslint-disable-line react-hooks/exhaustive-deps

  const automation: Automation | undefined = auto.on && auto.step ? { step: auto.step, everyBars: auto.everyBars, ceiling: auto.ceiling ? clampTempo(Number(auto.ceiling)) : undefined } : undefined;
  const config: MetronomeConfig = useMemo(() => ({
    tempo: auto.on ? auto.start : st.tempo, signature: st.signature, swing: st.swing, silentBars: st.silentBars, automation,
  }), [auto.on, auto.start, st.tempo, st.signature, st.swing, st.silentBars, automation?.step, automation?.everyBars, automation?.ceiling]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- lecture : segments rendus à l'avance, enchaînés ; l'affichage suit la piste ----------
  const play = useRef<{ stop: () => void } | null>(null);
  const seg = useRef<{ track: Track; startClock: number; fromBar: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gen = useRef(0);

  const stopAll = useCallback(() => {
    gen.current++;
    timers.current.forEach(clearTimeout); timers.current = [];
    play.current?.stop(); play.current = null; seg.current = null;
    setPos((p) => ({ ...p, beat: -1 }));
  }, []);

  /** prépare un segment : la piste et son audio (calculés à l'avance pour enchaîner sans trou) */
  const prepare = useCallback((c: MetronomeConfig, fromBar: number) => {
    const endBar = automationEndBar(c);
    const automating = !!c.automation && fromBar < endBar;
    let track: Track;
    if (!automating) {
      // tempo fixe (ou automate terminé) : une boucle longue, sans raccord audible
      const finalTempo = c.automation ? buildTrack(c, 1, fromBar).barTempos[0] : c.tempo;
      const fixed: MetronomeConfig = { ...c, tempo: finalTempo, automation: undefined };
      track = buildTrack(fixed, loopBars(fixed));
    } else {
      // automate : les mesures jusqu'à ~60 s (ou jusqu'au plafond), puis le segment suivant
      let bars = 0; let dur = 0;
      while (fromBar + bars < endBar && dur < SEGMENT_S) { dur += (sig.beats * 60) / buildTrack(c, 1, fromBar + bars).barTempos[0]; bars++; }
      track = buildTrack(c, Math.max(1, bars), fromBar);
    }
    return { track, data: audio.renderClicks(track.clicks, track.durS), loop: !automating, fromBar };
  }, [sig.beats]);

  const launch = useCallback(async (c: MetronomeConfig, prep: ReturnType<typeof prepare>, g: number) => {
    const p = await audio.playRaw(prep.data, prep.loop);
    if (g !== gen.current) { p.stop(); return; }
    const prev = play.current;
    play.current = p;
    const startClock = audio.now() + 60;
    seg.current = { track: prep.track, startClock, fromBar: prep.fromBar };
    if (prev) setTimeout(() => prev.stop(), 120);
    if (!prep.loop) {
      const next = prep.fromBar + prep.track.barTempos.length;
      let nextPrep: ReturnType<typeof prepare> | null = null;
      // le segment suivant est calculé 3 s avant la fin, puis lancé pile à la fin de celui-ci
      timers.current.push(setTimeout(() => { if (g === gen.current) nextPrep = prepare(c, next); }, Math.max(0, prep.track.durS * 1000 - 3000)));
      timers.current.push(setTimeout(() => {
        if (g !== gen.current) return;
        launch(c, nextPrep ?? prepare(c, next), g).catch(() => {});
      }, prep.track.durS * 1000 - 70));
    }
  }, [prepare]);

  const start = useCallback(() => {
    stopAll();
    const g = gen.current;
    setRunning(true);
    launch(config, prepare(config, 0), g).catch(() => setRunning(false));
  }, [config, launch, prepare, stopAll]);

  // changement de réglage en cours de lecture : on relance (légèrement différé, le temps de finir le geste)
  const restart = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!running) return;
    if (restart.current) clearTimeout(restart.current);
    restart.current = setTimeout(start, 250);
    return () => { if (restart.current) clearTimeout(restart.current); };
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!focused && running) { stopAll(); setRunning(false); } }, [focused]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopAll(), [stopAll]);

  // affichage du temps en cours
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      const s = seg.current;
      if (!s) return;
      const el = (audio.now() - s.startClock) / 1000;
      if (el < 0) return;
      const p = positionAt(s.track, el);
      setPos({ bar: s.fromBar + p.bar, beat: p.beat, tempo: p.tempo });
    }, 30);
    return () => clearInterval(iv);
  }, [running]);

  const toggle = () => { if (running) { stopAll(); setRunning(false); } else start(); };

  // ---------- roue : tap tempo au centre, glisser vers le haut / le bas ----------
  const taps = useRef<number[]>([]);
  const onTap = () => {
    taps.current = [...taps.current, Date.now()].slice(-8);
    const t = tapTempo(taps.current);
    if (t) st.set({ tempo: t });
  };
  const drag = useRef({ base: st.tempo });
  const tempoRef = useRef(st.tempo);
  tempoRef.current = st.tempo;
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
    onPanResponderGrant: () => { drag.current.base = tempoRef.current; },
    onPanResponderMove: (_, g) => { st.set({ tempo: clampTempo(drag.current.base - g.dy / 3) }); },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const commitTempo = () => {
    const n = Number(tempoText);
    if (Number.isFinite(n) && n > 0) st.set({ tempo: clampTempo(n) }); else setTempoText(String(st.tempo));
  };

  const W = 250; const R = 105;
  const shownTempo = running ? pos.tempo : config.tempo;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <View style={styles.tempoBox}>
            <TextInput value={tempoText} onChangeText={setTempoText} onBlur={commitTempo} onSubmitEditing={commitTempo} keyboardType="number-pad" returnKeyType="done"
              accessibilityLabel="Tempo en BPM" style={styles.tempoInput} maxLength={3} selectTextOnFocus />
            <Text style={styles.bpm}>BPM</Text>
          </View>
          <Button label={running ? '■  Stop' : '▶  Démarrer'} onPress={toggle} color={running ? colors.danger : colors.primary} style={{ flex: 1 }} />
        </View>
        <Text style={type.small}>Plage {TEMPO_MIN} à {TEMPO_MAX} BPM{sig.compound ? ' · en mesure composée, le tempo compte les noires pointées' : ''}.</Text>

        {/* roue centrale */}
        <View style={{ alignItems: 'center', marginVertical: 6 }} {...pan.panHandlers} accessibilityHint="Glisse vers le haut pour accélérer, vers le bas pour ralentir">
          <Svg width={W} height={W}>
            <Circle cx={W / 2} cy={W / 2} r={R + 14} fill={colors.card} stroke={colors.line} strokeWidth={2} />
            {Array.from({ length: sig.beats }, (_, k) => {
              const a = (-Math.PI / 2) + (2 * Math.PI * k) / sig.beats;
              const on = running && pos.beat === k;
              return <Circle key={k} cx={W / 2 + R * Math.cos(a)} cy={W / 2 + R * Math.sin(a)} r={k === 0 ? 13 : 10}
                fill={on ? (k === 0 ? colors.danger : ACCENT) : colors.paper} stroke={k === 0 ? colors.danger : ACCENT} strokeWidth={2} />;
            })}
          </Svg>
          <View pointerEvents="none" style={[styles.center, { width: W, height: W }]}>
            <Text style={styles.centerTempo}>{shownTempo}</Text>
            <Text style={type.small}>{running && config.silentBars && pos.bar % 4 >= 1 && pos.bar % 4 <= config.silentBars ? 'silence : garde le tempo' : 'touche ici : Tap Tempo'}</Text>
          </View>
          <Pressable onPress={onTap} accessibilityRole="button" accessibilityLabel="Tap tempo" style={[styles.tapZone, { width: W * 0.5, height: W * 0.5, top: W * 0.25, left: '50%', marginLeft: -W * 0.25 }]} />
        </View>
        <View style={styles.row}>
          {[-5, -1, 1, 5].map((d) => <Button key={d} small variant="contour" color={ACCENT} label={d > 0 ? `+${d}` : `${d}`} onPress={() => st.set({ tempo: clampTempo(st.tempo + d) })} style={{ flex: 1 }} />)}
        </View>

        {/* signature */}
        <Text style={styles.section}>Signature</Text>
        {([2, 3, 4] as const).map((g) => (
          <View key={g} style={styles.sigRow}>
            <Text style={[type.small, { width: 70 }]}>{g} temps</Text>
            {SIGNATURES.filter((s) => s.group === g).map((s) => <Chip key={s.id} label={`${s.label}${s.compound ? ' ·c' : ''}`} on={st.signature === s.id} onPress={() => st.set({ signature: s.id })} />)}
          </View>
        ))}
        <Text style={type.small}>Simples : 2/2, 2/4, 3/2, 3/4, 4/2, 4/4. Composées (·c) : 6/8, 9/8, 12/8, chaque temps se divise en trois.</Text>

        {/* swing */}
        <Text style={styles.section}>Swing</Text>
        <Stepper label={st.swing <= 50 ? 'Droit (straight)' : st.swing >= 67 ? 'Swing appuyé' : 'Swing léger'} value={st.swing} min={50} max={75} step={1} suffix=" %" onChange={(v) => st.set({ swing: v })} />
        <View style={styles.row}>{[50, 58, 66, 75].map((v) => <Chip key={v} label={`${v} %`} on={st.swing === v} onPress={() => st.set({ swing: v })} />)}</View>
        {sig.compound ? <Text style={type.small}>En mesure composée, la division est déjà ternaire : le swing ne change rien.</Text> : <Text style={type.small}>Au-dessus de 50 %, la croche du « et » sonne doucement, retardée selon le taux choisi.</Text>}

        {/* sens du rythme */}
        <Text style={styles.section}>Sens du rythme</Text>
        <Text style={type.small}>Le métronome se tait pendant des mesures, sur un cycle de quatre : continue à jouer et retombe sur le temps avec lui.</Text>
        <View style={styles.row}>
          {([0, 1, 2, 3] as const).map((k) => <Chip key={k} label={k ? `${k} muette${k > 1 ? 's' : ''} sur 4` : 'Désactivé'} on={st.silentBars === k} onPress={() => st.set({ silentBars: k })} />)}
        </View>

        {/* automate */}
        <Text style={styles.section}>Automate</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Chip label="Désactivé" on={!auto.on} onPress={() => setAuto((a) => ({ ...a, on: false }))} />
            <Chip label="Activé" on={auto.on} onPress={() => setAuto((a) => ({ ...a, on: true, start: st.tempo }))} />
          </View>
          {auto.on ? (
            <>
              <Stepper label="Tempo de départ" value={auto.start} min={TEMPO_MIN} max={TEMPO_MAX} step={1} onChange={(v) => setAuto((a) => ({ ...a, start: v }))} />
              <Stepper label="Pas (BPM)" value={auto.step} min={-20} max={20} step={1} onChange={(v) => setAuto((a) => ({ ...a, step: v }))} />
              <Stepper label="Toutes les (mesures)" value={auto.everyBars} min={1} max={32} step={1} onChange={(v) => setAuto((a) => ({ ...a, everyBars: v }))} />
              <View style={styles.stepper}>
                <Text style={[type.small, { flex: 1 }]}>Tempo plafond (facultatif)</Text>
                <TextInput value={auto.ceiling} onChangeText={(t) => setAuto((a) => ({ ...a, ceiling: t.replace(/\D/g, '') }))} keyboardType="number-pad" placeholder="—" placeholderTextColor={colors.inkSoft}
                  accessibilityLabel="Tempo plafond" style={styles.ceiling} maxLength={3} />
              </View>
              <Text style={type.small}>{auto.step >= 0 ? 'Accélère' : 'Ralentit'} de {Math.abs(auto.step)} BPM toutes les {auto.everyBars} mesure{auto.everyBars > 1 ? 's' : ''}{auto.ceiling ? `, puis se stabilise à ${clampTempo(Number(auto.ceiling))} BPM` : ''}.</Text>
            </>
          ) : null}
        </View>

        {/* presets */}
        <Text style={styles.section}>Presets</Text>
        <Button label="★  Save Preset" onPress={() => { setTitle(`${st.tempo} BPM · ${st.signature}`); setSaving(true); }} color={colors.gold} />
        {st.presets.length ? st.presets.map((p) => (
          <Pressable key={p.id} onPress={() => { st.set({ tempo: p.tempo, signature: p.signature, swing: p.swing }); setAuto(p.automation ? { on: true, start: p.tempo, step: p.automation.step, everyBars: p.automation.everyBars, ceiling: p.automation.ceiling ? String(p.automation.ceiling) : '' } : (a) => ({ ...a, on: false })); }}
            accessibilityRole="button" accessibilityLabel={`Preset ${p.title}`} style={styles.preset}>
            <View style={{ flex: 1 }}>
              <Text style={type.body}>{p.title}</Text>
              <Text style={type.small}>{p.tempo} BPM · {p.signature}{p.swing > 50 ? ` · swing ${p.swing} %` : ''}</Text>
            </View>
            {p.automation ? <Text style={[styles.arrow, { color: p.automation.step >= 0 ? colors.success : colors.warn }]}>{p.automation.step >= 0 ? '↗' : '↘'}</Text> : null}
            <Pressable onPress={() => st.deletePreset(p.id)} accessibilityRole="button" accessibilityLabel={`Supprimer ${p.title}`} hitSlop={10}><Text style={styles.del}>✕</Text></Pressable>
          </Pressable>
        )) : <Text style={type.small}>Aucun preset enregistré.</Text>}
      </ScrollView>

      <Modal visible={saving} transparent animationType="fade" onRequestClose={() => setSaving(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={type.title}>Nom du preset</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.titleInput} autoFocus accessibilityLabel="Nom du preset" />
            <View style={styles.row}>
              <Button variant="contour" label="Annuler" onPress={() => setSaving(false)} style={{ flex: 1 }} />
              <Button label="Enregistrer" onPress={() => {
                st.savePreset({ title: title.trim() || `${st.tempo} BPM`, tempo: auto.on ? auto.start : st.tempo, signature: st.signature, swing: st.swing, automation });
                setSaving(false);
              }} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  pad: { padding: 20, gap: 10, paddingBottom: 48 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tempoBox: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexShrink: 0 },
  tempoInput: { fontSize: 40, fontWeight: '900', color: colors.ink, width: 96, borderBottomWidth: 2, borderColor: colors.line, paddingVertical: 2 },
  bpm: { fontSize: 14, fontWeight: '800', color: colors.inkSoft },
  tapZone: { position: 'absolute', borderRadius: 999 },
  center: { position: 'absolute', top: 0, alignItems: 'center', justifyContent: 'center' },
  centerTempo: { fontSize: 52, fontWeight: '900', color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sigRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 10 },
  chip: { borderWidth: 2, borderColor: ACCENT, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  chipTxt: { fontWeight: '800', fontSize: 13 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  stepBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, borderColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 22, fontWeight: '900', color: ACCENT },
  stepVal: { minWidth: 56, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.ink },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 8 },
  ceiling: { width: 70, fontSize: 17, fontWeight: '800', color: colors.ink, borderWidth: 2, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, textAlign: 'center' },
  preset: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 14, padding: 12 },
  arrow: { fontSize: 22, fontWeight: '900' },
  del: { fontSize: 18, color: colors.inkSoft, paddingHorizontal: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.card, borderRadius: 20, padding: 20, gap: 14 },
  titleInput: { fontSize: 17, color: colors.ink, borderWidth: 2, borderColor: colors.line, borderRadius: 12, padding: 10 },
});
