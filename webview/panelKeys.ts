/**
 * パネル操作 (新規/閉じる/VSCodeターミナル/エクスプローラー) のキー判定。
 * macOS は ⌘+キー、Windows/Linux は Ctrl+Shift+キー。
 * Windows/Linux の Ctrl+W/T/F/N は Claude Code 側のキー (Ctrl+W 単語削除、Ctrl+T タスク一覧など)
 * なので奪わずにターミナルへ渡す。
 */
export function isPanelActionKey(e: KeyboardEvent, isMac: boolean, letter: string): boolean {
  if (e.type !== 'keydown' || e.altKey) return false;
  if (e.key.toLowerCase() !== letter) return false;
  return isMac
    ? e.metaKey && !e.shiftKey && !e.ctrlKey
    : e.ctrlKey && e.shiftKey && !e.metaKey;
}
