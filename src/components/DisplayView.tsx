// Ce qu'un exercice montre à l'écran : rythme, degrés, texte, figure, échelle de degrés, grille d'accords.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Text as SvgText } from 'react-native-svg';
import type { Display, Instrument } from '../content/types';
import { KEYSIG_STEPS, spellOnStaff, spellWithKey, tabPosition } from '../engine/music';
import { Fretboard } from './Fretboard';
import { Piano } from './Piano';
import { colors, type } from '../theme';
import { FigureGlyph, RhythmNotation } from './RhythmNotation';
import { TrebleClef } from './TrebleClef';

/** Portée en clé de sol : notes naturelles, lignes supplémentaires dessinées si besoin. */
export function Staff({ midis, color, label, clef = 'sol', keySig = 0 }: { midis: number[]; color: string; label?: string; clef?: 'sol' | 'fa'; keySig?: number }) {
  const gap = 14;
  const bottom = 104;
  const nSig = Math.abs(keySig);
  const x0 = 78 + nSig * 11 + (nSig ? 8 : 0);
  const dx = 46;
  const W = Math.max(220, x0 + midis.length * dx + 20);
  const y = (step: number) => bottom - (step * gap) / 2;
  return (
    <View style={styles.center} role="img" accessibilityLabel={label ?? `Portée en clé de sol, ${midis.length} note${midis.length > 1 ? 's' : ''}`}>
      <Svg width={W} height={150} viewBox={`0 0 ${W} 150`}>
        {[0, 2, 4, 6, 8].map((st) => <Line key={st} x1={8} y1={y(st)} x2={W - 8} y2={y(st)} stroke={colors.inkSoft} strokeWidth={1.5} />)}
        {/* la spirale de la clé de sol s'enroule autour de la 2e ligne (sol) */}
        {clef === 'fa'
          ? <SvgText x={12} y={y(4) + 6} fontSize={46} fill={colors.ink}>𝄢</SvgText>
          : <TrebleClef x={26} gLineY={y(2)} gap={gap} color={colors.ink} />}
        {/* armure : les altérations rangées après la clé, dans l'ordre (fa do sol… / si mi la…) */}
        {Array.from({ length: nSig }, (_, k) => {
          const st = KEYSIG_STEPS[clef][keySig > 0 ? 'sharp' : 'flat'][k];
          return <SvgText key={`k${k}`} x={58 + k * 11} y={y(st) + (keySig > 0 ? 7 : 5)} fontSize={keySig > 0 ? 21 : 23} fontWeight="700" fill={colors.ink}>{keySig > 0 ? '♯' : '♭'}</SvgText>;
        })}
        {midis.map((m, i) => {
          const sp = keySig ? spellWithKey(m, keySig, clef) : null;
          const { step: st, sharp } = sp ? { step: sp.step, sharp: false } : spellOnStaff(m, clef);
          const accTxt = sp ? sp.acc : sharp ? '♯' : null;
          const cx = x0 + i * dx;
          const ledgers: number[] = [];
          for (let l = -2; l >= st; l -= 2) ledgers.push(l);
          for (let l = 10; l <= st; l += 2) ledgers.push(l);
          return (
            <React.Fragment key={i}>
              {ledgers.map((l) => <Line key={l} x1={cx - 15} y1={y(l)} x2={cx + 15} y2={y(l)} stroke={colors.inkSoft} strokeWidth={1.5} />)}
              {accTxt ? <SvgText x={cx - 24} y={y(st) + 7} fontSize={20} fontWeight="700" fill={color}>{accTxt}</SvgText> : null}
              <Ellipse cx={cx} cy={y(st)} rx={9} ry={6.5} fill={color} transform={`rotate(-20 ${cx} ${y(st)})`} />
              <Line x1={st >= 4 ? cx - 8 : cx + 8} y1={y(st)} x2={st >= 4 ? cx - 8 : cx + 8} y2={st >= 4 ? y(st) + 40 : y(st) - 40} stroke={color} strokeWidth={2} />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

/**
 * Tablature : 6 lignes = 6 cordes (la plus aiguë en haut), le chiffre = la case.
 * La guitare sonne une octave sous l'écrit : une note écrite en clé de sol se joue 12 demi-tons plus bas.
 */
export function Tab({ midis, color }: { midis: number[]; color: string }) {
  const OPEN = [64, 59, 55, 50, 45, 40]; // de la corde aiguë (en haut) à la grave (pour les 6 lignes)
  const NAMES = ['mi', 'si', 'sol', 'ré', 'la', 'mi'];
  const pos = (written: number) => { const p = tabPosition(written); return { s: p.string, f: p.fret }; };
  const W = Math.max(240, 70 + midis.length * 44);
  const ly = (s: number) => 18 + s * 16;
  return (
    <View style={styles.center} role="img" accessibilityLabel={`Tablature : ${midis.map((m) => { const p = pos(m); return `corde de ${NAMES[p.s]}, case ${p.f}`; }).join(' ; ')}`}>
      <Svg width={W} height={120} viewBox={`0 0 ${W} 120`}>
        {OPEN.map((_, s) => <Line key={s} x1={36} y1={ly(s)} x2={W - 8} y2={ly(s)} stroke={colors.inkSoft} strokeWidth={1.2} />)}
        {['T', 'A', 'B'].map((c, i) => <SvgText key={c} x={10} y={ly(1) + 4 + i * 26} fontSize={18} fontWeight="900" fill={colors.ink}>{c}</SvgText>)}
        {midis.map((m, i) => {
          const p = pos(m);
          const cx = 64 + i * 44;
          return (
            <React.Fragment key={i}>
              <Circle cx={cx} cy={ly(p.s)} r={10} fill={colors.card} />
              <SvgText x={cx} y={ly(p.s) + 6} fontSize={17} fontWeight="900" fill={color} textAnchor="middle">{p.f}</SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

export function DisplayView({ d, color, highlight = [], instrument = 'piano', tab = false }: { d?: Display; color: string; highlight?: number[]; instrument?: Instrument; tab?: boolean }) {
  if (!d) return null;
  if (d.kind === 'staff') return tab && instrument === 'guitare' && d.clef !== 'fa' && !d.keySig ? <Tab midis={d.midis} color={color} /> : <Staff midis={d.midis} color={color} clef={d.clef} keySig={d.keySig} label={d.keySig ? `Portée avec une armure de ${Math.abs(d.keySig)} ${d.keySig > 0 ? 'dièse' : 'bémol'}${Math.abs(d.keySig) > 1 ? 's' : ''}${d.midis.length ? `, ${d.midis.length} note${d.midis.length > 1 ? 's' : ''}` : ''}` : undefined} />;
  if (d.kind === 'instrumentNote') {
    const hl = { [d.midi]: color };
    return instrument === 'guitare'
      ? <Fretboard frets={5} highlights={hl} marks={d.string !== undefined ? [{ string: d.string, fret: d.fret ?? 0, color }] : undefined} labels="aucun" showTonic={false} onPress={() => undefined} disabled />
      : <Piano startMidi={60} octaves={2} highlights={hl} labels="aucun" showTonic={false} onPress={() => undefined} disabled />;
  }
  if (d.kind === 'rhythm') return <RhythmNotation items={d.items} highlight={highlight} perBar={d.perBar} pickup={d.pickup} />;
  if (d.kind === 'figure') return <View style={{ alignItems: 'center' }}><FigureGlyph figure={d.figure} /></View>;
  if (d.kind === 'degrees') return <Text style={[styles.degrees, { color }]}>{d.degrees.join('  ')}</Text>;
  if (d.kind === 'text') return <Text style={[type.title, styles.center]}>{d.text}</Text>;
  if (d.kind === 'degreeStaff') {
    // échelle verticale lue comme une portée (retour bêta : l'interligne compte) : 1 sur une ligne, 2 dans l'interligne
    // au-dessus, 3 sur la ligne suivante… Une marche = une ligne ou un interligne.
    const STEP = 16;
    const H = STEP * (d.top + 1) + 24;
    const y = (k: number) => H - 22 - (k - 1) * STEP;
    const lines = Array.from({ length: d.top + 1 }, (_, i) => i + 1).filter((k) => k % 2 === 1);
    return (
      <View style={styles.center} role="img" accessibilityLabel="Échelle de degrés lue comme une portée : 1 sur la ligne du bas, puis interligne, ligne… Une note est posée.">
        <Svg width={180} height={H}>
          {lines.map((k) => <Line key={k} x1={40} y1={y(k)} x2={170} y2={y(k)} stroke={colors.staff} strokeWidth={2} />)}
          <SvgText x={10} y={y(1) + 5} fontSize={14} fill={colors.inkSoft} fontWeight="700">1</SvgText>
          <Circle cx={105} cy={y(d.degree)} r={8} fill={color} />
        </Svg>
      </View>
    );
  }
  if (d.kind === 'grid') {
    return (
      <View style={styles.grid} role="img" accessibilityLabel={`Grille : ${d.bars.map((b) => (b.startsWith('▶') ? `${b.replace('▶ ', '')} (case en couleur)` : b)).join(', ')}`}>
        {d.bars.map((b, i) => (
          <View key={i} style={[styles.bar, b.startsWith('▶') && { borderColor: color, backgroundColor: color }]}>
            <Text style={[styles.barNum, b.startsWith('▶') && { color: colors.onFill }]}>{i + 1}</Text>
            <Text style={[styles.barChord, b.startsWith('▶') && { color: colors.onFill }]}>{b.replace('▶ ', '')}</Text>
          </View>
        ))}
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  center: { textAlign: 'center', alignItems: 'center' },
  degrees: { fontSize: 34, fontWeight: '800', textAlign: 'center', letterSpacing: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  bar: { width: '22%', borderWidth: 2, borderColor: colors.line, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  barNum: { fontSize: 10, color: colors.inkSoft, fontWeight: '700' },
  barChord: { fontSize: 20, fontWeight: '900', color: colors.ink },
});
