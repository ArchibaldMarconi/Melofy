// Test de placement par domaine. Rythme, oreille, théorie et lecture, technique : chacun trouve sa propre limite,
// indépendamment des autres. Résultat : un niveau par domaine (bases à construire ici, défis là).
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CONCEPTS } from '../content/concepts';
import {
  DOMAIN_PROBES, highestPassed, nextProbe, PLACEMENT_DOMAINS, PLACEMENT_LABEL, placedImproPairs, placedPairs,
  PROFILES, type PlacementDomain, type PlacementProfile,
} from '../content/placement';
import { templateById } from '../content/templates';
import { newSeed } from '../engine/rng';
import { ExercisePlayer } from '../exercise/ExercisePlayer';
import { useUserStore } from '../store/useUserStore';
import { Button } from '../components/Button';
import { colors, domainColor, type } from '../theme';

type Phase = 'intro' | 'run' | 'done';
/** au plus 5 questions par domaine : le test reste court, même pour un musicien avancé */
const MAX_PER_DOMAIN = 5;
type Results = Record<PlacementDomain, Record<number, boolean>>;
const emptyResults = (): Results => ({ rythme: {}, oreille: {}, theorie: {}, technique: {} });
/** déroulé du test : un seul état, mis à jour par fonctions (enregistrer puis passer à la suite s'enchaînent) */
interface Run { phase: Phase; d: number; current: number | null; count: number; results: Results }
/** ouvre le domaine k : première question selon le profil */
const openDomain = (r: Run, k: number, profile: PlacementProfile): Run =>
  ({ ...r, d: k, current: nextProbe({}, profile, DOMAIN_PROBES[PLACEMENT_DOMAINS[k]].length) });
const closeDomain = (r: Run, profile: PlacementProfile): Run =>
  (r.d + 1 < PLACEMENT_DOMAINS.length ? openDomain(r, r.d + 1, profile) : { ...r, phase: 'done' });

export function PlacementScreen() {
  const placeOut = useUserStore((s) => s.placeOut);
  const cancel = useUserStore((s) => s.setPlacementPending);
  // niveau déjà déclaré à l'accueil : on ne le redemande pas
  const preset = useUserStore((s) => s.placementProfile);
  const [profile, setProfile] = useState<PlacementProfile | null>(preset);
  // d : indice du domaine en cours
  const [run, setRun] = useState<Run>(() => ({ phase: 'intro', d: 0, current: null, count: 0, results: emptyResults() }));
  const { phase, d, current, count, results } = run;
  const [seed] = useState(newSeed);

  const domain = PLACEMENT_DOMAINS[d];
  const probes = DOMAIN_PROBES[domain];

  const start = () => setRun((r) => ({ ...openDomain({ ...r, results: emptyResults(), count: 1 }, 0, profile!), phase: 'run' }));
  const record = (success: boolean) => setRun((r) => {
    if (r.current === null) return r;
    const dom = PLACEMENT_DOMAINS[r.d];
    return { ...r, results: { ...r.results, [dom]: { ...r.results[dom], [r.current]: success } } };
  });
  const nextDomain = () => setRun((r) => closeDomain(r, profile!));
  const next = () => setRun((r) => {
    const dom = PLACEMENT_DOMAINS[r.d];
    const tested = Object.keys(r.results[dom]).length;
    const k = tested >= MAX_PER_DOMAIN ? null : nextProbe(r.results[dom], profile!, DOMAIN_PROBES[dom].length);
    const counted = { ...r, count: r.count + 1 };
    return k !== null ? { ...counted, current: k } : closeDomain(counted, profile!);
  });
  const reachedTitle = (dom: PlacementDomain) => {
    const k = highestPassed(results[dom]);
    return k < 0 ? null : CONCEPTS.find((c) => c.id === DOMAIN_PROBES[dom][k].conceptId);
  };

  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={type.display}>Test de placement</Text>
          <Text style={type.body}>{'Quatre domaines, chacun à part : rythme, oreille, théorie et lecture, technique. Tu sautes ce que tu sais déjà, et tu gardes des défis là où tu es à l\'aise.'}</Text>
          {preset ? null : <Text style={type.title}>Où en es-tu, globalement ?</Text>}
          {preset ? null : <View style={styles.choices}>
            {(Object.keys(PROFILES) as PlacementProfile[]).map((id) => {
              const on = profile === id;
              return (
                <Pressable key={id} onPress={() => setProfile(id)} accessibilityRole="radio" aria-checked={on} accessibilityState={{ checked: on }} style={[styles.choice, on && styles.choiceOn]}>
                  <Text style={[type.title, { fontSize: 17 }, on && { color: colors.onPrimary }]}>{PROFILES[id].label}</Text>
                  <Text style={[type.small, on && { color: colors.onPrimarySoft }]}>{PROFILES[id].line}</Text>
                </Pressable>
              );
            })}
          </View>}
          <Text style={type.small}>{'C\'est seulement le point de départ : dans chaque domaine, le test monte ou descend selon tes réponses. Une seule tentative par question, pas d\'aide ; « Je ne sais pas » est toujours possible.'}</Text>
          <Button label="Commencer le test" disabled={!profile} onPress={start} />
          <Button variant="texte" color={colors.inkSoft} label="Finalement, je commence au début" onPress={() => cancel(false)} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'run' && current !== null) {
    const probe = probes[current];
    const reached = reachedTitle(domain);
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.progress}>
          <Text style={[styles.domainTag, { color: domainColor[domain] }]}>{PLACEMENT_LABEL[domain]} · domaine {d + 1}/4</Text>
          <Text style={type.small}>{reached ? `Acquis : ${reached.title}` : 'On cherche ton niveau…'}</Text>
          <Pressable onPress={nextDomain} accessibilityRole="button" style={{ paddingVertical: 6 }}>
            <Text style={[type.small, { fontWeight: '800', textDecorationLine: 'underline' }]}>Passer ce domaine</Text>
          </Pressable>
        </View>
        <ExercisePlayer
          key={`${domain}-${current}-${count}`} placement template={templateById(probe.templateId)} params={probe.params} seed={seed + count} inSession={false}
          onFinished={(_, o) => record(o.success)} onNext={next} onSkip={() => { record(false); next(); }}
        />
      </SafeAreaView>
    );
  }

  const pairs = PLACEMENT_DOMAINS.flatMap((dom) => placedPairs(dom, results[dom]));
  const all = [...pairs, ...placedImproPairs(pairs)];
  const anything = pairs.length > 0;
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={type.display}>{anything ? 'Ton niveau, domaine par domaine' : 'On part du début'}</Text>
        <Text style={type.small}>{count - 1} question{count - 1 > 1 ? 's' : ''}</Text>
        {PLACEMENT_DOMAINS.map((dom) => {
          const c = reachedTitle(dom);
          return (
            <View key={dom} style={[styles.result, { borderLeftColor: domainColor[dom] }]}>
              <Text style={[styles.domainTag, { color: domainColor[dom] }]}>{PLACEMENT_LABEL[dom]}</Text>
              <Text style={type.body}>{c ? `Acquis jusqu'à « ${c.title} » : on te met au défi.` : 'Les bases à construire : on commence par là.'}</Text>
            </View>
          );
        })}
        {anything ? <Text style={type.small}>{'Les notions validées reviennent vite en révision pour confirmer qu\'elles sont solides, au niveau de difficulté le plus élevé.'}</Text> : <Text style={type.body}>{'Aucun souci : les premières leçons vont vite quand on progresse bien, et la difficulté s\'adapte à toi.'}</Text>}
        <Button label="C'est parti" onPress={() => placeOut(all)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  pad: { padding: 24, gap: 16 },
  progress: { paddingHorizontal: 20, paddingTop: 10, gap: 2 },
  domainTag: { fontWeight: '900', fontSize: 14 },
  choices: { gap: 10 },
  choice: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 2, borderWidth: 2, borderColor: colors.line },
  choiceOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  result: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 4, borderLeftWidth: 5 },
});
