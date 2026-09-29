import { describe, it, expect } from 'vitest';
import { isSendNowKey, SEND_NOW_SEQUENCE } from '../../../webview/claudeKeys';

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

describe('isSendNowKey', () => {
  it('Ctrl+Enter (keydown) → true', () => {
    expect(isSendNowKey(makeEvent({ ctrlKey: true, key: 'Enter' }))).toBe(true);
  });

  it('Enter → false', () => {
    expect(isSendNowKey(makeEvent({ key: 'Enter' }))).toBe(false);
  });

  it('Shift+Enter → false (newline)', () => {
    expect(isSendNowKey(makeEvent({ shiftKey: true, key: 'Enter' }))).toBe(false);
  });

  it('Ctrl+Shift+Enter → false', () => {
    expect(isSendNowKey(makeEvent({ ctrlKey: true, shiftKey: true, key: 'Enter' }))).toBe(false);
  });

  it('Cmd+Enter → false', () => {
    expect(isSendNowKey(makeEvent({ metaKey: true, key: 'Enter' }))).toBe(false);
  });

  it('keyup → false', () => {
    expect(isSendNowKey(makeEvent({ ctrlKey: true, key: 'Enter', type: 'keyup' }))).toBe(false);
  });

  it('sends kitty CSI u for Ctrl+Enter', () => {
    expect(SEND_NOW_SEQUENCE).toBe('\x1b[13;5u');
  });
});
