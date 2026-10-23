// « Comment répondre » et « C'est réussi si », déduits du type de réponse :
// des mots concrets (« 7 frappes sur 8 ») plutôt qu'un pourcentage.
import type { ExerciseTemplate, InputMode, Instrument, Variant } from '../content/types';

const atLeast = (min: number, n: number) => Math.min(n, Math.ceil(min * n - 1e-9));

export function howToAnswer(t: ExerciseTemplate, v: Variant, input: InputMode, instrument: Instrument, labels: 'degres' | 'notes' | 'aucun' = 'degres'): string {
  const repere = v.audiate ? ' (seule la tonique est marquée : trouve le reste avec ton oreille)' : labels === 'degres' ? ' (les chiffres sont les degrés)' : labels === 'notes' ? ' (les noms sont écrits sur les touches)' : ' (sans repère : c\'est à toi de trouver)';
  const ecran = instrument === 'guitare' && input === 'manche'
    ? `Touche les cases du manche à l'écran${repere}`
    : `Touche les notes du clavier à l'écran${repere}`;
  switch (v.answerUI) {
    case 'quiz': return 'Touche la bonne réponse. Si tu te trompes, la bonne réponse s\'affiche et tu peux réécouter avant de continuer.';
    case 'tap': return input === 'micro'
      ? 'Frappe dans tes mains (ou sur ton instrument) près du téléphone.'
      : `Touche le grand rond à chaque coup.${v.simultaneous ? ' L\'exercice s\'arrête tout seul à la fin.' : ' Puis Valider.'}`;
    case 'sing': return v.expected.kind === 'sequence' && v.expected.notes.length === 1
      ? 'Chante dans le micro et tiens la note environ une seconde : l\'appli valide toute seule.'
      : 'Chante les notes dans le micro, l\'une après l\'autre, puis touche Valider.';
    case 'staff': return 'Touche la portée à la hauteur voulue pour poser une note (▲ ▼ ajustent la dernière, ⌫ l\'efface), puis Valider.';
    case 'figures': return 'Touche les figures dans l\'ordre pour écrire le rythme (⌫ efface la dernière), puis Valider. Le compteur vérifie le nombre de temps.';
    case 'select': return 'Touche les notes pour les choisir (touche à nouveau pour enlever), puis Valider.';
    case 'degrees': return v.padNames?.[0] === 'I'
      ? 'Touche les accords dans l\'ordre, en chiffres romains (⌫ efface le dernier), puis Valider.'
      : v.padNames
      ? 'Touche les noms des notes dans l\'ordre (⌫ efface la dernière), puis Valider.'
      : 'Touche les degrés dans l\'ordre sur le pavé de chiffres (⌫ efface la dernière note), puis Valider.';
    case 'free': return input === 'micro' ? 'Joue sur ton instrument près du téléphone jusqu\'à la fin du compte à rebours.' : `${ecran}, jusqu'à la fin du compte à rebours.`;
    default:
      if (input === 'micro') return `Joue sur ton vrai instrument près du téléphone${v.simultaneous ? ', en même temps que le clic.' : ', puis Valider.'}`;
      return `${ecran}${v.simultaneous ? ', en même temps que le clic. L\'exercice s\'arrête tout seul.' : ', puis Valider.'}`;
  }
}

export function successText(t: ExerciseTemplate, v: Variant): string {
  const min = t.reussite.precisionMin;
  const e = v.expected;
  const twoSteps = !!v.transcription && t.etapes?.includes('transcrire_degres');
  let s: string;
  switch (e.kind) {
    case 'quiz': {
      const n = e.items.length;
      const k = atLeast(min, n);
      s = k === n ? `toutes les réponses justes (${n} sur ${n})` : `au moins ${k} bonnes réponses sur ${n}`;
      break;
    }
    case 'rhythm': {
      const n = e.onsetsBeats.length;
      s = `au moins ${atLeast(min, n)} frappes sur ${n} au bon moment (à ${t.tolerances.ms <= 80 ? 'moins d\'un dixième' : 'un dixième'} de seconde près), sans coup en trop`;
      break;
    }
    case 'sequence': {
      const n = e.notes.length;
      if (v.answerUI === 'sing' && n === 1) s = 'la note juste, à moins d\'un quart de ton près';
      else {
        const k = atLeast(min, n);
        const notes = k === n ? `les ${n} notes justes` : `au moins ${k} notes justes sur ${n}`;
        s = e.checkRhythm ? `${notes}, chacune sur son clic` : `${notes}, dans le bon ordre`;
      }
      break;
    }
    case 'figures': s = 'toutes les figures justes, dans l\'ordre'; break;
    case 'set': s = min >= 1 ? 'toutes les notes demandées, sans note en trop' : 'presque toutes les notes demandées'; break;
    case 'constraints': s = `jouer au moins ${e.minNotes} notes, seulement parmi les notes en couleur${e.endDegree ? `, et finir sur ${e.endDegree}` : ''}`; break;
    case 'transcribe': s = min >= 1 ? 'toutes les notes justes, dans le bon ordre' : `au moins ${atLeast(min, e.items.length)} notes justes sur ${e.items.length}`; break;
    default: s = 'jouer jusqu\'au bout : ici, tout est réussi';
  }
  return twoSteps ? `étape 1 : ${s} ; étape 2 : la phrase écrite avec les bons degrés et les bonnes durées` : s;
}
