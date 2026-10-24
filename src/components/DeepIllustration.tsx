// Illustrations des leçons approfondies, dessinées (aucune image) : claires, sobres, lisibles sur téléphone.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { Illustration } from '../content/deep/types';
import { FLAT_NAMES, isNatural, KEYSIG_STEPS, noteName, SHARP_NAMES, spellOnStaff, spellWithKey } from '../engine/music';
import { colors } from '../theme';
import { RhythmNotation } from './RhythmNotation';
import { TrebleClef } from './TrebleClef';

const W = 320;

/** `onNote` : les claviers et manches dessinés deviennent jouables (toucher une touche ou une case la fait sonner) */
export function DeepIllustration({ ill, accent, onNote }: { ill: Illustration; accent: string; onNote?: (midi: number) => void }) {
  switch (ill.kind) {
    case 'waves': return <Waves accent={accent} />;
    case 'pitchLadder': return <PitchLadder accent={accent} />;
    case 'keyboard': return <Keyboard {...ill} accent={accent} onNote={onNote} />;
    case 'fretboard': return <FretDiagram {...ill} accent={accent} onNote={onNote} />;
    case 'steps': return <Steps {...ill} accent={accent} />;
    case 'ladder': return <Ladder {...ill} accent={accent} />;
    case 'pulseGrid': return <PulseGrid {...ill} accent={accent} />;
    case 'staff': return <StaffDiagram {...ill} accent={accent} />;
    case 'cards': return <Cards {...ill} accent={accent} />;
    case 'rhythm': return <RhythmIll {...ill} />;
    case 'circle': return <CircleOfFifths {...ill} accent={accent} />;
  }
}

// ---------- grave et aigu : deux ondes ----------
function wave(periods: number, y: number, amp: number, x0: number, w: number) {
  let d = `M ${x0} ${y}`;
  const n = 120;
  for (let i = 1; i <= n; i++) {
    const x = x0 + (w * i) / n;
    d += ` L ${x.toFixed(1)} ${(y - amp * Math.sin((2 * Math.PI * periods * i) / n)).toFixed(1)}`;
  }
  return d;
}
function Waves({ accent }: { accent: string }) {
  return (
    <View style={styles.box} accessibilityRole="image" accessibilityLabel="Un son grave vibre lentement : ses ondes sont larges. Un son aigu vibre vite : ses ondes sont serrées.">
      <Svg width={W} height={190} viewBox={`0 0 ${W} 190`}>
        <SvgText x={4} y={24} fontSize={13} fontWeight="800" fill={colors.ink}>Grave · vibrations lentes</SvgText>
        <SvgText x={W - 4} y={58} fontSize={30} textAnchor="end">🐘</SvgText>
        <Path d={wave(2, 58, 22, 8, 250)} stroke={colors.inkSoft} strokeWidth={3} fill="none" />
        <SvgText x={4} y={118} fontSize={13} fontWeight="800" fill={colors.ink}>Aigu · vibrations rapides</SvgText>
        <SvgText x={W - 4} y={152} fontSize={30} textAnchor="end">🐦</SvgText>
        <Path d={wave(9, 152, 22, 8, 250)} stroke={accent} strokeWidth={3} fill="none" />
      </Svg>
    </View>
  );
}

// ---------- l'échelle des hauteurs ----------
const PITCH_ROWS: [string, string, string][] = [
  ['🐦', 'Très aigu', 'chant d\'oiseau, flûte piccolo, sifflet'],
  ['👧', 'Aigu', 'voix d\'enfant, haut du piano'],
  ['🎹', 'Médium', 'le do du milieu du piano, voix parlée'],
  ['🎸', 'Grave', 'corde épaisse de la guitare, voix d\'homme'],
  ['🐘', 'Très grave', 'contrebasse, tuba, barrissement'],
];
function PitchLadder({ accent }: { accent: string }) {
  return (
    <View style={[styles.box, { flexDirection: 'row', gap: 12 }]} accessibilityRole="image" accessibilityLabel="Échelle des hauteurs, du très grave (contrebasse) au très aigu (chant d'oiseau).">
      <View style={{ width: 10, borderRadius: 5, backgroundColor: accent, opacity: 0.8 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={styles.small}>↑ plus aigu</Text>
        {PITCH_ROWS.map(([e, t, s]) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 24 }}>{e}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t}</Text>
              <Text style={styles.small}>{s}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.small}>↓ plus grave</Text>
      </View>
    </View>
  );
}

// ---------- clavier ----------
function Keyboard({ from, to, names, marks = [], arcs = [], accent, onNote }: Extract<Illustration, { kind: 'keyboard' }> & { accent: string; onNote?: (midi: number) => void }) {
  const whites: number[] = [];
  for (let m = from; m <= to; m++) if (isNatural(m)) whites.push(m);
  // touches plus larges quand il y en a peu : le clavier occupe la largeur, sans devenir géant
  const WK = Math.max(20, Math.min(44, Math.floor((W - 8) / whites.length)));
  // étiquettes longues (« grave », « aigu ») : écrites sous le clavier, pas sur la touche
  const longLabels = marks.some((k) => (k.label ?? '').length > 3);
  const xOf = (m: number) => {
    if (isNatural(m)) return whites.indexOf(m) * WK + WK / 2;
    return whites.indexOf(m - 1) * WK + WK;
  };
  const top = arcs.length ? 46 : 8;
  const w = whites.length * WK;
  const below = longLabels ? 22 : 0;
  const markOf = (m: number) => marks.find((k) => k.midi === m);
  const label = marks.map((k) => k.label ?? noteName(k.midi)).join(', ');
  return (
    <View style={styles.box} accessibilityRole="image" accessibilityLabel={`Clavier${label ? ` : ${label}` : ''}${arcs.length ? `. ${arcs.map((a) => `${noteName(a.a)} à ${noteName(a.b)} : ${a.label}`).join(' ; ')}` : ''}`}>
      <View style={{ alignItems: 'center' }}>
      <Svg width={Math.min(W, w)} height={top + 120 + below} viewBox={`0 0 ${w} ${top + 120 + below}`}>
        {arcs.map((a, i) => {
          const x1 = xOf(a.a), x2 = xOf(a.b);
          const mid = (x1 + x2) / 2;
          const c = a.color ?? accent;
          return (
            <React.Fragment key={i}>
              <Path d={`M ${x1} ${top - 4} Q ${mid} ${top - 34} ${x2} ${top - 4}`} stroke={c} strokeWidth={2.5} fill="none" />
              <SvgText x={mid} y={top - 24} fontSize={13} fontWeight="900" fill={c} textAnchor="middle">{a.label}</SvgText>
            </React.Fragment>
          );
        })}
        {whites.map((m, i) => {
          const mk = markOf(m);
          return (
            <React.Fragment key={m}>
              <Rect x={i * WK + 1} y={top} width={WK - 2} height={110} rx={3} fill={mk ? (mk.color ?? accent) : '#FBF8F2'} stroke="#2A2340" strokeWidth={1} onPress={onNote ? () => onNote(m) : undefined} />
              {mk?.label && mk.label.length > 3
                ? <SvgText x={i * WK + WK / 2} y={top + 128} fontSize={12} fontWeight="900" fill={mk.color ?? accent} textAnchor="middle">{mk.label}</SvgText>
                : names || mk?.label ? <SvgText x={i * WK + WK / 2} y={top + 100} fontSize={WK > 30 ? 13 : 11} fontWeight="800" fill={mk ? '#FFFFFF' : '#2A2340'} textAnchor="middle">{mk?.label ?? noteName(m).replace(/\d/, '')}</SvgText> : null}
            </React.Fragment>
          );
        })}
        {Array.from({ length: to - from + 1 }, (_, k) => from + k).filter((m) => !isNatural(m) && whites.includes(m - 1)).map((m) => {
          const mk = markOf(m);
          return (
            <React.Fragment key={m}>
              <Rect x={xOf(m) - WK * 0.32} y={top} width={WK * 0.64} height={68} rx={2} fill={mk ? (mk.color ?? accent) : '#2A2340'} onPress={onNote ? () => onNote(m) : undefined} />
              {mk?.label && mk.label.length > 3
                ? <SvgText x={xOf(m)} y={top + 128} fontSize={12} fontWeight="900" fill={mk.color ?? accent} textAnchor="middle">{mk.label}</SvgText>
                : mk?.label ? <SvgText x={xOf(m)} y={top + 60} fontSize={9} fontWeight="800" fill="#FFFFFF" textAnchor="middle">{mk.label}</SvgText> : null}
            </React.Fragment>
          );
        })}
      </Svg>
      </View>
    </View>
  );
}

// ---------- manche ----------
const OPEN_STRINGS = [40, 45, 50, 55, 59, 64];
function FretDiagram({ frets, marks = [], arcs = [], accent, onNote }: Extract<Illustration, { kind: 'fretboard' }> & { accent: string; onNote?: (midi: number) => void }) {
  const cw = (W - 20) / (frets + 1);
  const sy = (s: number) => 22 + (5 - s) * 22; // corde aiguë en haut
  const cx = (f: number) => 10 + f * cw + cw / 2;
  return (
    <View style={styles.box} accessibilityRole="image" accessibilityLabel={`Manche de guitare${arcs.length ? ` : ${arcs.map((a) => `case ${a.a} à case ${a.b}, ${a.label}`).join(' ; ')}` : ''}`}>
      <Svg width={W} height={160} viewBox={`0 0 ${W} 160`}>
        <Rect x={10} y={12} width={W - 20} height={130} rx={4} fill="#3A2A20" />
        {Array.from({ length: frets + 2 }, (_, f) => <Line key={f} x1={10 + f * cw} y1={12} x2={10 + f * cw} y2={142} stroke={f === 1 ? '#EFE6D8' : '#8C7B6B'} strokeWidth={f === 1 ? 4 : 2} />)}
        {/* corde grave (s=0, en bas) la plus épaisse, aiguë (en haut) la plus fine */}
        {[0, 1, 2, 3, 4, 5].map((s) => <Line key={s} x1={10} y1={sy(s)} x2={W - 10} y2={sy(s)} stroke="#D9CFC3" strokeWidth={1 + (5 - s) * 0.45} />)}
        {Array.from({ length: frets + 1 }, (_, f) => <SvgText key={f} x={cx(f)} y={156} fontSize={10} fill={colors.inkSoft} textAnchor="middle">{f}</SvgText>)}
        {arcs.map((a, i) => {
          const c = a.color ?? accent;
          const y = sy(a.string) - 6;
          return (
            <React.Fragment key={i}>
              <Path d={`M ${cx(a.a)} ${y} Q ${(cx(a.a) + cx(a.b)) / 2} ${y - 18} ${cx(a.b)} ${y}`} stroke={c} strokeWidth={2.5} fill="none" />
              {/* étiquette sur une pastille claire : lisible sur le bois sombre */}
              <Rect x={(cx(a.a) + cx(a.b)) / 2 - (a.label.length * 3.4 + 7)} y={y - 30} width={a.label.length * 6.8 + 14} height={17} rx={8} fill="#FFFFFF" stroke={c} strokeWidth={1.5} />
              <SvgText x={(cx(a.a) + cx(a.b)) / 2} y={y - 18} fontSize={11} fontWeight="900" fill={c} textAnchor="middle">{a.label}</SvgText>
            </React.Fragment>
          );
        })}
        {onNote ? [0, 1, 2, 3, 4, 5].flatMap((st) => Array.from({ length: frets + 1 }, (_, f) => (
          <Rect key={`${st}-${f}`} x={10 + f * cw} y={sy(st) - 11} width={cw} height={22} fill="transparent" onPress={() => onNote(OPEN_STRINGS[st] + f)} />
        ))) : null}
        {marks.map((m, i) => (
          <React.Fragment key={i}>
            <Circle cx={cx(m.fret)} cy={sy(m.string)} r={9} fill={m.color ?? accent} onPress={onNote ? () => onNote(OPEN_STRINGS[m.string] + m.fret) : undefined} />
            {m.label ? <SvgText x={cx(m.fret)} y={sy(m.string) + 4} fontSize={10} fontWeight="900" fill="#FFFFFF" textAnchor="middle">{m.label}</SvgText> : null}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

// ---------- la gamme sur une règle : les notes espacées selon leur distance réelle ----------
function Steps({ notes, steps, accent }: Extract<Illustration, { kind: 'steps' }> & { accent: string }) {
  const size = (s: string) => (s === 'T' ? 2 : s === '1½' ? 3 : 1);
  const units = steps.reduce((a, s) => a + size(s), 0);
  const x0 = 18, u = (W - 2 * x0) / units;
  const xs: number[] = [x0];
  steps.forEach((s) => xs.push(xs[xs.length - 1] + size(s) * u));
  return (
    <View style={styles.box} accessibilityRole="image" accessibilityLabel={`La gamme sur une règle : ${notes.map((n, i) => (i < steps.length ? `${n}, ${steps[i] === 'T' ? 'un ton' : steps[i] === '1½' ? 'un ton et demi' : 'un demi-ton'} jusqu'à` : n)).join(' ')}`}>
      <Svg width={W} height={110} viewBox={`0 0 ${W} 110`}>
        {/* graduations : un cran par demi-ton */}
        {Array.from({ length: units + 1 }, (_, k) => <Line key={k} x1={x0 + k * u} y1={52} x2={x0 + k * u} y2={60} stroke={colors.line} strokeWidth={2} />)}
        <Line x1={x0} y1={56} x2={W - x0} y2={56} stroke={colors.inkSoft} strokeWidth={2} />
        {steps.map((s, i) => {
          const half = s === '½';
          const wide = s === '1½';
          return (
            <React.Fragment key={i}>
              {half || wide ? <Rect x={xs[i]} y={48} width={xs[i + 1] - xs[i]} height={16} rx={4} fill={wide ? '#8A80B0' : accent} opacity={0.25} /> : null}
              <SvgText x={(xs[i] + xs[i + 1]) / 2} y={84} fontSize={half ? 15 : 13} fontWeight="900" fill={half ? accent : wide ? '#8A80B0' : colors.inkSoft} textAnchor="middle">{s}</SvgText>
            </React.Fragment>
          );
        })}
        {notes.map((n, i) => (
          <React.Fragment key={i}>
            <Circle cx={xs[i]} cy={56} r={7} fill={colors.ink} />
            <SvgText x={xs[i]} y={36} fontSize={12} fontWeight="900" fill={colors.ink} textAnchor="middle">{n}</SvgText>
          </React.Fragment>
        ))}
        <SvgText x={W / 2} y={106} fontSize={11} fill={colors.inkSoft} textAnchor="middle">un cran = un demi-ton</SvgText>
      </Svg>
    </View>
  );
}

// ---------- échelle des degrés ----------
function Ladder({ degrees, accent }: Extract<Illustration, { kind: 'ladder' }> & { accent: string }) {
  return (
    <View style={[styles.box, { gap: 6 }]} accessibilityRole="image" accessibilityLabel={`Degrés : ${degrees.map((d) => `${d.d} ${d.stable ? 'stable' : `instable${d.to ? `, va vers ${d.to}` : ''}`}`).join(' ; ')}`}>
      {degrees.map((d) => (
        <View key={d.d} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.deg, d.stable ? { backgroundColor: colors.success, borderColor: colors.success } : { borderColor: accent }]}>
            <Text style={[styles.degText, { color: d.stable ? '#FFFFFF' : accent }]}>{d.d}</Text>
          </View>
          <Text style={[styles.label, { width: 56 }]}>{d.name ?? ''}</Text>
          <Text style={styles.small}>{d.stable ? 'stable : on peut s\'y poser' : d.to ? `veut aller vers ${d.to}` : 'instable'}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------- grille de pulsation ----------
const COUNT: Record<number, string[]> = { 1: [''], 2: ['', 'et'], 3: ['', 'tri', 'o'], 4: ['', 'e', 'et', 'a'] };
function PulseGrid({ perBar, bars, subdiv, plain, accents, accent }: Extract<Illustration, { kind: 'pulseGrid' }> & { accent: string }) {
  const beats = perBar * bars;
  const bw = (W - 10) / beats;
  return (
    <View style={styles.box} accessibilityRole="image" accessibilityLabel={`${bars} mesure${bars > 1 ? 's' : ''} de ${perBar} temps, chaque temps divisé en ${subdiv}${accents ? `, temps marqués : ${accents.map((a) => a + 1).join(', ')}` : ''}`}>
      <Svg width={W} height={96} viewBox={`0 0 ${W} 96`}>
        {Array.from({ length: beats }, (_, b) => {
          // « plain » : tous les temps pareils (avant d'introduire les temps forts)
          const strong = !plain && (accents ? accents.includes(b % perBar) : b % perBar === 0);
          const x = 5 + b * bw;
          return (
            <React.Fragment key={b}>
              <Rect x={x + 2} y={strong ? 10 : 20} width={bw - 4} height={strong ? 40 : 30} rx={4} fill={strong ? accent : colors.card} stroke={strong ? accent : colors.line} strokeWidth={1.5} />
              {Array.from({ length: subdiv - 1 }, (_, k) => <Line key={k} x1={x + ((k + 1) * bw) / subdiv} y1={56} x2={x + ((k + 1) * bw) / subdiv} y2={64} stroke={colors.inkSoft} strokeWidth={2} />)}
              {COUNT[subdiv].map((syl, k) => (
                <SvgText key={k} x={x + (k * bw) / subdiv + (subdiv === 1 ? bw / 2 : 6)} y={82} fontSize={k === 0 ? 14 : 11} fontWeight={k === 0 ? '900' : '700'} fill={k === 0 ? colors.ink : colors.inkSoft} textAnchor={subdiv === 1 ? 'middle' : 'start'}>{k === 0 ? (plain ? '•' : String((b % perBar) + 1)) : syl}</SvgText>
              ))}
              {!plain && b % perBar === 0 && b > 0 ? <Line x1={x} y1={6} x2={x} y2={60} stroke={colors.ink} strokeWidth={2} /> : null}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

// ---------- portée ----------
function StaffDiagram({ notes, landmarks, keySig = 0, sigLabels, sigHighlight, clef = 'sol', accent }: Extract<Illustration, { kind: 'staff' }> & { accent: string }) {
  const nSig = Math.abs(keySig);
  const SIGDX = sigLabels ? 24 : 12;
  const GAP = 12, BOTTOM = 104, X0 = 70 + (nSig ? nSig * SIGDX + 10 : 0);
  const y = (st: number) => BOTTOM - (st * GAP) / 2;
  const dx = Math.min(44, (W - X0 - 10) / Math.max(1, notes.length));
  // notes très graves (lignes supplémentaires sous la portée) : le dessin s'allonge, les noms passent dessous
  const stepOf = (m: number) => (keySig ? spellWithKey(m, keySig, clef).step : spellOnStaff(m, clef).step);
  const lowest = Math.min(0, ...notes.map((n) => stepOf(n.midi)));
  const H = Math.max(150, Math.round(y(lowest) + 34));
  const LY = H - 4;
  return (
    <View style={styles.box} accessibilityRole="image" accessibilityLabel={`Portée${nSig ? ` avec une armure de ${nSig} ${keySig > 0 ? 'dièse' : 'bémol'}${nSig > 1 ? 's' : ''}` : ''}${notes.length ? ` : ${notes.map((n) => n.label ?? noteName(n.midi)).join(', ')}` : ''}`}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {[0, 2, 4, 6, 8].map((st) => <Line key={st} x1={6} y1={y(st)} x2={W - 6} y2={y(st)} stroke={landmarks && st === (clef === 'fa' ? 6 : 2) ? accent : colors.inkSoft} strokeWidth={landmarks && st === (clef === 'fa' ? 6 : 2) ? 2.5 : 1.4} />)}
        {clef === 'fa'
          ? <SvgText x={10} y={y(4) + 6} fontSize={42} fill={colors.ink}>𝄢</SvgText>
          : <TrebleClef x={24} gLineY={y(2)} gap={GAP} color={colors.ink} />}
        {Array.from({ length: nSig }, (_, k) => {
          const st = KEYSIG_STEPS[clef][keySig > 0 ? 'sharp' : 'flat'][k];
          const x = 58 + k * SIGDX;
          const c = sigHighlight === k ? accent : colors.ink;
          return (
            <React.Fragment key={`k${k}`}>
              <SvgText x={x} y={y(st) + (keySig > 0 ? 7 : 5)} fontSize={keySig > 0 ? 21 : 23} fontWeight="700" fill={c}>{keySig > 0 ? '♯' : '♭'}</SvgText>
              {sigLabels ? <SvgText x={x + 6} y={LY} fontSize={10} fontWeight="800" fill={c} textAnchor="middle">{(keySig > 0 ? SHARP_NAMES : FLAT_NAMES)[k].replace(/[♯♭]/, '')}</SvgText> : null}
            </React.Fragment>
          );
        })}
        {notes.map((n, i) => {
          const sp = keySig ? spellWithKey(n.midi, keySig, clef) : null;
          const { step: st, sharp } = sp ? { step: sp.step, sharp: false } : spellOnStaff(n.midi, clef);
          const accTxt = sp ? sp.acc : sharp ? '♯' : null;
          const cx = X0 + i * dx + dx / 2;
          const ledgers: number[] = [];
          for (let l = -2; l >= st; l -= 2) ledgers.push(l);
          for (let l = 10; l <= st; l += 2) ledgers.push(l);
          const c = n.color ?? colors.ink;
          return (
            <React.Fragment key={i}>
              {ledgers.map((l) => <Line key={l} x1={cx - 13} y1={y(l)} x2={cx + 13} y2={y(l)} stroke={colors.inkSoft} strokeWidth={1.4} />)}
              {accTxt ? <SvgText x={cx - 22} y={y(st) + 6} fontSize={17} fontWeight="700" fill={c}>{accTxt}</SvgText> : null}
              <Circle cx={cx} cy={y(st)} r={6.5} fill={c} />
              {n.label ? <SvgText x={cx} y={LY} fontSize={12} fontWeight="800" fill={c} textAnchor="middle">{n.label}</SvgText> : null}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function RhythmIll({ items, perBar = 4, counts }: Extract<Illustration, { kind: 'rhythm' }>) {
  return (
    <View style={[styles.box, { alignItems: 'center', gap: 6 }]} accessibilityRole="image" accessibilityLabel={`Rythme : ${items.join(', ')}${counts ? `. On compte : ${counts}` : ''}`}>
      <RhythmNotation items={items} perBar={perBar} />
      {counts ? <Text style={[styles.label, { letterSpacing: 1 }]}>{counts}</Text> : null}
    </View>
  );
}

// ---------- le cercle des quintes ----------
const CIRCLE: [string, string][] = [['do', '0'], ['sol', '1♯'], ['ré', '2♯'], ['la', '3♯'], ['mi', '4♯'], ['si', '5♯'], ['fa♯ / sol♭', '6'], ['ré♭', '5♭'], ['la♭', '4♭'], ['mi♭', '3♭'], ['si♭', '2♭'], ['fa', '1♭']];
function CircleOfFifths({ highlight = [], arrows = [], center, accent }: Extract<Illustration, { kind: 'circle' }> & { accent: string }) {
  const cx = W / 2, cy = 150, R = 112;
  const pos = (i: number) => ({ x: cx + R * Math.sin((i * Math.PI) / 6), y: cy - R * Math.cos((i * Math.PI) / 6) });
  const idx = (name: string) => CIRCLE.findIndex((c) => c[0] === name || c[0].startsWith(`${name} `));
  return (
    <View style={styles.box} accessibilityRole="image" accessibilityLabel={`Cercle des quintes : ${CIRCLE.map((c) => `${c[0]} ${c[1] === '0' ? 'sans altération' : c[1]}`).join(', ')}${highlight.length ? `. En couleur : ${highlight.join(', ')}` : ''}`}>
      <Svg width={W} height={300} viewBox={`0 0 ${W} 300`}>
        <Circle cx={cx} cy={cy} r={R} stroke={colors.line} strokeWidth={2} fill="none" />
        {arrows.map(([a, b], k) => {
          const p1 = pos(idx(a)), p2 = pos(idx(b));
          return <Line key={k} x1={p1.x + (p2.x - p1.x) * 0.25} y1={p1.y + (p2.y - p1.y) * 0.25} x2={p1.x + (p2.x - p1.x) * 0.75} y2={p1.y + (p2.y - p1.y) * 0.75} stroke={accent} strokeWidth={2.5} />;
        })}
        {CIRCLE.map(([name, sig], i) => {
          const { x, y } = pos(i);
          const on = highlight.includes(name) || highlight.some((h) => name.startsWith(`${h} `));
          return (
            <React.Fragment key={name}>
              <Circle cx={x} cy={y} r={on ? 24 : 21} fill={on ? accent : colors.card} stroke={on ? accent : colors.line} strokeWidth={1.5} />
              <SvgText x={x} y={y - 1} fontSize={name.length > 4 ? 9 : 13} fontWeight="900" fill={on ? '#FFFFFF' : colors.ink} textAnchor="middle">{name}</SvgText>
              <SvgText x={x} y={y + 12} fontSize={9} fontWeight="700" fill={on ? '#FFFFFF' : colors.inkSoft} textAnchor="middle">{sig}</SvgText>
            </React.Fragment>
          );
        })}
        <SvgText x={cx} y={cy - 4} fontSize={11} fontWeight="800" fill={colors.inkSoft} textAnchor="middle">{center ?? '♯ en montant →'}</SvgText>
        <SvgText x={cx} y={cy + 12} fontSize={11} fontWeight="800" fill={colors.inkSoft} textAnchor="middle">{center ? '' : '← ♭ en descendant'}</SvgText>
      </Svg>
    </View>
  );
}

function Cards({ items, accent }: Extract<Illustration, { kind: 'cards' }> & { accent: string }) {
  return (
    // quatre cartes ou plus : deux par ligne, pour que les mots ne se coupent pas sur un téléphone
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: items.length > 3 ? 'wrap' : 'nowrap' }}>
      {items.map((it) => (
        <View key={it.title} style={[styles.card, items.length > 3 && { flexBasis: '47%', flexGrow: 1 }, { borderColor: it.color ?? accent }]}>
          <Text style={[styles.label, { color: it.color ?? accent }]}>{it.title}</Text>
          <Text style={styles.small}>{it.sub}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.card, borderRadius: 16, padding: 12, alignItems: 'stretch' },
  label: { fontWeight: '900', color: colors.ink, fontSize: 14 },
  small: { color: colors.inkSoft, fontSize: 12 },
  deg: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  degText: { fontWeight: '900', fontSize: 15 },
  card: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 2, padding: 10, gap: 4 },
});
