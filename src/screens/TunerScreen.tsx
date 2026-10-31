// Page 5 : Accordeur. Jauge de −50 à +50 cents ; en mode guidé (tout sauf chromatique), les cordes en sphères :
// la détection se verrouille sur une corde et passe seule à la suivante une fois celle-ci juste. Toucher une sphère
// la verrouille et joue la note cible. Le dernier accordage choisi est retenu.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import { audio } from '../audio/RNAudioEngine';
import { micErrorMessage } from '../audio/useMic';
import { centsOff, HOLD_MS, IN_TUNE_CENTS, median, nearest, nextString, presetById, stringLabel, TUNER_PRESETS } from '../engine/tuner';
import { freqToMidi, noteName } from '../engine/music';
import { useToolsStore } from '../store/useToolsStore';
import { useUserStore } from '../store/useUserStore';
import { TUNINGS } from '../tuning';
import { colors, type } from '../theme';

const GATE = 0.012;
/** accordages de guitare : une seule source, l'accordage de l'élève (réglages), que suivent aussi le manche et les exercices */
const isGuitarPreset = (id: string) => id === 'guitare' || id in TUNINGS;

function Gauge({ cents, active }: { cents: number | null; active: boolean }) {
  const W = 320; const H = 172; const cx = W / 2; const cy = 152; const r = 108;
  const ang = (c: number) => Math.PI + ((Math.max(-50, Math.min(50, c)) + 50) / 100) * Math.PI;
  const pt = (c: number, rr: number) => [cx + rr * Math.cos(ang(c)), cy + rr * Math.sin(ang(c))];
  const ok = cents !== null && Math.abs(cents) <= IN_TUNE_CENTS;
  const needle = cents === null ? 0 : cents;
  const [nx, ny] = pt(needle, r - 8);
  return (
    <Svg width={W} height={H} accessibilityLabel={cents === null ? 'Aucune note détectée' : `${Math.round(cents)} cents`}>
      <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} stroke={colors.line} strokeWidth={14} fill="none" strokeLinecap="round" />
      {(() => { const [ax, ay] = pt(-IN_TUNE_CENTS, r); const [bx, by] = pt(IN_TUNE_CENTS, r); return <Path d={`M ${ax} ${ay} A ${r} ${r} 0 0 1 ${bx} ${by}`} stroke={colors.success} strokeWidth={14} fill="none" />; })()}
      {[-50, -25, 0, 25, 50].map((c) => { const [x1, y1] = pt(c, r + 12); const [x2, y2] = pt(c, r + 22); const [tx, ty] = pt(c, r + 34);
        return <React.Fragment key={c}><Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.inkSoft} strokeWidth={2} /><SvgText x={tx} y={ty + 4} fontSize={11} fill={colors.inkSoft} textAnchor="middle">{c > 0 ? `+${c}` : c}</SvgText></React.Fragment>; })}
      {active ? <Line x1={cx} y1={cy} x2={nx} y2={ny} stroke={ok ? colors.success : colors.danger} strokeWidth={4} strokeLinecap="round" /> : null}
      <Circle cx={cx} cy={cy} r={8} fill={colors.ink} />
    </Svg>
  );
}

export function TunerScreen() {
  const focused = useIsFocused();
  const stored = useToolsStore((s) => s.tuning);
  const setTools = useToolsStore((s) => s.set);
  const instrument = useUserStore((s) => s.settings.instrument);
  const fretTuning = useUserStore((s) => s.settings.tuning) ?? 'standard';
  const setSettings = useUserStore((s) => s.setSettings);
  const micGate = useUserStore((s) => s.settings.micGate);
  const gate = micGate ? Math.min(micGate, 0.05) : GATE;
  const gateRef = useRef(gate);
  const tuningId = stored && !isGuitarPreset(stored) ? stored
    : instrument === 'guitare' ? (fretTuning === 'standard' ? 'guitare' : fretTuning)
    : stored || 'chromatique';
  const choose = (id: string) => {
    if (instrument === 'guitare' && isGuitarPreset(id)) { setSettings({ tuning: id === 'guitare' ? 'standard' : id }); setTools({ tuning: '' }); }
    else setTools({ tuning: id });
  };
  const preset = presetById(tuningId);
  const chromatic = preset.strings.length === 0;
  const [menu, setMenu] = useState(false);
  const [lock, setLock] = useState(0);
  const [done, setDone] = useState<boolean[]>(() => preset.strings.map(() => false));
  const [reading, setReading] = useState<{ freq: number; cents: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hist = useRef<number[]>([]);
  const inTuneSince = useRef<number | null>(null);
  // la note de référence : l'écoute est suspendue le temps qu'elle sonne (sur iPhone, le micro ouvert coupe tout son)
  const [paused, setPaused] = useState(false);
  const resume = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(resume.current), []);
  const state = useRef({ lock, done, preset });
  // le micro lit le dernier rendu validé
  useLayoutEffect(() => { gateRef.current = gate; state.current = { lock, done, preset }; });

  // autre accordage : on repart de la première corde (ajusté au rendu ; l'historique du micro dans l'effet)
  const [shownTuning, setShownTuning] = useState(tuningId);
  if (shownTuning !== tuningId) {
    setShownTuning(tuningId);
    setLock(0); setDone(preset.strings.map(() => false)); setReading(null);
  }
  useEffect(() => { hist.current = []; }, [tuningId]);

  // chaque mise en route du micro repart sans l'erreur précédente
  const [micFor, setMicFor] = useState(focused);
  if (micFor !== focused) {
    setMicFor(focused);
    if (focused) setError(null);
  }

  useEffect(() => {
    if (!focused || paused) return;
    let alive = true;
    audio.startMic((f) => {
      if (!alive) return;
      if (f.freq === null || f.rms < gateRef.current) { inTuneSince.current = null; return; }
      hist.current = [...hist.current, f.freq].slice(-5);
      const freq = median(hist.current);
      const { lock: l, done: d, preset: p } = state.current;
      if (!p.strings.length) { setReading({ freq, cents: nearest(freq).cents }); return; }
      const target = p.strings[l];
      // une note très loin de la corde verrouillée (plus d'une quarte) n'est pas affichée : on attend la bonne corde
      if (Math.abs(freqToMidi(freq) - target) > 5) { setReading(null); inTuneSince.current = null; return; }
      const cents = centsOff(freq, target);
      setReading({ freq, cents });
      if (Math.abs(cents) <= IN_TUNE_CENTS) {
        if (inTuneSince.current === null) inTuneSince.current = f.tMs;
        else if (f.tMs - inTuneSince.current >= HOLD_MS && !d[l]) {
          const nd = d.map((x, i) => (i === l ? true : x));
          setDone(nd);
          inTuneSince.current = null;
          hist.current = [];
          const nx = nextString(nd, l);
          if (nx !== null) setTimeout(() => { setLock(nx); setReading(null); }, 500);
        }
      } else inTuneSince.current = null;
    }, { frame: 4096, minHz: 28 }).catch((e: Error) => setError(e.message === 'micro_refuse' ? 'Le micro est refusé. Autorise-le pour Expo Go (ou Melofy) dans Réglages › Confidentialité › Micro.' : micErrorMessage(e.message)));
    return () => { alive = false; audio.stopMic(); };
  }, [focused, paused]);

  const pick = (i: number) => {
    setLock(i);
    setDone((d) => d.map((x, k) => (k === i ? false : x)));
    setReading(null);
    hist.current = [];
    // la note cible, comme référence : le micro se coupe d'abord (sinon iOS la rend muette), puis reprend après
    audio.stopMic();
    setPaused(true);
    clearTimeout(resume.current);
    resume.current = setTimeout(() => setPaused(false), 1600);
    audio.playNote(preset.strings[i], instrument === 'piano' ? 'piano' : 'guitare');
  };

  const cents = reading?.cents ?? null;
  const ok = cents !== null && Math.abs(cents) <= IN_TUNE_CENTS;
  const allDone = !chromatic && done.length > 0 && done.every(Boolean);
  const big = chromatic ? (reading ? nearest(reading.freq).name.replace(/-?\d+$/, '') : '–') : stringLabel(preset.strings[lock]);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel={`Accordage : ${preset.label}. Changer`} style={styles.select}>
          <View style={{ flex: 1 }}>
            <Text style={type.small}>{preset.group}</Text>
            <Text style={type.title}>{preset.label}</Text>
          </View>
          <Text style={styles.chev}>▾</Text>
        </Pressable>

        {!chromatic ? (
          <View style={styles.spheres}>
            {preset.strings.map((m, i) => {
              const isLock = i === lock;
              const bg = done[i] ? colors.success : isLock ? colors.accent : colors.card;
              return (
                <Pressable key={i} onPress={() => pick(i)} accessibilityRole="button" accessibilityLabel={`Corde ${i + 1}, ${noteName(m)}${done[i] ? ', accordée' : ''}. Toucher pour la verrouiller et l'entendre`}
                  style={[styles.sphere, { backgroundColor: bg, borderColor: isLock ? colors.accent : done[i] ? colors.success : colors.line }]}>
                  <Text style={[styles.sphereTxt, { color: done[i] || isLock ? colors.onFill : colors.ink }]}>{stringLabel(m)}</Text>
                  <Text style={[styles.sphereOct, { color: done[i] || isLock ? colors.onFill : colors.inkSoft }]}>{Math.floor(m / 12) - 1}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={[styles.note, { color: ok ? colors.success : colors.ink }]}>{big}</Text>
          <Gauge cents={cents} active={!!reading} />
          <Text style={[styles.cents, { color: ok ? colors.success : colors.inkSoft }]}>
            {reading ? `${cents! > 0 ? '+' : ''}${Math.round(cents!)} cents · ${reading.freq.toFixed(1)} Hz` : error ? '' : 'Joue une note…'}
          </Text>
          {!chromatic && reading && !ok ? <Text style={type.body}>{cents! < 0 ? 'Trop bas : tends la corde' : 'Trop haut : détends la corde'}</Text> : null}
          {ok && !chromatic ? <Text style={[type.body, { color: colors.success, fontWeight: '800' }]}>Juste ! Tiens la note…</Text> : null}
          {allDone ? <Text style={[type.title, { color: colors.success }]}>Toutes les cordes sont accordées ✓</Text> : null}
        </View>

        {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
        <Text style={type.small}>
          {chromatic
            ? 'Mode chromatique : l\'accordeur affiche la note la plus proche et l\'écart en cents.'
            : 'Mode guidé : joue la corde en violet. Quand elle reste juste un instant, elle passe au vert et l\'accordeur passe à la suivante. Touche une sphère pour choisir une corde et entendre sa note.'}
        </Text>
      </ScrollView>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.modalBg} onPress={() => setMenu(false)}>
          <View style={styles.modal}>
            <ScrollView>
              {TUNER_PRESETS.map((p, i) => (
                <View key={p.id}>
                  {i === 0 || TUNER_PRESETS[i - 1].group !== p.group ? <Text style={[type.small, { marginTop: 10 }]}>{p.group}</Text> : null}
                  <Pressable onPress={() => { choose(p.id); setMenu(false); }} accessibilityRole="radio" accessibilityState={{ checked: p.id === tuningId }} style={styles.option}>
                    <Text style={[type.body, p.id === tuningId && { fontWeight: '800', color: colors.accent }]}>{p.label}</Text>
                    <Text style={type.small}>{p.strings.map(stringLabel).join(' ')}</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  pad: { padding: 20, gap: 16, paddingBottom: 48 },
  select: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.line },
  chev: { fontSize: 22, color: colors.inkSoft, fontWeight: '900' },
  spheres: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  sphere: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  sphereTxt: { fontSize: 15, fontWeight: '900' },
  sphereOct: { fontSize: 10, fontWeight: '700', marginTop: -2 },
  note: { fontSize: 64, fontWeight: '900' },
  cents: { fontSize: 16, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.card, borderRadius: 20, padding: 16, maxHeight: '75%' },
  option: { paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line },
});
