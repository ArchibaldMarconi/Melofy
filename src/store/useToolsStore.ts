// Réglages des outils (métronome, accordeur), sauvegardés à part de la progression de l'élève.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Automation } from '../engine/metronome';

export interface MetronomePreset { id: string; title: string; tempo: number; signature: string; swing: number; automation?: Automation }

interface ToolsState {
  tempo: number;
  signature: string;
  swing: number;
  silentBars: 0 | 1 | 2 | 3;
  presets: MetronomePreset[];
  /** dernier accordage utilisé, resélectionné à l'ouverture */
  tuning: string;
  set: (p: Partial<Omit<ToolsState, 'set' | 'savePreset' | 'deletePreset'>>) => void;
  savePreset: (p: Omit<MetronomePreset, 'id'>) => void;
  deletePreset: (id: string) => void;
}

export const useToolsStore = create<ToolsState>()(persist((set) => ({
  tempo: 90, signature: '4/4', swing: 50, silentBars: 0, presets: [], tuning: 'guitare',
  set: (p) => set(p),
  savePreset: (p) => set((s) => ({ presets: [{ ...p, id: `${Date.now()}` }, ...s.presets] })),
  deletePreset: (id) => set((s) => ({ presets: s.presets.filter((x) => x.id !== id) })),
}), { name: 'melofy-tools', storage: createJSONStorage(() => AsyncStorage) }));
