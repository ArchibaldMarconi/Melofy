// Onglet « Jouer » : les outils (métronome, accordeur), l'entraînement ciblé en un toucher (l'appli choisit les
// exercices et le niveau), et, replié sous « Personnaliser », le catalogue réglable pour qui veut tout choisir :
// ear training, rythme, mapping (façon « Solo » de Tom Quayle), technique au métronome, perroquet.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './navigation';
import type { Params } from '../content/types';
import { newSeed } from '../engine/rng';
import { INTERVAL_LABEL } from '../engine/chroma';
import { useUserStore } from '../store/useUserStore';
import { Button } from '../components/Button';
import { colors, domainColor, type } from '../theme';
import { CHORD_TYPES, DEFAULT_DRILL, SCALES, INTERVAL_SHORT, type DrillConfig, type DrillKind, type Order } from '../drills/engine';
import { DrillRunner } from '../drills/DrillRunner';
import { LessonExercises } from '../components/LessonExercises';
import { AREAS, AREA_LABEL, AREA_LINE } from '../content/skills';
import { TEMPLATES } from '../content/templates';
import { focusPool } from '../engine/focus';
import { lessonProgressOf } from '../store/useUserStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** chips à sélection multiple ou unique */
function Chips<T extends string | number>({ options, value, onChange, multi = true, color }: {
  options: [T, string][]; value: T[]; onChange: (v: T[]) => void; multi?: boolean; color: string;
}) {
  return (
    <View style={styles.chips}>
      {options.map(([k, label]) => {
        const on = value.includes(k);
        return (
          <Pressable key={String(k)} accessibilityRole={multi ? 'checkbox' : 'radio'} aria-checked={on} accessibilityState={{ checked: on }}
            onPress={() => onChange(multi ? (on ? (value.length > 1 ? value.filter((x) => x !== k) : value) : [...value, k]) : [k])}
            style={[styles.chip, { borderColor: color }, on && { backgroundColor: color }]}>
            <Text style={[styles.chipText, { color: on ? colors.onFill : color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Card({ title, line, color, open, onToggle, children }: { title: string; line: string; color: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={type.title}>{title}</Text>
          <Text style={type.small}>{line}</Text>
        </View>
        <Text style={[styles.chev, { color }]}>{open ? '−' : '+'}</Text>
      </Pressable>
      {open ? <View style={{ gap: 10 }}>{children}</View> : null}
    </View>
  );
}

const ALL_INTERVALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES: [number, string][] = [[1, '1 min'], [2, '2 min'], [5, '5 min'], [10, '10 min']];

export function AtelierScreen() {
  const nav = useNavigation<Nav>();
  const st = useUserStore();
  const [drill, setDrill] = useState<DrillConfig | null>(null);
  const [custom, setCustom] = useState(false);
  if (drill) {
    return (
      <SafeAreaView style={styles.screen}>
        <DrillRunner config={drill} onExit={() => setDrill(null)} />
      </SafeAreaView>
    );
  }
  const progress = lessonProgressOf(st);
  const canSing = st.settings.canSing ?? true;
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={type.display}>Jouer</Text>
        <View style={styles.tools}>
          <Tool glyph="♩" title="Métronome" onPress={() => nav.navigate('Metronome')} />
          <Tool glyph="⋔" title="Accordeur" onPress={() => nav.navigate('Accordeur')} />
          <Tool glyph="♫" title="Jam" onPress={() => nav.navigate('Jam')} />
        </View>

        <Text style={styles.section}>Entraînement ciblé</Text>
        <Text style={type.small}>5 minutes sur un domaine : l'appli choisit les exercices et le niveau.</Text>
        {AREAS.map((a) => {
          const open = focusPool({ area: a, templates: TEMPLATES, progress, canSing }).length > 0;
          return (
            <Pressable key={a} disabled={!open} onPress={() => nav.navigate('Focus', { area: a })} accessibilityRole="button" accessibilityLabel={`Entraînement ciblé : ${AREA_LABEL[a]}`}
              style={({ pressed }) => [styles.focus, { borderLeftColor: AREA_COLOR[a] }, !open && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}>
              <View style={{ flex: 1 }}>
                <Text style={type.title}>{AREA_LABEL[a]}</Text>
                <Text style={type.small}>{open ? AREA_LINE[a] : 'S\'ouvre avec tes premières leçons'}</Text>
              </View>
              <Text style={[styles.play, { color: AREA_COLOR[a] }]}>▶</Text>
            </Pressable>
          );
        })}

        <Pressable onPress={() => setCustom((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: custom }} style={styles.disclosure}>
          <Text style={styles.disclosureText}>{custom ? 'Masquer les réglages ▴' : 'Personnaliser un exercice ▾'}</Text>
        </Pressable>
        {custom ? <Catalogue onDrill={setDrill} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const AREA_COLOR = { oreille: domainColor.oreille, mains: domainColor.technique, lecture: domainColor.theorie, rythme: domainColor.rythme } as const;

function Tool({ glyph, title, onPress }: { glyph: string; title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [styles.tool, pressed && { opacity: 0.85 }]}>
      <Text style={styles.toolGlyph}>{glyph}</Text>
      <Text style={styles.toolTitle}>{title}</Text>
    </Pressable>
  );
}

/** le catalogue réglable : tout choisir soi-même (élément, durée, tempo…) */
function Catalogue({ onDrill }: { onDrill: (c: DrillConfig) => void }) {
  const nav = useNavigation<Nav>();
  const st = useUserStore();
  const instrument = st.settings.instrument;
  const [open, setOpen] = useState<string | null>(null);
  // réglages de l'oreille
  const [ivSens, setIvSens] = useState<string[]>(['montant']);
  const [ivSet, setIvSet] = useState<number[]>([3, 4, 5, 7, 12]);
  const [triads, setTriads] = useState<string[]>(['majeur', 'mineur', 'dim', 'aug']);
  const [inv, setInv] = useState<string[]>(['non']);
  const [tetrads, setTetrads] = useState<string[]>(['maj7', 'dom7', 'm7', 'm7b5']);
  const [scales, setScales] = useState<string[]>(['majeure', 'mineure', 'dorien', 'mixolydien']);
  const [degrees, setDegrees] = useState<string[]>(['1', '2', 'b3', '3', '4', '5', 'b6', '6', 'b7', '7']);
  const [parrotNotes, setParrotNotes] = useState<number[]>([4]);
  const [earMinutes, setEarMinutes] = useState<number[]>([2]);
  const [posScale, setPosScale] = useState<string[]>(['majeure']);
  const [posBox, setPosBox] = useState<string[]>(['1']);
  const [posSens, setPosSens] = useState<string[]>(['aller_retour']);
  const [posStep, setPosStep] = useState<number[]>([5]);
  const [ryMode, setRyMode] = useState<string[]>(['lire']);
  const [ryMeter, setRyMeter] = useState<number[]>([4]);
  const [ryTempo, setRyTempo] = useState<number[]>([70]);
  const [ryFig, setRyFig] = useState<string[]>(['noire', 'croches', 'soupir']);
  const [posGuide, setPosGuide] = useState<string[]>(['complet']);
  const [posTempo, setPosTempo] = useState<number[]>([0]);
  const [parrotScale, setParrotScale] = useState<string[]>(['penta_mineure']);
  const [sightLevel, setSightLevel] = useState<string[]>(['1']);
  // réglages de l'instrument
  const [d, setD] = useState<Omit<DrillConfig, 'kind'>>({ ...DEFAULT_DRILL, notation: st.settings.chordNotation ?? 'maj7' });
  const set = (patch: Partial<Omit<DrillConfig, 'kind'>>) => setD((x) => ({ ...x, ...patch }));

  // séries chronométrées : la durée choisie s'applique aux exercices d'oreille et au perroquet
  const ear = (templateId: string, params: Params) => nav.navigate('Practice', { templateId, params, seed: newSeed(), minutes: earMinutes[0] });
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  const oc = domainColor.oreille;
  const tc = domainColor.technique;
  const ic = domainColor.impro;
  const rc = domainColor.rythme;
  const common = (
    <>
      <Text style={type.small}>Après avoir trouvé</Text>
      <Chips options={[['trouve', 'Suivant tout de suite'], ['2s', 'Pause 2 s'], ['5s', 'Pause 5 s']]} value={[d.advance]} onChange={([a]) => set({ advance: a as DrillConfig['advance'] })} multi={false} color={tc} />
      <Text style={type.small}>Je joue</Text>
      <Chips options={[['ecran', instrument === 'guitare' ? 'Sur le manche à l\'écran' : 'Sur le clavier à l\'écran'], ['micro', 'Sur mon instrument (micro)']]} value={[d.input]} onChange={([i]) => set({ input: i as DrillConfig['input'] })} multi={false} color={tc} />
      <Chips options={[['oui', 'Afficher les doigtés']]} value={d.showFingerings ? ['oui'] : []} onChange={() => set({ showFingerings: !d.showFingerings })} color={tc} />
    </>
  );
  const go = (kind: DrillKind) => onDrill({ kind, ...d, minutes: earMinutes[0] });

  return (
    <View style={{ gap: 12 }}>
        {st.settings.catalogueTest ? <LessonExercises /> : null}

        <Text style={type.small}>Durée d'une série</Text>
        <Chips options={MINUTES} value={earMinutes} onChange={setEarMinutes} multi={false} color={oc} />

        <Text style={[styles.section, { color: oc }]}>Ear training</Text>
        <Card title="Intervalles" line="Mélodiques ou harmoniques, ceux que tu choisis" color={oc} open={open === 'iv'} onToggle={() => toggle('iv')}>
          <Chips options={[['montant', 'Montants'], ['descendant', 'Descendants'], ['harmonique', 'Ensemble']]} value={ivSens} onChange={setIvSens} multi={false} color={oc} />
          <Chips options={ALL_INTERVALS.map((x) => [x, INTERVAL_SHORT[x]] as [number, string])} value={ivSet} onChange={setIvSet} color={oc} />
          <Button color={oc} label="Lancer" onPress={() => ear('OR-3-05', { sens: ivSens[0], intervalles: ivSet, questions: 8 })} />
        </Card>
        <Card title="Triades" line="Majeur, mineur, diminué, augmenté" color={oc} open={open === 'tri'} onToggle={() => toggle('tri')}>
          <Chips options={[['majeur', 'Majeur'], ['mineur', 'Mineur'], ['dim', 'Diminué'], ['aug', 'Augmenté']]} value={triads} onChange={setTriads} color={oc} />
          <Chips options={[['non', 'Position fondamentale'], ['oui', 'Renversées']]} value={inv} onChange={setInv} multi={false} color={oc} />
          <Button color={oc} label="Lancer" onPress={() => ear('OR-3-09', { qualites: triads, renverse: inv[0] === 'oui', questions: 8 })} />
        </Card>
        <Card title="Tétrades" line="Accords de 7e" color={oc} open={open === 'tet'} onToggle={() => toggle('tet')}>
          <Chips options={(['maj7', 'dom7', 'm7', 'm7b5'] as const).map((k) => [k, CHORD_TYPES[k].label] as [string, string])} value={tetrads} onChange={setTetrads} color={oc} />
          <Button color={oc} label="Lancer" onPress={() => ear('OR-4-01', { qualites: tetrads, questions: 8 })} />
        </Card>
        <Card title="Gammes et modes" line="Reconnaître la gamme jouée" color={oc} open={open === 'sc'} onToggle={() => toggle('sc')}>
          <Chips options={Object.entries(SCALES).map(([k, v]) => [k, v.label] as [string, string])} value={scales} onChange={setScales} color={oc} />
          <Button color={oc} label="Lancer" onPress={() => ear('OR-3-12', { gammes: scales, questions: 8 })} />
        </Card>
        <Card title="Degrés" line="Reconnaître un degré après la cadence (♭3, ♯4… compris)" color={oc} open={open === 'deg'} onToggle={() => toggle('deg')}>
          <Chips options={['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'].map((x) => [x, x.replace('b', '♭').replace('#', '♯')] as [string, string])} value={degrees} onChange={setDegrees} color={oc} />
          <Button color={oc} label="Lancer" onPress={() => ear('OR-3-04', { degres: degrees, mineur: false, questions: 8 })} />
        </Card>

        <Text style={[styles.section, { color: rc }]}>Rythme</Text>
        <Card title="Rythme" line="Lire ou reproduire un rythme, avec le métronome" color={rc} open={open === 'ry'} onToggle={() => toggle('ry')}>
          <Chips options={[['lire', 'Lire et taper'], ['perroquet', 'Reproduire à l\'oreille']]} value={ryMode} onChange={setRyMode} multi={false} color={rc} />
          <Text style={type.small}>Temps par mesure</Text>
          <Chips options={[[2, '2'], [3, '3'], [4, '4'], [5, '5'], [7, '7']]} value={ryMeter} onChange={setRyMeter} multi={false} color={rc} />
          <Text style={type.small}>Tempo</Text>
          <Chips options={[[60, '60'], [70, '70'], [80, '80'], [90, '90'], [100, '100'], [120, '120']]} value={ryTempo} onChange={setRyTempo} multi={false} color={rc} />
          <Text style={type.small}>Figures</Text>
          <Chips options={[['noire', 'Noires'], ['blanche', 'Blanches'], ['soupir', 'Silences'], ['croches', 'Croches'], ['doubles', 'Doubles croches'], ['triolet', 'Triolets'], ['syncope', 'Syncopes']]} value={ryFig} onChange={setRyFig} color={rc} />
          <Button color={rc} label="Lancer" onPress={() => ear(ryMode[0] === 'lire' ? 'RY-1-03' : 'RY-1-04', { tempo: ryTempo[0], mesure: ryMeter[0], mesures: 2, figures: ryFig.includes('noire') ? ryFig : ['noire', ...ryFig], metronome: true })} />
        </Card>

        <Text style={[styles.section, { color: tc }]}>Mapping</Text>
        <Card title="Notes" line="Une note s'affiche : trouve-la" color={tc} open={open === 'notes'} onToggle={() => toggle('notes')}>
          <Chips options={instrument === 'guitare'
            ? [[1, 'Niveau 1 · une fois'], [2, 'Niveau 2 · partout'], [3, 'Niveau 3 · dans une zone']]
            : [[1, 'Niveau 1 · une fois'], [2, 'Niveau 2 · toutes les octaves'], [3, 'Niveau 3 · une octave précise']]}
            value={[d.noteLevel]} onChange={([l]) => set({ noteLevel: l as 1 | 2 | 3 })} multi={false} color={tc} />
          <Chips options={[['non', 'Notes naturelles'], ['oui', 'Avec ♯ et ♭']]} value={[d.accidentals ? 'oui' : 'non']} onChange={([a]) => set({ accidentals: a === 'oui' })} multi={false} color={tc} />
          {common}
          <Button color={tc} label="Lancer" onPress={() => go('notes')} />
        </Card>
        <Card title="Intervalles" line="Une note et un intervalle : joue-le" color={tc} open={open === 'tiv'} onToggle={() => toggle('tiv')}>
          <Chips options={ALL_INTERVALS.map((x) => [x, INTERVAL_SHORT[x]] as [number, string])} value={d.intervals} onChange={(v) => set({ intervals: v })} color={tc} />
          <Chips options={[['oui', 'Jouer la tonique d\'abord'], ['alea', 'Tonique aléatoire']]} value={[...(d.playRootFirst ? ['oui'] : []), ...(d.randomRoot ? ['alea'] : [])]}
            onChange={(v) => set({ playRootFirst: v.includes('oui'), randomRoot: v.includes('alea') })} color={tc} />
          {common}
          <Button color={tc} label="Lancer" onPress={() => go('intervalles')} />
        </Card>
        <Card title="Accords" line="Un accord s'affiche : joue ses notes" color={tc} open={open === 'ch'} onToggle={() => toggle('ch')}>
          <Chips options={Object.entries(CHORD_TYPES).map(([k, v]) => [k, v.label] as [string, string])} value={d.chordTypes} onChange={(v) => set({ chordTypes: v })} color={tc} />
          <Chips options={([['montant', 'Montant'], ['descendant', 'Descendant'], ['aller_retour', 'Aller-retour'], ['aleatoire', 'Aléatoire']] as [Order, string][])} value={[d.order]} onChange={([o]) => set({ order: o })} multi={false} color={tc} />
          <Chips options={[['maj7', 'Notation maj7, m7'], ['delta', 'Notation Δ7, –7']]} value={[d.notation]} onChange={([n]) => { set({ notation: n as 'maj7' | 'delta' }); st.setSettings({ chordNotation: n as 'maj7' | 'delta' }); }} multi={false} color={tc} />
          {common}
          <Button color={tc} label="Lancer" onPress={() => go('accords')} />
        </Card>
        <Card title="Gammes" line="Une gamme s'affiche : joue-la" color={tc} open={open === 'tsc'} onToggle={() => toggle('tsc')}>
          <Chips options={Object.entries(SCALES).map(([k, v]) => [k, v.label] as [string, string])} value={d.scales} onChange={(v) => set({ scales: v })} color={tc} />
          <Chips options={([['montant', 'Montant'], ['descendant', 'Descendant'], ['aller_retour', 'Aller-retour'], ['aleatoire', 'Aléatoire']] as [Order, string][])} value={[d.order]} onChange={([o]) => set({ order: o })} multi={false} color={tc} />
          {common}
          <Button color={tc} label="Lancer" onPress={() => go('gammes')} />
        </Card>

        <Text style={[styles.section, { color: tc }]}>Technique</Text>
        <Card title="Gammes au métronome" line="Une gamme, position par position, de plus en plus vite" color={tc} open={open === 'pos'} onToggle={() => toggle('pos')}>
          <Chips options={[['majeure', 'Majeure'], ['mineure', 'Mineure'], ['penta_majeure', 'Penta majeure'], ['penta_mineure', 'Penta mineure'], ['blues', 'Blues'], ['dorien', 'Dorien'], ['mixolydien', 'Mixolydien']]} value={posScale} onChange={setPosScale} multi={false} color={tc} />
          {instrument === 'guitare' ? <Chips options={[['corde', 'Une seule corde'], ...[1, 2, 3, 4, 5].map((x) => [String(x), `Position ${x}`] as [string, string]), ['alea', 'Au hasard']]} value={posBox} onChange={setPosBox} multi={false} color={tc} /> : null}
          <Chips options={[['monter', 'Monter'], ['descendre', 'Descendre'], ['aller_retour', 'Monter puis descendre']]} value={posSens} onChange={setPosSens} multi={false} color={tc} />
          <Chips options={[['complet', 'Tout affiché'], ['fondamentale', 'Fondamentales seules'], ['aucun', 'De mémoire']]} value={posGuide} onChange={setPosGuide} multi={false} color={tc} />
          <Text style={type.small}>Tempo de départ</Text>
          <Chips options={[[0, 'Sans clic'], [60, '60'], [80, '80'], [100, '100'], [120, '120']]} value={posTempo} onChange={setPosTempo} multi={false} color={tc} />
          {posTempo[0] ? <>
            <Text style={type.small}>Après chaque réussite</Text>
            <Chips options={[[0, 'Même tempo'], [5, '+5 BPM'], [10, '+10 BPM']]} value={posStep} onChange={setPosStep} multi={false} color={tc} />
          </> : null}
          <Button color={tc} label="Lancer" onPress={() => {
            const oneString = instrument === 'guitare' && posBox[0] === 'corde';
            const gamme = oneString && posScale[0] === 'blues' ? 'penta_mineure' : posScale[0];
            nav.navigate('Practice', {
              templateId: oneString ? 'TQ-1-01' : 'TE-3-04', seed: newSeed(), minutes: earMinutes[0], tempoStep: posTempo[0] ? posStep[0] : 0,
              params: oneString ? { gamme, sens: posSens[0] } : { gamme, position: posBox[0] === 'alea' ? 'alea' : Number(posBox[0]), guide: posGuide[0], sens: posSens[0], ...(posTempo[0] ? { tempo_cle: posTempo[0], etiquettes: 'doigts' } : {}) },
            });
          }} />
          {instrument === 'guitare' ? <Button variant="contour" color={tc} label="Formes d'accords" onPress={() => ear('TE-3-06', { accords: ['majeur', 'mineur', 'dom7', 'maj7', 'm7'], guide: posGuide[0] })} /> : null}
        </Card>

        <Text style={[styles.section, { color: domainColor.theorie }]}>Lecture</Text>
        <Card title="Lecture à vue en rythme" line="Notes et rythme, au métronome, sans t'arrêter" color={domainColor.theorie} open={open === 'sight'} onToggle={() => toggle('sight')}>
          <Chips options={[['1', 'Noires'], ['2', '+ blanches et croches'], ['3', '+ silences et syncopes']]} value={sightLevel} onChange={setSightLevel} multi={false} color={domainColor.theorie} />
          <Button color={domainColor.theorie} label="Lancer" onPress={() => ear('TE-2-16', sightLevel[0] === '1'
            ? { mesures: 1, figures: ['noire'], tempo: 60, de: 60, a: 67 }
            : sightLevel[0] === '2' ? { mesures: 2, figures: ['noire', 'blanche', 'croches'], tempo: 70, de: 57, a: 76 }
            : { mesures: 2, figures: ['noire', 'croches', 'soupir', 'syncope'], tempo: 80, de: 55, a: 79 })} />
        </Card>

        <Text style={[styles.section, { color: ic }]}>Improvisation</Text>
        <Card title="Perroquet" line="L'appli joue une mélodie, tu la reproduis" color={ic} open={open === 'par'} onToggle={() => toggle('par')}>
          <Chips options={[[3, '3 notes'], [4, '4 notes'], [6, '6 notes'], [8, '8 notes']]} value={parrotNotes} onChange={setParrotNotes} multi={false} color={ic} />
          <Chips options={Object.entries(SCALES).map(([k, v]) => [k, v.label] as [string, string])} value={parrotScale} onChange={setParrotScale} multi={false} color={ic} />
          <Button color={ic} label="Lancer" onPress={() => ear('IM-3-01', { nb_notes: parrotNotes[0], degres: SCALES[parrotScale[0]].tokens })} />
        </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  tools: { flexDirection: 'row', gap: 10 },
  tool: { flex: 1, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 18, alignItems: 'center', gap: 4 },
  toolGlyph: { fontSize: 30, color: colors.ink },
  toolTitle: { fontWeight: '900', color: colors.ink },
  focus: { backgroundColor: colors.card, borderRadius: 18, padding: 14, borderLeftWidth: 5, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64 },
  play: { fontSize: 24, fontWeight: '900' },
  disclosure: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', marginTop: 8 },
  disclosureText: { fontSize: 14, fontWeight: '800', color: colors.inkSoft },
  screen: { flex: 1, backgroundColor: colors.paper },
  pad: { padding: 20, gap: 12, paddingBottom: 40 },
  section: { fontSize: 20, fontWeight: '900', marginTop: 8, color: colors.ink },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 10, borderLeftWidth: 5 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  chev: { fontSize: 28, fontWeight: '900', width: 30, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  chipText: { fontWeight: '800', fontSize: 13 },
});

void INTERVAL_LABEL;
