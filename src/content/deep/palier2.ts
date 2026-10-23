// Leçons approfondies · palier 2 (toute la gamme et les accords).
// Même règle qu'au palier 1 : un écran = une idée, posée et illustrée ; un son seulement s'il fait entendre ce qui est expliqué.
// Sources d'oreille intégrées : chanter la tonique d'abord, reconnaître un accord par sa fonction (repos, suspendu, tension)
// ou par sa basse qu'on redescend jusqu'à 1 ; chanter avant de jouer (l'oreille guide les doigts).
import type { NoteEvent } from '../types';
import type { DeepLesson } from './types';

const seq = (midis: number[], dur = 1, gap = 0, at = 0): NoteEvent[] => midis.map((m, i) => ({ midi: m, start: at + i * (dur + gap), dur: dur * 0.95 }));
const together = (midis: number[], start: number, dur: number): NoteEvent[] => midis.map((m) => ({ midi: m, start, dur }));
/** une suite d'accords plaqués, un par case de `beats` temps */
const chords = (list: number[][], beats = 1.6, at = 0): NoteEvent[] => list.flatMap((c, i) => together(c, at + i * beats, beats * 0.92));

const VIOLET = '#8A80B0';
const GREY = '#B8B2CC';
const GOLD = '#D9A21B';
const C = [48, 52, 55], F = [53, 57, 60], G = [55, 59, 62];

export const PALIER2: DeepLesson[] = [
  // ------------------------------------------------------------------ 6
  {
    id: 'accords', number: 7, palier: 2, conceptId: 'accords_145',
    title: 'Construire les accords, sentir leur rôle',
    why: 'Un accord, c\'est la couleur sous la mélodie. Savoir comment il se construit permet d\'en fabriquer n\'importe lequel ; sentir le rôle qu\'il joue dans la tonalité permet de le reconnaître à l\'oreille, sans calcul.',
    discover: {
      question: 'Après l\'accord de la maison, lequel de ces deux accords donne le plus envie de revenir ?',
      a: { notes: chords([C, F]), tempo: 70 }, b: { notes: chords([C, G]), tempo: 70 }, answer: 'B',
      reveal: 'B fait entendre l\'accord V : c\'est le plus tendu, il appelle le retour à la maison. A fait entendre l\'accord IV : il s\'éloigne, mais sans tirer. Construire ces accords, puis les reconnaître par leur rôle : c\'est le programme de cette leçon.',
    },
    screens: [
      {
        title: 'Plusieurs notes en même temps',
        paragraphs: [
          'Une mélodie, ce sont des notes jouées l\'une après l\'autre. Un accord, ce sont plusieurs notes jouées ensemble, qui se fondent en une seule couleur.',
          'L\'accord le plus courant en a trois. Écoute do, mi et sol l\'un après l\'autre, puis ensemble.',
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 60, label: 'do' }, { midi: 64, label: 'mi' }, { midi: 67, label: 'sol' }] },
        guitarIllustration: { kind: 'fretboard', frets: 4, marks: [{ string: 1, fret: 3, label: 'do' }, { string: 2, fret: 2, label: 'mi' }, { string: 3, fret: 0, label: 'sol' }, { string: 4, fret: 1, label: 'do' }, { string: 5, fret: 0, label: 'mi' }] },
        audio: { label: 'do, mi, sol, puis les trois ensemble', notes: [...seq([60, 64, 67], 0.8, 0.1), ...together([60, 64, 67], 2.9, 2.2)], tempo: 70 },
        guitarParagraphs: [
          'Une mélodie, ce sont des notes jouées l\'une après l\'autre. Un accord, ce sont plusieurs notes jouées ensemble, qui se fondent en une seule couleur.',
          'L\'accord de do de la guitare (en bas du manche) ne contient que trois notes différentes : do, mi et sol, dont deux en double. Écoute-les une à une, puis grattées ensemble.',
        ],
        guitarAudio: { label: 'do, mi, sol, puis l\'accord de do gratté', notes: [...seq([48, 52, 55], 0.8, 0.1), ...[48, 52, 55, 60, 64].map((m, i) => ({ midi: m, start: 2.9 + i * 0.04, dur: 2.2 }))], tempo: 70 },
        keep: 'Un accord = plusieurs notes ensemble. Le plus courant en a trois.',
      },
      {
        title: 'Une note sur deux',
        paragraphs: [
          'Pour construire un accord, on part d\'une note de la gamme et on en prend une sur deux : do, (ré), mi, (fa), sol.',
          'On obtient les notes 1, 3 et 5 de l\'accord : sa fondamentale, qui lui donne son nom, sa tierce et sa quinte.',
        ],
        illustration: { kind: 'keyboard', from: 60, to: 67, names: true, marks: [{ midi: 60, label: 'do' }, { midi: 62, label: 'ré', color: GREY }, { midi: 64, label: 'mi' }, { midi: 65, label: 'fa', color: GREY }, { midi: 67, label: 'sol' }], arcs: [{ a: 60, b: 64, label: '1 → 3' }, { a: 64, b: 67, label: '3 → 5' }] },
        guitarIllustration: { kind: 'fretboard', frets: 4, marks: [{ string: 1, fret: 3, label: '1' }, { string: 2, fret: 0, label: 'ré', color: GREY }, { string: 2, fret: 2, label: '3' }, { string: 2, fret: 3, label: 'fa', color: GREY }, { string: 3, fret: 0, label: '5' }] },
        guitarParagraphs: [
          'Pour construire un accord, on part d\'une note de la gamme et on en prend une sur deux : do, (ré), mi, (fa), sol.',
          'Sur le manche : do (corde de la, case 3), mi (corde de ré, case 2), sol (corde de sol à vide). Ce sont les notes 1, 3 et 5 de l\'accord : sa fondamentale, qui lui donne son nom, sa tierce et sa quinte.',
        ],
        audio: { label: 'do ré mi fa sol, puis seulement do, mi, sol', notes: [...seq([60, 62, 64, 65, 67], 0.5), ...seq([60, 64, 67], 0.8, 0.1, 3.2)], tempo: 80 },
        guitarAudio: { label: 'do ré mi fa sol, puis seulement do, mi, sol', notes: [...seq([48, 50, 52, 53, 55], 0.5), ...seq([48, 52, 55], 0.8, 0.1, 3.2)], tempo: 80 },
        keep: 'Un accord = 1, 3, 5 : une note de la gamme sur deux.',
      },
      {
        title: 'Deux tierces empilées',
        paragraphs: [
          'Tu connais les tierces depuis la leçon sur les intervalles : entre deux notes prises « une sur deux », il y a toujours une tierce. De do à mi : 4 demi-tons (deux tons), c\'est une tierce majeure. De mi à sol : 3 demi-tons (un ton et demi), c\'est une tierce mineure.',
          'L\'accord majeur, c\'est cette recette : la grande tierce en bas, la petite au-dessus.',
        ],
        illustration: { kind: 'keyboard', from: 60, to: 67, names: true, marks: [{ midi: 60 }, { midi: 64 }, { midi: 67 }], arcs: [{ a: 60, b: 64, label: '2 tons' }, { a: 64, b: 67, label: '1 ton ½', color: VIOLET }] },
        guitarIllustration: { kind: 'fretboard', frets: 10, marks: [{ string: 1, fret: 3, label: 'do' }, { string: 1, fret: 7, label: 'mi' }, { string: 1, fret: 10, label: 'sol' }], arcs: [{ string: 1, a: 3, b: 7, label: '2 tons' }, { string: 1, a: 7, b: 10, label: '1 ton ½', color: VIOLET }] },
        guitarParagraphs: [
          'Tu connais les tierces depuis la leçon sur les intervalles : entre deux notes prises « une sur deux », il y a toujours une tierce. Sur la corde de la : de do (case 3) à mi (case 7), quatre cases, deux tons : une tierce majeure. De mi à sol (case 10), trois cases, un ton et demi : une tierce mineure.',
          'L\'accord majeur, c\'est cette recette : la grande tierce en bas, la petite au-dessus.',
        ],
        audio: { label: 'do → mi (tierce majeure), puis mi → sol (tierce mineure)', notes: [...seq([60, 64], 0.9, 0.1), ...seq([64, 67], 0.9, 0.1, 2.6)], tempo: 70 },
        guitarAudio: { label: 'do → mi (tierce majeure), puis mi → sol (tierce mineure)', notes: [...seq([48, 52], 0.9, 0.1), ...seq([52, 55], 0.9, 0.1, 2.6)], tempo: 70 },
        keep: 'Accord majeur = tierce majeure (2 tons) + tierce mineure (1 ton ½).',
      },
      {
        title: 'Majeur ou mineur : l\'ordre des tierces',
        paragraphs: [
          'Inverse l\'ordre, la petite tierce en bas et la grande au-dessus, et l\'accord devient mineur : plus sombre, plus tendre. De do majeur (do mi sol) à do mineur (do mi♭ sol), une seule note bouge : la tierce, d\'un demi-ton.',
          'Dans la gamme de do, trois accords sont mineurs, parce que leur première tierce est petite : ré-fa-la, mi-sol-si et la-do-mi.',
        ],
        illustration: { kind: 'cards', items: [{ title: 'Majeur', sub: '2 tons, puis 1 ton ½ · lumineux' }, { title: 'Mineur', sub: '1 ton ½, puis 2 tons · sombre', color: VIOLET }] },
        audio: { label: 'do majeur, puis do mineur : seule la tierce change', notes: [...together([60, 64, 67], 0, 1.8), ...together([60, 63, 67], 2.3, 1.8)], tempo: 70 },
        guitarAudio: { label: 'do majeur, puis do mineur : seule la tierce change', notes: [...together([48, 52, 55], 0, 1.8), ...together([48, 51, 55], 2.3, 1.8)], tempo: 70 },
        keep: 'Mineur = la petite tierce en bas. D\'un accord à l\'autre, seule la tierce bouge.',
      },
      {
        title: 'I, IV et V : les trois accords majeurs',
        paragraphs: [
          'On peut bâtir un accord sur chaque note de la gamme. On les numérote en chiffres romains, d\'après le degré de leur fondamentale : en do, I est l\'accord de do, IV celui de fa, V celui de sol.',
          'Ces trois-là sont majeurs, et à eux trois ils contiennent toutes les notes de la gamme. C\'est pourquoi tant de chansons tiennent avec eux seuls.',
        ],
        illustration: { kind: 'cards', items: [{ title: 'I', sub: 'do · mi · sol' }, { title: 'IV', sub: 'fa · la · do', color: VIOLET }, { title: 'V', sub: 'sol · si · ré', color: GOLD }] },
        audio: { label: 'I, IV, V, puis retour à I', notes: chords([C, F, G, C], 1.8), tempo: 70 },
        keep: 'En do : I = do mi sol, IV = fa la do, V = sol si ré.',
      },
      {
        title: 'Chaque accord a un rôle',
        paragraphs: [
          'I et V sont tous deux majeurs, et pourtant ils ne font pas le même effet : ce qui compte, c\'est leur place par rapport à la maison. I est la maison, il repose. IV s\'éloigne : ça flotte, c\'est suspendu. V tend : il appelle le retour.',
          'Écoute I, IV, I, puis I, V, I : le V tire bien plus fort vers la maison.',
        ],
        illustration: { kind: 'cards', items: [{ title: 'I', sub: 'repos, la maison' }, { title: 'IV', sub: 'suspendu, on s\'éloigne', color: VIOLET }, { title: 'V', sub: 'tension, on veut rentrer', color: GOLD }] },
        audio: { label: 'I, IV, I… puis I, V, I', notes: [...chords([C, F, C], 1.6), ...chords([C, G, C], 1.6, 5.6)], tempo: 70 },
        keep: 'I : repos. IV : suspendu. V : tension qui veut rentrer.',
      },
      {
        title: 'Reconnaître un accord sans calculer',
        paragraphs: [
          'D\'abord, chante la tonique : tant que tu la tiens, la maison ne bouge pas dans ta tête. Ensuite, deux façons, pas plus : sentir le rôle de l\'accord (repos, suspendu, tension), ou chanter sa note la plus grave, la basse, et descendre la gamme jusqu\'à la tonique en comptant les notes.',
          'Évite de calculer l\'écart entre deux accords ou de chercher « majeur ou mineur » hors contexte : la maison se déplace alors dans ta tête sans que tu le remarques, et un même accord peut sembler être n\'importe lequel.',
        ],
        illustration: { kind: 'cards', items: [{ title: '1. La tonique', sub: 'chante-la d\'abord' }, { title: '2. Sentir', sub: 'repos, suspendu, tension', color: VIOLET }, { title: 'ou la basse', sub: 'redescendre jusqu\'à 1', color: GOLD }] },
        audio: { label: 'L\'accord V, puis sa basse qu\'on redescend : sol fa mi ré do, 5 notes → V', notes: [...together(G, 0, 2), ...seq([55, 53, 52, 50, 48], 0.75, 0.05, 2.6)], tempo: 72 },
        keep: 'La tonique d\'abord. Puis sentir le rôle, ou chanter la basse jusqu\'à 1.',
      },
      {
        title: 'Ce que tu sais maintenant',
        paragraphs: [
          'Tu sais construire un accord en empilant deux tierces, et dire s\'il est majeur ou mineur. Tu connais les trois accords majeurs de la gamme, et le rôle de chacun.',
          'Place à la pratique : les entendre en tenant la tonique, les construire, les jouer et les chanter.',
        ],
        illustration: { kind: 'cards', items: [{ title: '1 · 3 · 5', sub: 'une note sur deux' }, { title: 'Majeur / mineur', sub: 'l\'ordre des tierces', color: VIOLET }, { title: 'I · IV · V', sub: 'repos, suspendu, tension', color: GOLD }] },
      },
    ],
    practice: [
      { domain: 'oreille', label: 'I, IV ou V ? La tonique d\'abord', templateId: 'OR-2-08', params: { questions: 6 } },
      { domain: 'theorie', label: 'Tierces empilées, majeur ou mineur', templateId: 'TH-2-08', params: { questions: 6, niveau_q: 1 } },
      { domain: 'technique', label: 'Place les accords I, IV et V', templateId: 'TE-2-05' },
      { domain: 'chant', label: 'Chante l\'arpège de l\'accord : 1-3-5-3-1', templateId: 'OR-2-15', params: { accords: [1, 4, 5] } },
    ],
    validation: { label: 'Reconnaître I, IV et V, dans plusieurs tonalités', templateId: 'OR-2-08', params: { questions: 10, tonalite: 'varie' }, criterion: '8 bonnes réponses sur 10' },
  },
  // ------------------------------------------------------------------ 7
  {
    id: 'armure', number: 8, palier: 2, conceptId: 'noms_notes',
    title: 'Les altérations et l\'armure',
    why: 'Une partition annonce sa tonalité dès la première ligne, avant la première note. Savoir la lire, c\'est savoir d\'avance quelles touches ou quelles cases on va jouer, et entendre la couleur du morceau avant de le jouer.',
    discover: {
      question: 'Laquelle de ces deux phrases se pose bien, comme une phrase en sol majeur ?',
      a: { notes: seq([67, 71, 74, 72, 71, 69, 66, 67], 0.55), tempo: 84 }, b: { notes: seq([67, 71, 74, 72, 71, 69, 65, 67], 0.55), tempo: 84 }, answer: 'A',
      reveal: 'Dans A, l\'avant-dernière note est fa♯ : la phrase glisse naturellement sur sol. Dans B, on a joué fa sans dièse : la note « tombe » et la maison vacille. Sur une partition en sol majeur, ce ♯ s\'écrit une seule fois, au début : c\'est l\'armure.',
    },
    screens: [
      {
        title: 'Le dièse, le bémol et le bécarre',
        paragraphs: [
          'Un dièse (♯) monte une note d\'un demi-ton : fa♯ est la touche juste à droite de fa. Un bémol (♭) la descend d\'un demi-ton : si♭ est la touche juste à gauche de si.',
          'Le bécarre (♮) annule l\'un ou l\'autre : la note redevient naturelle.',
        ],
        illustration: { kind: 'keyboard', from: 64, to: 72, names: true, marks: [{ midi: 66, label: 'fa♯' }, { midi: 70, label: 'si♭', color: VIOLET }], arcs: [{ a: 65, b: 66, label: '♯ ↑' }, { a: 70, b: 71, label: '♭ ↓', color: VIOLET }] },
        guitarIllustration: { kind: 'fretboard', frets: 5, marks: [{ string: 2, fret: 3, label: 'fa', color: GREY }, { string: 2, fret: 4, label: 'fa♯' }, { string: 1, fret: 2, label: 'si', color: GREY }, { string: 1, fret: 1, label: 'si♭', color: VIOLET }], arcs: [{ string: 2, a: 3, b: 4, label: '♯ ↑' }, { string: 1, a: 1, b: 2, label: '♭ ↓', color: VIOLET }] },
        guitarParagraphs: [
          'Un dièse (♯) monte une note d\'un demi-ton : une case plus loin, vers le corps de la guitare (fa → fa♯ sur la corde de ré). Un bémol (♭) la descend d\'un demi-ton : une case vers la tête (si → si♭ sur la corde de la).',
          'Le bécarre (♮) annule l\'un ou l\'autre : la note redevient naturelle.',
        ],
        audio: { label: 'fa, puis fa♯ ; si, puis si♭', notes: [...seq([65, 66], 0.9, 0.1), ...seq([71, 70], 0.9, 0.1, 2.6)], tempo: 70 },
        guitarAudio: { label: 'fa, puis fa♯ ; si, puis si♭', notes: [...seq([53, 54], 0.9, 0.1), ...seq([47, 46], 0.9, 0.1, 2.6)], tempo: 70 },
        keep: '♯ : un demi-ton plus haut. ♭ : un demi-ton plus bas. ♮ : retour à la note naturelle.',
      },
      {
        title: 'Une touche, deux noms',
        paragraphs: [
          'La touche noire entre fa et sol est à la fois fa♯ (fa monté) et sol♭ (sol descendu) : même son, deux noms.',
          'Le nom dépend de la tonalité : une gamme utilise chaque lettre une seule fois (do ré mi fa sol la si). En sol majeur, on écrit donc fa♯, jamais sol♭, puisque le sol est déjà pris.',
        ],
        illustration: { kind: 'keyboard', from: 64, to: 69, names: true, marks: [{ midi: 66, label: 'fa♯ = sol♭' }] },
        guitarIllustration: { kind: 'fretboard', frets: 5, marks: [{ string: 2, fret: 3, label: 'fa', color: GREY }, { string: 2, fret: 4, label: 'fa♯' }, { string: 2, fret: 5, label: 'sol', color: GREY }] },
        guitarParagraphs: [
          'La case 4 de la corde de ré, entre fa (case 3) et sol (case 5), est à la fois fa♯ (fa monté) et sol♭ (sol descendu) : même son, deux noms.',
          'Le nom dépend de la tonalité : une gamme utilise chaque lettre une seule fois (do ré mi fa sol la si). En sol majeur, on écrit donc fa♯, jamais sol♭, puisque le sol est déjà pris.',
        ],
        keep: 'Même son, deux noms : c\'est la tonalité qui choisit.',
      },
      {
        title: 'Les altérations viennent de la formule',
        paragraphs: [
          'Souviens-toi de la formule de la gamme majeure : T T ½ T T T ½. Partie de sol, elle oblige à jouer fa♯ (leçon 2). Partie de fa, entre la 3e et la 4e note il faut un demi-ton : après la, ce n\'est donc pas si, mais si♭.',
          'Chaque tonalité a ainsi ses altérations, toujours les mêmes. Les réécrire devant chaque note serait pénible…',
        ],
        illustration: { kind: 'steps', notes: ['fa', 'sol', 'la', 'si♭', 'do', 'ré', 'mi', 'fa'], steps: ['T', 'T', '½', 'T', 'T', 'T', '½'] },
        audio: { label: 'La gamme de fa majeur, avec son si♭', notes: seq([65, 67, 69, 70, 72, 74, 76, 77], 0.6), tempo: 90 },
        guitarAudio: { label: 'La gamme de fa majeur, avec son si♭', notes: seq([53, 55, 57, 58, 60, 62, 64, 65], 0.6), tempo: 90 },
        keep: 'Sol majeur : fa♯. Fa majeur : si♭. C\'est la formule qui décide.',
      },
      {
        title: 'L\'armure : les altérations écrites une fois pour toutes',
        paragraphs: [
          'Au lieu d\'écrire le ♯ devant chaque fa, on le place une fois, au début de chaque ligne, juste après la clé : c\'est l\'armure. Elle vaut pour tous les fa du morceau, à toutes les hauteurs.',
          'Ici, une armure d\'un dièse : sol majeur. L\'avant-dernière note s\'écrit sur la case du fa, sans rien devant, mais se joue fa♯.',
        ],
        illustration: { kind: 'staff', keySig: 1, sigLabels: true, notes: [{ midi: 67 }, { midi: 71 }, { midi: 74 }, { midi: 72 }, { midi: 71 }, { midi: 69 }, { midi: 66, label: 'fa♯', color: '#E0457B' }, { midi: 67 }] },
        audio: { label: 'La phrase écrite, jouée avec son fa♯', notes: seq([67, 71, 74, 72, 71, 69, 66, 67], 0.55), tempo: 84 },
        guitarAudio: { label: 'La phrase écrite, jouée avec son fa♯ (la guitare sonne une octave plus bas que l\'écrit)', notes: seq([55, 59, 62, 60, 59, 57, 54, 55], 0.55), tempo: 84 },
        keep: 'L\'armure : les altérations du morceau, écrites une fois après la clé.',
      },
      {
        title: 'L\'ordre des dièses',
        paragraphs: [
          'Les dièses de l\'armure arrivent toujours dans le même ordre : fa, do, sol, ré, la, mi, si. Sol majeur en a un (fa♯), ré majeur deux (fa♯, do♯), la majeur trois (fa♯, do♯, sol♯).',
          'Pour le retenir, une phrase : « Fa Do Sol Ré La Mi Si ». Chaque nouveau dièse est une quinte au-dessus du précédent.',
        ],
        illustration: { kind: 'staff', keySig: 3, sigLabels: true, notes: [] },
        keep: 'Dièses, dans l\'ordre : fa do sol ré la mi si.',
      },
      {
        title: 'L\'ordre des bémols',
        paragraphs: [
          'Les bémols suivent l\'ordre inverse : si, mi, la, ré, sol, do, fa. Fa majeur en a un (si♭), si♭ majeur deux (si♭, mi♭), mi♭ majeur trois (si♭, mi♭, la♭).',
          'C\'est exactement l\'ordre des dièses, lu à l\'envers.',
        ],
        illustration: { kind: 'staff', keySig: -3, sigLabels: true, notes: [] },
        keep: 'Bémols, dans l\'ordre : si mi la ré sol do fa (les dièses à l\'envers).',
      },
      {
        title: 'Lire l\'armure d\'un coup d\'œil',
        paragraphs: [
          'Avec des dièses, la tonalité est un demi-ton au-dessus du dernier dièse : dernier dièse do♯, donc ré majeur.',
          'Avec des bémols, c\'est l\'avant-dernier bémol : si♭, mi♭, donc si♭ majeur. Deux cas à retenir par cœur : un seul bémol, c\'est fa majeur ; aucune altération, do majeur.',
        ],
        illustration: { kind: 'staff', keySig: 2, sigLabels: true, sigHighlight: 1, notes: [{ midi: 62, label: 'ré : la tonique', color: '#E0457B' }] },
        audio: { label: 'La gamme de ré majeur, avec fa♯ et do♯', notes: seq([62, 64, 66, 67, 69, 71, 73, 74], 0.6), tempo: 90 },
        guitarAudio: { label: 'La gamme de ré majeur, avec fa♯ et do♯', notes: seq([50, 52, 54, 55, 57, 59, 61, 62], 0.6), tempo: 90 },
        keep: 'Dièses : dernier dièse + ½ ton. Bémols : l\'avant-dernier bémol.',
      },
      {
        title: 'Ce que tu sais maintenant',
        paragraphs: [
          'Tu sais ce que font ♯, ♭ et ♮, d\'où viennent les altérations d\'une tonalité, comment elles se rangent dans l\'armure, et comment trouver la tonalité d\'un coup d\'œil.',
          'Place à la pratique : reconnaître des armures, lire et jouer avec elles, et entendre quand une note les oublie.',
        ],
        illustration: { kind: 'cards', items: [{ title: '♯ ♭ ♮', sub: 'monter, descendre, annuler' }, { title: 'L\'armure', sub: 'les altérations du morceau', color: VIOLET }, { title: 'La tonalité', sub: 'dernier ♯ + ½ ton, ou avant-dernier ♭', color: GOLD }] },
      },
    ],
    practice: [
      { domain: 'theorie', label: 'Armure ↔ tonalité', templateId: 'TH-2-09', params: { questions: 6, max: 3, sens: 'mixte' } },
      { domain: 'lecture', label: 'Lis et joue avec l\'armure', templateId: 'TE-2-14', params: { nb_notes: 4, armures: [1, -1] } },
      { domain: 'technique', label: 'Joue la gamme que montre l\'armure', templateId: 'TE-2-13', params: { armures: [1, 2, -1] } },
      { domain: 'oreille', label: 'La mélodie respecte-t-elle l\'armure ?', templateId: 'OR-2-16', params: { questions: 5, armures: [1, -1, 2] } },
    ],
    validation: { label: 'Reconnaître les armures, jusqu\'à 3 ♯ et 3 ♭', templateId: 'TH-2-09', params: { questions: 8, max: 3, sens: 'armure_vers_ton' }, criterion: '7 bonnes réponses sur 8' },
  },
  // ------------------------------------------------------------------ 8
  {
    id: 'pentatonique', number: 9, palier: 2, conceptId: 'penta_majeure',
    title: 'La pentatonique : cinq notes pour improviser',
    why: 'Cinq notes qui sonnent bien sur presque tout : c\'est la porte d\'entrée de l\'improvisation. Comprendre pourquoi elles marchent permet de les retrouver dans n\'importe quelle tonalité, et de jouer ce qu\'on entend dans sa tête.',
    discover: {
      question: 'Sur le même accord, laquelle de ces deux petites phrases sonne « bien » d\'un bout à l\'autre ?',
      a: { notes: [...together([48, 52, 55], 0, 6), ...seq([72, 69, 67, 64, 62, 64], 0.5, 0.05), { midi: 67, start: 3.3, dur: 2.5 }], tempo: 84 },
      b: { notes: [...together([48, 52, 55], 0, 6), ...seq([72, 71, 69, 67, 71, 69], 0.5, 0.05), { midi: 65, start: 3.3, dur: 2.5 }], tempo: 84 },
      answer: 'A',
      reveal: 'A n\'utilise que cinq notes : do, ré, mi, sol, la. B ajoute si et fa, et s\'arrête sur fa : contre l\'accord de do, ce fa frotte. La pentatonique, c\'est justement la gamme majeure sans ces deux notes-là.',
    },
    screens: [
      {
        title: 'Cinq notes',
        paragraphs: [
          'Prends la gamme de do majeur et retire deux notes : le fa (4) et le si (7). Il reste do, ré, mi, sol, la : la pentatonique majeure (« penta » veut dire cinq).',
          'On la trouve dans le monde entier : chansons populaires, folk, blues, rock, musiques d\'Asie et d\'Afrique.',
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 60, label: '1' }, { midi: 62, label: '2' }, { midi: 64, label: '3' }, { midi: 65, label: '✕', color: GREY }, { midi: 67, label: '5' }, { midi: 69, label: '6' }, { midi: 71, label: '✕', color: GREY }, { midi: 72, label: '1' }] },
        guitarIllustration: { kind: 'fretboard', frets: 4, marks: [{ string: 1, fret: 3, label: 'do' }, { string: 2, fret: 0, label: 'ré' }, { string: 2, fret: 2, label: 'mi' }, { string: 3, fret: 0, label: 'sol' }, { string: 3, fret: 2, label: 'la' }, { string: 4, fret: 1, label: 'do' }] },
        guitarParagraphs: [
          'Prends la gamme de do majeur et retire deux notes : le fa (4) et le si (7). Il reste do, ré, mi, sol, la : la pentatonique majeure (« penta » veut dire cinq).',
          'Dans les premières cases : do (corde de la, case 3), ré et mi (corde de ré), sol et la (corde de sol), puis do (corde de si, case 1). On la trouve dans le monde entier : folk, blues, rock, musiques d\'Asie et d\'Afrique.',
        ],
        audio: { label: 'La pentatonique de do, en montant puis en descendant', notes: seq([60, 62, 64, 67, 69, 72, 69, 67, 64, 62, 60], 0.45), tempo: 90 },
        guitarAudio: { label: 'La pentatonique de do, en montant puis en descendant', notes: seq([48, 50, 52, 55, 57, 60, 57, 55, 52, 50, 48], 0.45), tempo: 90 },
        keep: 'Penta majeure = 1 2 3 5 6 : la gamme majeure sans 4 ni 7.',
      },
      {
        title: 'Pourquoi sans 4 ni 7',
        paragraphs: [
          'Le 4 et le 7 sont les deux notes qui tirent le plus fort (4 vers 3, 7 vers 1) : chacune n\'est qu\'à un demi-ton de sa voisine, et elles frottent avec certains accords.',
          'Sans elles, plus aucun demi-ton : seulement des tons et des sauts d\'un ton et demi. Aucune note ne frotte, on peut se poser sur chacune sans risque.',
        ],
        illustration: { kind: 'steps', notes: ['do', 'ré', 'mi', 'sol', 'la', 'do'], steps: ['T', 'T', '1½', 'T', '1½'] },
        audio: { label: 'Sur l\'accord de do : fa frotte… sol repose', notes: [...together([48, 52, 55], 0, 4.4), { midi: 65, start: 0.2, dur: 1.9 }, { midi: 67, start: 2.4, dur: 1.9 }], tempo: 70 },
        guitarAudio: { label: 'Sur l\'accord de do : fa frotte… sol repose', notes: [...together([48, 52, 55, 60], 0, 4.4), { midi: 65, start: 0.2, dur: 1.9 }, { midi: 67, start: 2.4, dur: 1.9 }], tempo: 70 },
        keep: 'Pas de demi-ton dans la penta : aucune note ne frotte.',
      },
      {
        title: 'Au piano : degrés et doigté',
        only: 'piano',
        paragraphs: [
          'Les cinq degrés sont toujours 1, 2, 3, 5, 6, quelle que soit la tonique. En sol : sol, la, si, ré, mi. Pense « 1 2 3, 5 6 » et la gamme se trouve toute seule dans n\'importe quelle tonalité.',
          'Doigté de la main droite, sur une octave : pouce, index, majeur (1 2 3) sur 1 2 3 ; puis le pouce passe sous la main pour le 5, et on recommence 1 2 3.',
        ],
        illustration: { kind: 'keyboard', from: 67, to: 79, names: true, marks: [{ midi: 67, label: '1' }, { midi: 69, label: '2' }, { midi: 71, label: '3' }, { midi: 74, label: '5' }, { midi: 76, label: '6' }, { midi: 79, label: '1' }] },
        audio: { label: 'La pentatonique de sol : sol la si ré mi sol', notes: seq([67, 69, 71, 74, 76, 79], 0.5), tempo: 90 },
        keep: '1 2 3 5 6 dans toutes les tonalités ; doigté 1 2 3, puis 1 2 3.',
      },
      {
        title: 'À la guitare : une position',
        only: 'guitare',
        paragraphs: [
          'Une position, c\'est une zone de quatre ou cinq cases où toute la gamme tombe sous les doigts sans bouger la main : un doigt par case.',
          'Voici une position de la penta de do, autour des cases 7 à 10. Pense en degrés, pas en points : chaque rond porte son numéro (1 2 3 5 6), et les 1 sont tes repères.',
        ],
        illustration: { kind: 'fretboard', frets: 10, marks: [
          { string: 0, fret: 8, label: '1' }, { string: 0, fret: 10, label: '2', color: VIOLET }, { string: 1, fret: 7, label: '3', color: VIOLET }, { string: 1, fret: 10, label: '5', color: VIOLET },
          { string: 2, fret: 7, label: '6', color: VIOLET }, { string: 2, fret: 10, label: '1' }, { string: 3, fret: 7, label: '2', color: VIOLET }, { string: 3, fret: 9, label: '3', color: VIOLET },
          { string: 4, fret: 8, label: '5', color: VIOLET }, { string: 4, fret: 10, label: '6', color: VIOLET }, { string: 5, fret: 8, label: '1' }, { string: 5, fret: 10, label: '2', color: VIOLET },
        ] },
        audio: { label: 'La position, de la grosse corde à la fine', notes: seq([48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72, 74], 0.4), tempo: 90 },
        keep: 'Une position : la main reste en place, un doigt par case ; on pense en degrés.',
      },
      {
        title: 'Cinq positions qui s\'enchaînent',
        only: 'guitare',
        paragraphs: [
          'La penta a cinq positions, qui se suivent le long du manche. Deux positions voisines se chevauchent : elles partagent une colonne de notes (en or sur le dessin).',
          'C\'est ce pont qui permet de passer de l\'une à l\'autre sans s\'arrêter, et de parcourir tout le manche avec les mêmes cinq notes.',
        ],
        illustration: { kind: 'fretboard', frets: 10, marks: [
          { string: 0, fret: 5, label: '6', color: VIOLET }, { string: 0, fret: 8, label: '1', color: GOLD }, { string: 0, fret: 10, label: '2' },
          { string: 1, fret: 5, label: '2', color: VIOLET }, { string: 1, fret: 7, label: '3', color: GOLD }, { string: 1, fret: 10, label: '5' },
          { string: 2, fret: 5, label: '5', color: VIOLET }, { string: 2, fret: 7, label: '6', color: GOLD }, { string: 2, fret: 10, label: '1' },
          { string: 3, fret: 5, label: '1', color: VIOLET }, { string: 3, fret: 7, label: '2', color: GOLD }, { string: 3, fret: 9, label: '3' },
          { string: 4, fret: 5, label: '3', color: VIOLET }, { string: 4, fret: 8, label: '5', color: GOLD }, { string: 4, fret: 10, label: '6' },
          { string: 5, fret: 5, label: '6', color: VIOLET }, { string: 5, fret: 8, label: '1', color: GOLD }, { string: 5, fret: 10, label: '2' },
        ] },
        keep: 'Deux positions voisines partagent une colonne : c\'est le pont.',
      },
      {
        title: 'La relative mineure : mêmes notes, autre maison',
        paragraphs: [
          'Joue les mêmes cinq notes, mais en partant de la et en te posant sur la : la, do, ré, mi, sol. C\'est la pentatonique mineure de la.',
          'Mêmes notes, autre maison, autre couleur : plus sombre. C\'est le son du blues et du rock, que tu retrouveras en phase 3.',
        ],
        illustration: { kind: 'keyboard', from: 57, to: 69, names: true, marks: [{ midi: 57, label: '1' }, { midi: 60, label: '♭3', color: VIOLET }, { midi: 62, label: '4', color: VIOLET }, { midi: 64, label: '5', color: VIOLET }, { midi: 67, label: '♭7', color: VIOLET }, { midi: 69, label: '1' }] },
        guitarIllustration: { kind: 'fretboard', frets: 8, marks: [
          { string: 0, fret: 5, label: '1' }, { string: 0, fret: 8, label: '♭3', color: VIOLET }, { string: 1, fret: 5, label: '4', color: VIOLET }, { string: 1, fret: 7, label: '5', color: VIOLET },
          { string: 2, fret: 5, label: '♭7', color: VIOLET }, { string: 2, fret: 7, label: '1' }, { string: 3, fret: 5, label: '♭3', color: VIOLET }, { string: 3, fret: 7, label: '4', color: VIOLET },
          { string: 4, fret: 5, label: '5', color: VIOLET }, { string: 4, fret: 8, label: '♭7', color: VIOLET }, { string: 5, fret: 5, label: '1' }, { string: 5, fret: 8, label: '♭3', color: VIOLET },
        ] },
        guitarParagraphs: [
          'Joue les mêmes cinq notes, mais en partant de la et en te posant sur la : la, do, ré, mi, sol. C\'est la pentatonique mineure de la, et sa position la plus célèbre, autour de la case 5.',
          'Mêmes notes, autre maison, autre couleur : plus sombre. C\'est le son du blues et du rock, que tu retrouveras en phase 3.',
        ],
        audio: { label: 'Les cinq notes posées sur do… puis posées sur la', notes: [...seq([60, 62, 64, 67, 69, 67, 64, 62], 0.4), { midi: 60, start: 3.2, dur: 1.4 }, ...seq([57, 60, 62, 64, 67, 64, 62, 60], 0.4, 0, 5.2), { midi: 57, start: 8.4, dur: 1.6 }], tempo: 92 },
        guitarAudio: { label: 'Les cinq notes posées sur do… puis posées sur la', notes: [...seq([48, 50, 52, 55, 57, 55, 52, 50], 0.4), { midi: 48, start: 3.2, dur: 1.4 }, ...seq([45, 48, 50, 52, 55, 52, 50, 48], 0.4, 0, 5.2), { midi: 45, start: 8.4, dur: 1.6 }], tempo: 92 },
        keep: 'Do penta majeure = la penta mineure : mêmes notes, autre tonique.',
      },
      {
        title: 'Improviser : chanter, puis jouer',
        paragraphs: [
          'Une impro commence dans la tête. Chante une petite phrase avec les notes de la penta, puis rejoue-la sur l\'instrument. Peu à peu, chante et joue en même temps : c\'est ainsi que l\'oreille apprend à guider les doigts.',
          'Pour qu\'une phrase sonne comme une réponse, finis-la sur 1. Pour qu\'elle reste ouverte, comme une question, finis-la sur 2 ou sur 5.',
        ],
        illustration: { kind: 'cards', items: [{ title: 'Question', sub: 'finit sur 2 ou 5', color: VIOLET }, { title: 'Réponse', sub: 'finit sur 1' }] },
        audio: { label: 'Une question qui finit sur 2… et sa réponse qui finit sur 1', notes: [...seq([64, 67, 69, 67], 0.5, 0.05), { midi: 62, start: 2.2, dur: 1.6 }, ...seq([64, 67, 64], 0.5, 0.05, 4.4), { midi: 60, start: 6.1, dur: 2 }], tempo: 84 },
        guitarAudio: { label: 'Une question qui finit sur 2… et sa réponse qui finit sur 1', notes: [...seq([52, 55, 57, 55], 0.5, 0.05), { midi: 50, start: 2.2, dur: 1.6 }, ...seq([52, 55, 52], 0.5, 0.05, 4.4), { midi: 48, start: 6.1, dur: 2 }], tempo: 84 },
        keep: 'Chante d\'abord, joue ensuite. Question : finir sur 2 ou 5. Réponse : sur 1.',
      },
      {
        title: 'Ce que tu sais maintenant',
        paragraphs: [
          'Tu sais d\'où vient la pentatonique, pourquoi aucune note ne crée de frottement, et qu\'elle cache une gamme mineure.',
          'Place à la pratique : l\'entendre, la jouer, l\'entendre dans ta tête, puis improviser avec elle.',
        ],
        guitarParagraphs: [
          'Tu sais d\'où vient la pentatonique, pourquoi aucune note ne crée de frottement, qu\'elle cache une gamme mineure, et comment ses positions couvrent le manche.',
          'Place à la pratique : l\'entendre, jouer et relier les positions, la trouver à l\'oreille dans la position, puis improviser.',
        ],
        illustration: { kind: 'cards', items: [{ title: '1·2·3·5·6', sub: 'sans 4 ni 7' }, { title: 'Aucun ½ ton', sub: 'rien ne frotte', color: VIOLET }, { title: 'Relative', sub: 'la mineure, mêmes notes', color: GOLD }] },
      },
    ],
    practice: [
      { domain: 'oreille', label: 'Penta ou pas ?', templateId: 'OR-2-10', params: { questions: 5, bourdon: true } },
      { domain: 'oreille', label: 'Les degrés de la penta à l\'oreille', templateId: 'OR-2-03', params: { degres: [1, 2, 3, 5, 6], questions: 6 } },
      { domain: 'technique', label: 'La penta de sol, avec le doigté', templateId: 'TE-2-09', params: { gamme: 'penta_majeure', tonalite: 'G', guide: 'complet', aller_retour: true }, only: 'piano' },
      { domain: 'technique', label: 'Une position, guidée', templateId: 'TE-2-09', params: { gamme: 'penta_majeure', position: 1, guide: 'complet', aller_retour: true }, only: 'guitare' },
      { domain: 'technique', label: 'Relier deux positions', templateId: 'TE-2-15', params: { position: 1, guide: 'complet' }, only: 'guitare' },
      { domain: 'audiation', label: 'Entends le motif dans ta tête, puis joue', templateId: 'OR-1-13', params: { degres: [1, 2, 3, 5, 6], nb_notes: 4 }, only: 'piano' },
      { domain: 'audiation', label: 'Entends le degré, trouve-le dans la position', templateId: 'TE-2-12', params: { position: 1, gamme: 'penta_majeure', degres: ['1', '2', '3', '5', '6'] }, only: 'guitare' },
      { domain: 'impro', label: 'Question-réponse sur I-IV-V', templateId: 'IM-2-03', params: { degres: [1, 2, 3, 5, 6], mesures: 2 } },
    ],
    validation: { label: 'Reconnaître la pentatonique à l\'oreille', templateId: 'OR-2-10', params: { questions: 8, bourdon: false }, criterion: '7 bonnes réponses sur 8' },
    guitarValidation: { label: 'Positions 1 et 2 reliées, de mémoire', templateId: 'TE-2-15', params: { position: 1, guide: 'aucun' }, criterion: 'la montée et la descente sans erreur' },
  },
];
