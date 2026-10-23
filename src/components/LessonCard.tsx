// Leçon d'unité : 2 écrans au plus. 1) écouter deux extraits et deviner ; 2) l'essentiel (la suite à la demande).
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Concept, Instrument } from '../content/types';
import { UTILE } from '../content/utile';
import { audio } from '../audio/RNAudioEngine';
import { colors, type } from '../theme';
import { Button } from './Button';

export function LessonCard({ concept, color, instrument, onDone, doneLabel = 'J\'ai compris' }: { concept: Concept; color: string; instrument: Instrument; onDone: () => void; doneLabel?: string }) {
  const d = concept.discover;
  // découverte active d'abord : écouter, deviner, puis comprendre
  const [guess, setGuess] = useState<'A' | 'B' | null>(null);
  const [discovering, setDiscovering] = useState(!!d);
  const [more, setMore] = useState(false);
  const playClip = (c: { notes: import('../content/types').NoteEvent[]; tempo: number }) => { audio.init().then(() => audio.play(c.notes, { tempo: c.tempo, instrument })); };
  if (discovering && d) {
    const right = guess === d.answer;
    return (
      <View style={styles.card}>
        <Text style={[styles.unit, { color }]}>Unité {concept.unite} · à toi d'abord</Text>
        <Text style={type.title}>{d.question}</Text>
        <View style={styles.clips}>
          {(['A', 'B'] as const).map((k) => (
            <View key={k} style={styles.clipCol}>
              <Button variant="contour" color={color} label={`▶ Écouter ${k}`} onPress={() => playClip(k === 'A' ? d.a : d.b)} />
              {guess === null
                ? <Button color={color} label={`C'est ${k}`} onPress={() => setGuess(k)} />
                : <Text style={[styles.verdict, { color: k === d.answer ? colors.success : colors.inkSoft }]}>{k === d.answer ? '✓ la bonne réponse' : ' '}</Text>}
            </View>
          ))}
        </View>
        {guess !== null ? (
          <>
            <Text style={[type.title, { color: right ? colors.success : colors.warn }]}>{right ? 'Bien entendu !' : 'Pas tout à fait.'}</Text>
            <Text style={type.body}>{d.reveal}</Text>
            <Button color={color} label="L'essentiel →" onPress={() => setDiscovering(false)} />
          </>
        ) : <Text style={type.small}>Écoute les deux, autant de fois que tu veux, puis choisis.</Text>}
      </View>
    );
  }
  const [essential, ...rest] = concept.lecon;
  const play = (st: typeof essential) => { audio.init().then(() => audio.play(st.example!.notes, { tempo: st.example!.tempo, instrument })); };
  return (
    <View style={styles.card}>
      <Text style={[styles.unit, { color }]}>Unité {concept.unite} · l'essentiel</Text>
      <Text style={type.title}>{concept.title}</Text>
      {UTILE[concept.id] ? (
        <View style={[styles.utile, { borderLeftColor: color }]}>
          <Text style={[styles.utileKicker, { color }]}>À quoi ça sert</Text>
          <Text style={type.body}>{UTILE[concept.id]}</Text>
        </View>
      ) : null}
      <Text style={[type.body, styles.text]}>{essential.text}</Text>
      {essential.example ? <Button variant="contour" color={color} small label={`▶ ${essential.example.label}`} onPress={() => play(essential)} /> : null}
      {more ? rest.map((st, k) => (
        <View key={k} style={{ gap: 8 }}>
          <Text style={[type.body, styles.text]}>{st.text}</Text>
          {st.example ? <Button variant="contour" color={color} small label={`▶ ${st.example.label}`} onPress={() => play(st)} /> : null}
        </View>
      )) : null}
      <View style={styles.nav}>
        {rest.length && !more ? <Button variant="texte" color={color} label="En savoir plus" onPress={() => setMore(true)} /> : <View />}
        <Button color={color} label={doneLabel} onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  utile: { borderLeftWidth: 4, paddingLeft: 10, gap: 2 },
  utileKicker: { fontWeight: '900', fontSize: 12 },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 22, gap: 10 },
  unit: { fontWeight: '800', fontSize: 13 },
  text: { marginVertical: 8 },
  clips: { flexDirection: 'row', gap: 10 },
  clipCol: { flex: 1, gap: 8 },
  verdict: { textAlign: 'center', fontWeight: '800', minHeight: 20 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
});
