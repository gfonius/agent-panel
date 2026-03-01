import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyboardHandler } from '../../../webview/KeyboardHandler';

function makeEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    key: '',
    type: 'keydown',
    ...overrides,
  } as KeyboardEvent;
}

describe('KeyboardHandler', () => {
  let postMessage: ReturnType<typeof vi.fn>;
  let focusDirection: ReturnType<typeof vi.fn>;
  let closeFocused: ReturnType<typeof vi.fn>;
  let openVscodeTerminal: ReturnType<typeof vi.fn>;
  let handler: ReturnType<KeyboardHandler['getKeyHandler']>;

  beforeEach(() => {
    postMessage = vi.fn();
    focusDirection = vi.fn();
    closeFocused = vi.fn();
    openVscodeTerminal = vi.fn();

    const kb = new KeyboardHandler({
      postMessage,
      focusDirection,
      closeFocused,
      openVscodeTerminal,
    });
    handler = kb.getKeyHandler();
  });

  describe('Cmd+Shift+Arrow (metaKey)', () => {
    it('ArrowUp → returns false and calls focusDirection("up")', () => {
      const e = makeEvent({ metaKey: true, shiftKey: true, key: 'ArrowUp' });
      expect(handler(e)).toBe(false);
      expect(focusDirection).toHaveBeenCalledWith('up');
    });

    it('ArrowDown → returns false and calls focusDirection("down")', () => {
      const e = makeEvent({ metaKey: true, shiftKey: true, key: 'ArrowDown' });
      expect(handler(e)).toBe(false);
      expect(focusDirection).toHaveBeenCalledWith('down');
    });

    it('ArrowLeft → returns false and calls focusDirection("left")', () => {
      const e = makeEvent({ metaKey: true, shiftKey: true, key: 'ArrowLeft' });
      expect(handler(e)).toBe(false);
      expect(focusDirection).toHaveBeenCalledWith('left');
    });

    it('ArrowRight → returns false and calls focusDirection("right")', () => {
      const e = makeEvent({ metaKey: true, shiftKey: true, key: 'ArrowRight' });
      expect(handler(e)).toBe(false);
      expect(focusDirection).toHaveBeenCalledWith('right');
    });
  });

  describe('Ctrl+Shift+Arrow (ctrlKey)', () => {
    it('ArrowUp → returns false and calls focusDirection("up")', () => {
      const e = makeEvent({ ctrlKey: true, shiftKey: true, key: 'ArrowUp' });
      expect(handler(e)).toBe(false);
      expect(focusDirection).toHaveBeenCalledWith('up');
    });

    it('ArrowDown → returns false and calls focusDirection("down")', () => {
      const e = makeEvent({ ctrlKey: true, shiftKey: true, key: 'ArrowDown' });
      expect(handler(e)).toBe(false);
      expect(focusDirection).toHaveBeenCalledWith('down');
    });

    it('ArrowLeft → returns false and calls focusDirection("left")', () => {
      const e = makeEvent({ ctrlKey: true, shiftKey: true, key: 'ArrowLeft' });
      expect(handler(e)).toBe(false);
      expect(focusDirection).toHaveBeenCalledWith('left');
    });

    it('ArrowRight → returns false and calls focusDirection("right")', () => {
      const e = makeEvent({ ctrlKey: true, shiftKey: true, key: 'ArrowRight' });
      expect(handler(e)).toBe(false);
      expect(focusDirection).toHaveBeenCalledWith('right');
    });
  });

  describe('Cmd+W', () => {
    it('returns false and calls closeFocused', () => {
      const e = makeEvent({ metaKey: true, key: 'w' });
      expect(handler(e)).toBe(false);
      expect(closeFocused).toHaveBeenCalledOnce();
    });

    it('Ctrl+W also calls closeFocused', () => {
      const e = makeEvent({ ctrlKey: true, key: 'w' });
      expect(handler(e)).toBe(false);
      expect(closeFocused).toHaveBeenCalledOnce();
    });
  });

  describe('Cmd+T', () => {
    it('returns false and calls openVscodeTerminal', () => {
      const e = makeEvent({ metaKey: true, key: 't' });
      expect(handler(e)).toBe(false);
      expect(openVscodeTerminal).toHaveBeenCalledOnce();
    });

    it('Ctrl+T also calls openVscodeTerminal', () => {
      const e = makeEvent({ ctrlKey: true, key: 't' });
      expect(handler(e)).toBe(false);
      expect(openVscodeTerminal).toHaveBeenCalledOnce();
    });
  });

  describe('Cmd+N', () => {
    it('returns false and posts requestFolderPicker message', () => {
      const e = makeEvent({ metaKey: true, key: 'n' });
      expect(handler(e)).toBe(false);
      expect(postMessage).toHaveBeenCalledWith({ type: 'requestFolderPicker' });
    });

    it('Ctrl+N also posts requestFolderPicker message', () => {
      const e = makeEvent({ ctrlKey: true, key: 'n' });
      expect(handler(e)).toBe(false);
      expect(postMessage).toHaveBeenCalledWith({ type: 'requestFolderPicker' });
    });
  });

  describe('regular keys (passed to xterm)', () => {
    it('plain "a" → returns true', () => {
      const e = makeEvent({ key: 'a' });
      expect(handler(e)).toBe(true);
    });

    it('Enter → returns true', () => {
      const e = makeEvent({ key: 'Enter' });
      expect(handler(e)).toBe(true);
    });

    it('Mod+Shift+Arrow on keyup → returns true (only fires on keydown)', () => {
      const e = makeEvent({ metaKey: true, shiftKey: true, key: 'ArrowUp', type: 'keyup' });
      expect(handler(e)).toBe(true);
      expect(focusDirection).not.toHaveBeenCalled();
    });

    it('Mod+W on keyup → returns true (only fires on keydown)', () => {
      const e = makeEvent({ metaKey: true, key: 'w', type: 'keyup' });
      expect(handler(e)).toBe(true);
      expect(closeFocused).not.toHaveBeenCalled();
    });
  });
});
