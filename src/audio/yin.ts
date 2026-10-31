// Détection de hauteur YIN (de Cheveigné & Kawahara, 2002), TypeScript pur.
// À remplacer par l'implémentation native C++ (JSI) prévue dans la stack ; même signature.

export function yin(buf: Float32Array, sampleRate: number, threshold = 0.15, minHz = 60, maxHz = 1200): number | null {
  const tau = yinPeriod(buf, sampleRate, threshold, minHz, maxHz, 0);
  return tau === null ? null : sampleRate / tau;
}

/**
 * Période (en échantillons, interpolée) par YIN. `fallback` > 0 : si aucun creux ne passe sous le seuil, le creux le
 * plus profond est accepté s'il reste sous `fallback` (utile sur un signal décimé, où les creux sont moins nets).
 */
function yinPeriod(buf: Float32Array, sampleRate: number, threshold: number, minHz: number, maxHz: number, fallback: number): number | null {
  const maxTau = Math.min(Math.floor(sampleRate / minHz), Math.floor(buf.length / 2));
  const minTau = Math.max(2, Math.floor(sampleRate / maxHz));
  if (maxTau <= minTau) return null;
  const d = new Float32Array(maxTau + 1);
  const W = buf.length - maxTau;
  for (let tau = 1; tau <= maxTau; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    d[tau] = s;
  }
  // différence moyenne cumulée normalisée
  const cmnd = new Float32Array(maxTau + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    cmnd[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
  }
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= maxTau && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0 && fallback > 0) {
    let best = -1;
    for (let t = minTau; t <= maxTau; t++) if (best < 0 || cmnd[t] < cmnd[best]) best = t;
    if (best >= 0 && cmnd[best] < fallback) tau = best;
  }
  if (tau < 0) return null;
  // interpolation parabolique
  const x0 = tau > 1 ? cmnd[tau - 1] : cmnd[tau];
  const x2 = tau + 1 <= maxTau ? cmnd[tau + 1] : cmnd[tau];
  const denom = 2 * (2 * cmnd[tau] - x2 - x0);
  return denom !== 0 ? tau + (x2 - x0) / denom : tau;
}

/**
 * Hauteur d'une trame de micro, assez légère pour le temps réel sur téléphone (sous Hermes, le JS n'a pas de JIT :
 * YIN à pleine résolution coûtait des millions d'opérations par trame et l'analyse prenait des secondes de retard).
 * 1. YIN sur le signal lissé puis décimé (≈ 4,8 kHz, assez pour des fondamentales jusqu'à `maxHz`) : il choisit la
 *    période sans erreur d'octave, pour environ cent fois moins de calcul ;
 * 2. affinage à pleine résolution : la fonction de différence n'est calculée qu'autour de cette période, puis
 *    interpolée. La justesse reste celle d'un accordeur (au cent près).
 */
export function detectPitch(buf: Float32Array, sampleRate: number, o: { minHz?: number; maxHz?: number; threshold?: number } = {}): number | null {
  const minHz = o.minHz ?? 60;
  const maxHz = o.maxHz ?? 1200;
  const threshold = o.threshold ?? 0.15;
  // facteur de décimation : la fréquence d'analyse garde au moins 4 fois la note la plus aiguë cherchée
  const D = Math.max(1, Math.floor(sampleRate / (4 * maxHz)));
  if (D === 1) return yin(buf, sampleRate, threshold, minHz, maxHz);
  const coarse = yinPeriod(decimate(buf, D), sampleRate / D, threshold, minHz, maxHz, 0.3);
  if (coarse === null) return null;

  // affinage à pleine résolution, sur une fenêtre bornée
  const W = Math.min(1024, buf.length - Math.ceil(sampleRate / minHz) - 2);
  if (W < 64) return sampleRate / (coarse * D);
  let energy = 0;
  for (let i = 0; i < W; i++) energy += buf[i] * buf[i];
  /** différence normalisée : ~0 pour un décalage d'une période, ~1 pour un décalage quelconque */
  const diff = (tau: number) => {
    let s = 0;
    let e = energy;
    for (let i = 0; i < W; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
      e += buf[i + tau] * buf[i + tau];
    }
    return s / (e || 1);
  };
  /** creux de la différence autour de `T` (± r échantillons), interpolé ; null s'il touche le bord de la fenêtre */
  const refine = (T: number, r: number): { tau: number; v: number } | null => {
    const lo = Math.max(2, Math.floor(T - r));
    const hi = Math.min(Math.ceil(T + r), buf.length - W - 1);
    if (hi - lo < 2) return null;
    const ds: number[] = [];
    let best = lo;
    for (let tau = lo; tau <= hi; tau++) {
      ds.push(diff(tau));
      if (ds[ds.length - 1] < ds[best - lo]) best = tau;
    }
    if (best === lo || best === hi) return null;
    const a = ds[best - 1 - lo];
    const v = ds[best - lo];
    const c = ds[best + 1 - lo];
    const denom = a - 2 * v + c;
    return { tau: denom > 0 ? best + (a - c) / (2 * denom) : best, v };
  };
  let found = refine(coarse * D, D + 1);
  if (!found) return sampleRate / (coarse * D);
  // contrôle d'octave : sur le signal décimé, une note aiguë se lit parfois une octave trop bas (période double).
  // Si la moitié (ou le tiers) de la période se répète presque aussi bien, c'est elle la vraie période.
  for (let pass = 0; pass < 2; pass++) {
    let better: { tau: number; v: number } | null = null;
    for (const k of [2, 3]) {
      const P = found.tau / k;
      if (sampleRate / P > maxHz * 1.06) continue;
      const cand = refine(P, 2);
      if (cand && cand.v < 0.2 && cand.v < found.v + 0.1) { better = cand; break; }
    }
    if (!better) break;
    found = better;
  }
  return sampleRate / found.tau;
}

/** lissage triangulaire (deux moyennes glissantes de D échantillons) puis un échantillon sur D */
function decimate(buf: Float32Array, D: number): Float32Array {
  const n = Math.floor((buf.length - 2 * D) / D);
  const out = new Float32Array(Math.max(0, n));
  // moyennes glissantes successives, calculées par sommes cumulées
  const box = (x: Float32Array) => {
    const y = new Float32Array(x.length - D + 1);
    let s = 0;
    for (let i = 0; i < D; i++) s += x[i];
    y[0] = s / D;
    for (let i = D; i < x.length; i++) { s += x[i] - x[i - D]; y[i - D + 1] = s / D; }
    return y;
  };
  const smooth = box(box(buf));
  for (let k = 0; k < out.length; k++) out[k] = smooth[k * D];
  return out;
}

export function rms(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / Math.max(1, buf.length));
}
