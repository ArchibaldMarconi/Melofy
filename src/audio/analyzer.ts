// Découpe le son du micro en trames d'analyse (hauteur, niveau, instant) : la même chaîne pour le téléphone, le
// navigateur et les tests. TypeScript pur.
import type { MicFrame } from './segmenter';
import { detectPitch, rms } from './yin';

export class FrameAnalyzer {
  /** taille d'une trame (échantillons) : même durée qu'à 44,1 kHz (2048 → ~46 ms), quelle que soit la fréquence réelle */
  readonly frame: number;
  private pending = new Float32Array(0);
  private consumed = 0;

  /** frame : taille d'analyse rapportée à 44,1 kHz ; minHz : note la plus grave cherchée ; gain : appliqué au niveau mesuré */
  constructor(private sr: number, private o: { frame?: number; minHz?: number; gain?: number } = {}) {
    this.frame = 2 * Math.round((((o.frame ?? 2048) / 44100) * sr) / 2);
  }

  /** nouveaux échantillons → trames, une toutes les demi-trames (~23 ms) ; `originMs` : instant du premier échantillon */
  push(mono: Float32Array, originMs: number, onFrame: (f: MicFrame) => void) {
    const F = this.frame;
    const merged = new Float32Array(this.pending.length + mono.length);
    merged.set(this.pending);
    merged.set(mono, this.pending.length);
    let off = 0;
    while (merged.length - off >= F) {
      const frame = merged.subarray(off, off + F);
      const level = rms(frame) * (this.o.gain ?? 1);
      const freq = level > 0.008 ? detectPitch(frame, this.sr, { minHz: this.o.minHz ?? 60 }) : null;
      onFrame({ freq, rms: level, tMs: originMs + ((this.consumed + F) / this.sr) * 1000 });
      off += F / 2;
      this.consumed += F / 2;
    }
    this.pending = merged.slice(off);
  }

  /** échantillons laissés de côté (retard) : l'horloge avance sans analyse */
  skip(n: number) {
    this.consumed += this.pending.length + n;
    this.pending = new Float32Array(0);
  }
}
