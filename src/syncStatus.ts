// État de la sauvegarde en ligne, affiché dans Profil. Plateforme neutre :
// la version web de test le renseigne (web/cloudSync.ts) ; l'app native n'a pas encore de sauvegarde en ligne.
import { useEffect, useState } from 'react';

export type SyncState =
  | { kind: 'local' } // pas de sauvegarde en ligne ici : tout reste sur l'appareil
  | { kind: 'connecting' }
  | { kind: 'saved'; at: number }
  | { kind: 'saving' }
  | { kind: 'restored'; at: number } // une copie plus récente a été récupérée en ligne
  | { kind: 'error'; message: string };

let state: SyncState = { kind: 'local' };
const listeners = new Set<(s: SyncState) => void>();

export function setSyncState(s: SyncState) { state = s; listeners.forEach((l) => l(s)); }
export function useSyncState(): SyncState {
  const [s, setS] = useState(state);
  useEffect(() => { listeners.add(setS); return () => { listeners.delete(setS); }; }, []);
  return s;
}
