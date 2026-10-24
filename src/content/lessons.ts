// Points de leçon : un sujet précis, 2 à 4 écrans courts, un exemple à écouter, une astuce pour l'exercice.
// Chaque exercice est relié à 1 ou 2 points (voir consignes.ts) : montrés la 1re fois, et toujours accessibles
// depuis la consigne, après une erreur, et depuis la fiche de l'exercice dans l'arbre.
import type { LessonStep, NoteEvent } from './types';

export interface LessonPoint { id: string; title: string; steps: LessonStep[]; astuce: string }

const q = (midis: number[], dur = 1): NoteEvent[] => midis.map((midi, i) => ({ midi, start: i * dur, dur }));
const ex = (label: string, notes: NoteEvent[], tempo = 80) => ({ label, notes, tempo });
const seq = (pairs: [number, number][]): NoteEvent[] => { let t = 0; return pairs.map(([midi, dur]) => { const n = { midi, start: t, dur }; t += dur; return n; }); };
const CLIC = 84;

const P: LessonPoint[] = [
  // ---------------- RYTHME ----------------
  { id: 'pulsation', title: 'La pulsation et le tempo', astuce: 'Ne tape pas sur les notes de la mélodie : tape le battement régulier qui est dessous, comme ton pied.', steps: [
    { text: 'Sous toute musique bat un pouls régulier : la pulsation. C\'est ce que ton pied suit sans y penser.', example: ex('Une mélodie et sa pulsation', [...seq([[67, 0.5], [69, 0.5], [67, 1], [64, 1], [62, 0.5], [64, 0.5]]), ...q([CLIC, CLIC, CLIC, CLIC]).map((n) => ({ ...n, dur: 0.1 }))], 90) },
    { text: 'Le tempo dit combien de battements passent en une minute (BPM). 60 BPM = un battement par seconde ; 120 BPM = deux fois plus vite.' },
    { text: 'Rapide ou lent, c\'est le tempo qui change ; la pulsation, elle, reste toujours régulière.' },
  ] },
  { id: 'figures', title: 'Noire, blanche, soupir', astuce: 'Associe un mot à chaque figure : « ta » pour la noire, « taa-a » pour la blanche, « chut » pour le soupir.', steps: [
    { notation: ['noire', 'noire', 'noire', 'noire'], text: 'La noire (tête pleine + hampe) dure 1 temps. Dis « ta ».', example: ex('4 noires', q([72, 72, 72, 72])) },
    { notation: ['blanche', 'blanche'], text: 'La blanche (tête vide + hampe) dure 2 temps. Dis « taa-a » : la note continue pendant le 2e temps.', example: ex('2 blanches', q([72, 72], 2)) },
    { notation: ['noire', 'soupir', 'noire', 'soupir'], text: 'Le soupir (le petit zigzag) est un silence d\'1 temps : il compte, mais on ne joue rien. Dis « chut ».' },
  ] },
  { id: 'lire_rythme', title: 'Lire et taper un rythme', astuce: 'Compte « 1 2 3 4 » à voix haute pendant le décompte et continue pendant tout le rythme.', steps: [
    { text: 'Avant de commencer, l\'appli joue un décompte : 4 clics (ou 3 en valse). Il te donne la vitesse. Tu tapes juste après.' },
    { notation: ['noire', 'noire', 'blanche'], text: 'Tape une fois au début de chaque note. Pour une blanche, tape une fois puis attends le temps suivant sans taper.' },
    { text: 'Sur un soupir, ne tape pas, mais continue de compter dans ta tête : le temps passe quand même.' },
  ] },
  { id: 'perroquet_rythme', title: 'Répéter un rythme', astuce: 'Redis le rythme avec des syllabes (« ta ta taa ») avant de le taper : si tu peux le dire, tu peux le taper.', steps: [
    { text: 'Écoute le rythme jusqu\'au bout sans taper. Garde-le en tête.' },
    { text: 'Redis-le à mi-voix avec « ta » et « ti-ti », puis tape-le sur le grand rond. Tu commences quand tu veux : c\'est l\'écart entre les coups qui compte.' },
    { text: 'Compte les coups : le nombre de frappes doit être le même que dans le modèle.' },
  ] },
  { id: 'croches', title: 'Les croches', astuce: 'Pour une paire de croches, tape deux fois dans le même temps : « ti-ti ».', steps: [
    { notation: ['noire', 'croches', 'noire', 'croches'], text: 'Une croche dure un demi-temps. On les trouve souvent par deux, reliées par une barre : deux croches = une noire.', example: ex('noire, 2 croches, noire, 2 croches', seq([[72, 1], [72, 0.5], [72, 0.5], [72, 1], [72, 0.5], [72, 0.5]])) },
    { text: 'Dis « ta » pour une noire et « ti-ti » pour deux croches. Le « ti-ti » tient exactement dans un battement.' },
  ] },
  { id: 'mesure_3', title: 'La mesure à 3 temps', astuce: 'Compte « 1 2 3, 1 2 3 » en appuyant sur le 1.', steps: [
    { notation: ['noire', 'noire', 'noire', 'blanche', 'noire'], text: 'Une mesure regroupe les temps. En 3/4, il y a 3 temps par mesure : FORT-faible-faible. C\'est la valse.', example: ex('Valse : boum-tchi-tchi', seq([[48, 1], [64, 1], [64, 1], [48, 1], [64, 1], [64, 1]]), 120) },
    { text: 'Dans cet exercice, le décompte a 3 clics et les barres de mesure tombent tous les 3 temps.' },
  ] },
  { id: 'anacrouse', title: 'La levée (anacrouse)', astuce: 'Pendant le décompte, compte « 1 2 3 » puis tape tout de suite sur le « 4 » : c\'est la levée.', steps: [
    { text: 'Certaines mélodies commencent avant le 1er temps de la mesure, sur une note d\'élan : la levée. « Joyeux an-ni-ver-saire » commence ainsi.' },
    { text: 'Ici, le décompte n\'a que 3 clics : la 1re note tombe à la place du 4e clic, juste avant la barre de mesure.' },
  ] },
  { id: 'strumming', title: 'Gratter en rythme', astuce: 'Garde ta main en mouvement continu : vers le bas sur les temps, vers le haut entre les temps.', steps: [
    { text: 'À la guitare, on accompagne en grattant les cordes. La main descend sur chaque temps.' },
    { text: 'Pour des croches, la main fait aller-retour : bas sur le temps, haut entre deux temps. Ici, tape une fois par coup de main.' },
  ] },
  { id: 'silences_phrases', title: 'Phrases et silences', astuce: 'Les silences se comptent comme des notes : ne les raccourcis pas.', steps: [
    { text: 'Une phrase musicale respire : elle joue, puis se tait. Le silence fait partie du rythme.' },
    { text: 'Écoute bien où tombent les silences, puis reproduis-les : une frappe trop tôt après un silence est une erreur de rythme.' },
  ] },

  // ---------------- OREILLE ----------------
  { id: 'grave_aigu', title: 'Grave et aigu', astuce: 'Chante les deux notes : si ta voix monte, la 2e note est plus aiguë.', steps: [
    { text: 'Un son aigu est « haut », un son grave est « bas ». On dit qu\'une mélodie monte quand elle va vers l\'aigu.', example: ex('Ça monte, puis ça descend', seq([[60, 1], [67, 1.5], [67, 1], [60, 1.5]]), 70) },
    { text: 'Plus deux notes sont proches, plus c\'est difficile : commence par écouter la direction, pas la distance.' },
  ] },
  { id: 'meme_note', title: 'Même note ou différente ?', astuce: 'Chante la 1re note et garde-la pendant la 2e : si ça « frotte », elles sont différentes.', steps: [
    { text: 'Deux notes identiques se fondent l\'une dans l\'autre. Deux notes très proches donnent un léger frottement.', example: ex('Pareil, puis différent', seq([[64, 1], [64, 1.5], [64, 1], [65, 1.5]]), 70) },
  ] },
  { id: 'chanter_juste', title: 'Chanter juste', astuce: 'Glisse ta voix lentement en écoutant ta voix ET la note : quand le battement ralentit puis disparaît, tu es juste.', steps: [
    { text: 'Deux notes presque pareilles « battent » : un tremblement qui ralentit à mesure qu\'elles se rapprochent, puis disparaît quand elles sont identiques. C\'est ce que tu cherches en chantant.', example: ex('Le battement ralentit puis disparaît', [{ midi: 60, start: 0, dur: 2.5 }, { midi: 60.35, start: 0, dur: 2.5 }, { midi: 60, start: 3, dur: 2.5 }, { midi: 60.12, start: 3, dur: 2.5 }, { midi: 60, start: 6, dur: 2.5 }, { midi: 60, start: 6, dur: 2.5 }], 60) },
    { text: 'Écoute la note, puis imagine-la dans ta tête avant de chanter. Ensuite fredonne-la doucement.' },
    { text: 'Tu peux chanter à l\'octave qui t\'arrange (plus grave ou plus aiguë) : c\'est la même note.' },
    { text: 'Tiens la note environ une seconde, bien stable : l\'appli valide toute seule. Si tu rates, une aiguille t\'aide ensuite : « monte » ou « descends ».' },
  ] },
  { id: 'tonique', title: 'La tonique, la maison', astuce: 'La tonique est souvent la 1re et la dernière note d\'une mélodie : écoute la fin.', steps: [
    { text: 'Dans une mélodie, une note sonne comme le « chez soi » : la tonique, qu\'on appelle 1. Une mélodie qui finit sur 1 sonne terminée.', example: ex('Finie sur 1', q([64, 62, 60])) },
    { text: 'Une mélodie qui s\'arrête ailleurs laisse une impression de suspens, comme une phrase sans point.', example: ex('Pas finie', q([60, 62, 64, 62])) },
    { text: 'Avant les exercices d\'oreille, l\'appli joue un petit accord : il installe la maison. Mémorise ce son.' },
  ] },
  { id: 'degres_123', title: 'Les degrés 1, 2, 3', astuce: 'Si tu hésites : chante la note, puis redescends la gamme jusqu\'à 1 en comptant chaque note (la note de départ et le 1 compris). Le nombre obtenu est le degré.', steps: [
    { text: 'Les degrés numérotent les notes à partir de la tonique : 1 est la maison, 2 la marche au-dessus, 3 la suivante.', example: ex('1-2-3-2-1', q([60, 62, 64, 62, 60]), 90) },
    { text: 'Au piano en do : 1 = do, 2 = ré, 3 = mi. À la guitare en la : 1 = corde de la à vide, 2 = case 2, 3 = case 4.' },
    { text: 'Les chiffres sur le clavier et sur le manche de l\'appli sont ces degrés.' },
    { text: 'Chaque degré a sa couleur sur fond de tonique : 1 est le repos complet ; 2 est clair, neutre, un peu cristallin ; 3 est chaud et lumineux. Écoute la sensation, pas la hauteur : elle reste la même dans toutes les octaves.' },
  ] },
  { id: 'dictee', title: 'Faire une dictée', astuce: 'Chante la mélodie avant d\'écrire : on retient mieux ce qu\'on a chanté.', steps: [
    { text: 'Méthode en 3 temps. Un : trouve la 1re note en la comparant à la tonique (souvent 1).' },
    { text: 'Deux : pour chaque note suivante, demande-toi si ça monte, descend ou reste, et de combien de marches.' },
    { text: 'Trois : touche les degrés dans l\'ordre sur le pavé, puis chante ta réponse pour vérifier. ⌫ efface la dernière note.' },
  ] },
  { id: 'degres_15', title: 'Les degrés 4 et 5', astuce: 'Chaque degré a sa couleur : 1 repose, 5 appelle la maison. En cas de doute, redescends jusqu\'à 1 en comptant les notes.', steps: [
    { text: 'On ajoute deux marches : 4 et 5. Au piano en do : fa et sol.', example: ex('1-2-3-4-5', q([60, 62, 64, 65, 67]), 100) },
    { text: 'Le 5 est le tremplin : il crée une attente qui se résout sur 1.', example: ex('5 → 1', q([67, 60], 1.5), 70) },
    { text: 'Leurs couleurs : 5 est ouvert, stable mais actif ; 4 est neutre aussi, mais semble se replier vers l\'intérieur. Ce sont deux faces d\'une même famille, celle du 1.' },
  ] },
  { id: 'gamme', title: 'La gamme complète', astuce: 'Le 7 colle au 8 et veut monter : c\'est le degré le plus facile à reconnaître parmi les aigus.', steps: [
    { text: 'La gamme majeure a 7 degrés ; après le 7 revient le 1, une octave plus haut (on l\'écrit 8).', example: ex('1 à 8', q([60, 62, 64, 65, 67, 69, 71, 72], 0.5), 100) },
    { text: 'Les marches ne sont pas égales : deux petites (demi-tons) entre 3-4 et entre 7-8, des grandes (tons) partout ailleurs.' },
    { text: 'Couleurs : 6 est doux, comme un 3 plus pâle ; 7 est tendu, un peu mélancolique, collé au 1. Les degrés de couleur proche se confondent souvent : 3 et 6, 3 et 7, 2 et 5, 4 et 1. Compare-les côte à côte.' },
  ] },
  { id: 'nommer', title: 'Des degrés aux noms de notes', astuce: 'Récite la gamme depuis la tonique en comptant sur tes doigts jusqu\'au degré demandé.', steps: [
    { text: 'Un degré dépend de la tonique ; un nom de note, non. En do majeur, 3 = mi. En sol majeur, 3 = si.' },
    { text: 'Pour traduire : nomme la tonique, puis récite les notes en montant. En sol : sol (1), la (2), si (3), do (4), ré (5), mi (6), fa♯ (7).' },
  ] },
  { id: 'intervalles', title: 'Fonction et intervalle', astuce: 'Pense d\'abord à la fonction (« c\'est le 3 de do ») ; compte la distance seulement quand tu dois construire.', steps: [
    { text: 'Deux idées à ne pas confondre. La FONCTION, c\'est la place d\'une note dans la gamme par rapport à 1 : sol est le 5 de do, qu\'il soit au-dessus ou en dessous. L\'INTERVALLE, c\'est la distance entre deux notes.', example: ex('do, puis sol au-dessus et sol en dessous : toujours le 5', seq([[60, 1], [67, 1.5], [60, 1], [55, 1.5]]), 70) },
    { text: 'Do → sol en montant : une quinte (7 demi-tons). Do → sol en descendant : une quarte (5 demi-tons). Même fonction, deux intervalles différents.' },
    { text: 'Les intervalles se comptent en demi-tons : seconde majeure = 2, tierce mineure = 3, tierce majeure = 4, quinte = 7.' },
  ] },
  { id: 'accord_couleur', title: 'Accord majeur ou mineur', astuce: 'Écoute la note du milieu : un peu plus haute = majeur (lumineux), un peu plus basse = mineur (sombre).', steps: [
    { text: 'Un accord, ce sont plusieurs notes jouées ensemble. L\'accord de base a 3 notes empilées en tierces.' },
    { text: 'Majeur et mineur ne diffèrent que par la note du milieu. Majeur sonne clair, mineur sonne plus sombre.', example: ex('Do majeur puis do mineur', [...[60, 64, 67].map((m) => ({ midi: m, start: 0, dur: 2 })), ...[60, 63, 67].map((m) => ({ midi: m, start: 2.5, dur: 2 }))], 70) },
  ] },
  { id: 'fonctions', title: 'Les accords I, IV et V', astuce: 'Chante la note la plus grave de chaque accord : 1, 4 ou 5 te donne la réponse.', steps: [
    { text: 'On construit un accord sur chaque degré. Ceux de 1, 4 et 5 (écrits I, IV, V) suffisent pour accompagner des milliers de chansons.' },
    { text: 'I = repos ; IV = on s\'éloigne doucement ; V = tension qui appelle le retour à I.', example: ex('I – IV – V – I', [1, 4, 5, 1].flatMap((d, b) => [0, 4, 7].map((s) => ({ midi: [48, 53, 55, 48][b] + s, start: b * 2, dur: 1.8 }))), 80) },
  ] },
  { id: 'changement', title: 'Entendre un changement d\'accord', astuce: 'Compte les mesures à voix basse : « 1 2 3 4, 2 2 3 4, 3 2 3 4… » et note le numéro quand la couleur change.', steps: [
    { text: 'Dans une chanson, l\'accord reste souvent une ou plusieurs mesures, puis change. Le changement se sent dans la basse.' },
    { text: 'Ici, 4 mesures de 4 temps : la 1re est toujours I. Trouve la mesure où le son bascule.' },
  ] },
  { id: 'penta', title: 'La pentatonique majeure', astuce: 'Pas de 4 ni de 7 : avec ces 5 notes, rien ne sonne faux sur I, IV et V.', steps: [
    { text: 'La pentatonique majeure garde 5 notes de la gamme : 1-2-3-5-6.', example: ex('Penta de do : do ré mi sol la', q([60, 62, 64, 67, 69, 72], 0.5), 100) },
    { text: 'Elle n\'a aucun demi-ton : c\'est pour ça qu\'elle sonne douce et qu\'on l\'utilise pour improviser dans le rock, la pop, le blues ou la musique traditionnelle.' },
  ] },

  // ---------------- THÉORIE ----------------
  { id: 'echelle_degres', title: 'Les degrés sur la portée', astuce: 'Pose ton doigt sur la tonique, puis monte d\'une marche à la fois : ligne, interligne, ligne… en comptant 1, 2, 3.', steps: [
    { text: 'Sur la portée, chaque ligne et chaque interligne est une marche de la gamme. En do majeur, do est le degré 1 ; la marche au-dessus (ré) est 2, la suivante (mi) est 3, et ainsi de suite.' },
    { text: 'Lire les degrés sur la portée, c\'est relier la partition à ce que tu entends : une note deux marches au-dessus de la tonique est le 3, quel que soit son nom.' },
  ] },
  { id: 'tons', title: 'Tons et demi-tons', astuce: 'Retiens la formule : ton, ton, demi-ton, ton, ton, ton, demi-ton.', steps: [
    { text: 'Un demi-ton = d\'une touche à la touche voisine (noires comprises). Un ton = deux demi-tons.' },
    { text: 'Dans la gamme majeure, les demi-tons sont entre 3 et 4 et entre 7 et 8. Partout ailleurs, il y a un ton.' },
  ] },
  { id: 'construire_intervalle', title: 'Construire un intervalle', astuce: 'Pose le doigt sur la note de départ et compte les touches une à une, noires comprises.', steps: [
    { text: 'Pour construire une tierce majeure, pars de la note donnée et monte de 4 demi-tons. Pour une tierce mineure, 3.' },
    { text: 'Dans l\'exercice : touche la note de départ et la note d\'arrivée, puis Valider. Touche une note sélectionnée pour l\'enlever.' },
  ] },
  { id: 'construire_accord', title: 'Construire un accord', astuce: 'Sur le clavier : une touche blanche oui, une non, une oui.', steps: [
    { text: 'Un accord de 3 sons : la fondamentale (le degré demandé), puis une note sur deux de la gamme. I en do = do-mi-sol, IV = fa-la-do, V = sol-si-ré.' },
    { text: 'Dans l\'exercice, l\'ordre et l\'octave n\'ont pas d\'importance : touche les trois notes, puis Valider.' },
  ] },
  { id: 'grille', title: 'Lire une grille d\'accords', astuce: 'Traduis d\'abord I, IV, V en noms de notes pour la tonalité, puis lis la case marquée.', steps: [
    { text: 'Une grille est une suite de cases, une par mesure. Dans chaque case, l\'accord à jouer, écrit en chiffres romains.' },
    { text: 'I, IV, V sont les accords des degrés 1, 4, 5. En do : I = do, IV = fa, V = sol. En sol : I = sol, IV = do, V = ré.' },
  ] },

  { id: 'noms_clavier', title: 'Où sont les notes', astuce: 'Pars toujours d\'un repère sûr (do au piano, une corde à vide à la guitare) et compte les notes jusqu\'à celle cherchée.', steps: [
    { text: 'Piano : do est juste à gauche du groupe de 2 touches noires, fa juste à gauche du groupe de 3. Les autres touches blanches suivent dans l\'ordre : do ré mi fa sol la si.', example: ex('do ré mi fa sol la si do', q([60, 62, 64, 65, 67, 69, 71, 72], 0.5), 100) },
    { text: 'Guitare : cordes à vide mi-la-ré-sol-si-mi, du grave (en bas de l\'écran) à l\'aigu (en haut). Chaque case monte d\'un demi-ton : sur la corde de la, la (0), si (2), do (3), ré (5).' },
    { text: 'Entre mi et fa, et entre si et do, il n\'y a qu\'un demi-ton : pas de touche noire, une seule case.' },
  ] },
  { id: 'nommer_oreille', title: 'Nommer une note à l\'oreille', astuce: 'Chante depuis la référence en nommant chaque marche (« do, ré, mi… ») jusqu\'à retomber sur la note entendue.', steps: [
    { text: 'Sans note de repère, retrouver le nom d\'une note est très difficile. Avec une référence connue, il suffit de compter les marches de la gamme qui les séparent.', example: ex('do, puis mi', [{ midi: 60, start: 0, dur: 1.5 }, { midi: 64, start: 2.5, dur: 1.5 }], 80) },
    { text: 'Si la note monte de deux marches depuis do, c\'est mi ; si elle descend d\'une marche, c\'est si. Avec une autre référence (sol, fa…), même méthode : on part de son nom.' },
  ] },
  { id: 'trouver_maison', title: 'Trouver la maison', astuce: 'Fredonne une note candidate, puis ajuste jusqu\'à ce que chanter donne une sensation de fin complète.', steps: [
    { text: 'Ne cherche pas une note saillante dans les accords : écoute la suite en entier et demande-toi où elle voudrait se poser. C\'est la tonique.' },
    { text: 'Sans tonique bien installée dans la tête, on confond les degrés (un 5 peut sembler un 4). C\'est la compétence sur laquelle reposent toutes les autres.' },
  ] },
  { id: 'memoire', title: 'Retenir une mélodie', astuce: 'Accroche-toi à la 1re note pendant toute l\'écoute : si elle glisse, toute la mélodie glisse avec elle.', steps: [
    { text: 'Reconnaître une note ne suffit pas : il faut aussi garder la mélodie en mémoire le temps de la nommer.' },
    { text: 'Méthode : retiens la 1re note, écoute le reste, chante tout de suite ce que tu as entendu, puis nomme les degrés en chantant. Si c\'est trop long, garde d\'abord les 3 premières notes.' },
  ] },
  { id: 'fonctions_instrument', title: 'Penser en fonctions sur l\'instrument', astuce: 'Apprends chaque fonction comme une petite forme autour du 1, sur une seule octave, en montant et en descendant : elle se déplace telle quelle avec la fondamentale.', steps: [
    { text: 'Les noms de notes servent à lire et à parler entre musiciens ; les fonctions (1, 2, 3…) servent à jouer et improviser. Avec la fondamentale sous les doigts, tu sais où est son 3, son 5, sans réciter de noms.' },
    { text: 'Piano : le 3 est 4 demi-tons au-dessus du 1 (en comptant chaque touche, noires comprises), le 5 est 7 demi-tons au-dessus. Guitare : la même forme marche depuis n\'importe quelle case. Par exemple, le 5 est deux cases plus loin sur la corde suivante, plus aiguë (trois cases quand on passe de la corde de sol à celle de si).' },
    { text: 'On travaille par petits blocs, une octave autour du 1, plutôt que de grandes « boîtes » à mémoriser.' },
  ] },
  { id: 'ecrire_portee', title: 'Écrire sur la portée', astuce: 'Pars de mi (ligne du bas) : chaque note suivante va sur l\'interligne ou la ligne juste au-dessus. Au-dessous de mi : ré, puis do sur une petite ligne.', steps: [
    { text: 'Écrire une note, c\'est la placer à la bonne hauteur : sur une ligne (la ligne traverse la note) ou dans un interligne (la note est entre deux lignes).' },
    { text: 'En clé de sol : mi (1re ligne), fa, sol (2e ligne), la, si (3e ligne), do, ré (4e ligne), mi, fa (5e ligne). Sous la portée : ré, puis do sur une petite ligne supplémentaire.' },
    { text: 'Dans une dictée, écris d\'abord le contour (monte, descend), puis vérifie chaque note en comptant les marches depuis la précédente.' },
  ] },
  { id: 'ecrire_rythme', title: 'Écrire un rythme', astuce: 'Pendant l\'écoute, compte « 1 2 3 4 » à voix haute et repère sur quels temps tombent les notes ; une note qui dure deux temps est une blanche.', steps: [
    { text: 'Méthode : écoute en comptant les temps, puis découpe mesure par mesure. Pour chaque temps : une note qui commence ? une qui continue ? un silence ?' },
    { text: 'Une note qui commence et dure 1 temps : une noire. Qui dure 2 temps : une blanche. Un temps sans son : un soupir. Deux sons dans un temps : deux croches.', notation: ['noire', 'blanche', 'soupir', 'croches'] },
    { text: 'Vérifie que chaque mesure fait bien 4 temps : le compteur sous la partition t\'aide.' },
  ] },
  { id: 'lire_tab', title: 'Lire une tablature', astuce: 'Lis d\'abord la ligne (quelle corde ?), puis le chiffre (quelle case ?). 0 = corde à vide.', steps: [
    { text: 'La tablature dessine les 6 cordes de la guitare : la ligne du haut est la corde la plus aiguë (mi), celle du bas la plus grave (mi). Le chiffre posé sur une ligne dit sur quelle case appuyer.' },
    { text: 'Elle montre où jouer, pas le nom de la note ni toujours le rythme. Beaucoup de guitaristes apprennent avec elle ; la portée reste utile pour lire avec d\'autres musiciens. Tu peux choisir dans Profil.' },
  ] },
  { id: 'mineur', title: 'La gamme mineure', astuce: 'Pour passer de majeur à mineur, abaisse 3, 6 et 7 d\'un demi-ton ; pour trouver la relative mineure, pars du 6e degré.', steps: [
    { text: 'Mineur naturel : 1 2 ♭3 4 5 ♭6 ♭7. La mineur utilise les notes de do majeur en partant de la : c\'est sa relative mineure.', example: ex('La mineur', q([57, 59, 60, 62, 64, 65, 67, 69], 0.5), 100) },
    { text: 'C\'est surtout le ♭3 qui fait entendre « mineur » : dans une phrase, guette le 3e degré.' },
  ] },
  { id: 'couleurs_mineur', title: 'Couleurs du mineur : ♭3, ♭6, ♭7', astuce: 'Compare toujours au degré naturel : ♭3 est plus sombre que 3, ♭7 sonne « rock » là où 7 tire vers 1.', steps: [
    { text: '♭3 : sombre mais stable, il appartient à l\'accord de tonique mineur. ♭6 : lourd, il pèse vers 5. ♭7 : plus léger, il descend vers 6 ou remonte à 1 sans la tension du 7.', example: ex('5 ♭6 5, puis ♭7 1', q([67, 68, 67, 70, 72]), 80) },
    { text: 'En cas de doute, redescends jusqu\'à 1 en chantant la gamme mineure : 1 2 ♭3 4 5 ♭6 ♭7.' },
  ] },
  { id: 'familles_intervalles', title: 'Reconnaître tous les intervalles', astuce: 'Classe d\'abord par famille (ouvert, doux, frottant, instable), puis choisis dans la famille.', steps: [
    { text: 'Ouverts et calmes : quinte, quarte, octave. Doux : tierces et sixtes. Frottants : secondes et septièmes (la seconde mineure et la 7e majeure frottent le plus). Instable : le triton.', example: ex('Quinte, sixte majeure, septième mineure, triton', [{ midi: 60, start: 0, dur: 1.4 }, { midi: 67, start: 0, dur: 1.4 }, { midi: 60, start: 2, dur: 1.4 }, { midi: 69, start: 2, dur: 1.4 }, { midi: 60, start: 4, dur: 1.4 }, { midi: 70, start: 4, dur: 1.4 }, { midi: 60, start: 6, dur: 1.4 }, { midi: 66, start: 6, dur: 1.4 }], 80) },
    { text: 'Entraîne-toi autant en descendant qu\'en montant : c\'est souvent le côté faible.' },
  ] },
  { id: 'chanter_intervalle', title: 'Chanter un intervalle', astuce: 'Pars de la note du milieu : chante-la, puis l\'intervalle au-dessus ET au-dessous, pour l\'entendre des deux côtés.', steps: [
    { text: 'Méthode de Rick Beato : joue un accord symétrique (augmenté pour les tierces majeures, diminué pour les mineures), prends la note du milieu, chante la note au-dessus puis celle au-dessous. L\'oreille apprend l\'intervalle dans les deux sens à la fois.', example: ex('Do augmenté : mi, puis sol♯, puis do', [{ midi: 64, start: 0, dur: 1 }, { midi: 68, start: 1, dur: 1 }, { midi: 64, start: 2, dur: 1 }, { midi: 60, start: 3, dur: 1 }], 70) },
    { text: 'Sinon : chante les notes de la gamme entre les deux pour mesurer le chemin, puis tiens la note d\'arrivée.' },
  ] },
  { id: 'triades', title: 'Les quatre triades', astuce: 'Écoute la note du haut : une quinte juste (majeur, mineur) sonne stable ; diminuée ou augmentée, l\'accord vacille.', steps: [
    { text: 'Majeur : lumineux. Mineur : sombre. Diminué : serré, inquiet (deux tierces mineures ; sa quinte diminuée forme un triton avec la fondamentale). Augmenté : flottant, comme en suspens (deux tierces majeures).', example: ex('Majeur, mineur, diminué, augmenté', [[60, 64, 67], [60, 63, 67], [60, 63, 66], [60, 64, 68]].flatMap((c, i) => c.map((m) => ({ midi: m, start: i * 2, dur: 1.8 }))), 80) },
    { text: 'Pour construire : depuis la fondamentale, compte les demi-tons. Majeur 4 + 3, mineur 3 + 4, diminué 3 + 3, augmenté 4 + 4.' },
  ] },
  { id: 'accords_gamme', title: 'Les accords de la gamme', astuce: 'Basse d\'abord (quel degré ?), couleur ensuite (majeur ou mineur ?) : les deux réponses ensemble donnent le chiffre.', steps: [
    { text: 'En majeur : I, IV, V majeurs ; ii, iii, vi mineurs ; vii° diminué. La relative mineure est l\'accord vi.', example: ex('I – vi – IV – V', [1, 6, 4, 5].flatMap((d, i) => [0, 4, 7].map((x) => ({ midi: [48, 57, 53, 55][i] + (d === 6 && x === 4 ? 3 : x), start: i * 2, dur: 1.8 }))), 80) },
  ] },
  { id: 'dictee_grille', title: 'Écrire une grille d\'accords', astuce: 'Chante la basse de chaque accord : elle te donne le degré presque à coup sûr.', steps: [
    { text: 'Le premier accord est I, ta maison. Pour chaque accord suivant, chante sa note la plus grave et compte depuis 1. Vérifie la couleur : majeur (I, IV, V) ou mineur (ii, iii, vi).' },
  ] },
  { id: 'syncopes', title: 'Syncopes et doubles croches', astuce: 'Compte « 1 et 2 et » à voix haute : sur une syncope, tu frappes sur un « et » et tu tiens jusqu\'au « et » suivant.', steps: [
    { text: 'Syncope : croche – noire – croche. La note longue démarre entre deux temps et enjambe le temps suivant : c\'est ce qui fait groover.', notation: ['noire', 'syncope', 'noire'] },
    { text: 'Doubles croches : quatre notes dans un temps, « 1 e et a ».', notation: ['doubles', 'noire', 'doubles', 'noire'] },
  ] },
  { id: 'blues', title: 'Le blues', astuce: 'Joue peu de notes, répète-les, et vise 1 ou 5 à la fin de tes phrases ; laisse respirer.', steps: [
    { text: 'Grille de 12 mesures : I I I I | IV IV I I | V IV I V. Dessus, la pentatonique mineure (1 ♭3 4 5 ♭7), plus la « blue note » ♯4 en passage.', example: ex('Gamme blues', q([60, 63, 65, 66, 67, 70, 72], 0.5), 100) },
    { text: 'Le ♭3 frotte contre la tierce majeure de l\'accord : ce frottement, c\'est le son du blues.' },
  ] },
  { id: 'septiemes', title: 'Les accords de 7e', astuce: 'Écoute la note du haut contre la fondamentale : 7e majeure (frotte, un demi-ton sous l\'octave) ou 7e mineure (un ton sous l\'octave).', steps: [
    { text: 'maj7 = triade majeure + 7e majeure : doux, rêveur. 7 (dominante) = triade majeure + 7e mineure : tendu. m7 = triade mineure + 7e mineure : détendu. m7♭5, dit demi-diminué (ø) = triade diminuée + 7e mineure : sombre.', example: ex('maj7, 7, m7, m7♭5 sur do', [[48, 52, 55, 59], [48, 52, 55, 58], [48, 51, 55, 58], [48, 51, 54, 58]].flatMap((c, i) => c.map((m) => ({ midi: m, start: i * 2, dur: 1.8 }))), 80) },
    { text: 'Construire : la triade, puis la 7e à 11 demi-tons (maj7) ou 10 demi-tons (7, m7, m7♭5) de la fondamentale.' },
  ] },
  { id: 'cadences', title: 'Les cadences', astuce: 'Pose deux questions : sur quoi la phrase finit-elle (I, V ou vi) ? Et qu\'y a-t-il juste avant (V ou IV) ?', steps: [
    { text: 'Parfaite V → I : un point final. Plagale IV → I : un « amen », plus doux. Demi-cadence, arrêt sur V : une virgule, la phrase attend la suite. Rompue V → vi : on attendait I, on entend vi, une surprise.' },
  ] },
  { id: 'ii_v_i', title: 'Le ii-V-I', astuce: 'Pour trouver la tonalité d\'un ii-V-I, regarde le dernier accord (maj7) : c\'est la tonique. Pour le V7 d\'une tonalité, monte de 5 degrés.', steps: [
    { text: 'ii7 – V7 – Imaj7 : préparation, tension, résolution. En do : ré m7 – sol 7 – do maj7 ; en fa : sol m7 – do 7 – fa maj7 ; en sol : la m7 – ré 7 – sol maj7.', example: ex('ii-V-I en do', [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59]].flatMap((c, i) => c.map((m) => ({ midi: m, start: i * 2, dur: 1.9 }))), 80) },
  ] },
  { id: 'notes_guides', title: 'Les notes-guides', astuce: 'La 7e d\'un accord descend d\'un demi-ton pour devenir la 3e de l\'accord suivant : suis-la sur le clavier.', steps: [
    { text: 'La tierce et la septième d\'un accord suffisent à faire entendre sa couleur (la fondamentale est souvent jouée par la basse). Sur un ii-V-I, elles s\'enchaînent presque sans bouger : c\'est la base des voicings jazz.' },
  ] },
  { id: 'cle_fa', title: 'Lire la clé de fa', astuce: 'Deux repères : la 4e ligne est fa (entre les deux points), la 1re ligne en bas est sol. Compte depuis le plus proche.', steps: [
    { text: 'En clé de fa, du bas vers le haut : sol (ligne), la, si (ligne), do, ré (ligne), mi, fa (ligne), sol, la (ligne). Le do du milieu est juste au-dessus de la portée.' },
  ] },
  { id: 'swing', title: 'Swing et triolets', astuce: 'Dis « tri-o-let » régulièrement sur un temps pour les triolets ; pour le swing, dis « taa-ta » : longue, courte.', steps: [
    { text: 'Triolet : 3 notes égales dans un temps. Swing : chaque paire de croches est jouée comme un triolet dont les deux premières notes sont liées, donc longue puis courte.', notation: ['triolet', 'triolet', 'croches', 'noire'] },
  ] },
  { id: 'notes_cibles', title: 'Viser les notes de l\'accord', astuce: 'Prépare la tierce suivante pendant la mesure : souvent, elle est à un demi-ton ou un ton de la précédente.', steps: [
    { text: 'La tierce dit la couleur de l\'accord ; la fondamentale se fond dedans ; la quinte sonne creuse ; la septième frotte. Posée sur le 1er temps, la tierce fait entendre la grille sans accompagnement.', example: ex('do majeur, puis mi au-dessus', [48, 52, 55].map((m) => ({ midi: m, start: 0, dur: 2.5 })).concat([{ midi: 64, start: 0.8, dur: 1.6 }]), 70) },
  ] },
  { id: 'modes_couleurs', title: 'Les modes et leur couleur', astuce: 'Majeur ou mineur d\'abord (la tierce) ; puis cherche la note qui change : 6 (dorien), ♭2 (phrygien), ♯4 (lydien), ♭7 (mixolydien), ♭6 (éolien).', steps: [
    { text: 'Ionien = majeur. Dorien = mineur avec 6 naturel (lumineux). Phrygien = mineur avec ♭2 (sombre, espagnol). Lydien = majeur avec ♯4 (flottant). Mixolydien = majeur avec ♭7 (rock, sans sensible). Éolien = mineur naturel.', example: ex('do dorien, sur un bourdon', [...q([60, 62, 63, 65, 67, 69, 70, 72], 0.5), { midi: 48, start: 0, dur: 4 }, { midi: 55, start: 0, dur: 4 }], 110) },
    { text: 'Comme Tom Quayle : retiens la formule de chaque mode par rapport à la gamme majeure (dorien = 1 2 ♭3 4 5 6 ♭7), pas ses noms de notes dans chaque tonalité.' },
  ] },
  { id: 'douze_couleurs', title: 'Les 12 couleurs', astuce: 'Les degrés voisins par la couleur se confondent : 3 et 6, 2 et 5, ♭6 et ♭2, ♯4 et 7. Compare-les côte à côte sur fond de bourdon.', steps: [
    { text: 'Chaque degré a sa couleur sur fond de tonique : 1 repos ; 5 ouvert ; 3 chaud ; 2 cristallin ; 6 doux ; 4 replié ; 7 tendu ; ♭7 léger ; ♭3 sombre ; ♭6 lourd ; ♭2 très tendu ; ♯4 étrange, électrique.' },
  ] },
  { id: 'emprunts', title: 'Les accords empruntés', astuce: 'Garde la tonique bien en tête : l\'emprunt crée un « oh, je ne l\'attendais pas ». Puis : iv assombrit IV, ♭VII sonne rock, ♭VI dramatique.', steps: [
    { text: 'En majeur, on emprunte souvent à la tonalité mineure de même tonique : iv (fa mineur en do), ♭VII (si♭), ♭VI (la♭), ♭III (mi♭). Ils ajoutent une ombre sans quitter la tonalité.', example: ex('I – iv – I', [[48, 52, 55], [53, 56, 60], [48, 52, 55]].flatMap((c, i) => c.map((m) => ({ midi: m, start: i * 2, dur: 1.9 }))), 80) },
  ] },
  { id: 'modulation', title: 'Entendre une modulation', astuce: 'Chante la tonique du début, puis celle de la fin : une quinte au-dessus = vers la dominante ; une quarte au-dessus = vers la sous-dominante ; une tierce mineure en dessous, en mineur = vers le relatif.', steps: [
    { text: 'Une modulation installe une nouvelle tonique, souvent par un accord pivot puis une cadence V7 → I dans la nouvelle tonalité. Après elle, une note qui était 1 ne sonne plus comme la maison.' },
  ] },
  { id: 'mesures_impaires', title: 'Les mesures impaires', astuce: 'Regroupe en 3 + 2 pour 5 temps (« 1 2 3 1 2 »), en 4 + 3 pour 7 temps. Accentue le début de chaque groupe.', steps: [
    { text: 'À 5 ou 7 temps, la mesure est asymétrique : on la ressent en groupes de 2 et de 3. Compte à voix haute en accentuant le 1er temps de chaque groupe.' },
  ] },
  { id: 'impro_modale', title: 'Improviser dans un mode', astuce: 'Pose la note caractéristique sur un temps fort, tiens-la, puis finis ta phrase sur 1 : le mode se fait entendre tout seul.', steps: [
    { text: 'Sur un bourdon, toutes les notes du mode sonnent, mais c\'est la note caractéristique qui dit lequel. En dorien : le 6 ; en mixolydien : le ♭7 ; en lydien : le ♯4.', example: ex('Phrase en do dorien', [62, 63, 65, 69, 67, 63, 60].map((m, i) => ({ midi: m, start: i * 0.5, dur: 0.45 })), 100) },
  ] },
  { id: 'positions_manche', title: 'Apprendre une position', astuce: 'Dis les degrés à voix basse en jouant (« 1, ♭3, 4… ») : tu mémorises la forme ET le son de chaque degré.', steps: [
    { text: 'Une position, c\'est une zone de 4 à 5 cases où l\'on joue toute la gamme sans déplacer la main : un doigt par case, l\'index sur la 1re. On apprend les positions une par une, puis on les relie.' },
    { text: 'Méthode de mémorisation en 3 temps : avec tout affiché, puis avec seulement les fondamentales, puis de mémoire. Repère toujours les 1 : c\'est depuis eux que tu retrouves chaque degré, comme le fait Tom Quayle.' },
  ] },
  { id: 'vitesse', title: 'Gagner en vitesse', astuce: 'Monte de tempo seulement après deux passages propres d\'affilée ; si ça accroche, redescends d\'un cran au lieu de forcer.', steps: [
    { text: 'La vitesse vient de la régularité, pas de l\'effort : joue propre à un tempo confortable, puis monte par paliers (les tempos clés 60, 80, 100, 120, 140). Main détendue, petits mouvements.' },
    { text: 'Médiator en aller-retour strict : bas sur les temps, haut entre les temps, même en changeant de corde. L\'appli affiche le sens sous chaque note, mais ne peut pas l\'entendre : c\'est à toi de vérifier.' },
  ] },
  { id: 'formes_accords', title: 'Les formes d\'accords mobiles', astuce: 'Repère la fondamentale de la forme (6e corde pour la forme de mi, 5e pour la forme de la) : la case de cette note donne le nom de l\'accord.', steps: [
    { text: 'Une forme d\'accord se déplace telle quelle sur le manche : la forme de mi majeur, barrée case 3, donne sol majeur ; la forme de la mineur, barrée case 3, donne do mineur.' },
    { text: 'Avec les degrés affichés (1, 3, 5, ♭7), tu vois où est la tierce : c\'est elle qui change entre majeur et mineur. L\'appli vérifie les notes, pas le son ni la propreté de la barre : écoute-toi.' },
  ] },
  { id: 'audiation', title: 'Entendre dans sa tête', astuce: 'Avant de toucher une note, chante-la intérieurement. Si tu ne l\'entends pas, tu ne la trouves que par hasard.', steps: [
    { text: 'L\'audiation, c\'est entendre la musique dans sa tête, sans qu\'elle sonne, comme on lit un texte en silence (Edwin Gordon). C\'est le pont entre l\'oreille et les mains : on joue ce qu\'on entend intérieurement, au lieu de chercher au hasard.' },
    { text: 'Entraîne-toi en 3 temps : entends (dans ta tête), joue (ou chante), puis compare avec le modèle. Plus l\'image intérieure est nette, plus la main va droit à la bonne note.' },
  ] },
  { id: 'tendances', title: 'Où la musique veut aller', astuce: 'Chante la phrase dans ta tête et laisse-la finir toute seule : la note qui vient « naturellement » est presque toujours la bonne.', steps: [
    { text: 'Certaines notes tirent vers d\'autres : 7 monte vers 1 (la sensible), 2 descend vers 1, 4 descend vers 3, 6 descend vers 5. Entendre ces attractions, c\'est entendre la tonalité de l\'intérieur.', example: ex('7 → 1, puis 4 → 3', q([71, 72, 65, 64]), 70) },
  ] },
  { id: 'tons_demitons', title: 'Tons et demi-tons', astuce: 'Repère les deux seuls demi-tons naturels : mi-fa et si-do. Partout ailleurs entre deux notes blanches voisines, c\'est un ton.', steps: [
    { text: 'Dans le système musical occidental, le demi-ton est la plus petite distance entre deux notes : une touche voisine au piano (noire comprise), une case à la guitare. Un ton = deux demi-tons.' },
  ] },
  { id: 'gamme_structure', title: 'La structure de la gamme majeure', astuce: 'Retiens la formule en deux groupes : « T T ½ » puis « T T T ½ ».', steps: [
    { text: 'Toute gamme majeure suit la même suite de marches : ton, ton, demi-ton, ton, ton, ton, demi-ton. Les demi-tons tombent entre 3 et 4, et entre 7 et 8.' },
  ] },
  { id: 'accord_tierces', title: 'Un accord, des tierces empilées', astuce: 'Dans la gamme, saute une note sur deux : do (ré) mi (fa) sol.', steps: [
    { text: 'Un accord de trois sons, c\'est 1, 3 et 5 : deux tierces empilées. Majeur : une tierce majeure (2 tons) puis une mineure (1 ton ½). Mineur : l\'inverse.' },
  ] },
  { id: 'armure', title: 'L\'armure', astuce: 'Dièses : la tonique est un demi-ton au-dessus du dernier dièse. Bémols : c\'est l\'avant-dernier bémol.', steps: [
    { text: 'Les altérations d\'une tonalité sont écrites une fois pour toutes après la clé : c\'est l\'armure. Les dièses arrivent toujours dans l\'ordre fa, do, sol, ré, la, mi, si ; les bémols dans l\'ordre inverse : si, mi, la, ré, sol, do, fa.' },
  ] },
  { id: 'penta_positions', title: 'Relier les positions', astuce: 'Deux positions voisines partagent une colonne de notes : c\'est le pont pour passer de l\'une à l\'autre.', steps: [
    { text: 'Les cinq positions de la pentatonique se suivent sur le manche et se chevauchent. Les relier permet de jouer la même gamme d\'un bout à l\'autre du manche.' },
  ] },
  { id: 'stable_instable', title: 'Notes stables et instables', astuce: 'Arrête la musique sur la note : si ça sonne comme une fin, elle est stable ; comme une virgule, elle est instable.', steps: [
    { text: '1, 3 et 5 sont stables : ce sont les notes de l\'accord de la maison. 2, 4, 6 et 7 sont instables : elles tirent vers une voisine stable (7 → 1, 2 → 1, 4 → 3, 6 → 5).' },
  ] },
  { id: 'temps_forts', title: 'Le temps fort', astuce: 'Compte à voix basse et appuie la voix sur le « 1 » : ton corps le sentira avant tes mains.', steps: [
    { text: 'Les temps se regroupent en mesures ; le 1er temps de chaque mesure est le temps fort. C\'est lui qui donne l\'impression d\'une marche (en 2 ou 4) ou d\'une valse (en 3).' },
  ] },
  { id: 'binaire_ternaire', title: 'Binaire et ternaire', astuce: '« 1-et 2-et » pour le binaire ; « 1-tri-o 2-tri-o » pour le ternaire.', steps: [
    { text: 'Un temps peut se partager en deux (binaire : marche, rock, pop) ou en trois (ternaire : valse lente, blues shuffle, berceuse).' },
  ] },
  { id: 'lire_portee', title: 'Lire la clé de sol', astuce: 'Retiens deux repères : la 1re ligne en bas est mi, le 2e interligne (en partant du bas) est la. Compte à partir du plus proche.', steps: [
    { text: 'La portée a 5 lignes. En clé de sol, la ligne du bas est mi. En montant, on alterne ligne et interligne : mi (ligne), fa (interligne), sol (ligne), la, si, do, ré, mi, fa.' },
    { text: 'Sous la portée : ré juste sous la 1re ligne, puis le do du milieu, sur une petite ligne supplémentaire.' },
  ] },
  { id: 'gamme_do', title: 'La gamme de do', astuce: 'Récite-la à voix haute en la jouant : do, ré, mi, fa, sol, la, si, do. Puis à l\'envers.', steps: [
    { text: 'La gamme de do majeur, ce sont les 8 touches blanches de do au do suivant. C\'est la gamme de référence : les degrés, les intervalles et les accords viennent tous d\'elle.', example: ex('Gamme de do, montante et descendante', q([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60], 0.5), 110) },
    { text: 'Ses marches : ton, ton, demi-ton (mi-fa), ton, ton, ton, demi-ton (si-do).' },
  ] },

  // ---------------- TECHNIQUE ----------------
  { id: 'reperes', title: 'Se repérer sur l\'instrument', astuce: 'Au piano, cherche d\'abord les groupes de touches noires ; à la guitare, pars des cordes à vide.', steps: [
    { text: 'Piano : les touches noires vont par 2 puis par 3. Le do est juste à gauche du groupe de 2. Vers la droite, c\'est plus aigu.' },
    { text: 'Guitare : 6 cordes, de la plus grave (mi, en bas sur l\'écran) à la plus aiguë (mi, en haut). Les cordes à vide sont mi-la-ré-sol-si-mi. La colonne « 0 » = corde à vide.' },
  ] },
  { id: 'jouer_temps', title: 'Jouer avec le clic', astuce: 'Prépare la note suivante pendant que tu tiens la précédente : on arrive en retard quand on cherche au dernier moment.', steps: [
    { text: 'Le clic donne la pulsation. Le décompte (4 clics) te laisse te préparer ; tu joues à partir du clic suivant.' },
    { text: 'Joue chaque note exactement sur un clic, ni avant ni après. L\'appli tolère un petit écart (moins d\'un dixième de seconde).' },
    { text: 'Trop dur ? Utilise l\'aide « Ralentir » : le tempo descend à 70 %.' },
  ] },
  { id: 'doigtes', title: 'Doigtés', astuce: 'Un doigt par note : la main reste immobile, seuls les doigts bougent.', steps: [
    { text: 'Piano, main droite : pouce (1) sur do, puis 2-3-4-5 sur ré-mi-fa-sol. Pour la gamme, le pouce passe sous la main après le mi.' },
    { text: 'Guitare : un doigt par case (index case 1, majeur case 2…). Joue sur le bout du doigt, juste derrière la frette.' },
  ] },
  { id: 'positions', title: 'Toutes les positions d\'une note', astuce: 'Au piano, une même note revient toutes les 12 touches ; à la guitare, la même note existe sur plusieurs cordes.', steps: [
    { text: 'Piano : un sol revient à chaque octave, toujours au même endroit par rapport aux touches noires (entre les 1re et 2e noires du groupe de 3).' },
    { text: 'Guitare : la case 5 d\'une corde donne la même note que la corde à vide suivante, plus aiguë (sauf de sol à si : case 4).' },
  ] },
  { id: 'accords_jouer', title: 'Placer un accord', astuce: 'Vérifie chaque note : l\'accord n\'est juste que si toutes les cordes ou touches demandées sont présentes.', steps: [
    { text: 'Piano : fondamentale + une note sur deux, trois touches en tout. Do = do-mi-sol.' },
    { text: 'Guitare : les accords « ouverts » mélangent cordes à vide et notes appuyées. Sol majeur : case 3 sur le mi grave, case 2 sur le la, ré-sol-si à vide, case 3 sur le mi aigu. Touche chaque note de l\'accord sur le manche.' },
  ] },
  { id: 'basses', title: 'Enchaîner I-IV-V-I en basses', astuce: 'Regarde déjà la note suivante pendant les 3 derniers temps de la mesure.', steps: [
    { text: 'La basse est la note la plus grave de l\'accord : 1 pour I, 4 pour IV, 5 pour V.' },
    { text: 'Dans l\'exercice, joue une seule note par mesure, sur le 1er temps (le clic accentué) : 1, puis 4, puis 5, puis 1.' },
  ] },

  // ---------------- IMPRO ----------------
  { id: 'perroquet', title: 'Le perroquet', astuce: 'Chante la phrase avant de la jouer : si tu peux la chanter, tu peux la trouver.', steps: [
    { text: 'L\'appli joue une courte phrase ; tu la répètes. C\'est la base de l\'impro : on apprend le langage en imitant.' },
    { text: 'Un son continu (le bourdon) joue la tonique en fond pour t\'aider à te repérer.' },
    { text: 'Peu importe l\'octave ; ce qui compte, ce sont les notes et leur ordre.' },
  ] },
  { id: 'question_reponse', title: 'Question et réponse', astuce: 'Commence ta réponse comme la question, puis change la fin pour rentrer sur 1.', steps: [
    { text: 'Une question musicale s\'arrête en l\'air ; une réponse rentre à la maison (sur 1).', example: ex('Question… réponse', seq([[60, 1], [62, 1], [64, 2], [64, 1], [62, 1], [60, 2]]), 90) },
    { text: 'Dans l\'exercice : écoute la question, puis joue ta propre phrase avec les notes autorisées (en couleur) et termine sur 1. Il n\'y a pas une seule bonne réponse.' },
  ] },
  { id: 'jeu_libre', title: 'Jeu libre', astuce: 'Une idée simple : joue une petite phrase, répète-la, puis change une seule note.', steps: [
    { text: 'Ici, tout est permis : il n\'y a pas de fausse note avec les notes en couleur.' },
    { text: 'Pour que ça sonne musical : laisse des silences, répète tes idées, et finis tes phrases sur 1.' },
  ] },

  // ---------------- REPIQUAGE ----------------
  { id: 'repiquer', title: 'Repiquer d\'oreille', astuce: 'Une note à la fois : trouve la 1re, puis cherche la suivante en te demandant si ça monte ou descend.', steps: [
    { text: 'Repiquer, c\'est retrouver sur ton instrument une musique entendue, sans partition.' },
    { text: 'Méthode : chante la phrase, trouve la 1re note (souvent 1), puis suis le contour note par note. Réécoute autant que nécessaire.' },
    { text: 'Le rythme n\'est pas noté ici : joue les bonnes notes dans le bon ordre.' },
  ] },
  { id: 'transcrire', title: 'Transcrire en degrés', astuce: 'Rejoue la phrase dans ta tête et écris une note à chaque fois que tu chantes une nouvelle syllabe.', steps: [
    { text: 'Transcrire, c\'est écrire ce que tu as entendu. Ici, en degrés (1 à 7) avec une durée pour chaque note.' },
    { text: 'Choisis d\'abord la durée (croche, noire, blanche), puis touche le degré : la note s\'ajoute à ta réponse. ⌫ efface la dernière.' },
  ] },
];

export const LESSON_POINTS: Record<string, LessonPoint> = Object.fromEntries(P.map((p) => [p.id, p]));
