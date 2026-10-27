// Les exemples sonores ne se superposent jamais, et « Je n'ai pas appris ça » remet une leçon à découvrir.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

type Fake = { stopped: boolean; done: Promise<void>; finish: () => void };
const started: Fake[] = [];
const fakePlayback = () => {
  let finish!: () => void;
  const done = new Promise<void>((r) => { finish = r; });
  const p: Fake & { startMs: number; stop: () => void } = { stopped: false, done, finish, startMs: 0, stop: () => { p.stopped = true; } };
  started.push(p);
  return p;
};
jest.mock('../src/audio/RNAudioEngine', () => ({ audio: { play: () => fakePlayback(), clicks: () => fakePlayback() } }));

import { soundGroup } from '../src/audio/soundGroup';
import { useUserStore } from '../src/store/useUserStore';

describe('un exemple à la fois', () => {
  beforeEach(() => { started.length = 0; });
  test('répondre coupe l\'exemple en cours, cadence et question comprises', () => {
    const g = soundGroup();
    g.play([], { tempo: 80 });
    g.clicks(4, 80);
    g.stop();
    expect(started.every((p) => p.stopped)).toBe(true);
  });
  test('un nouvel exemple coupe le précédent, et une suite interrompue ne reprend pas après son attente', async () => {
    const g = soundGroup();
    const first = g.fresh();
    const cadence = g.play([], { tempo: 80 });
    const second = g.fresh(); // l'élève a répondu, la question suivante démarre
    expect(started[0].stopped).toBe(true);
    (cadence as unknown as Fake).finish();
    await cadence.done;
    expect(g.alive(first)).toBe(false);
    expect(g.alive(second)).toBe(true);
    g.play([], { tempo: 80 });
    expect(started[1].stopped).toBe(false);
  });
});

describe('« Je n\'ai pas appris ça »', () => {
  test('la leçon redevient à découvrir et ses exercices repartent du niveau le plus simple', () => {
    const st = useUserStore.getState();
    st.reset();
    useUserStore.setState({
      deepLessonsSeen: ['fondations', 'intervalles'], deepLessonsDone: ['fondations', 'intervalles'], deepLessonsConfirmed: ['intervalles'],
      deepLessonsDoneDay: { intervalles: '2026-10-20' }, levels: { 'OR-3-05': 3, 'OR-1-01': 2 }, levelRuns: { 'OR-3-05': 2 },
    });
    useUserStore.getState().notLearned('intervalles', ['OR-3-05']);
    const s = useUserStore.getState();
    expect(s.deepLessonsSeen).toEqual(['fondations']);
    expect(s.deepLessonsDone).toEqual(['fondations']);
    expect(s.deepLessonsConfirmed).toEqual([]);
    expect(s.deepLessonsDoneDay.intervalles).toBeUndefined();
    expect(s.levels['OR-3-05']).toBe(0);
    expect(s.levelRuns['OR-3-05']).toBe(0);
    // les autres exercices ne bougent pas
    expect(s.levels['OR-1-01']).toBe(2);
  });
});
