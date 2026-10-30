// Une seule portée pour « ce qu'il faut jouer » ET « ce que tu joues » (retour bêta : notes affichées en double,
// texte + portée). Les notes à jouer sont en gris, avec leur nom ou leur degré dessous ; chaque note jouée vient
// s'écrire par-dessus, en vert si c'est la bonne note, en rouge sinon. La note suivante est signalée.
import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Line, Text as SvgText } from 'react-native-svg';
import { KEYSIG_STEPS, mod12, pcName, spellOnStaff, spellWithKey } from '../engine/music';
import { colors } from '../theme';
import { TrebleClef } from './TrebleClef';

const GAP = 14;
const BOTTOM = 112;
const X0_BASE = 78;
const DX = 34;
const y = (step: number) => BOTTOM - (step * GAP) / 2;

export function ScoreStaff({ targets, labels, played, color, octaveAgnostic = true, clef = 'sol', keySig = 0 }: {
  clef?: 'sol' | 'fa';
  /** armure (+ dièses, − bémols) : les notes altérées par l'armure s'écrivent sans accident */
  keySig?: number;
  /** notes écrites (guitare : déjà transposées d'une octave) */
  targets: number[]; labels?: string[]; played: number[]; color: string; octaveAgnostic?: boolean;
}) {
  const nSig = Math.abs(keySig);
  const X0 = X0_BASE + nSig * 11 + (nSig ? 8 : 0);
  const W = Math.max(320, X0 + targets.length * DX + 20);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const cur = Math.min(played.length, targets.length - 1);
  // on ne défile que quand la note suivante approche du bord droit : la clé reste visible au début
  useEffect(() => { scroll.current?.scrollTo({ x: Math.max(0, X0 + cur * DX - 250), animated: true }); }, [X0, cur]);
  const ok = (i: number) => (octaveAgnostic ? mod12(played[i]) === mod12(targets[i]) : Math.round(played[i]) === targets[i]);
  const head = (m: number, cx: number, fill: string, hollow: boolean, key: string) => {
    const sp = keySig ? spellWithKey(m, keySig, clef) : null;
    const { step: st, sharp } = sp ? { step: sp.step, sharp: false } : spellOnStaff(m, clef);
    const accTxt = sp ? sp.acc : sharp ? '♯' : null;
    const ledgers: number[] = [];
    for (let l = -2; l >= st; l -= 2) ledgers.push(l);
    for (let l = 10; l <= st; l += 2) ledgers.push(l);
    return (
      <React.Fragment key={key}>
        {ledgers.map((l) => <Line key={l} x1={cx - 13} y1={y(l)} x2={cx + 13} y2={y(l)} stroke={colors.inkSoft} strokeWidth={1.4} />)}
        {accTxt ? <SvgText x={cx - 22} y={y(st) + 6} fontSize={17} fontWeight="700" fill={fill}>{accTxt}</SvgText> : null}
        <Ellipse cx={cx} cy={y(st)} rx={8.5} ry={6} fill={hollow ? colors.card : fill} stroke={fill} strokeWidth={2} transform={`rotate(-20 ${cx} ${y(st)})`} />
      </React.Fragment>
    );
  };
  return (
    <View style={styles.box} role="img"
      accessibilityLabel={`À jouer : ${targets.map((m, i) => labels?.[i] ?? pcName(m)).join(', ')}. Joué : ${played.length ? played.map((m) => pcName(m)).join(', ') : 'rien encore'}.`}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={W} height={160} viewBox={`0 0 ${W} 160`}>
          {[0, 2, 4, 6, 8].map((st) => <Line key={st} x1={6} y1={y(st)} x2={W - 6} y2={y(st)} stroke={colors.inkSoft} strokeWidth={1.4} />)}
          {clef === 'fa' ? <SvgText x={10} y={y(4) + 6} fontSize={44} fill={colors.ink}>𝄢</SvgText> : <TrebleClef x={26} gLineY={y(2)} gap={GAP} color={colors.ink} />}
          {Array.from({ length: nSig }, (_, k) => (
            <SvgText key={`k${k}`} x={58 + k * 11} y={y(KEYSIG_STEPS[clef][keySig > 0 ? 'sharp' : 'flat'][k]) + (keySig > 0 ? 7 : 5)} fontSize={keySig > 0 ? 21 : 23} fontWeight="700" fill={colors.ink}>{keySig > 0 ? '♯' : '♭'}</SvgText>
          ))}
          {targets.map((m, i) => {
            const cx = X0 + i * DX;
            const isNext = i === played.length;
            return (
              <React.Fragment key={i}>
                {isNext ? <Line x1={cx} y1={18} x2={cx} y2={136} stroke={color} strokeWidth={2} strokeDasharray="3 4" /> : null}
                {head(m, cx, colors.inkSoft, true, `t${i}`)}
                {labels?.[i] ? <SvgText x={cx} y={154} fontSize={12} fontWeight="700" fill={isNext ? color : colors.inkSoft} textAnchor="middle">{labels[i]}</SvgText> : null}
              </React.Fragment>
            );
          })}
          {played.slice(0, targets.length).map((m, i) => head(octaveAgnostic ? targets[i] + ((mod12(m) - mod12(targets[i]) + 18) % 12) - 6 : Math.round(m), X0 + i * DX, ok(i) ? colors.success : colors.danger, false, `p${i}`))}
        </Svg>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.card, borderRadius: 16, paddingVertical: 4, height: 170, justifyContent: 'center' },
});
