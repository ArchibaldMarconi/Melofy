// Un groupe de sons qu'on coupe d'un coup : la question, le modèle, la démonstration… Quand l'élève répond avant
// la fin de l'exemple, ou qu'un nouveau son démarre, on coupe le groupe : deux exemples ne se superposent jamais.
// Le bourdon et l'accompagnement n'en font pas partie (ils ont leur propre vie).
// Le jeton évite qu'une suite interrompue (cadence, puis question) reprenne après une attente.
import type { NoteEvent } from '../content/types';
import type { PlayOptions, Playback } from './AudioEngine';
import { audio } from './RNAudioEngine';

export interface SoundGroup {
  play(events: NoteEvent[], o: PlayOptions): Playback;
  clicks(beats: number, tempo: number, delayMs?: number, perBar?: number): Playback;
  /** coupe tout ce qui joue dans le groupe ; les suites en attente ne reprendront pas */
  stop(): void;
  /** coupe et commence une nouvelle suite de sons ; renvoie son jeton */
  fresh(): number;
  /** cette suite est-elle toujours la plus récente ? (à vérifier après chaque attente) */
  alive(token: number): boolean;
}

export function soundGroup(): SoundGroup {
  let playing: Playback[] = [];
  let token = 0;
  const keep = (p: Playback) => { playing.push(p); p.done.then(() => { playing = playing.filter((x) => x !== p); }); return p; };
  return {
    play: (events, o) => keep(audio.play(events, o)),
    clicks: (beats, tempo, delayMs, perBar) => keep(audio.clicks(beats, tempo, delayMs, perBar)),
    stop() {
      token++;
      const list = playing;
      playing = [];
      for (const p of list) p.stop();
    },
    fresh() { this.stop(); return token; },
    alive: (t) => t === token,
  };
}
