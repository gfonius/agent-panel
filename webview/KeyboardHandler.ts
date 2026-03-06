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
        if (this.mod(e) && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return false;
        if (this.mod(e) && !e.shiftKey && e.key === 'Backspace') return false;
        if (e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return false;
        if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return false;
        // Mod+1-9: ペイン番号ジャンプ（xterm.jsブロック）
        if (this.mod(e) && !e.shiftKey && !e.altKey) {
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= 9) return false;
        }
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

      // Mod+W: フォーカス中のペインを閉じる
      if (this.mod(e) && e.key === 'w' && !e.shiftKey && e.type === 'keydown') {
        this.closeFocused();
        return false;
      }

      // Mod+T: VSCodeターミナルで開く
      if (this.mod(e) && e.key === 't' && !e.shiftKey && e.type === 'keydown') {
        this.openVscodeTerminal();
        return false;
      }

      // Mod+F: Finder/エクスプローラーで開く
      if (this.mod(e) && e.key === 'f' && !e.shiftKey && e.type === 'keydown') {
        this.openExplorer();
        return false;
      }

      // Mod+N: 新規ターミナル（フォルダーピッカー）
      if (this.mod(e) && e.key === 'n' && !e.shiftKey && e.type === 'keydown') {
        this.postMessage({ type: 'requestFolderPicker' });
        return false;
      }

      // その他のキーはxterm.jsに渡す
      return true;
    };
  }
}
