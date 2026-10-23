// Accordages de guitare (réglage « Accordage » dans Profil). Corde 0 = la plus grave.
import { useUserStore } from './store/useUserStore';

export const TUNINGS: Record<string, { label: string; strings: number[] }> = {
  standard: { label: 'Standard (mi la ré sol si mi)', strings: [40, 45, 50, 55, 59, 64] },
  drop_d: { label: 'Drop D (ré la ré sol si mi)', strings: [38, 45, 50, 55, 59, 64] },
  demi_ton: { label: 'Un demi-ton plus bas', strings: [39, 44, 49, 54, 58, 63] },
  dadgad: { label: 'DADGAD', strings: [38, 45, 50, 55, 57, 62] },
  open_g: { label: 'Open G (ré sol ré sol si ré)', strings: [38, 43, 50, 55, 59, 62] },
};
export const getTuning = (): number[] => TUNINGS[useUserStore.getState().settings.tuning ?? 'standard']?.strings ?? TUNINGS.standard.strings;
export const useTuning = (): number[] => {
  const t = useUserStore((s) => s.settings.tuning);
  return TUNINGS[t ?? 'standard']?.strings ?? TUNINGS.standard.strings;
};
