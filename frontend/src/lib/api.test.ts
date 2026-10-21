import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, analyseChoices, analyseClass, checkEligibility, getMeta, searchProgrammes } from './api';

function stubFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('reads meta from /api/meta/', async () => {
    const fn = stubFetch(200, { subjects: [] });
    expect(await getMeta()).toEqual({ subjects: [] });
    expect(fn).toHaveBeenCalledWith('/api/meta/', expect.anything());
  });

  it('posts eligibility as JSON', async () => {
    const fn = stubFetch(200, { counts: {} });
    await checkEligibility({ grades: { ENG: 'A' }, mode: 'flexible' });
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/eligibility/');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ grades: { ENG: 'A' }, mode: 'flexible' });
  });

  it('posts choices and class requests to their endpoints', async () => {
    const fn = stubFetch(200, {});
    await analyseChoices({ grades: {}, mode: 'classic', choices: ['1'] });
    await analyseClass({ learners: [], mode: 'classic' });
    expect(fn.mock.calls.map((c) => (c as unknown as [string])[0])).toEqual(['/api/choices/', '/api/class/']);
  });

  it('puts search terms in the query string, encoded, and leaves empty ones out', async () => {
    const fn = stubFetch(200, { total: 0, results: [] });
    await searchProgrammes({ q: 'law & order', institution: '', pathway: 'stem', limit: 5 });
    expect((fn.mock.calls[0] as unknown as [string])[0]).toBe('/api/programmes/?q=law+%26+order&pathway=stem&limit=5');
  });

  it('turns a detail message into an ApiError', async () => {
    stubFetch(400, { detail: 'At least 7 different subjects are needed; 2 given.' });
    await expect(checkEligibility({ grades: {}, mode: 'flexible' })).rejects.toMatchObject({
      status: 400,
      message: 'At least 7 different subjects are needed; 2 given.',
    });
  });

  it('turns field errors into one readable message', async () => {
    stubFetch(400, { grades: ['This field is required.'], choices: ['Unknown programme code: 999'] });
    const error = await checkEligibility({ grades: {}, mode: 'flexible' }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('grades: This field is required. choices: Unknown programme code: 999');
  });

  it('explains a 503 as the server not being ready', async () => {
    stubFetch(503, { detail: 'degrees.json not found. Run: python manage.py build_catalogue' });
    await expect(getMeta()).rejects.toMatchObject({ status: 503, message: expect.stringContaining('build_catalogue') });
  });

  it('says so when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(getMeta()).rejects.toMatchObject({ status: 0, message: expect.stringContaining('reach the server') });
  });

  it('copes with a reply that is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })));
    await expect(getMeta()).rejects.toMatchObject({ status: 502, message: expect.stringContaining('502') });
  });

  it('tells the person when they are asking too often', async () => {
    stubFetch(429, { detail: 'Request was throttled. Expected available in 30 seconds.' });
    await expect(getMeta()).rejects.toMatchObject({ status: 429, message: expect.stringContaining('throttled') });
  });
});
