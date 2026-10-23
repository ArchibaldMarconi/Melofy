// Panneaux d'affichage du lecteur d'exercice (sans état) : la consigne et le retour après une erreur.
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { Instrument, ScoreResult } from '../content/types';
import type { LessonPoint } from '../content/lessons';
import { Button } from '../components/Button';
import { PointTip } from '../components/PointTip';
import { RhythmTimeline } from '../components/RhythmTimeline';
import { colors, type } from '../theme';

export function ConsigneCard({ color, instrument, faire, how, success, placement, introPoint, otherPoints, onOpenPoint, startLabel, onStart }: {
  color: string; instrument: Instrument; faire: string; how: string; success: string; placement: boolean;
  introPoint: LessonPoint | null; otherPoints: LessonPoint[]; onOpenPoint: (p: LessonPoint) => void; startLabel: string; onStart: () => void;
}) {
  return (
    <View style={styles.block}>
      <View style={styles.consigne}>
        <Text style={[styles.cHead, { color }]}>À faire</Text>
        <Text style={type.body}>{faire}</Text>
        <Text style={[styles.cHead, { color }]}>Pour répondre</Text>
        <Text style={type.body}>{how}</Text>
        <Text style={[styles.cHead, { color }]}>C'est réussi si…</Text>
        <Text style={type.body}>{success}</Text>
        {!placement ? <Text style={type.small}>Tu as 3 essais. Le bouton « Aide » propose de ralentir, un indice, la correction ou une démonstration.</Text> : null}
      </View>
      {introPoint ? <PointTip point={introPoint} color={color} instrument={instrument} label="Nouveau" onMore={() => onOpenPoint(introPoint)} /> : null}
      {!placement && otherPoints.length ? (
        <View style={styles.points}>
          {otherPoints.map((pt) => <Button key={pt.id} small variant="texte" color={color} label={`📖 ${pt.title}`} onPress={() => onOpenPoint(pt)} />)}
        </View>
      ) : null}
      <Button color={color} label={startLabel} onPress={onStart} />
    </View>
  );
}

export function FeedbackPanel({ last, color, instrument, revealed, shake, showAllErrors, onShowAllErrors, correction, timeline, compare, tip, onOpenPoint, onRetry }: {
  last: ScoreResult; color: string; instrument: Instrument; revealed: boolean; shake: object;
  showAllErrors: boolean; onShowAllErrors: () => void; correction: string | null;
  timeline: { expected: number[]; taps: number[]; tolMs: number } | null;
  compare: { onMine: () => void; onModel: () => void; modelIsHint: boolean } | null;
  tip: { point: LessonPoint; kind: 'conseil' | 'rappel' } | null;
  onOpenPoint: (p: LessonPoint) => void; onRetry: () => void;
}) {
  return (
    <View style={styles.block}>
      {revealed ? <Text style={type.body}>La vraie tonique vient de jouer : compare-la avec ce que tu as chanté, puis réessaie.</Text> : null}
      <Animated.View style={shake}>
        <Text style={[type.title, { color: last.precision >= 0.6 ? colors.warn : colors.danger }]}>
          {last.precision >= 0.6 ? 'Presque !' : 'Pas encore'} · {Math.round(last.precision * 100)} %
        </Text>
      </Animated.View>
      {last.errors.slice(0, showAllErrors ? 8 : 2).map((e, i) => <Text key={i} style={type.body}>• {e.message}</Text>)}
      {last.errors.length > 2 && !showAllErrors ? (
        <Button small variant="texte" color={color} label={`Voir le détail (${last.errors.length - 2} de plus)`} onPress={onShowAllErrors} style={{ alignSelf: 'flex-start' }} />
      ) : null}
      {correction ? <Text style={[styles.correction, { borderColor: color }]}>Attendu : {correction}</Text> : null}
      {timeline ? <RhythmTimeline expectedMs={timeline.expected} tapsMs={timeline.taps} tolMs={timeline.tolMs} /> : null}
      {compare ? (
        <View style={styles.compare}>
          <Text style={type.small}>Compare à l'oreille :</Text>
          <View style={styles.row}>
            <Button small variant="contour" color={color} label="▶ Ta version" onPress={compare.onMine} style={{ flex: 1 }} />
            <Button small variant="contour" color={color} label={compare.modelIsHint ? '▶ Le modèle (indice)' : '▶ Le modèle'} onPress={compare.onModel} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
      {tip?.kind === 'conseil' ? (
        <PointTip point={tip.point} color={color} instrument={instrument} label="Un conseil" onMore={() => onOpenPoint(tip.point)} />
      ) : tip ? (
        <View style={styles.reminder}>
          <Text style={type.body}><Text style={{ fontWeight: '900', color }}>Rappel · </Text>{tip.point.astuce}</Text>
          <Button small variant="texte" color={color} label={`📖 ${tip.point.title}`} onPress={() => onOpenPoint(tip.point)} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}
      <Button color={color} label="Réessayer" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  consigne: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 4 },
  cHead: { fontWeight: '900', fontSize: 13, marginTop: 8 },
  points: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  correction: { borderLeftWidth: 4, paddingLeft: 10, fontSize: 16, fontWeight: '700', color: colors.ink },
  compare: { gap: 6 },
  row: { flexDirection: 'row', gap: 8 },
  reminder: { backgroundColor: colors.hintBg, borderRadius: 14, padding: 12, gap: 6 },
});
