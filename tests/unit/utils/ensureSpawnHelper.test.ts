import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ensureSpawnHelperExecutable } from '../../../src/utils/ensureSpawnHelper';

describe('ensureSpawnHelperExecutable', () => {
  let dir: string;

  const make = (rel: string, mode: number) => {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, '#!/bin/sh\n');
    fs.chmodSync(p, mode);
    return p;
  };
  const modeOf = (p: string) => fs.statSync(p).mode & 0o777;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spawn-helper-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('adds exec bits to prebuilds/<platform>-<arch>/spawn-helper', () => {
    const p = make('prebuilds/darwin-arm64/spawn-helper', 0o644);
    ensureSpawnHelperExecutable({ packageDir: dir, platform: 'darwin', arch: 'arm64' });
    expect(modeOf(p)).toBe(0o755);
  });

  it('adds exec bits to build/Release/spawn-helper', () => {
    const p = make('build/Release/spawn-helper', 0o644);
    ensureSpawnHelperExecutable({ packageDir: dir, platform: 'linux', arch: 'x64' });
    expect(modeOf(p)).toBe(0o755);
  });

  it('does not touch other platform prebuilds', () => {
    const p = make('prebuilds/darwin-x64/spawn-helper', 0o644);
    ensureSpawnHelperExecutable({ packageDir: dir, platform: 'darwin', arch: 'arm64' });
    expect(modeOf(p)).toBe(0o644);
  });

  it('leaves already executable files unchanged', () => {
    const p = make('prebuilds/darwin-arm64/spawn-helper', 0o700);
    ensureSpawnHelperExecutable({ packageDir: dir, platform: 'darwin', arch: 'arm64' });
    expect(modeOf(p)).toBe(0o700);
  });

  it('is a no-op on win32', () => {
    const p = make('prebuilds/win32-x64/spawn-helper', 0o644);
    ensureSpawnHelperExecutable({ packageDir: dir, platform: 'win32', arch: 'x64' });
    expect(modeOf(p)).toBe(0o644);
  });

  it('does not throw when no candidate exists', () => {
    expect(() =>
      ensureSpawnHelperExecutable({ packageDir: dir, platform: 'darwin', arch: 'arm64' })
    ).not.toThrow();
  });

  it('does not throw and warns when package dir cannot be resolved', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      ensureSpawnHelperExecutable({
        resolvePackageDir: () => { throw new Error('not found'); },
        platform: 'darwin',
        arch: 'arm64',
      })
    ).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it('does not throw and warns when chmod fails', () => {
    make('prebuilds/darwin-arm64/spawn-helper', 0o644);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      ensureSpawnHelperExecutable({
        packageDir: dir,
        platform: 'darwin',
        arch: 'arm64',
        chmod: () => { throw new Error('EPERM'); },
      })
    ).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
