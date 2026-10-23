// Métronome (page 4 du plan) : signatures simples et composées, swing, silences d'entraînement, automate.
// Tout est calculé à l'avance en une piste (liste de clics datés), puis rendue en audio par le moteur.
// La piste est la seule source de vérité : le son ET l'affichage du temps en cours en dérivent.

export interface Signature { id: string; label: string; beats: number; /** composée : chaque temps se divise en 3 */ compound: boolean; group: 2 | 3 | 4 }
export const SIGNATURES: Signature[] = [
  { id: '2/2', label: '2/2', beats: 2, compound: false, group: 2 },
  { id: '2/4', label: '2/4', beats: 2, compound: false, group: 2 },
  { id: '6/8', label: '6/8', beats: 2, compound: true, group: 2 },
  { id: '3/2', label: '3/2', beats: 3, compound: false, group: 3 },
  { id: '3/4', label: '3/4', beats: 3, compound: false, group: 3 },
  { id: '9/8', label: '9/8', beats: 3, compound: true, group: 3 },
  { id: '4/2', label: '4/2', beats: 4, compound: false, group: 4 },
  { id: '4/4', label: '4/4', beats: 4, compound: false, group: 4 },
  { id: '12/8', label: '12/8', beats: 4, compound: true, group: 4 },
];
export const signatureById = (id: string) => SIGNATURES.find((s) => s.id === id) ?? SIGNATURES[7];

export const TEMPO_MIN = 20;
export const TEMPO_MAX = 300;
export const clampTempo = (t: number) => Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, Math.round(t)));

export interface Automation { /** + (ou −) BPM à chaque palier */ step: number; /** palier toutes les N mesures */ everyBars: number; /** tempo plafond (facultatif) */ ceiling?: number }

export interface MetronomeConfig {
  /** tempo en temps (noires ; noires pointées en mesure composée) par minute */
  tempo: number;
  signature: string;
  /** 50 = droit, jusqu'à 75 = swing appuyé : place de la croche du « et » dans le temps */
  swing: number;
  /** travail du sens du rythme : mesures muettes sur un cycle de 4 (0 = désactivé, 1 à 3) */
  silentBars: 0 | 1 | 2 | 3;
  automation?: Automation;
}

export type ClickKind = 'fort' | 'temps' | 'sub';
export interface Click { t: number; kind: ClickKind; bar: number; beat: number }
export interface Track { clicks: Click[]; durS: number; /** tempo de chaque mesure (affichage de l'automate) */ barTempos: number[]; barStarts: number[] }

/** tempo de la mesure n (0 = première) avec l'automate */
export function tempoAtBar(c: MetronomeConfig, bar: number): number {
  const a = c.automation;
  if (!a || !a.step || a.everyBars < 1) return clampTempo(c.tempo);
  let t = c.tempo + Math.floor(bar / a.everyBars) * a.step;
  if (a.ceiling) t = a.step > 0 ? Math.min(t, a.ceiling) : Math.max(t, a.ceiling);
  return clampTempo(t);
}

/** l'automate est terminé (plafond atteint) à partir de cette mesure ; Infinity sans plafond */
export function automationEndBar(c: MetronomeConfig): number {
  const a = c.automation;
  if (!a || !a.step || !a.ceiling) return Infinity;
  const steps = Math.ceil(Math.abs(a.ceiling - c.tempo) / Math.abs(a.step));
  return steps * a.everyBars;
}

/** mesure muette dans le cycle de 4 : la 1re sonne, puis `silentBars` mesures se taisent */
export const isSilentBar = (c: MetronomeConfig, bar: number) => c.silentBars > 0 && (bar % 4) >= 1 && (bar % 4) <= c.silentBars;

/** construit la piste de `bars` mesures, à partir de la mesure `fromBar` (pour l'automate) */
export function buildTrack(c: MetronomeConfig, bars: number, fromBar = 0): Track {
  const sig = signatureById(c.signature);
  const clicks: Click[] = [];
  const barTempos: number[] = [];
  const barStarts: number[] = [];
  let t = 0;
  for (let b = 0; b < bars; b++) {
    const bar = fromBar + b;
    const tempo = tempoAtBar(c, bar);
    const beatS = 60 / tempo;
    barTempos.push(tempo);
    barStarts.push(t);
    const silent = isSilentBar(c, bar);
    for (let k = 0; k < sig.beats; k++) {
      const at = t + k * beatS;
      if (!silent) {
        clicks.push({ t: at, kind: k === 0 ? 'fort' : 'temps', bar, beat: k });
        if (sig.compound) {
          clicks.push({ t: at + beatS / 3, kind: 'sub', bar, beat: k });
          clicks.push({ t: at + (2 * beatS) / 3, kind: 'sub', bar, beat: k });
        } else if (c.swing > 50) {
          clicks.push({ t: at + (beatS * Math.min(75, c.swing)) / 100, kind: 'sub', bar, beat: k });
        }
      }
    }
    t += sig.beats * beatS;
  }
  return { clicks, durS: t, barTempos, barStarts };
}

/** nombre de mesures d'une boucle sans automate : un cycle de silences complet, répété jusqu'à ~30 s
 *  (une boucle longue rend rarissime le petit raccord de fin de boucle du lecteur audio) */
export function loopBars(c: MetronomeConfig): number {
  const sig = signatureById(c.signature);
  const barS = (sig.beats * 60) / clampTempo(c.tempo);
  const unit = c.silentBars ? 4 : 1;
  return Math.max(unit, Math.ceil(30 / (barS * unit)) * unit);
}

/** position courante (mesure, temps) et tempo, d'après le temps écoulé depuis le début de la piste */
export function positionAt(track: Track, elapsedS: number): { bar: number; beat: number; tempo: number } {
  if (!track.barStarts.length) return { bar: 0, beat: 0, tempo: 0 };
  const loop = track.durS > 0 ? elapsedS % track.durS : 0;
  let i = 0;
  while (i + 1 < track.barStarts.length && track.barStarts[i + 1] <= loop) i++;
  const tempo = track.barTempos[i];
  const beat = Math.floor((loop - track.barStarts[i]) / (60 / tempo));
  return { bar: i, beat, tempo };
}

/** tap tempo : moyenne des derniers intervalles (on repart à zéro après 2 s sans tape) */
export function tapTempo(taps: number[]): number | null {
  const recent: number[] = [];
  for (let i = taps.length - 1; i >= 0; i--) {
    if (recent.length && recent[0] - taps[i] > 2000) break;
    recent.unshift(taps[i]);
    if (recent.length >= 6) break;
  }
  if (recent.length < 2) return null;
  const gaps = recent.slice(1).map((x, i) => x - recent[i]);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return clampTempo(60000 / avg);
}
