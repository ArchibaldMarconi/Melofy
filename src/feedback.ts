// Retours des testeurs : un bouton « Donner un retour » joint automatiquement le contexte
// (exercice, essai, instrument, avancement). Plateforme neutre : la version web publiée branche
// un gestionnaire qui ouvre le commentaire de claude.ai (web/feedbackWeb.ts) ; sinon le bouton est masqué.
import { useEffect, useState } from 'react';

type Handler = (contextElementId: string) => Promise<boolean>;
let handler: Handler | null = null;
const listeners = new Set<(on: boolean) => void>();

export function setFeedbackHandler(h: Handler | null) { handler = h; listeners.forEach((l) => l(!!h)); }
export const sendFeedback = (contextElementId: string) => (handler ? handler(contextElementId) : Promise.resolve(false));
export function useFeedbackAvailable(): boolean {
  const [on, setOn] = useState(!!handler);
  useEffect(() => { listeners.add(setOn); return () => { listeners.delete(setOn); }; }, []);
  return on;
}

/** exercice en cours, pour le contexte joint au retour */
let current: { id: string; title: string; attempt: number; phase: string } | null = null;
export function setCurrentExercise(e: typeof current) { current = e; }
export const currentExercise = () => current;
