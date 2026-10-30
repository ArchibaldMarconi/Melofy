// Leçons approfondies : 17 emprunts et modulations, R3 mesures impaires — intercalées entre les modes depuis 0.24.0 (les modes sont dans modes.ts).
import type { NoteEvent } from '../types';
import type { DeepLesson } from './types';

const seq = (midis: number[], dur = 1, gap = 0, at = 0): NoteEvent[] => midis.map((m, i) => ({ midi: m, start: at + i * (dur + gap), dur: dur * 0.95 }));
const together = (midis: number[], start: number, dur: number): NoteEvent[] => midis.map((m) => ({ midi: m, start, dur }));
const chords = (list: number[][], beats = 1.9, at = 0): NoteEvent[] => list.flatMap((c, i) => together(c, at + i * beats, beats * 0.92));
const clicks = (n: number, strong: (k: number) => boolean, at = 0): NoteEvent[] => Array.from({ length: n }, (_, k) => ({ midi: strong(k) ? 84 : 77, start: at + k, dur: 0.2 }));

const VIOLET = '#8A80B0';
const GOLD = '#D9A21B';

// accords avec leur basse (fondamentale au grave)
const C = [48, 60, 64, 67], F = [41, 60, 65, 69], Fm = [41, 60, 65, 68], G = [43, 59, 62, 67];
const Am = [45, 60, 64, 69], D7 = [50, 60, 66, 69], Bb = [46, 58, 62, 65], Ab = [44, 60, 63, 68];

export const PALIER5: DeepLesson[] = [
  // ------------------------------------------------------------------ 15
  {
    id: 'emprunts', number: 17, palier: 5, conceptId: 'emprunts',
    title: "Emprunts et modulations",
    why: "Les accords « inattendus » et les changements de tonalité donnent leur relief aux morceaux. Les reconnaître, c'est savoir si la maison a changé ou si on lui a juste prêté une couleur.",
    discover: {
      question: "Dans laquelle de ces deux suites une ombre passe-t-elle au milieu ?",
      a: { notes: chords([C, F, C]), tempo: 76 }, b: { notes: chords([C, Fm, C]), tempo: 76 }, answer: 'B',
      reveal: "Dans B, l'accord du milieu est fa mineur au lieu de fa majeur : le la est devenu la♭. Cet accord n'appartient pas à do majeur, il est emprunté à do mineur. Pourtant on reste chez do : la maison est la même, on lui a prêté une couleur.",
    },
    screens: [
      {
        title: "La maison reste, la couleur change",
        paragraphs: [
          "Un emprunt prend un accord au mode parallèle, le plus souvent au mineur de même tonique, sans changer de tonique. En do majeur, fa mineur (iv) au lieu de fa majeur (IV) : une seule note change, la devient la♭, et une ombre passe.",
          "La tonique reste do : après l'emprunt, on revient à la maison, et elle sonne toujours comme la maison.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 65, label: 'fa' }, { midi: 68, label: 'la♭', color: VIOLET }, { midi: 69, label: 'la' }, { midi: 72, label: 'do' }] },
        guitarIllustration: { kind: 'fretboard', frets: 4, marks: [{ string: 2, fret: 3, label: 'fa' }, { string: 3, fret: 2, label: 'la' }, { string: 3, fret: 1, label: 'la♭', color: VIOLET }, { string: 4, fret: 1, label: 'do' }, { string: 5, fret: 1, label: 'fa' }] },
        guitarParagraphs: [
          "Un emprunt prend un accord au mode parallèle, le plus souvent au mineur de même tonique, sans changer de tonique. En do majeur, fa mineur (iv) au lieu de fa majeur (IV) : une seule note change, la devient la♭, et une ombre passe.",
          "Sur le petit accord de fa (cordes aiguës), il suffit de reculer d'une case le doigt de la corde de sol. La tonique reste do : après l'emprunt, on revient à la maison.",
        ],
        audio: { label: "I – IV – I, puis I – iv – I", notes: [...chords([C, F, C]), ...chords([C, Fm, C], 1.9, 6.2)], tempo: 80 },
        keep: "Emprunt : un accord du mineur de même tonique, la maison ne change pas.",
      },
      {
        title: "Où l'on emprunte : do mineur",
        paragraphs: [
          "Do majeur et do mineur ont la même tonique mais pas les mêmes notes : do mineur a mi♭, la♭ et si♭. Ses accords offrent donc des couleurs que do majeur n'a pas : iv (fa m), ♭VI (la♭), ♭VII (si♭), ♭III (mi♭).",
          "Écoute la gamme de do majeur, puis celle de do mineur : ce sont ces trois notes baissées qui colorent les accords empruntés.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'iv', sub: 'fa m · nostalgique' }, { title: '♭VII', sub: 'si♭ · rock', color: VIOLET }, { title: '♭VI', sub: 'la♭ · dramatique', color: GOLD }, { title: '♭III', sub: 'mi♭ · ample' }] },
        audio: { label: "Gamme de do majeur, puis de do mineur", notes: [...seq([60, 62, 64, 65, 67, 69, 71, 72], 0.45), ...seq([60, 62, 63, 65, 67, 68, 70, 72], 0.45, 0, 4.2)], tempo: 100 },
        keep: "Les emprunts viennent des notes ♭3, ♭6, ♭7 du mineur.",
      },
      {
        title: "♭VII, le son du rock",
        paragraphs: [
          "En do majeur, si♭ majeur (♭VII) remplace volontiers sol (V). Il n'a pas de sensible : au lieu de tirer vers do, il y revient en glissant, avec une énergie franche et détendue.",
          "On l'entend dans d'innombrables morceaux rock et pop : I – ♭VII – IV – I. C'est le cousin du mixolydien, majeur avec un ♭7.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'V → I', sub: 'sol → do · tension, résolution', color: GOLD }, { title: '♭VII → I', sub: 'si♭ → do · franc, détendu', color: VIOLET }] },
        audio: { label: "I – ♭VII – IV – I", notes: chords([C, Bb, F, C]), tempo: 80 },
        keep: "♭VII → I : une arrivée sans sensible, le son du rock.",
      },
      {
        title: "♭VI et iv : le drame et la nostalgie",
        paragraphs: [
          "La♭ majeur (♭VI) ouvre un grand espace sombre : enchaîné avec ♭VII puis I (la♭, si♭, do), il donne une fin triomphante, très utilisée dans les musiques de film et de jeu vidéo.",
          "Fa mineur (iv) juste avant do donne au contraire une fin douce et nostalgique : le la♭ descend d'un demi-ton sur sol, la quinte de do.",
        ],
        illustration: { kind: 'cards', items: [{ title: '♭VI – ♭VII – I', sub: 'la♭, si♭, do · triomphe', color: GOLD }, { title: 'iv – I', sub: 'fa m, do · nostalgie', color: VIOLET }] },
        audio: { label: "I – ♭VI – ♭VII – I, puis IV – iv – I", notes: [...chords([C, Ab, Bb, C]), ...chords([F, Fm, C], 1.9, 8.2)], tempo: 80 },
        keep: "♭VI – ♭VII – I triomphe ; iv – I s'attendrit.",
      },
      {
        title: "La modulation : une nouvelle maison",
        paragraphs: [
          "Une modulation, elle, installe une nouvelle tonique. Souvent, elle passe par un accord commun aux deux tonalités, le pivot, puis par une cadence V7 → I dans la nouvelle.",
          "Écoute : on part de do, la m sert de pivot, ré 7 mène à sol… et la musique reste en sol. À la fin, chante le do du début : il ne sonne plus comme la maison.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Pivot', sub: 'la m : vi en do, ii en sol' }, { title: 'Cadence', sub: 'ré 7 → sol', color: VIOLET }, { title: 'Nouvelle maison', sub: 'sol est la tonique', color: GOLD }] },
        audio: { label: "Do, fa, la m (pivot), ré 7, sol, do, ré 7, sol", notes: chords([C, F, Am, D7, G, C, D7, G], 1.7), tempo: 84 },
        keep: "Modulation : pivot, cadence, nouvelle tonique.",
      },
      {
        title: "Où va la musique ?",
        paragraphs: [
          "Les modulations les plus courantes vont vers les voisins du cycle des quintes, parce qu'ils partagent presque toutes leurs notes : une quinte au-dessus, vers la dominante (do → sol) ; une quarte au-dessus, vers la sous-dominante (do → fa).",
          "L'autre voisin très proche est le relatif mineur : de do majeur à la mineur, mêmes notes, nouvelle tonique, souvent annoncée par mi 7 et son sol♯.",
        ],
        illustration: { kind: 'circle', highlight: ['fa', 'do', 'sol'], arrows: [['do', 'sol'], ['do', 'fa']], center: 'relatif : la m' },
        keep: "On module surtout vers la dominante, la sous-dominante ou le relatif.",
      },
      {
        title: "Le test : la tonique a-t-elle changé ?",
        paragraphs: [
          "Une seule question départage les deux. Chante la tonique du début pendant toute l'écoute. Si elle sonne encore comme la maison à la fin, c'est un emprunt. Si elle ne colle plus et que la musique s'installe ailleurs, c'est une modulation.",
          "Un emprunt dure un accord ou deux ; une modulation dure, et confirme sa nouvelle tonique par une cadence.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Même tonique', sub: 'emprunt · un accord ou deux' }, { title: 'Nouvelle tonique', sub: 'modulation · confirmée par une cadence', color: VIOLET }] },
        keep: "Même maison = emprunt ; nouvelle maison = modulation.",
      },
    ],
    practice: [
      { domain: 'oreille', label: "L'accord emprunté", templateId: 'OR-5-03' },
      { domain: 'theorie', label: "Emprunt ou modulation ?", templateId: 'TH-5-02' },
      { domain: 'technique', label: "Arpège les accords empruntés", templateId: 'TE-5-05', params: { grilles: ['I-iv-I', 'I-bVII-I'], tonalites: ['C', 'G'] } },
      { domain: 'oreille', label: "L'intrus", templateId: 'OR-5-04' },
      { domain: 'oreille', label: "Où va la musique ?", templateId: 'OR-5-05', params: { questions: 4, modulations: ['reste', 'V', 'vi'] } },
    ],
    validation: { label: "Reconnaître l'accord emprunté", templateId: 'OR-5-03', params: { questions: 5, accords: ['IV', 'iv', 'bVII'] }, criterion: "4 bonnes réponses sur 5" },
  },
  // ------------------------------------------------------------------ R3 (complète)
  {
    id: 'impaires', number: 'R3', palier: 5, conceptId: 'mesures_impaires',
    title: "Les mesures impaires : 5 et 7 temps",
    why: "Des musiques des Balkans au jazz et au rock progressif, les mesures à 5 ou 7 temps donnent une démarche boiteuse et entraînante. Elles se lisent en groupes de 2 et de 3, qu'on apprend à sentir.",
    discover: {
      question: "Combien de temps compte chaque mesure de cet exemple ? Écoute A (4 temps) puis B : laquelle boite ?",
      a: { notes: clicks(8, (k) => k % 4 === 0), tempo: 120 }, b: { notes: clicks(10, (k) => k % 5 === 0), tempo: 120 }, answer: 'B',
      reveal: "B a 5 temps par mesure : le clic aigu revient tous les 5 temps, avec un temps « en trop » qui donne la démarche boiteuse. A est en 4 temps, régulier.",
    },
    screens: [
      {
        title: "Une mesure à 5 temps",
        paragraphs: [
          "Une mesure à 5 temps (5/4) compte 1 2 3 4 5, puis recommence. Le 1er temps est fort, comme toujours.",
          "Compté à la suite, c'est difficile à tenir : l'oreille aime les groupes de 2 et de 3.",
        ],
        illustration: { kind: 'pulseGrid', perBar: 5, bars: 1, subdiv: 1 },
        audio: { label: "Deux mesures à 5 temps", notes: clicks(10, (k) => k % 5 === 0), tempo: 110 },
        keep: "5/4 : cinq temps, le 1er fort.",
      },
      {
        title: "Penser en groupes : 3 + 2",
        paragraphs: [
          "On sent le 5 temps en deux groupes : 3 + 2, « 1 2 3, 1 2 ». Chaque groupe commence par un petit appui : un appui fort sur le 1, un plus léger sur le 4.",
          "Parfois c'est 2 + 3 : « 1 2, 1 2 3 ». La musique choisit ; ton oreille le repère à l'appui du milieu.",
        ],
        illustration: { kind: 'pulseGrid', perBar: 5, bars: 1, subdiv: 1, accents: [0, 3] },
        audio: { label: "5 temps en 3 + 2", notes: clicks(10, (k) => k % 5 === 0 || k % 5 === 3), tempo: 110 },
        keep: "5 = 3 + 2 (ou 2 + 3) : sens l'appui du milieu.",
      },
      {
        title: "7 temps : 4 + 3",
        paragraphs: [
          "La mesure à 7 temps se ressent souvent en 4 + 3 (« 1 2 3 4, 1 2 3 ») ou en 2 + 2 + 3.",
          "Comme pour le 5, compte à voix haute en accentuant le 1er temps de chaque groupe.",
        ],
        illustration: { kind: 'pulseGrid', perBar: 7, bars: 1, subdiv: 1, accents: [0, 4] },
        audio: { label: "7 temps en 4 + 3", notes: clicks(14, (k) => k % 7 === 0 || k % 7 === 4), tempo: 120 },
        keep: "7 = 4 + 3 ou 2 + 2 + 3.",
      },
      {
        title: "Lire une mesure impaire",
        paragraphs: [
          "Le chiffrage en tête de la portée l'annonce : 5/4 ou 7/8. Le chiffre du haut est le nombre de temps.",
          "Avant de lire, repère les groupes : souvent, la barre des croches ou la place des notes longues les montre.",
        ],
        illustration: { kind: 'rhythm', items: ['noire', 'noire', 'noire', 'blanche'], perBar: 5, counts: "1   2   3   1 – 2" },
        audio: { label: "noire, noire, noire, blanche : 3 + 2", notes: [...clicks(5, (k) => k === 0 || k === 3), { midi: 72, start: 0, dur: 0.9 }, { midi: 72, start: 1, dur: 0.9 }, { midi: 72, start: 2, dur: 0.9 }, { midi: 72, start: 3, dur: 1.8 }], tempo: 100 },
        keep: "Le chiffre du haut = le nombre de temps ; repère les groupes.",
      },
      {
        title: "Comment s'entraîner",
        paragraphs: [
          "Compte à voix haute « 1 2 3 1 2 » en tapant sur chaque « 1 ». Puis tape tous les temps en gardant les appuis. Puis lis un rythme.",
          "Écoute des morceaux célèbres en 5 temps (le jazz en a de très connus) et compte avec eux : le corps finit par trouver la démarche.",
        ],
        illustration: { kind: 'cards', items: [{ title: '1. Compter', sub: '1 2 3 1 2' }, { title: '2. Taper', sub: 'les appuis', color: VIOLET }, { title: '3. Lire', sub: 'un rythme', color: GOLD }] },
        keep: "Compter, taper les appuis, puis lire.",
      },
    ],
    practice: [
      { domain: 'rythme', label: "Combien de temps ?", templateId: 'RY-5-03' },
      { domain: 'rythme', label: "Lire en 5 et en 7", templateId: 'RY-5-01' },
      { domain: 'rythme', label: "Perroquet en 5", templateId: 'RY-5-02' },
    ],
    validation: { label: "Reconnaître le nombre de temps", templateId: 'RY-5-03', params: { questions: 6 }, criterion: "5 bonnes réponses sur 6" },
  },
];
