import './styles/main.css';
import '@xterm/xterm/css/xterm.css';
import { BaseScreen } from './BaseScreen';
import { TerminalPane } from './TerminalPane';
import { TerminalGrid } from './TerminalGrid';
import { KeyboardHandler } from './KeyboardHandler';
import { RateLimitBar } from './RateLimitBar';
import type { HostToWebviewMessage, WebviewToHostMessage } from '../src/protocol/messages';

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();
const app = document.getElementById('app')!;

// ターミナルコンテナ
const terminalContainer = document.createElement('div');
terminalContainer.id = 'terminal-container';
terminalContainer.className = 'terminal-container';
app.appendChild(terminalContainer);

function openFolder(): void {
  vscode.postMessage({ type: 'requestFolderPicker' });
}

const baseScreen = new BaseScreen(app, openFolder);
const panes = new Map<string, TerminalPane>();
const grid = new TerminalGrid(terminalContainer);
const rateLimitBar = new RateLimitBar(app, openFolder);

let focusedPaneId: string | null = null;

function postMessage(msg: WebviewToHostMessage): void {
  vscode.postMessage(msg);
}

function focusPane(id: string): void {
  if (focusedPaneId && focusedPaneId !== id) {
    panes.get(focusedPaneId)?.blur();
  }
  panes.get(id)?.focus();
  focusedPaneId = id;
}

function updateView(): void {
  if (panes.size === 0) {
    baseScreen.show();
    terminalContainer.style.display = 'none';
  } else {
    baseScreen.hide();
    terminalContainer.style.display = 'grid';
    // グリッド変更後にリサイズ
    requestAnimationFrame(() => {
      for (const p of panes.values()) {
        p.fit();
      }
    });
  }
}

// グリッド方向ナビゲーション
function focusDirection(direction: 'up' | 'down' | 'left' | 'right'): void {
  if (!focusedPaneId) return;

  const ids = Array.from(panes.keys());
  const currentIndex = ids.indexOf(focusedPaneId);
  if (currentIndex === -1) return;

  const count = ids.length;
  const cols = Math.ceil(Math.sqrt(count));
  const col = currentIndex % cols;

  let targetIndex = currentIndex;
  switch (direction) {
    case 'left':
      targetIndex = col > 0 ? currentIndex - 1 : currentIndex;
      break;
    case 'right':
      targetIndex = currentIndex + 1 < count ? currentIndex + 1 : currentIndex;
      break;
    case 'up':
      targetIndex = currentIndex - cols >= 0 ? currentIndex - cols : currentIndex;
      break;
    case 'down':
      targetIndex = currentIndex + cols < count ? currentIndex + cols : currentIndex;
      break;
  }

  if (targetIndex !== currentIndex && ids[targetIndex]) {
    focusPane(ids[targetIndex]);
  }
}

function closeFocusedPane(): void {
  if (focusedPaneId) {
    postMessage({ type: 'closeTerminal', terminalId: focusedPaneId });
  }
}

function openVscodeTerminalForFocused(): void {
  if (focusedPaneId) {
    const pane = panes.get(focusedPaneId);
    if (pane) {
      postMessage({ type: 'openVscodeTerminal', directory: pane.directory });
    }
  }
}

const keyboardHandler = new KeyboardHandler({
  postMessage: (msg) => postMessage(msg as WebviewToHostMessage),
  focusDirection,
  closeFocused: closeFocusedPane,
  openVscodeTerminal: openVscodeTerminalForFocused,
});

const keyHandler = keyboardHandler.getKeyHandler();

// Extension Host からのメッセージ受信
window.addEventListener('message', (event: MessageEvent<HostToWebviewMessage>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'terminalCreated': {
      const pane = new TerminalPane(
        msg.terminalId,
        msg.directory,
        terminalContainer,
        postMessage,
        (id) => focusPane(id),
        keyHandler
      );
      panes.set(msg.terminalId, pane);
      focusPane(msg.terminalId);
      grid.update(panes.size);
      updateView();
      break;
    }
    case 'terminalOutput': {
      panes.get(msg.terminalId)?.write(msg.data);
      break;
    }
    case 'terminalClosed': {
      const pane = panes.get(msg.terminalId);
      if (pane) {
        pane.destroy();
        panes.delete(msg.terminalId);
        if (focusedPaneId === msg.terminalId) {
          // 残りのペインの最初のものにフォーカス
          const first = panes.keys().next().value;
          if (first) {
            focusPane(first);
          } else {
            focusedPaneId = null;
          }
        }
        grid.update(panes.size);
        updateView();
        // 残りのペインをリサイズ
        for (const p of panes.values()) {
          p.fit();
        }
      }
      break;
    }
    case 'rateLimitUpdate': {
      rateLimitBar.update({
        fiveHour: msg.fiveHour,
        sevenDay: msg.sevenDay,
        sevenDaySonnet: msg.sevenDaySonnet,
      });
      break;
    }
    case 'focusDirection': {
      focusDirection(msg.direction);
      break;
    }
    case 'closeActiveTerminal': {
      closeFocusedPane();
      break;
    }
    case 'openActiveInVscodeTerminal': {
      openVscodeTerminalForFocused();
      break;
    }
  }
});

// documentレベルでショートカットキーをキャプチャ（フォールバック）
// VSCodeのkeybindingシステムが主だが、webviewに直接届く場合のバックアップ
document.addEventListener('keydown', (e: KeyboardEvent) => {
  const mod = e.metaKey || e.ctrlKey; // macOS: Cmd, Win/Linux: Ctrl

  // Shift+Enter: Claude CLIで改行（LF送信）
  if (e.key === 'Enter' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    e.stopPropagation();
    if (focusedPaneId) {
      postMessage({ type: 'terminalInput', terminalId: focusedPaneId, data: '\n' });
    }
    return;
  }

  // Cmd+Arrow（Shiftなし）: カーソル移動（行頭/行末）
  if (e.metaKey && !e.shiftKey && !e.ctrlKey) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      if (focusedPaneId) {
        postMessage({ type: 'terminalInput', terminalId: focusedPaneId, data: '\x1bOH' });
      }
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      if (focusedPaneId) {
        postMessage({ type: 'terminalInput', terminalId: focusedPaneId, data: '\x1bOF' });
      }
      return;
    }
  }

  // Ctrl+Up/Down: 通常のターミナル動作（履歴スクロール等）
  if (e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (focusedPaneId) {
        postMessage({ type: 'terminalInput', terminalId: focusedPaneId, data: '\x1b[1;5A' });
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (focusedPaneId) {
        postMessage({ type: 'terminalInput', terminalId: focusedPaneId, data: '\x1b[1;5B' });
      }
      return;
    }
  }

  // Option+Arrow: 単語単位カーソル移動
  if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      if (focusedPaneId) {
        postMessage({ type: 'terminalInput', terminalId: focusedPaneId, data: '\x1bb' });
      }
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      if (focusedPaneId) {
        postMessage({ type: 'terminalInput', terminalId: focusedPaneId, data: '\x1bf' });
      }
      return;
    }
  }

  // Mod+Shift+Arrow: ペイン間移動
  if (mod && e.shiftKey) {
    const dirMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    };
    const dir = dirMap[e.key];
    if (dir) {
      e.preventDefault();
      e.stopPropagation();
      focusDirection(dir);
      return;
    }
  }

  // Mod+W: フォーカス中のペインを閉じる
  if (mod && e.key === 'w' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    closeFocusedPane();
    return;
  }

  // Mod+T: VSCodeターミナルで開く
  if (mod && e.key === 't' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    openVscodeTerminalForFocused();
    return;
  }

  // Mod+N: 新規ターミナル
  if (mod && e.key === 'n' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    postMessage({ type: 'requestFolderPicker' });
    return;
  }
}, true); // capture phase

// VSCode Explorer D&D（text/uri-list経由）
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  const uriList = e.dataTransfer?.getData('text/uri-list');
  if (uriList) {
    const uri = uriList.split('\n')[0].trim();
    if (uri) {
      postMessage({ type: 'dropUri', uri });
    }
  }
});

// ready 通知
postMessage({ type: 'ready' });
updateView();
