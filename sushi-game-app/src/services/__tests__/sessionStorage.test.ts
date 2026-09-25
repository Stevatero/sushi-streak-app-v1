import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedSession, SessionStorageService, STORAGE_KEYS } from '../sessionStorage';
import { preferences } from '../preferences';

const session = (id: string, date: string, score = 3): SavedSession => ({
  id,
  sessionName: 'CENA',
  restaurant: '',
  date,
  players: [{ id: 'p1', name: 'Anna', score, finished: true }],
  winner: { name: 'Anna', score },
});

describe('SessionStorageService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('aggiorna una partita esistente invece di duplicarla', async () => {
    await SessionStorageService.upsertSession(session('a', '2026-01-01T20:00:00Z', 3));
    await SessionStorageService.upsertSession(session('a', '2026-01-01T20:00:00Z', 7));
    const saved = await SessionStorageService.getSavedSessions();
    expect(saved).toHaveLength(1);
    expect(saved[0].winner.score).toBe(7);
  });

  it('ordina le partite dalla più recente', async () => {
    await SessionStorageService.upsertSession(session('old', '2026-01-01T20:00:00Z'));
    await SessionStorageService.upsertSession(session('new', '2026-03-01T20:00:00Z'));
    const saved = await SessionStorageService.getSavedSessions();
    expect(saved.map((s) => s.id)).toEqual(['new', 'old']);
  });

  it('scarta i record non validi e completa quelli delle versioni precedenti', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.savedSessions,
      JSON.stringify([
        { id: 'legacy', sessionName: 'VECCHIA', date: '01/02/2025, 21:00', players: [{ name: 'Luca', score: 5 }] },
        { foo: 'bar' },
        null,
      ])
    );
    const saved = await SessionStorageService.getSavedSessions();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id: 'legacy',
      restaurant: '',
      winner: { name: 'Luca', score: 5 },
      players: [{ name: 'Luca', score: 5, finished: false }],
    });
    // Le date legacy già formattate restano leggibili
    expect(SessionStorageService.formatDate(saved[0].date)).toBe('01/02/2025, 21:00');
  });

  it('mette da parte i dati corrotti senza bloccare l’app', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.savedSessions, '{corrotto');
    await expect(SessionStorageService.getSavedSessions()).resolves.toEqual([]);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((k) => k.startsWith(`${STORAGE_KEYS.savedSessions}_corrupted_`))).toBe(true);
    expect(keys).not.toContain(STORAGE_KEYS.savedSessions);
  });

  it('restituisce null per una sessione attiva incompleta', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify({ sessionId: 'ABC' }));
    await expect(SessionStorageService.getActiveSession()).resolves.toBeNull();
  });

  it('calcola la durata della partita', () => {
    const from = '2026-01-01T20:00:00Z';
    expect(SessionStorageService.formatDuration(from, new Date('2026-01-01T20:45:00Z'))).toBe('45 min');
    expect(SessionStorageService.formatDuration(from, new Date('2026-01-01T22:05:00Z'))).toBe('2 h 5 min');
    expect(SessionStorageService.formatDuration('non-una-data')).toBeUndefined();
  });

  it('la cancellazione dei dati locali rimuove solo le chiavi dell’app', async () => {
    await SessionStorageService.upsertSession(session('a', '2026-01-01T20:00:00Z'));
    await preferences.setPlayerName('Anna');
    await AsyncStorage.setItem('chiave_di_altra_libreria', 'x');
    await preferences.clearAllLocalData();
    expect(await AsyncStorage.getAllKeys()).toEqual(['chiave_di_altra_libreria']);
  });
});
