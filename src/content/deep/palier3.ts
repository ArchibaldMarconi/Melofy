// Leçons approfondies du palier 3 (couleurs) : 6 intervalles (placée en phase 2 depuis 0.24.0), 10 les trois mineurs, 11 les accords de la gamme, R1 syncopes.
import type { NoteEvent } from '../types';
import type { DeepLesson } from './types';

const seq = (midis: number[], dur = 1, gap = 0, at = 0): NoteEvent[] => midis.map((m, i) => ({ midi: m, start: at + i * (dur + gap), dur: dur * 0.95 }));
const together = (midis: number[], start: number, dur: number): NoteEvent[] => midis.map((m) => ({ midi: m, start, dur }));
const chords = (list: number[][], beats = 1.8, at = 0): NoteEvent[] => list.flatMap((c, i) => together(c, at + i * beats, beats * 0.92));
/** clic aigu sur les temps marqués, plus grave sur les autres */
const clicks = (n: number, strong: (k: number) => boolean, at = 0): NoteEvent[] => Array.from({ length: n }, (_, k) => ({ midi: strong(k) ? 84 : 77, start: at + k, dur: 0.2 }));
/** une note de percussion (rythme joué sur une seule hauteur) */
const hits = (starts: number[], durs: number[], midi = 72): NoteEvent[] => starts.map((s, i) => ({ midi, start: s, dur: durs[i] * 0.9 }));

const VIOLET = '#8A80B0';
const GOLD = '#D9A21B';

export const PALIER3: DeepLesson[] = [
  // ------------------------------------------------------------------ 9
  {
    id: 'intervalles', number: 6, palier: 2, conceptId: 'intervalles_tous',
    title: "Les intervalles : nom, qualité, renversement",
    why: "Un intervalle, c'est la distance entre deux notes. Le nommer sans hésiter sert à construire accords et gammes ; le reconnaître à l'oreille sert à chanter juste et à rejouer ce qu'on entend.",
    discover: {
      question: "Lequel de ces deux intervalles sonne le plus ouvert, le plus calme ?",
      a: { notes: [...together([60, 67], 0, 2)], tempo: 70 }, b: { notes: [...together([60, 62], 0, 2)], tempo: 70 }, answer: 'A',
      reveal: "A est une quinte : deux notes qui se fondent, ouvertes et calmes. B est une seconde : deux notes voisines qui frottent. Chaque intervalle a son caractère ; cette leçon apprend à les nommer, à les mesurer et à les entendre.",
    },
    screens: [
      {
        title: "La distance entre deux notes",
        paragraphs: [
          "Un intervalle mesure l'écart entre deux notes. Joués l'un après l'autre, on parle d'intervalle mélodique, montant ou descendant ; joués ensemble, d'intervalle harmonique.",
          "Écoute do puis sol, puis les deux ensemble : c'est le même intervalle, une quinte, entendu de deux façons. Attention : une quinte descendante (sol → do grave) ne sonne pas comme une quinte montante ; l'oreille apprend les deux sens séparément.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 67, names: true, marks: [{ midi: 60, label: 'do' }, { midi: 67, label: 'sol' }] },
        guitarIllustration: { kind: 'fretboard', frets: 6, marks: [{ string: 1, fret: 3, label: 'do' }, { string: 2, fret: 5, label: 'sol' }] },
        guitarParagraphs: [
          "Un intervalle mesure l'écart entre deux notes. Joués l'un après l'autre, on parle d'intervalle mélodique ; joués ensemble, d'intervalle harmonique.",
          "Do (corde de la, case 3) et sol (corde de ré, case 5) : c'est la forme de l'accord de puissance des guitaristes, une quinte. Écoute-la mélodique, puis harmonique.",
        ],
        audio: { label: "do, puis sol, puis les deux ensemble", notes: [...seq([60, 67], 0.9, 0.1), ...together([60, 67], 2.4, 2)], tempo: 70 },
        guitarAudio: { label: "do, puis sol, puis les deux ensemble", notes: [...seq([48, 55], 0.9, 0.1), ...together([48, 55], 2.4, 2)], tempo: 70 },
        keep: "Mélodique : l'une après l'autre. Harmonique : ensemble.",
      },
      {
        title: "Le nom compte les notes",
        paragraphs: [
          "Pour nommer un intervalle, compte les notes de la gamme de la première à la dernière, en comptant celle de départ. De do à mi : do, ré, mi, trois notes, c'est une tierce. De do à sol : cinq notes, une quinte.",
          "Seconde, tierce, quarte, quinte, sixte, septième, octave : le nom ne dépend que des lettres, pas des dièses ni des bémols.",
        ],
        illustration: { kind: 'staff', notes: [{ midi: 60, label: '1', color: '#E0457B' }, { midi: 62, label: '2' }, { midi: 64, label: '3', color: '#E0457B' }, { midi: 65, label: '4' }, { midi: 67, label: '5', color: VIOLET }] },
        audio: { label: "do ré mi : une tierce ; … fa sol : une quinte", notes: [...seq([60, 62, 64], 0.6), ...seq([60, 62, 64, 65, 67], 0.6, 0, 2.4)], tempo: 90 },
        keep: "Le nom = le nombre de notes, celle de départ comprise.",
      },
      {
        title: "La qualité compte les demi-tons",
        paragraphs: [
          "Deux tierces n'ont pas toujours la même taille. Do-mi fait 4 demi-tons : tierce majeure. Ré-fa n'en fait que 3 : tierce mineure. Même nom, taille différente.",
          "La qualité (majeure, mineure, juste…) précise cette taille exacte, en demi-tons.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'do – mi', sub: '4 demi-tons · tierce majeure' }, { title: 'ré – fa', sub: '3 demi-tons · tierce mineure', color: VIOLET }] },
        guitarIllustration: { kind: 'fretboard', frets: 8, marks: [{ string: 1, fret: 3, label: 'do' }, { string: 1, fret: 7, label: 'mi' }, { string: 2, fret: 0, label: 'ré', color: VIOLET }, { string: 2, fret: 3, label: 'fa', color: VIOLET }], arcs: [{ string: 1, a: 3, b: 7, label: '4 cases' }, { string: 2, a: 0, b: 3, label: '3 cases', color: VIOLET }] },
        guitarParagraphs: [
          "Deux tierces n'ont pas toujours la même taille. Do-mi fait 4 cases sur la même corde : tierce majeure. Ré-fa n'en fait que 3 : tierce mineure. Même nom, taille différente.",
          "La qualité (majeure, mineure, juste…) précise cette taille exacte, en demi-tons, donc en cases.",
        ],
        audio: { label: "do-mi (majeure), puis ré-fa (mineure)", notes: [...together([60, 64], 0, 1.6), ...together([62, 65], 2.2, 1.6)], tempo: 70 },
        guitarAudio: { label: "do-mi (majeure), puis ré-fa (mineure)", notes: [...together([48, 52], 0, 1.6), ...together([50, 53], 2.2, 1.6)], tempo: 70 },
        keep: "Même nom, plusieurs tailles : la qualité compte les demi-tons.",
      },
      {
        title: "Majeurs, mineurs ou justes",
        paragraphs: [
          "Secondes, tierces, sixtes et septièmes existent en deux tailles : majeure (la grande) et mineure (un demi-ton de moins). Quartes, quintes et octaves n'en ont qu'une naturelle : on les dit justes.",
          "Entre la quarte et la quinte, l'intervalle de 6 demi-tons a un nom à lui : le triton (quarte augmentée ou quinte diminuée).",
        ],
        illustration: { kind: 'cards', items: [{ title: '2 · 3 · 6 · 7', sub: 'majeure ou mineure' }, { title: '4 · 5 · 8', sub: 'juste', color: VIOLET }, { title: '6 demi-tons', sub: 'le triton', color: GOLD }] },
        audio: { label: "Quarte juste, triton, quinte juste", notes: [...together([60, 65], 0, 1.4), ...together([60, 66], 2, 1.4), ...together([60, 67], 4, 1.4)], tempo: 80 },
        keep: "2, 3, 6, 7 : majeures ou mineures. 4, 5, 8 : justes. 6 demi-tons : triton.",
      },
      {
        title: "Quatre familles pour l'oreille",
        paragraphs: [
          "Plutôt que d'apprendre douze sons isolés, classe d'abord par famille. Ouverts et calmes : quinte, quarte, octave. Doux : tierces et sixtes. Frottants : secondes et septièmes. Instable : le triton.",
          "Puis choisis dans la famille. Écoute une quinte, une sixte, une septième et un triton : quatre caractères bien différents.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Ouverts', sub: 'quinte, quarte, octave' }, { title: 'Doux', sub: 'tierces, sixtes', color: VIOLET }, { title: 'Frottants', sub: 'secondes, septièmes', color: GOLD }, { title: 'Instable', sub: 'le triton' }] },
        audio: { label: "Quinte, sixte majeure, septième mineure, triton", notes: [...together([60, 67], 0, 1.4), ...together([60, 69], 2, 1.4), ...together([60, 70], 4, 1.4), ...together([60, 66], 6, 1.4)], tempo: 80 },
        keep: "Famille d'abord (ouvert, doux, frottant, instable), puis l'intervalle exact.",
      },
      {
        title: "Renverser un intervalle",
        paragraphs: [
          "Renverser, c'est passer la note du bas à l'octave au-dessus. La tierce do-mi devient la sixte mi-do. Un intervalle et son renversement ont toujours des numéros dont la somme fait 9 : une tierce devient une sixte (3 + 6 = 9), une quarte une quinte (4 + 5), une seconde une septième (2 + 7). Leurs demi-tons, eux, font 12 à eux deux.",
          "Majeur devient mineur et inversement ; juste reste juste. Une sixte mineure, c'est donc une tierce majeure retournée.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'tierce ↔ sixte', sub: 'majeure ↔ mineure' }, { title: 'quarte ↔ quinte', sub: 'juste ↔ juste', color: VIOLET }, { title: 'seconde ↔ septième', sub: 'mineure ↔ majeure', color: GOLD }] },
        audio: { label: "do → mi (tierce majeure), puis mi → do (sixte mineure)", notes: [...seq([60, 64], 0.9, 0.1), ...seq([64, 72], 0.9, 0.1, 2.6)], tempo: 70 },
        keep: "Renverser : les numéros font 9 (3 ↔ 6), les demi-tons 12 ; majeur ↔ mineur, juste reste juste.",
      },
      {
        title: "Les entendre dans une tonalité",
        paragraphs: [
          "Un intervalle s'entend bien mieux dans une tonalité installée qu'isolé : chante la tonique, puis entends les deux notes comme des degrés. Do-sol en do, c'est 1 → 5 ; mi-sol, c'est 3 → 5.",
          "Pour le chanter, une astuce de Rick Beato : pars d'une note du milieu et chante l'intervalle au-dessus puis au-dessous, pour l'entendre des deux côtés.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 69, names: true, marks: [{ midi: 60, label: '1' }, { midi: 64, label: 'mi' }, { midi: 68, label: 'sol♯' }] },
        audio: { label: "La note du milieu (mi), la tierce au-dessus, puis au-dessous", notes: seq([64, 68, 64, 60], 0.9, 0.1), tempo: 70 },
        keep: "Installe la tonique, pense en degrés, chante des deux côtés.",
      },
    ],
    practice: [
      { domain: 'oreille', label: "Intervalles montants, dans une tonalité", templateId: 'OR-3-05', params: { questions: 6 } },
      { domain: 'theorie', label: "Nomme l'intervalle écrit, renverse-le", templateId: 'TH-3-05', params: { questions: 6, niveau_q: 1 } },
      { domain: 'technique', label: "Joue l'intervalle depuis une note", templateId: 'TE-3-07', params: { intervalles: [3, 4, 5, 7, 8, 9] } },
      { domain: 'chant', label: "Chante l'intervalle", templateId: 'OR-3-08' },
    ],
    validation: { label: "Reconnaître les intervalles à l'oreille", templateId: 'OR-3-05', params: { questions: 10 }, criterion: "8 bonnes réponses sur 10" },
  },
  // ------------------------------------------------------------------ 10
  {
    id: 'mineurs', number: 10, palier: 3, conceptId: 'mineur_relatif',
    title: "Les trois mineurs : naturel, harmonique, mélodique",
    why: "Le mineur donne leur couleur sombre ou tendre à des milliers de morceaux. Comprendre ses trois formes explique pourquoi l'accord de V est souvent majeur en mineur, et d'où vient la couleur orientale du mineur harmonique.",
    discover: {
      question: "Laquelle de ces deux phrases est en mineur ?",
      a: { notes: seq([60, 62, 64, 65, 67, 64, 60], 0.5), tempo: 96 }, b: { notes: seq([60, 62, 63, 65, 67, 63, 60], 0.5), tempo: 96 }, answer: 'B',
      reveal: "B est en mineur : une seule note a changé, le mi est devenu mi♭. Ce ♭3 suffit à assombrir toute la phrase. Le mineur a pourtant trois formes, et chacune a sa raison d'être.",
    },
    screens: [
      {
        title: "Le mineur naturel",
        paragraphs: [
          "Joue les notes de do majeur, mais en partant de la et en te posant sur la : la, si, do, ré, mi, fa, sol, la. C'est la mineur naturel.",
          "En degrés : 1 2 ♭3 4 5 ♭6 ♭7. Par rapport au majeur de même tonique, trois notes sont descendues d'un demi-ton : le 3, le 6 et le 7.",
        ],
        illustration: { kind: 'keyboard', from: 57, to: 69, names: true, marks: [57, 59, 60, 62, 64, 65, 67, 69].map((m) => ({ midi: m })) },
        guitarIllustration: { kind: 'fretboard', frets: 4, marks: [{ string: 1, fret: 0, label: 'la' }, { string: 1, fret: 2, label: 'si', color: VIOLET }, { string: 1, fret: 3, label: 'do', color: VIOLET }, { string: 2, fret: 0, label: 'ré', color: VIOLET }, { string: 2, fret: 2, label: 'mi', color: VIOLET }, { string: 2, fret: 3, label: 'fa', color: VIOLET }, { string: 3, fret: 0, label: 'sol', color: VIOLET }, { string: 3, fret: 2, label: 'la' }] },
        guitarParagraphs: [
          "Joue les notes de do majeur, mais en partant de la et en te posant sur la : la mineur naturel. Dans les premières cases : la à vide, si, do sur la corde de la ; ré, mi, fa sur la corde de ré ; sol et la sur la corde de sol.",
          "En degrés : 1 2 ♭3 4 5 ♭6 ♭7. Par rapport au majeur de même tonique, trois notes sont descendues d'un demi-ton : le 3, le 6 et le 7.",
        ],
        audio: { label: "La gamme de la mineur naturel", notes: seq([57, 59, 60, 62, 64, 65, 67, 69], 0.55), tempo: 100 },
        guitarAudio: { label: "La gamme de la mineur naturel", notes: seq([45, 47, 48, 50, 52, 53, 55, 57], 0.55), tempo: 100 },
        keep: "Mineur naturel = 1 2 ♭3 4 5 ♭6 ♭7.",
      },
      {
        title: "Relative et parallèle",
        paragraphs: [
          "La mineur et do majeur ont les mêmes notes et la même armure : la mineur est la relative de do majeur. On la trouve sur le 6e degré du majeur (sol majeur ↔ mi mineur, fa majeur ↔ ré mineur).",
          "Do mineur, lui, a la même tonique que do majeur, mais pas les mêmes notes : c'est le mineur parallèle. Même maison, autre couleur.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Relative', sub: 'mêmes notes, autre tonique (do ↔ la)' }, { title: 'Parallèle', sub: 'même tonique, autres notes (do ↔ do)', color: VIOLET }] },
        audio: { label: "Do majeur, puis do mineur : même tonique", notes: [...seq([60, 62, 64, 65, 67], 0.45), ...seq([60, 62, 63, 65, 67], 0.45, 0, 2.8)], tempo: 100 },
        keep: "Relative : mêmes notes (6e degré). Parallèle : même tonique.",
      },
      {
        title: "♭3, ♭6, ♭7 : les couleurs",
        paragraphs: [
          "♭3 : sombre mais stable, il est dans l'accord de tonique mineur. ♭6 : lourd, il pèse vers 5. ♭7 : plus léger que la sensible, il ne tire pas vers 1.",
          "C'est surtout le ♭3 qui fait entendre « mineur ». En cas de doute, redescends jusqu'à 1 en chantant la gamme mineure.",
        ],
        illustration: { kind: 'cards', items: [{ title: '♭3', sub: 'sombre, stable' }, { title: '♭6', sub: 'lourd, pèse vers 5', color: VIOLET }, { title: '♭7', sub: 'léger, sans tension', color: GOLD }] },
        audio: { label: "5 ♭6 5, puis ♭7 1", notes: seq([67, 68, 67, 70, 72], 0.8), tempo: 80 },
        keep: "Le ♭3 dit « mineur » ; ♭6 pèse, ♭7 flotte.",
      },
      {
        title: "Le problème : pas de sensible",
        paragraphs: [
          "En mineur naturel, la 7e note (sol, en la mineur) est à un ton de la tonique : elle ne tire pas vers elle. L'accord de V, mi-sol-si, est mineur, et la cadence V → I se pose mollement.",
          "Écoute mi mineur → la mineur, puis mi majeur → la mineur : avec sol♯, le retour est irrésistible.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'mi m → la m', sub: 'sol → la : un ton, mou' }, { title: 'mi → la m', sub: 'sol♯ → la : demi-ton, ça tire', color: '#E0457B' }] },
        audio: { label: "mi mineur → la mineur, puis mi majeur → la mineur", notes: [...chords([[52, 55, 59], [57, 60, 64]]), ...chords([[52, 56, 59], [57, 60, 64]], 1.8, 4.2)], tempo: 72 },
        guitarAudio: { label: "mi mineur → la mineur, puis mi majeur → la mineur", notes: [...chords([[40, 47, 52, 55, 59], [45, 52, 57, 60, 64]]), ...chords([[40, 47, 52, 56, 59], [45, 52, 57, 60, 64]], 1.8, 4.2)], tempo: 72 },
        keep: "Sans sensible, la cadence est molle ; avec elle, ça rentre.",
      },
      {
        title: "Le mineur harmonique : on remonte le 7",
        paragraphs: [
          "On remonte donc le 7 d'un demi-ton : sol devient sol♯. C'est le mineur harmonique (1 2 ♭3 4 5 ♭6 7), celui qui donne son accord de V majeur au mineur.",
          "Entre ♭6 et 7 s'ouvre un grand pas d'un ton et demi : c'est lui qui donne la couleur orientale, très reconnaissable.",
        ],
        illustration: { kind: 'keyboard', from: 57, to: 69, names: true, marks: [...[57, 59, 60, 62, 64, 65].map((m) => ({ midi: m } as { midi: number; label?: string; color?: string })), { midi: 68, label: 'sol♯', color: '#E0457B' }, { midi: 69 }], arcs: [{ a: 65, b: 68, label: '1 ton ½', color: GOLD }] },
        guitarIllustration: { kind: 'fretboard', frets: 4, marks: [{ string: 1, fret: 0, label: 'la' }, { string: 1, fret: 2, label: 'si', color: VIOLET }, { string: 1, fret: 3, label: 'do', color: VIOLET }, { string: 2, fret: 0, label: 'ré', color: VIOLET }, { string: 2, fret: 2, label: 'mi', color: VIOLET }, { string: 2, fret: 3, label: 'fa', color: VIOLET }, { string: 3, fret: 1, label: 'sol♯', color: GOLD }, { string: 3, fret: 2, label: 'la' }] },
        audio: { label: "La mineur harmonique : le sol♯ tire vers la", notes: seq([57, 59, 60, 62, 64, 65, 68, 69], 0.55), tempo: 100 },
        guitarAudio: { label: "La mineur harmonique : le sol♯ tire vers la", notes: seq([45, 47, 48, 50, 52, 53, 56, 57], 0.55), tempo: 100 },
        keep: "Harmonique = naturel avec le 7 remonté (la sensible revient).",
      },
      {
        title: "Le mineur mélodique : on remonte aussi le 6",
        paragraphs: [
          "Pour une mélodie, ce pas d'un ton et demi est difficile à chanter. On remonte alors aussi le 6 : fa devient fa♯. C'est le mineur mélodique (1 2 ♭3 4 5 6 7), plus lisse, presque majeur dans le haut.",
          "En musique classique, on le joue en montant et on redescend en mineur naturel ; en jazz, on le garde dans les deux sens.",
        ],
        illustration: { kind: 'keyboard', from: 57, to: 69, names: true, marks: [...[57, 59, 60, 62, 64].map((m) => ({ midi: m } as { midi: number; label?: string; color?: string })), { midi: 66, label: 'fa♯', color: '#E0457B' }, { midi: 68, label: 'sol♯', color: '#E0457B' }, { midi: 69 }] },
        guitarIllustration: { kind: 'fretboard', frets: 5, marks: [{ string: 1, fret: 0, label: 'la' }, { string: 1, fret: 2, label: 'si', color: VIOLET }, { string: 1, fret: 3, label: 'do', color: VIOLET }, { string: 2, fret: 0, label: 'ré', color: VIOLET }, { string: 2, fret: 2, label: 'mi', color: VIOLET }, { string: 2, fret: 4, label: 'fa♯', color: GOLD }, { string: 3, fret: 1, label: 'sol♯', color: GOLD }, { string: 3, fret: 2, label: 'la' }] },
        audio: { label: "La mineur mélodique en montant, naturel en descendant", notes: seq([57, 59, 60, 62, 64, 66, 68, 69, 67, 65, 64, 62, 60, 59, 57], 0.5), tempo: 100 },
        guitarAudio: { label: "La mineur mélodique en montant, naturel en descendant", notes: seq([45, 47, 48, 50, 52, 54, 56, 57, 55, 53, 52, 50, 48, 47, 45], 0.5), tempo: 100 },
        keep: "Mélodique = 6 et 7 remontés, pour adoucir la montée.",
      },
      {
        title: "Ce que tu sais maintenant",
        paragraphs: [
          "Tu connais le mineur naturel, sa relative majeure, et ses trois couleurs (♭3, ♭6, ♭7). Tu sais pourquoi on remonte le 7 (harmonique) puis le 6 (mélodique).",
          "Place à la pratique : les reconnaître à l'oreille, les jouer depuis la même tonique, et chanter la montée du mineur harmonique.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Naturel', sub: '♭3 ♭6 ♭7' }, { title: 'Harmonique', sub: '♭3 ♭6 7', color: VIOLET }, { title: 'Mélodique', sub: '♭3 6 7', color: GOLD }] },
      },
    ],
    practice: [
      { domain: 'oreille', label: "Naturel, harmonique ou mélodique ?", templateId: 'OR-3-13', params: { questions: 5, exemples: true, types: ['naturel', 'harmonique', 'melodique'] } },
      { domain: 'oreille', label: "Majeur ou mineur ?", templateId: 'OR-3-01', params: { questions: 5 } },
      { domain: 'theorie', label: "Relatives et qualités", templateId: 'TH-3-01' },
      { domain: 'technique', label: "Joue les trois mineurs depuis la", templateId: 'TE-3-08', params: { types: ['naturel', 'harmonique', 'melodique'] } },
      { domain: 'chant', label: "Chante 5 ♭6 7 1 (mineur harmonique)", templateId: 'OR-3-14' },
    ],
    validation: { label: "Reconnaître les trois mineurs à l'oreille", templateId: 'OR-3-13', params: { questions: 5, exemples: false, types: ['naturel', 'harmonique', 'melodique'] }, criterion: "4 bonnes réponses sur 5" },
  },
  // ------------------------------------------------------------------ 11
  {
    id: 'accords_gamme', number: 11, palier: 3, conceptId: 'accords_diatoniques',
    title: "Les accords de la gamme et leurs fonctions",
    why: "Sept accords suffisent à jouer la plupart des chansons d'une tonalité. Les ranger par fonction (repos, départ, tension) permet de reconnaître une grille à l'oreille, sans calcul, et de la jouer dans n'importe quelle tonalité.",
    discover: {
      question: "Après l'accord de la maison, lequel de ces deux accords sonne mélancolique ?",
      a: { notes: chords([[48, 52, 55], [45, 48, 52]]), tempo: 70 }, b: { notes: chords([[48, 52, 55], [53, 57, 60]]), tempo: 70 }, answer: 'A',
      reveal: "A fait entendre l'accord vi : un accord mineur, cousin de la maison, mais triste. B fait entendre IV, majeur, qui s'éloigne. Les sept accords de la gamme ont chacun leur rôle : c'est ce rôle qu'on apprend à entendre.",
    },
    screens: [
      {
        title: "Quatre triades",
        paragraphs: [
          "Avec deux tierces empilées, il y a quatre possibilités. Majeur (4 + 3 demi-tons) : lumineux. Mineur (3 + 4) : sombre. Diminué (3 + 3) : serré, inquiet. Augmenté (4 + 4) : flottant.",
          "Écoute la note du haut : avec une quinte juste (majeur, mineur), l'accord est stable ; diminuée ou augmentée, il vacille. Dans l'accord diminué, la quinte diminuée est à 6 demi-tons de la fondamentale : c'est un triton, l'intervalle le plus instable (vu avec les intervalles). Voilà d'où vient son côté inquiet.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Majeur', sub: '4 + 3' }, { title: 'Mineur', sub: '3 + 4', color: VIOLET }, { title: 'Diminué', sub: '3 + 3', color: GOLD }, { title: 'Augmenté', sub: '4 + 4' }] },
        audio: { label: "Majeur, mineur, diminué, augmenté", notes: chords([[60, 64, 67], [60, 63, 67], [60, 63, 66], [60, 64, 68]], 2), tempo: 80 },
        keep: "Majeur 4+3, mineur 3+4, diminué 3+3, augmenté 4+4.",
      },
      {
        title: "Les sept accords de la gamme",
        paragraphs: [
          "Sur chaque note de la gamme majeure, une note sur deux donne un accord. I, IV et V sont majeurs ; ii, iii et vi sont mineurs ; vii° est diminué. Les minuscules signalent les accords mineurs.",
          "En do : do, ré m, mi m, fa, sol, la m, si°. Cette suite de qualités est la même dans toutes les tonalités majeures.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'I IV V', sub: 'majeurs' }, { title: 'ii iii vi', sub: 'mineurs', color: VIOLET }, { title: 'vii°', sub: 'diminué', color: GOLD }] },
        audio: { label: "Les sept accords de do, en montant", notes: chords([[48, 52, 55], [50, 53, 57], [52, 55, 59], [53, 57, 60], [55, 59, 62], [57, 60, 64], [59, 62, 65]], 1.2), tempo: 84 },
        keep: "I IV V majeurs, ii iii vi mineurs, vii° diminué, partout.",
      },
      {
        title: "Trois familles de fonctions",
        paragraphs: [
          "Tonique (I, vi, iii) : le repos. Sous-dominante (IV, ii) : le départ, ça s'éloigne. Dominante (V, vii°) : la tension, ça veut rentrer.",
          "Une grille raconte souvent ce trajet : repos, départ, tension, retour. I – IV – V – I, ou I – vi – ii – V.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Tonique', sub: 'I, vi, iii · repos' }, { title: 'Sous-dom.', sub: 'IV, ii · départ', color: VIOLET }, { title: 'Dominante', sub: 'V, vii° · tension', color: GOLD }] },
        audio: { label: "I – vi – ii – V – I : repos, départ, tension, retour", notes: chords([[48, 52, 55], [45, 48, 52], [50, 53, 57], [55, 59, 62], [48, 52, 55]]), tempo: 76 },
        keep: "Repos, départ, tension, retour.",
      },
      {
        title: "Pourquoi ces familles",
        paragraphs: [
          "Deux accords dont les fondamentales sont à une tierce partagent deux notes sur trois. La mineur (la-do-mi) contient do et mi, comme do majeur (do-mi-sol) : c'est pourquoi vi peut remplacer I et garde un air de repos.",
          "De même, ré mineur (ré-fa-la) partage fa et la avec fa majeur : ii joue le rôle de IV.",
        ],
        illustration: { kind: 'keyboard', from: 57, to: 67, names: true, marks: [{ midi: 57, label: 'la', color: VIOLET }, { midi: 60, label: 'do' }, { midi: 64, label: 'mi' }, { midi: 67, label: 'sol', color: GOLD }] },
        audio: { label: "Do majeur, puis la mineur : deux notes en commun", notes: chords([[60, 64, 67], [57, 60, 64]], 2), tempo: 70 },
        keep: "Deux notes en commun = même famille.",
      },
      {
        title: "Reconnaître une grille, sans calculer",
        paragraphs: [
          "La méthode de la leçon 7, avec un accord de plus. Chante d'abord la tonique. Puis sens la fonction (repos, départ, tension ; vi : repos mélancolique), ou chante la basse et descends la gamme jusqu'à 1 en comptant.",
          "Évite toujours de calculer l'écart entre deux accords : la maison bougerait dans ta tête. Garde-la, et tout se range.",
        ],
        illustration: { kind: 'cards', items: [{ title: '1. La tonique', sub: 'chante-la d\'abord' }, { title: '2. Sentir', sub: 'repos, départ, tension', color: VIOLET }, { title: 'ou la basse', sub: 'redescendre jusqu\'à 1', color: GOLD }] },
        audio: { label: "I – vi – IV – V, la grille de mille chansons", notes: chords([[48, 52, 55], [45, 48, 52], [53, 57, 60], [55, 59, 62]]), tempo: 80 },
        keep: "La tonique d'abord, puis la fonction ou la basse.",
      },
      {
        title: "Le blues : douze mesures",
        paragraphs: [
          "La grille du blues : I I I I | IV IV I I | V IV I V. Trois accords, joués en accords de 7e qui frottent un peu.",
          "Dessus, la pentatonique mineure (1 ♭3 4 5 ♭7) et sa blue note (♯4) en passage. Le ♭3 frotte contre la tierce majeure de l'accord : c'est le son du blues.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'I I I I', sub: 'mesures 1 à 4' }, { title: 'IV IV I I', sub: 'mesures 5 à 8', color: VIOLET }, { title: 'V IV I V', sub: 'mesures 9 à 12', color: GOLD }] },
        audio: { label: "La gamme blues de do", notes: seq([60, 63, 65, 66, 67, 70, 72], 0.5), tempo: 100 },
        keep: "Blues = 12 mesures sur I, IV, V ; penta mineure + blue note.",
      },
      {
        title: "Ce que tu sais maintenant",
        paragraphs: [
          "Tu connais les quatre triades, les sept accords de la gamme et leurs trois familles. Tu sais reconnaître une grille par la fonction ou par la basse, et tu connais la grille du blues.",
          "Place à la pratique : entendre I, IV, V et vi, ranger les accords par famille, jouer la basse d'une grille dans plusieurs tonalités, et viser la tierce.",
        ],
        illustration: { kind: 'cards', items: [{ title: '7 accords', sub: 'I ii iii IV V vi vii°' }, { title: '3 familles', sub: 'repos, départ, tension', color: VIOLET }, { title: 'Blues', sub: '12 mesures', color: GOLD }] },
      },
    ],
    practice: [
      { domain: 'oreille', label: "I, IV, V ou vi ? La tonique d'abord", templateId: 'OR-2-08', params: { accords: [1, 4, 5, 6], questions: 6 } },
      { domain: 'theorie', label: "Range les accords par famille", templateId: 'TH-3-06', params: { questions: 7, tonalites: ['C', 'G', 'F'] } },
      { domain: 'theorie', label: "Construis les triades", templateId: 'TH-3-02' },
      { domain: 'technique', label: "Joue la basse de I – vi – IV – V dans 3 tonalités", templateId: 'TE-3-09', params: { grilles: ['I-vi-IV-V'], tonalites: ['C', 'G', 'F'] } },
      { domain: 'impro', label: "Perroquet blues sur la pentatonique mineure", templateId: 'IM-3-01' },
    ],
    validation: { label: "Dictée d'une grille de 4 accords (I, IV, V, vi)", templateId: 'OR-3-11', criterion: "la grille juste" },
  },
  // ------------------------------------------------------------------ R1 (complète)
  {
    id: 'syncopes', number: 'R1', palier: 3, conceptId: 'syncopes',
    title: "Syncopes et doubles croches",
    why: "La syncope, c'est ce qui fait groover : une note qui tombe entre les temps et bouscule l'attente. Les doubles croches, elles, donnent l'énergie des rythmes rapides. Les deux se comptent, puis se sentent.",
    discover: {
      question: "Laquelle de ces deux phrases donne le plus envie de bouger ?",
      a: { notes: hits([0, 1, 2, 3], [1, 1, 1, 1]), tempo: 96 }, b: { notes: hits([0, 1, 1.5, 2.5, 3], [1, 0.5, 1, 0.5, 1]), tempo: 96 }, answer: 'B',
      reveal: "B contient une syncope : une note longue qui démarre entre deux temps et enjambe le suivant. Le corps attendait un appui sur le temps, il arrive en avance : c'est ce décalage qui fait groover.",
    },
    screens: [
      {
        title: "Le temps et le « et »",
        paragraphs: [
          "Chaque temps se coupe en deux : le temps lui-même, que tu comptes « 1, 2, 3, 4 », et le milieu, que tu comptes « et ». Deux croches remplissent un temps : « 1 et ».",
          "Compte à voix haute « 1 et 2 et 3 et 4 et » en tapant du pied sur les chiffres seulement : le « et » tombe quand le pied remonte.",
        ],
        illustration: { kind: 'pulseGrid', perBar: 4, bars: 1, subdiv: 2 },
        audio: { label: "Le clic sur les temps, une note sur chaque « et »", notes: [...clicks(4, (k) => k === 0), ...hits([0.5, 1.5, 2.5, 3.5], [0.4, 0.4, 0.4, 0.4])], tempo: 84 },
        keep: "Temps sur le pied qui descend, « et » quand il remonte.",
      },
      {
        title: "La syncope : frapper entre les temps",
        paragraphs: [
          "Une syncope déplace l'accent : une note attaquée sur un temps faible, ou sur la partie faible du temps (le « et »), se prolonge par-dessus le temps plus fort qui suit. L'appui qu'on attendait sur le temps glisse vers le contretemps. La figure syncopée la plus courante : croche, noire, croche. La noire du milieu démarre sur un « et » et tient jusqu'au « et » suivant : elle passe par-dessus le temps sans le frapper.",
          "Compte « 1 · 2 et · et 4 » : tu frappes sur 1, sur 2, sur le « et », rien sur 3 (la note tient), puis sur le « et » et sur 4.",
        ],
        illustration: { kind: 'rhythm', items: ['noire', 'syncope', 'noire'], counts: "1      2 et (3) et      4" },
        audio: { label: "Noire, syncope, noire", notes: [...clicks(4, (k) => k === 0), ...hits([0, 1, 1.5, 2.5, 3], [1, 0.5, 1, 0.5, 1])], tempo: 84 },
        keep: "Syncope : l'accent glisse du temps vers le contretemps. Figure type : croche – noire – croche.",
      },
      {
        title: "Pourquoi ça groove",
        paragraphs: [
          "Le corps prévoit un appui sur chaque temps. La syncope arrive un demi-temps trop tôt et tient : l'appui attendu manque, l'oreille est surprise, le corps compense en bougeant.",
          "Écoute la même petite mélodie, d'abord droite, sur les temps, puis syncopée. Mêmes notes, autre énergie.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Sur le temps', sub: 'stable, carré' }, { title: 'Syncopé', sub: 'en avance, ça pousse', color: VIOLET }] },
        audio: { label: "Droite, puis syncopée", notes: [...seq([67, 69, 67, 64], 1, 0), ...[{ midi: 67, start: 5, dur: 0.9 }, { midi: 69, start: 6, dur: 0.45 }, { midi: 67, start: 6.5, dur: 0.95 }, { midi: 64, start: 7.5, dur: 1.4 }]], tempo: 92 },
        keep: "La syncope déplace l'appui : c'est le corps qui l'entend.",
      },
      {
        title: "Les doubles croches : quatre par temps",
        paragraphs: [
          "Coupe encore chaque moitié en deux : quatre doubles croches par temps. On les compte « 1 e et a, 2 e et a » : le chiffre, « e », « et », « a ».",
          "Commence lentement, en gardant le « et » au milieu exact du temps : c'est le repère qui empêche les doubles de se tasser.",
        ],
        illustration: { kind: 'rhythm', items: ['doubles', 'croches', 'noire', 'noire'], counts: "1 e et a   2 et   3   4" },
        audio: { label: "Doubles croches, croches, noires", notes: [...clicks(4, (k) => k === 0), ...hits([0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3], [0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 1, 1])], tempo: 72 },
        keep: "Doubles : « 1 e et a », le « et » bien au milieu.",
      },
      {
        title: "Comment s'entraîner",
        paragraphs: [
          "Toujours dans cet ordre : compter à voix haute, taper en comptant, puis taper en comptant dans ta tête. Le métronome lent d'abord, plus vite ensuite.",
          "Quand une syncope te résiste, tape d'abord toutes les croches (« 1 et 2 et… »), puis enlève celles qui sont liées : il reste la syncope.",
        ],
        illustration: { kind: 'cards', items: [{ title: '1. Compter', sub: 'à voix haute' }, { title: '2. Taper', sub: 'en comptant', color: VIOLET }, { title: '3. Sentir', sub: 'compter dans la tête', color: GOLD }] },
        keep: "Compter, taper, puis sentir. Lent d'abord.",
      },
    ],
    practice: [
      { domain: 'rythme', label: "Lis et tape des syncopes", templateId: 'RY-3-01' },
      { domain: 'rythme', label: "Perroquet : syncopes", templateId: 'RY-3-02' },
      { domain: 'lecture', label: "Écris le rythme entendu", templateId: 'RY-3-03' },
    ],
    validation: { label: "Lire deux mesures avec syncopes", templateId: 'RY-3-01', params: { mesures: 2 }, criterion: "les deux mesures en place" },
  },
];
