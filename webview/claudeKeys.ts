/**
 * Claude Code の send now (実行中のターンに割り込んでキューを即送信) を表す Ctrl+Enter。
 * xterm.js は Ctrl+Enter を素の CR で送るため Enter と区別できない。
 * kitty keyboard protocol (CSI u) の形で送ると Claude Code は Ctrl+Enter として解釈する。
 */
export const SEND_NOW_SEQUENCE = '\x1b[13;5u';

export function isSendNowKey(e: KeyboardEvent): boolean {
  return e.type === 'keydown'
    && e.key === 'Enter'
    && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
}
