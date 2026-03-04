import { RateLimitInfo } from '../types';
import { RATE_LIMIT_CACHE_TTL } from '../constants';
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

    const data = await response.json() as {
      five_hour: { utilization: number; resets_at: string };
      seven_day: { utilization: number; resets_at: string };
      seven_day_sonnet?: { utilization: number; resets_at: string } | null;
    };

    cache = {
      fiveHour: {
        utilization: data.five_hour.utilization,
        resetsAt: data.five_hour.resets_at,
      },
      sevenDay: {
        utilization: data.seven_day.utilization,
        resetsAt: data.seven_day.resets_at,
      },
      sevenDaySonnet: data.seven_day_sonnet ? {
        utilization: data.seven_day_sonnet.utilization,
        resetsAt: data.seven_day_sonnet.resets_at,
      } : null,
      fetchedAt: Date.now(),
    };

    return cache;
  } catch {
    return null;
  }
}
