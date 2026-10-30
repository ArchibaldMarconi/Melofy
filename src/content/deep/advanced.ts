// Leçons « Pour aller plus loin » (phase 6) : ce que les musiciens confirmés travaillent après les modes.
// Dominantes secondaires, accords enrichis (9, sus, 13), modes du mineur mélodique, conduite des voix.
import type { NoteEvent } from '../types';
import type { DeepLesson } from './types';

const seq = (midis: number[], dur = 1, gap = 0, at = 0): NoteEvent[] => midis.map((m, i) => ({ midi: m, start: at + i * (dur + gap), dur: dur * 0.95 }));
const together = (midis: number[], start: number, dur: number): NoteEvent[] => midis.map((m) => ({ midi: m, start, dur }));
const chords = (list: number[][], beats = 1.9, at = 0): NoteEvent[] => list.flatMap((c, i) => together(c, at + i * beats, beats * 0.92));
const withDrone = (notes: NoteEvent[], root: number): NoteEvent[] => [...notes, { midi: root, start: 0, dur: Math.max(...notes.map((n) => n.start + n.dur)) }];

const VIOLET = '#8A80B0';
const GOLD = '#D9A21B';

// accords (basse au grave, voix au milieu)
const C = [48, 60, 64, 67], Dm = [50, 60, 65, 69], D7 = [50, 60, 66, 69], G = [43, 59, 62, 67], G7 = [43, 59, 62, 65];
const E7 = [52, 59, 62, 68], Am = [45, 60, 64, 69], A7 = [45, 61, 64, 67];
const Cmaj7 = [48, 59, 64, 67], Cmaj9 = [48, 59, 62, 64, 67], Csus4 = [48, 60, 65, 67], Dm7 = [50, 60, 65, 69];

export const ADVANCED_LESSONS: DeepLesson[] = [
  // ------------------------------------------------------------------ 20
  {
    id: 'dominantes_secondaires', number: 20, palier: 6, conceptId: 'dominantes_secondaires',
    title: 'Les dominantes secondaires',
    why: "Beaucoup de morceaux « tirent » vers d'autres accords que la tonique : un accord de 7 inattendu prépare le suivant comme V prépare I. C'est l'une des couleurs les plus utilisées en pop, en soul et en jazz.",
    discover: {
      question: "Dans laquelle de ces suites l'accord du milieu tire-t-il le plus fort vers le suivant ?",
      a: { notes: chords([C, Dm, G, C]), tempo: 76 }, b: { notes: chords([C, D7, G, C]), tempo: 76 }, answer: 'B',
      reveal: "Dans B, l'accord du milieu est ré 7 au lieu de ré mineur : son fa♯ monte vers sol. Ré 7 est la dominante de sol, une « dominante secondaire ».",
    },
    screens: [
      {
        title: 'Une dominante pour chaque accord',
        paragraphs: [
          "V7 prépare I : sol 7 tire vers do. Mais on peut préparer n'importe quel accord de la gamme de la même façon, avec l'accord de 7 construit une quinte au-dessus de lui.",
          "Pour préparer sol, on joue ré 7 : c'est la dominante de la dominante, qu'on écrit V7/V.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 62, label: 'ré' }, { midi: 66, label: 'fa♯', color: VIOLET }, { midi: 69, label: 'la' }, { midi: 72, label: 'do' }] },
        audio: { label: 'do – ré 7 – sol – do', notes: chords([C, D7, G, C]), tempo: 80 },
        keep: "Dominante secondaire : un accord de 7 une quinte au-dessus de l'accord qu'il prépare.",
      },
      {
        title: 'La note étrangère qui monte',
        paragraphs: [
          "Ce qui fait tirer ré 7 vers sol, c'est son fa♯ : une note hors de la gamme de do, à un demi-ton sous sol. Elle joue le rôle d'une sensible, mais pour sol.",
          "Chaque dominante secondaire a sa note étrangère, et elle se résout presque toujours d'un demi-ton.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'V7/V · ré 7', sub: 'fa♯ → sol', color: VIOLET }, { title: 'V7/vi · mi 7', sub: 'sol♯ → la', color: GOLD }, { title: 'V7/IV · do 7', sub: 'si♭ → la' }, { title: 'V7/ii · la 7', sub: 'do♯ → ré' }] },
        keep: "La note étrangère est la « sensible » de l'accord visé.",
      },
      {
        title: 'V7 de vi : vers le mineur',
        paragraphs: [
          "Mi 7 prépare la mineur (vi). Son sol♯ monte vers la. C'est l'enchaînement qui donne sa mélancolie à d'innombrables ballades.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 64, label: 'mi' }, { midi: 68, label: 'sol♯', color: GOLD }, { midi: 71, label: 'si' }, { midi: 62, label: 'ré' }] },
        audio: { label: 'do – mi 7 – la m', notes: chords([C, E7, Am]), tempo: 76 },
        keep: 'Mi 7 → la mineur : V7 de vi.',
      },
      {
        title: "L'entendre dans une grille",
        paragraphs: [
          "Une grille très courante : I – VI7 – ii – V7 – I. Le VI7 (la 7 en do) est la dominante de ii (ré mineur). Chaque accord prépare le suivant de quinte en quinte.",
          "À l'oreille : un accord majeur là où la gamme donnerait un mineur, et qui « veut » aller un cran plus loin dans le cycle des quintes.",
        ],
        illustration: { kind: 'circle', highlight: ['A', 'D', 'G', 'C'], arrows: [['A', 'D'], ['D', 'G'], ['G', 'C']] },
        audio: { label: 'do – la 7 – ré m – sol 7 – do', notes: chords([C, A7, Dm, G7, C]), tempo: 80 },
        keep: 'I – VI7 – ii – V7 – I : de quinte en quinte jusqu’à la maison.',
      },
      {
        title: 'Les construire sans réfléchir',
        paragraphs: [
          "Méthode : trouve l'accord visé, monte d'une quinte (ou descends d'une quarte), et joue un accord de 7 sur cette note : tierce majeure, quinte juste, 7e mineure.",
          "En do : V7/V = ré 7, V7/vi = mi 7, V7/IV = do 7, V7/ii = la 7.",
        ],
        illustration: { kind: 'cards', items: [{ title: '1. La cible', sub: 'ex. sol' }, { title: '2. Une quinte au-dessus', sub: 'ré' }, { title: '3. Accord de 7', sub: 'ré fa♯ la do', color: VIOLET }] },
        keep: 'Cible → une quinte au-dessus → accord de 7.',
      },
      {
        title: 'Ce que tu sais maintenant',
        paragraphs: ['Les dominantes secondaires ajoutent du relief sans changer de maison : après elles, on retrouve la tonique.'],
        illustration: { kind: 'cards', items: [{ title: 'V7/V', sub: 'ré 7 → sol' }, { title: 'V7/vi', sub: 'mi 7 → la m' }, { title: 'V7/IV', sub: 'do 7 → fa' }, { title: 'V7/ii', sub: 'la 7 → ré m' }] },
      },
    ],
    practice: [
      { domain: 'oreille', label: 'Quelle dominante secondaire ?', templateId: 'OR-6-01', params: { questions: 5 } },
      { domain: 'theorie', label: 'Construis la dominante secondaire', templateId: 'TH-6-01' },
      { domain: 'oreille', label: 'La couleur des 7e', templateId: 'OR-4-01', params: { questions: 4, qualites: ['maj7', 'dom7', 'm7'] } },
    ],
    validation: { label: 'Reconnaître la dominante secondaire', templateId: 'OR-6-01', params: { questions: 6, secondaires: ['V/V', 'V/vi', 'V/IV'] }, criterion: '5 bonnes réponses sur 6' },
  },
  // ------------------------------------------------------------------ 21
  {
    id: 'extensions', number: 21, palier: 6, conceptId: 'extensions',
    title: 'Accords enrichis : 9, sus, 13',
    why: "La soul, le jazz et la pop moderne colorent les accords au-delà de la 7e. Une seule note de plus change l'atmosphère, sans changer le rôle de l'accord.",
    discover: {
      question: 'Lequel de ces deux accords sonne le plus « riche » ?',
      a: { notes: chords([Cmaj7], 3), tempo: 70 }, b: { notes: chords([Cmaj9], 3), tempo: 70 }, answer: 'B',
      reveal: "B ajoute un ré au-dessus de do maj7 : la 9e. L'accord garde son rôle (I), mais il s'ouvre et devient plus lumineux.",
    },
    screens: [
      {
        title: 'Encore une tierce : la 9e',
        paragraphs: [
          "Do, mi, sol, si : l'accord de do maj7. Empile encore une tierce de la gamme : ré. C'est la 9e, c'est-à-dire la 2e une octave plus haut.",
          "On la place souvent tout en haut de l'accord, où elle brille.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 74, names: true, marks: [{ midi: 60, label: 'do' }, { midi: 64, label: 'mi' }, { midi: 67, label: 'sol' }, { midi: 71, label: 'si' }, { midi: 74, label: 'ré', color: VIOLET }] },
        audio: { label: 'do maj7, puis do maj9', notes: chords([Cmaj7, Cmaj9], 2.8), tempo: 70 },
        keep: '9e = la 2e, une octave plus haut.',
      },
      {
        title: '9, 11, 13 : la suite de la pile',
        paragraphs: [
          "En continuant d'empiler : 11 (la 4e) puis 13 (la 6e), une octave plus haut. Toutes les notes de la gamme finissent par y passer.",
          "Les couleurs les plus utilisées : maj9 sur I et IV, m9 sur ii, 9 et 13 sur V.",
        ],
        illustration: { kind: 'cards', items: [{ title: '9', sub: 'la 2e en haut' }, { title: '11', sub: 'la 4e en haut' }, { title: '13', sub: 'la 6e en haut', color: VIOLET }] },
        keep: 'maj9 sur I et IV, m9 sur ii, 9 et 13 sur V.',
      },
      {
        title: 'Les accords sus : sans tierce',
        paragraphs: [
          "Un accord sus remplace la tierce par la quarte (sus4) ou la seconde (sus2). Sans tierce, il n'est ni majeur ni mineur : il reste en suspens et appelle souvent la résolution vers l'accord normal.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 60, label: 'do' }, { midi: 65, label: 'fa', color: VIOLET }, { midi: 67, label: 'sol' }] },
        audio: { label: 'do sus4 → do', notes: chords([Csus4, C], 2.4), tempo: 70 },
        keep: 'sus4, sus2 : pas de tierce, l’accord est en suspens.',
      },
      {
        title: 'Reconnaître la couleur',
        paragraphs: [
          "maj9 : doux, ouvert. 9 : une dominante plus riche, bluesy. m9 : un mineur velouté. sus : flottant, sans couleur majeure ou mineure. 13 : la dominante des big bands.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'maj9', sub: 'doux, ouvert' }, { title: '9', sub: 'tendu, bluesy' }, { title: 'm9', sub: 'velouté' }, { title: 'sus', sub: 'en suspens', color: VIOLET }] },
        keep: 'Écoute d’abord la tierce (majeure, mineure, absente), puis la note du haut.',
      },
      {
        title: 'Alléger : on enlève la quinte',
        paragraphs: [
          "Avec 5 notes ou plus, l'accord devient chargé. On enlève d'abord la quinte (elle ne donne pas de couleur), parfois la fondamentale quand un bassiste la joue.",
          "Sur un 13, on garde 3, 7 et 13 : trois notes suffisent à faire entendre l'accord.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'On garde', sub: '3, 7 et l’extension' }, { title: 'On enlève', sub: 'la quinte, parfois la basse' }] },
        keep: '3 et 7 font l’accord, l’extension fait la couleur.',
      },
      {
        title: 'Ce que tu sais maintenant',
        paragraphs: ["Les extensions changent l'atmosphère sans changer la fonction : un ii m9 reste un ii, un V13 reste un V."],
        illustration: { kind: 'cards', items: [{ title: 'Extensions', sub: '9, 11, 13' }, { title: 'Suspendus', sub: 'sus2, sus4' }, { title: 'Allègement', sub: 'sans quinte' }] },
      },
    ],
    practice: [
      { domain: 'oreille', label: 'Quelle couleur d’accord ?', templateId: 'OR-6-02', params: { questions: 5 } },
      { domain: 'theorie', label: 'Construis l’accord enrichi', templateId: 'TH-6-02' },
      { domain: 'theorie', label: 'Construis l’accord de 7e', templateId: 'TH-4-01' },
    ],
    validation: { label: 'Reconnaître la couleur', templateId: 'OR-6-02', params: { questions: 6, qualites: ['maj9', 'dom9', 'sus4', 'add9'] }, criterion: '5 bonnes réponses sur 6' },
  },
  // ------------------------------------------------------------------ 22
  {
    id: 'conduite_voix', number: 22, palier: 6, conceptId: 'conduite_voix',
    title: 'La conduite des voix',
    why: "Les belles harmonies ne sautent pas d'un accord à l'autre : chaque note glisse vers la plus proche. C'est ce qui rend un accompagnement fluide, au piano comme à la guitare.",
    discover: {
      question: 'Lequel de ces deux enchaînements est le plus fluide ?',
      a: { notes: chords([[48, 60, 64, 67], [41, 65, 69, 72]]), tempo: 70 }, b: { notes: chords([[48, 60, 64, 67], [41, 60, 65, 69]]), tempo: 70 }, answer: 'B',
      reveal: "Dans B, do reste en place, mi glisse vers fa et sol vers la : chaque voix bouge à peine. Dans A, tout l'accord saute.",
    },
    screens: [
      {
        title: 'Les notes communes restent',
        paragraphs: [
          "Do majeur (do, mi, sol) et fa majeur (fa, la, do) ont une note en commun : do. Pour passer de l'un à l'autre en douceur, on la garde à la même hauteur.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 60, label: 'do', color: GOLD }, { midi: 64, label: 'mi' }, { midi: 67, label: 'sol' }, { midi: 65, label: 'fa', color: VIOLET }, { midi: 69, label: 'la', color: VIOLET }] },
        audio: { label: 'do mi sol → do fa la', notes: chords([[60, 64, 67], [60, 65, 69]], 2.4), tempo: 70 },
        keep: 'D’abord, garder les notes communes.',
      },
      {
        title: 'Les autres glissent',
        paragraphs: [
          "Les notes qui changent vont à la note la plus proche : mi monte d'un demi-ton vers fa, sol monte d'un ton vers la. Personne ne saute.",
          "On obtient fa majeur « renversé » (do, fa, la) : la même harmonie, dans l'ordre qui demande le moins de mouvement.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'do → do', sub: 'reste', color: GOLD }, { title: 'mi → fa', sub: '½ ton' }, { title: 'sol → la', sub: '1 ton' }] },
        keep: 'Chaque voix va à la note la plus proche.',
      },
      {
        title: 'I – IV – V – I sans sauter',
        paragraphs: [
          "Do (do mi sol) → fa (do fa la) → sol (si ré sol) → do (do mi sol). Les doigts bougent à peine, et l'enchaînement chante.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'I', sub: 'do mi sol' }, { title: 'IV', sub: 'do fa la' }, { title: 'V', sub: 'si ré sol' }, { title: 'I', sub: 'do mi sol' }] },
        audio: { label: 'I – IV – V – I, voix proches', notes: chords([[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]]), tempo: 76 },
        keep: 'Le bon renversement est celui qui bouge le moins.',
      },
      {
        title: 'Les notes-guides de ii – V – I',
        paragraphs: [
          "Sur ii – V – I, regarde seulement la 3e et la 7e de chaque accord. La 7e de ré m7 (do) descend d'un demi-ton vers si, la 3e de sol 7 ; la 7e de sol 7 (fa) descend vers mi, la 3e de do.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 65, label: 'fa' }, { midi: 71, label: 'si', color: VIOLET }, { midi: 64, label: 'mi', color: GOLD }, { midi: 72, label: 'do' }] },
        audio: { label: 'ré m7 – sol 7 – do maj7', notes: chords([Dm7, G7, Cmaj7]), tempo: 72 },
        keep: 'La 7e d’un accord devient la 3e du suivant.',
      },
      {
        title: 'Une ligne qui descend',
        paragraphs: [
          "Enchaîne ces notes-guides et tu obtiens une ligne qui descend doucement, demi-ton par demi-ton. C'est elle qu'on entend dans un bon accompagnement de jazz, et c'est une excellente ligne d'impro.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'ii', sub: '3 : fa · 7 : do' }, { title: 'V', sub: '3 : si · 7 : fa' }, { title: 'I', sub: '3 : mi · 7 : si' }] },
        keep: 'Notes-guides : 3 et 7, une ligne qui descend.',
      },
      {
        title: 'Ce que tu sais maintenant',
        paragraphs: ['Garder les notes communes, faire glisser les autres, suivre les notes-guides : trois réflexes pour un accompagnement qui chante.'],
        illustration: { kind: 'cards', items: [{ title: 'Garder', sub: 'notes communes' }, { title: 'Glisser', sub: '½ ton ou 1 ton' }, { title: 'Guider', sub: '3 et 7' }] },
      },
    ],
    practice: [
      { domain: 'technique', label: 'Bouger le moins possible', templateId: 'TE-6-02' },
      { domain: 'technique', label: 'Les notes-guides sur l’instrument', templateId: 'TE-4-02' },
      { domain: 'technique', label: 'La ligne des notes-guides', templateId: 'TE-6-03' },
    ],
    validation: { label: 'Enchaîner deux accords sans sauter', templateId: 'TE-6-02', criterion: 'toutes les notes justes' },
  },
  // ------------------------------------------------------------------ 23
  {
    id: 'modes_melodique', number: 23, palier: 6, conceptId: 'modes_melodique',
    title: 'Les modes du mineur mélodique',
    why: "Sur les accords de 7 les plus tendus, les improvisateurs piochent dans une autre gamme mère : le mineur mélodique. Deux de ses modes reviennent sans cesse en jazz et en fusion.",
    discover: {
      question: 'Sur le même bourdon, laquelle de ces deux gammes « flotte » le plus ?',
      a: { notes: withDrone(seq([60, 62, 64, 65, 67, 69, 70, 72], 0.45), 48), tempo: 96 }, b: { notes: withDrone(seq([60, 62, 64, 66, 67, 69, 70, 72], 0.45), 48), tempo: 96 }, answer: 'B',
      reveal: "B a un fa♯ (♯4) en plus du si♭ (♭7) : c'est le lydien ♭7, un mode du mineur mélodique. Le ♯4 lui donne cette légèreté.",
    },
    screens: [
      {
        title: 'Le mineur mélodique',
        paragraphs: [
          "Prends do mineur et remonte le 6 et le 7 : do, ré, mi♭, fa, sol, la, si. C'est le mineur mélodique (en jazz, on le joue pareil en montant et en descendant).",
          "Comme la gamme majeure, il a sept points de départ, donc sept modes.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 63, label: 'mi♭' }, { midi: 69, label: 'la', color: VIOLET }, { midi: 71, label: 'si', color: VIOLET }] },
        audio: { label: 'do mineur mélodique', notes: seq([60, 62, 63, 65, 67, 69, 71, 72], 0.5), tempo: 96 },
        keep: 'Mineur mélodique = mineur avec 6 et 7 naturels.',
      },
      {
        title: 'Lydien ♭7 : le 4e mode',
        paragraphs: [
          "Depuis le 4e degré, on obtient une gamme majeure avec un ♯4 et un ♭7. Sur do : do, ré, mi, fa♯, sol, la, si♭.",
          "C'est le son de l'accord 7♯11 : une dominante qui flotte au lieu de tirer.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 66, label: 'fa♯', color: VIOLET }, { midi: 70, label: 'si♭', color: GOLD }] },
        audio: { label: 'do lydien ♭7 sur un bourdon', notes: withDrone(seq([60, 62, 64, 66, 67, 69, 70, 72], 0.5), 48), tempo: 96 },
        keep: 'Lydien ♭7 = ♯4 et ♭7, pour l’accord 7♯11.',
      },
      {
        title: 'Altéré : le 7e mode',
        paragraphs: [
          "Depuis le 7e degré, presque tout est altéré : ♭9, ♯9, ♭5, ♯5, avec la tierce et la 7e de l'accord de dominante. Sur do : do, ré♭, mi♭, mi, sol♭, la♭, si♭.",
          "C'est le son de l'accord 7alt, la dominante la plus tendue avant la résolution.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 61, label: '♭9', color: VIOLET }, { midi: 63, label: '♯9', color: VIOLET }, { midi: 64, label: '3' }, { midi: 66, label: '♭5', color: VIOLET }, { midi: 68, label: '♯5', color: VIOLET }, { midi: 70, label: '♭7' }] },
        audio: { label: 'do altéré', notes: seq([60, 61, 63, 64, 66, 68, 70, 72], 0.5), tempo: 96 },
        keep: 'Altéré = toutes les tensions, pour l’accord 7alt.',
      },
      {
        title: 'Quel mode sur quel accord',
        paragraphs: [
          "m(maj7) : mineur mélodique. 7♯11 : lydien ♭7. 7♭13 : mixolydien ♭6. 7alt : altéré. L'accord dit quelle couleur entendre ; le mode donne les notes pour la jouer.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'm(maj7)', sub: 'mineur mélodique' }, { title: '7♯11', sub: 'lydien ♭7', color: VIOLET }, { title: '7♭13', sub: 'mixolydien ♭6' }, { title: '7alt', sub: 'altéré', color: GOLD }] },
        keep: 'L’accord choisit le mode.',
      },
      {
        title: 'Les entendre sur un bourdon',
        paragraphs: [
          "Comme pour les modes de la gamme majeure, joue chaque mode sur un bourdon de sa tonique et pose sa note caractéristique sur les temps forts : ♯4 pour le lydien ♭7, ♭2 pour l'altéré.",
        ],
        illustration: { kind: 'steps', notes: ['do', 'ré', 'mi', 'fa♯', 'sol', 'la', 'si♭', 'do'], steps: ['T', 'T', 'T', '½', 'T', '½', 'T'] },
        keep: 'Une note caractéristique, sur les temps forts.',
      },
      {
        title: 'Ce que tu sais maintenant',
        paragraphs: ['Une nouvelle gamme mère, quatre modes utiles : de quoi colorer chaque dominante autrement.'],
        illustration: { kind: 'cards', items: [{ title: 'Mineur mélodique', sub: '6 et 7 naturels' }, { title: 'Lydien ♭7', sub: '7♯11' }, { title: 'Altéré', sub: '7alt' }] },
      },
    ],
    practice: [
      { domain: 'oreille', label: 'Quel mode du mineur mélodique ?', templateId: 'OR-6-03', params: { questions: 5 } },
      { domain: 'theorie', label: 'Mode et accord', templateId: 'TH-6-03' },
      { domain: 'technique', label: 'Joue le lydien ♭7', templateId: 'TE-6-01' },
    ],
    validation: { label: 'Reconnaître le mode', templateId: 'OR-6-03', params: { questions: 6, modes: ['melodique', 'lydien_b7', 'altere'], apercus: false }, criterion: '5 bonnes réponses sur 6' },
  },
];
