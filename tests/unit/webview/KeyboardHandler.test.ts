import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyboardHandler } from '../../../webview/KeyboardHandler';

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

function createHandler(isMac: boolean) {
  const mocks = {
    postMessage: vi.fn(),
    focusDirection: vi.fn(),
    closeFocused: vi.fn(),
    openVscodeTerminal: vi.fn(),
    openExplorer: vi.fn(),
  };

  const kb = new KeyboardHandler({ ...mocks, isMac });
  return { handler: kb.getKeyHandler(), ...mocks };
}

describe('KeyboardHandler', () => {
  describe('macOS (isMac: true)', () => {
    let handler: ReturnType<KeyboardHandler['getKeyHandler']>;
    let postMessage: ReturnType<typeof vi.fn>;
    let focusDirection: ReturnType<typeof vi.fn>;
    let closeFocused: ReturnType<typeof vi.fn>;
    let openVscodeTerminal: ReturnType<typeof vi.fn>;
    let openExplorer: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      const result = createHandler(true);
      handler = result.handler;
      postMessage = result.postMessage;
      focusDirection = result.focusDirection;
      closeFocused = result.closeFocused;
      openVscodeTerminal = result.openVscodeTerminal;
      openExplorer = result.openExplorer;
    });

    // Keep ALL existing test cases here, they all use metaKey which is correct for macOS

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

    describe('Ctrl+Shift+Arrow on macOS — does NOT trigger pane navigation', () => {
      it('ArrowUp → returns true, passes to xterm', () => {
        const e = makeEvent({ ctrlKey: true, shiftKey: true, key: 'ArrowUp' });
        expect(handler(e)).toBe(true);
        expect(focusDirection).not.toHaveBeenCalled();
      });
    });

    describe('Cmd+W', () => {
      it('returns false and calls closeFocused', () => {
        const e = makeEvent({ metaKey: true, key: 'w' });
        expect(handler(e)).toBe(false);
        expect(closeFocused).toHaveBeenCalledOnce();
      });
    });

    describe('Ctrl+W/T/N on macOS — passes to xterm as control chars', () => {
      it('Ctrl+W returns true and does NOT call closeFocused', () => {
        const e = makeEvent({ ctrlKey: true, key: 'w' });
        expect(handler(e)).toBe(true);
        expect(closeFocused).not.toHaveBeenCalled();
      });

      it('Ctrl+T returns true', () => {
        const e = makeEvent({ ctrlKey: true, key: 't' });
        expect(handler(e)).toBe(true);
        expect(openVscodeTerminal).not.toHaveBeenCalled();
      });

      it('Ctrl+F returns true', () => {
        const e = makeEvent({ ctrlKey: true, key: 'f' });
        expect(handler(e)).toBe(true);
        expect(openExplorer).not.toHaveBeenCalled();
      });

      it('Ctrl+N returns true', () => {
        const e = makeEvent({ ctrlKey: true, key: 'n' });
        expect(handler(e)).toBe(true);
        expect(postMessage).not.toHaveBeenCalled();
      });
    });

    describe('Cmd+T', () => {
      it('returns false and calls openVscodeTerminal', () => {
        const e = makeEvent({ metaKey: true, key: 't' });
        expect(handler(e)).toBe(false);
        expect(openVscodeTerminal).toHaveBeenCalledOnce();
      });
    });

    describe('Cmd+F', () => {
      it('returns false and calls openExplorer', () => {
        const e = makeEvent({ metaKey: true, key: 'f' });
        expect(handler(e)).toBe(false);
        expect(openExplorer).toHaveBeenCalledOnce();
      });
    });

    describe('Cmd+N', () => {
      it('returns false and posts requestFolderPicker', () => {
        const e = makeEvent({ metaKey: true, key: 'n' });
        expect(handler(e)).toBe(false);
        expect(postMessage).toHaveBeenCalledWith({ type: 'requestFolderPicker' });
      });
    });

    describe('regular keys', () => {
      it('plain "a" → returns true', () => {
        const e = makeEvent({ key: 'a' });
        expect(handler(e)).toBe(true);
      });

      it('Enter → returns true', () => {
        const e = makeEvent({ key: 'Enter' });
        expect(handler(e)).toBe(true);
      });

      it('Mod+Shift+Arrow on keyup → returns true', () => {
        const e = makeEvent({ metaKey: true, shiftKey: true, key: 'ArrowUp', type: 'keyup' });
        expect(handler(e)).toBe(true);
        expect(focusDirection).not.toHaveBeenCalled();
      });
    });

    describe('Cmd+1-9 (pane jump)', () => {
      it('Cmd+1 → returns false', () => {
        const e = makeEvent({ metaKey: true, key: '1' });
        expect(handler(e)).toBe(false);
      });

      it('Cmd+9 → returns false', () => {
        const e = makeEvent({ metaKey: true, key: '9' });
        expect(handler(e)).toBe(false);
      });

      it('Cmd+0 → returns true (not handled)', () => {
        const e = makeEvent({ metaKey: true, key: '0' });
        expect(handler(e)).toBe(true);
      });

      it('Cmd+Shift+1 → returns true (different modifiers)', () => {
        const e = makeEvent({ metaKey: true, shiftKey: true, key: '1' });
        expect(handler(e)).toBe(true);
      });
    });
  });

  describe('Windows/Linux (isMac: false)', () => {
    let handler: ReturnType<KeyboardHandler['getKeyHandler']>;
    let postMessage: ReturnType<typeof vi.fn>;
    let focusDirection: ReturnType<typeof vi.fn>;
    let closeFocused: ReturnType<typeof vi.fn>;
    let openVscodeTerminal: ReturnType<typeof vi.fn>;
    let openExplorer: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      const result = createHandler(false);
      handler = result.handler;
      postMessage = result.postMessage;
      focusDirection = result.focusDirection;
      closeFocused = result.closeFocused;
      openVscodeTerminal = result.openVscodeTerminal;
      openExplorer = result.openExplorer;
    });

    describe('Ctrl+Shift+Arrow triggers pane navigation on Windows', () => {
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

    describe('Cmd+Shift+Arrow does NOT trigger on Windows', () => {
      it('Meta+Shift+ArrowUp → returns true', () => {
        const e = makeEvent({ metaKey: true, shiftKey: true, key: 'ArrowUp' });
        expect(handler(e)).toBe(true);
        expect(focusDirection).not.toHaveBeenCalled();
      });
    });

    describe('Ctrl+W/T/F/N triggers shortcuts on Windows', () => {
      it('Ctrl+W → returns false and calls closeFocused', () => {
        const e = makeEvent({ ctrlKey: true, key: 'w' });
        expect(handler(e)).toBe(false);
        expect(closeFocused).toHaveBeenCalledOnce();
      });

      it('Ctrl+T → returns false and calls openVscodeTerminal', () => {
        const e = makeEvent({ ctrlKey: true, key: 't' });
        expect(handler(e)).toBe(false);
        expect(openVscodeTerminal).toHaveBeenCalledOnce();
      });

      it('Ctrl+F → returns false and calls openExplorer', () => {
        const e = makeEvent({ ctrlKey: true, key: 'f' });
        expect(handler(e)).toBe(false);
        expect(openExplorer).toHaveBeenCalledOnce();
      });

      it('Ctrl+N → returns false and posts requestFolderPicker', () => {
        const e = makeEvent({ ctrlKey: true, key: 'n' });
        expect(handler(e)).toBe(false);
        expect(postMessage).toHaveBeenCalledWith({ type: 'requestFolderPicker' });
      });
    });

    describe('Cmd+key does NOT trigger shortcuts on Windows', () => {
      it('Cmd+W → returns true', () => {
        const e = makeEvent({ metaKey: true, key: 'w' });
        expect(handler(e)).toBe(true);
        expect(closeFocused).not.toHaveBeenCalled();
      });
    });

    describe('Ctrl+1-9 (pane jump)', () => {
      it('Ctrl+1 → returns false', () => {
        const e = makeEvent({ ctrlKey: true, key: '1' });
        expect(handler(e)).toBe(false);
      });

      it('Ctrl+9 → returns false', () => {
        const e = makeEvent({ ctrlKey: true, key: '9' });
        expect(handler(e)).toBe(false);
      });

      it('Ctrl+0 → returns true (not handled)', () => {
        const e = makeEvent({ ctrlKey: true, key: '0' });
        expect(handler(e)).toBe(true);
      });
    });
  });
});
