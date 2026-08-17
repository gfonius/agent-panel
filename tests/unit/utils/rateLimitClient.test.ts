import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted - mock all dependencies before module evaluation
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('os', () => ({
  platform: vi.fn(() => 'darwin'),
  homedir: vi.fn(() => '/home/testuser'),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

const VALID_TOKEN = 'test-oauth-token';
const VALID_CREDENTIALS = JSON.stringify({
  claudeAiOauth: { accessToken: VALID_TOKEN },
});

// Shape observed from the real `/api/oauth/usage` response: non-applicable
// windows come back as the literal value `null` (not an object with a null
// utilization field), and window objects carry dollar-denominated fields.
const MOCK_API_RESPONSE = {
  five_hour: {
    limit_dollars: 1,
    remaining_dollars: 0.5,
    resets_at: '2026-03-01T06:00:00Z',
    used_dollars: 0.5,
    utilization: 0.5,
  },
  seven_day: {
    limit_dollars: 5,
    remaining_dollars: 3.5,
    resets_at: '2026-03-07T00:00:00Z',
    used_dollars: 1.5,
    utilization: 0.3,
  },
  nimbus_quill: {
    limit_dollars: 2,
    remaining_dollars: 1.8,
    resets_at: '2026-03-07T00:00:00Z',
    used_dollars: 0.2,
    utilization: 0.1,
  },
  seven_day_oauth_apps: null,
  seven_day_opus: null,
  seven_day_sonnet: null,
  seven_day_cowork: null,
  seven_day_omelette: null,
  tangelo: null,
  iguana_necktie: null,
  omelette_promotional: null,
  cinder_cove: null,
  amber_ladder: null,
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
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  delete process.env.CLAUDE_CONFIG_DIR;
});

// Helper: set up mocks and return the dynamically imported module
async function setupModule(opts: {
  execSyncImpl?: () => string;
  platform?: string;
  homedir?: string;
  readFileSyncImpl?: () => string;
}) {
  const { execSync } = await import('child_process');
  const os = await import('os');
  const fs = await import('fs');

  if (opts.execSyncImpl) {
    vi.mocked(execSync).mockImplementation(opts.execSyncImpl as never);
  } else {
    vi.mocked(execSync).mockImplementation(() => { throw new Error('not available'); });
  }

  vi.mocked(os.platform).mockReturnValue((opts.platform ?? 'darwin') as NodeJS.Platform);
  vi.mocked(os.homedir).mockReturnValue(opts.homedir ?? '/home/testuser');

  if (opts.readFileSyncImpl) {
    vi.mocked(fs.readFileSync).mockImplementation(opts.readFileSyncImpl as never);
  } else {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('ENOENT'); });
  }

  const mod = await import('../../../src/utils/rateLimitClient');
  return mod;
}

function findWindow(windows: { key: string }[], key: string) {
  return windows.find((w) => w.key === key);
}

describe('fetchRateLimitInfo', () => {
  it('parses and returns a successful API response', async () => {
    const fetchMock = makeFetchResponse(true, MOCK_API_RESPONSE);
    global.fetch = fetchMock as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result).not.toBeNull();
    expect(findWindow(result!.windows, 'five_hour')).toMatchObject({
      utilization: 0.5,
      resetsAt: '2026-03-01T06:00:00Z',
    });
    expect(findWindow(result!.windows, 'seven_day')).toMatchObject({
      utilization: 0.3,
      resetsAt: '2026-03-07T00:00:00Z',
    });
    expect(findWindow(result!.windows, 'nimbus_quill')).toMatchObject({
      utilization: 0.1,
      resetsAt: '2026-03-07T00:00:00Z',
    });
    expect(result!.fetchedAt).toBeTypeOf('number');
  });

  it('skips window keys whose value is null', async () => {
    const fetchMock = makeFetchResponse(true, MOCK_API_RESPONSE);
    global.fetch = fetchMock as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    for (const key of [
      'seven_day_oauth_apps',
      'seven_day_opus',
      'seven_day_sonnet',
      'seven_day_cowork',
      'seven_day_omelette',
      'tangelo',
      'iguana_necktie',
      'omelette_promotional',
      'cinder_cove',
      'amber_ladder',
    ]) {
      expect(findWindow(result!.windows, key)).toBeUndefined();
    }
    expect(result!.windows).toHaveLength(3);
  });

  it('returns cached data on a second call within TTL', async () => {
    const fetchMock = makeFetchResponse(true, MOCK_API_RESPONSE);
    global.fetch = fetchMock as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });

    const first = await fetchRateLimitInfo();
    const second = await fetchRateLimitInfo();

    // fetch should only have been called once; second call uses cache
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first); // same object reference due to cache
  });

  it('returns null when OAuth token retrieval fails', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({
      platform: 'darwin',
      // execSyncImpl not provided -> throws; readFileSyncImpl not provided -> throws
    });
    const result = await fetchRateLimitInfo();

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the API response is not ok', async () => {
    global.fetch = makeFetchResponse(false, {}) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result).toBeNull();
  });

  it('returns null when credentials JSON does not contain an access token', async () => {
    const noTokenCreds = JSON.stringify({ claudeAiOauth: {} });
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => noTokenCreds });
    const result = await fetchRateLimitInfo();

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps limit_dollars / used_dollars / remaining_dollars onto the window', async () => {
    global.fetch = makeFetchResponse(true, MOCK_API_RESPONSE) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(findWindow(result!.windows, 'five_hour')).toMatchObject({
      limitDollars: 1,
      usedDollars: 0.5,
      remainingDollars: 0.5,
    });
  });

  // Cross-platform support

  it('uses CLAUDE_CODE_OAUTH_TOKEN env var when set', async () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'env-token';
    global.fetch = makeFetchResponse(true, MOCK_API_RESPONSE) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({});
    const result = await fetchRateLimitInfo();

    expect(result).not.toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/api/oauth/usage',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer env-token',
        }),
      }),
    );
  });

  it('reads ~/.claude/.credentials.json on Windows when Keychain is unavailable', async () => {
    global.fetch = makeFetchResponse(true, MOCK_API_RESPONSE) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({
      platform: 'win32',
      homedir: 'C:\\Users\\testuser',
      readFileSyncImpl: () => VALID_CREDENTIALS,
    });
    const result = await fetchRateLimitInfo();

    expect(result).not.toBeNull();
  });

  it('reads ~/.claude/.credentials.json on Linux', async () => {
    global.fetch = makeFetchResponse(true, MOCK_API_RESPONSE) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({
      platform: 'linux',
      homedir: '/home/testuser',
      readFileSyncImpl: () => VALID_CREDENTIALS,
    });
    const result = await fetchRateLimitInfo();

    expect(result).not.toBeNull();
  });

  it('falls back to credentials file when Keychain fails on macOS', async () => {
    global.fetch = makeFetchResponse(true, MOCK_API_RESPONSE) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({
      platform: 'darwin',
      readFileSyncImpl: () => VALID_CREDENTIALS,
      // execSyncImpl not provided -> throws error
    });
    const result = await fetchRateLimitInfo();

    expect(result).not.toBeNull();
  });

  it('uses CLAUDE_CONFIG_DIR for credentials file path when set', async () => {
    process.env.CLAUDE_CONFIG_DIR = '/custom/config';
    global.fetch = makeFetchResponse(true, MOCK_API_RESPONSE) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({
      platform: 'linux',
      readFileSyncImpl: () => VALID_CREDENTIALS,
    });
    const result = await fetchRateLimitInfo();

    const fs = await import('fs');
    expect(result).not.toBeNull();
    expect(fs.readFileSync).toHaveBeenCalledWith('/custom/config/.credentials.json', 'utf-8');
  });

  // NEW TESTS: dynamic window parsing (feature/usage-limits)

  it('includes cinder_cove (Fable) window when present and non-null in the response', async () => {
    const responseWithFable = {
      ...MOCK_API_RESPONSE,
      cinder_cove: { resets_at: '2026-03-07T00:00:00Z', utilization: 0.2 },
    };
    global.fetch = makeFetchResponse(true, responseWithFable) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(findWindow(result!.windows, 'cinder_cove')).toMatchObject({
      key: 'cinder_cove',
      utilization: 0.2,
      resetsAt: '2026-03-07T00:00:00Z',
    });
  });

  it('skips a window whose utilization field is not a number', async () => {
    const responseWithNullUtil = {
      ...MOCK_API_RESPONSE,
      seven_day_opus: { utilization: null, resets_at: '2026-03-07T00:00:00Z' },
    };
    global.fetch = makeFetchResponse(true, responseWithNullUtil) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(findWindow(result!.windows, 'seven_day_opus')).toBeUndefined();
  });

  it('sets resetsAt to null when resets_at is missing from a window', async () => {
    const responseWithoutResetsAt = {
      ...MOCK_API_RESPONSE,
      seven_day_opus: { utilization: 0.4, resets_at: null },
    };
    global.fetch = makeFetchResponse(true, responseWithoutResetsAt) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(findWindow(result!.windows, 'seven_day_opus')).toMatchObject({
      utilization: 0.4,
      resetsAt: null,
    });
  });

  it('appends an unknown window key to the end of the windows array', async () => {
    const responseWithUnknownKey = {
      ...MOCK_API_RESPONSE,
      some_new_limit: { utilization: 0.6, resets_at: '2026-03-07T00:00:00Z' },
    };
    global.fetch = makeFetchResponse(true, responseWithUnknownKey) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    const keys = result!.windows.map((w) => w.key);
    expect(keys[keys.length - 1]).toBe('some_new_limit');
  });

  it('orders windows according to RATE_LIMIT_ORDER, including nimbus_quill (Fable)', async () => {
    const responseAllWindows = {
      seven_day_sonnet: { utilization: 0.1, resets_at: '2026-03-07T00:00:00Z' },
      cinder_cove: { utilization: 0.25, resets_at: '2026-03-07T00:00:00Z' },
      seven_day_cowork: { utilization: 0.05, resets_at: '2026-03-07T00:00:00Z' },
      seven_day: { utilization: 0.3, resets_at: '2026-03-07T00:00:00Z' },
      five_hour: { utilization: 0.5, resets_at: '2026-03-01T06:00:00Z' },
      seven_day_opus: { utilization: 0.4, resets_at: '2026-03-07T00:00:00Z' },
      seven_day_oauth_apps: { utilization: 0.05, resets_at: '2026-03-07T00:00:00Z' },
      nimbus_quill: { utilization: 0.2, resets_at: '2026-03-07T00:00:00Z' },
    };
    global.fetch = makeFetchResponse(true, responseAllWindows) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result!.windows.map((w) => w.key)).toEqual([
      'five_hour',
      'seven_day',
      'seven_day_opus',
      'seven_day_sonnet',
      'nimbus_quill',
      'cinder_cove',
      'seven_day_cowork',
      'seven_day_oauth_apps',
    ]);
  });

  it('does not treat limits (array), spend (object) or member_dashboard_available (bool) as windows', async () => {
    const responseWithExtraTopLevelKeys = {
      ...MOCK_API_RESPONSE,
      limits: [{ utilization: 0.9 }],
      spend: { total: 12.3 },
      member_dashboard_available: true,
    };
    global.fetch = makeFetchResponse(true, responseWithExtraTopLevelKeys) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(findWindow(result!.windows, 'limits')).toBeUndefined();
    expect(findWindow(result!.windows, 'spend')).toBeUndefined();
    expect(findWindow(result!.windows, 'member_dashboard_available')).toBeUndefined();
    expect(result!.windows).toHaveLength(3);
  });

  it('returns an empty windows array when the response contains no window-shaped keys', async () => {
    global.fetch = makeFetchResponse(true, {}) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result).not.toBeNull();
    expect(result!.windows).toEqual([]);
  });

  // extra_usage

  it('maps extra_usage to ExtraUsage correctly', async () => {
    const responseWithExtraUsage = {
      ...MOCK_API_RESPONSE,
      extra_usage: {
        credits_ever_enabled: true,
        currency: 'USD',
        daily: {},
        decimal_places: 2,
        disabled_reason: null,
        is_enabled: true,
        monthly_limit: 50,
        spend_limit_reached: false,
        used_credits: 12.3,
        user_disabled: false,
        utilization: 0.246,
        weekly: {},
      },
    };
    global.fetch = makeFetchResponse(true, responseWithExtraUsage) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result!.extraUsage).toMatchObject({
      isEnabled: true,
      monthlyLimit: 50,
      usedCredits: 12.3,
      utilization: 0.246,
      currency: 'USD',
      decimalPlaces: 2,
      spendLimitReached: false,
      disabledReason: null,
    });
  });

  it('does not treat extra_usage as a window entry', async () => {
    const responseWithExtraUsage = {
      ...MOCK_API_RESPONSE,
      extra_usage: {
        is_enabled: true,
        currency: 'USD',
        decimal_places: 2,
        monthly_limit: 50,
        used_credits: 12.3,
        utilization: 0.246,
        spend_limit_reached: false,
        disabled_reason: null,
      },
    };
    global.fetch = makeFetchResponse(true, responseWithExtraUsage) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(findWindow(result!.windows, 'extra_usage')).toBeUndefined();
  });

  it('sets extraUsage to null when is_enabled is false', async () => {
    const responseWithDisabledExtraUsage = {
      ...MOCK_API_RESPONSE,
      extra_usage: {
        is_enabled: false,
        currency: 'USD',
        decimal_places: 2,
        monthly_limit: 50,
        used_credits: 0,
        utilization: 0,
        spend_limit_reached: false,
        disabled_reason: 'not_eligible',
      },
    };
    global.fetch = makeFetchResponse(true, responseWithDisabledExtraUsage) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result!.extraUsage).toBeNull();
  });

  it('sets extraUsage to null when extra_usage is absent from the response', async () => {
    global.fetch = makeFetchResponse(true, MOCK_API_RESPONSE) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result!.extraUsage).toBeNull();
  });

  it('keeps monthlyLimit as null when extra_usage.monthly_limit is null (unlimited)', async () => {
    const responseWithUnlimitedExtraUsage = {
      ...MOCK_API_RESPONSE,
      extra_usage: {
        is_enabled: true,
        currency: 'USD',
        decimal_places: 2,
        monthly_limit: null,
        used_credits: 8.1,
        utilization: 0,
        spend_limit_reached: false,
        disabled_reason: null,
      },
    };
    global.fetch = makeFetchResponse(true, responseWithUnlimitedExtraUsage) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result!.extraUsage).toMatchObject({
      isEnabled: true,
      monthlyLimit: null,
      usedCredits: 8.1,
    });
  });

  it('falls back to currency "USD" and decimalPlaces 2 when missing from extra_usage', async () => {
    const responseWithMinimalExtraUsage = {
      ...MOCK_API_RESPONSE,
      extra_usage: {
        is_enabled: true,
        monthly_limit: 50,
        used_credits: 12.3,
        utilization: 0.246,
      },
    };
    global.fetch = makeFetchResponse(true, responseWithMinimalExtraUsage) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result!.extraUsage).toMatchObject({
      currency: 'USD',
      decimalPlaces: 2,
      spendLimitReached: false,
      disabledReason: null,
    });
  });

  // NEW TESTS: currency / decimalPlaces validation (bug fix)

  it('normalizes an empty-string currency to USD', async () => {
    const response = {
      ...MOCK_API_RESPONSE,
      extra_usage: {
        is_enabled: true,
        currency: '',
        decimal_places: 2,
        monthly_limit: 50,
        used_credits: 12.3,
        utilization: 0.246,
      },
    };
    global.fetch = makeFetchResponse(true, response) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result!.extraUsage).toMatchObject({ currency: 'USD' });
  });

  it('normalizes a lowercase currency ("usd") to uppercase ("USD")', async () => {
    const response = {
      ...MOCK_API_RESPONSE,
      extra_usage: {
        is_enabled: true,
        currency: 'usd',
        decimal_places: 2,
        monthly_limit: 50,
        used_credits: 12.3,
        utilization: 0.246,
      },
    };
    global.fetch = makeFetchResponse(true, response) as typeof fetch;

    const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
    const result = await fetchRateLimitInfo();

    expect(result!.extraUsage).toMatchObject({ currency: 'USD' });
  });

  it.each(['US', 'USDD', 'usd1', '12'])(
    'falls back to USD when currency has an invalid length/format (%s)',
    async (badCurrency) => {
      const response = {
        ...MOCK_API_RESPONSE,
        extra_usage: {
          is_enabled: true,
          currency: badCurrency,
          decimal_places: 2,
          monthly_limit: 50,
          used_credits: 12.3,
          utilization: 0.246,
        },
      };
      global.fetch = makeFetchResponse(true, response) as typeof fetch;

      const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
      const result = await fetchRateLimitInfo();

      expect(result!.extraUsage).toMatchObject({ currency: 'USD' });
    },
  );

  it.each([-1, 1.5, 21, 100])(
    'falls back decimalPlaces to 2 when out of range or non-integer (%s)',
    async (badDecimalPlaces) => {
      const response = {
        ...MOCK_API_RESPONSE,
        extra_usage: {
          is_enabled: true,
          currency: 'USD',
          decimal_places: badDecimalPlaces,
          monthly_limit: 50,
          used_credits: 12.3,
          utilization: 0.246,
        },
      };
      global.fetch = makeFetchResponse(true, response) as typeof fetch;

      const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
      const result = await fetchRateLimitInfo();

      expect(result!.extraUsage).toMatchObject({ decimalPlaces: 2 });
    },
  );

  it('accepts decimalPlaces at the valid boundaries 0 and 20', async () => {
    const response0 = {
      ...MOCK_API_RESPONSE,
      extra_usage: {
        is_enabled: true,
        currency: 'USD',
        decimal_places: 0,
        monthly_limit: 50,
        used_credits: 12,
        utilization: 0.246,
      },
    };
    global.fetch = makeFetchResponse(true, response0) as typeof fetch;
    {
      const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
      const result = await fetchRateLimitInfo();
      expect(result!.extraUsage).toMatchObject({ decimalPlaces: 0 });
    }

    vi.resetModules();
    const response20 = { ...response0, extra_usage: { ...response0.extra_usage, decimal_places: 20 } };
    global.fetch = makeFetchResponse(true, response20) as typeof fetch;
    {
      const { fetchRateLimitInfo } = await setupModule({ execSyncImpl: () => VALID_CREDENTIALS });
      const result = await fetchRateLimitInfo();
      expect(result!.extraUsage).toMatchObject({ decimalPlaces: 20 });
    }
  });
});
