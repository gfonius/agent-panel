/** Windows で Ctrl+V を拡張側で横取りすべきかを判定する */
export function shouldInterceptPaste(e: KeyboardEvent, isWindows: boolean): boolean {
  return isWindows
    && e.type === 'keydown'
    && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey
    && (e.key === 'v' || e.key === 'V');
}

/**
 * Ctrl+V 横取り後、ブラウザ/VSCode 経由で遅れて届くネイティブ paste イベントを捨てる猶予(ms)。
 * VSCode は Webview 内の Ctrl+V をホストのキーバインドでも処理し、execCommand('paste') で
 * paste イベントを発火させるため、横取り分と合わせて 2 回貼られてしまう。
 */
export const NATIVE_PASTE_SUPPRESS_MS = 1000;

/** 横取りした Ctrl+V の直後に来たネイティブ paste イベントかどうか */
export function shouldSuppressNativePaste(now: number, suppressUntil: number): boolean {
  return now < suppressUntil;
}

/** Windows で選択中の Ctrl+C をコピーとして扱う(^C を pty へ送らない)べきかを判定する */
export function shouldCopySelection(e: KeyboardEvent, isWindows: boolean, hasSelection: boolean): boolean {
  return isWindows
    && hasSelection
    && e.type === 'keydown'
    && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey
    && (e.key === 'c' || e.key === 'C');
}
