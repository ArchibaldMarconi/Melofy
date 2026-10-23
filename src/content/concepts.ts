// Notions et leçons d'unité. Fil conducteur : chaque notion s'appuie sur la précédente.
//   les notes sur l'instrument → la gamme de do (faite de ces notes) → la tonique (sa maison)
//   → les degrés (la gamme numérotée) → toute la gamme → les intervalles (distances entre degrés, l'aboutissement)
//   → changer de tonique → les accords (des tierces empilées) → enchaîner → la pentatonique.
// Le rythme (pulsation, figures, lecture) avance en parallèle.
// Le 1er écran de chaque leçon est « l'essentiel » ; les suivants ne s'affichent qu'à la demande.
import type { Concept } from './types';

const q = (midis: number[], dur = 1) => midis.map((midi, i) => ({ midi, start: i * dur, dur }));
const clip = (midis: number[], tempo = 90, dur = 1) => ({ notes: q(midis, dur), tempo });
const GAMME_DO = [60, 62, 64, 65, 67, 69, 71, 72];

export const CONCEPTS: Concept[] = [
  // ================= PALIER 1 — Fondations =================
  {
    discover: { question: 'Lequel a une pulsation plus rapide ?', a: clip([72, 72, 72, 72], 60), b: clip([72, 72, 72, 72, 72, 72, 72, 72], 120), answer: 'B', reveal: 'Dans B, les battements sont deux fois plus serrés : son tempo est plus élevé.' },
    id: 'pulsation', title: 'La pulsation', palier: 1, unite: '1.1', prerequis: [],
    lecon: [
      { text: 'Sous toute musique bat un pouls régulier : la pulsation. Tu la suis en tapant du pied ; le tempo dit à quelle vitesse.', example: { label: 'Pulsation à 80', notes: q([72, 72, 72, 72]), tempo: 80 } },
      { text: 'Le tempo se compte en battements par minute (BPM). 60 BPM = un battement par seconde.' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces notes est la plus aiguë ?', a: clip([60], 60, 2), b: clip([72], 60, 2), answer: 'B', reveal: 'B est le do suivant, plus aigu. Sur le clavier, l\'aigu est vers la droite ; sur le manche, vers le corps de la guitare.' },
    id: 'notes_instrument', title: 'Les notes sur ton instrument', palier: 1, unite: '1.2', prerequis: [],
    lecon: [
      { text: 'Les notes s\'appellent do, ré, mi, fa, sol, la, si, puis on recommence au do suivant. Au piano, ce sont les touches blanches ; do est juste à gauche du groupe de 2 touches noires.', example: { label: 'do ré mi fa sol la si do', notes: q(GAMME_DO, 0.5), tempo: 100 } },
      { text: 'À la guitare, les 6 cordes à vide sont mi-la-ré-sol-si-mi (du grave à l\'aigu). Chaque case monte d\'un demi-ton : sur la corde de la, case 2 = si, case 3 = do.' },
      { text: 'Retenir où sont les notes, c\'est la base de tout le reste : lire, jouer d\'oreille, construire des accords.' },
    ],
  },
  {
    discover: { question: 'La 2e note monte-t-elle ?', a: clip([60, 67], 70, 1.5), b: clip([67, 60], 70, 1.5), answer: 'A', reveal: 'Dans A, la 2e note est plus aiguë : ça monte. Dans B, ça descend.' },
    id: 'grave_aigu', title: 'Grave et aigu', palier: 1, unite: '1.3', prerequis: ['pulsation'],
    lecon: [
      { text: 'Un son aigu est « haut », un son grave est « bas ». Une mélodie monte quand elle va vers l\'aigu : vers la droite du clavier.', example: { label: 'Grave puis aigu', notes: q([48, 72], 1.5), tempo: 70 } },
    ],
  },
  {
    discover: { question: 'Lequel a des notes plus longues ?', a: clip([72, 72, 72, 72], 80), b: clip([72, 72], 80, 2), answer: 'B', reveal: 'B tient chaque note deux temps : ce sont des blanches. A joue des noires, un temps chacune.' },
    id: 'noire_blanche_silence', title: 'Noire, blanche, silence', palier: 1, unite: '1.4', prerequis: ['pulsation'],
    lecon: [
      { text: 'Une noire dure 1 temps, une blanche 2 temps, un soupir est un silence d\'1 temps.', example: { label: '♩ ♩ 𝅗𝅥', notes: [{ midi: 72, start: 0, dur: 1 }, { midi: 72, start: 1, dur: 1 }, { midi: 72, start: 2, dur: 2 }], tempo: 80 } },
      { text: 'Une mesure à 4 temps contient par exemple 4 noires, ou 2 blanches, ou noire + soupir + blanche.' },
    ],
  },
  {
    discover: { question: 'Lequel monte d\'une seule note à la fois ?', a: clip([60, 62, 64, 65, 67], 100), b: clip([60, 64, 67, 72], 100), answer: 'A', reveal: 'A monte do-ré-mi-fa-sol, note après note. Sur la portée, chaque note suivante se pose sur la ligne ou l\'interligne juste au-dessus.' },
    id: 'lecture_portee', title: 'Lire et écrire les notes', palier: 1, unite: '1.5', prerequis: ['notes_instrument'],
    lecon: [
      { text: 'Une partition place les notes sur 5 lignes, la portée. Avec la clé de sol, la ligne du bas est mi ; chaque ligne ou interligne au-dessus monte d\'une note : mi, fa, sol, la, si…' },
      { text: 'Le do du milieu se place sous la portée, sur une petite ligne supplémentaire. Ré est juste sous la portée, collé à la 1re ligne.' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces suites sonne comme une gamme complète ?', a: clip(GAMME_DO, 120, 0.5), b: clip([60, 62, 64, 65, 67, 69, 71], 120, 0.5), answer: 'A', reveal: 'A monte de do jusqu\'au do suivant : c\'est la gamme de do majeur, complète. B s\'arrête sur si et donne envie d\'aller plus loin.' },
    id: 'gamme_do', title: 'La gamme de do majeur', palier: 1, unite: '1.6', prerequis: ['notes_instrument', 'grave_aigu'],
    lecon: [
      { text: 'Joue toutes les notes de do au do suivant, sans touche noire : c\'est la gamme de do majeur, la plus importante de la musique occidentale.', example: { label: 'do ré mi fa sol la si do', notes: q(GAMME_DO, 0.5), tempo: 100 } },
      { text: 'Les marches ne sont pas égales : entre mi et fa, et entre si et do, il n\'y a pas de touche noire. Ce sont des demi-tons ; partout ailleurs, des tons.' },
      { text: 'C\'est cette suite « ton, ton, demi-ton, ton, ton, ton, demi-ton » qui donne à la gamme majeure sa couleur.' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces deux mélodies sonne terminée ?', a: clip([64, 62, 60], 80), b: clip([60, 62, 64, 62], 80), answer: 'A', reveal: 'A rentre sur do, la note de départ de la gamme de do : la « maison ». B reste en suspens sur ré.' },
    id: 'tonique', title: 'La tonique, maison de la gamme', palier: 1, unite: '1.7', prerequis: ['gamme_do'],
    lecon: [
      { text: 'La gamme de do part de do et y revient : do est sa tonique, la note « maison ». Une mélodie qui finit sur la tonique sonne terminée.', example: { label: 'Finie sur do', notes: q([64, 62, 60]), tempo: 80 } },
      { text: 'Une mélodie qui s\'arrête ailleurs laisse une impression de suspens. Le bourdon des exercices fait sonner la tonique en continu pour t\'aider à la sentir.' },
    ],
  },
  {
    discover: { question: 'Laquelle monte marche par marche dans la gamme ?', a: clip([60, 62, 64], 80), b: clip([60, 64, 62], 80), answer: 'A', reveal: 'A monte do-ré-mi : les 1re, 2e et 3e notes de la gamme. On les appelle les degrés 1, 2 et 3.' },
    id: 'degres_1_3', title: 'Les degrés : la gamme numérotée', palier: 1, unite: '1.8', prerequis: ['tonique'],
    lecon: [
      { text: 'Numérote les notes de la gamme à partir de la tonique : do = 1, ré = 2, mi = 3, et ainsi de suite. Ces numéros sont les degrés.', example: { label: '1-2-3-2-1 (do ré mi ré do)', notes: q([60, 62, 64, 62, 60]), tempo: 90 } },
      { text: 'L\'intérêt : les degrés décrivent une mélodie quelle que soit la tonique. 1-2-3 en do, c\'est do-ré-mi ; en la (à la guitare), c\'est la-si-do♯.' },
      { text: 'Sur le clavier et le manche de l\'appli, les petits chiffres sont ces degrés.' },
    ],
  },
  {
    discover: { question: 'Lequel ressemble à une réponse ?', a: clip([64, 62, 62, 60], 90), b: clip([60, 62, 64, 62], 90), answer: 'A', reveal: 'A rentre à la maison (1) : c\'est une réponse. B s\'arrête en l\'air : c\'est une question.' },
    id: 'premiere_impro', title: 'Première impro', palier: 1, unite: '1.9', prerequis: ['degres_1_3', 'noire_blanche_silence'],
    lecon: [
      { text: 'Improviser, c\'est choisir parmi quelques degrés de la gamme et leur donner un rythme. Une phrase qui finit sur 1 sonne comme une réponse.' },
      { text: 'Les silences font partie de l\'impro : joue, respire, réponds.' },
    ],
  },

  // ================= PALIER 2 — Toute la gamme, puis les accords =================
  {
    discover: { question: 'Après laquelle as-tu le plus envie d\'entendre do ?', a: clip([60, 62, 67], 70), b: clip([60, 62, 64], 70), answer: 'A', reveal: 'A s\'arrête sur sol, le 5e degré : le tremplin qui appelle le retour à 1.' },
    id: 'degres_1_5', title: 'Degrés 4 et 5', palier: 2, unite: '2.1', prerequis: ['degres_1_3'],
    lecon: [
      { text: 'On continue la gamme : fa = 4, sol = 5. Le 5 est le tremplin : il crée une attente qui se résout sur 1.', example: { label: '5 → 1 (sol → do)', notes: q([67, 60], 1.5), tempo: 70 } },
      { text: 'Croches : deux notes dans un temps. Dis « ti-ti » pour une paire de croches, « ta » pour une noire.' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces gammes s\'arrête sur la note qui « veut » monter ?', a: clip([60, 62, 64, 65, 67, 69, 71], 120, 0.5), b: clip(GAMME_DO, 120, 0.5), answer: 'A', reveal: 'A s\'arrête sur si, le 7e degré : la sensible, collée au do suivant, qui veut absolument y monter.' },
    id: 'gamme_majeure', title: 'Toute la gamme : 6, 7 et la sensible', palier: 2, unite: '2.2', prerequis: ['degres_1_5'],
    lecon: [
      { text: 'La gamme a 7 degrés : la = 6, si = 7, puis le do suivant revient au 1 (on l\'écrit 8). Le 7, la sensible, est à un demi-ton du 8 et veut monter.', example: { label: '1 à 8', notes: q(GAMME_DO, 0.5), tempo: 100 } },
      { text: 'Rappel de la gamme de do : les demi-tons sont entre 3-4 (mi-fa) et 7-8 (si-do).' },
    ],
  },
  {
    discover: { question: 'Lequel de ces deux sol est le 5 de do ?', a: clip([60, 67], 70, 1.5), b: clip([60, 55], 70, 1.5), answer: 'A', reveal: 'Les deux ! Sol est le 5 de do au-dessus comme en dessous : c\'est sa fonction. Mais la distance change : une quinte en montant, une quarte en descendant.' },
    id: 'tierce_majeure', title: 'Fonctions et intervalles', palier: 2, unite: '2.3', prerequis: ['gamme_majeure'],
    confusions: ['tierce_mineure', 'quarte_juste'],
    lecon: [
      { text: 'Tout se rejoint ici. La fonction d\'une note, c\'est son degré par rapport à 1 (sol = 5 de do, où qu\'il soit). L\'intervalle, c\'est la distance entre deux notes : do-mi est une tierce, do-sol une quinte.', example: { label: 'Seconde, tierce, quinte depuis do', notes: [{ midi: 60, start: 0, dur: 1 }, { midi: 62, start: 1, dur: 1 }, { midi: 60, start: 2.5, dur: 1 }, { midi: 64, start: 3.5, dur: 1 }, { midi: 60, start: 5, dur: 1 }, { midi: 67, start: 6, dur: 1 }], tempo: 80 } },
      { text: 'La taille exacte d\'un intervalle se compte en demi-tons, grâce aux tons et demi-tons de la gamme : do-mi (1-3) = 4 demi-tons, tierce majeure ; ré-fa (2-4) = 3 demi-tons, tierce mineure.' },
      { text: 'Pour jouer et improviser, pense en fonctions ; pour construire un accord, compte les intervalles : deux tierces empilées font un accord. Et en 3/4, la valse : FORT-faible-faible.' },
    ],
  },
  {
    discover: { question: 'Ces deux mélodies sont-elles les mêmes, en degrés ?', a: clip([60, 62, 64], 80), b: clip([67, 69, 71], 80), answer: 'A', reveal: 'Oui : 1-2-3 en do (do-ré-mi), puis 1-2-3 en sol (sol-la-si). Mêmes degrés, mêmes intervalles, autre tonique.' },
    id: 'noms_notes', title: 'Changer de tonique', palier: 2, unite: '2.4', prerequis: ['tierce_majeure'],
    lecon: [
      { text: 'Garde la même suite de tons et demi-tons, mais pars de sol : sol-la-si-do-ré-mi-fa♯-sol. C\'est la gamme de sol majeur ; sol devient 1.' },
      { text: 'Pour traduire un degré en nom de note, récite la gamme depuis la tonique. En sol : 3 = si, 5 = ré, 7 = fa♯.' },
    ],
  },
  {
    discover: { question: 'Lequel sonne le plus joyeux ?', a: clip([60, 64, 67], 90), b: clip([60, 63, 67], 90), answer: 'A', reveal: 'A est un accord majeur (do-mi-sol), B un accord mineur (do-mi♭-sol). Seule la tierce change.' },
    id: 'accords_145', title: 'Accords I, IV, V', palier: 2, unite: '2.5', prerequis: ['noms_notes'],
    lecon: [
      { text: 'Empile deux tierces sur un degré : tu obtiens un accord. Sur 1 : do-mi-sol (I). Sur 4 : fa-la-do (IV). Sur 5 : sol-si-ré (V).', example: { label: 'Accord de do', notes: [60, 64, 67].map((m) => ({ midi: m, start: 0, dur: 2 })), tempo: 70 } },
      { text: 'I = repos, IV = on s\'éloigne, V = tension qui appelle le retour à I. À eux trois, ils accompagnent des milliers de chansons.' },
    ],
  },
  {
    discover: { question: 'Dans lequel l\'accord change-t-il sur le temps ?', a: clip([48, 48, 48, 48, 53, 53, 53, 53], 100), b: clip([48, 48, 48, 53, 53, 53, 53, 53], 100), answer: 'A', reveal: 'Dans A, le changement tombe sur le 1er temps de la mesure. Dans B, il arrive un temps trop tôt.' },
    id: 'enchainer', title: 'Enchaîner les accords', palier: 2, unite: '2.6', prerequis: ['accords_145'],
    lecon: [
      { text: 'Une grille dit quel accord jouer à chaque mesure : | I | IV | V | I |. Change d\'accord sur le 1er temps, sans casser la pulsation.' },
      { text: 'L\'anacrouse (levée) : une note avant la 1re mesure, comme « Joyeux an-ni-ver-saire ».' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces gammes n\'a aucune note qui frotte ?', a: clip([60, 62, 64, 67, 69, 72], 110, 0.5), b: clip([60, 62, 64, 65, 67, 71, 72], 110, 0.5), answer: 'A', reveal: 'A est la pentatonique majeure (1-2-3-5-6) : sans les degrés 4 et 7, elle n\'a aucun demi-ton.' },
    id: 'penta_majeure', title: 'Pentatonique majeure', palier: 2, unite: '2.7', prerequis: ['enchainer'],
    lecon: [
      { text: 'Retire de la gamme les deux degrés des demi-tons (4 et 7) : il reste 1-2-3-5-6, la pentatonique majeure. Rien n\'y sonne faux sur I, IV et V.', example: { label: 'Penta de do', notes: q([60, 62, 64, 67, 69, 72], 0.5), tempo: 100 } },
      { text: 'Une bonne phrase d\'impro respire : joue 2 mesures, laisse 2 mesures de silence.' },
    ],
  },

  // ================= PALIER 3 — Mineur et couleurs =================
  {
    discover: { question: 'Laquelle de ces deux phrases sonne la plus sombre ?', a: clip([60, 62, 64, 65, 67, 65, 64, 62, 60], 110, 0.5), b: clip([60, 62, 63, 65, 67, 65, 63, 62, 60], 110, 0.5), answer: 'B', reveal: 'B est la même phrase en mineur : son 3e degré est abaissé (♭3). C\'est lui qui assombrit tout.' },
    id: 'mineur_relatif', title: 'La gamme mineure', palier: 3, unite: '3.1', prerequis: ['penta_majeure'],
    lecon: [
      { text: 'Joue les notes de do majeur, mais en partant de la : la-si-do-ré-mi-fa-sol-la. C\'est la mineur, la relative mineure de do : mêmes notes, autre maison (le 6e degré de do).', example: { label: 'La mineur naturelle', notes: q([57, 59, 60, 62, 64, 65, 67, 69], 0.5), tempo: 100 } },
      { text: 'Par rapport à la majeure de même tonique, trois degrés descendent d\'un demi-ton : 1 2 ♭3 4 5 ♭6 ♭7. Le ♭3 donne la couleur mineure.' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces deux notes, après la cadence mineure, est le ♭3 ?', a: clip([63], 70, 2), b: clip([62], 70, 2), answer: 'A', reveal: 'A est le ♭3 : stable et sombre, il fait partie de l\'accord de tonique mineur. B est le 2, qui veut bouger.' },
    id: 'degres_mineur', title: 'Entendre en mineur : ♭3, ♭6, ♭7', palier: 3, unite: '3.2', prerequis: ['mineur_relatif'],
    lecon: [
      { text: 'En mineur, chaque degré garde sa fonction, mais trois couleurs changent : ♭3 sombre et stable, ♭6 lourd et tendu vers 5, ♭7 plus léger, qui redescend volontiers.', example: { label: '1 ♭3 5 ♭6 5 (la mineur)', notes: q([57, 60, 64, 65, 64]), tempo: 80 } },
      { text: 'Avant chaque exercice, une cadence mineure i-iv-V-i installe la tonalité. Le V reste majeur (mineur harmonique) pour bien tirer vers la tonique.' },
    ],
  },
  {
    discover: { question: 'Lequel de ces intervalles sonne le plus instable ?', a: clip([60, 66], 70, 1.5), b: clip([60, 67], 70, 1.5), answer: 'A', reveal: 'A est le triton (3 tons) : il partage l\'octave en deux et ne se pose nulle part. B est la quinte, ouverte et stable.' },
    id: 'intervalles_tous', title: 'Tous les intervalles', palier: 3, unite: '3.3', prerequis: ['degres_mineur'],
    lecon: [
      { text: 'Douze distances, quatre familles : ouvertes (quinte, octave, quarte), douces (tierces, sixtes), frottantes (secondes, septièmes), instable (le triton). Classe d\'abord par famille, puis précise.', example: { label: 'Quinte, tierce, seconde, triton', notes: [{ midi: 60, start: 0, dur: 1.5 }, { midi: 67, start: 0, dur: 1.5 }, { midi: 60, start: 2, dur: 1.5 }, { midi: 64, start: 2, dur: 1.5 }, { midi: 60, start: 4, dur: 1.5 }, { midi: 62, start: 4, dur: 1.5 }, { midi: 60, start: 6, dur: 1.5 }, { midi: 66, start: 6, dur: 1.5 }], tempo: 80 } },
      { text: 'Travaille-les en montant ET en descendant : beaucoup de musiciens ne s\'entraînent qu\'en montant et restent faibles en descendant. Plus le battement entre deux notes jouées ensemble est rapide, plus l\'intervalle frotte.' },
    ],
  },
  {
    discover: { question: 'Lequel de ces accords sonne comme « en suspens » ?', a: clip([60, 64, 68], 90), b: clip([60, 64, 67], 90), answer: 'A', reveal: 'A est un accord augmenté (deux tierces majeures) : il flotte sans se poser. B est un accord majeur, stable.' },
    id: 'triades', title: 'Les quatre triades', palier: 3, unite: '3.4', prerequis: ['intervalles_tous'],
    lecon: [
      { text: 'Deux tierces empilées font une triade. Majeur = tierce majeure + mineure ; mineur = mineure + majeure ; diminué = deux mineures ; augmenté = deux majeures.', example: { label: 'Majeur, mineur, diminué, augmenté', notes: [[60, 64, 67], [60, 63, 67], [60, 63, 66], [60, 64, 68]].flatMap((c, i) => c.map((m) => ({ midi: m, start: i * 2, dur: 1.8 }))), tempo: 80 } },
      { text: 'Renverser un accord, c\'est mettre une autre note en bas (mi-sol-do au lieu de do-mi-sol) : la couleur reste la même.' },
    ],
  },
  {
    discover: { question: 'Après la cadence, lequel de ces accords sonne le plus « triste » ?', a: clip([57, 60, 64], 80, 2), b: clip([53, 57, 60], 80, 2), answer: 'A', reveal: 'A est vi (la mineur), l\'accord mineur le plus utilisé en majeur. B est IV (fa majeur).' },
    id: 'accords_diatoniques', title: 'Les sept accords de la gamme', palier: 3, unite: '3.5', prerequis: ['triades'],
    lecon: [
      { text: 'Une triade sur chaque degré de la gamme majeure : I, ii, iii, IV, V, vi, vii°. Majeurs sur 1, 4, 5 ; mineurs sur 2, 3, 6 ; diminué sur 7.', example: { label: 'I – vi – IV – V', notes: [1, 6, 4, 5].flatMap((d, i) => [0, 4, 7].map((x) => ({ midi: [48, 57, 53, 55][i] + (d === 6 && x === 4 ? 3 : x), start: i * 2, dur: 1.8 }))), tempo: 80 } },
      { text: 'Pour reconnaître un accord dans une grille : écoute d\'abord la basse (le degré), puis la couleur (majeur ou mineur).' },
    ],
  },
  {
    discover: { question: 'Dans lequel une note tombe-t-elle entre les temps ?', a: clip([72, 72, 72, 72], 90), b: { notes: [{ midi: 72, start: 0, dur: 0.45 }, { midi: 72, start: 0.5, dur: 0.95 }, { midi: 72, start: 1.5, dur: 0.45 }, { midi: 72, start: 2, dur: 0.9 }], tempo: 90 }, answer: 'B', reveal: 'B contient une syncope : la note longue démarre entre deux temps et enjambe le temps suivant. C\'est ce qui fait « groover ».' },
    id: 'syncopes', title: 'Syncopes et doubles croches', palier: 3, unite: '3.6', prerequis: ['penta_majeure'],
    lecon: [
      { text: 'Une syncope : croche – noire – croche. La noire commence sur le « et » et enjambe le temps suivant. Compte « 1 et 2 et » : tu frappes sur 1, sur « et », puis sur le « et » du 2.', notation: ['syncope'], example: { label: 'Syncope', notes: [{ midi: 72, start: 0, dur: 0.45 }, { midi: 72, start: 0.5, dur: 0.95 }, { midi: 72, start: 1.5, dur: 0.45 }], tempo: 80 } },
      { text: 'Quatre doubles croches dans un temps : compte « 1 e et a ». Elles vont deux fois plus vite que les croches.' },
    ],
  },
  {
    discover: { question: 'Lequel sonne « blues » ?', a: clip([60, 63, 65, 66, 67, 70, 72], 110, 0.5), b: clip([60, 62, 64, 67, 69, 72], 110, 0.5), answer: 'A', reveal: 'A est la gamme blues (1 ♭3 4 ♯4 5 ♭7) : des notes mineures sur un accompagnement majeur. B est la pentatonique majeure.' },
    id: 'blues', title: 'Le blues', palier: 3, unite: '3.7', prerequis: ['accords_diatoniques', 'syncopes'],
    lecon: [
      { text: 'Le blues tient en 12 mesures : I I I I | IV IV I I | V IV I V, en accords de 7e. Dessus, on joue la pentatonique mineure (1 ♭3 4 5 ♭7) : ses notes « frottent » contre l\'accord majeur, c\'est le son du blues.', example: { label: 'Pentatonique mineure', notes: q([60, 63, 65, 67, 70, 72], 0.5), tempo: 100 } },
      { text: 'Ajoute ♯4 entre 4 et 5 : c\'est la « blue note », qu\'on effleure en passant.' },
    ],
  },

  // ================= PALIER 4 — Harmonie fonctionnelle =================
  {
    discover: { question: 'Lequel de ces deux accords « veut » aller ailleurs ?', a: clip([48, 52, 55, 59], 80, 2), b: clip([48, 52, 55, 58], 80, 2), answer: 'B', reveal: 'B est un accord de dominante (do 7) : sa 7e mineure crée une tension qui demande à se résoudre. A (do maj7) est doux et posé.' },
    id: 'accords_7', title: 'Les accords de 7e', palier: 4, unite: '4.1', prerequis: ['accords_diatoniques'],
    lecon: [
      { text: 'Ajoute une tierce de plus à une triade : tu obtiens un accord de 7e. Quatre couleurs : maj7 (doux, rêveur), 7 de dominante (tendu), m7 (mineur détendu), m7♭5, dit demi-diminué (sombre, instable).', example: { label: 'maj7, 7, m7, m7♭5', notes: [[48, 52, 55, 59], [48, 52, 55, 58], [48, 51, 55, 58], [48, 51, 54, 58]].flatMap((c, i) => c.map((m) => ({ midi: m, start: i * 2, dur: 1.8 }))), tempo: 80 } },
      { text: 'Dans la gamme majeure : Imaj7, ii7, iii7, IVmaj7, V7, vi7, viiø7. Un seul accord de dominante : celui du degré 5.' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces deux phrases sonne terminée ?', a: { notes: [[1, 0], [4, 1.5], [5, 3], [1, 4.5]].flatMap(([d, t]) => [0, 4, 7].map((x) => ({ midi: [48, 48, 0, 0, 53, 55][d as number] + x, start: t as number, dur: 1.4 }))), tempo: 80 }, b: { notes: [[1, 0], [4, 1.5], [1, 3], [5, 4.5]].flatMap(([d, t]) => [0, 4, 7].map((x) => ({ midi: [48, 48, 0, 0, 53, 55][d as number] + x, start: t as number, dur: 1.4 }))), tempo: 80 }, answer: 'A', reveal: 'A finit par V → I : une cadence parfaite, le point final. B s\'arrête sur V : une demi-cadence, comme une virgule.' },
    id: 'cadences', title: 'Les cadences', palier: 4, unite: '4.2', prerequis: ['accords_7'],
    lecon: [
      { text: 'Une cadence, c\'est la ponctuation de la musique. Parfaite (V → I) : un point. Plagale (IV → I) : un « amen ». Demi-cadence (on s\'arrête sur V) : une virgule. Rompue (V → vi) : une surprise.' },
      { text: 'Pour les reconnaître : sur quoi finit la phrase (I, V ou vi) ? Puis quel accord vient juste avant (V ou IV) ?' },
    ],
  },
  {
    discover: { question: 'Lequel de ces enchaînements sonne « jazz » ?', a: { notes: [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59]].flatMap((c, i) => c.map((m) => ({ midi: m, start: i * 2, dur: 1.9 }))), tempo: 80 }, b: { notes: [[48, 52, 55], [53, 57, 60], [55, 59, 62]].flatMap((c, i) => c.map((m) => ({ midi: m, start: i * 2, dur: 1.9 }))), tempo: 80 }, answer: 'A', reveal: 'A est un ii-V-I en accords de 7e (ré m7, sol 7, do maj7) : l\'enchaînement le plus joué du jazz. B est un I-IV-V en triades.' },
    id: 'ii_v_i', title: 'Le ii-V-I', palier: 4, unite: '4.3', prerequis: ['cadences'],
    lecon: [
      { text: 'ii7 – V7 – Imaj7 : on prépare la dominante (ii), on crée la tension (V), on résout (I). C\'est la cadence la plus importante du jazz et de la pop.', example: { label: 'ii-V-I en do', notes: [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59]].flatMap((c, i) => c.map((m) => ({ midi: m, start: i * 2, dur: 1.9 }))), tempo: 80 } },
      { text: 'Les notes-guides : la tierce et la septième de chaque accord. Elles portent toute la couleur et s\'enchaînent par demi-tons d\'un accord à l\'autre.' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces notes est plus grave ?', a: clip([43], 60, 2), b: clip([55], 60, 2), answer: 'A', reveal: 'A est le sol grave, sur la 1re ligne en clé de fa. Cette clé sert à écrire le grave : la main gauche du piano, la basse.' },
    id: 'cle_fa', title: 'Lire en clé de fa', palier: 4, unite: '4.4', prerequis: ['accords_diatoniques'],
    lecon: [
      { text: 'La clé de fa écrit les notes graves. Ses deux points encadrent la 4e ligne : c\'est le fa. La 1re ligne en bas est sol, puis : sol, la, si, do, ré, mi, fa, sol, la.' },
      { text: 'Repère utile : le do du milieu est juste au-dessus de la portée en clé de fa, sur une petite ligne, comme il est juste au-dessous en clé de sol.' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces deux lignes « swingue » ?', a: { notes: Array.from({ length: 8 }, (_, k) => ({ midi: 67 + (k % 3), start: Math.floor(k / 2) + (k % 2 ? 0.5 : 0), dur: 0.3 })), tempo: 120 }, b: { notes: Array.from({ length: 8 }, (_, k) => ({ midi: 67 + (k % 3), start: Math.floor(k / 2) + (k % 2 ? 2 / 3 : 0), dur: 0.3 })), tempo: 120 }, answer: 'B', reveal: 'B est swing : chaque paire de croches est jouée longue-courte, comme un triolet « taa-ta ». A est jouée droite, égale.' },
    id: 'swing', title: 'Swing et triolets', palier: 4, unite: '4.5', prerequis: ['syncopes'],
    lecon: [
      { text: 'Un triolet : trois notes égales dans un temps (« tri-o-let »). Le swing joue les croches comme un triolet dont on lie les deux premières : longue, courte.', notation: ['triolet', 'noire', 'triolet', 'noire'] },
      { text: 'Écris des croches, joue-les swing : c\'est la convention du jazz et du blues.' },
    ],
  },
  {
    discover: { question: 'Sur cet accord de do, laquelle des deux notes du dessus en donne la couleur ?', a: { notes: [48, 52, 55].map((m) => ({ midi: m, start: 0, dur: 2.5 })).concat([{ midi: 64, start: 0.8, dur: 1.6 }]), tempo: 70 }, b: { notes: [48, 52, 55].map((m) => ({ midi: m, start: 0, dur: 2.5 })).concat([{ midi: 60, start: 0.8, dur: 1.6 }]), tempo: 70 }, answer: 'A', reveal: 'A joue mi, la tierce de do : c\'est elle qui dit « majeur ». B joue do, la fondamentale, qui se fond dans l\'accord sans rien ajouter.' },
    id: 'notes_cibles', title: 'Notes cibles', palier: 4, unite: '4.6', prerequis: ['ii_v_i', 'blues'],
    lecon: [
      { text: 'En impro, ce qui fait entendre la grille, ce sont les notes de chaque accord posées au bon moment, surtout la tierce, sur le 1er temps de la mesure.' },
      { text: 'Entraîne-toi d\'abord à viser la tierce de chaque accord ; ensuite, approche-la par la note voisine. C\'est la base du jeu « sur les changements ».' },
    ],
  },

  // ================= PALIER 5 — Modes et emprunts =================
  {
    discover: { question: 'Laquelle de ces deux phrases mineures a un 6 lumineux ?', a: clip([60, 62, 63, 65, 67, 69, 67, 63, 60], 110, 0.5), b: clip([60, 62, 63, 65, 67, 68, 67, 63, 60], 110, 0.5), answer: 'A', reveal: 'A est en dorien : mineur, mais avec un 6 naturel qui l\'éclaire. B est en mineur éolien, avec un ♭6 plus sombre.' },
    id: 'modes', title: 'Les modes', palier: 5, unite: '5.1', prerequis: ['notes_cibles', 'degres_mineur'],
    lecon: [
      { text: 'Un mode, c\'est la gamme majeure avec une ou deux notes changées, et donc une autre couleur. Dorien : mineur avec un 6 naturel. Mixolydien : majeur avec un ♭7. Lydien : majeur avec un ♯4. Phrygien : mineur avec un ♭2.', example: { label: 'Dorien puis mixolydien sur do, avec un bourdon', notes: [...q([60, 62, 63, 65, 67, 69, 70, 72, 72, 70, 69, 67, 65, 64, 62, 60], 0.5), { midi: 48, start: 0, dur: 8 }, { midi: 55, start: 0, dur: 8 }], tempo: 110 } },
      { text: 'Pour reconnaître un mode : majeur ou mineur d\'abord (la tierce), puis cherche la note caractéristique. Tom Quayle les pense tous en chiffres : chaque mode n\'est qu\'une formule.' },
    ],
  },
  {
    discover: { question: 'Lequel des deux enchaînements I – ? – V – I sonne « emprunté » ?', a: { notes: [[0, 4, 7], [5, 8, 12], [7, 11, 14], [0, 4, 7]].flatMap((c, i) => c.map((x) => ({ midi: 48 + x, start: i * 2, dur: 1.9 }))), tempo: 80 }, b: { notes: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]].flatMap((c, i) => c.map((x) => ({ midi: 48 + x, start: i * 2, dur: 1.9 }))), tempo: 80 }, answer: 'A', reveal: 'A emprunte iv, l\'accord mineur sur 4, à la tonalité de do mineur : une ombre passe. B joue IV, l\'accord de la gamme.' },
    id: 'emprunts', title: 'Les emprunts', palier: 5, unite: '5.2', prerequis: ['modes'],
    lecon: [
      { text: 'Un emprunt : en majeur, on prend un accord à la tonalité mineure de même tonique. Les plus courants : iv (fa mineur en do), ♭VII (si♭), ♭VI (la♭), ♭III (mi♭).' },
      { text: 'Pour les repérer, garde la tonalité bien en tête : l\'accord qui sort de la gamme crée une surprise, un « oh ». C\'est l\'étape 5 de Use Your Ear : entendre ce qui sort de la tonalité.' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces deux phrases change de maison en route ?', a: { notes: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7], [9, 12, 16], [14, 18, 21], [7, 11, 14]].flatMap((c, i) => c.map((x) => ({ midi: 48 + x, start: i * 1.6, dur: 1.5 }))), tempo: 90 }, b: { notes: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7], [9, 12, 16], [5, 9, 12], [0, 4, 7]].flatMap((c, i) => c.map((x) => ({ midi: 48 + x, start: i * 1.6, dur: 1.5 }))), tempo: 90 }, answer: 'A', reveal: 'A finit en sol : la musique a déménagé vers la dominante (ré majeur, avec son fa♯, l\'y conduit). B revient en do.' },
    id: 'modulation', title: 'Changer de tonalité', palier: 5, unite: '5.3', prerequis: ['emprunts'],
    lecon: [
      { text: 'Moduler, c\'est changer de maison en cours de route. Les voisines les plus proches : la dominante (V), la sous-dominante (IV), le relatif mineur (vi). On y passe souvent par un accord pivot, commun aux deux tonalités.' },
      { text: 'Pour l\'entendre : chante la tonique du début, puis celle de la fin. Si elles diffèrent, la musique a modulé. C\'est l\'étape 6 de Use Your Ear.' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces deux pulsations tourne en 5 ?', a: { notes: Array.from({ length: 15 }, (_, k) => ({ midi: k % 5 === 0 ? 84 : 77, start: k, dur: 0.3 })), tempo: 150 }, b: { notes: Array.from({ length: 16 }, (_, k) => ({ midi: k % 4 === 0 ? 84 : 77, start: k, dur: 0.3 })), tempo: 150 }, answer: 'A', reveal: 'A accentue un temps sur cinq : une mesure à 5 temps, asymétrique (souvent 3 + 2). B est en 4.' },
    id: 'mesures_impaires', title: 'Mesures impaires', palier: 5, unite: '5.4', prerequis: ['swing'],
    lecon: [
      { text: 'Une mesure à 5 temps se sent comme 3 + 2 (ou 2 + 3) ; à 7 temps, comme 4 + 3 ou 2 + 2 + 3. Compte en regroupant : « 1 2 3 1 2 ».' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces deux gammes de sol est juste ?', a: clip([55, 57, 59, 60, 62, 64, 66, 67], 110, 0.5), b: clip([55, 57, 59, 60, 62, 64, 65, 67], 110, 0.5), answer: 'A', reveal: 'A est sol majeur, avec son fa♯ (la sensible). B joue fa naturel : c\'est sol mixolydien. Connaître les gammes partout, c\'est savoir où sont ces petites différences.' },
    id: 'manche_complet', title: 'Les gammes partout', palier: 5, unite: '5.5', prerequis: ['modes'],
    lecon: [
      { text: 'Joue chaque gamme dans toutes les tonalités, et chaque fonction depuis n\'importe quelle fondamentale : c\'est la méthode de Tom Quayle. On apprend des petits blocs (une fonction, une octave) qu\'on déplace, plutôt que de grandes formes.' },
    ],
  },
  {
    discover: { question: 'Laquelle de ces impros reste dans la couleur du bourdon ?', a: { notes: [62, 63, 65, 69, 67, 63, 60].map((m, i) => ({ midi: m, start: i * 0.5, dur: 0.45 })).concat([{ midi: 48, start: 0, dur: 3.5 }]), tempo: 100 }, b: { notes: [62, 64, 65, 66, 67, 64, 60].map((m, i) => ({ midi: m, start: i * 0.5, dur: 0.45 })).concat([{ midi: 48, start: 0, dur: 3.5 }]), tempo: 100 }, answer: 'A', reveal: 'A reste en do dorien (♭3, 6) et fait sonner le mode. B mélange tierce majeure et ♯4 : on ne sait plus où on est.' },
    id: 'impro_modale', title: 'Impro modale', palier: 5, unite: '5.6', prerequis: ['modes', 'notes_cibles'],
    lecon: [
      { text: 'Sur un bourdon, un mode se fait entendre par sa note caractéristique : pose-la sur les temps forts et termine tes phrases sur 1. Le reste de la gamme sert de chemin.' },
    ],
  },
];

export const conceptById = (id: string) => CONCEPTS.find((c) => c.id === id);
