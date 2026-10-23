// Leçons des modes (0.22.0) : une présentation (le décalage, la gamme parente, la comparaison, le bourdon),
// puis un mode par leçon, travaillé selon cinq piliers : le son, l'oreille (chanter), le rythme typique,
// la technique (sur une corde et en position à la guitare, au clavier avec doigté), l'accord qui le porte,
// et l'impro (question-réponse, perroquet). Tous les modes sont travaillés sur la même tonique, do.
import type { NoteEvent } from '../types';
import type { DeepLesson, Illustration } from './types';

const seq = (midis: number[], dur = 1, gap = 0, at = 0): NoteEvent[] => midis.map((m, i) => ({ midi: m, start: at + i * (dur + gap), dur: dur * 0.95 }));
const together = (midis: number[], start: number, dur: number): NoteEvent[] => midis.map((m) => ({ midi: m, start, dur }));
const chords = (list: number[][], beats = 1.9, at = 0): NoteEvent[] => list.flatMap((c, i) => together(c, at + i * beats, beats * 0.92));
/** bourdon : tonique et quinte graves tenues (ou la tonique seule) */
const drone = (dur: number, root = 48, at = 0, fifth = true): NoteEvent[] => [{ midi: root, start: at, dur }, ...(fifth ? [{ midi: root + 7, start: at, dur }] : [])];

const VIOLET = '#8A80B0';
const GOLD = '#D9A21B';

const SEMI: Record<string, number> = { '1': 0, b2: 1, '2': 2, b3: 3, '3': 4, '4': 5, '#4': 6, b5: 6, '5': 7, b6: 8, '6': 9, b7: 10, '7': 11, '8': 12 };
const LBL = (t: string) => t.replace('b', '♭').replace('#', '♯');
const F = {
  ionien: ['1', '2', '3', '4', '5', '6', '7', '8'],
  eolien: ['1', '2', 'b3', '4', '5', 'b6', 'b7', '8'],
  dorien: ['1', '2', 'b3', '4', '5', '6', 'b7', '8'],
  mixolydien: ['1', '2', '3', '4', '5', '6', 'b7', '8'],
  lydien: ['1', '2', '3', '#4', '5', '6', '7', '8'],
  phrygien: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7', '8'],
  locrien: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7', '8'],
};
type ModeKey = keyof typeof F;
/** la gamme d'un mode depuis `root`, en montant */
const up = (m: ModeKey, root = 60) => F[m].map((t) => root + SEMI[t]);
/** montée puis descente, en croches */
const upDown = (m: ModeKey, root = 60, at = 0, dur = 0.5) => { const u = up(m, root); return seq([...u, ...[...u].reverse().slice(1)], dur, 0, at); };
/** le mode au clavier, do à do, note caractéristique en or */
const kb = (m: ModeKey, char: string[]): Illustration => ({ kind: 'keyboard', from: 60, to: 72, names: true, marks: F[m].map((t) => ({ midi: 60 + SEMI[t], label: LBL(t), color: char.includes(t) ? GOLD : undefined })) });
/** le mode au manche, depuis do (corde de la, case 3), dans les cases 1 à 6 */
const FRET: Record<string, [number, number]> = {
  '1': [1, 3], b2: [1, 4], '2': [1, 5], b3: [1, 6], '3': [2, 2], '4': [2, 3], '#4': [2, 4], b5: [2, 4], '5': [2, 5], b6: [2, 6], '6': [3, 2], b7: [3, 3], '7': [3, 4], '8': [3, 5],
};
const fb = (m: ModeKey, char: string[]): Illustration => ({ kind: 'fretboard', frets: 7, marks: F[m].map((t) => ({ string: FRET[t][0], fret: FRET[t][1], label: LBL(t), color: char.includes(t) ? GOLD : undefined })) });
/** jouer le mode au clic (montée et descente) */
const tokens = (m: ModeKey) => { const u = F[m]; return [...u, ...[...u].reverse().slice(1)]; };
const degres = (m: ModeKey) => F[m].slice(0, 7);

export const MODES_LESSONS: DeepLesson[] = [
  // ------------------------------------------------------------------ 14 · présentation
  {
    id: 'modes', number: 14, palier: 5, conceptId: 'modes',
    title: "Les modes : une gamme, sept points de départ",
    why: "Les modes ouvrent sept couleurs à partir d'une seule gamme. Avant d'apprendre chacun, il faut comprendre leur mécanique : d'où viennent leurs notes, comment les trouver sur n'importe quelle tonique, et pourquoi il faut une tonique installée pour les entendre.",
    discover: {
      question: "Ces deux gammes utilisent exactement les mêmes notes, les touches blanches. Laquelle sonne mineure ?",
      a: { notes: [...drone(4.4), ...seq(up('ionien'), 0.5)], tempo: 100 },
      b: { notes: [...drone(4.4, 50), ...seq([62, 64, 65, 67, 69, 71, 72, 74], 0.5)], tempo: 100 }, answer: 'B',
      reveal: "B part de ré, se pose sur ré, et un bourdon de ré la soutient : ce sont les notes de do majeur, mais la maison a changé. Ré devient la tonique, et la gamme sonne mineure. C'est tout le principe des modes : une seule gamme, sept points de départ.",
    },
    screens: [
      {
        title: "Les mêmes notes, une autre maison",
        paragraphs: [
          "Joue les touches blanches de do à do : c'est do majeur. Joue les mêmes touches de ré à ré, en sentant ré comme la maison : la gamme change de caractère, elle devient mineure. On l'appelle ré dorien.",
          "Un mode, c'est ça : les notes d'une gamme majeure, entendues depuis un autre de ses degrés, qui devient la tonique.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 74, names: true, marks: [{ midi: 60, label: 'do' }, { midi: 62, label: '1', color: GOLD }, { midi: 74, label: '1', color: GOLD }] },
        guitarIllustration: { kind: 'fretboard', frets: 4, marks: [{ string: 2, fret: 0, label: 'ré', color: GOLD }, { string: 2, fret: 2, label: 'mi' }, { string: 2, fret: 3, label: 'fa' }, { string: 3, fret: 0, label: 'sol' }, { string: 3, fret: 2, label: 'la' }, { string: 4, fret: 0, label: 'si' }, { string: 4, fret: 1, label: 'do' }, { string: 4, fret: 3, label: 'ré', color: GOLD }] },
        guitarParagraphs: [
          "Joue do majeur, puis les mêmes notes de ré à ré, en sentant ré comme la maison : ré à vide, mi, fa ; sol à vide, la ; si à vide, do, ré. La gamme change de caractère, elle devient mineure. On l'appelle ré dorien.",
          "Un mode, c'est ça : les notes d'une gamme majeure, entendues depuis un autre de ses degrés, qui devient la tonique.",
        ],
        audio: { label: "Do majeur sur un bourdon de do, puis les mêmes notes de ré à ré, sur un bourdon de ré", notes: [...drone(4.4), ...seq(up('ionien'), 0.5), ...drone(4.4, 50, 4.6), ...seq([62, 64, 65, 67, 69, 71, 72, 74], 0.5, 0, 4.6)], tempo: 100 },
        keep: "Un mode = une gamme majeure, entendue depuis un autre degré.",
      },
      {
        title: "Sept points de départ, sept modes",
        paragraphs: [
          "Chaque note de do majeur peut servir de maison. Depuis do : ionien, le majeur. Depuis ré : dorien. Depuis mi : phrygien. Depuis fa : lydien. Depuis sol : mixolydien. Depuis la : éolien, le mineur naturel. Depuis si : locrien.",
          "Les noms viennent de la Grèce antique ; retiens surtout leur ordre, celui des degrés de la gamme, de 1 à 7.",
        ],
        illustration: { kind: 'cards', items: [
          { title: 'do · ionien', sub: '1er degré · le majeur' }, { title: 'ré · dorien', sub: '2e degré', color: VIOLET },
          { title: 'mi · phrygien', sub: '3e degré', color: VIOLET }, { title: 'fa · lydien', sub: '4e degré', color: GOLD },
          { title: 'sol · mixolydien', sub: '5e degré', color: GOLD }, { title: 'la · éolien', sub: '6e degré · le mineur' },
          { title: 'si · locrien', sub: '7e degré' },
        ] },
        keep: "do ionien, ré dorien, mi phrygien, fa lydien, sol mixolydien, la éolien, si locrien.",
      },
      {
        title: "Le motif des tons se décale",
        paragraphs: [
          "La gamme majeure suit le motif T T ½ T T T ½. Un mode garde ce motif, mais le commence ailleurs : depuis ré, on lit T ½ T T T ½ T.",
          "C'est pour ça que chaque mode a son caractère : les demi-tons ne tombent plus au même endroit par rapport à la tonique.",
        ],
        illustration: { kind: 'steps', notes: ['ré', 'mi', 'fa', 'sol', 'la', 'si', 'do', 'ré'], steps: ['T', '½', 'T', 'T', 'T', '½', 'T'] },
        audio: { label: "Ré dorien, sur un bourdon de ré", notes: [...drone(8, 50), ...seq([62, 64, 65, 67, 69, 71, 72, 74, 72, 71, 69, 67, 65, 64, 62], 0.5)], tempo: 104 },
        keep: "Même motif de tons et demi-tons, commencé à un autre endroit.",
      },
      {
        title: "Un mode sur do : chercher la gamme parente",
        paragraphs: [
          "Et pour le dorien sur do ? Le dorien part du 2e degré d'une gamme majeure : il faut donc la gamme majeure dont do est le 2e degré, si♭ majeur. Do dorien, ce sont les notes de si♭ majeur, jouées de do à do.",
          "Même raisonnement pour les autres. Do phrygien (3e degré) : les notes de la♭ majeur. Do lydien (4e) : celles de sol majeur. Do mixolydien (5e) : celles de fa majeur.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'do dorien', sub: 'si♭ majeur · do = 2e degré', color: VIOLET }, { title: 'do phrygien', sub: 'la♭ majeur · do = 3e degré', color: VIOLET }, { title: 'do lydien', sub: 'sol majeur · do = 4e degré', color: GOLD }, { title: 'do mixolydien', sub: 'fa majeur · do = 5e degré', color: GOLD }] },
        audio: { label: "Si♭ majeur, puis les mêmes notes de do à do, sur un bourdon de do", notes: [...seq([58, 60, 62, 63, 65, 67, 69, 70], 0.5), ...drone(4.4, 48, 4.6), ...seq(up('dorien'), 0.5, 0, 4.6)], tempo: 100 },
        keep: "Un mode sur do : la gamme majeure dont do est ce degré.",
      },
      {
        title: "L'autre méthode : comparer à la même tonique",
        paragraphs: [
          "Le décalage sert à trouver les notes. Pour entendre et improviser, on compare plutôt chaque mode au majeur ou au mineur de même tonique, et on retient la note qui change : la note caractéristique.",
          "Trois familles. Majeurs : ionien, lydien (♯4), mixolydien (♭7). Mineurs : éolien, dorien (6), phrygien (♭2). À part, le locrien (♭2 et ♭5), instable. Écoute do majeur, puis do mixolydien : une seule note change.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Majeurs · 3', sub: 'ionien · lydien ♯4 · mixolydien ♭7', color: GOLD }, { title: 'Mineurs · ♭3', sub: 'éolien · dorien 6 · phrygien ♭2', color: VIOLET }, { title: 'À part', sub: 'locrien ♭2 ♭5' }] },
        audio: { label: "Do majeur, puis do mixolydien, sur un bourdon", notes: [...drone(9), ...seq(up('ionien'), 0.5), ...seq(up('mixolydien'), 0.5, 0, 4.5)], tempo: 110 },
        keep: "Décalage pour trouver les notes, comparaison pour les entendre.",
      },
      {
        title: "Pourquoi un bourdon ?",
        paragraphs: [
          "Joue ré dorien seul, sans rien autour : ton oreille risque d'entendre do majeur, parce que do reste la maison qu'elle connaît. Un mode n'existe que si sa tonique est installée.",
          "D'où le bourdon, une note grave tenue, ou un accord qui revient : il dit à l'oreille où est la maison. Écoute la même phrase, d'abord seule, puis sur un bourdon de ré.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Sans bourdon', sub: 'l\'oreille cherche do' }, { title: 'Avec bourdon', sub: 'ré devient la maison', color: VIOLET }] },
        audio: { label: "Une phrase sur les touches blanches, seule, puis sur un bourdon de ré", notes: [...seq([69, 67, 65, 64, 65, 67, 64, 62], 0.5), ...drone(4.4, 50, 4.6), ...seq([69, 67, 65, 64, 65, 67, 64, 62], 0.5, 0, 4.6)], tempo: 100 },
        keep: "Pas de mode sans tonique installée : bourdon ou accord.",
      },
      {
        title: "Les modes, un par un",
        paragraphs: [
          "Tu en connais déjà deux : l'ionien est la gamme majeure, l'éolien le mineur naturel. Les leçons suivantes prennent les autres un par un : dorien, mixolydien, lydien, puis phrygien et locrien.",
          "Pour chacun : son son, une phrase à chanter, son rythme typique, la gamme sur l'instrument, l'accord qui le porte, et un perroquet pour improviser avec.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Dorien', sub: 'mineur lumineux · funk, jazz', color: VIOLET }, { title: 'Mixolydien', sub: 'majeur sans sensible · rock, blues', color: GOLD }, { title: 'Lydien', sub: 'majeur qui flotte · musiques de film', color: GOLD }, { title: 'Phrygien, locrien', sub: 'mineurs sombres · flamenco, metal', color: VIOLET }] },
        keep: "Un mode à la fois : écouter, chanter, jouer, accompagner, improviser.",
      },
    ],
    practice: [
      { domain: 'theorie', label: "Do majeur depuis une autre note : quel mode ?", templateId: 'TH-5-03', params: { questions: 6, types: ['decalage'] } },
      { domain: 'technique', label: "Ré dorien : do majeur de ré à ré", templateId: 'TE-5-01', params: { tokens: tokens('dorien'), tonalite: 'D', tempo: 60 } },
      { domain: 'technique', label: "Ré dorien sur une corde", templateId: 'TQ-1-01', params: { gamme: 'dorien', tonalite: 'D' }, only: 'guitare' },
      { domain: 'theorie', label: "Un mode sur do : quelle gamme parente ?", templateId: 'TH-5-03', params: { questions: 6, types: ['parent'], modes: ['dorien', 'phrygien', 'lydien', 'mixolydien'] } },
      { domain: 'oreille', label: "Majeur ou mineur, sur un bourdon", templateId: 'OR-5-01', params: { questions: 5, modes: ['ionien', 'eolien'], apercus: true } },
    ],
    validation: { label: "Trouver un mode par décalage, et sa gamme parente", templateId: 'TH-5-03', params: { questions: 6, types: ['decalage', 'parent'] }, criterion: "5 bonnes réponses sur 6" },
  },
  // ------------------------------------------------------------------ 15 · dorien
  {
    id: 'mode_dorien', number: 15, palier: 5, conceptId: 'modes',
    title: "Le dorien, un mineur lumineux",
    why: "Le dorien est le mineur le plus joué après le mineur naturel : funk, soul, jazz modal, musiques celtiques. Toute sa couleur tient dans une note, le 6, qu'on apprend ici à entendre, chanter, placer dans le rythme et jouer.",
    discover: {
      question: "Laquelle de ces deux phrases mineures est la plus lumineuse ?",
      a: { notes: [...drone(5), ...seq([60, 62, 63, 65, 67, 68, 67, 63, 60], 0.5)], tempo: 104 },
      b: { notes: [...drone(5), ...seq([60, 62, 63, 65, 67, 69, 67, 63, 60], 0.5)], tempo: 104 }, answer: 'B',
      reveal: "Les deux sont mineures (mi♭, le ♭3), mais B passe par la au lieu de la♭ : le 6 naturel l'éclaire. A est en éolien, le mineur naturel ; B est en dorien.",
    },
    screens: [
      {
        title: "Un mineur avec un 6",
        paragraphs: [
          "Le mineur naturel s'écrit 1 2 ♭3 4 5 ♭6 ♭7. Remonte le ♭6 d'un demi-ton : 1 2 ♭3 4 5 6 ♭7. C'est le dorien.",
          "Sa note caractéristique est le 6 : un mineur qui garde de la lumière. Écoute l'éolien, puis le dorien : seul le la change.",
        ],
        illustration: kb('dorien', ['6']),
        guitarIllustration: fb('dorien', ['6']),
        guitarParagraphs: [
          "Le mineur naturel s'écrit 1 2 ♭3 4 5 ♭6 ♭7. Remonte le ♭6 d'un demi-ton : 1 2 ♭3 4 5 6 ♭7. C'est le dorien.",
          "Sa note caractéristique est le 6. Depuis do (corde de la, case 3), il tombe sur la corde de sol, case 2. Écoute l'éolien, puis le dorien : seul le la change.",
        ],
        audio: { label: "Do éolien, puis do dorien, sur un bourdon", notes: [...drone(9), ...seq(up('eolien'), 0.5), ...seq(up('dorien'), 0.5, 0, 4.5)], tempo: 110 },
        guitarAudio: { label: "Do éolien, puis do dorien, sur un bourdon", notes: [...drone(9, 36), ...seq(up('eolien', 48), 0.5), ...seq(up('dorien', 48), 0.5, 0, 4.5)], tempo: 110 },
        keep: "Dorien = mineur naturel avec un 6.",
      },
      {
        title: "Ré dorien, do dorien",
        paragraphs: [
          "Ré dorien, ce sont les touches blanches de ré à ré : le plus simple au clavier. Do dorien, ce sont les notes de si♭ majeur depuis do : do, ré, mi♭, fa, sol, la, si♭.",
          "Dans les deux cas, la même formule depuis la tonique : 1 2 ♭3 4 5 6 ♭7, soit T ½ T T T ½ T. C'est elle qu'il faut retenir, pas les noms de notes.",
        ],
        guitarParagraphs: [
          "Ré dorien, ce sont les notes de do majeur depuis ré. Do dorien, celles de si♭ majeur depuis do : do, ré, mi♭, fa, sol, la, si♭.",
          "Sur le manche, peu importe la tonique : la même forme se déplace, seule la case de départ change. Retiens la formule depuis la tonique : 1 2 ♭3 4 5 6 ♭7, soit T ½ T T T ½ T.",
        ],
        illustration: { kind: 'steps', notes: ['do', 'ré', 'mi♭', 'fa', 'sol', 'la', 'si♭', 'do'], steps: ['T', '½', 'T', 'T', 'T', '½', 'T'] },
        audio: { label: "Do dorien, montée et descente, sur un bourdon", notes: [...drone(8), ...upDown('dorien')], tempo: 110 },
        keep: "Retiens la formule depuis la tonique : 1 2 ♭3 4 5 6 ♭7.",
      },
      {
        title: "Oreille : le 5 et le 6 qui se frottent",
        paragraphs: [
          "Chante l'arpège de do m7 : 1, ♭3, 5, ♭7. C'est le cœur mineur du mode. Ajoute maintenant le 6, juste au-dessus du 5 : la et sol se frottent doucement, et la couleur dorienne apparaît.",
          "Écoute, puis chante avec : 1 ♭3 5 ♭7, puis 5 6 5.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: [{ midi: 60, label: '1' }, { midi: 63, label: '♭3' }, { midi: 67, label: '5' }, { midi: 69, label: '6', color: GOLD }, { midi: 70, label: '♭7' }] },
        audio: { label: "1 ♭3 5 ♭7, puis 5 6 5, sur un bourdon", notes: [...drone(7.5), ...seq([60, 63, 67, 70], 0.8), { midi: 67, start: 3.6, dur: 0.8 }, { midi: 69, start: 4.4, dur: 1.4 }, { midi: 67, start: 5.8, dur: 1.4 }], tempo: 84 },
        keep: "5 → 6 → 5 : la signature du dorien à l'oreille.",
      },
      {
        title: "Rythme : le 6 sur le contretemps",
        paragraphs: [
          "Le dorien appelle la syncope : funk et soul le posent sur un groove. Place le 6 sur un « et », entre deux temps, plutôt que sur le temps : il claque au lieu de peser.",
          "Écoute : la basse tient les temps, l'accord do m7 répond sur les contretemps, et le la tombe sur le « et » du 2.",
        ],
        illustration: { kind: 'pulseGrid', perBar: 4, bars: 1, subdiv: 2 },
        audio: { label: "Groove en do dorien : le la sur le « et » du 2", notes: [0, 4].flatMap((b) => [
          { midi: 36, start: b, dur: 0.45 }, { midi: 36, start: b + 1.5, dur: 0.4 }, { midi: 43, start: b + 2, dur: 0.45 }, { midi: 46, start: b + 3, dur: 0.4 }, { midi: 48, start: b + 3.5, dur: 0.4 },
          ...together([58, 63, 67], b + 0.5, 0.35), ...together([58, 63, 67], b + 2.5, 0.35),
          { midi: 67, start: b, dur: 0.45 }, { midi: 69, start: b + 1.5, dur: 0.9 }, { midi: 67, start: b + 2.5, dur: 0.4 }, { midi: 63, start: b + 3, dur: 0.4 }, { midi: 60, start: b + 3.5, dur: 0.4 },
        ]), tempo: 92 },
        keep: "Le 6 sur le contretemps : le dorien groove.",
      },
      {
        title: "Technique : le dorien sur l'instrument",
        paragraphs: [
          "Au clavier, do dorien a deux touches noires : mi♭ et si♭. Doigté de la main droite comme en do majeur : 1 2 3, le pouce passe sous la main pour fa, puis 1 2 3 4 5. Les chiffres du schéma sont les doigts.",
          "Joue-le lentement en disant les degrés, puis sur le bourdon. Ensuite, joue ré dorien sur les touches blanches et compare : même formule, autre tonique.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: up('dorien').map((m, i) => ({ midi: m, label: String([1, 2, 3, 1, 2, 3, 4, 5][i]), color: m === 69 ? GOLD : undefined })) },
        guitarIllustration: fb('dorien', ['6']),
        guitarParagraphs: [
          "Sur une corde, la formule se voit en cases : depuis do (corde de la, case 3), avance de 2, 1, 2, 2, 2, 1, 2 cases : 3, 5, 6, 8, 10, 12, 13, 15. Repère les trois tons d'affilée au milieu.",
          "Puis en position, un doigt par case autour de la case 3, comme sur le schéma. Le 6 (la), sur la corde de sol case 2, est la note à viser.",
        ],
        audio: { label: "Do dorien, montée et descente", notes: upDown('dorien', 60, 0, 0.6), tempo: 90 },
        guitarAudio: { label: "Do dorien, montée et descente", notes: upDown('dorien', 48, 0, 0.6), tempo: 90 },
        keep: "Joue en disant les degrés : le 6 doit sonner différent.",
      },
      {
        title: "L'accord du dorien",
        paragraphs: [
          "Le dorien se joue sur un accord mineur : do m7, ou mieux do m6, qui contient le 6. Le vamp typique alterne i et IV : do m7, puis fa 7. Fa 7 contient la, le 6 de do : l'accord dit déjà « dorien ».",
          "Sur un seul accord mineur qui dure longtemps, comme dans le jazz modal, le dorien est presque toujours le bon choix.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'do m7', sub: 'do · mi♭ · sol · si♭', color: VIOLET }, { title: 'fa 7', sub: 'fa · la · do · mi♭ · le la = 6 de do', color: GOLD }] },
        audio: { label: "Do m7, fa 7, do m7, fa 7", notes: chords([[48, 58, 63, 67], [41, 57, 60, 63], [48, 58, 63, 67], [41, 57, 60, 63]]), tempo: 84 },
        keep: "i m7 – IV 7 : le vamp dorien.",
      },
      {
        title: "Impro : question, réponse",
        paragraphs: [
          "Dans le perroquet, l'appli joue une phrase dorienne sur le bourdon et tu la rejoues. Ensuite, réponds-lui : une phrase plus simple, qui pose le 6 sur un temps fort et le tient.",
          "Écoute : la question court sur le mode, la réponse s'arrête sur la, puis rentre sur do.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Question', sub: 'l\'appli : une phrase dense' }, { title: 'Réponse', sub: 'toi : simple, le 6 tenu, fin sur 1', color: VIOLET }] },
        audio: { label: "Question, puis réponse en do dorien", notes: [...drone(8.5), ...seq([60, 62, 63, 65, 67, 65, 63, 62], 0.4), { midi: 67, start: 4, dur: 0.5 }, { midi: 69, start: 4.5, dur: 1.4 }, ...seq([67, 63], 0.5, 0, 6), { midi: 60, start: 7, dur: 1.2 }], tempo: 96 },
        keep: "Réponds simple : le 6 tenu, la fin sur 1.",
      },
    ],
    practice: [
      { domain: 'oreille', label: "Éolien ou dorien ?", templateId: 'OR-5-01', params: { questions: 5, modes: ['eolien', 'dorien'], apercus: true } },
      { domain: 'chant', label: "Chante 1 ♭3 5 6 5", templateId: 'OR-5-06', params: { tokens: ['1', 'b3', '5', '6', '5'], titre: 'le motif du dorien' } },
      { domain: 'technique', label: "Le dorien au clic", templateId: 'TE-5-01', params: { tokens: tokens('dorien'), tempo: 60 } },
      { domain: 'technique', label: "Le dorien sur une corde", templateId: 'TQ-1-01', params: { gamme: 'dorien' }, only: 'guitare' },
      { domain: 'technique', label: "Le dorien, guidé", templateId: 'TE-2-09', params: { gamme: 'dorien', position: 1, guide: 'complet', aller_retour: true } },
      { domain: 'theorie', label: "Gamme parente, formule, accord", templateId: 'TH-5-03', params: { questions: 6, types: ['parent', 'formule', 'accord'], modes: ['dorien', 'eolien', 'ionien', 'mixolydien'] } },
      { domain: 'impro', label: "Perroquet en dorien", templateId: 'IM-5-01', params: { nb_notes: 4, degres: degres('dorien') } },
    ],
    validation: { label: "Reconnaître le dorien sur un bourdon", templateId: 'OR-5-01', params: { questions: 6, modes: ['ionien', 'eolien', 'dorien'], apercus: false }, criterion: "5 bonnes réponses sur 6" },
  },
  // ------------------------------------------------------------------ 16 · mixolydien
  {
    id: 'mode_mixolydien', number: 16, palier: 5, conceptId: 'modes',
    title: "Le mixolydien, un majeur sans sensible",
    why: "Le mixolydien est le majeur du rock, du blues et des musiques irlandaises : un majeur détendu, terrien, qui ne tire pas vers l'octave. C'est aussi le mode de l'accord de 7, la dominante.",
    discover: {
      question: "Laquelle de ces deux phrases sonne la plus détendue, sans rien qui tire vers l'aigu ?",
      a: { notes: [...drone(6), ...seq([64, 65, 67, 69, 71, 72, 71, 67, 64, 60], 0.5)], tempo: 104 },
      b: { notes: [...drone(6), ...seq([64, 65, 67, 69, 70, 72, 70, 67, 64, 60], 0.5)], tempo: 104 }, answer: 'B',
      reveal: "B remplace si par si♭ : plus de sensible, cette note qui tirait vers do. La phrase reste majeure (mi, le 3), mais elle se détend. C'est le mixolydien.",
    },
    screens: [
      {
        title: "Un majeur avec un ♭7",
        paragraphs: [
          "Pars du majeur, 1 2 3 4 5 6 7, et baisse le 7 : 1 2 3 4 5 6 ♭7. C'est le mixolydien.",
          "Sans sensible, plus rien ne tire vers l'octave : le mode sonne posé, terrien. Écoute le majeur, puis le mixolydien : seul le si change.",
        ],
        illustration: kb('mixolydien', ['b7']),
        guitarIllustration: fb('mixolydien', ['b7']),
        guitarParagraphs: [
          "Pars du majeur, 1 2 3 4 5 6 7, et baisse le 7 : 1 2 3 4 5 6 ♭7. C'est le mixolydien.",
          "Sans sensible, plus rien ne tire vers l'octave. Depuis do (corde de la, case 3), le ♭7 est sur la corde de sol, case 3, juste avant l'octave. Écoute le majeur, puis le mixolydien.",
        ],
        audio: { label: "Do majeur, puis do mixolydien, sur un bourdon", notes: [...drone(9), ...seq(up('ionien'), 0.5), ...seq(up('mixolydien'), 0.5, 0, 4.5)], tempo: 110 },
        guitarAudio: { label: "Do majeur, puis do mixolydien, sur un bourdon", notes: [...drone(9, 36), ...seq(up('ionien', 48), 0.5), ...seq(up('mixolydien', 48), 0.5, 0, 4.5)], tempo: 110 },
        keep: "Mixolydien = majeur avec un ♭7.",
      },
      {
        title: "Sol mixolydien, do mixolydien",
        paragraphs: [
          "Sol mixolydien, ce sont les touches blanches de sol à sol. Do mixolydien, ce sont les notes de fa majeur depuis do : do, ré, mi, fa, sol, la, si♭.",
          "La formule, depuis la tonique : T T ½ T T ½ T. Elle ne diffère du majeur que par la dernière marche.",
        ],
        illustration: { kind: 'steps', notes: ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si♭', 'do'], steps: ['T', 'T', '½', 'T', 'T', '½', 'T'] },
        audio: { label: "Sol mixolydien, les touches blanches de sol à sol, sur un bourdon de sol", notes: [...drone(8, 43), ...seq([55, 57, 59, 60, 62, 64, 65, 67, 65, 64, 62, 60, 59, 57, 55], 0.5)], tempo: 110 },
        keep: "Formule : 1 2 3 4 5 6 ♭7, soit T T ½ T T ½ T.",
      },
      {
        title: "Oreille : un ton sous l'octave",
        paragraphs: [
          "Monte jusqu'à l'octave, puis redescends d'une note. En majeur, la chute est d'un demi-ton (do → si) : tendue, elle veut remonter. En mixolydien, d'un ton entier (do → si♭) : posée, sans attente.",
          "Chante ensuite l'arpège 1 3 5 ♭7, puis l'octave : c'est l'accord de 7 que porte le mode.",
        ],
        illustration: { kind: 'keyboard', from: 67, to: 72, names: true, marks: [{ midi: 72, label: '8' }, { midi: 71, label: '7' }, { midi: 70, label: '♭7', color: GOLD }], arcs: [{ a: 71, b: 72, label: '½' }, { a: 70, b: 72, label: 'T', color: GOLD }] },
        audio: { label: "do → si, puis do → si♭, puis 1 3 5 ♭7 8", notes: [...drone(8.5), ...seq([72, 71], 0.9, 0.1), ...seq([72, 70], 0.9, 0.1, 2.2), ...seq([60, 64, 67, 70, 72], 0.7, 0, 4.4)], tempo: 84 },
        keep: "Un ton sous l'octave : le ♭7 se pose au lieu de tirer.",
      },
      {
        title: "Rythme : le shuffle",
        paragraphs: [
          "Le mixolydien vit dans le shuffle du blues et du rock : chaque temps est coupé en longue-courte, comme un triolet dont on lie les deux premières notes.",
          "Écoute la basse boogie : do, mi, sol, la, si♭, la, sol, mi, en longue-courte. Le si♭ en haut du motif, c'est le ♭7.",
        ],
        illustration: { kind: 'pulseGrid', perBar: 4, bars: 1, subdiv: 3 },
        audio: { label: "Basse boogie en do mixolydien, en shuffle", notes: [0, 4].flatMap((b) => [36, 40, 43, 45, 46, 45, 43, 40].map((m, i) => ({ midi: m, start: b + Math.floor(i / 2) + (i % 2 ? 2 / 3 : 0), dur: i % 2 ? 0.3 : 0.6 }))), tempo: 100 },
        keep: "Longue-courte : le mixolydien swingue.",
      },
      {
        title: "Technique : le mixolydien sur l'instrument",
        paragraphs: [
          "Au clavier, do mixolydien n'a qu'une touche noire, si♭. Doigté de la main droite comme en do majeur : 1 2 3, le pouce passe sous la main pour fa, puis 1 2 3 4 5.",
          "Joue-le lentement en disant les degrés, puis compare avec do majeur : la main fait le même geste, un seul doigt change de touche.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: up('mixolydien').map((m, i) => ({ midi: m, label: String([1, 2, 3, 1, 2, 3, 4, 5][i]), color: m === 70 ? GOLD : undefined })) },
        guitarIllustration: fb('mixolydien', ['b7']),
        guitarParagraphs: [
          "Sur une corde, depuis do (corde de la, case 3) : 3, 5, 7, 8, 10, 12, 13, 15. Le mode finit par un ton, deux cases, pour rejoindre l'octave.",
          "En position, c'est la forme du majeur dont une seule note recule d'une case : le ♭7, sur la corde de sol, case 3 au lieu de 4.",
        ],
        audio: { label: "Do mixolydien, montée et descente", notes: upDown('mixolydien', 60, 0, 0.6), tempo: 90 },
        guitarAudio: { label: "Do mixolydien, montée et descente", notes: upDown('mixolydien', 48, 0, 0.6), tempo: 90 },
        keep: "La forme du majeur, le 7 abaissé d'un demi-ton.",
      },
      {
        title: "L'accord du mixolydien : le 7",
        paragraphs: [
          "Le mixolydien sonne chez lui sur un accord de 7 : do 7 (do, mi, sol, si♭), ou do 9. C'est logique : en fa majeur, do 7 est le V7, et do mixolydien, ce sont justement les notes de fa majeur depuis do.",
          "Dans le blues, les trois accords sont des 7 : do 7, fa 7, sol 7. Sur chacun, son propre mixolydien.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'do 7', sub: 'do · mi · sol · si♭', color: GOLD }, { title: 'Le blues', sub: 'I7 · IV7 · V7 : trois mixolydiens' }] },
        audio: { label: "Do 7, fa 7, do 7, sol 7, do 7", notes: chords([[48, 58, 64, 67], [41, 57, 60, 63], [48, 58, 64, 67], [43, 59, 62, 65], [48, 58, 64, 67]], 1.8), tempo: 92 },
        keep: "Accord de 7 = terrain du mixolydien.",
      },
      {
        title: "Impro : grave, puis aigu",
        paragraphs: [
          "Question : un riff grave sur do 7. Réponse : une phrase aiguë qui monte chercher le ♭7, le tient, puis retombe sur do.",
          "Écoute le riff, puis la réponse. Dans le perroquet, rejoue d'abord la phrase de l'appli, puis invente ta réponse sur le même modèle.",
        ],
        guitarParagraphs: [
          "Question : un riff grave sur do 7. Réponse : une phrase aiguë qui monte chercher le ♭7. À la guitare, on l'atteint volontiers en tirant la corde (bend) depuis le 6.",
          "Écoute le riff, puis la réponse. Dans le perroquet, rejoue d'abord la phrase de l'appli, puis invente ta réponse sur le même modèle.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Question', sub: 'un riff grave' }, { title: 'Réponse', sub: 'aiguë, le ♭7 tenu, fin sur 1', color: GOLD }] },
        audio: { label: "Riff grave, puis réponse aiguë en do mixolydien", notes: [...drone(8.5), ...seq([48, 52, 55, 57, 58, 57, 55, 52], 0.4), ...seq([67, 69], 0.5, 0, 4), { midi: 70, start: 5, dur: 1.2 }, ...seq([69, 67, 64], 0.4, 0, 6.3), { midi: 60, start: 7.5, dur: 1 }], tempo: 100 },
        keep: "Réponds dans l'aigu, vise le ♭7, finis sur 1.",
      },
    ],
    practice: [
      { domain: 'oreille', label: "Majeur ou mixolydien ?", templateId: 'OR-5-01', params: { questions: 5, modes: ['ionien', 'mixolydien'], apercus: true } },
      { domain: 'chant', label: "Chante 1 3 5 ♭7 8", templateId: 'OR-5-06', params: { tokens: ['1', '3', '5', 'b7', '8'], titre: 'l\'arpège du mixolydien' } },
      { domain: 'technique', label: "Le mixolydien au clic", templateId: 'TE-5-01', params: { tokens: tokens('mixolydien'), tempo: 60 } },
      { domain: 'technique', label: "Le mixolydien sur une corde", templateId: 'TQ-1-01', params: { gamme: 'mixolydien' }, only: 'guitare' },
      { domain: 'technique', label: "Le mixolydien, guidé", templateId: 'TE-2-09', params: { gamme: 'mixolydien', position: 1, guide: 'complet', aller_retour: true } },
      { domain: 'theorie', label: "Gamme parente, formule, accord", templateId: 'TH-5-03', params: { questions: 6, types: ['parent', 'formule', 'accord'], modes: ['mixolydien', 'dorien', 'ionien', 'eolien'] } },
      { domain: 'impro', label: "Perroquet en mixolydien", templateId: 'IM-5-01', params: { nb_notes: 4, degres: degres('mixolydien') } },
    ],
    validation: { label: "Reconnaître le mixolydien sur un bourdon", templateId: 'OR-5-01', params: { questions: 6, modes: ['ionien', 'mixolydien', 'dorien'], apercus: false }, criterion: "5 bonnes réponses sur 6" },
  },
  // ------------------------------------------------------------------ 17 · lydien
  {
    id: 'mode_lydien', number: 18, palier: 5, conceptId: 'modes',
    title: "Le lydien, un majeur qui flotte",
    why: "Le lydien est le plus lumineux des modes : un majeur dont le 4 monte d'un demi-ton. Il flotte au lieu de se poser ; les musiques de film l'aiment pour les images qui s'envolent.",
    discover: {
      question: "Laquelle de ces deux phrases semble flotter, sans se poser ?",
      a: { notes: [...drone(6), ...seq([60, 62, 64, 65, 67], 0.5), { midi: 65, start: 2.5, dur: 1.4 }, ...seq([64, 62, 60], 0.5, 0, 4)], tempo: 96 },
      b: { notes: [...drone(6), ...seq([60, 62, 64, 66, 67], 0.5), { midi: 66, start: 2.5, dur: 1.4 }, ...seq([64, 62, 60], 0.5, 0, 4)], tempo: 96 }, answer: 'B',
      reveal: "B monte le fa d'un demi-ton : fa♯, le ♯4. Au lieu de redescendre vers le 3, cette note reste en l'air au-dessus de la tonique. C'est le lydien.",
    },
    screens: [
      {
        title: "Un majeur avec un ♯4",
        paragraphs: [
          "Pars du majeur et monte le 4 d'un demi-ton : 1 2 3 ♯4 5 6 7. C'est le lydien.",
          "En majeur, le 4 veut descendre sur le 3. Le ♯4, lui, ne veut aller nulle part : il plane. Écoute le majeur, puis le lydien.",
        ],
        illustration: kb('lydien', ['#4']),
        guitarIllustration: fb('lydien', ['#4']),
        guitarParagraphs: [
          "Pars du majeur et monte le 4 d'un demi-ton : 1 2 3 ♯4 5 6 7. C'est le lydien.",
          "Depuis do (corde de la, case 3), le ♯4 est sur la corde de ré, case 4, une case après le fa. Écoute le majeur, puis le lydien.",
        ],
        audio: { label: "Do majeur, puis do lydien, sur un bourdon", notes: [...drone(9), ...seq(up('ionien'), 0.5), ...seq(up('lydien'), 0.5, 0, 4.5)], tempo: 110 },
        guitarAudio: { label: "Do majeur, puis do lydien, sur un bourdon", notes: [...drone(9, 36), ...seq(up('ionien', 48), 0.5), ...seq(up('lydien', 48), 0.5, 0, 4.5)], tempo: 110 },
        keep: "Lydien = majeur avec un ♯4.",
      },
      {
        title: "Fa lydien, do lydien",
        paragraphs: [
          "Fa lydien, ce sont les touches blanches de fa à fa. Do lydien, ce sont les notes de sol majeur depuis do : do, ré, mi, fa♯, sol, la, si.",
          "Formule : T T T ½ T T ½. Trois tons d'affilée au départ, c'est ce qui donne au mode son élan vers le haut.",
        ],
        illustration: { kind: 'steps', notes: ['do', 'ré', 'mi', 'fa♯', 'sol', 'la', 'si', 'do'], steps: ['T', 'T', 'T', '½', 'T', 'T', '½'] },
        audio: { label: "Fa lydien, les touches blanches de fa à fa, sur un bourdon de fa", notes: [...drone(8, 41), ...seq([53, 55, 57, 59, 60, 62, 64, 65, 64, 62, 60, 59, 57, 55, 53], 0.5)], tempo: 110 },
        keep: "Formule : 1 2 3 ♯4 5 6 7, soit T T T ½ T T ½.",
      },
      {
        title: "Oreille : un triton qui ne fait pas peur",
        paragraphs: [
          "De do à fa♯, il y a un triton, l'intervalle le plus instable. Pourtant, posé sur un accord majeur, il sonne céleste plutôt qu'inquiétant.",
          "Chante 1 2 3 ♯4 5, et attarde-toi sur le ♯4 : écoute-le planer au-dessus de l'accord.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 67, names: true, marks: [{ midi: 60, label: '1' }, { midi: 62, label: '2' }, { midi: 64, label: '3' }, { midi: 66, label: '♯4', color: GOLD }, { midi: 67, label: '5' }] },
        audio: { label: "Do maj7 tenu, et le fa♯ qui plane au-dessus", notes: [...together([48, 55, 59, 64], 0, 6), ...seq([72, 74, 76], 0.6), { midi: 78, start: 1.8, dur: 2.4 }, { midi: 79, start: 4.3, dur: 1.6 }], tempo: 72 },
        keep: "Sur un accord majeur, le ♯4 plane au lieu d'inquiéter.",
      },
      {
        title: "Rythme : des notes longues",
        paragraphs: [
          "Le lydien se prête mal au groove serré. On le joue lié, en notes longues, sur des accords tenus, comme une nappe.",
          "Écoute : quatre notes seulement, longues, et le ♯4 laissé en l'air à la fin.",
        ],
        illustration: { kind: 'pulseGrid', perBar: 4, bars: 2, subdiv: 1, plain: true },
        audio: { label: "Quatre notes longues en do lydien, sur un accord tenu", notes: [...together([48, 55, 59, 64], 0, 8), ...seq([67, 71, 74, 78], 2)], tempo: 80 },
        keep: "Le lydien respire : notes longues, liées.",
      },
      {
        title: "Technique : le lydien sur l'instrument",
        paragraphs: [
          "Au clavier, do lydien n'a qu'une touche noire, fa♯. Doigté de la main droite : 1 2 3 4 jusqu'au fa♯, puis le pouce passe sous la main pour sol, et 1 2 3 4 jusqu'à do. Les chiffres du schéma sont les doigts.",
          "Joue-le lentement en disant les degrés ; marque un léger appui sur le ♯4.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: up('lydien').map((m, i) => ({ midi: m, label: String([1, 2, 3, 4, 1, 2, 3, 4][i]), color: m === 66 ? GOLD : undefined })) },
        guitarIllustration: fb('lydien', ['#4']),
        guitarParagraphs: [
          "Sur une corde, depuis do (corde de la, case 3) : 3, 5, 7, 9, puis 10, 12, 14, 15. Trois tons d'affilée au départ, trois écarts de deux cases : c'est vertigineux.",
          "En position, c'est la forme du majeur dont une note avance d'une case : le ♯4, sur la corde de ré, case 4 au lieu de 3.",
        ],
        audio: { label: "Do lydien, montée et descente", notes: upDown('lydien', 60, 0, 0.6), tempo: 90 },
        guitarAudio: { label: "Do lydien, montée et descente", notes: upDown('lydien', 48, 0, 0.6), tempo: 90 },
        keep: "La forme du majeur, le 4 monté d'un demi-ton.",
      },
      {
        title: "L'accord du lydien : maj7♯11",
        paragraphs: [
          "Le lydien sonne sur un accord majeur 7, avec le ♯4 ajouté en haut : do maj7♯11 (le ♯11, c'est le ♯4 une octave plus haut). On l'entend sur l'accord final de morceaux de jazz, ou dans les génériques de film.",
          "Dans une tonalité, le lydien est le mode du IV : en sol majeur, do maj7 est l'accord IV, et ses notes sont celles de do lydien.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'do maj7♯11', sub: 'do · mi · sol · si · fa♯', color: GOLD }, { title: 'Le IV de sol', sub: 'do maj7 en sol majeur = do lydien' }] },
        audio: { label: "Do maj7, puis do maj7♯11", notes: [...together([48, 59, 64, 67], 0, 2.6), ...together([48, 59, 64, 67, 78], 3, 3.4)], tempo: 72 },
        keep: "maj7♯11 = l'accord du lydien.",
      },
      {
        title: "Impro : s'arrêter sur le ♯4",
        paragraphs: [
          "Question : une phrase liée, en notes voisines. Réponse : la même douceur, mais qui s'arrête net sur le ♯4, sans résoudre.",
          "D'habitude on finit sur 1. Ici, finir sur ♯4 assume la suspension : c'est tout l'effet du lydien.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Question', sub: 'liée, notes voisines' }, { title: 'Réponse', sub: 'finit sur le ♯4, en l\'air', color: GOLD }] },
        audio: { label: "Question, puis réponse qui s'arrête sur fa♯", notes: [...drone(9), ...seq([64, 66, 67, 69, 67, 66, 64, 62], 0.5), ...seq([67, 69, 71, 69, 67], 0.5, 0, 4.5), { midi: 66, start: 7, dur: 1.8 }], tempo: 96 },
        keep: "En lydien, on peut finir sur le ♯4.",
      },
    ],
    practice: [
      { domain: 'oreille', label: "Majeur ou lydien ?", templateId: 'OR-5-01', params: { questions: 5, modes: ['ionien', 'lydien'], apercus: true } },
      { domain: 'chant', label: "Chante 1 2 3 ♯4 5", templateId: 'OR-5-06', params: { tokens: ['1', '2', '3', '#4', '5'], titre: 'la montée du lydien' } },
      { domain: 'technique', label: "Le lydien au clic", templateId: 'TE-5-01', params: { tokens: tokens('lydien'), tempo: 60 } },
      { domain: 'technique', label: "Le lydien sur une corde", templateId: 'TQ-1-01', params: { gamme: 'lydien' }, only: 'guitare' },
      { domain: 'technique', label: "Le lydien, guidé", templateId: 'TE-2-09', params: { gamme: 'lydien', position: 1, guide: 'complet', aller_retour: true } },
      { domain: 'theorie', label: "Gamme parente, formule, accord", templateId: 'TH-5-03', params: { questions: 6, types: ['parent', 'formule', 'accord'], modes: ['lydien', 'mixolydien', 'ionien', 'dorien'] } },
      { domain: 'impro', label: "Perroquet en lydien", templateId: 'IM-5-01', params: { nb_notes: 4, degres: degres('lydien') } },
    ],
    validation: { label: "Reconnaître le lydien sur un bourdon", templateId: 'OR-5-01', params: { questions: 6, modes: ['ionien', 'lydien', 'mixolydien'], apercus: false }, criterion: "5 bonnes réponses sur 6" },
  },
  // ------------------------------------------------------------------ 18 · phrygien et locrien
  {
    id: 'mode_phrygien', number: 19, palier: 5, conceptId: 'modes',
    title: "Le phrygien et le locrien, les modes sombres",
    why: "Le phrygien est le mineur le plus sombre : son ♭2 pèse sur la tonique, du flamenco au metal. Le locrien, encore plus instable, sert surtout de passage. Cette leçon termine le tour des sept modes.",
    discover: {
      question: "Laquelle de ces deux phrases mineures sonne la plus sombre, la plus tendue ?",
      a: { notes: [...drone(5), ...seq([63, 62, 60, 62, 63, 65, 63, 62, 60], 0.5)], tempo: 100 },
      b: { notes: [...drone(5), ...seq([63, 61, 60, 61, 63, 65, 63, 61, 60], 0.5)], tempo: 100 }, answer: 'B',
      reveal: "B remplace ré par ré♭ : le ♭2, collé à la tonique, pèse sur elle à chaque passage. A est en éolien, B en phrygien.",
    },
    screens: [
      {
        title: "Un mineur avec un ♭2",
        paragraphs: [
          "Pars du mineur naturel, 1 2 ♭3 4 5 ♭6 ♭7, et baisse cette fois le 2 : 1 ♭2 ♭3 4 5 ♭6 ♭7. C'est le phrygien.",
          "Le ♭2, à un demi-ton de la tonique, l'écrase : un son sombre, tendu, qu'on associe au flamenco et au metal. Écoute l'éolien, puis le phrygien.",
        ],
        illustration: kb('phrygien', ['b2']),
        guitarIllustration: fb('phrygien', ['b2']),
        guitarParagraphs: [
          "Pars du mineur naturel, 1 2 ♭3 4 5 ♭6 ♭7, et baisse cette fois le 2 : 1 ♭2 ♭3 4 5 ♭6 ♭7. C'est le phrygien.",
          "Depuis do (corde de la, case 3), le ♭2 est juste à côté, case 4 : collé à la tonique. Écoute l'éolien, puis le phrygien.",
        ],
        audio: { label: "Do éolien, puis do phrygien, sur un bourdon", notes: [...drone(9), ...seq(up('eolien'), 0.5), ...seq(up('phrygien'), 0.5, 0, 4.5)], tempo: 110 },
        guitarAudio: { label: "Do éolien, puis do phrygien, sur un bourdon", notes: [...drone(9, 36), ...seq(up('eolien', 48), 0.5), ...seq(up('phrygien', 48), 0.5, 0, 4.5)], tempo: 110 },
        keep: "Phrygien = mineur naturel avec un ♭2.",
      },
      {
        title: "Mi phrygien, do phrygien",
        paragraphs: [
          "Mi phrygien, ce sont les touches blanches de mi à mi. Do phrygien, ce sont les notes de la♭ majeur depuis do : do, ré♭, mi♭, fa, sol, la♭, si♭.",
          "Formule : ½ T T T ½ T T. Le mode commence par un demi-ton, et c'est tout son caractère.",
        ],
        illustration: { kind: 'steps', notes: ['do', 'ré♭', 'mi♭', 'fa', 'sol', 'la♭', 'si♭', 'do'], steps: ['½', 'T', 'T', 'T', '½', 'T', 'T'] },
        audio: { label: "Mi phrygien, les touches blanches de mi à mi, sur un bourdon de mi", notes: [...drone(8, 40), ...seq([52, 53, 55, 57, 59, 60, 62, 64, 62, 60, 59, 57, 55, 53, 52], 0.5)], tempo: 110 },
        keep: "Formule : 1 ♭2 ♭3 4 5 ♭6 ♭7, soit ½ T T T ½ T T.",
      },
      {
        title: "Oreille : le demi-ton qui pèse",
        paragraphs: [
          "Alterne la tonique et le ♭2, juste au-dessus : 1 ♭2 1 ♭2. C'est la tension la plus immédiate qui soit, celle du célèbre motif de film de requin.",
          "Chante 1 ♭2 1, lentement, sur le bourdon : sens le ♭2 retomber sur la tonique.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 64, names: true, marks: [{ midi: 60, label: '1' }, { midi: 61, label: '♭2', color: GOLD }, { midi: 63, label: '♭3' }], arcs: [{ a: 60, b: 61, label: '½', color: GOLD }] },
        audio: { label: "1 ♭2, lentement, puis de plus en plus vite", notes: [...drone(7, 36), ...seq([48, 49, 48, 49], 0.9, 0.1), ...seq([48, 49, 48, 49, 48, 49], 0.4, 0.05, 4), { midi: 48, start: 6.7, dur: 0.8 }], tempo: 84 },
        keep: "1 ♭2 1 : la signature du phrygien.",
      },
      {
        title: "Rythme : le galop",
        paragraphs: [
          "Le phrygien appelle des rythmes serrés : le galop du metal (une croche, deux doubles croches) ou le rasgueado du flamenco.",
          "Écoute le galop sur do, avec le ♭2 en accent sur le dernier temps de chaque mesure.",
        ],
        illustration: { kind: 'pulseGrid', perBar: 4, bars: 1, subdiv: 4 },
        audio: { label: "Galop sur do, le ♭2 au 4e temps", notes: [0, 4].flatMap((b) => [0, 1, 2, 3].flatMap((k) => [0, 0.5, 0.75].map((o) => ({ midi: k === 3 ? 49 : 48, start: b + k + o, dur: o ? 0.22 : 0.45 })))), tempo: 110 },
        keep: "Galop serré, ♭2 en accent.",
      },
      {
        title: "Technique : le phrygien sur l'instrument",
        paragraphs: [
          "Au clavier, do phrygien a quatre touches noires : ré♭, mi♭, la♭, si♭. Doigté de la main droite comme en do majeur : 1 2 3, le pouce passe sous la main pour fa, puis 1 2 3 4 5.",
          "Joue-le lentement en disant les degrés ; pose bien le ♭2, puis retombe sur 1.",
        ],
        illustration: { kind: 'keyboard', from: 60, to: 72, names: true, marks: up('phrygien').map((m, i) => ({ midi: m, label: String([1, 2, 3, 1, 2, 3, 4, 5][i]), color: m === 61 ? GOLD : undefined })) },
        guitarIllustration: fb('phrygien', ['b2']),
        guitarParagraphs: [
          "Sur une corde, depuis do (corde de la, case 3) : 3, 4, 6, 8, 10, 11, 13, 15. Le ♭2 est collé à la fondamentale, une seule case : très visible.",
          "En position, l'index et le majeur travaillent dès le départ (cases 3 et 4) : un bon exercice d'indépendance des doigts.",
        ],
        audio: { label: "Do phrygien, montée et descente", notes: upDown('phrygien', 60, 0, 0.6), tempo: 90 },
        guitarAudio: { label: "Do phrygien, montée et descente", notes: upDown('phrygien', 48, 0, 0.6), tempo: 90 },
        keep: "Le ♭2 à un demi-ton, une case : on le voit et on l'entend.",
      },
      {
        title: "L'accord du phrygien : ♭II → i",
        paragraphs: [
          "Le phrygien sonne sur un accord mineur, avec le ♭2 au-dessus. Sa signature : l'accord majeur un demi-ton au-dessus de la tonique, ré♭ sur do, qui retombe sur do mineur.",
          "C'est aussi le cœur de la cadence andalouse du flamenco : la m, sol, fa, mi, qui se pose sur mi, en mi phrygien.",
        ],
        illustration: { kind: 'cards', items: [{ title: '♭II → i', sub: 'ré♭ → do m', color: GOLD }, { title: 'Cadence andalouse', sub: 'la m · sol · fa · mi' }] },
        audio: { label: "Ré♭ → do m, deux fois, puis la m, sol, fa, mi", notes: [...chords([[49, 61, 65, 68], [48, 60, 63, 67], [49, 61, 65, 68], [48, 60, 63, 67]], 1.6), ...chords([[45, 60, 64, 69], [43, 59, 62, 67], [41, 57, 60, 65], [40, 56, 59, 64]], 1.6, 6.8)], tempo: 84 },
        keep: "Un accord un demi-ton au-dessus, qui retombe : c'est phrygien.",
      },
      {
        title: "Le locrien, le mode instable",
        paragraphs: [
          "Septième et dernier mode : le locrien, depuis si dans do majeur. Formule : 1 ♭2 ♭3 4 ♭5 ♭6 ♭7. Sa quinte est diminuée : entre 1 et ♭5, un triton. C'est le seul des sept modes dont la quinte n'est pas juste : sans elle, la tonique ne tient plus, d'où son statut à part.",
          "On l'utilise rarement pour un morceau entier. Il sert surtout sur l'accord m7♭5, le ii du ii-V-i mineur : si m7♭5, mi 7, la m.",
        ],
        illustration: kb('locrien', ['b2', 'b5']),
        guitarIllustration: fb('locrien', ['b2', 'b5']),
        audio: { label: "Do locrien sur la tonique seule, puis si m7♭5, mi 7, la m", notes: [...drone(4.4, 48, 0, false), ...seq(up('locrien'), 0.5), ...chords([[47, 57, 62, 65], [40, 56, 59, 62], [45, 57, 60, 64]], 1.8, 4.8)], tempo: 100 },
        keep: "Locrien : ♭2 et ♭5, un mode de passage, sur m7♭5.",
      },
      {
        title: "Du plus clair au plus sombre",
        paragraphs: [
          "Range les sept modes du plus lumineux au plus sombre : à chaque marche, une seule note descend d'un demi-ton. Lydien (♯4) → ionien (4) → mixolydien (♭7) → dorien (♭3) → éolien (♭6) → phrygien (♭2) → locrien (♭5).",
          "Tu as maintenant toute la palette. Le bon réflexe en écoutant : la tierce d'abord (majeur ou mineur), puis la note qui colore.",
        ],
        illustration: { kind: 'cards', items: [{ title: 'Lydien', sub: 'majeur + ♯4', color: GOLD }, { title: 'Ionien', sub: 'le majeur' }, { title: 'Mixolydien', sub: 'majeur + ♭7', color: GOLD }, { title: 'Dorien', sub: 'mineur + 6', color: VIOLET }, { title: 'Éolien', sub: 'le mineur naturel' }, { title: 'Phrygien', sub: 'mineur + ♭2', color: VIOLET }, { title: 'Locrien', sub: '♭2 et ♭5' }] },
        keep: "Une note qui descend à chaque marche, du lydien au locrien.",
      },
    ],
    practice: [
      { domain: 'oreille', label: "Éolien ou phrygien ?", templateId: 'OR-5-01', params: { questions: 5, modes: ['eolien', 'phrygien'], apercus: true } },
      { domain: 'chant', label: "Chante 1 ♭2 1 ♭3 1", templateId: 'OR-5-06', params: { tokens: ['1', 'b2', '1', 'b3', '1'], titre: 'le demi-ton du phrygien' } },
      { domain: 'technique', label: "Le phrygien au clic", templateId: 'TE-5-01', params: { tokens: tokens('phrygien'), tempo: 60 } },
      { domain: 'technique', label: "Le phrygien sur une corde", templateId: 'TQ-1-01', params: { gamme: 'phrygien' }, only: 'guitare' },
      { domain: 'technique', label: "Le phrygien, guidé", templateId: 'TE-2-09', params: { gamme: 'phrygien', position: 1, guide: 'complet', aller_retour: true } },
      { domain: 'theorie', label: "Les sept modes : décalage, parente, accord", templateId: 'TH-5-03', params: { questions: 8 } },
      { domain: 'impro', label: "Perroquet en phrygien", templateId: 'IM-5-01', params: { nb_notes: 4, degres: degres('phrygien') } },
    ],
    validation: { label: "Reconnaître les modes mineurs sur un bourdon", templateId: 'OR-5-01', params: { questions: 6, modes: ['eolien', 'dorien', 'phrygien'], apercus: false }, criterion: "5 bonnes réponses sur 6" },
  },
];
