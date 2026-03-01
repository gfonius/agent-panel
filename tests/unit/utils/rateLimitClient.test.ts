import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted - mock child_process before module evaluation
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

const VALID_TOKEN = 'test-oauth-token';
const VALID_CREDENTIALS = JSON.stringify({
  claudeAiOauth: { accessToken: VALID_TOKEN },
});

const MOCK_API_RESPONSE = {
  five_hour: { utilization: 0.5, resets_at: '2026-03-01T06:00:00Z' },
  seven_day: { utilization: 0.3, resets_at: '2026-03-07T00:00:00Z' },
  seven_day_sonnet: { utilization: 0.1, resets_at: '2026-03-07T00:00:00Z' },
};

function makeFetchResponse(ok: boolean, data: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(data),
  });
}

// Reset modules before each test so the module-level cache in rateLimitClient is cleared
beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
});

// Helper: set up execSync mock and return the dynamically imported module
async function setupModule(execSyncImpl: () => string) {
  const { execSync } = await import('child_process');
  vi.mocked(execSync).mockImplementation(execSyncImpl as never);
  const mod = await import('../../../src/utils/rateLimitClient');
  return mod;
}

describe('fetchRateLimitInfo', () => {
  it('parses and returns a successful API response', async () => {
    const fetchMock = makeFetchResponse(true, MOCK_API_RESPONSE);
    global.fetch = fetchMock as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule(() => VALID_CREDENTIALS);
    const result = await fetchRateLimitInfo();

    expect(result).not.toBeNull();
    expect(result!.fiveHour.utilization).toBe(0.5);
    expect(result!.fiveHour.resetsAt).toBe('2026-03-01T06:00:00Z');
    expect(result!.sevenDay.utilization).toBe(0.3);
    expect(result!.sevenDay.resetsAt).toBe('2026-03-07T00:00:00Z');
    expect(result!.sevenDaySonnet).not.toBeNull();
    expect(result!.sevenDaySonnet!.utilization).toBe(0.1);
    expect(result!.fetchedAt).toBeTypeOf('number');
  });

  it('sets sevenDaySonnet to null when the field is null in the response', async () => {
    const responseWithoutSonnet = { ...MOCK_API_RESPONSE, seven_day_sonnet: null };
    global.fetch = makeFetchResponse(true, responseWithoutSonnet) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule(() => VALID_CREDENTIALS);
    const result = await fetchRateLimitInfo();

    expect(result).not.toBeNull();
    expect(result!.sevenDaySonnet).toBeNull();
  });

  it('returns cached data on a second call within TTL', async () => {
    const fetchMock = makeFetchResponse(true, MOCK_API_RESPONSE);
    global.fetch = fetchMock as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule(() => VALID_CREDENTIALS);

    const first = await fetchRateLimitInfo();
    const second = await fetchRateLimitInfo();

    // fetch should only have been called once; second call uses cache
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first); // same object reference due to cache
  });

  it('returns null when OAuth token retrieval fails', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule(() => {
      throw new Error('security command failed');
    });
    const result = await fetchRateLimitInfo();

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the API response is not ok', async () => {
    global.fetch = makeFetchResponse(false, {}) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule(() => VALID_CREDENTIALS);
    const result = await fetchRateLimitInfo();

    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule(() => VALID_CREDENTIALS);
    const result = await fetchRateLimitInfo();

    expect(result).toBeNull();
  });

  it('returns null when credentials JSON does not contain an access token', async () => {
    const noTokenCreds = JSON.stringify({ claudeAiOauth: {} });
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule(() => noTokenCreds);
    const result = await fetchRateLimitInfo();

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('includes sevenDaySonnet field in the returned RateLimitInfo shape', async () => {
    global.fetch = makeFetchResponse(true, MOCK_API_RESPONSE) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule(() => VALID_CREDENTIALS);
    const result = await fetchRateLimitInfo();

    expect(result).toHaveProperty('sevenDaySonnet');
    expect(result!.sevenDaySonnet).toMatchObject({
      utilization: 0.1,
      resetsAt: '2026-03-07T00:00:00Z',
    });
  });
});
