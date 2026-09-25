import { api, ApiError } from '../api';

const mockFetch = (impl: () => Promise<Partial<Response>>) => {
  global.fetch = jest.fn(impl) as unknown as typeof fetch;
};

describe('api', () => {
  afterEach(() => jest.restoreAllMocks());

  it('restituisce i dati in caso di successo', async () => {
    mockFetch(() => Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ sessionId: 'ABC' }) }));
    await expect(api.createSession('ABC', 'Anna')).resolves.toEqual({ sessionId: 'ABC' });
  });

  it('propaga messaggio e codice di errore del server', async () => {
    mockFetch(() =>
      Promise.resolve({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Nome già in uso', code: 'name_taken' }),
      })
    );
    const error = await api.joinSession('ABC', 'Anna').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: 'Nome già in uso', status: 409, code: 'name_taken' });
    expect(error.isNetworkError).toBe(false);
  });

  it('segnala gli errori di rete con un messaggio comprensibile', async () => {
    mockFetch(() => Promise.reject(new TypeError('Network request failed')));
    const error = await api.getSessionInfo('ABC').catch((e) => e);
    expect(error.isNetworkError).toBe(true);
    expect(error.message).toMatch(/Impossibile connettersi/);
  });

  it('gestisce risposte non JSON (es. pagina di errore del proxy)', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError('bad')) }));
    const error = await api.getSessionInfo('ABC').catch((e) => e);
    expect(error).toMatchObject({ status: 502, code: 'invalid_response' });
  });

  it('codifica il codice sessione nell’URL', async () => {
    mockFetch(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
    await api.getSessionInfo('A/B');
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/api/sessions/A%2FB/info');
  });
});
