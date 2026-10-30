// « À toi d'essayer » : chercher avec les mains avant qu'on donne le nom. Rien n'est noté ; « Montre-moi » révèle.
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LessonTry } from '../content/deep/types';
import { audio } from '../audio/RNAudioEngine';
import { droneFor, mod12, pcName } from '../engine/music';
import { useUserStore } from '../store/useUserStore';
import { Button } from './Button';
import { Fretboard } from './Fretboard';
import { Piano } from './Piano';
import { TapPad } from './TapPad';
import { colors, type } from '../theme';

export function TryPanel({ t, accent, onDone }: { t: LessonTry; accent: string; onDone: () => void }) {
  const instrument = useUserStore((s) => s.settings.instrument);
  const prompt = instrument === 'guitare' && t.kind !== 'tap' && t.guitarPrompt ? t.guitarPrompt : t.prompt;
  return (
    <View style={styles.card}>
      <Text style={[styles.kicker, { color: accent }]}>{'À toi d\'essayer'}</Text>
      <Text style={type.title}>{prompt}</Text>
      {t.kind === 'tap' ? <TapTry t={t} accent={accent} onDone={onDone} /> : <NotesTry t={t} accent={accent} onDone={onDone} />}
    </View>
  );
}

/** jouer une suite (comparée en noms de notes), explorer librement, ou choisir les notes d'un accord */
function NotesTry({ t, accent, onDone }: { t: Extract<LessonTry, { kind: 'play' | 'build' }>; accent: string; onDone: () => void }) {
  const instrument = useUserStore((s) => s.settings.instrument);
  const [played, setPlayed] = useState<number[]>([]);
  const [state, setState] = useState<'try' | 'found' | 'shown'>('try');
  const [miss, setMiss] = useState<string | null>(null);
  // un accord peut être donné en classes de hauteur (0 = do … 11 = si) : on le joue autour du do du milieu
  const target = ((instrument === 'guitare' && t.kind === 'play' && t.guitarTarget) || t.target || []).map((x) => (x < 24 ? 60 + x : x));
  const build = t.kind === 'build';
  const drone = t.kind === 'play' ? t.drone : undefined;

  useEffect(() => {
    if (drone === undefined) return;
    audio.init().then(() => audio.startDrone(droneFor(drone)));
    return () => audio.stopDrone();
  }, [drone]);

  const pcs = (xs: number[]) => xs.map(mod12);
  const sameSet = (a: number[], b: number[]) => { const A = new Set(pcs(a)), B = new Set(pcs(b)); return A.size === B.size && [...A].every((x) => B.has(x)); };
  const endsWith = (xs: number[], tg: number[]) => xs.length >= tg.length && pcs(xs.slice(-tg.length)).every((p, i) => p === mod12(tg[i]));

  const press = (m: number) => {
    audio.playNote(m, instrument);
    setMiss(null);
    if (build) { setPlayed((xs) => (xs.some((x) => mod12(x) === mod12(m)) ? xs.filter((x) => mod12(x) !== mod12(m)) : [...xs, m])); return; }
    const next = [...played, m].slice(-24);
    setPlayed(next);
    if (state !== 'try') return;
    if (target.length && endsWith(next, target)) setState('found');
    if (!target.length && next.length >= (t.kind === 'play' ? t.minNotes ?? 4 : 4)) setState('found');
  };
  const check = () => {
    if (sameSet(played, target)) { setState('found'); audio.play(played.map((m) => ({ midi: m, start: 0, dur: 1.6 })), { tempo: 80, instrument }); return; }
    const missing = target.filter((x) => !played.some((m) => mod12(m) === mod12(x))).length;
    setMiss(missing ? `Pas encore : il manque ${missing} note${missing > 1 ? 's' : ''}.` : 'Pas encore : il y a une note en trop.');
  };
  const show = () => {
    setState('shown');
    if (target.length) audio.play(target.map((m, i) => ({ midi: m, start: build ? 0 : i * 0.6, dur: build ? 1.6 : 0.55 })), { tempo: 80, instrument });
  };

  const hl: Record<number, string> = {};
  const allowed = t.kind === 'play' ? t.allowed : undefined;
  if (allowed) for (let m = 36; m <= 96; m++) if (allowed.includes(mod12(m))) hl[m] = `${accent}66`;
  if (state === 'shown') for (const x of target) for (let m = 36; m <= 96; m++) if (mod12(m) === mod12(x)) hl[m] = accent;
  if (build) for (const m of played) hl[m] = colors.ink;
  const low = target.length ? Math.min(...target) : 60;
  const start = low < 60 ? 48 : 60;

  return (
    <View style={{ gap: 10 }}>
      {instrument === 'guitare'
        ? <Fretboard frets={12} tonic={drone ?? 45} labels="notes" showTonic={false} highlights={hl} onPress={press} />
        : <Piano startMidi={start} tonic={drone ?? 60} labels="notes" showTonic={false} highlights={hl} onPress={press} />}
      <Text style={styles.played}>{played.length ? played.slice(-10).map(pcName).join(' · ') : ' '}</Text>
      {miss ? <Text style={[type.body, { color: colors.warn }]}>{miss}</Text> : null}
      {state === 'try' ? (
        <View style={styles.row}>
          {build ? <Button color={accent} label="Vérifier" disabled={!played.length} onPress={check} style={{ flex: 1 }} /> : null}
          {played.length ? <Button variant="contour" color={colors.inkSoft} label="Effacer" onPress={() => { setPlayed([]); setMiss(null); }} style={{ flex: 1 }} /> : null}
          {target.length ? <Button variant="texte" color={colors.inkSoft} label="Montre-moi" onPress={show} /> : null}
        </View>
      ) : (
        <View style={{ gap: 10 }} accessibilityLiveRegion="polite">
          <Text style={[type.body, { fontWeight: '800', color: state === 'found' ? colors.success : colors.ink }]}>{state === 'found' ? '✓ ' : ''}{t.success}</Text>
          <Button color={accent} label="Continuer" onPress={onDone} />
        </View>
      )}
    </View>
  );
}

/** taper un rythme avec le clic (décompte d'une mesure) ; chaque frappe est comparée au coup le plus proche */
function TapTry({ t, accent, onDone }: { t: Extract<LessonTry, { kind: 'tap' }>; accent: string; onDone: () => void }) {
  const latency = useUserStore((s) => s.settings.latencyMs);
  const [phase, setPhase] = useState<'idle' | 'count' | 'tap' | 'done'>('idle');
  const [score, setScore] = useState<{ hit: number; total: number; extra: number } | null>(null);
  const [shown, setShown] = useState(false);
  const zero = useRef(0);
  const taps = useRef<number[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const beatMs = 60000 / t.tempo;
  const lenBeats = Math.ceil(Math.max(...t.onsets) / t.perBar + 0.001) * t.perBar;

  const start = async () => {
    await audio.init();
    taps.current = [];
    setScore(null);
    const pb = audio.clicks(t.perBar + lenBeats, t.tempo, 60, t.perBar);
    zero.current = pb.startMs + t.perBar * beatMs;
    setPhase('count');
    timers.current.push(setTimeout(() => setPhase('tap'), Math.max(0, zero.current - audio.now() - beatMs / 2)));
    timers.current.push(setTimeout(() => {
      const got = taps.current.map((x) => x - latency - zero.current);
      const used = new Set<number>();
      let hit = 0;
      for (const o of t.onsets) {
        const target = o * beatMs;
        let best = -1, bestD = Infinity;
        got.forEach((g, i) => { const d = Math.abs(g - target); if (!used.has(i) && d < bestD) { best = i; bestD = d; } });
        if (best >= 0 && bestD <= 150) { used.add(best); hit++; }
      }
      setScore({ hit, total: t.onsets.length, extra: got.length - used.size });
      setPhase('done');
    }, zero.current - audio.now() + lenBeats * beatMs + 300));
  };
  const ok = !!score && score.hit >= Math.ceil(score.total * 0.75) && score.extra <= 2;
  const show = () => { setShown(true); audio.clicks(lenBeats, t.tempo, 60, t.perBar); audio.play(t.onsets.map((o) => ({ midi: 84, start: o, dur: 0.2 })), { tempo: t.tempo, instrument: 'bloc' }); };

  return (
    <View style={{ gap: 10 }}>
      {phase === 'count' ? <Text style={[styles.count, { color: accent }]}>Décompte…</Text> : null}
      {phase === 'tap' || phase === 'count' ? <TapPad color={accent} onTap={() => taps.current.push(audio.now())} label="Tape ici" /> : null}
      {phase === 'idle' ? <Button color={accent} label="▶ Commencer (décompte d'une mesure)" onPress={start} /> : null}
      {phase === 'done' && score ? (
        <View style={{ gap: 10 }} accessibilityLiveRegion="polite">
          <Text style={[type.body, { fontWeight: '800', color: ok ? colors.success : colors.warn }]}>{score.hit}/{score.total} coups bien placés{score.extra > 0 ? ` · ${score.extra} en trop` : ''}</Text>
          {ok || shown ? <Text style={[type.body, { fontWeight: '800' }]}>{ok ? '✓ ' : ''}{t.success}</Text> : null}
          <View style={styles.row}>
            <Button variant="contour" color={accent} label="Réessayer" onPress={start} style={{ flex: 1 }} />
            {!ok && !shown ? <Button variant="texte" color={colors.inkSoft} label="Montre-moi" onPress={show} /> : null}
          </View>
          {ok || shown ? <Button color={accent} label="Continuer" onPress={onDone} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 10 },
  kicker: { fontWeight: '900', fontSize: 12 },
  played: { textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.ink, minHeight: 22 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  count: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
});
