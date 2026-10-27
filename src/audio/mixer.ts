// Mixage commun aux deux moteurs audio (téléphone et navigateur) : chaque son est synthétisé en JS (synth.ts),
// placé dans un tampon à 22 050 Hz avec la même enveloppe partout. Seule la façon de jouer le tampon diffère.
import type { Instrument, NoteEvent } from '../content/types';
import { beatsToMs } from '../engine/music';
import type { PlayOptions } from './AudioEngine';
import { SynthCache, type SynthVoice } from './synth';

export const SR = 22050;
const PEAK: Record<SynthVoice, number> = { piano: 0.55, guitare: 0.6, clic: 0.5, clic_fort: 0.6, bloc: 0.6 };

export class Mixer {
  private synth = new SynthCache(SR);

  /** pré-calcule les sons de l'instrument en tâche de fond */
  warm(instrument: Instrument) {
    const range = instrument === 'guitare' ? [40, 70] : [55, 84];
    const center = instrument === 'guitare' ? 50 : 66;
    const notes: number[] = [];
    for (let m = range[0]; m <= range[1]; m++) notes.push(m);
    notes.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
    const todo: [SynthVoice, number][] = [['clic', 0], ['clic_fort', 0], ['bloc', 0], ...notes.map((m) => [instrument, m] as [SynthVoice, number])];
    const step = () => { const j = todo.shift(); if (!j) return; this.synth.get(j[0], j[1]); setTimeout(step, 0); };
    setTimeout(step, 50);
  }

  /** ajoute une note au mixage (tenue, puis extinction en 0,12 s) */
  mixTone(out: Float32Array, startS: number, midi: number, durS: number, voice: SynthVoice, volume: number) {
    const src = this.synth.get(voice, voice === 'piano' || voice === 'guitare' ? midi : 0);
    const peak = PEAK[voice] * volume;
    const at = Math.round(startS * SR);
    const tonal = voice === 'piano' || voice === 'guitare';
    const hold = tonal ? Math.round(Math.min(Math.max(durS, 0.12), src.length / SR - 0.1) * SR) : src.length;
    const rel = Math.round(0.12 * SR);
    const len = Math.min(src.length, tonal ? hold + rel : src.length);
    for (let i = 0; i < len; i++) {
      const j = at + i;
      if (j >= out.length) break;
      const env = i < hold ? 1 : Math.exp((-6.9 * (i - hold)) / rel);
      out[j] += src[i] * peak * env;
    }
  }

  /** une suite de notes (stimulus, modèle, accompagnement) ; `totalMs` = fin de la dernière note */
  renderEvents(events: NoteEvent[], o: PlayOptions): { data: Float32Array; totalMs: number } {
    const tempo = o.tempo * (o.rate ?? 1);
    const voice = (o.instrument ?? 'piano') as SynthVoice;
    let endBeats = 0;
    for (const e of events) endBeats = Math.max(endBeats, e.start + e.dur);
    const totalMs = beatsToMs(endBeats, tempo);
    const out = new Float32Array(Math.ceil(((totalMs + 1200) / 1000) * SR));
    for (const e of events) this.mixTone(out, beatsToMs(e.start, tempo) / 1000, e.midi, (beatsToMs(e.dur, tempo) / 1000) * 0.95, voice, o.volume ?? 1);
    if (o.lowpassHz) {
      // passe-bas d'ordre 1 : l'accompagnement sonne plus feutré, la mélodie garde son éclat
      const a = 1 - Math.exp((-2 * Math.PI * o.lowpassHz) / SR);
      let y = 0;
      for (let i = 0; i < out.length; i++) { y += a * (out[i] - y); out[i] = y; }
    }
    return { data: out, totalMs };
  }

  renderNote(midi: number, instrument: Instrument): Float32Array {
    const out = new Float32Array(Math.round(1.2 * SR));
    this.mixTone(out, 0, midi, 0.8, instrument, 1);
    return out;
  }

  /** clics de métronome : accent sur le 1er temps de chaque mesure */
  renderClickTrack(beats: number, tempo: number, perBar: number): { data: Float32Array; totalMs: number } {
    const totalMs = (beats * 60000) / tempo;
    const out = new Float32Array(Math.ceil(((totalMs + 300) / 1000) * SR));
    for (let i = 0; i < beats; i++) this.mixTone(out, (i * 60) / tempo, 0, 0.05, i % perBar === 0 ? 'clic_fort' : 'clic', 1);
    return { data: out, totalMs };
  }

  /** plusieurs couches (accompagnement de jam) en un tampon d'une durée exacte, pour boucler sans trou ;
   *  ce qui dépasse la fin (résonance) est replié au début de la boucle */
  renderLayers(layers: { notes: NoteEvent[]; voice: SynthVoice; volume: number }[], tempo: number, beats: number): Float32Array {
    const len = Math.ceil((beatsToMs(beats, tempo) / 1000) * SR);
    const out = new Float32Array(len + SR);
    for (const l of layers) for (const e of l.notes) this.mixTone(out, beatsToMs(e.start, tempo) / 1000, e.midi, (beatsToMs(e.dur, tempo) / 1000) * 0.95, l.voice, l.volume);
    const loop = out.slice(0, len);
    for (let i = len; i < out.length && i - len < len; i++) loop[i - len] += out[i];
    return loop;
  }

  /** piste de métronome (clics datés en secondes) : temps fort, temps, subdivisions plus douces */
  renderClicks(clicks: { t: number; kind: 'fort' | 'temps' | 'sub' }[], durS: number): Float32Array {
    const out = new Float32Array(Math.ceil(durS * SR));
    for (const c of clicks) this.mixTone(out, c.t, 0, 0.05, c.kind === 'fort' ? 'clic_fort' : 'clic', c.kind === 'sub' ? 0.4 : 1);
    return out;
  }

  render(voice: SynthVoice, midi = 0): Float32Array { return this.synth.get(voice, midi); }
}
