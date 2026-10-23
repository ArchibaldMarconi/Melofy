// Calibrage : médiane des écarts entre les frappes et les clics, frappes d'échauffement ignorées.
export function computeLatency(tapsMs: number[], tempo = 90, beats = 12, warmup = 3): number | null {
  const beat = 60000 / tempo;
  const offsets = tapsMs
    .map((t) => { const k = Math.round(t / beat); return { k, d: t - k * beat }; })
    .filter((o) => o.k >= warmup && o.k < beats && Math.abs(o.d) < beat * 0.4)
    .map((o) => o.d)
    .sort((a, b) => a - b);
  if (offsets.length < 5) return null;
  return Math.round(Math.max(0, Math.min(300, offsets[Math.floor(offsets.length / 2)])));
}
