import { isSendNowKey } from './claudeKeys';
import { isPanelActionKey } from './panelKeys';

export class KeyboardHandler {
  private postMessage: (msg: unknown) => void;
  private focusDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  private closeFocused: () => void;
  private openVscodeTerminal: () => void;
  private openExplorer: () => void;
  private isMac: boolean;

  constructor(options: {
    postMessage: (msg: unknown) => void;
    focusDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
    closeFocused: () => void;
    openVscodeTerminal: () => void;
    openExplorer: () => void;
    isMac: boolean;
  }) {
    this.postMessage = options.postMessage;
    this.focusDirection = options.focusDirection;
    this.closeFocused = options.closeFocused;
    this.openVscodeTerminal = options.openVscodeTerminal;
    this.openExplorer = options.openExplorer;
    this.isMac = options.isMac;
  }

  /** Check if the platform's primary modifier key is pressed */
  private mod(e: KeyboardEvent): boolean {
    return this.isMac ? e.metaKey : e.ctrlKey;
  }

  // xterm.js の attachCustomKeyEventHandler に渡す関数を返す
  getKeyHandler(): (e: KeyboardEvent) => boolean {
    return (e: KeyboardEvent): boolean => {
      // Shift+Enter, Mod+Arrow, Alt/Option+Arrow はdocument captureリスナーで処理
      // xterm.jsのデフォルト処理を防ぐためfalseを返す
      if (e.type === 'keydown') {
        if (e.key === 'Enter' && e.shiftKey && !e.metaKey && !e.ctrlKey) return false;
        if (isSendNowKey(e)) return false;
        // ⌘+←/→ は行頭/行末 (macOS のみ。Windows の Ctrl+←/→ は単語移動としてそのまま渡す)
        if (this.isMac && this.mod(e) && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return false;
        if (this.mod(e) && !e.shiftKey && e.key === 'Backspace') return false;
        if (e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return false;
        if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return false;
        // Mod+1-9: ペイン番号ジャンプ（xterm.jsブロック）
        if (this.mod(e) && !e.shiftKey && !e.altKey) {
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= 9) return false;
        }
        // Mod+=/+/-/0: フォントサイズ変更（xterm.jsブロック）
        if (this.mod(e) && !e.shiftKey && !e.altKey && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '0')) return false;
      }

      // Mod+Shift+Arrow: ペイン間移動
      if (this.mod(e) && e.shiftKey && e.type === 'keydown') {
        switch (e.key) {
          case 'ArrowUp':
            this.focusDirection('up');
            return false;
          case 'ArrowDown':
            this.focusDirection('down');
            return false;
          case 'ArrowLeft':
            this.focusDirection('left');
            return false;
          case 'ArrowRight':
            this.focusDirection('right');
            return false;
        }
      }

      // ⌘W / Ctrl+Shift+W: フォーカス中のペインを閉じる
      if (isPanelActionKey(e, this.isMac, 'w')) {
        this.closeFocused();
        return false;
      }

      // ⌘T / Ctrl+Shift+T: VSCodeターミナルで開く
      if (isPanelActionKey(e, this.isMac, 't')) {
        this.openVscodeTerminal();
        return false;
      }

      // ⌘F / Ctrl+Shift+F: Finder/エクスプローラーで開く
      if (isPanelActionKey(e, this.isMac, 'f')) {
        this.openExplorer();
        return false;
      }

      // ⌘N / Ctrl+Shift+N: 新規ターミナル（フォルダーピッカー）
      if (isPanelActionKey(e, this.isMac, 'n')) {
        this.postMessage({ type: 'requestFolderPicker' });
        return false;
      }

      // その他のキーはxterm.jsに渡す
      return true;
    };
  }
}
