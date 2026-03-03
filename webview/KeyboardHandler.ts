export class KeyboardHandler {
  private postMessage: (msg: unknown) => void;
  private focusDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  private closeFocused: () => void;
  private openVscodeTerminal: () => void;
  private openExplorer: () => void;

  constructor(options: {
    postMessage: (msg: unknown) => void;
    focusDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
    closeFocused: () => void;
    openVscodeTerminal: () => void;
    openExplorer: () => void;
  }) {
    this.postMessage = options.postMessage;
    this.focusDirection = options.focusDirection;
    this.closeFocused = options.closeFocused;
    this.openVscodeTerminal = options.openVscodeTerminal;
    this.openExplorer = options.openExplorer;
  }

  // xterm.js の attachCustomKeyEventHandler に渡す関数を返す
  getKeyHandler(): (e: KeyboardEvent) => boolean {
    return (e: KeyboardEvent): boolean => {
      // Shift+Enter, Cmd+Arrow, Option+Arrow はdocument captureリスナーで処理
      // xterm.jsのデフォルト処理を防ぐためfalseを返す
      if (e.type === 'keydown') {
        if (e.key === 'Enter' && e.shiftKey && !e.metaKey && !e.ctrlKey) return false;
        if (e.metaKey && !e.shiftKey && !e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return false;
        if (e.metaKey && !e.shiftKey && !e.ctrlKey && e.key === 'Backspace') return false;
        if (e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return false;
        if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return false;
      }

      // Cmd+Shift+Arrow: ペイン間移動（macOSカスタムショートカット）
      if (e.metaKey && e.shiftKey && e.type === 'keydown') {
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

      // Cmd+W: フォーカス中のペインを閉じる（macOSカスタムショートカット）
      if (e.metaKey && e.key === 'w' && !e.shiftKey && e.type === 'keydown') {
        this.closeFocused();
        return false;
      }

      // Cmd+T: VSCodeターミナルで開く
      if (e.metaKey && e.key === 't' && !e.shiftKey && e.type === 'keydown') {
        this.openVscodeTerminal();
        return false;
      }

      // Cmd+F: Finder/エクスプローラーで開く
      if (e.metaKey && e.key === 'f' && !e.shiftKey && e.type === 'keydown') {
        this.openExplorer();
        return false;
      }

      // Cmd+N: 新規ターミナル（フォルダーピッカー）
      if (e.metaKey && e.key === 'n' && !e.shiftKey && e.type === 'keydown') {
        this.postMessage({ type: 'requestFolderPicker' });
        return false;
      }

      // その他のキーはxterm.jsに渡す
      return true;
    };
  }
}
