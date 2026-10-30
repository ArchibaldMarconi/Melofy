// Synthèse des sons, en TypeScript pur, partagée par le moteur web et le moteur natif.
// Aucun fichier audio : pas de poids, pas de licence. Les buffers sont rendus une fois puis mis en cache.
//  - guitare : corde pincée Karplus-Strong avec retard fractionnaire (passe-tout) pour une justesse exacte
//  - piano   : partiels inharmoniques (corde raide), deux cordes légèrement désaccordées, attaque de marteau
//  - clic / bloc : percussions courtes pour le métronome et les rythmes
// Tout est en tempérament égal (la = 440 Hz) : la fondamentale de chaque note, et les hauteurs des percussions.
import { midiToFreq } from '../engine/music';

export type SynthVoice = 'piano' | 'guitare' | 'clic' | 'clic_fort' | 'bloc';

/** générateur de bruit déterministe (même son à chaque rendu) */
function noise(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; };
}

function normalize(buf: Float32Array, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i]));
  if (m > 0) for (let i = 0; i < buf.length; i++) buf[i] *= peak / m;
  return buf;
}

export function renderGuitar(midi: number, sr: number, durS = 2.6): Float32Array {
  const f0 = midiToFreq(midi);
  const out = new Float32Array(Math.floor(sr * durS));
  // période = N − 0,5 (moyenne de deux échantillons voisins de la ligne) + retard du passe-tout
  const period = sr / f0;
  const N = Math.floor(period + 0.5);
  const frac = period + 0.5 - N;
  const C = (1 - frac) / (1 + frac);
  const line = new Float32Array(N);
  const rnd = noise(midi * 7919);
  // excitation : bruit filtré (attaque plus douce qu'un bruit blanc, comme un doigt)
  let lp = 0;
  for (let i = 0; i < line.length; i++) { lp = 0.55 * lp + 0.45 * rnd(); line[i] = lp; }
  // durée de résonance (−60 dB) : ~4,5 s en grave, ~1,8 s en aigu ; convertie en perte par passage
  const t60 = Math.max(1.8, 4.5 - (midi - 40) * 0.075);
  const loss = Math.min(0.99995, Math.pow(10, -3 / (t60 * f0)) / Math.cos(Math.PI * f0 / sr));
  let idx = 0;
  let prev = 0;
  let apX = 0;
  let apY = 0;
  for (let n = 0; n < out.length; n++) {
    const cur = line[idx];
    const nxt = line[(idx + 1) % line.length];
    const avg = loss * 0.5 * (cur + nxt);
    // passe-tout : retard fractionnaire
    const y = C * avg + apX - C * apY;
    apX = avg; apY = y;
    line[idx] = y;
    out[n] = cur;
    idx = (idx + 1) % line.length;
    prev = cur;
  }
  void prev;
  // légère caisse : passe-bas doux
  let b = 0;
  for (let i = 0; i < out.length; i++) { b += 0.35 * (out[i] - b); out[i] = b; }
  return normalize(out, 0.8);
}

export function renderPiano(midi: number, sr: number, durS = 2.5): Float32Array {
  const f0 = midiToFreq(midi);
  const out = new Float32Array(Math.floor(sr * durS));
  const B = 0.00025 + Math.max(0, midi - 60) * 0.00002; // raideur de corde
  const baseDecay = 0.9 + Math.max(0, midi - 48) * 0.05; // aigus plus brefs
  // 10 partiels suffisent à l'oreille ; le désaccord des deux cordes ne s'entend que sur les 4 premiers
  const partials = Math.min(10, Math.floor((sr / 2.2) / f0));
  // deux cordes à ±0,3 cent : le battement reste, la hauteur moyenne est juste
  const detune = [Math.pow(2, -0.3 / 1200), Math.pow(2, 0.3 / 1200)];
  for (let k = 1; k <= partials; k++) {
    // raideur : les partiels s'étirent vers l'aigu, la fondamentale reste sur la note (comme un piano accordé)
    const fk = k * f0 * Math.sqrt((1 + B * k * k) / (1 + B));
    const amp = Math.pow(k, -1.25) * (k === 1 ? 1 : 0.8) * (1 - 0.35 * Math.sin((Math.PI * k) / 7) ** 2);
    const decay = baseDecay * (1 + 0.45 * (k - 1));
    for (const d of k <= 4 ? detune : [1]) {
      // oscillateur amorti par rotation complexe : pas de sin/exp par échantillon
      const w = (2 * Math.PI * fk * d) / sr;
      const r = Math.exp(-decay / sr);
      const cr = r * Math.cos(w);
      const ci = r * Math.sin(w);
      let re = amp * Math.cos(k * 0.7);
      let im = amp * Math.sin(k * 0.7);
      for (let n = 0; n < out.length; n++) {
        out[n] += im;
        const nr = re * cr - im * ci;
        im = re * ci + im * cr;
        re = nr;
      }
    }
  }
  // attaque : enveloppe rapide + petit bruit de marteau
  const rnd = noise(midi * 104729);
  const atk = Math.floor(sr * 0.004);
  let lp = 0;
  for (let n = 0; n < Math.min(out.length, sr * 0.03); n++) {
    lp += 0.2 * (rnd() - lp);
    out[n] += lp * 0.15 * Math.exp(-n / (sr * 0.006));
  }
  for (let n = 0; n < atk; n++) out[n] *= n / atk;
  return normalize(out, 0.85);
}

export function renderPerc(kind: 'clic' | 'clic_fort' | 'bloc', sr: number): Float32Array {
  const durS = kind === 'bloc' ? 0.12 : 0.05;
  const out = new Float32Array(Math.floor(sr * durS));
  // hauteurs du tempérament égal : clic la6, clic fort mi7, bloc la5 avec un partiel à mi7
  const f = midiToFreq(kind === 'clic_fort' ? 100 : kind === 'clic' ? 93 : 81);
  const f2 = midiToFreq(100);
  const rnd = noise(kind === 'clic_fort' ? 2400 : kind === 'clic' ? 1700 : 820);
  for (let n = 0; n < out.length; n++) {
    const t = n / sr;
    const env = Math.exp(-t * (kind === 'bloc' ? 45 : 110));
    out[n] = env * (Math.sin(2 * Math.PI * f * t) + (kind === 'bloc' ? 0.6 * Math.sin(2 * Math.PI * f2 * t) : 0) + 0.15 * rnd() * Math.exp(-t * 400));
  }
  return normalize(out, kind === 'clic' ? 0.6 : 0.85);
}

/**
 * Bourdon : son tenu de type orgue doux, riche en harmoniques pour rester audible sur un haut-parleur
 * de téléphone (qui ne restitue presque rien sous 150 Hz). Chaque partiel est ajusté pour faire un nombre
 * entier de cycles dans la boucle (écart < 0,3 cent) : la boucle ne craque pas.
 */
export function renderDrone(midis: number[], sr: number, loopS = 3): Float32Array {
  const n = Math.floor(sr * loopS);
  const out = new Float32Array(n);
  const L = n / sr;
  for (const m of midis) {
    const f0 = midiToFreq(m);
    for (let k = 1; k <= 6; k++) {
      const amp = (k === 1 ? 1 : k === 2 ? 0.7 : k === 3 ? 0.45 : k === 4 ? 0.35 : 0.5 / k) / midis.length;
      // deux voix à ±4 cents (léger battement vivant) sur les 2 premiers harmoniques seulement : coût divisé par deux
      for (const det of k <= 2 ? [-4, 4] : [0]) {
        const f = k * f0 * Math.pow(2, det / 1200);
        if (f > sr / 2.2) continue;
        const cycles = Math.max(1, Math.round(f * L));
        const w = (2 * Math.PI * cycles) / n;
        const ph = (k * 1.7 + m) % (2 * Math.PI);
        let re = Math.cos(ph) * amp;
        let im = Math.sin(ph) * amp;
        const c = Math.cos(w);
        const sn = Math.sin(w);
        for (let i = 0; i < n; i++) {
          out[i] += im;
          const nr = re * c - im * sn;
          im = re * sn + im * c;
          re = nr;
        }
      }
    }
  }
  return normalize(out, 0.8);
}

/** Cache de rendus : un buffer par voix et par note, calculé au premier usage. */
export class SynthCache {
  private cache = new Map<string, Float32Array>();
  constructor(private sr: number) {}
  get(voice: SynthVoice, midi = 60): Float32Array {
    const key = `${voice}:${voice === 'piano' || voice === 'guitare' ? midi : ''}`;
    let b = this.cache.get(key);
    if (!b) {
      b = voice === 'piano' ? renderPiano(midi, this.sr) : voice === 'guitare' ? renderGuitar(midi, this.sr) : renderPerc(voice, this.sr);
      this.cache.set(key, b);
    }
    return b;
  }
}
