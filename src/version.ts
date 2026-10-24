// Version de l'appli et notes de mise à jour (écran « Nouveautés »).
// - APP_VERSION : à monter à chaque mise à jour publiée aux testeurs, avec une entrée dans RELEASES.
// - BUILD_ID : généré automatiquement à chaque construction de la version web (horodatage).
declare const __BUILD_ID__: string | undefined;

export interface Release { version: string; date: string; notes: string[] }

/** La plus récente en premier. Une phrase par nouveauté, du point de vue du testeur. */
export const RELEASES: Release[] = [
  {
    version: '0.25.0', date: '2026-10-24', notes: [
      'Quatre onglets au lieu de six : Séance, Leçons, Jouer (avec le métronome, l\'accordeur et le nouveau Jam) et Moi. Le métronome s\'ouvre sur l\'essentiel ; signatures, swing et automate sont sous « Plus de réglages ».',
      'La séance démarre d\'un toucher : durée, module technique, instrument et chant se règlent une fois dans Moi. Plus d\'écran entre les parties, et la consigne complète n\'apparaît qu\'à la 1re rencontre d\'un exercice. Réussi : on enchaîne tout seul.',
      'Une séance qui forme un tout : échauffement, révision, entendre, trouver, rejouer, puis une minute d\'improvisation. Quand tu connais les armures, entendre, trouver et rejouer partagent la tonalité du jour.',
      'Dans chaque leçon, « À toi d\'essayer » : tu cherches avec les mains avant qu\'on te donne le nom. Les claviers et manches dessinés se jouent. « Je connais déjà » permet de passer directement la validation.',
      'La difficulté monte sans plafond : au-delà des niveaux écrits, tempo, longueur des phrases, toutes les tonalités, moins d\'aide. Elle vise environ 80 % de réussites nettes : un cran plus dur après trois réussites franches, un cran plus facile après un échec.',
      'Nouveau chapitre « Pour aller plus loin » : dominantes secondaires, accords enrichis (9, sus, 13), conduite des voix, modes du mineur mélodique. Et aussi : lecture à vue en rythme, repiquage de phrases plus longues sur ii – V – I.',
      'Jam : un accompagnement en boucle (pop, rock, shuffle, funk, bossa, ballade) sur six grilles, avec les notes de la gamme et celles de l\'accord en cours à viser.',
      'Moi : une seule vue de progression, par compétence (oreille, instrument, lecture et théorie, rythme), et des réglages rangés. Ta progression passe au nouveau modèle sans rien perdre.',
    ],
  },
  {
    version: '0.24.1', date: '2026-10-18', notes: [
      'Les exercices qui parlent en degrés (degrés 1 à 7, dictées, fonctions sur l\'instrument…) arrivent avec la leçon 3, celle qui explique les degrés, et plus dès la leçon 2.',
      'Les exercices de modes et de gammes portent le nom de ce que tu joues : « Joue le mixolydien », « Positions : le lydien », « Le phrygien sur une corde ». Au piano, plus de « positions » : la gamme avec son doigté.',
    ],
  },
  {
    version: '0.24.0', date: '2026-10-18', notes: [
      'Pratique devient le catalogue des exercices standards, à régler toi-même : ear training, rythme (mesure, tempo, figures), mapping, technique (gamme, position ou une seule corde, sens, tempo de départ et pas d\'accélération après chaque réussite) et improvisation. Les notions et exercices de tes leçons arrivent désormais dans la partie Révision de ton workout.',
      'Onglet Leçons : un « Afficher plus » avant la leçon en cours (les leçons validées) et un autre après (la suite du cursus).',
      'Parcours revu : les intervalles passent avant les accords (on empile des tierces qu\'on connaît déjà) ; au piano, la clé de fa arrive juste après la portée ; entre le mixolydien et le lydien, une leçon de rythme (mesures impaires) et une d\'harmonie (emprunts) laissent les couleurs modales décanter.',
      'Les exercices de degrés (quel degré, stable ou instable, où va la phrase, chante la résolution) gardent la tonique tenue en fond, pour ancrer chaque note sur la maison.',
      'Théorie précisée : l\'accord m7♭5 s\'appelle demi-diminué ; la syncope est un accent déplacé (croche-noire-croche n\'en est qu\'une figure) ; le swing (croches inégales) n\'est pas le backbeat (appui sur 2 et 4) ; le triton explique le côté inquiet de l\'accord diminué ; le locrien est le seul mode sans quinte juste. Plusieurs formulations reprises.',
    ],
  },
  {
    version: '0.23.1', date: '2026-10-13', notes: [
      'Perroquet sur accords : la mélodie se détache enfin. Les accords passent sous la mélodie, avec une basse, moins fort, avec l\'autre timbre (guitare sous un lead de piano, et inversement) et feutrés : leurs aigus sont filtrés. Un bouton « La mélodie seule » la fait réentendre sans accompagnement.',
      'Les degrés se lisent sur une vraie portée, en do : l\'ancienne échelle de lignes sans interlignes, qui ne correspondait à aucune écriture musicale, disparaît.',
    ],
  },
  {
    version: '0.23.0', date: '2026-10-12', notes: [
      'L\'onglet Pratique ne montre plus aucune leçon : seulement tes exercices, rangés par domaine (oreille, rythme, théorie, technique, impro) puis par notion, la plus récente en haut.',
      'Chaque exercice est rattaché à la bonne leçon : 15 exercices étaient rangés sous une leçon qui ne les expliquait pas encore, ils ont été corrigés, et un test le vérifie désormais pour tout le cursus.',
      'La leçon 14 (présentation des modes) redevient à découvrir si tu avais vu l\'ancienne version : ses exercices n\'apparaissent qu\'après l\'avoir lue. « D\'où vient ce mode ? » n\'est plus dans le mapping, et ses réponses ne trahissent plus la bonne réponse.',
      'Guitare : la portée s\'écrit une octave au-dessus du son, tes notes jouées aussi ; une réponse jouée entièrement une octave plus haut ou plus bas est juste. Une note à la mauvaise octave est signalée clairement.',
      'Écrire sur la portée : chaque note posée sonne. L\'échelle des degrés se lit comme une portée (lignes et interlignes). La clé de sol est dessinée et s\'enroule bien autour de la ligne de sol.',
      'Les leçons rapportent des XP : leçon lue, validée, confirmée, et leurs exercices comme en séance.',
      'Intervalles descendants : consigne et indice propres au sens descendant. Les questions de théorie disent toutes clairement ce qui est demandé. Les boutons à long libellé passent à la ligne.',
    ],
  },
  {
    version: '0.22.0', date: '2026-10-12', notes: [
      'Les modes deviennent une phase à part, avec 5 leçons. D\'abord une présentation : un mode, ce sont les notes d\'une gamme majeure jouées depuis un autre degré (ré dorien = do majeur de ré à ré), et pour un mode sur do, on cherche sa gamme majeure parente (do dorien = les notes de si♭ majeur).',
      'Puis une leçon par mode : le dorien, le mixolydien, le lydien, et enfin le phrygien avec le locrien. Pour chacun : son son, une phrase à chanter, son rythme typique, la gamme sur l\'instrument (sur une corde et en position à la guitare), l\'accord qui le porte et un perroquet.',
      'Nouvel exercice « D\'où vient ce mode ? » : le décalage, la gamme parente, la formule en tons et demi-tons, l\'accord du mode. Les modes rejoignent aussi le module technique de la séance.',
      'L\'onglet Pratique ne contient plus que des exercices : ceux des leçons que tu as vues, rangés par leçon, puis les séries réglables.',
      'L\'onglet Arbre devient « Leçons » et s\'allège : ta prochaine leçon et les 3 suivantes ; les leçons validées et les plus lointaines se retrouvent avec « Afficher tout le cursus ».',
      'Les emprunts et modulations deviennent la leçon 19.',
    ],
  },
  {
    version: '0.21.0', date: '2026-10-13', notes: [
      'Les leçons 9 à 15 passent en version complète : chacune commence par une écoute à comparer, puis 7 à 8 écrans illustrés, avec des variantes au manche pour la guitare.',
      'Leçon 9, les intervalles : leur nom, leur qualité, leurs familles à l\'oreille et le renversement. Leçon 10, les trois mineurs et la sensible. Leçon 11, les accords de la gamme et leurs fonctions.',
      'Leçon 12, le cycle des quintes, dessiné, et les quatre cadences. Leçon 13, les accords de 7e, le ii-V-I et les notes-guides (avec les « shell voicings » à la guitare).',
      'Leçon 14, les modes sur un bourdon, du lydien au phrygien. Leçon 15, les accords empruntés (iv, ♭VII, ♭VI) et les modulations.',
      'Nouveaux exercices : nommer et renverser un intervalle, jouer un intervalle, reconnaître et jouer les trois mineurs, familles de fonctions, basse d\'une grille, cycle des quintes, quintes descendantes, chanter la note d\'un mode, emprunt ou modulation, arpèges avec accord emprunté.',
      'La séance du jour profite de ces nouveaux exercices dans les parties ear training, mapping et perroquet.',
    ],
  },
  {
    version: '0.20.0', date: '2026-10-12', notes: [
      'Le parcours devient un cursus de 19 leçons en 5 phases. Chaque notion de l\'arbre est rangée sous sa leçon, et une leçon s\'ouvre quand celles dont elle découle sont validées.',
      'La séance du jour ne propose que des exercices de leçons que tu as vues : l\'explication vient toujours avant la pratique.',
      'La séance a maintenant 5 parties : révision et validation, ear training, mapping (une note, un accord ou une gamme à jouer), perroquet, et un module technique en option (+5 ou +10 min).',
      'Au lancement, la séance te demande si tu as ton instrument et si tu peux chanter, et s\'adapte : au micro, à l\'écran ou en silence.',
      'Validation en deux temps : rapide en fin de leçon, puis une confirmation dans ta séance quelques jours après.',
      'Nouvelles leçons : syncopes et doubles croches, swing et triolets, mesures à 5 et 7 temps, clé de fa. Les leçons 9 à 15 arrivent en version courte.',
      'Module technique : à la guitare, degrés, gamme sur une corde, positions puis métronome ; au piano, degrés, 5 doigts, mains séparées puis ensemble, accords puis métronome. Le tempo monte quand tu réussis.',
    ],
  },
  {
    version: '0.18.0', date: '2026-10-08', notes: [
      'Leçons approfondies du palier 2 : construire les accords et sentir leur rôle (repos, suspendu, tension) · les altérations et l\'armure · la pentatonique, avec ses positions à la guitare.',
      'La portée sait maintenant afficher une armure : nouveaux exercices pour la lire, l\'entendre et jouer sa gamme.',
      'À la fin d\'un exercice joué, la partition et les touches (ou les cases) s\'affichent ensemble, avec le nom des notes.',
      'Corrections : un seul bouton pour effacer la dernière note, la case IVmaj7 lisible, le récapitulatif de séance défile, les cordes du manche dessinées dans le bon sens, des consignes plus claires (« un ton au-dessus de la », grille d\'accords).',
    ],
  },
  {
    version: '0.17.0', date: '2026-10-07', notes: [
      'Nouveau : les leçons approfondies, pour les notions clés. On écoute, on comprend pas à pas avec des illustrations, puis on pratique dans chaque domaine et on valide.',
      'Palier 1 : grave, aigu, tons et demi-tons · la gamme majeure et sa structure · les degrés et les tendances · la mesure et la subdivision · lire la portée. Dans l\'arbre et dans Pratique.',
    ],
  },
  {
    version: '0.16.2', date: '2026-10-07', notes: [
      'Donner un retour marche pour tout le monde : un petit formulaire (bug, pas clair, trop dur, idée…) envoyé par e-mail, WhatsApp ou SMS, avec l\'exercice en cours joint automatiquement.',
    ],
  },
  {
    version: '0.16.1', date: '2026-10-07', notes: [
      'Tes retours appliqués : la semaine compte bien tous tes jours joués (aussi sur plusieurs appareils et dans Pratique) ; métronome accentué selon la mesure (3/4, 5/4…) ; « ⌫ Dernière note » au lieu de tout effacer ; cordes graves plus épaisses, en bas.',
      'Modes : joués sur un bourdon, ▶ pour écouter chaque mode, et une entrée en douceur (majeur ou mineur, puis un mode à la fois). La démonstration des quiz fait enfin du son.',
      'Rythme : chiffrage de la mesure affiché, valse qui commence par 1 mesure, et un indice qui donne le comptage exact (« 1 · 2-et · 3 — »).',
      'Pratique : choisis la durée de tes séries d\'oreille et de perroquet. Intervalles notés 3m, 3M, 6m… Guitare : « Se repérer » demande maintenant toutes les positions d\'une note.',
    ],
  },
  {
    version: '0.16.0', date: '2026-10-06', notes: [
      'Audiation : vois un motif, entends-le dans ta tête, puis joue-le ou chante-le, avant de l\'entendre. Chaque jour dans ta séance.',
      'Où va la phrase ? Elle s\'arrête avant la fin : joue la note qui la termine.',
      'Repiquage du jour, sur de vraies mélodies (Au clair de la lune, Amazing Grace, When the Saints…), et une comptine à retrouver de tête.',
      'Chaque leçon commence par « À quoi ça sert » : la théorie reliée à ce que tu en fais en jouant.',
    ],
  },
  {
    version: '0.15.0', date: '2026-10-05', notes: [
      'Technique : les positions des gammes (pentatonique, majeure, blues), une par une, guidées puis de mémoire ; arpèges en position ; formes d\'accords (mi et la, triades et 7e).',
      'Vitesse : la position au métronome aux tempos clés (60 à 140), avec le sens des coups de médiator et les doigts affichés. Au piano : gammes et arpèges avec doigtés.',
      'Oreille et technique reliées : un degré joue, trouve-le dans la position. Carte « Positions et vitesse » dans Pratique.',
    ],
  },
  {
    version: '0.14.0', date: '2026-10-05', notes: [
      'Chaque séance te fait avancer dans plusieurs domaines à la fois (rythme, oreille, théorie, technique), le plus en retard d\'abord.',
      'Les points de leçon se valident quand tu réussis un exercice qui s\'y rattache. Le bilan de séance montre ce qui a avancé et les points validés ; Profil montre où tu en es dans chaque domaine.',
      'Nouveau : le palier 5 « Modes et emprunts » : les 6 modes à l\'oreille, les 12 couleurs, accords empruntés, l\'accord intrus, les modulations, mesures à 5 et 7 temps, fonctions modales, gammes dans toutes les tonalités, impro modale.',
    ],
  },
  {
    version: '0.13.0', date: '2026-10-05', notes: [
      'Nouvel onglet « Pratique » : entretiens tes compétences à la carte. Oreille (intervalles, triades, tétrades, gammes et modes, degrés), instrument façon Solo (retrouver la note sur 3 niveaux, intervalles, accords, gammes, chronométrés) et perroquet.',
      'Chaque jour, la séance contient des intervalles à l\'oreille, jusqu\'à ce que les 12 soient acquis en montant puis en descendant.',
      'Réglages : mode gaucher, accordage (drop D, DADGAD, open G…), notation des accords maj7 ou Δ7.',
    ],
  },
  {
    version: '0.12.0', date: '2026-10-05', notes: [
      'Le test de placement évalue maintenant chaque domaine séparément : rythme, oreille, théorie et lecture, technique. Ton niveau peut être très différent d\'un domaine à l\'autre.',
      'Chaque domaine progresse à son rythme : les bases là où tu débutes, des exercices au niveau le plus difficile là où tu es à l\'aise.',
    ],
  },
  {
    version: '0.11.1', date: '2026-10-05', notes: [
      'L\'appli s\'ouvre sur ta séance du jour, avec un grand bouton « Commencer la séance » tout en haut. L\'arbre reste dans le 2e onglet.',
    ],
  },
  {
    version: '0.11.0', date: '2026-10-05', notes: [
      'Nouveau : le palier 4 « Harmonie fonctionnelle », 6 notions et 16 exercices : accords de 7e (maj7, 7, m7, m7♭5), cadences, ii-V-I et notes-guides, lecture en clé de fa, swing et triolets, viser la tierce de chaque accord.',
      'Le test de placement va jusqu\'au palier 4.',
    ],
  },
  {
    version: '0.10.0', date: '2026-10-05', notes: [
      'Nouveau : le palier 3 « Mineur et couleurs », 7 notions et 22 exercices : gamme mineure, degrés ♭3 ♭6 ♭7, tous les intervalles (montants, descendants, ensemble, chantés), les quatre triades, les accords de la gamme, la dictée de grille, syncopes et doubles croches, le blues.',
      'Pour les musiciens confirmés : le test de placement va maintenant jusqu\'au palier 3.',
    ],
  },
  {
    version: '0.9.4', date: '2026-10-05', notes: [
      'Gamme, motifs et lecture : une seule portée montre les notes à jouer (en gris, avec leur nom ou leur degré) et tes notes viennent s\'écrire dessus, en vert ou en rouge.',
      'Les notes à jouer ne sont plus écrites deux fois (dans la phrase et en dessous).',
      'Perroquet rythmique et pulsation : un métronome aux premiers niveaux, retiré ensuite (réglable dans la fiche de l\'exercice).',
    ],
  },
  {
    version: '0.9.3', date: '2026-10-04', notes: [
      'Portée en direct : les notes que tu joues s\'écrivent en clé de sol (ou en tablature), au piano comme à la guitare. Désactivable dans Profil.',
      'Exercices avec décompte : le clavier, le manche et le pad ne bougent plus quand le décompte s\'efface.',
    ],
  },
  {
    version: '0.9.2', date: '2026-10-04', notes: [
      'La séance se fait en deux parties : d\'abord « partout, à l\'écran » (oreille, rythme, lecture, théorie, perroquet, casque conseillé), puis « à l\'instrument » (repérage, technique, chant, impro).',
      'Avant la 2e partie, l\'appli te demande si tu as ton instrument : sinon, tout se fait à l\'écran, ou tu peux t\'arrêter là.',
      'Plus de rythme, de perroquet, de lecture et d\'écriture dans chaque séance : le temps est réparti entre les domaines selon des proportions fixées.',
    ],
  },
  {
    version: '0.9.1', date: '2026-10-04', notes: [
      'Ta progression est sauvegardée, et un bouton « 💬 Donner un retour » est en haut de chaque exercice.',
      'Exercices au clic : le clavier ou le manche est jouable dès le décompte (4, 3, 2, 1).',
      'Palier 1 plus léger : 2 exercices par notion, les autres dans « pour aller plus loin ».',
      'Guitaristes : lecture en tablature au choix (Profil → Lecture à la guitare).',
      'Écrire sur la portée : une saisie par boutons est disponible sous la portée.',
    ],
  },
];

export const APP_VERSION = RELEASES[0].version;
export const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
export const VERSION_LABEL = `Melofy ${APP_VERSION} (build ${BUILD_ID})`;

/** Notes à montrer : les versions publiées depuis la dernière vue par cet utilisateur. */
export function unseenReleases(seen: string | undefined): Release[] {
  if (!seen) return RELEASES.slice(0, 1);
  const i = RELEASES.findIndex((r) => r.version === seen);
  return i === -1 ? RELEASES.slice(0, 1) : RELEASES.slice(0, i);
}
