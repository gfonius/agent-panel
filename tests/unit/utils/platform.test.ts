import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the entire 'os' module so we can control platform() return value in ESM
vi.mock('os', () => ({
  platform: vi.fn(),
}));

import * as os from 'os';

describe('getShellArgs', () => {
  it('returns ["-l"] for zsh', async () => {
    const { getShellArgs } = await import('../../../src/utils/platform');
    expect(getShellArgs('/bin/zsh')).toEqual(['-l']);
  });

  it('returns ["-l"] for bash', async () => {
    const { getShellArgs } = await import('../../../src/utils/platform');
    expect(getShellArgs('/bin/bash')).toEqual(['-l']);
  });

  it('returns ["-l"] for paths ending in zsh', async () => {
    const { getShellArgs } = await import('../../../src/utils/platform');
    expect(getShellArgs('/usr/local/bin/zsh')).toEqual(['-l']);
  });

  it('returns ["-l"] for paths ending in bash', async () => {
    const { getShellArgs } = await import('../../../src/utils/platform');
    expect(getShellArgs('/usr/bin/bash')).toEqual(['-l']);
  });

  it('returns [] for fish', async () => {
    const { getShellArgs } = await import('../../../src/utils/platform');
    expect(getShellArgs('/usr/local/bin/fish')).toEqual([]);
  });

  it('returns [] for powershell.exe', async () => {
    const { getShellArgs } = await import('../../../src/utils/platform');
    expect(getShellArgs('powershell.exe')).toEqual([]);
  });

  it('returns [] for an empty string', async () => {
    const { getShellArgs } = await import('../../../src/utils/platform');
    expect(getShellArgs('')).toEqual([]);
  });
});

describe('getDefaultShell', () => {
  const originalShellEnv = process.env.SHELL;

  afterEach(() => {
    // Restore original SHELL env
    if (originalShellEnv !== undefined) {
      process.env.SHELL = originalShellEnv;
    } else {
      delete process.env.SHELL;
    }
    vi.restoreAllMocks();
  });

  it('returns SHELL env var on darwin when set', async () => {
    vi.mocked(os.platform).mockReturnValue('darwin');
    process.env.SHELL = '/bin/zsh';
    const { getDefaultShell } = await import('../../../src/utils/platform');
    expect(getDefaultShell()).toBe('/bin/zsh');
  });

  it('returns /bin/zsh on darwin when SHELL env is not set', async () => {
    vi.mocked(os.platform).mockReturnValue('darwin');
    delete process.env.SHELL;
    const { getDefaultShell } = await import('../../../src/utils/platform');
    expect(getDefaultShell()).toBe('/bin/zsh');
  });

  it('returns SHELL env var on linux when set', async () => {
    vi.mocked(os.platform).mockReturnValue('linux');
    process.env.SHELL = '/bin/bash';
    const { getDefaultShell } = await import('../../../src/utils/platform');
    expect(getDefaultShell()).toBe('/bin/bash');
  });

  it('returns powershell.exe on win32', async () => {
    vi.mocked(os.platform).mockReturnValue('win32');
    const { getDefaultShell } = await import('../../../src/utils/platform');
    expect(getDefaultShell()).toBe('powershell.exe');
  });
});
