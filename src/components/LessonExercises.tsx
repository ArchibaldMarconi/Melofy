// Catalogue complet des exercices des leçons, rangés par domaine puis par notion (la plus récente en haut).
// 0.24.0 : n'est plus montré aux élèves (Pratique = exercices standards ; les exercices des leçons vont dans la révision
// du workout). Il ne s'affiche que pour les tests automatisés (réglage catalogueTest), qui lancent chaque exercice d'ici.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../screens/navigation';
import type { Domain, ExerciseTemplate } from '../content/types';
import { CONCEPTS } from '../content/concepts';
import { BOSSES, MECHANIC_GLYPH, TEMPLATES } from '../content/templates';
import { DEEP_LESSONS, lessonOfConcept } from '../content/deep';
import { isAcquired, medal, type Medal } from '../engine/fsrs';
import { newSeed } from '../engine/rng';
import { templateAvailable } from '../engine/cursus';
import { lessonProgressOf, useUserStore } from '../store/useUserStore';
import { colors, domainColor, domainLabel, type } from '../theme';
import { ExerciseSheet } from './ExerciseSheet';

const MEDAL_COLOR: Record<Medal, string | null> = { aucune: null, debut: colors.medalStart, bronze: colors.bronze, argent: colors.silver, or: colors.gold };
const DOMAINS: Domain[] = ['oreille', 'rythme', 'theorie', 'technique', 'impro', 'repiquage'];
/** rang d'une notion dans le cursus (pour mettre la plus récente en haut) */
const rank = (cid: string) => { const l = lessonOfConcept(cid); return l ? DEEP_LESSONS.indexOf(l) : -1; };

export function LessonExercises() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const st = useUserStore();
  const { competences, bossDone } = st;
  const premium = st.canPractice();
  const progress = lessonProgressOf(st);
  const available = TEMPLATES.filter((t) => templateAvailable(t, progress).ok);
  const byDomain = DOMAINS.map((d) => ({ d, tpls: available.filter((t) => t.domain === d) })).filter((x) => x.tpls.length);
  const [open, setOpen] = useState<string[]>(byDomain.length ? [byDomain[0].d] : []);
  const [more, setMore] = useState<string[]>([]);
  const [sheet, setSheet] = useState<ExerciseTemplate | null>(null);
  const acquired = (t: ExerciseTemplate) => isAcquired(competences[`${t.concepts[0]}:${t.domain}`]);

  return (
    <View style={styles.box}>
      <Text style={type.title}>Tes exercices</Text>
      {!byDomain.length ? (
        <>
          <Text style={type.small}>Les exercices arrivent ici dès que tu as lu la leçon qui les explique.</Text>
          <Pressable onPress={() => (nav as unknown as { navigate: (r: string) => void }).navigate('Arbre')} accessibilityRole="button" style={styles.cta}>
            <Text style={styles.ctaText}>Aller aux leçons →</Text>
          </Pressable>
        </>
      ) : <Text style={type.small}>Ceux des notions que tu as déjà vues, par domaine, la notion la plus récente en haut.</Text>}
      {byDomain.map(({ d, tpls }) => {
        const main = tpls.filter((t) => !t.optionnel);
        const extra = tpls.filter((t) => t.optionnel);
        const expanded = open.includes(d);
        const showExtra = more.includes(d);
        const concepts = [...new Set((showExtra ? tpls : main).map((t) => t.concepts[0]))].sort((a, b) => rank(b) - rank(a));
        const color = domainColor[d];
        return (
          <View key={d} style={[styles.domain, { borderLeftColor: color }]}>
            <Pressable onPress={() => setOpen((x) => (expanded ? x.filter((k) => k !== d) : [...x, d]))} accessibilityRole="button" accessibilityState={{ expanded }}
              accessibilityLabel={`${expanded ? 'Masquer' : 'Voir'} les exercices : ${domainLabel[d]}`} style={styles.head}>
              <Text style={[styles.name, { color }]}>{domainLabel[d]}</Text>
              <Text style={styles.toggleText}>{expanded ? 'Masquer ▴' : `${main.length} exercice${main.length > 1 ? 's' : ''} ▾`}</Text>
            </Pressable>
            {expanded ? (
              <>
                {concepts.map((cid) => {
                  const c = CONCEPTS.find((x) => x.id === cid);
                  const list = (showExtra ? tpls : main).filter((t) => t.concepts[0] === cid);
                  if (!c || !list.length) return null;
                  return (
                    <View key={cid} style={styles.concept}>
                      <View style={styles.unitRow}>
                        <Text style={styles.conceptTitle}>{c.title}</Text>
                        <Text style={styles.unitCount}>{list.filter(acquired).length}/{list.length}</Text>
                      </View>
                      <View style={styles.notesRow}>
                        {list.map((t) => {
                          const m = medal(competences[`${t.concepts[0]}:${t.domain}`]);
                          return (
                            <Pressable key={t.id} onPress={() => setSheet(t)} accessibilityLabel={t.title} style={styles.noteWrap}>
                              <View style={[styles.noteHead, { backgroundColor: acquired(t) ? color : colors.card, borderColor: MEDAL_COLOR[m] ?? color }]}>
                                <Text style={[styles.noteText, { color: acquired(t) ? colors.onPrimary : color }]}>{MECHANIC_GLYPH[t.mechanic]}</Text>
                              </View>
                              <Text style={styles.noteLabel} numberOfLines={2}>{t.title}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
                {extra.length ? (
                  <Pressable onPress={() => setMore((x) => (showExtra ? x.filter((k) => k !== d) : [...x, d]))} style={styles.more} accessibilityRole="button">
                    <Text style={styles.moreText}>{showExtra ? 'Masquer les exercices en plus' : `+${extra.length} pour aller plus loin`}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        );
      })}

      {byDomain.length ? BOSSES.map((boss) => (
        <Pressable key={boss.id} style={styles.boss} onPress={() => (premium ? nav.navigate('Practice', { boss: boss.id }) : null)} accessibilityLabel={boss.title}>
          <Text style={[type.title, { color: colors.onFill }]}>{bossDone.includes(boss.id) ? '🎖️ ' : ''}{boss.title}</Text>
          <Text style={[type.body, { color: colors.onPrimarySoft }]}>{boss.description}</Text>
          {!premium ? <Text style={[type.small, { color: colors.onPrimaryFaint }]}>Arrive dans ta séance quand le palier est maîtrisé. En premium, lance-le quand tu veux.</Text> : null}
        </Pressable>
      )) : null}

      <ExerciseSheet
        template={sheet}
        locked={undefined}
        onClose={() => setSheet(null)}
        onLaunch={(params) => {
          const t = sheet!;
          setSheet(null);
          nav.navigate('Practice', { templateId: t.id, params, seed: newSeed() });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  cta: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  ctaText: { color: colors.onPrimary, fontWeight: '900' },
  domain: { backgroundColor: colors.card, borderRadius: 18, padding: 12, gap: 6, borderLeftWidth: 5 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 44 },
  name: { fontWeight: '900', fontSize: 17 },
  toggleText: { fontSize: 13, fontWeight: '800', color: colors.inkSoft },
  concept: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, gap: 8 },
  conceptTitle: { fontWeight: '800', color: colors.ink, fontSize: 15, flex: 1 },
  unitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitCount: { fontSize: 12, fontWeight: '900', color: colors.inkSoft },
  notesRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  noteWrap: { width: 70, alignItems: 'center' },
  noteHead: { width: 50, height: 38, borderRadius: 25, borderWidth: 4, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] },
  noteText: { fontWeight: '900', fontSize: 18, transform: [{ rotate: '18deg' }] },
  noteLabel: { fontSize: 11, textAlign: 'center', color: colors.ink, marginTop: 4 },
  more: { alignSelf: 'flex-start', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inkSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  moreText: { fontSize: 12, fontWeight: '800', color: colors.inkSoft },
  boss: { backgroundColor: colors.primary, borderRadius: 22, padding: 20, gap: 6, marginTop: 8 },
});
