// « À toi d'essayer » : dans chaque leçon, une étape où l'élève trouve avec ses mains ou son oreille avant qu'on lui
// donne le nom. Rattachée à l'écran qui nomme ce que l'élève vient de trouver (par son titre).
// Repères : do du milieu = 60 (do4) ; ré 62, mi 64, fa 65, sol 67, la 69, si 71, do 72.
import type { LessonTry } from './types';

export interface TryStep { screen: string; try: LessonTry }

export const TRIES: Record<string, TryStep[]> = {
  fondations: [{
    screen: 'La plus petite marche : le demi-ton',
    try: {
      kind: 'play', target: [64, 65, 65, 67], guitarTarget: [45, 46, 46, 48],
      prompt: 'Joue mi puis fa, puis fa puis sol. Laquelle des deux marches est la plus petite ?',
      guitarPrompt: 'Sur la corde de la : case 0 puis case 1, puis case 1 puis case 3. Laquelle des deux marches est la plus petite ?',
      success: 'La première est la plus serrée (deux touches voisines, deux cases voisines) : un demi-ton. La seconde en fait deux : un ton.',
    },
  }],
  mesure: [{
    screen: 'Les temps forts : la mesure',
    try: {
      kind: 'tap', tempo: 80, perBar: 4, onsets: [0, 4, 8, 12],
      prompt: 'Le clic compte 1 2 3 4. Tape seulement sur le 1 de chaque mesure (le clic plus fort).',
      success: 'Le 1 revient toutes les quatre pulsations : c\'est lui qui dessine la mesure.',
    },
  }],
  gamme_majeure: [{
    screen: 'Les sept notes',
    try: {
      kind: 'play', target: [60, 62, 64, 65, 67, 69, 71, 72],
      prompt: 'Joue les touches blanches de do jusqu\'au do suivant, une par une. Écoute la petite mélodie que ça fait.',
      guitarPrompt: 'Joue do ré mi fa sol la si do (do : corde de la, case 3). Écoute la petite mélodie que ça fait.',
      success: 'Do ré mi fa sol la si do : la gamme de do majeur, le « do-ré-mi » que tout le monde connaît.',
    },
  }, {
    screen: 'Et si on part de sol ?',
    try: {
      kind: 'play', target: [67, 69, 71, 72, 74, 76, 78, 79],
      prompt: 'Pars de sol et monte jusqu\'au sol suivant pour que ça sonne exactement comme do-ré-mi. Une note ne va pas : laquelle faut-il changer ?',
      success: 'Il faut fa♯ au lieu de fa : sinon l\'avant-dernière marche est trop grande. La formule de la gamme décide des altérations.',
    },
  }],
  degres: [{
    screen: 'Stables et instables',
    try: {
      kind: 'play', drone: 48, allowed: [0, 2, 4, 5, 7, 9, 11], minNotes: 7,
      prompt: 'Sur le bourdon de do, joue chaque note de la gamme, lentement. Lesquelles sonnent posées ? Lesquelles ont envie de bouger ?',
      success: 'Do, mi et sol sonnent posés : ce sont les notes stables. Les autres (surtout si et fa) tirent vers une voisine.',
    },
  }],
  portee: [{
    screen: 'Et sur ton instrument',
    try: {
      kind: 'play', target: [64, 67, 71],
      prompt: 'En clé de sol, la 1re ligne est mi, la 2e sol, la 3e si. Joue ces trois notes, de bas en haut.',
      success: 'Mi, sol, si : d\'une ligne à la suivante, on saute toujours une note.',
    },
  }],
  intervalles: [{
    screen: 'La qualité compte les demi-tons',
    try: {
      kind: 'play', target: [60, 64],
      prompt: 'Joue do, puis la note quatre demi-tons plus haut (compte chaque touche, noires comprises).',
      guitarPrompt: 'Joue do (corde de la, case 3), puis la note quatre cases plus loin sur la même corde.',
      success: 'Do → mi : quatre demi-tons, une tierce majeure. Le nom (tierce) compte les notes, la qualité (majeure) compte les demi-tons.',
    },
  }],
  accords: [{
    screen: 'Une note sur deux',
    try: {
      kind: 'build', target: [0, 4, 7],
      prompt: 'Dans la gamme de do, prends une note sur deux en partant de do : do, (ré), mi, (fa), sol. Choisis ces trois notes.',
      success: 'Do, mi, sol : l\'accord de do majeur. Deux tierces empilées.',
    },
  }],
  armure: [{
    screen: 'Les altérations viennent de la formule',
    try: {
      kind: 'play', target: [62, 64, 66, 67, 69, 71, 73, 74],
      prompt: 'Pars de ré et joue une gamme majeure, qui sonne comme do-ré-mi. Quelles notes noires te faut-il ?',
      guitarPrompt: 'Pars de ré (corde de ré à vide) et joue une gamme majeure, qui sonne comme do-ré-mi. Quelles notes altérées te faut-il ?',
      success: 'Fa♯ et do♯ : deux dièses. C\'est exactement l\'armure de ré majeur.',
    },
  }],
  pentatonique: [{
    screen: 'Cinq notes',
    try: {
      kind: 'play', drone: 48, allowed: [0, 2, 4, 7, 9], minNotes: 10,
      prompt: 'Improvise avec les cinq notes en couleur, sur le bourdon. Joue ce que tu veux, dans l\'ordre que tu veux.',
      success: 'Aucune ne sonne faux : sans le 4 ni le 7, il n\'y a plus de demi-ton qui frotte. C\'est la pentatonique.',
    },
  }],
  mineurs: [{
    screen: 'Le mineur naturel',
    try: {
      kind: 'play', target: [57, 59, 60, 62, 64, 65, 67, 69],
      prompt: 'Joue les notes de do majeur, mais de la jusqu\'au la suivant. Écoute la couleur.',
      success: 'Plus sombre : c\'est la mineur naturel. Les mêmes notes que do majeur, avec une autre maison.',
    },
  }],
  accords_gamme: [{
    screen: 'Les sept accords de la gamme',
    try: {
      kind: 'build', target: [2, 5, 9],
      prompt: 'Construis l\'accord de ré avec une note sur deux de la gamme de do : ré, fa, la. Écoute : majeur ou mineur ?',
      success: 'Ré, fa, la : ré mineur, sa tierce du bas est mineure. Dans la gamme majeure, I, IV et V sont majeurs ; ii, iii et vi sont mineurs.',
    },
  }],
  syncopes: [{
    screen: 'La syncope : frapper entre les temps',
    try: {
      kind: 'tap', tempo: 76, perBar: 4, onsets: [0, 1.5, 2, 3, 4, 5.5, 6, 7],
      prompt: 'Tape : 1, « et » du 2, 3, 4. Le 2e coup tombe entre deux clics.',
      success: 'Le coup qui tombe sur le « et », c\'est la syncope : il bouscule la pulsation et donne envie de bouger.',
    },
  }],
  quintes: [{
    screen: 'La quinte qui tombe',
    try: {
      kind: 'play', target: [67, 60],
      prompt: 'Joue sol, puis le do juste en dessous. Écoute : est-ce que ça sonne comme une fin ?',
      success: 'Oui : de 5 à 1, la quinte qui tombe. C\'est le mouvement le plus fort vers la maison.',
    },
  }],
  ii_v_i: [{
    screen: 'Une tierce de plus : l\'accord de 7e',
    try: {
      kind: 'build', target: [0, 4, 7, 11],
      prompt: 'Sur do, mi, sol, empile encore une tierce de la gamme de do. Quelle note s\'ajoute ? Choisis les quatre notes.',
      success: 'Si : do, mi, sol, si, l\'accord de do majeur 7. Une couleur plus douce, plus « jazz ».',
    },
  }],
  swing: [{
    screen: 'Le swing : longue, courte',
    try: {
      kind: 'tap', tempo: 90, perBar: 4, onsets: [0, 0.67, 1, 1.67, 2, 2.67, 3, 3.67],
      prompt: 'Tape deux coups par clic, le premier long, le second court : « dou-ba, dou-ba ».',
      success: 'Longue, courte : c\'est le swing. Les croches ne sont plus égales, elles se balancent.',
    },
  }],
  cle_fa: [{
    screen: 'Fa sur la 4e ligne',
    try: {
      kind: 'play', target: [53, 57, 50],
      prompt: 'En clé de fa, la 4e ligne est le fa sous le do du milieu. Joue ce fa, puis la note de la 5e ligne (la), puis celle de la 3e (ré).',
      success: 'Fa, la, ré : comme en clé de sol, on saute une note d\'une ligne à l\'autre.',
    },
  }],
  modes: [{
    screen: 'Les mêmes notes, une autre maison',
    try: {
      kind: 'play', drone: 50, target: [62, 64, 65, 67, 69, 71, 72, 74],
      prompt: 'Sur le bourdon de ré, joue les notes de do majeur, de ré jusqu\'au ré suivant. Ça sonne comme do majeur ?',
      success: 'Pas du tout : les notes de do, avec ré pour maison. C\'est ré dorien, un mode.',
    },
  }],
  mode_dorien: [{
    screen: 'Oreille : le 5 et le 6 qui se frottent',
    try: {
      kind: 'play', drone: 50, target: [69, 71, 69],
      prompt: 'Sur le bourdon de ré, joue la, si, la. Écoute le si.',
      success: 'Le si est le 6 majeur : c\'est lui qui éclaire ce mineur. Le dorien, c\'est un mineur avec un 6.',
    },
  }],
  mode_mixolydien: [{
    screen: 'Oreille : un ton sous l\'octave',
    try: {
      kind: 'play', drone: 43, target: [65, 67],
      prompt: 'Sur le bourdon de sol, joue fa puis sol. Combien de demi-tons entre les deux ?',
      success: 'Deux : un ton sous la maison, pas de sensible. Le mixolydien, c\'est un majeur avec un ♭7.',
    },
  }],
  impaires: [{
    screen: 'Penser en groupes : 3 + 2',
    try: {
      kind: 'tap', tempo: 100, perBar: 5, onsets: [0, 3, 5, 8],
      prompt: 'Le clic compte 5 temps. Tape seulement le début de chaque groupe : 1 2 3 · 1 2.',
      success: 'Trois, puis deux : penser en groupes rend la mesure à 5 temps naturelle.',
    },
  }],
  emprunts: [{
    screen: 'La maison reste, la couleur change',
    try: {
      kind: 'build', target: [5, 8, 0],
      prompt: 'En do majeur, l\'accord IV est fa, la, do. Baisse le la d\'un demi-ton : choisis fa, la♭, do.',
      success: 'Fa mineur : l\'accord iv, emprunté à do mineur. La maison ne change pas, la couleur devient nostalgique.',
    },
  }],
  mode_lydien: [{
    screen: 'Oreille : un triton qui ne fait pas peur',
    try: {
      kind: 'play', drone: 41, target: [71, 72],
      prompt: 'Sur le bourdon de fa, joue si puis do. Écoute le si.',
      success: 'Le si est le ♯4 : il flotte au-dessus de la maison au lieu de retomber. Le lydien, c\'est un majeur avec un ♯4.',
    },
  }],
  mode_phrygien: [{
    screen: 'Oreille : le demi-ton qui pèse',
    try: {
      kind: 'play', drone: 40, target: [65, 64],
      prompt: 'Sur le bourdon de mi, joue fa puis mi. Écoute le fa.',
      success: 'Le fa est le ♭2, un demi-ton au-dessus de la maison : il pèse sur elle. C\'est la couleur du phrygien.',
    },
  }],
};

export const triesFor = (lessonId: string, screenTitle: string) => (TRIES[lessonId] ?? []).filter((x) => x.screen === screenTitle).map((x) => x.try);
