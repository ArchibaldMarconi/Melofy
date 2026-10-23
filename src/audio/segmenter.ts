// Transforme un flux de trames (fréquence, volume, temps) en notes jouées et en attaques.
// TypeScript pur : testable sans téléphone.
import type { PlayedNote } from '../content/types';
import { freqToMidi } from '../engine/music';

export interface MicFrame { freq: number | null; rms: number; tMs: number }

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

export class NoteSegmenter {
  private cur: { start: number; midis: number[] } | null = null;
  private lastRms = 0;
  private lastOnset = -1e9;
  constructor(private o = { rmsOn: 0.02, rmsOff: 0.01, minDurMs: 70, jumpCents: 70, attackRatio: 2.2, minGapMs: 90 }) {}

  /** Retourne une note terminée, ou null. */
  push(f: MicFrame): PlayedNote | null {
    const voiced = f.freq !== null && f.rms >= this.o.rmsOn;
    let out: PlayedNote | null = null;
    if (!this.cur) {
      if (voiced) this.cur = { start: f.tMs, midis: [freqToMidi(f.freq!)] };
    } else if (!voiced && f.rms < this.o.rmsOff) {
      out = this.close(f.tMs);
    } else if (voiced) {
      const m = freqToMidi(f.freq!);
      const med = median(this.cur.midis);
      const reattack = f.rms > this.lastRms * this.o.attackRatio && f.tMs - this.cur.start > this.o.minGapMs;
      if ((Math.abs(m - med) * 100 > this.o.jumpCents && this.cur.midis.length >= 2) || reattack) {
        out = this.close(f.tMs);
        this.cur = { start: f.tMs, midis: [m] };
      } else this.cur.midis.push(m);
    }
    this.lastRms = f.rms;
    return out;
  }

  flush(tMs: number): PlayedNote | null {
    return this.close(tMs);
  }

  private close(t: number): PlayedNote | null {
    if (!this.cur) return null;
    const dur = t - this.cur.start;
    const n = dur >= this.o.minDurMs ? { midi: median(this.cur.midis), tMs: this.cur.start, durMs: dur } : null;
    this.cur = null;
    return n;
  }
}

/** Attaques (rythme au micro) : montée brusque du volume. */
export class OnsetDetector {
  private prev = 0;
  private last = -1e9;
  constructor(private o = { threshold: 0.03, ratio: 2.5, minGapMs: 90 }) {}
  push(f: MicFrame): number | null {
    const hit = f.rms > this.o.threshold && f.rms > this.prev * this.o.ratio && f.tMs - this.last > this.o.minGapMs;
    this.prev = f.rms;
    if (hit) { this.last = f.tMs; return f.tMs; }
    return null;
  }
}
