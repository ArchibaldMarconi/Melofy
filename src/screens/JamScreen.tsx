// Jam : un accompagnement en boucle pour improviser. Visage simple : la grille, un bouton, l'instrument avec les
// notes de la gamme en couleur et celles de l'accord en cours en plus fort (viser les notes de l'accord).
// Réglages (grille, style, tonalité, tempo) sur demande.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { audio } from '../audio/RNAudioEngine';
import { buildJam, chordPcs, JAM_KEYS, PROGRESSIONS, STYLES } from '../engine/jam';
import { KEY_LABEL, mod12 } from '../engine/music';
import { useUserStore } from '../store/useUserStore';
import { Button } from '../components/Button';
import { Fretboard } from '../components/Fretboard';
import { Piano } from '../components/Piano';
import { colors, type } from '../theme';

const ACCENT = colors.accent;

export function JamScreen() {
  const instrument = useUserStore((s) => s.settings.instrument);
  const focused = useIsFocused();
  const [progId, setProgId] = useState('pop');
  const [styleId, setStyleId] = useState('pop');
  const [key, setKey] = useState('C');
  const [tempo, setTempo] = useState(STYLES[0].tempo);
  const [more, setMore] = useState(false);
  const [playing, setPlaying] = useState(false);
  // la boucle se calcule avant de jouer (un moment, en JS) : le bouton attend, il ne relance pas
  const [loading, setLoading] = useState(false);
  const [bar, setBar] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const player = useRef<{ stop: () => void } | null>(null);
  const t0 = useRef(0);
  // chaque lancement a son numéro : arrêter, relancer ou quitter l'écran rend les lancements en cours caducs, et un son
  // qui arrive quand même est coupé aussitôt (sinon les boucles s'empilaient, et l'une continuait écran fermé)
  const gen = useRef(0);

  const prog = PROGRESSIONS.find((p) => p.id === progId)!;
  const style = STYLES.find((s) => s.id === styleId)!;
  const keyPc = JAM_KEYS.find((k) => k.id === key)!.pc;
  const track = useMemo(() => buildJam(prog, style, keyPc, tempo, instrument), [prog, style, keyPc, tempo, instrument]);

  const stop = () => {
    gen.current++;
    player.current?.stop();
    player.current = null;
    setPlaying(false); setLoading(false); setBar(-1);
  };
  const play = async (tr: typeof track) => {
    stop();
    const my = gen.current;
    const stale = () => my !== gen.current;
    setLoading(true);
    setError(null);
    try {
      await audio.init();
      // laisse l'écran afficher « Préparation… » avant le calcul, qui occupe le JS un moment
      await new Promise((r) => setTimeout(r, 0));
      if (stale()) return;
      const data = audio.renderLayers(tr.layers, tr.tempo, tr.beats);
      if (stale()) return;
      t0.current = audio.now() + 120;
      const p = await audio.playRaw(data, true, 0.9);
      if (stale()) { p.stop(); return; }
      player.current = p;
      setPlaying(true);
    } catch {
      if (!stale()) setError('Le son n\'a pas pu démarrer : vérifie le volume et le mode silencieux, puis réessaie.');
    } finally {
      if (!stale()) setLoading(false);
    }
  };
  const start = () => play(track);
  // un réglage changé pendant la lecture (ou sa préparation) : la boucle repart avec le nouveau
  const change = (next: { progId?: string; styleId?: string; key?: string; tempo?: number }) => {
    const n = { progId, styleId, key, tempo, ...next };
    setProgId(n.progId); setStyleId(n.styleId); setKey(n.key); setTempo(n.tempo);
    const p = PROGRESSIONS.find((x) => x.id === n.progId)!;
    const s = STYLES.find((x) => x.id === n.styleId)!;
    const pc = JAM_KEYS.find((k) => k.id === n.key)!.pc;
    if ((playing || loading) && (p !== prog || s !== style || pc !== keyPc || n.tempo !== tempo)) play(buildJam(p, s, pc, n.tempo, instrument));
  };
  // quitter l'écran coupe la boucle
  useEffect(() => { if (!focused) return; return () => stop(); }, [focused]);
  useEffect(() => () => stop(), []);
  useEffect(() => {
    if (!playing) return;
    const beatMs = 60000 / track.tempo;
    const iv = setInterval(() => setBar(Math.floor(Math.max(0, audio.now() - t0.current) / (beatMs * 4)) % track.bars.length), 100);
    return () => clearInterval(iv);
  }, [playing, track]);

  const current = bar >= 0 ? prog.bars[bar % prog.bars.length] : prog.bars[0];
  const target = chordPcs(current, keyPc);
  const scale = prog.scale.map((s) => (keyPc + s) % 12);
  const hl: Record<number, string> = {};
  for (let m = 36; m <= 96; m++) {
    if (target.includes(mod12(m))) hl[m] = ACCENT;
    else if (scale.includes(mod12(m))) hl[m] = `${ACCENT}55`;
  }
  const shown = track.bars.slice(0, prog.bars.length);

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.chart} accessibilityLabel={`Grille : ${shown.join(', ')}`}>
          {shown.map((label, i) => (
            <View key={i} style={[styles.barBox, bar % prog.bars.length === i && playing && styles.barOn]}>
              <Text style={[styles.barText, bar % prog.bars.length === i && playing && { color: colors.onFill }]}>{label}</Text>
            </View>
          ))}
        </View>
        <Button label={loading ? 'Préparation…' : playing ? '■  Stop' : '▶  Jouer'} color={playing ? colors.danger : colors.primary} onPress={playing ? stop : start} disabled={loading} />
        {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
        <Pressable onPress={() => setMore((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: more }} style={styles.disclosure}>
          <Text style={styles.disclosureText}>{more ? 'Moins de réglages ▴' : `${style.label} · ${prog.label} · ${KEY_LABEL[key]} · ${tempo} BPM ▾`}</Text>
        </Pressable>
        {more ? (
          <View style={styles.card}>
            <Text style={type.small}>Grille</Text>
            {PROGRESSIONS.map((p) => (
              <Pressable key={p.id} onPress={() => change({ progId: p.id })} accessibilityRole="radio" accessibilityState={{ checked: p.id === progId }} style={[styles.option, p.id === progId && styles.optionOn]}>
                <Text style={[type.body, { fontWeight: '800' }, p.id === progId && { color: colors.onFill }]}>{p.label}</Text>
                <Text style={[type.small, p.id === progId && { color: colors.onPrimarySoft }]}>{p.line}</Text>
              </Pressable>
            ))}
            <Text style={type.small}>Style</Text>
            <View style={styles.row}>
              {STYLES.map((s) => <Chip key={s.id} label={s.label} on={s.id === styleId} onPress={() => change({ styleId: s.id, tempo: s.tempo })} />)}
            </View>
            <Text style={type.small}>Tonalité</Text>
            <View style={styles.row}>
              {JAM_KEYS.map((k) => <Chip key={k.id} label={KEY_LABEL[k.id]} on={k.id === key} onPress={() => change({ key: k.id })} />)}
            </View>
            <Text style={type.small}>Tempo</Text>
            <View style={styles.row}>
              {[-10, -5, 5, 10].map((d) => <Chip key={d} label={d > 0 ? `+${d}` : `${d}`} on={false} onPress={() => change({ tempo: Math.max(50, Math.min(180, tempo + d)) })} />)}
              <Text style={[type.body, { fontWeight: '900', alignSelf: 'center' }]}>{tempo} BPM</Text>
            </View>
          </View>
        ) : null}
        <Text style={type.small}>En couleur : la {prog.scaleLabel}{'. En plus fort : les notes de l\'accord en cours, à viser sur les temps forts.'}</Text>
        {instrument === 'guitare'
          ? <Fretboard frets={12} tonic={45} labels="notes" showTonic={false} highlights={hl} onPress={(m) => audio.playNote(m, instrument)} />
          : <Piano startMidi={48} octaves={2} labels="notes" showTonic={false} highlights={hl} onPress={(m) => audio.playNote(m, instrument)} />}
        <Text style={type.small}>{'Joue sur ton instrument par-dessus : l\'écran sert de carte. Commence par des phrases courtes, et finis-les sur une note forte.'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && { backgroundColor: ACCENT }]}>
      <Text style={[styles.chipText, { color: on ? colors.onFill : ACCENT }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  pad: { padding: 20, gap: 12, paddingBottom: 48 },
  chart: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  barBox: { width: '23%', flexGrow: 1, minHeight: 54, borderRadius: 12, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  barOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  barText: { fontWeight: '900', fontSize: 16, color: colors.ink },
  disclosure: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  disclosureText: { fontSize: 14, fontWeight: '800', color: colors.inkSoft, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 8 },
  option: { borderRadius: 12, padding: 10, backgroundColor: colors.paper },
  optionOn: { backgroundColor: colors.primary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 2, borderColor: ACCENT, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  chipText: { fontWeight: '800', fontSize: 13 },
});
