// Leçons approfondies du palier 4 (harmonie) : 12 cycle des quintes et cadences, 13 ii-V-I, R2 swing, 5b clé de fa.
import type { NoteEvent } from '../types';
import type { DeepLesson } from './types';

const seq = (midis: number[], dur = 1, gap = 0, at = 0): NoteEvent[] => midis.map((m, i) => ({ midi: m, start: at + i * (dur + gap), dur: dur * 0.95 }));
const together = (midis: number[], start: number, dur: number): NoteEvent[] => midis.map((m) => ({ midi: m, start, dur }));
const chords = (list: number[][], beats = 1.9, at = 0): NoteEvent[] => list.flatMap((c, i) => together(c, at + i * beats, beats * 0.92));
const clicks = (n: number, strong: (k: number) => boolean, at = 0): NoteEvent[] => Array.from({ length: n }, (_, k) => ({ midi: strong(k) ? 84 : 77, start: at + k, dur: 0.2 }));
const hits = (starts: number[], durs: number[], midi = 72): NoteEvent[] => starts.map((s, i) => ({ midi, start: s, dur: durs[i] * 0.9 }));

const VIOLET = '#8A80B0';
const GOLD = '#D9A21B';

// accords avec leur basse (fondamentale au grave), voix serrées autour du do central
const C = [48, 60, 64, 67], F = [41, 60, 65, 69], G = [43, 59, 62, 67], G7 = [43, 59, 62, 65];
const Am = [45, 60, 64, 69], Dm = [50, 62, 65, 69];
// le ii-V-I en 7e, voix qui glissent : do→si, fa→fa→mi, la→sol→sol
const Dm7 = [50, 60, 65, 69], G7v = [43, 59, 65, 67], Cmaj7 = [48, 59, 64, 67];

export const PALIER4: DeepLesson[] = [
  // ------------------------------------------------------------------ 12
  {
    id: 'quintes', number: 12, palier: 4, conceptId: 'cadences',
    title: "Le cycle des quintes et les cadences",
    why: "Le cycle des quintes range les douze tonalités : il dit combien d'altérations a chacune, lesquelles sont voisines, et d'où vient la force du mouvement V → I. Les cadences sont la ponctuation des phrases : point, virgule, surprise.",
    discover: {
      question: "Laquelle de ces deux phrases se conclut par un point final ?",
      a: { notes: chords([C, G]), tempo: 72 }, b: { notes: chords([G7, C]), tempo: 72 }, answer: 'B',
      reveal: "B finit sur do après sol 7 : la basse tombe d'une quinte, sol → do, et la tension se résout. A fait le chemin inverse, do → sol : la phrase reste en l'air. Cette quinte qui descend organise toute la musique tonale ; le cycle des quintes la suit d'une tonalité à l'autre.",
    },
    screens: [
      {
        title: "La quinte qui tombe",
        paragraphs: [
          "Une quinte, c'est 7 demi-tons : de sol à do en descendant, ou de do à sol en montant. Quand la basse descend d'une quinte vers la tonique, l'oreille entend une arrivée, presque une évidence.",
          "Écoute la basse seule, sol → do, puis les accords au-dessus : c'est le geste de la cadence parfaite, V → I.",
        ],
        illustration: { kind: 'keyboard', from: 43, to: 55, names: true, marks: [{ midi: 55, label: 'V', color: GOLD }, { midi: 48, label: 'I' }] },
        guitarIllustration: { kind: 'fretboard', frets: 5, marks: [{ string: 0, fret: 3, label: 'V', color: GOLD }, { string: 1, fret: 3, label: 'I' }] },
        guitarParagraphs: [
          "Une quinte, c'est 7 demi-tons. Quand la basse descend d'une quinte vers la tonique, l'oreille entend une arrivée, presque une évidence.",
          "Sur le manche, sol (grosse corde, case 3) puis do (corde de la, case 3) : même case, une corde plus aiguë. Monter d'une quarte revient à descendre d'une quinte : même note d'arrivée, une octave plus haut. C'est le geste de la cadence parfaite, V → I.",
        ],
        audio: { label: "Basse sol → do, puis sol 7 → do", notes: [...seq([55, 48], 1.2, 0.2), ...chords([G7, C], 1.9, 3)], tempo: 72 },
        guitarAudio: { label: "Basse sol → do, puis sol 7 → do", notes: [...seq([43, 48], 1.2, 0.2), ...chords([G7, C], 1.9, 3)], tempo: 72 },
        keep: "Basse qui descend d'une quinte vers 1 : une arrivée.",
      },
      {
        title: "Le cercle : un dièse de plus",
        paragraphs: [
          "Pars de do et monte de quinte en quinte : do, sol, ré, la, mi… Chaque tonalité a un dièse de plus que la précédente : sol 1, ré 2, la 3, mi 4.",
          "Rangées en rond, les douze tonalités forment le cycle des quintes : do en haut, les dièses à droite, dans le sens des aiguilles d'une montre.",
        ],
        illustration: { kind: 'circle', highlight: ['do', 'sol', 'ré', 'la'], arrows: [['do', 'sol'], ['sol', 'ré'], ['ré', 'la']] },
        audio: { label: "do, sol, ré, la : de quinte en quinte", notes: seq([48, 55, 62, 69], 0.9, 0.1), tempo: 70 },
        keep: "Une quinte plus haut = un dièse de plus.",
      },
      {
        title: "Dans l'autre sens : un bémol de plus",
        paragraphs: [
          "Descends de quinte en quinte depuis do : fa, si♭, mi♭, la♭… Chaque tonalité a un bémol de plus : fa 1, si♭ 2, mi♭ 3. Sur le cercle, les bémols sont à gauche.",
          "En bas, les deux côtés se rejoignent : fa♯ (6 dièses) et sol♭ (6 bémols) sonnent pareil. Le cercle se referme.",
        ],
        illustration: { kind: 'circle', highlight: ['do', 'fa', 'si♭', 'mi♭'], arrows: [['do', 'fa'], ['fa', 'si♭'], ['si♭', 'mi♭']] },
        audio: { label: "do, fa, si♭, mi♭ : de quinte en quinte, en descendant", notes: seq([72, 65, 58, 51], 0.9, 0.1), tempo: 70 },
        keep: "Une quinte plus bas = un bémol de plus.",
      },
      {
        title: "Retrouver l'altération qui s'ajoute",
        paragraphs: [
          "Pas besoin d'apprendre les armures par cœur. Le dièse qui s'ajoute est toujours le 7, la sensible, de la nouvelle tonalité : fa♯ en sol, do♯ en ré, sol♯ en la.",
          "Le bémol qui s'ajoute est toujours le 4 de la nouvelle tonalité : si♭ en fa, mi♭ en si♭. Dans l'armure, l'avant-dernier bémol donne d'ailleurs le nom de la tonalité.",
        ],
        illustration: { kind: 'staff', keySig: 3, sigLabels: true, sigHighlight: 2, notes: [{ midi: 68, label: '7', color: GOLD }, { midi: 69, label: '1' }] },
        audio: { label: "En la majeur : sol♯ (7) monte vers la (1)", notes: [...seq([64, 66, 68, 69], 0.6), { midi: 69, start: 2.4, dur: 1 }], tempo: 84 },
        keep: "Nouveau dièse = 7 de la tonalité. Nouveau bémol = 4.",
      },
      {
        title: "Les voisins",
        paragraphs: [
          "Deux tonalités côte à côte sur le cercle ne diffèrent que d'une note. Do et sol partagent tout sauf fa, qui devient fa♯. C'est vers ces voisines qu'on module le plus souvent : le changement se fait en douceur.",
          "Les trois accords majeurs de do sont d'ailleurs do et ses deux voisins : fa (IV) à gauche, sol (V) à droite.",
        ],
        illustration: { kind: 'circle', highlight: ['fa', 'do', 'sol'], center: 'IV · I · V' },
        audio: { label: "Gamme de do, puis gamme de sol : seul fa devient fa♯", notes: [...seq([60, 62, 64, 65, 67, 69, 71, 72], 0.45), ...seq([55, 57, 59, 60, 62, 64, 66, 67], 0.45, 0, 4.2)], tempo: 100 },
        keep: "Voisins sur le cercle = une seule note de différence.",
      },
      {
        title: "Point final et « amen »",
        paragraphs: [
          "Une cadence, c'est la fin d'une phrase musicale, comme la ponctuation d'une phrase écrite. La cadence parfaite, V → I, est le point final : la tension de V se résout sur la tonique.",
          "La cadence plagale, IV → I, finit aussi sur la tonique, mais sans la sensible : plus douce, c'est l'« amen » des fins de chants d'église.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'V → I', sub: 'parfaite · point final', color: GOLD }, { title: 'IV → I', sub: 'plagale · « amen »', color: VIOLET }] },
        audio: { label: "do, fa, sol, do (parfaite), puis do, la m, fa, do (plagale)", notes: [...chords([C, F, G, C]), ...chords([C, Am, F, C], 1.9, 8.4)], tempo: 84 },
        keep: "Parfaite V → I : point. Plagale IV → I : amen.",
      },
      {
        title: "Virgule et surprise",
        paragraphs: [
          "La demi-cadence s'arrête sur V : la phrase n'est pas finie, elle attend la suite, comme une virgule. Une question, souvent, à laquelle la phrase suivante répond.",
          "La cadence rompue prépare I avec V… et pose vi à la place. La basse monte d'un ton au lieu de tomber : on attendait le point, on entend une surprise.",
        ],
        illustration: { kind: 'cards', items: [{ title: '… → V', sub: 'demi-cadence · virgule' }, { title: 'V → vi', sub: 'rompue · surprise', color: VIOLET }] },
        audio: { label: "do, la m, ré m, sol (demi), puis do, fa, sol, la m (rompue)", notes: [...chords([C, Am, Dm, G]), ...chords([C, F, G, Am], 1.9, 8.4)], tempo: 84 },
        keep: "Pour reconnaître une cadence : sur quoi finit-on, et qu'y a-t-il juste avant ?",
      },
      {
        title: "De quinte en quinte jusqu'à la maison",
        paragraphs: [
          "On peut enchaîner plusieurs quintes descendantes : ré → sol → do, c'est ii → V → I. Chaque accord prépare le suivant, et la basse descend le cercle pas à pas jusqu'à la tonique.",
          "Plus la chaîne est longue, plus l'arrivée est forte : la → ré → sol → do (vi – ii – V – I) est la base de centaines de grilles.",
        ],
        illustration: { kind: 'circle', highlight: ['la', 'ré', 'sol', 'do'], arrows: [['la', 'ré'], ['ré', 'sol'], ['sol', 'do']], center: 'vers do' },
        guitarIllustration: { kind: 'fretboard', frets: 6, marks: [{ string: 0, fret: 5, label: 'la' }, { string: 1, fret: 5, label: 'ré', color: VIOLET }, { string: 0, fret: 3, label: 'sol', color: GOLD }, { string: 1, fret: 3, label: 'do' }] },
        guitarParagraphs: [
          "On peut enchaîner plusieurs quintes descendantes : ré → sol → do, c'est ii → V → I. Chaque accord prépare le suivant, et la basse descend le cercle pas à pas jusqu'à la tonique.",
          "Sur les deux cordes graves, la chaîne la → ré → sol → do (vi – ii – V – I) se joue en zigzag : grosse corde case 5, corde de la case 5, grosse corde case 3, corde de la case 3.",
        ],
        audio: { label: "Basse et accords : la m, ré m, sol 7, do", notes: [...seq([45, 50, 43, 48], 1.1, 0.1), ...chords([Am, Dm, G7, C], 1.9, 5)], tempo: 80 },
        keep: "Une chaîne de quintes descendantes mène à la tonique.",
      },
    ],
    practice: [
      { domain: 'theorie', label: "Le cercle : suite, altérations, voisins", templateId: 'TH-4-05', params: { questions: 6 } },
      { domain: 'oreille', label: "Quelle cadence ?", templateId: 'OR-4-02', params: { questions: 6, cadences: ['parfaite', 'plagale', 'demi'] } },
      { domain: 'theorie', label: "Nommer les cadences", templateId: 'TH-4-02' },
      { domain: 'technique', label: "Basses de quinte en quinte", templateId: 'TE-4-06', params: { longueur: 4, tonalites: ['C', 'G', 'F'] } },
      { domain: 'theorie', label: "Armures et tonalités, jusqu'à 4", templateId: 'TH-2-09', params: { questions: 6, max: 4, sens: 'mixte' } },
    ],
    validation: { label: "Reconnaître les cadences", templateId: 'OR-4-02', params: { questions: 8, cadences: ['parfaite', 'plagale', 'demi', 'rompue'] }, criterion: "6 bonnes réponses sur 8" },
  },
  // ------------------------------------------------------------------ 13
  {
    id: 'ii_v_i', number: 13, palier: 4, conceptId: 'ii_v_i',
    title: "Les accords de 7e, le ii-V-I et les notes-guides",
    why: "Le ii-V-I est l'enchaînement le plus courant du jazz et de la pop sophistiquée. Ses notes-guides montrent comment les voix bougent à peine d'un accord à l'autre, et donnent une cible à l'impro.",
    discover: {
      question: "Lequel de ces deux enchaînements a la couleur la plus riche ?",
      a: { notes: chords([Dm, G, C], 2), tempo: 72 }, b: { notes: chords([Dm7, G7v, Cmaj7], 2), tempo: 72 }, answer: 'B',
      reveal: "B ajoute une 4e note à chaque accord, la septième : ré m7, sol 7, do maj7. Le chemin est le même (ii → V → I), mais la couleur s'épaissit et les voix glissent d'un accord à l'autre. C'est le ii-V-I du jazz.",
    },
    screens: [
      {
        title: "Une tierce de plus : l'accord de 7e",
        paragraphs: [
          "Un accord de base, la triade, empile deux tierces : do, mi, sol (1, 3, 5). Empile une tierce de plus et tu obtiens la septième : do, mi, sol, si (1, 3, 5, 7). Do maj7.",
          "Écoute la triade, puis l'accord de 7e : la nouvelle note ne change pas la fonction de l'accord, elle lui donne de l'épaisseur.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 60, label: '1' }, { midi: 64, label: '3' }, { midi: 67, label: '5' }, { midi: 71, label: '7', color: GOLD }] },
        guitarIllustration: { kind: 'fretboard', frets: 4, marks: [{ string: 1, fret: 3, label: '1' }, { string: 2, fret: 2, label: '3' }, { string: 3, fret: 0, label: '5' }, { string: 4, fret: 0, label: '7', color: GOLD }] },
        guitarParagraphs: [
          "Un accord de base, la triade, empile deux tierces : do, mi, sol (1, 3, 5). Empile une tierce de plus et tu obtiens la septième : do, mi, sol, si. Do maj7.",
          "Sur le manche, c'est l'accord de do ouvert dont on lève le doigt de la corde de si : la corde à vide sonne si, la 7e. Écoute la triade, puis l'accord de 7e.",
        ],
        audio: { label: "Do, puis do maj7", notes: chords([[48, 60, 64, 67], [48, 60, 64, 67, 71]], 2.4), tempo: 70 },
        guitarAudio: { label: "Do, puis do maj7", notes: chords([[48, 52, 55, 60, 64], [48, 52, 55, 59, 64]], 2.4), tempo: 70 },
        keep: "Triade + une tierce = accord de 7e (1, 3, 5, 7).",
      },
      {
        title: "Quatre couleurs",
        paragraphs: [
          "Selon la tierce et la septième, quatre accords de 7e reviennent sans cesse. maj7 (tierce majeure, 7e majeure) : doux, rêveur. 7, dit de dominante (tierce majeure, 7e mineure) : tendu, il veut avancer. m7 (tierce mineure, 7e mineure) : détendu. m7♭5, appelé demi-diminué et noté ø (triade diminuée, 7e mineure) : sombre, instable.",
          "Écoute la note du haut contre la fondamentale : un demi-ton sous l'octave (maj7) frotte doucement ; un ton sous l'octave (7, m7) est plus calme.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'maj7', sub: '3 majeure · 7 majeure · rêveur' }, { title: '7', sub: '3 majeure · 7 mineure · tendu', color: GOLD }, { title: 'm7', sub: '3 mineure · 7 mineure · détendu', color: VIOLET }, { title: 'm7♭5 (ø)', sub: 'demi-diminué · sombre' }] },
        audio: { label: "maj7, 7, m7, m7♭5 sur do", notes: chords([[48, 52, 55, 59], [48, 52, 55, 58], [48, 51, 55, 58], [48, 51, 54, 58]], 2), tempo: 80 },
        keep: "maj7 rêveur, 7 tendu, m7 détendu, m7♭5 (demi-diminué) sombre.",
      },
      {
        title: "Les 7e de la gamme",
        paragraphs: [
          "Empile quatre notes de la gamme sur chaque degré de do majeur, sans altération : tu obtiens Imaj7, ii7, iii7, IVmaj7, V7, vi7 et viiø : l'accord demi-diminué (m7♭5).",
          "Un seul accord de dominante, le V7 (sol, si, ré, fa) : c'est lui qui contient la sensible et le 4, les deux notes qui veulent se résoudre. D'où sa tension.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Imaj7 · IVmaj7', sub: 'do maj7 · fa maj7' }, { title: 'ii7 · iii7 · vi7', sub: 'ré m7 · mi m7 · la m7', color: VIOLET }, { title: 'V7', sub: 'sol 7 · le seul tendu', color: GOLD }, { title: 'viiø', sub: 'si m7♭5' }] },
        audio: { label: "Les 7e de do majeur, de I à vii", notes: chords([[48, 52, 55, 59], [50, 53, 57, 60], [52, 55, 59, 62], [53, 57, 60, 64], [55, 59, 62, 65], [57, 60, 64, 67], [59, 62, 65, 69]], 1.3), tempo: 84 },
        keep: "Une seule dominante dans la gamme : V7.",
      },
      {
        title: "ii – V – I",
        paragraphs: [
          "ii7 prépare, V7 tend, Imaj7 résout. En do : ré m7, sol 7, do maj7. En fa : sol m7, do 7, fa maj7.",
          "Pour trouver la tonalité d'un ii-V-I, regarde le dernier accord, le maj7 : c'est la tonique. Ou cherche le 7 : sa fondamentale est le 5 de la tonalité.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'ii7', sub: 'ré m7 · prépare', color: VIOLET }, { title: 'V7', sub: 'sol 7 · tend', color: GOLD }, { title: 'Imaj7', sub: 'do maj7 · résout' }] },
        audio: { label: "ii-V-I en do, puis en fa", notes: [...chords([Dm7, G7v, Cmaj7], 2), ...chords([[43, 58, 62, 65], [48, 58, 64, 67], [41, 57, 64, 69]], 2, 6.8)], tempo: 80 },
        keep: "Préparation, tension, résolution ; le maj7 dit la tonalité.",
      },
      {
        title: "Trois voisins sur le cercle",
        paragraphs: [
          "Ré, sol, do : les fondamentales du ii-V-I descendent de quinte en quinte. Sur le cycle des quintes, ce sont trois voisins, lus dans le sens inverse des aiguilles d'une montre.",
          "Pour le trouver dans n'importe quelle tonalité, pars de la tonique et avance de deux cases dans le sens des aiguilles d'une montre : la première est V, la seconde ii. En sol : ré (V), puis la (ii). Le ii-V-I de sol : la m7, ré 7, sol maj7.",
        ],
        illustration: { kind: 'circle', highlight: ['ré', 'sol', 'do'], arrows: [['ré', 'sol'], ['sol', 'do']], center: 'ii · V · I' },
        audio: { label: "Basse ré → sol → do, sous le ii-V-I", notes: [...seq([50, 43, 48], 1.1, 0.1), ...chords([Dm7, G7v, Cmaj7], 2, 3.8)], tempo: 76 },
        keep: "ii-V-I : trois voisins du cercle, vers la tonique.",
      },
      {
        title: "Les notes-guides : 3 et 7",
        paragraphs: [
          "La tierce et la septième suffisent à dire la couleur d'un accord : la tierce dit majeur ou mineur, la septième dit maj7, 7 ou m7. On les appelle les notes-guides.",
          "Sur un ii-V-I, elles bougent à peine. En do : do (7e de ré m7) descend sur si (3e de sol 7) ; fa (3e de ré m7) reste et devient la 7e de sol 7, puis descend sur mi (3e de do maj7). À chaque fois : une note tient, l'autre descend d'un demi-ton.",
        ],
        illustration: { kind: 'keyboard', from: 59, to: 65, names: true, marks: [{ midi: 60, label: 'do' }, { midi: 59, label: 'si', color: VIOLET }, { midi: 65, label: 'fa' }, { midi: 64, label: 'mi', color: GOLD }], arcs: [{ a: 59, b: 60, label: '½ ↓' }, { a: 64, b: 65, label: '½ ↓', color: GOLD }] },
        guitarIllustration: { kind: 'fretboard', frets: 6, marks: [{ string: 2, fret: 3, label: 'fa' }, { string: 3, fret: 5, label: 'do' }, { string: 3, fret: 4, label: 'si', color: VIOLET }, { string: 2, fret: 2, label: 'mi', color: GOLD }], arcs: [{ string: 3, a: 4, b: 5, label: '½ ↓', color: VIOLET }, { string: 2, a: 2, b: 3, label: '½ ↓', color: GOLD }] },
        guitarParagraphs: [
          "La tierce et la septième suffisent à dire la couleur d'un accord : la tierce dit majeur ou mineur, la septième dit maj7, 7 ou m7. On les appelle les notes-guides.",
          "Sur les cordes de ré et de sol, elles bougent d'une case à la fois : fa et do (ré m7), fa et si (sol 7), mi et si (do maj7). À chaque fois : une note tient, l'autre descend d'une case.",
        ],
        audio: { label: "Les notes-guides seules : fa-do, fa-si, mi-si", notes: chords([[53, 60], [53, 59], [52, 59]]), tempo: 70 },
        keep: "Une note-guide tient, l'autre descend d'un demi-ton.",
      },
      {
        title: "Des accords qui bougent peu",
        paragraphs: [
          "Pour accompagner un ii-V-I, inutile de jouer quatre notes en position fondamentale à chaque accord. La main gauche joue la fondamentale ; la main droite garde les notes-guides, qui glissent d'un demi-ton.",
          "Écoute : la basse fait les quintes, les deux notes du haut bougent à peine. C'est léger, et la grille s'entend parfaitement.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Main gauche', sub: 'la fondamentale : ré, sol, do' }, { title: 'Main droite', sub: '3 et 7 : fa-do, fa-si, mi-si', color: VIOLET }] },
        guitarIllustration: { kind: 'cards', items: [{ title: 'ré m7', sub: 'x5x56x · 1, 7, 3' }, { title: 'sol 7', sub: '3x34xx · 1, 7, 3', color: GOLD }, { title: 'do maj7', sub: 'x3x44x · 1, 7, 3', color: VIOLET }] },
        guitarParagraphs: [
          "Pour accompagner un ii-V-I, les guitaristes de jazz jouent des accords de trois notes : la fondamentale sur une corde grave, puis la 7e et la 3e. On les appelle les « shell voicings ».",
          "Ré m7 avec la fondamentale sur la corde de la, sol 7 avec la fondamentale sur la grosse corde, do maj7 de nouveau sur la corde de la : la main bouge à peine, et la grille s'entend parfaitement.",
        ],
        audio: { label: "ii-V-I : basse + notes-guides", notes: chords([[38, 53, 60], [43, 53, 59], [36, 52, 59]], 2), tempo: 72 },
        guitarAudio: { label: "ii-V-I en shell voicings", notes: chords([[50, 60, 65], [43, 53, 59], [48, 59, 64]], 2), tempo: 72 },
        keep: "Fondamentale + notes-guides : tout le ii-V-I en peu de notes.",
      },
      {
        title: "Viser la tierce en improvisant",
        paragraphs: [
          "Pose la tierce de chaque accord sur le 1er temps de sa mesure : sans aucun accompagnement, on entend déjà la grille. Fa sur ré m7, si sur sol 7, mi sur do maj7.",
          "Pendant la mesure, prépare la tierce suivante : elle est à un demi-ton ou un ton de la précédente. Écoute une phrase qui fait exactement ça.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Temps 1', sub: 'la tierce de l\'accord' }, { title: 'Pendant la mesure', sub: 'chemin vers la tierce suivante', color: VIOLET }] },
        audio: { label: "Phrase sur ii-V-I : fa, si, mi sur les temps 1", notes: [...chords([[38, 53, 60], [43, 53, 59], [36, 52, 59]], 4), ...seq([65, 64, 62, 60], 0.95, 0.05), ...seq([71, 69, 67, 65], 0.95, 0.05, 4), { midi: 64, start: 8, dur: 3.5 }], tempo: 96 },
        keep: "La tierce sur le temps fort : la grille s'entend.",
      },
    ],
    practice: [
      { domain: 'oreille', label: "Couleur des accords de 7e", templateId: 'OR-4-01', params: { qualites: ['maj7', 'dom7', 'm7'] } },
      { domain: 'theorie', label: "Construis l'accord de 7e", templateId: 'TH-4-01', params: { qualites: ['maj7', 'dom7', 'm7'] } },
      { domain: 'theorie', label: "Le ii-V-I des tonalités", templateId: 'TH-4-03' },
      { domain: 'technique', label: "Notes-guides", templateId: 'TE-4-02' },
      { domain: 'oreille', label: "Dictée : grille en 7e", templateId: 'OR-4-03' },
      { domain: 'impro', label: "Vise la tierce", templateId: 'IM-4-01' },
    ],
    validation: { label: "Les notes-guides du ii-V-I", templateId: 'TE-4-02', criterion: "les notes-guides justes" },
  },
  // ------------------------------------------------------------------ R2 (complète)
  {
    id: 'swing', number: 'R2', palier: 4, conceptId: 'swing',
    title: "Swing et triolets",
    why: "Le swing est la respiration du jazz, du blues et d'une bonne partie du rock : des croches inégales, longue puis courte. Il repose sur le triolet, qu'on apprend d'abord à compter, puis à sentir.",
    discover: {
      question: "Laquelle de ces deux phrases « swingue » ?",
      a: { notes: hits([0, 0.5, 1, 1.5, 2, 2.5, 3], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1]), tempo: 110 }, b: { notes: hits([0, 0.67, 1, 1.67, 2, 2.67, 3], [0.67, 0.33, 0.67, 0.33, 0.67, 0.33, 1]), tempo: 110 }, answer: 'B',
      reveal: "B joue chaque paire de croches inégale : longue, puis courte. C'est le swing. A les joue égales : c'est droit. Même rythme écrit, deux façons de le jouer.",
    },
    screens: [
      {
        title: "Le triolet : trois notes dans un temps",
        paragraphs: [
          "Un triolet partage un temps en trois parts égales, au lieu de deux. On le compte « 1 tri o, 2 tri o » : le chiffre sur le temps, puis deux syllabes régulières.",
          "Garde le pied sur les temps : les trois notes doivent tenir exactement entre deux pas.",
        ],
        illustration: { kind: 'pulseGrid', perBar: 4, bars: 1, subdiv: 3 },
        audio: { label: "Le clic sur les temps, des triolets dessus", notes: [...clicks(4, (k) => k === 0), ...hits([0, 0.333, 0.667, 1, 1.333, 1.667, 2, 3], [0.33, 0.33, 0.33, 0.33, 0.33, 0.33, 1, 1])], tempo: 72 },
        keep: "Triolet = 3 notes égales dans un temps : « 1 tri o ».",
      },
      {
        title: "Le triolet écrit",
        paragraphs: [
          "Sur la partition, le triolet s'écrit comme trois croches liées par une barre, avec un petit 3 au-dessus.",
          "Ici : deux triolets, puis deux noires. Compte-les en tapant : « 1 tri o, 2 tri o, 3, 4 ».",
        ],
        illustration: { kind: 'rhythm', items: ['triolet', 'triolet', 'noire', 'noire'], counts: "1 tri o   2 tri o   3   4" },
        audio: { label: "Deux triolets, deux noires", notes: [...clicks(4, (k) => k === 0), ...hits([0, 0.333, 0.667, 1, 1.333, 1.667, 2, 3], [0.33, 0.33, 0.33, 0.33, 0.33, 0.33, 1, 1])], tempo: 72 },
        keep: "Trois croches et un petit 3 : c'est un triolet.",
      },
      {
        title: "Le swing : longue, courte",
        paragraphs: [
          "Swinguer une paire de croches, c'est jouer la première sur les deux premiers tiers du triolet, et la seconde sur le dernier tiers : longue, courte, « taa-ta ».",
          "Écoute les mêmes croches, droites puis swinguées : la deuxième croche de chaque paire arrive un peu plus tard.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Droit', sub: 'ta ta ta ta · égales' }, { title: 'Swing', sub: 'taa-ta taa-ta · longue, courte', color: VIOLET }] },
        audio: { label: "Droit, puis swing", notes: [...hits([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]), ...hits([5, 5.67, 6, 6.67, 7, 7.67, 8, 8.67], [0.67, 0.33, 0.67, 0.33, 0.67, 0.33, 0.67, 0.33])], tempo: 104 },
        keep: "Swing : la paire de croches jouée longue-courte.",
      },
      {
        title: "Écrit droit, joué swing",
        paragraphs: [
          "Les partitions de jazz écrivent des croches ordinaires et indiquent « swing » en tête : à toi de les jouer inégales. On n'écrit pas tous les triolets.",
          "À ne pas confondre : l'appui sur les temps 2 et 4 (le claquement de doigts, la caisse claire, la charleston) s'appelle le backbeat. Le jazz, le rock et le funk l'utilisent, mais c'est une autre idée que le swing : le swing change la division du temps (croches inégales), le backbeat change l'accent. Le rock joue droit avec un backbeat ; on peut aussi swinguer sans backbeat.",
        ],
        illustration: { kind: 'pulseGrid', perBar: 4, bars: 1, subdiv: 1, accents: [1, 3] },
        audio: { label: "Le backbeat : le clic appuyé sur 2 et 4", notes: clicks(8, (k) => k % 2 === 1), tempo: 100 },
        keep: "Croches écrites droites, jouées swing. L'appui sur 2 et 4, c'est le backbeat : une autre notion.",
      },
      {
        title: "Comment s'entraîner",
        paragraphs: [
          "Dis « 1 tri o » sur chaque temps en tapant le pied, puis ne garde que le 1er et le 3e son : « 1 . o » donne le swing.",
          "Écoute beaucoup : le swing se règle à l'oreille, plus ou moins serré selon le tempo et le style.",
        ],
        illustration: { kind: 'cards', items: [{ title: '1 tri o', sub: 'le triolet' }, { title: '1 · o', sub: 'le swing', color: VIOLET }, { title: '2 et 4', sub: 'le backbeat, à part', color: GOLD }] },
        keep: "Triolet, puis on retire le son du milieu : c'est le swing.",
      },
    ],
    practice: [
      { domain: 'oreille', label: "Droit ou swing ?", templateId: 'OR-4-04' },
      { domain: 'rythme', label: "Lire des triolets", templateId: 'RY-4-01' },
      { domain: 'rythme', label: "Perroquet : triolets", templateId: 'RY-4-02' },
    ],
    validation: { label: "Entendre droit ou swing", templateId: 'OR-4-04', params: { questions: 8 }, criterion: "7 bonnes réponses sur 8" },
  },
  // ------------------------------------------------------------------ 5b (complète)
  {
    id: 'cle_fa', number: '5b', palier: 4, conceptId: 'cle_fa',
    title: "Lire en clé de fa",
    why: "La main gauche du piano, la basse, le violoncelle et beaucoup de partitions d'accompagnement s'écrivent en clé de fa. Avec trois repères, elle se lit aussi vite que la clé de sol.",
    screens: [
      {
        title: "Pourquoi une autre clé",
        paragraphs: [
          "En clé de sol, les notes graves tombent loin sous la portée, empilées sur des lignes supplémentaires : illisible.",
          "La clé de fa décale la portée vers le grave : les mêmes cinq lignes servent aux notes de la main gauche.",
        ],
        illustration: { kind: 'staff', notes: [{ midi: 48, label: 'do' }, { midi: 45, label: 'la' }, { midi: 43, label: 'sol' }] },
        keep: "Clé de fa = la portée des notes graves.",
      },
      {
        title: "Fa sur la 4e ligne",
        paragraphs: [
          "Le signe de la clé de fa s'enroule autour de la 4e ligne (en comptant du bas), et ses deux points l'entourent : cette ligne est le fa sous le do du milieu.",
          "C'est le premier repère : tout ce qui est sur cette ligne s'appelle fa.",
        ],
        illustration: { kind: 'staff', clef: 'fa', landmarks: true, notes: [{ midi: 53, label: 'fa', color: '#E0457B' }] },
        guitarParagraphs: [
          "Le signe de la clé de fa s'enroule autour de la 4e ligne (en comptant du bas), et ses deux points l'entourent : cette ligne est le fa sous le do du milieu.",
          "À la guitare, tu liras presque toujours en clé de sol (une octave au-dessus du son) ; la clé de fa sert surtout aux bassistes et aux pianistes. La connaître aide à lire une partition d'ensemble.",
        ],
        audio: { label: "Le fa de la 4e ligne", notes: seq([53], 1.5), tempo: 70 },
        keep: "4e ligne, entre les deux points : fa.",
      },
      {
        title: "Trois repères",
        paragraphs: [
          "En bas, la 1re ligne est sol (sol grave). En haut, juste au-dessus de la portée, le do du milieu du piano, sur sa petite ligne. Et le fa de la 4e ligne.",
          "Du bas vers le haut : sol (ligne), la, si (ligne), do, ré (ligne), mi, fa (ligne), sol, la (ligne).",
        ],
        illustration: { kind: 'staff', clef: 'fa', notes: [{ midi: 43, label: 'sol' }, { midi: 53, label: 'fa', color: '#E0457B' }, { midi: 60, label: 'do' }] },
        audio: { label: "sol grave, fa, do du milieu", notes: seq([43, 53, 60], 1, 0.2), tempo: 70 },
        keep: "Repères : sol (1re ligne), fa (4e ligne), do (au-dessus).",
      },
      {
        title: "Lire depuis le repère le plus proche",
        paragraphs: [
          "Ne compte jamais depuis le bas. Repère d'abord la ligne de fa ou celle de sol, puis avance d'une ligne ou d'un interligne à la fois : une marche = une note.",
          "Ici, depuis le sol de la 1re ligne : la (interligne), si (ligne), do (interligne).",
        ],
        illustration: { kind: 'staff', clef: 'fa', notes: [{ midi: 43, label: 'sol', color: '#E0457B' }, { midi: 45, label: 'la' }, { midi: 47, label: 'si' }, { midi: 48, label: 'do' }] },
        audio: { label: "sol, la, si, do", notes: seq([43, 45, 47, 48], 0.8), tempo: 80 },
        keep: "Un repère, puis une marche à la fois.",
      },
      {
        title: "Au piano : la main gauche",
        paragraphs: [
          "Au piano, la clé de fa est pour la main gauche, la clé de sol pour la main droite : les deux portées se rejoignent au do du milieu.",
          "Lis d'abord la main gauche seule, lentement, en nommant les notes à voix haute ; l'oreille et la main apprendront ensemble.",
        ],
        guitarParagraphs: [
          "Sur une partition de groupe, la ligne de basse est en clé de fa. Les notes y sonnent comme elles sont écrites, une octave sous la guitare écrite en clé de sol.",
          "Lis-la lentement en nommant les notes à voix haute : tu sauras ce que joue le bassiste et tu pourras jouer la basse à la guitare.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Clé de sol', sub: 'main droite, aigu' }, { title: 'Clé de fa', sub: 'main gauche, grave', color: '#8A80B0' }] },
        keep: "Clé de fa : main gauche, basse. Elles se rejoignent au do du milieu.",
      },
    ],
    practice: [
      { domain: 'lecture', label: "Lis en clé de fa", templateId: 'TH-4-04' },
      { domain: 'technique', label: "Joue en clé de fa", templateId: 'TE-4-03' },
    ],
    validation: { label: "Lire 10 notes en clé de fa", templateId: 'TH-4-04', params: { questions: 10 }, criterion: "9 bonnes réponses sur 10" },
  },
];
