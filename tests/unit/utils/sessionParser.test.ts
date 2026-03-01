import { describe, it, expect } from 'vitest';
import { parseResumeId } from '../../../src/utils/sessionParser';

describe('parseResumeId', () => {
  it('extracts a resume ID from --resume flag', () => {
    const output = 'To resume this conversation, run:\nclaude --resume abc12345-1234-1234-1234-abcdef123456';
    expect(parseResumeId(output)).toBe('abc12345-1234-1234-1234-abcdef123456');
  });

  it('extracts a resume ID from -r short flag', () => {
    const output = 'To resume this conversation, run:\nclaude -r abc12345-1234-1234-1234-abcdef123456';
    expect(parseResumeId(output)).toBe('abc12345-1234-1234-1234-abcdef123456');
  });

  it('returns undefined when there is no match', () => {
    const output = 'Some other output without a resume ID';
    expect(parseResumeId(output)).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(parseResumeId('')).toBeUndefined();
  });

  it('returns the first match when multiple appear', () => {
    const output = [
      'claude --resume aaaaaaaa-0000-0000-0000-000000000001',
      'claude --resume bbbbbbbb-0000-0000-0000-000000000002',
    ].join('\n');
    expect(parseResumeId(output)).toBe('aaaaaaaa-0000-0000-0000-000000000001');
  });

  it('is case-insensitive for the command flags', () => {
    const output = 'claude --RESUME abc12345-1234-1234-1234-abcdef123456';
    expect(parseResumeId(output)).toBe('abc12345-1234-1234-1234-abcdef123456');
  });

  it('returns undefined when the UUID is malformed (too short)', () => {
    const output = 'claude --resume abc123';
    expect(parseResumeId(output)).toBeUndefined();
  });
});
