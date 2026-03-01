export class KeyboardHandler {
  private postMessage: (msg: unknown) => void;
  private focusDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  private closeFocused: () => void;
  private openVscodeTerminal: () => void;

  constructor(options: {
    postMessage: (msg: unknown) => void;
    focusDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
    closeFocused: () => void;
    openVscodeTerminal: () => void;
  }) {
    this.postMessage = options.postMessage;
    this.focusDirection = options.focusDirection;
    this.closeFocused = options.closeFocused;
    this.openVscodeTerminal = options.openVscodeTerminal;
  }

  // xterm.js の attachCustomKeyEventHandler に渡す関数を返す
  getKeyHandler(): (e: KeyboardEvent) => boolean {
    return (e: KeyboardEvent): boolean => {
      const mod = e.metaKey || e.ctrlKey; // macOS: Cmd, Win/Linux: Ctrl

      // Mod+Shift+Arrow: ペイン間移動
      if (mod && e.shiftKey && e.type === 'keydown') {
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
      if (mod && e.key === 'w' && !e.shiftKey && e.type === 'keydown') {
        this.closeFocused();
        return false;
      }

      // Mod+T: VSCodeターミナルで開く
      if (mod && e.key === 't' && !e.shiftKey && e.type === 'keydown') {
        this.openVscodeTerminal();
        return false;
      }

      // Mod+N: 新規ターミナル（フォルダーピッカー）
      if (mod && e.key === 'n' && !e.shiftKey && e.type === 'keydown') {
        this.postMessage({ type: 'requestFolderPicker' });
        return false;
      }

      // その他のキーはxterm.jsに渡す
      return true;
    };
  }
}
