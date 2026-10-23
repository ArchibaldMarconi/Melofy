# Melofy — version Expo (iOS, Expo Go)

Le compagnon du musicien : Workout quotidien, Leçons, Pratique, Métronome, Accordeur et Profil.
Projet Expo SDK 58 (React Native 0.88), compatible **Expo Go** : aucun module natif hors d'Expo Go.

## Lancer sur ton iPhone

Prérequis : Node.js 20 ou plus sur ton ordinateur, l'appli **Expo Go** sur l'iPhone, les deux sur le même Wi-Fi.

```bash
cd melofy-expo
npm install
npx expo start
```

Scanne le QR code avec l'appareil photo de l'iPhone : Melofy s'ouvre dans Expo Go.
Si ton réseau bloque la connexion directe (Wi-Fi d'entreprise, partage de connexion…) : `npx expo start --tunnel`.

Au premier exercice au micro ou dans l'accordeur, iOS demande l'accès au micro pour Expo Go : accepte.
Le son passe par le haut-parleur même en mode silencieux.

## Les 6 pages (plan de l'appli)

1. **Workout** : bouton principal, durée de 10 à 30 min, 4 parties (révision SRS, ear training, mapping, perroquet) + module technique en option ; bouton distinct pour la leçon suivante ou en cours.
2. **Leçons** : vue réduite sur la leçon en cours et les suivantes, « Afficher plus / moins » avant (historique validé) et après (programme à venir).
3. **Pratique** : catalogue des exercices standards réglables (ear training, rythme, mapping, technique, improvisation).
4. **Métronome** : tempo au clavier (20–300), signatures simples et composées, roue (tap tempo au centre, glisser haut/bas), automate (+N BPM toutes les X mesures, plafond facultatif), presets avec flèche d'accelerando, swing 50–75 %, mesures muettes pour le sens du rythme.
5. **Accordeur** : jauge −50/+50 cents, mode chromatique, mode guidé avec sphères (verrouillage, passage auto à la corde suivante, note cible jouée au toucher), préréglages guitare, basse, violon, open et drop tunings, dernier accordage retenu.
6. **Profil** : réglages et progression.

## Différences avec la version web de test

- **Son** : Expo Go n'a pas de Web Audio. Chaque son est synthétisé en JS, écrit en WAV dans le cache et joué par `expo-audio`. Le démarrage d'un son prend quelques dizaines de millisecondes : règle la latence dans Profil pour les exercices de rythme au micro.
- **Micro** : `AudioStream` d'expo-audio (PCM en temps réel) + détection de hauteur YIN en JS, comme sur le web.
- **Sauvegarde** : AsyncStorage (sur le téléphone uniquement).
- **Thème** : le choix clair / sombre de Profil s'applique au prochain lancement.

## Vérifications

```bash
npx tsc --noEmit   # types
npx jest           # 229 tests (contenu, moteur, métronome, accordeur)
```
