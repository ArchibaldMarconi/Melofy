// Quiz (identifier, comparer) : une question à la fois, correction immédiate, réécoute de la bonne réponse.
import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Instrument, QuizItem } from '../content/types';
import { audio } from '../audio/RNAudioEngine';
import { referenceEvents, REFERENCE_TEMPO } from '../engine/music';
import { minorReference } from '../engine/chroma';
import { announce } from '../a11y';
import { useUserStore } from '../store/useUserStore';
import { Button } from '../components/Button';
import { DisplayView } from '../components/DisplayView';
import { colors, type } from '../theme';

export function QuizRunner({ items, color, tonic, instrument, rate, onDone, onReplay, minor = false, onIndex }: {
  minor?: boolean;
  /** question en cours (pour la démonstration) */
  onIndex?: (i: number) => void;
  items: QuizItem[]; color: string; tonic: number; instrument: Instrument; rate: number;
  onDone: (ids: string[]) => void; onReplay: () => void;
}) {
  const [i, setI] = useState(0);
  useEffect(() => { onIndex?.(i); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  const [ids, setIds] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const it = items[i];
  const play = useCallback(async () => {
    if (it.referenceTonic) await audio.play(minor ? minorReference(it.tonic ?? tonic) : referenceEvents(it.tonic ?? tonic), { tempo: REFERENCE_TEMPO, instrument }).done;
    if (it.stimulus.length) audio.play(it.stimulus, { tempo: it.tempo, rate, instrument });
  }, [it, tonic, instrument, rate]);
  useEffect(() => { play(); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const [review, setReview] = useState(false);
  const advance = (next: string[]) => {
    setFlash(null);
    setReview(false);
    if (i + 1 < items.length) setI(i + 1); else onDone(next);
  };
  const answer = (id: string) => {
    const next = [...ids, id];
    setIds(next);
    if (id === it.answerId) {
      announce('Correct');
      setFlash(colors.success);
      setTimeout(() => advance(next), 450);
    } else {
      // erreur : on montre la bonne réponse et on réécoute, le temps d'associer le son au nom
      announce(`Raté. La réponse était ${it.choices.find((c) => c.id === it.answerId)?.label}.`);
      setFlash(colors.danger);
      setReview(true);
      play();
    }
  };

  return (
    <View style={styles.block}>
      <Text style={type.small}>Question {i + 1}/{items.length}</Text>
      <DisplayView d={it.display} color={color} instrument={instrument} tab={useUserStore.getState().settings.guitarReading === 'tab'} />
      {it.stimulus.length ? <Button small variant="contour" color={color} label="Réécouter" onPress={() => { onReplay(); play(); }} /> : null}
      <View style={styles.choices}>
        {it.choices.map((c) => {
          const mine = flash && ids[ids.length - 1] === c.id;
          const good = review && c.id === it.answerId;
          const btn = (
            <Button key={c.id} label={good ? `✓ ${c.label}` : c.label} variant={review && !mine && !good ? 'contour' : 'plein'}
              color={good ? colors.success : mine ? flash! : color} onPress={() => !flash && answer(c.id)} style={c.preview ? { ...styles.choice, flex: 1 } : styles.choice} />
          );
          // exemple à écouter pour comparer (ex. chaque mode joué sur le bourdon)
          return c.preview ? (
            <View key={c.id} style={styles.row}>
              {btn}
              <Button small variant="contour" color={color} label="▶" accessibilityLabel={`Écouter : ${c.label}`}
                onPress={() => audio.play(c.preview!, { tempo: 110, instrument })} />
            </View>
          ) : btn;
        })}
      </View>
      {review ? (
        <Button color={color} label="Question suivante" onPress={() => advance(ids)} />
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  block: { gap: 12 },
  choices: { gap: 10 },
  choice: { paddingVertical: 18 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
});
