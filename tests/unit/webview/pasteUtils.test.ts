import { describe, it, expect } from 'vitest';
import { shouldInterceptPaste } from '../../../webview/pasteUtils';

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
