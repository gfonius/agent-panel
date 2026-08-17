import { ExtraUsage, RateLimitInfo, RateLimitWindow } from '../types';
import { RATE_LIMIT_CACHE_TTL, RATE_LIMIT_ORDER } from '../constants';
import { execSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

let cache: RateLimitInfo | null = null;

function getOAuthTokenFromEnv(): string | null {
  return process.env.CLAUDE_CODE_OAUTH_TOKEN ?? null;
}

function getOAuthTokenFromKeychain(): string | null {
  if (os.platform() !== 'darwin') {
    return null;
  }
  try {
    const result = execSync(
      'security find-generic-password -s "Claude Code-credentials" -a "$(whoami)" -w',
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();

    const credentials = JSON.parse(result);
    return credentials?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

function getOAuthTokenFromFile(): string | null {
  try {
    const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const credentialsPath = path.join(configDir, '.credentials.json');
    const content = fs.readFileSync(credentialsPath, 'utf-8');
    const credentials = JSON.parse(content);
    return credentials?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

function getOAuthToken(): string | null {
  return getOAuthTokenFromEnv()
    ?? getOAuthTokenFromKeychain()
    ?? getOAuthTokenFromFile();
}

// extra_usage は他の枠と構造が異なるため、走査から明示的に除外する
const RESERVED_TOP_LEVEL_KEYS = new Set(['extra_usage']);

/**
 * レスポンスの値が「枠」オブジェクトの形をしているかを判定する。
 * 実 API では対象外の枠は値そのものが null で返るため、まず null/非オブジェクトを弾き、
 * その上で utilization が number であるものだけを枠として扱う（CLI 本体と同じ挙動）。
 */
function isWindowValue(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).utilization === 'number';
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function parseWindows(data: Record<string, unknown>): RateLimitWindow[] {
  const windows: RateLimitWindow[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (RESERVED_TOP_LEVEL_KEYS.has(key)) {
      continue;
    }
    if (!isWindowValue(value)) {
      continue;
    }

    const resetsAt = typeof value.resets_at === 'string' ? value.resets_at : null;

    windows.push({
      key,
      utilization: value.utilization as number,
      resetsAt,
      limitDollars: toOptionalNumber(value.limit_dollars),
      usedDollars: toOptionalNumber(value.used_dollars),
      remainingDollars: toOptionalNumber(value.remaining_dollars),
    });
  }

  const orderIndex = new Map(RATE_LIMIT_ORDER.map((key, index) => [key, index]));
  const known = windows
    .filter((w) => orderIndex.has(w.key))
    .sort((a, b) => orderIndex.get(a.key)! - orderIndex.get(b.key)!);
  const unknown = windows.filter((w) => !orderIndex.has(w.key));

  return [...known, ...unknown];
}

const ISO_4217_ALPHA_RE = /^[A-Za-z]{3}$/;

/**
 * ISO 4217 の3文字英字コードのみ有効とする。不正な値（空文字・長さ違い・
 * 数字混じり等）は Intl.NumberFormat に渡すと RangeError になるため 'USD' にフォールバックする。
 */
function normalizeCurrency(value: unknown): string {
  if (typeof value === 'string' && ISO_4217_ALPHA_RE.test(value)) {
    return value.toUpperCase();
  }
  return 'USD';
}

/** Intl.NumberFormat が受け付ける桁数の範囲は 0〜20。範囲外・非整数は 2 にフォールバックする。 */
function normalizeDecimalPlaces(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 20) {
    return value;
  }
  return 2;
}

function parseExtraUsage(data: Record<string, unknown>): ExtraUsage | null {
  const raw = data.extra_usage;
  if (raw === null || typeof raw !== 'object') {
    return null;
  }

  const eu = raw as Record<string, unknown>;
  if (eu.is_enabled !== true) {
    return null;
  }

  return {
    isEnabled: true,
    monthlyLimit: typeof eu.monthly_limit === 'number' ? eu.monthly_limit : null,
    usedCredits: typeof eu.used_credits === 'number' ? eu.used_credits : 0,
    utilization: typeof eu.utilization === 'number' ? eu.utilization : 0,
    currency: normalizeCurrency(eu.currency),
    decimalPlaces: normalizeDecimalPlaces(eu.decimal_places),
    spendLimitReached: eu.spend_limit_reached === true,
    disabledReason: typeof eu.disabled_reason === 'string' ? eu.disabled_reason : null,
  };
}

export async function fetchRateLimitInfo(): Promise<RateLimitInfo | null> {
  // キャッシュチェック
  if (cache && Date.now() - cache.fetchedAt < RATE_LIMIT_CACHE_TTL) {
    return cache;
  }

  const token = getOAuthToken();
  if (!token) {
    return null;
  }

  try {
    const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as Record<string, unknown>;

    cache = {
      windows: parseWindows(data),
      extraUsage: parseExtraUsage(data),
      fetchedAt: Date.now(),
    };

    return cache;
  } catch {
    return null;
  }
}
