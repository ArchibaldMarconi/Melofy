// Hook micro : notes segmentées, attaques, hauteur et niveau instantanés.
// Le seuil de bruit (gate) vient du test micro de Profil ; sans test, valeur prudente.
import { useEffect, useRef, useState } from 'react';
import type { PlayedNote } from '../content/types';
import { freqToMidi } from '../engine/music';
import { audio } from './RNAudioEngine';
import { NoteSegmenter, OnsetDetector, type MicFrame } from './segmenter';

export const DEFAULT_GATE = 0.02;

export function micErrorMessage(code: string): string {
  if (code === 'micro_refuse') return 'Le micro est refusé. Autorise-le pour Melofy dans les réglages, ou réponds au clavier.';
  if (code === 'micro_indispo') return 'Aucun micro disponible ici. Réponds au clavier, ou essaie depuis l\'appli.';
  return 'Le micro n\'a pas démarré. Réponds au clavier, ou réessaie.';
}

export function useMic(
  active: boolean,
  originMs: number,
  handlers: { onNote?: (n: PlayedNote) => void; onOnset?: (tMs: number) => void; onFrame?: (f: MicFrame) => void },
  gate = DEFAULT_GATE,
) {
  const [liveMidi, setLiveMidi] = useState<number | null>(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const h = useRef(handlers);
  h.current = handlers;

  useEffect(() => {
    if (!active) return;
    setError(null);
    const seg = new NoteSegmenter({ rmsOn: gate, rmsOff: gate / 2, minDurMs: 70, jumpCents: 70, attackRatio: 2.2, minGapMs: 90 });
    const ons = new OnsetDetector({ threshold: gate * 1.5, ratio: 2.5, minGapMs: 90 });
    let alive = true;
    audio.startMic((f) => {
      if (!alive) return;
      const voiced = f.freq !== null && f.rms >= gate;
      setLiveMidi(voiced ? freqToMidi(f.freq!) : null);
      setLevel(f.rms);
      h.current.onFrame?.(f);
      const n = seg.push(f);
      if (n) h.current.onNote?.({ ...n, tMs: n.tMs - originMs });
      const o = ons.push(f);
      if (o !== null) h.current.onOnset?.(o - originMs);
    }).catch((e: Error) => setError(micErrorMessage(e.message)));
    return () => {
      alive = false;
      const last = seg.flush(audio.now());
      if (last) h.current.onNote?.({ ...last, tMs: last.tMs - originMs });
      audio.stopMic();
    };
  }, [active, originMs, gate]);

  return { liveMidi, level, error };
}
