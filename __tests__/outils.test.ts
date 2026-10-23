// Métronome et accordeur (pages 4 et 5 du plan).
import { automationEndBar, buildTrack, loopBars, positionAt, tapTempo, tempoAtBar, signatureById, type MetronomeConfig } from '../src/engine/metronome';
import { centsOff, closestString, median, nearest, nextString, presetById } from '../src/engine/tuner';
import { midiToFreq } from '../src/engine/music';
import { encodeWavForTest } from './wav';

const base: MetronomeConfig = { tempo: 120, signature: '4/4', swing: 50, silentBars: 0 };

describe('métronome', () => {
  test('4/4 à 120 : 4 clics par mesure, le 1er fort, une mesure = 2 s', () => {
    const t = buildTrack(base, 2);
    expect(t.clicks.map((c) => c.kind)).toEqual(['fort', 'temps', 'temps', 'temps', 'fort', 'temps', 'temps', 'temps']);
    expect(t.durS).toBeCloseTo(4);
    expect(t.clicks[1].t).toBeCloseTo(0.5);
  });
  test('6/8 : deux temps, chacun divisé en trois', () => {
    const t = buildTrack({ ...base, signature: '6/8', tempo: 60 }, 1);
    expect(t.clicks.map((c) => c.kind)).toEqual(['fort', 'sub', 'sub', 'temps', 'sub', 'sub']);
    expect(t.clicks[1].t).toBeCloseTo(1 / 3);
    expect(signatureById('12/8').beats).toBe(4);
  });
  test('swing : la croche du « et » tombe au taux choisi', () => {
    const t = buildTrack({ ...base, tempo: 60, swing: 66 }, 1);
    expect(t.clicks.filter((c) => c.kind === 'sub').map((c) => +c.t.toFixed(2))).toEqual([0.66, 1.66, 2.66, 3.66]);
    expect(buildTrack(base, 1).clicks.some((c) => c.kind === 'sub')).toBe(false);
  });
  test('sens du rythme : 2 mesures muettes sur 4, la 1re sonne', () => {
    const t = buildTrack({ ...base, silentBars: 2 }, 4);
    expect([...new Set(t.clicks.map((c) => c.bar))]).toEqual([0, 3]);
    expect(loopBars({ ...base, silentBars: 2 }) % 4).toBe(0);
  });
  test('automate : +5 toutes les 2 mesures, plafond 130', () => {
    const c = { ...base, tempo: 100, automation: { step: 5, everyBars: 2, ceiling: 130 } };
    expect([0, 1, 2, 3, 4, 12, 40].map((b) => tempoAtBar(c, b))).toEqual([100, 100, 105, 105, 110, 130, 130]);
    expect(automationEndBar(c)).toBe(12);
    expect(tempoAtBar({ ...c, automation: { step: -10, everyBars: 1, ceiling: 70 } }, 9)).toBe(70);
  });
  test('position : la mesure et le temps en cours, en boucle', () => {
    const t = buildTrack(base, 2);
    expect(positionAt(t, 0.6)).toEqual({ bar: 0, beat: 1, tempo: 120 });
    expect(positionAt(t, 4.6).beat).toBe(1);
  });
  test('tap tempo', () => {
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
    expect(tapTempo([0, 5000])).toBeNull();
  });
});

describe('accordeur', () => {
  test('note la plus proche et écart en cents', () => {
    const n = nearest(440 * Math.pow(2, 10 / 1200));
    expect(n.name.startsWith('la')).toBe(true);
    expect(n.cents).toBeCloseTo(10, 1);
    expect(centsOff(midiToFreq(40), 40)).toBeCloseTo(0);
  });
  test('préréglages : guitare, basse, violon ; corde la plus proche', () => {
    expect(presetById('guitare').strings).toEqual([40, 45, 50, 55, 59, 64]);
    expect(presetById('basse').strings).toEqual([28, 33, 38, 43]);
    expect(presetById('violon').strings).toEqual([55, 62, 69, 76]);
    expect(closestString(midiToFreq(55.3), presetById('guitare').strings)).toBe(3);
  });
  test('mode guidé : la corde suivante non accordée', () => {
    expect(nextString([true, false, true, false], 1)).toBe(3);
    expect(nextString([true, true], 0)).toBeNull();
    expect(median([1, 100, 2, 3, 2])).toBe(2);
  });
  test('WAV 16 bits mono : en-tête valide', () => {
    const w = encodeWavForTest(new Float32Array([0, 1, -1]));
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF');
    expect(w.length).toBe(44 + 6);
    expect(new DataView(w.buffer).getInt16(46, true)).toBe(32767);
  });
});
