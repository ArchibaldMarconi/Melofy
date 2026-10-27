// Onglet « Jouer » : les outils (métronome, accordeur, jam), puis l'entraînement libre, ouvert sans condition sur
// tous les domaines (oreille, chant, rythme, lecture, théorie, instrument façon « Solo » de Tom Quayle, technique,
// improvisation) : on choisit les éléments et la durée de la série. En bas, l'entraînement guidé (l'appli choisit).
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './navigation';
import type { Params } from '../content/types';
import { newSeed } from '../engine/rng';
import { INTERVAL_LABEL } from '../engine/chroma';
import { lessonProgressOf, useUserStore } from '../store/useUserStore';
import { Button } from '../components/Button';
import { colors, domainColor, type } from '../theme';
import { CHORD_TYPES, DEFAULT_DRILL, SCALES, INTERVAL_SHORT, type DrillConfig, type DrillKind, type Order } from '../drills/engine';
import { DrillRunner } from '../drills/DrillRunner';
import { LessonExercises } from '../components/LessonExercises';
import { AREAS, AREA_LABEL } from '../content/skills';
import { TEMPLATES } from '../content/templates';
import { focusPool } from '../engine/focus';

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
const MINUTES: [number, string][] = [[1, '1 min'], [2, '2 min'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [20, '20 min']];

export function AtelierScreen() {
  const nav = useNavigation<Nav>();
  const st = useUserStore();
  const [drill, setDrill] = useState<DrillConfig | null>(null);
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

        <Text style={styles.section}>Entraînement libre</Text>
        <Text style={type.small}>{'Tout est ouvert, quelles que soient tes leçons : choisis un domaine, règle-le, lance. Les exercices s\'enchaînent jusqu\'à la fin de la durée choisie.'}</Text>
        <Catalogue onDrill={setDrill} />

        <Text style={styles.section}>{'Ou laisse l\'appli choisir'}</Text>
        <Text style={type.small}>5 minutes sur un domaine, avec les exercices et le niveau de tes leçons.</Text>
        <View style={styles.guided}>
          {AREAS.map((a) => {
            const open = focusPool({ area: a, templates: TEMPLATES, progress, canSing }).length > 0;
            return (
              <Pressable key={a} disabled={!open} onPress={() => nav.navigate('Focus', { area: a })} accessibilityRole="button" accessibilityLabel={`Entraînement guidé : ${AREA_LABEL[a]}`}
                style={({ pressed }) => [styles.focus, { borderLeftColor: AREA_COLOR[a] }, !open && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}>
                <Text style={[type.body, { fontWeight: '900', flex: 1 }]}>{AREA_LABEL[a]}</Text>
                <Text style={[styles.play, { color: AREA_COLOR[a] }]}>{open ? '▶' : '🔒'}</Text>
              </Pressable>
            );
          })}
        </View>
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
  const [dictDeg, setDictDeg] = useState<string[]>(['1-5']);
  const [dictN, setDictN] = useState<number[]>([4]);
  const [dictMode, setDictMode] = useState<string[]>(['degres']);
  const [harmony, setHarmony] = useState<string[]>(['fonctions']);
  const [singIv, setSingIv] = useState<number[]>([3, 4, 5, 7, 12]);
  const [readClef, setReadClef] = useState<string[]>(['sol']);
  const [readRange, setReadRange] = useState<string[]>(['portee']);
  const [buildKind, setBuildKind] = useState<string[]>(['triades']);
  const [keyMax, setKeyMax] = useState<number[]>([2]);
  const [funcSet, setFuncSet] = useState<number[]>([3, 5, 8]);
  const [funcBelow, setFuncBelow] = useState<string[]>([]);
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

        <Text style={type.small}>{'Durée d\'une série'}</Text>
        <Chips options={MINUTES} value={earMinutes} onChange={setEarMinutes} multi={false} color={colors.primary} />

        <Text style={[styles.sub, { color: oc }]}>Oreille</Text>
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
        <Card title="Dictée mélodique" line="Une phrase est jouée : écris-la en degrés ou sur la portée" color={oc} open={open === 'dict'} onToggle={() => toggle('dict')}>
          <Chips options={[['1-3', 'Notes 1 à 3'], ['1-5', 'Notes 1 à 5'], ['gamme', 'Toute la gamme']]} value={dictDeg} onChange={setDictDeg} multi={false} color={oc} />
          <Chips options={[[3, '3 notes'], [4, '4 notes'], [5, '5 notes'], [6, '6 notes']]} value={dictN} onChange={setDictN} multi={false} color={oc} />
          <Chips options={[['degres', 'En degrés (1, 2, 3…)'], ['portee', 'Sur la portée']]} value={dictMode} onChange={setDictMode} multi={false} color={oc} />
          <Button color={oc} label="Lancer" onPress={() => {
            const degres = dictDeg[0] === '1-3' ? [1, 2, 3] : dictDeg[0] === '1-5' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7];
            ear(dictMode[0] === 'portee' ? 'OR-2-12' : 'OR-2-04', dictMode[0] === 'portee' ? { degres, nb_notes: dictN[0] } : { degres, nb_notes: dictN[0], bourdon: true });
          }} />
        </Card>
        <Card title="Accords et grilles" line="Fonctions, dictée de grille, cadences" color={oc} open={open === 'harm'} onToggle={() => toggle('harm')}>
          <Chips options={[['fonctions', 'I, IV ou V ?'], ['grille', 'Dictée de grille'], ['grille7', 'Grilles en 7e'], ['cadences', 'Cadences']]} value={harmony} onChange={setHarmony} multi={false} color={oc} />
          <Button color={oc} label="Lancer" onPress={() => {
            const h = harmony[0];
            if (h === 'fonctions') ear('OR-2-08', { questions: 8 });
            else if (h === 'grille') ear('OR-3-11', { nb_accords: 4, degres: [1, 2, 4, 5, 6] });
            else if (h === 'grille7') ear('OR-4-03', { nb_accords: 4, degres: [1, 2, 5, 6], septiemes: true });
            else ear('OR-4-02', { questions: 8, cadences: ['parfaite', 'plagale', 'demi', 'rompue'] });
          }} />
        </Card>

        <Text style={[styles.sub, { color: oc }]}>Chant</Text>
        <Card title="Chanter les intervalles" line="Une note est jouée : chante l'intervalle demandé au-dessus" color={oc} open={open === 'sing'} onToggle={() => toggle('sing')}>
          <Chips options={[1, 2, 3, 4, 5, 7, 9, 12].map((x) => [x, INTERVAL_SHORT[x]] as [number, string])} value={singIv} onChange={setSingIv} color={oc} />
          <Button color={oc} label="Lancer" onPress={() => ear('OR-3-08', { intervalles: singIv })} />
        </Card>

        <Text style={[styles.sub, { color: rc }]}>Rythme</Text>
        <Card title="Rythme" line="Lire ou reproduire un rythme, avec le métronome" color={rc} open={open === 'ry'} onToggle={() => toggle('ry')}>
          <Chips options={[['lire', 'Lire et taper'], ['perroquet', 'Reproduire à l\'oreille'], ['ecrire', 'Écrire ce que j\'entends']]} value={ryMode} onChange={setRyMode} multi={false} color={rc} />
          <Text style={type.small}>Temps par mesure</Text>
          <Chips options={[[2, '2'], [3, '3'], [4, '4'], [5, '5'], [7, '7']]} value={ryMeter} onChange={setRyMeter} multi={false} color={rc} />
          <Text style={type.small}>Tempo</Text>
          <Chips options={[[60, '60'], [70, '70'], [80, '80'], [90, '90'], [100, '100'], [120, '120']]} value={ryTempo} onChange={setRyTempo} multi={false} color={rc} />
          <Text style={type.small}>Figures</Text>
          <Chips options={[['noire', 'Noires'], ['blanche', 'Blanches'], ['soupir', 'Silences'], ['croches', 'Croches'], ['doubles', 'Doubles croches'], ['triolet', 'Triolets'], ['syncope', 'Syncopes']]} value={ryFig} onChange={setRyFig} color={rc} />
          <Button color={rc} label="Lancer" onPress={() => {
            const figures = ryFig.includes('noire') ? ryFig : ['noire', ...ryFig];
            if (ryMode[0] === 'ecrire') ear('RY-2-07', { mesures: 2, tempo: ryTempo[0], figures });
            else ear(ryMode[0] === 'lire' ? 'RY-1-03' : 'RY-1-04', { tempo: ryTempo[0], mesure: ryMeter[0], mesures: 2, figures, metronome: true });
          }} />
        </Card>

        <Text style={[styles.sub, { color: tc }]}>{'Sur l\'instrument'}</Text>
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
        <Card title="Fonctions" line="Une fondamentale est marquée : trouve son 3, son 5…" color={tc} open={open === 'func'} onToggle={() => toggle('func')}>
          <Chips options={[2, 3, 4, 5, 6, 7, 8].map((x) => [x, x === 8 ? '8 (octave)' : String(x)] as [number, string])} value={funcSet} onChange={setFuncSet} color={tc} />
          <Chips options={[['dessous', 'Aussi en dessous']]} value={funcBelow} onChange={(v) => setFuncBelow(v.length && funcBelow.length ? [] : v)} color={tc} />
          <Button color={tc} label="Lancer" onPress={() => ear('TE-2-08', { fonctions: funcSet, nb_cibles: Math.min(3, funcSet.length), dessous: funcBelow.length > 0 })} />
        </Card>

        <Text style={[styles.sub, { color: tc }]}>Technique</Text>
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

        <Text style={[styles.sub, { color: domainColor.theorie }]}>Lecture</Text>
        <Card title="Lire les notes" line="Une note sur la portée : nomme-la" color={domainColor.theorie} open={open === 'read'} onToggle={() => toggle('read')}>
          <Chips options={[['sol', 'Clé de sol'], ['fa', 'Clé de fa']]} value={readClef} onChange={setReadClef} multi={false} color={domainColor.theorie} />
          <Chips options={[['portee', 'Dans la portée'], ['etendue', 'Avec les lignes en plus']]} value={readRange} onChange={setReadRange} multi={false} color={domainColor.theorie} />
          <Button color={domainColor.theorie} label="Lancer" onPress={() => {
            const wide = readRange[0] === 'etendue';
            if (readClef[0] === 'fa') ear('TH-4-04', { questions: 8, clef: 'fa', de: wide ? 36 : 43, a: wide ? 62 : 57 });
            else ear('TH-1-03', { questions: 8, de: wide ? 57 : 64, a: wide ? 79 : 77 });
          }} />
        </Card>
        <Card title="Lecture à vue en rythme" line="Notes et rythme, au métronome, sans t'arrêter" color={domainColor.theorie} open={open === 'sight'} onToggle={() => toggle('sight')}>
          <Chips options={[['1', 'Noires'], ['2', '+ blanches et croches'], ['3', '+ silences et syncopes']]} value={sightLevel} onChange={setSightLevel} multi={false} color={domainColor.theorie} />
          <Button color={domainColor.theorie} label="Lancer" onPress={() => ear('TE-2-16', sightLevel[0] === '1'
            ? { mesures: 1, figures: ['noire'], tempo: 60, de: 60, a: 67 }
            : sightLevel[0] === '2' ? { mesures: 2, figures: ['noire', 'blanche', 'croches'], tempo: 70, de: 57, a: 76 }
            : { mesures: 2, figures: ['noire', 'croches', 'soupir', 'syncope'], tempo: 80, de: 55, a: 79 })} />
        </Card>

        <Text style={[styles.sub, { color: domainColor.theorie }]}>Théorie</Text>
        <Card title="Construire" line="Intervalles, accords, accords de 7e, accords enrichis" color={domainColor.theorie} open={open === 'build'} onToggle={() => toggle('build')}>
          <Chips options={[['intervalles', 'Intervalles'], ['triades', 'Triades'], ['septiemes', 'Accords de 7e'], ['enrichis', '9, sus, 13']]} value={buildKind} onChange={setBuildKind} multi={false} color={domainColor.theorie} />
          <Button color={domainColor.theorie} label="Lancer" onPress={() => {
            const k = buildKind[0];
            if (k === 'intervalles') ear('TH-3-05', { questions: 8, niveau_q: 2 });
            else if (k === 'triades') ear('TH-3-02', { qualites: ['majeur', 'mineur', 'dim', 'aug'] });
            else if (k === 'septiemes') ear('TH-4-01', { qualites: ['maj7', 'dom7', 'm7', 'm7b5'] });
            else ear('TH-6-02', { qualites: ['maj9', 'dom9', 'm9', 'sus4', 'sus2', 'add9'] });
          }} />
        </Card>
        <Card title="Armures" line="Quelle tonalité pour cette armure, et inversement" color={domainColor.theorie} open={open === 'keys'} onToggle={() => toggle('keys')}>
          <Chips options={[[1, 'Jusqu\'à 1 ♯/♭'], [2, '2'], [3, '3'], [5, '5'], [7, 'Toutes']]} value={keyMax} onChange={setKeyMax} multi={false} color={domainColor.theorie} />
          <Button color={domainColor.theorie} label="Lancer" onPress={() => ear('TH-2-09', { questions: 8, max: keyMax[0], sens: 'mixte' })} />
        </Card>

        <Text style={[styles.sub, { color: ic }]}>Improvisation</Text>
        <Card title="Perroquet" line="L'appli joue une mélodie, tu la reproduis" color={ic} open={open === 'par'} onToggle={() => toggle('par')}>
          <Chips options={[[3, '3 notes'], [4, '4 notes'], [6, '6 notes'], [8, '8 notes']]} value={parrotNotes} onChange={setParrotNotes} multi={false} color={ic} />
          <Chips options={Object.entries(SCALES).map(([k, v]) => [k, v.label] as [string, string])} value={parrotScale} onChange={setParrotScale} multi={false} color={ic} />
          <Button color={ic} label="Lancer" onPress={() => ear('IM-3-01', { nb_notes: parrotNotes[0], degres: SCALES[parrotScale[0]].tokens })} />
        </Card>
        <Pressable onPress={() => nav.navigate('Jam')} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.cardHead, { borderLeftColor: ic }, pressed && { opacity: 0.85 }]}>
          <View style={{ flex: 1 }}>
            <Text style={type.title}>Jam</Text>
            <Text style={type.small}>Un accompagnement en boucle pour improviser librement</Text>
          </View>
          <Text style={[styles.chev, { color: ic }]}>›</Text>
        </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tools: { flexDirection: 'row', gap: 10 },
  tool: { flex: 1, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 18, alignItems: 'center', gap: 4 },
  toolGlyph: { fontSize: 30, color: colors.ink },
  toolTitle: { fontWeight: '900', color: colors.ink },
  focus: { backgroundColor: colors.card, borderRadius: 16, padding: 12, borderLeftWidth: 5, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, flexBasis: '47%', flexGrow: 1 },
  guided: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sub: { fontSize: 17, fontWeight: '900', marginTop: 10 },
  play: { fontSize: 24, fontWeight: '900' },
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
