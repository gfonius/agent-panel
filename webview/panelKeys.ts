/**
 * パネル操作 (新規/閉じる/VSCodeターミナル/エクスプローラー) のキー判定。
 * macOS は ⌘+キー、Windows/Linux は Ctrl+Shift+キー (新規ターミナルだけは isNewTerminalKey)。
 * Windows/Linux の Ctrl+W/T/F は Claude Code 側のキー (Ctrl+W 単語削除、Ctrl+T タスク一覧など)
 * なので奪わずにターミナルへ渡す。
 */
export function isPanelActionKey(e: KeyboardEvent, isMac: boolean, letter: string): boolean {
  if (e.type !== 'keydown' || e.altKey) return false;
  if (e.key.toLowerCase() !== letter) return false;
  return isMac
    ? e.metaKey && !e.shiftKey && !e.ctrlKey
    : e.ctrlKey && e.shiftKey && !e.metaKey;
}

/**
 * 新規ターミナルのキー判定。macOS は ⌘N、Windows/Linux は Ctrl+N (Shift なし)。
 * 新規はよく使うので Windows/Linux でも Shift なしにしている。
 */
export function isNewTerminalKey(e: KeyboardEvent, isMac: boolean): boolean {
  if (e.type !== 'keydown' || e.altKey || e.shiftKey) return false;
  if (e.key.toLowerCase() !== 'n') return false;
  return isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
}
