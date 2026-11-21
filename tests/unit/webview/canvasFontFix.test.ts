import { describe, it, expect } from 'vitest';
import { normalizeCanvasFont, patchCanvasFontSetter } from '../../../webview/canvasFontFix';

// Chromium 150 の挙動を真似た偽の context: 先頭に空白がある値は捨てる
function makeFakeCtx() {
  class FakeCtx {
    private _font = '10px sans-serif';
    get font() { return this._font; }
    set font(v: string) { if (!/^\s/.test(v)) this._font = v; }
  }
  return FakeCtx;
}

describe('normalizeCanvasFont', () => {
  it('前後の空白を落とす', () => {
    expect(normalizeCanvasFont(' normal 24px Menlo, monospace')).toBe('normal 24px Menlo, monospace');
    expect(normalizeCanvasFont('italic bold 24px Menlo ')).toBe('italic bold 24px Menlo');
  });
  it('文字列以外はそのまま', () => {
    expect(normalizeCanvasFont(undefined)).toBeUndefined();
  });
});

describe('patchCanvasFontSetter', () => {
  it('xterm が組み立てる先頭空白つきの指定が通るようになる', () => {
    const Ctx = makeFakeCtx();
    const before = new Ctx();
    before.font = ' normal 24px Menlo, "Courier New", monospace';
    expect(before.font).toBe('10px sans-serif');

    expect(patchCanvasFontSetter(Ctx)).toBe(true);
    const after = new Ctx();
    after.font = ' normal 24px Menlo, "Courier New", monospace';
    expect(after.font).toBe('normal 24px Menlo, "Courier New", monospace');
  });

  it('二重に包まない', () => {
    const Ctx = makeFakeCtx();
    expect(patchCanvasFontSetter(Ctx)).toBe(true);
    expect(patchCanvasFontSetter(Ctx)).toBe(false);
  });

  it('無い環境では何もしない', () => {
    expect(patchCanvasFontSetter(undefined)).toBe(false);
  });
});
