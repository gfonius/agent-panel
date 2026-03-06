import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import type { WebviewToHostMessage } from '../src/protocol/messages';
import { createFilePathLinkProvider, createUrlLinkProvider } from './linkProvider';

export class TerminalPane {
  readonly id: string;
  readonly directory: string;
  private terminal: Terminal;
  private fitAddon: FitAddon;
  readonly element: HTMLElement;
  private postMessage: (msg: WebviewToHostMessage) => void;
  private focused: boolean = false;
  private onMaximizeToggle?: (id: string) => void;
  private badgeElement: HTMLElement;
  private titleElement: HTMLElement;
  private customName?: string;
  private isRenaming = false;

  constructor(
    id: string,
    directory: string,
    container: HTMLElement,
    postMessage: (msg: WebviewToHostMessage) => void,
    onFocus?: (id: string) => void,
    keyHandler?: (e: KeyboardEvent) => boolean,
    onMaximizeToggle?: (id: string) => void,
    customName?: string
  ) {
    this.id = id;
    this.directory = directory;
    this.postMessage = postMessage;
    this.onMaximizeToggle = onMaximizeToggle;
    this.customName = customName;

    this.element = document.createElement('div');
    this.element.className = 'terminal-pane';
    this.element.dataset.terminalId = id;

    // ヘッダー（ディレクトリ名表示 + 閉じるボタン）
    const header = document.createElement('div');
    header.className = 'terminal-pane__header';

    this.badgeElement = document.createElement('span');
    this.badgeElement.className = 'terminal-pane__badge';
    this.badgeElement.textContent = '';

    this.titleElement = document.createElement('span');
    this.titleElement.className = 'terminal-pane__title';
    this.titleElement.textContent = customName || directory.split('/').pop() || directory;
    this.titleElement.title = customName
      ? `${directory} (${customName})`
      : directory;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'terminal-pane__close';
    closeBtn.textContent = '×';
    closeBtn.title = 'Close terminal';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.postMessage({ type: 'closeTerminal', terminalId: this.id });
    });

    // ドラッグ&ドロップ: ヘッダーをドラッグハンドルにする
    header.draggable = true;

    header.addEventListener('dragstart', (e: DragEvent) => {
      e.dataTransfer!.setData('text/x-pane-id', this.id);
      e.dataTransfer!.effectAllowed = 'move';
      this.element.classList.add('terminal-pane--dragging');
    });

    header.addEventListener('dragend', () => {
      this.element.classList.remove('terminal-pane--dragging');
    });

    // ヘッダー自体（バッジ・タイトル以外）のダブルクリックで最大化/復元
    header.addEventListener('dblclick', (e) => {
      if (e.target === header || e.target === this.badgeElement) {
        e.preventDefault();
        e.stopPropagation();
        this.onMaximizeToggle?.(this.id);
      }
    });

    // タイトルのダブルクリックでリネーム
    this.titleElement.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.startRename();
    });

    header.appendChild(this.badgeElement);
    header.appendChild(this.titleElement);
    header.appendChild(closeBtn);
    this.element.appendChild(header);

    // ターミナルコンテナ
    const termContainer = document.createElement('div');
    termContainer.className = 'terminal-pane__body';
    this.element.appendChild(termContainer);

    container.appendChild(this.element);

    // xterm.js 初期化
    this.terminal = new Terminal({
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      theme: getXtermTheme(),
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    this.terminal.open(termContainer);

    // WebGL addon (with fallback)
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      this.terminal.loadAddon(webglAddon);
    } catch {
      // canvas renderer にフォールバック
    }

    // ファイルパス・URLのリンクプロバイダー登録（Cmd/Ctrl+Click で開く）
    this.terminal.registerLinkProvider(
      createFilePathLinkProvider(this.terminal, this.directory, postMessage)
    );
    this.terminal.registerLinkProvider(
      createUrlLinkProvider(this.terminal, postMessage)
    );

    // カスタムキーイベントハンドラを登録
    if (keyHandler) {
      this.terminal.attachCustomKeyEventHandler(keyHandler);
    }

    // フィット
    requestAnimationFrame(() => {
      this.fitAddon.fit();
      this.postMessage({
        type: 'terminalResize',
        terminalId: this.id,
        cols: this.terminal.cols,
        rows: this.terminal.rows,
      });
    });

    // ユーザー入力を Extension Host に転送
    this.terminal.onData((data: string) => {
      this.postMessage({
        type: 'terminalInput',
        terminalId: this.id,
        data,
      });
    });

    // フォーカスハンドリング
    this.element.addEventListener('click', () => {
      this.focus();
      onFocus?.(this.id);
    });

    // ResizeObserver で自動フィット
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.fitAddon.fit();
        this.postMessage({
          type: 'terminalResize',
          terminalId: this.id,
          cols: this.terminal.cols,
          rows: this.terminal.rows,
        });
      });
    });
    resizeObserver.observe(termContainer);
  }

  write(data: string): void {
    this.terminal.write(data);
  }

  focus(): void {
    this.focused = true;
    this.terminal.focus();
    this.element.classList.add('terminal-pane--focused');
  }

  blur(): void {
    this.focused = false;
    this.element.classList.remove('terminal-pane--focused');
  }

  isFocused(): boolean {
    return this.focused;
  }

  fit(): void {
    this.fitAddon.fit();
  }

  destroy(): void {
    this.terminal.dispose();
    this.element.remove();
  }

  updatePaneNumber(num: number): void {
    this.badgeElement.textContent = String(num);
  }

  getCustomName(): string | undefined {
    return this.customName;
  }

  private startRename(): void {
    if (this.isRenaming) return;
    this.isRenaming = true;
    const header = this.titleElement.parentElement!;
    header.draggable = false;

    const input = document.createElement('input');
    input.className = 'terminal-pane__rename-input';
    input.value = this.customName || this.titleElement.textContent || '';
    input.select();

    this.titleElement.style.display = 'none';
    this.titleElement.insertAdjacentElement('afterend', input);
    input.focus();

    const commit = () => {
      if (!this.isRenaming) return;
      this.isRenaming = false;
      const newName = input.value.trim();
      if (newName) {
        this.customName = newName;
        this.titleElement.textContent = newName;
        this.titleElement.title = `${this.directory} (${newName})`;
      } else {
        this.customName = undefined;
        this.titleElement.textContent = this.directory.split('/').pop() || this.directory;
        this.titleElement.title = this.directory;
      }
      input.remove();
      this.titleElement.style.display = '';
      header.draggable = true;
      this.postMessage({ type: 'paneRenamed', terminalId: this.id, customName: this.customName || '' });
    };

    const cancel = () => {
      if (!this.isRenaming) return;
      this.isRenaming = false;
      input.remove();
      this.titleElement.style.display = '';
      header.draggable = true;
    };

    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') { ev.preventDefault(); commit(); }
      if (ev.key === 'Escape') { ev.preventDefault(); cancel(); }
    });
    input.addEventListener('blur', commit);
  }
}

function getXtermTheme() {
  const style = getComputedStyle(document.documentElement);
  return {
    background:
      style.getPropertyValue('--vscode-terminal-background').trim() ||
      style.getPropertyValue('--vscode-editor-background').trim() ||
      '#1e1e1e',
    foreground:
      style.getPropertyValue('--vscode-terminal-foreground').trim() ||
      style.getPropertyValue('--vscode-editor-foreground').trim() ||
      '#cccccc',
    cursor:
      style.getPropertyValue('--vscode-terminalCursor-foreground').trim() ||
      '#ffffff',
    cursorAccent:
      style.getPropertyValue('--vscode-terminalCursor-background').trim() ||
      '#000000',
    selectionBackground:
      style.getPropertyValue('--vscode-terminal-selectionBackground').trim() ||
      '#264f78',
    // ANSI カラー
    black:
      style.getPropertyValue('--vscode-terminal-ansiBlack').trim() ||
      '#000000',
    red:
      style.getPropertyValue('--vscode-terminal-ansiRed').trim() || '#cd3131',
    green:
      style.getPropertyValue('--vscode-terminal-ansiGreen').trim() ||
      '#0dbc79',
    yellow:
      style.getPropertyValue('--vscode-terminal-ansiYellow').trim() ||
      '#e5e510',
    blue:
      style.getPropertyValue('--vscode-terminal-ansiBlue').trim() || '#2472c8',
    magenta:
      style.getPropertyValue('--vscode-terminal-ansiMagenta').trim() ||
      '#bc3fbc',
    cyan:
      style.getPropertyValue('--vscode-terminal-ansiCyan').trim() || '#11a8cd',
    white:
      style.getPropertyValue('--vscode-terminal-ansiWhite').trim() || '#e5e5e5',
    brightBlack:
      style.getPropertyValue('--vscode-terminal-ansiBrightBlack').trim() ||
      '#666666',
    brightRed:
      style.getPropertyValue('--vscode-terminal-ansiBrightRed').trim() ||
      '#f14c4c',
    brightGreen:
      style.getPropertyValue('--vscode-terminal-ansiBrightGreen').trim() ||
      '#23d18b',
    brightYellow:
      style.getPropertyValue('--vscode-terminal-ansiBrightYellow').trim() ||
      '#f5f543',
    brightBlue:
      style.getPropertyValue('--vscode-terminal-ansiBrightBlue').trim() ||
      '#3b8eea',
    brightMagenta:
      style.getPropertyValue('--vscode-terminal-ansiBrightMagenta').trim() ||
      '#d670d6',
    brightCyan:
      style.getPropertyValue('--vscode-terminal-ansiBrightCyan').trim() ||
      '#29b8db',
    brightWhite:
      style.getPropertyValue('--vscode-terminal-ansiBrightWhite').trim() ||
      '#e5e5e5',
  };
}
