// Seuil de bruit du micro : 3 × le bruit ambiant (90e centile), borné.
export function gateFromNoise(levels: number[]): number {
  if (!levels.length) return 0.02;
  const s = [...levels].sort((a, b) => a - b);
  const p90 = s[Math.min(s.length - 1, Math.floor(s.length * 0.9))];
  return Math.round(Math.min(0.08, Math.max(0.008, p90 * 3)) * 10000) / 10000;
}
