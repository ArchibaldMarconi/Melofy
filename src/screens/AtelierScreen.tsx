// Onglet « Jouer » : les outils (métronome, accordeur, jam), l'entraînement automatique (l'appli choisit 5 minutes sur
// un domaine), puis l'entraînement libre, ouvert sans condition sur tous les domaines (oreille, chant, rythme, lecture,
// théorie, instrument façon « Solo » de Tom Quayle, technique, improvisation) : on choisit la durée de la série et les
// éléments. Mêmes règles graphiques que la Séance : chaque famille a sa forme et une nuance de violet, une ligne descend
// de la forme vers ses entraînements, coins continus, chevrons dessinés, une animation par action.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn, useAnimatedStyle } from 'react-native-reanimated';
import type { PlayStackParamList, RootStackParamList } from './navigation';
import type { Params } from '../content/types';
import { newSeed } from '../engine/rng';
import { INTERVAL_LABEL } from '../engine/chroma';
import { lessonProgressOf, useUserStore } from '../store/useUserStore';
import { colors, curve, mixHex, radius, type } from '../theme';
import { CHORD_TYPES, DEFAULT_DRILL, SCALES, INTERVAL_SHORT, type DrillConfig, type DrillKind, type Order } from '../drills/engine';
import { DrillRunner } from '../drills/DrillRunner';
import { LessonExercises } from '../components/LessonExercises';
import { Chevron } from '../components/Chevron';
import { PlayButton } from '../components/PlayButton';
import { FAMILY, FamilyShape, type Family } from '../components/Shape';
import { StepSlider } from '../components/StepSlider';
import { AnimatedPressable, usePress } from '../components/motion';
import { AREAS, AREA_LABEL, type Area } from '../content/skills';
import { TEMPLATES } from '../content/templates';
import { focusPool } from '../engine/focus';

/** outils dans l'onglet (Métronome, Accordeur, Jam) ; séries et entraînements par-dessus les onglets */
type Nav = CompositeNavigationProp<NativeStackNavigationProp<PlayStackParamList>, NativeStackNavigationProp<RootStackParamList>>;

/** pastilles à sélection multiple ou unique */
function Chips<T extends string | number>({ options, value, onChange, multi = true }: {
  options: [T, string][]; value: T[]; onChange: (v: T[]) => void; multi?: boolean;
}) {
  return (
    <View style={styles.chips}>
      {options.map(([k, label]) => {
        const on = value.includes(k);
        return <Chip key={String(k)} label={label} on={on} multi={multi}
          onPress={() => onChange(multi ? (on ? (value.length > 1 ? value.filter((x) => x !== k) : value) : [...value, k]) : [k])} />;
      })}
    </View>
  );
}

/** une pastille : capsule, pleine en violet quand elle est choisie ; elle se resserre sous le doigt */
function Chip({ label, on, multi, onPress }: { label: string; on: boolean; multi: boolean; onPress: () => void }) {
  const { p, onPressIn, onPressOut } = usePress();
  const squeeze = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.06 * p.get() }] }));
  return (
    <AnimatedPressable accessibilityRole={multi ? 'checkbox' : 'radio'} aria-checked={on} accessibilityState={{ checked: on }}
      onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={[styles.chip, on && styles.chipOn, squeeze]}>
      <Text style={[styles.chipText, on && { color: colors.onPrimary }]}>{label}</Text>
    </AnimatedPressable>
  );
}

/** un entraînement réglable : l'en-tête déplie ses réglages (fondu) ; chevron fixe, vers le bas ou vers le haut */
function Card({ title, line, open, onToggle, children }: { title: string; line: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { p, onPressIn, onPressOut } = usePress();
  const settle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.02 * p.get() }] }));
  return (
    <View style={styles.card}>
      <AnimatedPressable onPress={onToggle} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button" accessibilityState={{ expanded: open }} style={[styles.cardHead, settle]}>
        <View style={{ flex: 1 }}>
          <Text style={type.title}>{title}</Text>
          <Text style={type.small}>{line}</Text>
        </View>
        <Chevron dir={open ? 'up' : 'down'} />
      </AnimatedPressable>
      {open ? <Animated.View entering={FadeIn.duration(220)} style={{ gap: 10 }}>{children}</Animated.View> : null}
    </View>
  );
}

/** un lien vers un autre écran : la carte se tasse et son chevron avance */
function LinkCard({ title, line, onPress }: { title: string; line: string; onPress: () => void }) {
  const { p, onPressIn, onPressOut } = usePress();
  const settle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.02 * p.get() }] }));
  const push = useAnimatedStyle(() => ({ transform: [{ translateX: 5 * p.get() }] }));
  return (
    <AnimatedPressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button" accessibilityLabel={title}
      style={[styles.card, styles.cardHead, settle]}>
      <View style={{ flex: 1 }}>
        <Text style={type.title}>{title}</Text>
        <Text style={type.small}>{line}</Text>
      </View>
      <Animated.View style={push}><Chevron dir="right" /></Animated.View>
    </AnimatedPressable>
  );
}

/** lancer une série : le bouton « lecture » de la séance, en petit */
function Launch({ onPress, label = 'Lancer', secondary }: { onPress: () => void; label?: string; secondary?: boolean }) {
  return <PlayButton size="petit" tone={secondary ? 'contour' : 'plein'} label={label} onPress={onPress} />;
}

// famille : colonne de gauche (forme et ligne), axe de la ligne, hauteur du coude (milieu de l'en-tête des cartes)
const GUTTER = 30;
const STEM_X = 10;
const BRANCH_H = 37;

/** une famille d'entraînements : sa forme, puis une ligne qui descend et se courbe vers chacun (comme le programme) */
function Group({ family, title, children }: { family: Family; title: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  // la ligne : la nuance de la famille, adoucie vers le fond de la page
  const line = mixHex(FAMILY[family].color, colors.paper, 0.45);
  return (
    <View>
      <View style={styles.groupHead}>
        <View style={styles.gutter}>
          <View style={[styles.stem, { top: '50%', backgroundColor: line }]} />
          <View style={styles.shape}><FamilyShape family={family} /></View>
        </View>
        <Text style={styles.groupTitle} accessibilityRole="header">{title}</Text>
      </View>
      {items.map((child, i) => (
        <View key={i} style={[styles.groupRow, i < items.length - 1 && { paddingBottom: 10 }]}>
          <View style={styles.gutter}>
            {i < items.length - 1 ? <View style={[styles.stem, { top: 0, backgroundColor: line }]} /> : null}
            <View style={[styles.branch, { borderColor: line }]} />
          </View>
          <View style={{ flex: 1 }}>{child}</View>
        </View>
      ))}
    </View>
  );
}

const ALL_INTERVALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
/** durées d'une série, en minutes : un cran du curseur chacune */
const MINUTES = [1, 2, 5, 10, 15, 20];
/** entraînement automatique : la famille (forme) de chaque domaine */
const AREA_FAMILY: Record<Area, Family> = { oreille: 'oreille', mains: 'instrument', lecture: 'theorie', rythme: 'rythme' };

export function AtelierScreen() {
  const nav = useNavigation<Nav>();
  const st = useUserStore();
  const [drill, setDrill] = useState<DrillConfig | null>(null);
  // pendant qu'on fait glisser la durée, la page ne défile pas
  const [sliding, setSliding] = useState(false);
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
      <View style={styles.titleBar}>
        <Text style={type.display} accessibilityRole="header">Jouer</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pad} scrollEnabled={!sliding}>
        <View style={styles.tools}>
          <Tool glyph="♩" title="Métronome" onPress={() => nav.navigate('Metronome')} />
          <Tool glyph="⋔" title="Accordeur" onPress={() => nav.navigate('Accordeur')} />
          <Tool glyph="♫" title="Jam" onPress={() => nav.navigate('Jam')} />
        </View>

        <Text style={styles.section}>Entraînement automatique</Text>
        <Text style={type.small}>{'5 minutes sur un domaine : l\'appli choisit les exercices et le niveau d\'après tes leçons.'}</Text>
        <View style={styles.guided}>
          {AREAS.map((a) => (
            <Guided key={a} area={a} open={focusPool({ area: a, templates: TEMPLATES, progress, canSing }).length > 0} onPress={() => nav.navigate('Focus', { area: a })} />
          ))}
        </View>

        <Text style={styles.section}>Entraînement libre</Text>
        <Text style={type.small}>{'Tout est ouvert, quelles que soient tes leçons : choisis la durée, un domaine, règle-le, lance. Les exercices s\'enchaînent jusqu\'à la fin de la durée choisie.'}</Text>
        <Catalogue onDrill={setDrill} onSliding={setSliding} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** un outil : la tuile se resserre sous le doigt */
function Tool({ glyph, title, onPress }: { glyph: string; title: string; onPress: () => void }) {
  const { p, onPressIn, onPressOut } = usePress();
  const squeeze = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.05 * p.get() }] }));
  return (
    <AnimatedPressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button" accessibilityLabel={title} style={[styles.tool, squeeze]}>
      <Text style={styles.toolGlyph}>{glyph}</Text>
      <Text style={styles.toolTitle}>{title}</Text>
    </AnimatedPressable>
  );
}

/** entraînement automatique d'un domaine : sa forme, son nom, et un ▶ qui avance sous le doigt ; grisé tant qu'aucune leçon ne l'ouvre */
function Guided({ area, open, onPress }: { area: Area; open: boolean; onPress: () => void }) {
  const { p, onPressIn, onPressOut } = usePress();
  const settle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.04 * p.get() }] }));
  const push = useAnimatedStyle(() => ({ transform: [{ translateX: 5 * p.get() }] }));
  return (
    <AnimatedPressable disabled={!open} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button"
      accessibilityLabel={`Entraînement automatique : ${AREA_LABEL[area]}`} accessibilityState={{ disabled: !open }}
      style={[styles.focus, !open && { opacity: 0.45 }, settle]}>
      <FamilyShape family={AREA_FAMILY[area]} />
      <Text style={[type.body, { fontWeight: '900', flex: 1 }]}>{AREA_LABEL[area]}</Text>
      {open ? <Animated.Text style={[styles.play, push]}>▶</Animated.Text> : null}
    </AnimatedPressable>
  );
}

/** le catalogue réglable : tout choisir soi-même (élément, durée, tempo…) */
function Catalogue({ onDrill, onSliding }: { onDrill: (c: DrillConfig) => void; onSliding: (active: boolean) => void }) {
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
  const [minutes, setMinutes] = useState(2);
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
  const ear = (templateId: string, params: Params) => nav.navigate('Practice', { templateId, params, seed: newSeed(), minutes: minutes });
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  const common = (
    <>
      <Text style={type.small}>Après avoir trouvé</Text>
      <Chips options={[['trouve', 'Suivant tout de suite'], ['2s', 'Pause 2 s'], ['5s', 'Pause 5 s']]} value={[d.advance]} onChange={([a]) => set({ advance: a as DrillConfig['advance'] })} multi={false} />
      <Text style={type.small}>Je joue</Text>
      <Chips options={[['ecran', instrument === 'guitare' ? 'Sur le manche à l\'écran' : 'Sur le clavier à l\'écran'], ['micro', 'Sur mon instrument (micro)']]} value={[d.input]} onChange={([i]) => set({ input: i as DrillConfig['input'] })} multi={false} />
      <Chips options={[['oui', 'Afficher les doigtés']]} value={d.showFingerings ? ['oui'] : []} onChange={() => set({ showFingerings: !d.showFingerings })} />
    </>
  );
  const go = (kind: DrillKind) => onDrill({ kind, ...d, minutes: minutes });

  return (
    <View style={{ gap: 12 }}>
        {st.settings.catalogueTest ? <LessonExercises /> : null}

        {/* la durée d'une série : le même curseur que la séance, sur ses propres crans */}
        <View style={styles.duration}>
          <StepSlider label="Durée d'une série" value={minutes} values={MINUTES} format={(m) => `${m} min`} onChange={setMinutes} onSliding={onSliding}
            ink={colors.onPrimary} soft={colors.onPrimarySoft} fill={colors.onPrimaryTint} />
        </View>

        <Group family="oreille" title={'Oreille'}>
          <Card title="Intervalles" line="Mélodiques ou harmoniques, ceux que tu choisis" open={open === 'iv'} onToggle={() => toggle('iv')}>
            <Chips options={[['montant', 'Montants'], ['descendant', 'Descendants'], ['harmonique', 'Ensemble']]} value={ivSens} onChange={setIvSens} multi={false} />
            <Chips options={ALL_INTERVALS.map((x) => [x, INTERVAL_SHORT[x]] as [number, string])} value={ivSet} onChange={setIvSet} />
            <Launch onPress={() => ear('OR-3-05', { sens: ivSens[0], intervalles: ivSet, questions: 8 })} />
          </Card>
          <Card title="Triades" line="Majeur, mineur, diminué, augmenté" open={open === 'tri'} onToggle={() => toggle('tri')}>
            <Chips options={[['majeur', 'Majeur'], ['mineur', 'Mineur'], ['dim', 'Diminué'], ['aug', 'Augmenté']]} value={triads} onChange={setTriads} />
            <Chips options={[['non', 'Position fondamentale'], ['oui', 'Renversées']]} value={inv} onChange={setInv} multi={false} />
            <Launch onPress={() => ear('OR-3-09', { qualites: triads, renverse: inv[0] === 'oui', questions: 8 })} />
          </Card>
          <Card title="Tétrades" line="Accords de 7e" open={open === 'tet'} onToggle={() => toggle('tet')}>
            <Chips options={(['maj7', 'dom7', 'm7', 'm7b5'] as const).map((k) => [k, CHORD_TYPES[k].label] as [string, string])} value={tetrads} onChange={setTetrads} />
            <Launch onPress={() => ear('OR-4-01', { qualites: tetrads, questions: 8 })} />
          </Card>
          <Card title="Gammes et modes" line="Reconnaître la gamme jouée" open={open === 'sc'} onToggle={() => toggle('sc')}>
            <Chips options={Object.entries(SCALES).map(([k, v]) => [k, v.label] as [string, string])} value={scales} onChange={setScales} />
            <Launch onPress={() => ear('OR-3-12', { gammes: scales, questions: 8 })} />
          </Card>
          <Card title="Degrés" line="Reconnaître un degré après la cadence (♭3, ♯4… compris)" open={open === 'deg'} onToggle={() => toggle('deg')}>
            <Chips options={['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'].map((x) => [x, x.replace('b', '♭').replace('#', '♯')] as [string, string])} value={degrees} onChange={setDegrees} />
            <Launch onPress={() => ear('OR-3-04', { degres: degrees, mineur: false, questions: 8 })} />
          </Card>
          <Card title="Dictée mélodique" line="Une phrase est jouée : écris-la en degrés ou sur la portée" open={open === 'dict'} onToggle={() => toggle('dict')}>
            <Chips options={[['1-3', 'Notes 1 à 3'], ['1-5', 'Notes 1 à 5'], ['gamme', 'Toute la gamme']]} value={dictDeg} onChange={setDictDeg} multi={false} />
            <Chips options={[[3, '3 notes'], [4, '4 notes'], [5, '5 notes'], [6, '6 notes']]} value={dictN} onChange={setDictN} multi={false} />
            <Chips options={[['degres', 'En degrés (1, 2, 3…)'], ['portee', 'Sur la portée']]} value={dictMode} onChange={setDictMode} multi={false} />
            <Launch onPress={() => {
              const degres = dictDeg[0] === '1-3' ? [1, 2, 3] : dictDeg[0] === '1-5' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7];
              ear(dictMode[0] === 'portee' ? 'OR-2-12' : 'OR-2-04', dictMode[0] === 'portee' ? { degres, nb_notes: dictN[0] } : { degres, nb_notes: dictN[0], bourdon: true });
            }} />
          </Card>
          <Card title="Accords et grilles" line="Fonctions, dictée de grille, cadences" open={open === 'harm'} onToggle={() => toggle('harm')}>
            <Chips options={[['fonctions', 'I, IV ou V ?'], ['grille', 'Dictée de grille'], ['grille7', 'Grilles en 7e'], ['cadences', 'Cadences']]} value={harmony} onChange={setHarmony} multi={false} />
            <Launch onPress={() => {
              const h = harmony[0];
              if (h === 'fonctions') ear('OR-2-08', { questions: 8 });
              else if (h === 'grille') ear('OR-3-11', { nb_accords: 4, degres: [1, 2, 4, 5, 6] });
              else if (h === 'grille7') ear('OR-4-03', { nb_accords: 4, degres: [1, 2, 5, 6], septiemes: true });
              else ear('OR-4-02', { questions: 8, cadences: ['parfaite', 'plagale', 'demi', 'rompue'] });
            }} />
          </Card>

        </Group>
        <Group family="oreille" title={'Chant'}>
          <Card title="Chanter les intervalles" line="Une note est jouée : chante l'intervalle demandé au-dessus" open={open === 'sing'} onToggle={() => toggle('sing')}>
            <Chips options={[1, 2, 3, 4, 5, 7, 9, 12].map((x) => [x, INTERVAL_SHORT[x]] as [number, string])} value={singIv} onChange={setSingIv} />
            <Launch onPress={() => ear('OR-3-08', { intervalles: singIv })} />
          </Card>

        </Group>
        <Group family="rythme" title={'Rythme'}>
          <Card title="Rythme" line="Lire ou reproduire un rythme, avec le métronome" open={open === 'ry'} onToggle={() => toggle('ry')}>
            <Chips options={[['lire', 'Lire et taper'], ['perroquet', 'Reproduire à l\'oreille'], ['ecrire', 'Écrire ce que j\'entends']]} value={ryMode} onChange={setRyMode} multi={false} />
            <Text style={type.small}>Temps par mesure</Text>
            <Chips options={[[2, '2'], [3, '3'], [4, '4'], [5, '5'], [7, '7']]} value={ryMeter} onChange={setRyMeter} multi={false} />
            <Text style={type.small}>Tempo</Text>
            <Chips options={[[60, '60'], [70, '70'], [80, '80'], [90, '90'], [100, '100'], [120, '120']]} value={ryTempo} onChange={setRyTempo} multi={false} />
            <Text style={type.small}>Figures</Text>
            <Chips options={[['noire', 'Noires'], ['blanche', 'Blanches'], ['soupir', 'Silences'], ['croches', 'Croches'], ['doubles', 'Doubles croches'], ['triolet', 'Triolets'], ['syncope', 'Syncopes']]} value={ryFig} onChange={setRyFig} />
            <Launch onPress={() => {
              const figures = ryFig.includes('noire') ? ryFig : ['noire', ...ryFig];
              if (ryMode[0] === 'ecrire') ear('RY-2-07', { mesures: 2, tempo: ryTempo[0], figures });
              else ear(ryMode[0] === 'lire' ? 'RY-1-03' : 'RY-1-04', { tempo: ryTempo[0], mesure: ryMeter[0], mesures: 2, figures, metronome: true });
            }} />
          </Card>

        </Group>
        <Group family="instrument" title={'Sur l\'instrument'}>
          <Card title="Notes" line="Une note s'affiche : trouve-la" open={open === 'notes'} onToggle={() => toggle('notes')}>
            <Chips options={instrument === 'guitare'
              ? [[1, 'Niveau 1 · une fois'], [2, 'Niveau 2 · partout'], [3, 'Niveau 3 · dans une zone']]
              : [[1, 'Niveau 1 · une fois'], [2, 'Niveau 2 · toutes les octaves'], [3, 'Niveau 3 · une octave précise']]}
              value={[d.noteLevel]} onChange={([l]) => set({ noteLevel: l as 1 | 2 | 3 })} multi={false} />
            <Chips options={[['non', 'Notes naturelles'], ['oui', 'Avec ♯ et ♭']]} value={[d.accidentals ? 'oui' : 'non']} onChange={([a]) => set({ accidentals: a === 'oui' })} multi={false} />
            {common}
            <Launch onPress={() => go('notes')} />
          </Card>
          <Card title="Intervalles" line="Une note et un intervalle : joue-le" open={open === 'tiv'} onToggle={() => toggle('tiv')}>
            <Chips options={ALL_INTERVALS.map((x) => [x, INTERVAL_SHORT[x]] as [number, string])} value={d.intervals} onChange={(v) => set({ intervals: v })} />
            <Chips options={[['oui', 'Jouer la tonique d\'abord'], ['alea', 'Tonique aléatoire']]} value={[...(d.playRootFirst ? ['oui'] : []), ...(d.randomRoot ? ['alea'] : [])]}
              onChange={(v) => set({ playRootFirst: v.includes('oui'), randomRoot: v.includes('alea') })} />
            {common}
            <Launch onPress={() => go('intervalles')} />
          </Card>
          <Card title="Accords" line="Un accord s'affiche : joue ses notes" open={open === 'ch'} onToggle={() => toggle('ch')}>
            <Chips options={Object.entries(CHORD_TYPES).map(([k, v]) => [k, v.label] as [string, string])} value={d.chordTypes} onChange={(v) => set({ chordTypes: v })} />
            <Chips options={([['montant', 'Montant'], ['descendant', 'Descendant'], ['aller_retour', 'Aller-retour'], ['aleatoire', 'Aléatoire']] as [Order, string][])} value={[d.order]} onChange={([o]) => set({ order: o })} multi={false} />
            <Chips options={[['maj7', 'Notation maj7, m7'], ['delta', 'Notation Δ7, –7']]} value={[d.notation]} onChange={([n]) => { set({ notation: n as 'maj7' | 'delta' }); st.setSettings({ chordNotation: n as 'maj7' | 'delta' }); }} multi={false} />
            {common}
            <Launch onPress={() => go('accords')} />
          </Card>
          <Card title="Gammes" line="Une gamme s'affiche : joue-la" open={open === 'tsc'} onToggle={() => toggle('tsc')}>
            <Chips options={Object.entries(SCALES).map(([k, v]) => [k, v.label] as [string, string])} value={d.scales} onChange={(v) => set({ scales: v })} />
            <Chips options={([['montant', 'Montant'], ['descendant', 'Descendant'], ['aller_retour', 'Aller-retour'], ['aleatoire', 'Aléatoire']] as [Order, string][])} value={[d.order]} onChange={([o]) => set({ order: o })} multi={false} />
            {common}
            <Launch onPress={() => go('gammes')} />
          </Card>
          <Card title="Fonctions" line="Une fondamentale est marquée : trouve son 3, son 5…" open={open === 'func'} onToggle={() => toggle('func')}>
            <Chips options={[2, 3, 4, 5, 6, 7, 8].map((x) => [x, x === 8 ? '8 (octave)' : String(x)] as [number, string])} value={funcSet} onChange={setFuncSet} />
            <Chips options={[['dessous', 'Aussi en dessous']]} value={funcBelow} onChange={(v) => setFuncBelow(v.length && funcBelow.length ? [] : v)} />
            <Launch onPress={() => ear('TE-2-08', { fonctions: funcSet, nb_cibles: Math.min(3, funcSet.length), dessous: funcBelow.length > 0 })} />
          </Card>

        </Group>
        <Group family="technique" title={'Technique'}>
          <Card title="Gammes au métronome" line="Une gamme, position par position, de plus en plus vite" open={open === 'pos'} onToggle={() => toggle('pos')}>
            <Chips options={[['majeure', 'Majeure'], ['mineure', 'Mineure'], ['penta_majeure', 'Penta majeure'], ['penta_mineure', 'Penta mineure'], ['blues', 'Blues'], ['dorien', 'Dorien'], ['mixolydien', 'Mixolydien']]} value={posScale} onChange={setPosScale} multi={false} />
            {instrument === 'guitare' ? <Chips options={[['corde', 'Une seule corde'], ...[1, 2, 3, 4, 5].map((x) => [String(x), `Position ${x}`] as [string, string]), ['alea', 'Au hasard']]} value={posBox} onChange={setPosBox} multi={false} /> : null}
            <Chips options={[['monter', 'Monter'], ['descendre', 'Descendre'], ['aller_retour', 'Monter puis descendre']]} value={posSens} onChange={setPosSens} multi={false} />
            <Chips options={[['complet', 'Tout affiché'], ['fondamentale', 'Fondamentales seules'], ['aucun', 'De mémoire']]} value={posGuide} onChange={setPosGuide} multi={false} />
            <Text style={type.small}>Tempo de départ</Text>
            <Chips options={[[0, 'Sans clic'], [60, '60'], [80, '80'], [100, '100'], [120, '120']]} value={posTempo} onChange={setPosTempo} multi={false} />
            {posTempo[0] ? <>
              <Text style={type.small}>Après chaque réussite</Text>
              <Chips options={[[0, 'Même tempo'], [5, '+5 BPM'], [10, '+10 BPM']]} value={posStep} onChange={setPosStep} multi={false} />
            </> : null}
            <Launch onPress={() => {
              const oneString = instrument === 'guitare' && posBox[0] === 'corde';
              const gamme = oneString && posScale[0] === 'blues' ? 'penta_mineure' : posScale[0];
              nav.navigate('Practice', {
                templateId: oneString ? 'TQ-1-01' : 'TE-3-04', seed: newSeed(), minutes: minutes, tempoStep: posTempo[0] ? posStep[0] : 0,
                params: oneString ? { gamme, sens: posSens[0] } : { gamme, position: posBox[0] === 'alea' ? 'alea' : Number(posBox[0]), guide: posGuide[0], sens: posSens[0], ...(posTempo[0] ? { tempo_cle: posTempo[0], etiquettes: 'doigts' } : {}) },
              });
            }} />
            {instrument === 'guitare' ? <Launch secondary label="Formes d'accords" onPress={() => ear('TE-3-06', { accords: ['majeur', 'mineur', 'dom7', 'maj7', 'm7'], guide: posGuide[0] })} /> : null}
          </Card>

        </Group>
        <Group family="theorie" title={'Lecture'}>
          <Card title="Lire les notes" line="Une note sur la portée : nomme-la" open={open === 'read'} onToggle={() => toggle('read')}>
            <Chips options={[['sol', 'Clé de sol'], ['fa', 'Clé de fa']]} value={readClef} onChange={setReadClef} multi={false} />
            <Chips options={[['portee', 'Dans la portée'], ['etendue', 'Avec les lignes en plus']]} value={readRange} onChange={setReadRange} multi={false} />
            <Launch onPress={() => {
              const wide = readRange[0] === 'etendue';
              if (readClef[0] === 'fa') ear('TH-4-04', { questions: 8, clef: 'fa', de: wide ? 36 : 43, a: wide ? 62 : 57 });
              else ear('TH-1-03', { questions: 8, de: wide ? 57 : 64, a: wide ? 79 : 77 });
            }} />
          </Card>
          <Card title="Lecture à vue en rythme" line="Notes et rythme, au métronome, sans t'arrêter" open={open === 'sight'} onToggle={() => toggle('sight')}>
            <Chips options={[['1', 'Noires'], ['2', '+ blanches et croches'], ['3', '+ silences et syncopes']]} value={sightLevel} onChange={setSightLevel} multi={false} />
            <Launch onPress={() => ear('TE-2-16', sightLevel[0] === '1'
              ? { mesures: 1, figures: ['noire'], tempo: 60, de: 60, a: 67 }
              : sightLevel[0] === '2' ? { mesures: 2, figures: ['noire', 'blanche', 'croches'], tempo: 70, de: 57, a: 76 }
              : { mesures: 2, figures: ['noire', 'croches', 'soupir', 'syncope'], tempo: 80, de: 55, a: 79 })} />
          </Card>

        </Group>
        <Group family="theorie" title={'Théorie'}>
          <Card title="Construire" line="Intervalles, accords, accords de 7e, accords enrichis" open={open === 'build'} onToggle={() => toggle('build')}>
            <Chips options={[['intervalles', 'Intervalles'], ['triades', 'Triades'], ['septiemes', 'Accords de 7e'], ['enrichis', '9, sus, 13']]} value={buildKind} onChange={setBuildKind} multi={false} />
            <Launch onPress={() => {
              const k = buildKind[0];
              if (k === 'intervalles') ear('TH-3-05', { questions: 8, niveau_q: 2 });
              else if (k === 'triades') ear('TH-3-02', { qualites: ['majeur', 'mineur', 'dim', 'aug'] });
              else if (k === 'septiemes') ear('TH-4-01', { qualites: ['maj7', 'dom7', 'm7', 'm7b5'] });
              else ear('TH-6-02', { qualites: ['maj9', 'dom9', 'm9', 'sus4', 'sus2', 'add9'] });
            }} />
          </Card>
          <Card title="Armures" line="Quelle tonalité pour cette armure, et inversement" open={open === 'keys'} onToggle={() => toggle('keys')}>
            <Chips options={[[1, 'Jusqu\'à 1 ♯/♭'], [2, '2'], [3, '3'], [5, '5'], [7, 'Toutes']]} value={keyMax} onChange={setKeyMax} multi={false} />
            <Launch onPress={() => ear('TH-2-09', { questions: 8, max: keyMax[0], sens: 'mixte' })} />
          </Card>

        </Group>
        <Group family="impro" title={'Improvisation'}>
          <Card title="Perroquet" line="L'appli joue une mélodie, tu la reproduis" open={open === 'par'} onToggle={() => toggle('par')}>
            <Chips options={[[3, '3 notes'], [4, '4 notes'], [6, '6 notes'], [8, '8 notes']]} value={parrotNotes} onChange={setParrotNotes} multi={false} />
            <Chips options={Object.entries(SCALES).map(([k, v]) => [k, v.label] as [string, string])} value={parrotScale} onChange={setParrotScale} multi={false} />
            <Launch onPress={() => ear('IM-3-01', { nb_notes: parrotNotes[0], degres: SCALES[parrotScale[0]].tokens })} />
          </Card>
          <LinkCard title="Jam" line="Un accompagnement en boucle pour improviser librement" onPress={() => nav.navigate('Jam')} />
        </Group>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  titleBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  pad: { padding: 20, paddingTop: 8, gap: 12, paddingBottom: 40 },
  section: { fontSize: 22, fontWeight: '900', marginTop: 10, color: colors.ink },
  tools: { flexDirection: 'row', gap: 10 },
  tool: { flex: 1, backgroundColor: colors.card, borderRadius: radius.tile, ...curve, paddingVertical: 18, alignItems: 'center', gap: 4 },
  toolGlyph: { fontSize: 30, color: colors.ink },
  toolTitle: { fontWeight: '900', color: colors.ink },
  guided: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  focus: { backgroundColor: colors.card, borderRadius: radius.row, ...curve, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, flexBasis: '47%', flexGrow: 1 },
  play: { fontSize: 18, fontWeight: '900', color: colors.accent },
  // carte de la durée : le curseur (capsule de rayon `control`) y est concentrique
  duration: { backgroundColor: colors.primary, borderRadius: radius.control + 20, ...curve, padding: 20 },
  groupHead: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 10 },
  groupTitle: { fontSize: 17, fontWeight: '900', color: colors.ink },
  groupRow: { flexDirection: 'row' },
  gutter: { width: GUTTER, alignSelf: 'stretch', justifyContent: 'center' },
  shape: { marginLeft: STEM_X - 9 },
  stem: { position: 'absolute', left: STEM_X - 1, width: 2, bottom: 0 },
  branch: { position: 'absolute', left: STEM_X - 1, top: 0, width: GUTTER - STEM_X - 4, height: BRANCH_H, borderLeftWidth: 2, borderBottomWidth: 2, borderBottomLeftRadius: 9 },
  card: { backgroundColor: colors.card, borderRadius: radius.row, ...curve, padding: 14, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.5, borderColor: colors.staff, borderRadius: radius.capsule, paddingHorizontal: 14, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '800', fontSize: 13, color: colors.ink },
});

void INTERVAL_LABEL;
