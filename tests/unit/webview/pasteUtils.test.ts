import { describe, it, expect } from 'vitest';
import {
  shouldInterceptPaste,
  shouldSuppressNativePaste,
  shouldCopySelection,
  NATIVE_PASTE_SUPPRESS_MS,
} from '../../../webview/pasteUtils';

function makeEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    key: '',
    type: 'keydown',
    ...overrides,
  } as KeyboardEvent;
}

describe('shouldInterceptPaste', () => {
  it('Windows: Ctrl+V (keydown) → true', () => {
    const e = makeEvent({ ctrlKey: true, key: 'v' });
    expect(shouldInterceptPaste(e, true)).toBe(true);
  });

  it('macOS: Ctrl+V → false (does not change Mac behavior)', () => {
    const e = makeEvent({ ctrlKey: true, key: 'v' });
    expect(shouldInterceptPaste(e, false)).toBe(false);
  });

  it('Windows: Ctrl+Shift+V → false', () => {
    const e = makeEvent({ ctrlKey: true, shiftKey: true, key: 'v' });
    expect(shouldInterceptPaste(e, true)).toBe(false);
  });

  it('Windows: Ctrl+Alt+V → false', () => {
    const e = makeEvent({ ctrlKey: true, altKey: true, key: 'v' });
    expect(shouldInterceptPaste(e, true)).toBe(false);
  });

  it('Windows: Cmd+V (metaKey) → false', () => {
    const e = makeEvent({ metaKey: true, key: 'v' });
    expect(shouldInterceptPaste(e, true)).toBe(false);
  });

  it('Windows: Ctrl+V on keyup → false', () => {
    const e = makeEvent({ ctrlKey: true, key: 'v', type: 'keyup' });
    expect(shouldInterceptPaste(e, true)).toBe(false);
  });

  it('Windows: Ctrl+V (uppercase "V") → true', () => {
    const e = makeEvent({ ctrlKey: true, key: 'V' });
    expect(shouldInterceptPaste(e, true)).toBe(true);
  });

  it('Windows: Ctrl+C → false', () => {
    const e = makeEvent({ ctrlKey: true, key: 'c' });
    expect(shouldInterceptPaste(e, true)).toBe(false);
  });
});

describe('shouldSuppressNativePaste', () => {
  it('期限内 → true', () => {
    expect(shouldSuppressNativePaste(1000, 1500)).toBe(true);
  });

  it('期限切れ → false', () => {
    expect(shouldSuppressNativePaste(1500, 1500)).toBe(false);
  });

  it('横取りしていない(期限 0) → false', () => {
    expect(shouldSuppressNativePaste(1000, 0)).toBe(false);
  });

  it('猶予は正の値', () => {
    expect(NATIVE_PASTE_SUPPRESS_MS).toBeGreaterThan(0);
  });
});

describe('shouldCopySelection', () => {
  it('Windows: 選択あり Ctrl+C → true', () => {
    expect(shouldCopySelection(makeEvent({ ctrlKey: true, key: 'c' }), true, true)).toBe(true);
  });

  it('Windows: 選択なし Ctrl+C → false (^C を送る)', () => {
    expect(shouldCopySelection(makeEvent({ ctrlKey: true, key: 'c' }), true, false)).toBe(false);
  });

  it('macOS: 選択あり Ctrl+C → false', () => {
    expect(shouldCopySelection(makeEvent({ ctrlKey: true, key: 'c' }), false, true)).toBe(false);
  });

  it('Windows: Ctrl+Shift+C → false', () => {
    expect(shouldCopySelection(makeEvent({ ctrlKey: true, shiftKey: true, key: 'c' }), true, true)).toBe(false);
  });
});
