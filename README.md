# Melofy — version Expo (iOS, Expo Go)

Le compagnon du musicien : Séance, Leçons, Jouer (métronome, accordeur, jam, entraînement ciblé) et Moi.
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

## Les 4 destinations

1. **Séance** : un bouton. La séance du jour se compose seule à partir des leçons vues : échauffement (option), révision (une carte de révision par compétence), entendre, trouver, rejouer, créer, dans la tonalité du jour dès que les armures sont connues. Durée, module technique, instrument et voix se règlent dans Moi.
2. **Leçons** : 27 leçons en 6 chapitres. Chaque leçon : écouter d'abord, « À toi d'essayer » (trouver avec les mains avant le nom), comprendre (illustrations jouables), pratiquer, valider. « Je connais déjà » passe directement à la validation.
3. **Jouer** : métronome (visage simple, réglages avancés sur demande), accordeur (suit l'instrument et l'accordage), jam (accompagnement en boucle sur six grilles et six styles), entraînement ciblé en un toucher par domaine, et le catalogue réglable sous « Personnaliser ».
4. **Moi** : la progression par compétence (oreille, instrument, lecture et théorie, rythme), les badges, et les réglages rangés par groupes.

La difficulté de chaque exercice suit un escalier (plus dur après 3 réussites nettes, plus facile après un échec) et continue au-delà des niveaux écrits (tempo, longueur, toutes les tonalités, moins d'aide).

## Différences avec la version web de test

- **Son** : Expo Go n'a pas de Web Audio. Chaque son est synthétisé en JS, écrit en WAV dans le cache et joué par `expo-audio`. Le démarrage d'un son prend quelques dizaines de millisecondes : règle la latence dans Profil pour les exercices de rythme au micro.
- **Micro** : `AudioStream` d'expo-audio (PCM en temps réel) + détection de hauteur YIN en JS, comme sur le web.
- **Sauvegarde** : AsyncStorage (sur le téléphone uniquement).
- **Thème** : le choix clair / sombre de Profil s'applique au prochain lancement.

## Vérifications

```bash
npx tsc --noEmit   # types
npx jest           # 236 tests (contenu, moteur, compétences, pédagogie, jam, métronome, accordeur)
```
