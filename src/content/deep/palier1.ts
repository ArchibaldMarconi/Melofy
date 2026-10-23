// Leçons approfondies · palier 1 (Fondations).
// Un écran = une idée, posée, illustrée ; un son seulement quand il fait entendre ce que l'écran explique.
import type { NoteEvent } from '../types';
import type { DeepLesson } from './types';

const seq = (midis: number[], dur = 1, gap = 0): NoteEvent[] => midis.map((m, i) => ({ midi: m, start: i * (dur + gap), dur: dur * 0.95 }));
const together = (midis: number[], start: number, dur: number): NoteEvent[] => midis.map((m) => ({ midi: m, start, dur }));
const clicks = (n: number, perBar: number): NoteEvent[] => Array.from({ length: n }, (_, k) => ({ midi: k % perBar === 0 ? 84 : 77, start: k, dur: 0.25 }));

export const PALIER1: DeepLesson[] = [
  // ------------------------------------------------------------------ 1
  {
    id: 'fondations', number: 1, palier: 1, conceptId: 'grave_aigu',
    title: 'Grave, aigu, tons et demi-tons',
    why: 'Tout ce qu\'on apprendra ensuite (gammes, accords, mélodies) se décrit avec deux idées simples : la hauteur d\'un son, et la distance entre deux sons.',
    discover: {
      question: 'Lequel de ces deux écarts entre deux notes est le plus petit ?',
      a: { notes: seq([60, 61], 1, 0.2), tempo: 70 }, b: { notes: seq([60, 62], 1, 0.2), tempo: 70 }, answer: 'A',
      reveal: 'A est un demi-ton : la plus petite marche de notre musique. B est un ton : deux demi-tons. À la fin de cette leçon, tu sauras les reconnaître et les jouer.',
    },
    screens: [
      {
        title: 'Un son, c\'est une vibration',
        paragraphs: [
          'Quand une corde vibre, elle fait vibrer l\'air jusqu\'à ton oreille. Si elle vibre lentement, on entend un son grave. Si elle vibre vite, on entend un son aigu.',
          'L\'éléphant barrit grave, l\'oiseau chante aigu : leurs voix ne vibrent pas à la même vitesse.',
        ],
        illustration: { kind: 'waves' },
        audio: { label: 'Un son très grave, puis un son très aigu', notes: [...seq([36], 2), ...seq([84], 2).map((n) => ({ ...n, start: 2.6 }))], tempo: 70 },
        keep: 'Grave = vibre lentement. Aigu = vibre vite.',
      },
      {
        title: 'Du plus grave au plus aigu',
        paragraphs: [
          'Les sons se rangent sur une échelle, comme les barreaux d\'une échelle de pompier : en bas les sons graves, en haut les sons aigus.',
          'Ta voix parlée se situe vers le milieu. La contrebasse produit des sons très graves, tandis que le chant d\'un oiseau est très aigu.',
        ],
        illustration: { kind: 'pitchLadder' },
        audio: { label: 'On monte l\'échelle, du grave à l\'aigu', notes: seq([36, 48, 60, 72, 84], 0.9, 0.15), tempo: 70 },
        keep: 'Monter, c\'est aller vers l\'aigu ; descendre, vers le grave.',
      },
      {
        title: 'Sur ton instrument',
        paragraphs: [
          'Au piano, le grave est à gauche et l\'aigu à droite. Plus tu vas vers la droite, plus le son monte.',
          'Chaque touche est un barreau de l\'échelle : en jouant les touches l\'une après l\'autre, tu montes ou tu descends.',
        ],
        illustration: { kind: 'keyboard', from: 48, to: 72, marks: [{ midi: 48, label: 'grave' }, { midi: 72, label: 'aigu' }] },
        guitarIllustration: { kind: 'fretboard', frets: 7, marks: [{ string: 0, fret: 0, label: '↓', color: '#8A80B0' }, { string: 5, fret: 7, label: '↑' }] },
        guitarParagraphs: [
          'Sur une guitare, la corde la plus épaisse (en bas sur le dessin) est la plus grave ; la plus fine, la plus aiguë.',
          'Sur une même corde, plus tu appuies loin du manche vers le corps de la guitare (cases de plus en plus hautes), plus la corde vibrante est courte, et plus le son monte. Le point violet est le son le plus grave du dessin, le rose le plus aigu.',
        ],
        guitarKeep: 'Grosse corde : grave. Fine corde : aigu. Et sur une corde, chaque case plus haute monte le son.',
        keep: 'Piano : à gauche le grave, à droite l\'aigu.',
      },
      {
        title: 'La plus petite marche : le demi-ton',
        paragraphs: [
          'Dans le système musical occidental, l\'octave est découpée en 12 marches égales. Chacune s\'appelle un demi-ton : c\'est la plus petite distance entre deux notes de notre musique.',
          'Au piano, un demi-ton, c\'est la touche juste à côté, noire comprise. Deux demi-tons font un ton.',
        ],
        illustration: { kind: 'keyboard', from: 60, to: 67, names: true, arcs: [{ a: 60, b: 61, label: '½' }, { a: 62, b: 64, label: 'T' }] },
        guitarIllustration: { kind: 'fretboard', frets: 5, marks: [{ string: 1, fret: 0, label: 'la' }, { string: 1, fret: 1 }, { string: 1, fret: 3 }], arcs: [{ string: 1, a: 0, b: 1, label: '½' }, { string: 1, a: 1, b: 3, label: 'T' }] },
        audio: { label: 'Un demi-ton (do → do♯), puis un ton (do → ré)', notes: [...seq([60, 61], 0.9, 0.1), ...seq([60, 62], 0.9, 0.1).map((n) => ({ ...n, start: n.start + 2.6 }))], tempo: 70 },
        guitarParagraphs: [
          'Dans le système musical occidental, l\'octave est découpée en 12 marches égales. Chacune s\'appelle un demi-ton : c\'est la plus petite distance entre deux notes de notre musique.',
          'À la guitare, un demi-ton, c\'est une case : de la corde de la à vide (case 0) à la case 1. Deux cases font un ton : de la case 1 à la case 3.',
        ],
        guitarAudio: { label: 'Corde de la : case 0 → 1 (demi-ton), puis case 1 → 3 (ton)', notes: [...seq([45, 46], 0.9, 0.1), ...seq([46, 48], 0.9, 0.1).map((n) => ({ ...n, start: n.start + 2.6 }))], tempo: 70 },
        guitarKeep: 'Une case = un demi-ton. Deux cases = un ton.',
        keep: 'Demi-ton = la touche voisine, noire comprise. Ton = deux demi-tons.',
      },
      {
        title: 'Les deux demi-tons cachés',
        paragraphs: [
          'Entre deux touches blanches voisines, il y a presque toujours une touche noire : c\'est donc un ton.',
          'Sauf à deux endroits : entre mi et fa, et entre si et do. Il n\'y a pas de touche noire entre elles, parce qu\'elles ne sont qu\'à un demi-ton.',
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, arcs: [{ a: 64, b: 65, label: '½' }, { a: 71, b: 72, label: '½' }, { a: 65, b: 67, label: 'T', color: '#8A80B0' }] },
        guitarIllustration: { kind: 'fretboard', frets: 5, marks: [{ string: 0, fret: 0, label: 'mi' }, { string: 0, fret: 1, label: 'fa' }, { string: 0, fret: 3, label: 'sol' }], arcs: [{ string: 0, a: 0, b: 1, label: '½' }, { string: 0, a: 1, b: 3, label: 'T' }] },
        audio: { label: 'mi → fa (demi-ton), puis fa → sol (ton)', notes: [...seq([64, 65], 0.9, 0.1), ...seq([65, 67], 0.9, 0.1).map((n) => ({ ...n, start: n.start + 2.6 }))], tempo: 70 },
        guitarParagraphs: [
          'Entre deux notes sans altération (do, ré, mi, fa, sol, la, si), il y a presque toujours un ton : deux cases.',
          'Sauf à deux endroits : de mi à fa, et de si à do, il n\'y a qu\'un demi-ton, une seule case. Sur la grosse corde de mi : mi à vide, fa à la case 1, puis sol deux cases plus loin, à la case 3.',
        ],
        guitarAudio: { label: 'Corde de mi : mi → fa (une case), puis fa → sol (deux cases)', notes: [...seq([40, 41], 0.9, 0.1), ...seq([41, 43], 0.9, 0.1).map((n) => ({ ...n, start: n.start + 2.6 }))], tempo: 70 },
        guitarKeep: 'mi-fa et si-do : une seule case. Entre les autres notes voisines : deux cases.',
        keep: 'Les deux seuls demi-tons entre touches blanches voisines : mi-fa et si-do.',
      },
      {
        title: 'Ce que tu sais maintenant',
        paragraphs: [
          'Tu sais dire si un son est grave ou aigu, et le trouver sur ton instrument. Tu connais la plus petite marche de notre musique, le demi-ton, et sa grande sœur, le ton.',
          'Ces deux mesures suffisent pour construire toutes les gammes : c\'est l\'objet de la leçon suivante.',
        ],
        illustration: { kind: 'cards', items: [{ title: 'Grave / aigu', sub: 'la hauteur d\'un son' }, { title: 'Demi-ton', sub: 'la marche voisine' }, { title: 'Ton', sub: 'deux demi-tons' }] },
      },
    ],
    practice: [
      { domain: 'oreille', label: 'Ça monte ou ça descend ?', templateId: 'OR-1-01', params: { questions: 5 } },
      { domain: 'oreille', label: 'Ton ou demi-ton, à l\'oreille', templateId: 'OR-1-15', params: { questions: 6, sens: 'montant' } },
      { domain: 'theorie', label: 'La règle de mi-fa et si-do', templateId: 'TH-1-09', params: { questions: 6 } },
      { domain: 'technique', label: 'Un ton, un demi-ton sur l\'instrument', templateId: 'TE-1-09', params: { nb_cibles: 2, dessous: false } },
      { domain: 'chant', label: 'Chante un demi-ton, puis un ton', templateId: 'OR-1-20', params: { intervalles: [1, 2] } },
    ],
    validation: { label: 'Ton ou demi-ton, montants et descendants', templateId: 'OR-1-15', params: { questions: 10, sens: 'les_deux' }, criterion: '8 bonnes réponses sur 10' },
  },
  // ------------------------------------------------------------------ 2
  {
    id: 'gamme_majeure', number: 2, palier: 1, conceptId: 'gamme_do',
    title: 'La gamme majeure et sa structure',
    why: 'La gamme majeure est le réservoir de notes de la plupart des chansons. Comprendre comment elle est construite permet de la retrouver à partir de n\'importe quelle note.',
    discover: {
      question: 'Laquelle de ces deux gammes est la gamme de do majeur ?',
      a: { notes: seq([60, 62, 64, 65, 67, 69, 71, 72], 0.5), tempo: 100 }, b: { notes: seq([60, 62, 63, 65, 67, 69, 71, 72], 0.5), tempo: 100 }, answer: 'A',
      reveal: 'A est la gamme de do majeur, lumineuse. Dans B, une seule note a changé (le mi est descendu d\'un demi-ton) et toute la couleur devient plus sombre. Une gamme, c\'est un ordre de marches bien précis.',
    },
    screens: [
      {
        title: 'Les sept notes',
        paragraphs: [
          'La gamme de do majeur contient sept notes : do, ré, mi, fa, sol, la, si. Puis le do revient, plus aigu, et tout recommence.',
          'Au piano, ce sont toutes les touches blanches, à partir d\'un do.',
        ],
        guitarParagraphs: [
          'La gamme de do majeur contient sept notes : do, ré, mi, fa, sol, la, si. Puis le do revient, plus aigu, et tout recommence.',
          'À la guitare, voici une façon de la jouer, dans les premières cases : do sur la corde de la (case 3), puis les cordes de ré, de sol et de si.',
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [60, 62, 64, 65, 67, 69, 71, 72].map((m) => ({ midi: m })) },
        guitarIllustration: { kind: 'fretboard', frets: 5, marks: [{ string: 1, fret: 3, label: 'do' }, { string: 2, fret: 0, label: 'ré' }, { string: 2, fret: 2, label: 'mi' }, { string: 2, fret: 3, label: 'fa' }, { string: 3, fret: 0, label: 'sol' }, { string: 3, fret: 2, label: 'la' }, { string: 4, fret: 0, label: 'si' }, { string: 4, fret: 1, label: 'do' }] },
        audio: { label: 'do ré mi fa sol la si do', notes: seq([60, 62, 64, 65, 67, 69, 71, 72], 0.6), tempo: 90 },
        keep: 'do ré mi fa sol la si, puis do.',
      },
      {
        title: 'Pourquoi le do revient',
        paragraphs: [
          'Le do aigu vibre exactement deux fois plus vite que le do grave. Les deux se ressemblent tellement qu\'on leur donne le même nom.',
          'Cette distance s\'appelle l\'octave. Joués ensemble, les deux do se fondent presque en un seul son.',
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 60, label: 'do' }, { midi: 72, label: 'do' }], arcs: [{ a: 60, b: 72, label: 'octave' }] },
        audio: { label: 'do, do aigu, puis les deux ensemble', notes: [...seq([60, 72], 1, 0.2), ...together([60, 72], 2.6, 1.8)], tempo: 70 },
        keep: 'L\'octave : la même note, plus aiguë.',
      },
      {
        title: 'Des marches inégales',
        paragraphs: [
          'Monter la gamme, c\'est monter un escalier dont les marches n\'ont pas toutes la même hauteur.',
          'Il y a cinq grandes marches (des tons) et deux petites (des demi-tons). Les petites sont entre mi et fa, et entre si et do : ce sont justement les deux demi-tons cachés de la leçon 1.',
        ],
        illustration: { kind: 'steps', notes: ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si', 'do'], steps: ['T', 'T', '½', 'T', 'T', 'T', '½'] },
        keep: 'Cinq tons, deux demi-tons.',
      },
      {
        title: 'La formule de la gamme majeure',
        paragraphs: [
          'Dans l\'ordre, les marches sont : ton, ton, demi-ton, ton, ton, ton, demi-ton.',
          'Cette suite est l\'identité de la gamme majeure. Elle ne dépend pas de la note de départ : n\'importe quelle note, suivie de cette formule, donne une gamme majeure.',
        ],
        illustration: { kind: 'cards', items: [{ title: 'T T ½', sub: 'do ré mi fa' }, { title: 'T T T ½', sub: 'fa sol la si do' }] },
        keep: 'T T ½ — T T T ½.',
      },
      {
        title: 'Et si on part de sol ?',
        paragraphs: [
          'Partons de sol et appliquons la formule. Tout va bien jusqu\'à mi. Mais entre la 6e et la 7e note, il faut un ton : après mi, la 7e note n\'est pas fa, elle est un demi-ton plus haut, fa♯.',
          'Voilà pourquoi la gamme de sol majeur a un fa♯ : c\'est la formule qui l\'impose.',
        ],
        illustration: { kind: 'keyboard', from: 67, to: 79, names: true, marks: [...[67, 69, 71, 72, 74, 76, 79].map((m) => ({ midi: m } as { midi: number; label?: string; color?: string })), { midi: 78, label: 'fa♯', color: '#E0457B' }] },
        guitarIllustration: { kind: 'steps', notes: ['sol', 'la', 'si', 'do', 'ré', 'mi', 'fa♯', 'sol'], steps: ['T', 'T', '½', 'T', 'T', 'T', '½'] },
        audio: { label: 'La gamme de sol majeur, avec son fa♯', notes: seq([55, 57, 59, 60, 62, 64, 66, 67], 0.6), tempo: 90 },
        keep: 'Une gamme majeure sur une autre note = la même formule ; les ♯ et les ♭ apparaissent d\'eux-mêmes.',
      },
      {
        title: 'La sensible, la note qui tire vers la maison',
        paragraphs: [
          'La 7e note de la gamme n\'est qu\'à un demi-ton de la tonique. Elle en est si proche qu\'elle donne envie d\'y arriver : on l\'appelle la sensible.',
          'Écoute la gamme s\'arrêter sur si : on attend le do. C\'est cette attraction qui rend la gamme majeure si claire et si « finie ».',
        ],
        illustration: { kind: 'keyboard', from: 67, to: 72, names: true, marks: [{ midi: 71, label: '7' }, { midi: 72, label: '1' }], arcs: [{ a: 71, b: 72, label: '½' }] },
        audio: { label: 'La gamme s\'arrête sur si… puis se pose sur do', notes: [...seq([60, 62, 64, 65, 67, 69, 71], 0.6), { midi: 72, start: 5.4, dur: 1.6 }], tempo: 90 },
        keep: 'Le 7 tire vers le 1 : c\'est la sensible.',
      },
    ],
    practice: [
      { domain: 'oreille', label: 'La gamme est-elle juste ?', templateId: 'OR-1-16', params: { questions: 5 } },
      { domain: 'theorie', label: 'Notes et structure de la gamme', templateId: 'TH-1-08', params: { questions: 6, niveau_q: 1 } },
      { domain: 'technique', label: 'Joue la gamme de do', templateId: 'TE-1-07' },
      { domain: 'oreille', label: 'Nomme les notes de la gamme à l\'oreille', templateId: 'OR-1-09' },
    ],
    validation: { label: 'La gamme majeure : notes, demi-tons, sol et fa majeur', templateId: 'TH-1-08', params: { questions: 8, niveau_q: 2 }, criterion: '6 bonnes réponses sur 8' },
  },
  // ------------------------------------------------------------------ 3
  {
    id: 'degres', number: 3, palier: 1, conceptId: 'degres_1_3',
    title: 'Les degrés, la tonique et les tendances',
    why: 'Entendre chaque note par rapport à la maison, c\'est le cœur de l\'oreille musicale : c\'est ce qui permet de reconnaître une mélodie, de la chanter et de la retrouver sur l\'instrument.',
    discover: {
      question: 'Laquelle de ces deux phrases se termine vraiment ?',
      a: { notes: seq([60, 62, 64, 62, 60], 0.8), tempo: 80 }, b: { notes: seq([60, 62, 64, 62], 0.8), tempo: 80 }, answer: 'A',
      reveal: 'A se pose sur do, la note maison : c\'est fini. B s\'arrête sur ré, une note qui attend la suite. Tu entends déjà les degrés, sans le savoir.',
    },
    screens: [
      {
        title: 'La maison : la tonique',
        paragraphs: [
          'Dans une mélodie, une note joue le rôle de la maison : on part d\'elle, on s\'en éloigne, puis on y revient. On l\'appelle la tonique.',
          'Quand une mélodie se termine sur la tonique, elle sonne finie. C\'est une sensation, avant d\'être une règle.',
        ],
        illustration: { kind: 'staff', notes: [60, 64, 67, 65, 64, 62, 60].map((m, i) => ({ midi: m, label: ['1', '3', '5', '4', '3', '2', '1'][i], color: i === 0 || i === 6 ? '#1E9E6A' : undefined })) },
        audio: { label: 'Une phrase qui part de do, s\'éloigne, et revient à do', notes: seq([60, 64, 67, 65, 64, 62, 60], 0.7), tempo: 90 },
        keep: 'La tonique, c\'est la maison.',
      },
      {
        title: 'Numéroter les notes depuis la maison',
        paragraphs: [
          'On donne à chaque note de la gamme un numéro, compté depuis la tonique : la tonique est 1, la suivante 2, puis 3, et ainsi de suite jusqu\'à 7. Ce sont les degrés.',
          'En do majeur, do est 1 et mi est 3. En sol majeur, sol est 1 et si est 3. Les noms changent, les numéros restent : « 1-2-3 » se joue pareil dans toutes les tonalités.',
        ],
        illustration: { kind: 'cards', items: [{ title: 'En do', sub: 'do = 1 · ré = 2 · mi = 3' }, { title: 'En sol', sub: 'sol = 1 · la = 2 · si = 3' }] },
        keep: 'Les degrés racontent une mélodie dans n\'importe quelle tonalité.',
      },
      {
        title: 'Stables et instables',
        paragraphs: [
          'Certains degrés sont stables : 1, 3 et 5. Ce sont les notes de l\'accord de la maison ; on peut s\'arrêter dessus.',
          'Les autres, 2, 4, 6 et 7, sont instables : si la musique s\'arrête sur eux, on reste suspendu, on attend la suite.',
        ],
        illustration: { kind: 'ladder', degrees: [{ d: '7', name: 'si', stable: false }, { d: '6', name: 'la', stable: false }, { d: '5', name: 'sol', stable: true }, { d: '4', name: 'fa', stable: false }, { d: '3', name: 'mi', stable: true }, { d: '2', name: 'ré', stable: false }, { d: '1', name: 'do', stable: true }] },
        audio: { label: 'L\'accord de la maison (1-3-5), puis le 7 tout seul… et le 1', notes: [...together([60, 64, 67], 0, 1.6), { midi: 71, start: 2.2, dur: 1.6 }, { midi: 72, start: 4.2, dur: 1.6 }], tempo: 70 },
        keep: '1, 3, 5 : on se pose. 2, 4, 6, 7 : on attend.',
      },
      {
        title: 'Où la musique veut aller',
        paragraphs: [
          'Chaque note instable tire vers une voisine stable : 7 monte vers 1, 2 descend vers 1, 4 descend vers 3, 6 descend vers 5.',
          'Ces attractions sont la force invisible des mélodies. Les entendre, c\'est entendre la tonalité de l\'intérieur.',
        ],
        illustration: { kind: 'ladder', degrees: [{ d: '7', name: 'si', stable: false, to: '1' }, { d: '6', name: 'la', stable: false, to: '5' }, { d: '4', name: 'fa', stable: false, to: '3' }, { d: '2', name: 'ré', stable: false, to: '1' }] },
        audio: { label: '4 → 3, puis 2 → 1', notes: [...seq([65, 64], 0.9, 0.1), ...seq([62, 60], 0.9, 0.1).map((n) => ({ ...n, start: n.start + 2.6 }))], tempo: 70 },
        keep: '7 → 1 · 2 → 1 · 4 → 3 · 6 → 5.',
      },
      {
        title: 'Écouter en degrés',
        paragraphs: [
          'Pour reconnaître un degré, garde toujours la tonique dans ta tête. Puis demande-toi : stable ou instable ? Et si tu hésites, chante la gamme en redescendant jusqu\'à la tonique, en comptant les marches.',
          'C\'est un réflexe qui s\'installe en quelques semaines de pratique, un peu chaque jour.',
        ],
        illustration: { kind: 'cards', items: [{ title: '1. La maison', sub: 'garde la tonique en tête' }, { title: '2. La sensation', sub: 'stable ou instable ?' }, { title: '3. Compter', sub: 'redescends jusqu\'à 1' }] },
        keep: 'Tonique en tête, sensation, puis compter si besoin.',
      },
    ],
    practice: [
      { domain: 'oreille', label: 'Stable ou instable ?', templateId: 'OR-1-17', params: { questions: 6, degres: [1, 2, 3, 4, 5] } },
      { domain: 'oreille', label: 'Quel degré ?', templateId: 'OR-1-06', params: { questions: 6, degres: [1, 2, 3] } },
      { domain: 'audiation', label: 'Où va la phrase ?', templateId: 'OR-2-14', params: { tensions: [7, 2] } },
      { domain: 'chant', label: 'Chante la résolution', templateId: 'OR-1-18', params: { tensions: [2, 7] } },
      { domain: 'technique', label: 'Trouve la fonction sur l\'instrument', templateId: 'TE-1-08' },
    ],
    validation: { label: 'Reconnaître les degrés 1 à 5 après la cadence', templateId: 'OR-1-06', params: { questions: 10, degres: [1, 2, 3, 4, 5] }, criterion: '8 bonnes réponses sur 10' },
  },
  // ------------------------------------------------------------------ 4
  {
    id: 'mesure', number: 4, palier: 1, conceptId: 'pulsation',
    title: 'La mesure et la subdivision',
    why: 'Sans pulsation intérieure, on devine les rythmes au lieu de les jouer. Sentir les temps forts et partager chaque temps rend tous les rythmes lisibles.',
    discover: {
      question: 'Lequel de ces deux rythmes est une valse ?',
      a: { notes: clicks(9, 3), tempo: 120 }, b: { notes: clicks(8, 4), tempo: 120 }, answer: 'A',
      reveal: 'A appuie un temps sur trois : « UN deux trois », c\'est la valse. B appuie un temps sur quatre : c\'est la marche de la pop et du rock.',
    },
    screens: [
      {
        title: 'La pulsation, le cœur de la musique',
        paragraphs: [
          'Sous presque toute musique bat une pulsation régulière, comme un cœur ou comme des pas. C\'est elle qu\'on suit quand on tape du pied.',
          'Chaque battement s\'appelle un temps. Les temps sont tous de la même durée.',
        ],
        illustration: { kind: 'pulseGrid', perBar: 4, bars: 2, subdiv: 1, plain: true },
        audio: { label: 'Une pulsation régulière', notes: clicks(8, 4).map((n) => ({ ...n, midi: 77 })), tempo: 90 },
        keep: 'Le temps : le battement régulier de la musique.',
      },
      {
        title: 'Les temps forts : la mesure',
        paragraphs: [
          'Les temps se regroupent par paquets : c\'est la mesure. Le premier temps de chaque mesure est plus appuyé, c\'est le temps fort.',
          'Par 4, on marche (pop, rock). Par 3, on valse. Par 2, on court (polka, marche militaire).',
        ],
        illustration: { kind: 'pulseGrid', perBar: 3, bars: 2, subdiv: 1 },
        audio: { label: 'Une mesure à 3 temps : UN deux trois', notes: clicks(9, 3), tempo: 110 },
        keep: 'Le 1er temps de chaque mesure est le temps fort.',
      },
      {
        title: 'Partager le temps en deux',
        paragraphs: [
          'Un temps peut se partager en deux moitiés égales : ce sont les croches. On compte « 1-et 2-et 3-et 4-et ».',
          'Le « et » tombe exactement au milieu, quand ton pied remonte.',
        ],
        illustration: { kind: 'pulseGrid', perBar: 4, bars: 1, subdiv: 2 },
        audio: { label: 'La pulsation, et les croches par-dessus', notes: [...clicks(4, 4).map((n) => ({ ...n, midi: 60 })), ...Array.from({ length: 8 }, (_, k) => ({ midi: 79, start: k / 2, dur: 0.2 }))], tempo: 80 },
        keep: 'Binaire : « 1-et ».',
      },
      {
        title: 'Partager en trois, ou en quatre',
        paragraphs: [
          'On peut aussi partager le temps en trois : « 1-tri-o 2-tri-o ». C\'est le ternaire, le balancement du blues et des berceuses.',
          'Ou en quatre : « 1-e-et-a », les doubles croches du funk. Dans tous les cas, le temps garde la même durée : on le découpe seulement plus finement.',
        ],
        illustration: { kind: 'pulseGrid', perBar: 2, bars: 1, subdiv: 3 },
        audio: { label: 'Le temps partagé en trois', notes: [...clicks(4, 2).map((n) => ({ ...n, midi: 60 })), ...Array.from({ length: 12 }, (_, k) => ({ midi: 79, start: k / 3, dur: 0.15 }))], tempo: 76 },
        keep: 'Ternaire : « 1-tri-o ». Le temps ne change pas, seul son découpage change.',
      },
      {
        title: 'Le chiffrage',
        paragraphs: [
          'Au début d\'une partition, deux chiffres l\'un sur l\'autre indiquent la mesure. Celui du haut dit combien de temps il y a dans chaque mesure ; le 4 du bas dit que le temps vaut une noire.',
          '4/4 : quatre temps, la marche. 3/4 : trois temps, la valse. 2/4 : deux temps.',
        ],
        illustration: { kind: 'cards', items: [{ title: '4/4', sub: 'pop, rock, marche' }, { title: '3/4', sub: 'valse' }, { title: '2/4', sub: 'polka, marche rapide' }] },
        keep: 'Le chiffre du haut : le nombre de temps par mesure.',
      },
    ],
    practice: [
      { domain: 'rythme', label: 'Tape seulement le temps fort', templateId: 'RY-1-06', params: { mesure: 4, mesures: 4, tempo: 80 } },
      { domain: 'rythme', label: 'Combien de temps par mesure ?', templateId: 'RY-1-10', params: { questions: 5, mesures_possibles: [2, 3, 4] } },
      { domain: 'oreille', label: 'Binaire ou ternaire ?', templateId: 'RY-1-07', params: { questions: 5 } },
      { domain: 'rythme', label: 'Lis un rythme en comptant', templateId: 'RY-1-03' },
    ],
    validation: { label: 'Lis et tape 2 mesures à 3 temps', templateId: 'RY-1-03', params: { mesure: 3, mesures: 2, tempo: 80, figures: ['noire', 'noire', 'blanche', 'soupir'] }, criterion: 'les 2 mesures en place' },
  },
  // ------------------------------------------------------------------ 5
  {
    id: 'portee', number: 5, palier: 1, conceptId: 'lecture_portee',
    title: 'Lire la portée',
    why: 'Lire vite ne veut pas dire compter les lignes depuis le bas à chaque note : on lit à partir de quelques repères, comme on reconnaît un visage.',
    screens: [
      {
        title: 'Cinq lignes pour dessiner la hauteur',
        paragraphs: [
          'La portée, ce sont cinq lignes. Plus une note est placée haut sur la portée, plus elle est aiguë.',
          'Lire une mélodie, c\'est donc voir sa forme : elle monte, elle descend, elle saute.',
        ],
        illustration: { kind: 'staff', notes: [60, 62, 64, 65, 67, 69, 71, 72].map((m, i) => ({ midi: m, label: ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si', 'do'][i] })) },
        audio: { label: 'Ce que tu vois monter, tu l\'entends monter', notes: seq([60, 62, 64, 65, 67, 69, 71, 72], 0.6), tempo: 90 },
        keep: 'Plus haut sur la portée = plus aigu.',
      },
      {
        title: 'Lignes et interlignes',
        paragraphs: [
          'Une note peut être posée sur une ligne, ou dans l\'espace entre deux lignes (un interligne). En montant d\'une note, on passe toujours d\'une ligne à un interligne, puis à une ligne.',
          'Les notes qui dépassent la portée s\'écrivent sur de petites lignes ajoutées.',
        ],
        illustration: { kind: 'staff', notes: [{ midi: 64, label: 'ligne' }, { midi: 65, label: 'interl.' }, { midi: 67, label: 'ligne' }, { midi: 69, label: 'interl.' }, { midi: 71, label: 'ligne' }] },
        keep: 'Ligne, interligne, ligne : une note à chaque cran.',
      },
      {
        title: 'Trois repères',
        paragraphs: [
          'En clé de sol, retiens trois notes repères. Le sol, sur la 2e ligne : c\'est autour d\'elle que s\'enroule la clé. Le do du milieu, sur une petite ligne sous la portée. Et le do aigu, dans le 3e interligne.',
          'Avec ces trois repères, aucune note n\'est à plus de deux crans d\'un repère.',
        ],
        illustration: { kind: 'staff', landmarks: true, notes: [{ midi: 60, label: 'do', color: '#E0457B' }, { midi: 67, label: 'sol', color: '#E0457B' }, { midi: 72, label: 'do', color: '#E0457B' }] },
        keep: 'Repères : sol (2e ligne), do du milieu (sous la portée), do aigu (3e interligne).',
      },
      {
        title: 'Compter depuis le repère le plus proche',
        paragraphs: [
          'Une note juste au-dessus du sol ? C\'est la. Deux crans au-dessus ? Si. Juste en dessous du do aigu ? Si aussi.',
          'Au début, tu comptes. Très vite, tu reconnaîtras les notes d\'un coup d\'œil, comme des mots.',
        ],
        illustration: { kind: 'staff', notes: [{ midi: 67, label: 'sol', color: '#E0457B' }, { midi: 69, label: '+1 la' }, { midi: 71, label: '+2 si' }, { midi: 72, label: 'do', color: '#E0457B' }] },
        keep: 'Repère, puis un ou deux crans.',
      },
      {
        title: 'Et sur ton instrument',
        paragraphs: [
          'Au piano, on joue exactement la hauteur écrite : le do sous la portée est le do du milieu du clavier, souvent juste devant la serrure ou le logo.',
          'Les notes plus hautes sur la portée sont à droite de ce do, les plus basses à gauche.',
        ],
        guitarParagraphs: [
          'À la guitare, par convention, on écrit une octave plus haut que le son réel : la guitare sonne une octave plus grave que ce qui est écrit. C\'est normal, et ça ne change rien aux noms des notes.',
          'Le do écrit sous la portée se joue sur la corde de la, case 3. Le do du 3e interligne, une octave au-dessus, sur la corde de si, case 1.',
        ],
        illustration: { kind: 'keyboard', from: 55, to: 67, names: true, marks: [{ midi: 60, label: 'do' }] },
        guitarIllustration: { kind: 'fretboard', frets: 5, marks: [{ string: 1, fret: 3, label: 'do' }, { string: 4, fret: 1, label: 'do' }] },
        keep: 'Au piano, on joue exactement ce qui est écrit.',
        guitarKeep: 'Même nom de note, une octave plus bas que l\'écrit.',
      },
    ],
    practice: [
      { domain: 'lecture', label: 'Nomme la note, depuis le repère', templateId: 'TH-1-03', params: { questions: 6 } },
      { domain: 'technique', label: 'Joue ce que tu lis', templateId: 'TE-1-06' },
      { domain: 'lecture', label: 'Écris les notes sur la portée', templateId: 'TH-1-06' },
    ],
    validation: { label: 'Lis 10 notes', templateId: 'TH-1-03', params: { questions: 10 }, criterion: '9 bonnes réponses sur 10' },
  },
];
