/** Windows で Ctrl+V を拡張側で横取りすべきかを判定する */
export function shouldInterceptPaste(e: KeyboardEvent, isWindows: boolean): boolean {
  return isWindows
    && e.type === 'keydown'
    && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey
    && (e.key === 'v' || e.key === 'V');
}
