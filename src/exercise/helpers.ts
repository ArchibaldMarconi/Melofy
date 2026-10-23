// Utilitaires du lecteur d'exercice : modes de saisie proposés, libellé de la bonne réponse.
import type { ExerciseTemplate, InputMode, Instrument, Variant } from '../content/types';
import { degreeLabel, midiDegreeLabel, noteName } from '../engine/music';

export const INPUT_LABEL: Record<InputMode, string> = { tap: 'Écran', micro: 'Micro', clavier: 'Clavier', manche: 'Manche' };

export function availableInputs(t: ExerciseTemplate, v: Variant, instrument: Instrument): InputMode[] {
  if (v.answerUI === 'sing') return ['micro'];
  if (v.answerUI === 'quiz' || v.answerUI === 'degrees') return ['tap'];
  let ins = t.inputs.filter((m) => !(instrument === 'piano' && m === 'manche') && !(instrument === 'guitare' && m === 'clavier' && t.inputs.includes('manche')));
  if (v.answerUI === 'select') ins = ins.filter((m) => m !== 'micro');
  return ins.length ? ins : t.inputs;
}

export function labelsOfExpected(v: Variant): string | null {
  const e = v.expected;
  if (e.kind === 'figures') return e.items.map((f) => ({ croches: '2 croches', doubles: '4 doubles croches' } as Record<string, string>)[f] ?? f).join(' · ');
  // sur la portée, la correction se lit en noms de notes
  if (e.kind === 'sequence' && v.answerUI === 'staff') return e.notes.map((n) => noteName(n.midi).replace(/\d/, '')).join(' · ');
  if (e.kind === 'sequence') return e.notes.map((n) => midiDegreeLabel(v.tonic, n.midi)).join(' · ');
  if (e.kind === 'transcribe') return e.items.map((d) => (v.padNames ? v.padNames[((d.degree - 1) % 7 + 7) % 7] : degreeLabel(d))).join(' · ');
  if (v.transcription) return v.transcription.map((d) => `${degreeLabel(d)} (${d.dur === 2 ? 'blanche' : d.dur === 0.5 ? 'croche' : 'noire'})`).join(' · ');
  if (e.kind === 'set') return e.midis.map((m) => midiDegreeLabel(v.tonic, m)).join(' + ');
  if (e.kind === 'constraints') return `notes ${e.allowedDegrees.join(', ')}, fin sur ${e.endDegree}`;
  if (e.kind === 'rhythm') return `${e.onsetsBeats.length} coups, aux temps ${e.onsetsBeats.map((b) => b + 1).join(', ')}`;
  if (e.kind === 'quiz') return e.items.map((q, i) => `${i + 1}. ${q.choices.find((c) => c.id === q.answerId)?.label}`).join('  ');
  return null;
}

