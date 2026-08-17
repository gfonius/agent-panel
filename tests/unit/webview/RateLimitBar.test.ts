import { describe, it, expect, beforeEach } from 'vitest';
import { formatExtraUsage } from '../../../webview/RateLimitBar';
import { setLocale } from '../../../webview/i18n';
import type { ExtraUsage } from '../../../src/types';

// formatExtraUsage() is a pure function extracted from the RateLimitBar class so it can be
// unit-tested without a DOM. The RateLimitBar class itself relies on document.createElement /
// innerHTML / querySelector, and this repo's vitest config runs with `environment: 'node'`
// (no jsdom/happy-dom dependency present) - see the report for why class-level DOM tests
// (updateLocale() row re-rendering) were not added here.

function makeExtraUsage(overrides: Partial<ExtraUsage> = {}): ExtraUsage {
  return {
    isEnabled: true,
    monthlyLimit: 50,
    usedCredits: 12.3,
    utilization: 0.246,
    currency: 'USD',
    decimalPlaces: 2,
    spendLimitReached: false,
    disabledReason: null,
    ...overrides,
  };
}

describe('formatExtraUsage', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('formats used / monthlyLimit using Intl.NumberFormat for a valid currency', () => {
    const extraUsage = makeExtraUsage();
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const expected = `${formatter.format(12.3)} / ${formatter.format(50)}`;

    expect(formatExtraUsage(extraUsage)).toBe(expected);
  });

  it('shows the "Unlimited" label when monthlyLimit is null', () => {
    const extraUsage = makeExtraUsage({ monthlyLimit: null });

    expect(formatExtraUsage(extraUsage)).toContain('Unlimited');
  });

  it('respects decimalPlaces when formatting', () => {
    const extraUsage = makeExtraUsage({ usedCredits: 12, monthlyLimit: 50, decimalPlaces: 0 });
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const expected = `${formatter.format(12)} / ${formatter.format(50)}`;

    expect(formatExtraUsage(extraUsage)).toBe(expected);
  });

  it('falls back to a plain "amount CODE" format without throwing when currency is malformed (2 letters)', () => {
    const extraUsage = makeExtraUsage({ currency: 'US' });

    expect(() => formatExtraUsage(extraUsage)).not.toThrow();
    expect(formatExtraUsage(extraUsage)).toBe('12.30 US / 50.00 US');
  });

  it('falls back to a plain "amount CODE" format without throwing when currency is empty', () => {
    const extraUsage = makeExtraUsage({ currency: '' });

    expect(() => formatExtraUsage(extraUsage)).not.toThrow();
    expect(formatExtraUsage(extraUsage)).toBe('12.30  / 50.00 ');
  });

  it('uses the "Unlimited" label in the fallback path too when monthlyLimit is null', () => {
    const extraUsage = makeExtraUsage({ currency: 'US', monthlyLimit: null });

    expect(formatExtraUsage(extraUsage)).toBe('12.30 US / Unlimited');
  });

  it('sanitizes an out-of-range decimalPlaces in the fallback path instead of throwing', () => {
    const extraUsage = makeExtraUsage({ currency: 'US', decimalPlaces: -1, usedCredits: 12.345, monthlyLimit: 50 });

    expect(() => formatExtraUsage(extraUsage)).not.toThrow();
    // -1 is invalid for toFixed(); the fallback must sanitize it back to 2 decimal places
    expect(formatExtraUsage(extraUsage)).toBe('12.35 US / 50.00 US');
  });
});
