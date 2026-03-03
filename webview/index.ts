import './styles/main.css';
import '@xterm/xterm/css/xterm.css';
import { BaseScreen } from './BaseScreen';
import { TerminalPane } from './TerminalPane';
import { TerminalGrid } from './TerminalGrid';
import { KeyboardHandler } from './KeyboardHandler';
import { RateLimitBar } from './RateLimitBar';
import { ShortcutGuide } from './ShortcutGuide';
import { setLocale as setI18nLocale } from './i18n';
import { reorderPaneIds } from './paneOrderUtils';
import { extractFilePaths } from './fileDropUtils';
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
let paneOrder: string[] = []; // ペインの表示順序（挿入順に依存しない独立管理）
const grid = new TerminalGrid(terminalContainer);
const shortcutGuide = new ShortcutGuide(app);
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

  const ids = paneOrder;
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

function openExplorerForFocused(): void {
  if (focusedPaneId) {
    const pane = panes.get(focusedPaneId);
    if (pane) {
      postMessage({ type: 'openExplorer', directory: pane.directory });
    }
  }
}

const keyboardHandler = new KeyboardHandler({
  postMessage: (msg) => postMessage(msg as WebviewToHostMessage),
  focusDirection,
  closeFocused: closeFocusedPane,
  openVscodeTerminal: openVscodeTerminalForFocused,
  openExplorer: openExplorerForFocused,
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
      paneOrder.push(msg.terminalId);
      setupPaneDragDrop(pane);
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
        paneOrder = paneOrder.filter((id) => id !== msg.terminalId);
        if (focusedPaneId === msg.terminalId) {
          // 残りのペインの最初のものにフォーカス（paneOrder 順）
          const first = paneOrder[0];
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
    case 'openActiveInExplorer': {
      openExplorerForFocused();
      break;
    }
    case 'deleteWordBack': {
      if (focusedPaneId) {
        postMessage({ type: 'terminalInput', terminalId: focusedPaneId, data: '\x1b\x7f' });
      }
      break;
    }
    case 'setLocale': {
      setI18nLocale(msg.locale);
      baseScreen.updateLocale();
      shortcutGuide.updateLocale();
      rateLimitBar.updateLocale();
      break;
    }
  }
});

// documentレベルでショートカットキーをキャプチャ（フォールバック）
// VSCodeのkeybindingシステムが主だが、webviewに直接届く場合のバックアップ
document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Shift+Enter: Claude CLIで改行（LF送信）
  if (e.key === 'Enter' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    e.stopPropagation();
    if (focusedPaneId) {
      postMessage({ type: 'terminalInput', terminalId: focusedPaneId, data: '\n' });
    }
    return;
  }

  // Cmd+Backspace: 単語削除
  if (e.metaKey && !e.shiftKey && !e.ctrlKey && e.key === 'Backspace') {
    e.preventDefault();
    e.stopPropagation();
    if (focusedPaneId) {
      postMessage({ type: 'terminalInput', terminalId: focusedPaneId, data: '\x1b\x7f' });
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

  // Ctrl+Up/Down: エスケープシーケンス
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

  // Cmd+Shift+Arrow: ペイン間移動（macOSカスタムショートカット）
  if (e.metaKey && e.shiftKey) {
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

  // Cmd+W: フォーカス中のペインを閉じる（Ctrl+Wは上でターミナルに送信済み）
  if (e.metaKey && e.key === 'w' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    closeFocusedPane();
    return;
  }

  // Cmd+T: VSCodeターミナルで開く（Ctrl+Tは上でターミナルに送信済み）
  if (e.metaKey && e.key === 't' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    openVscodeTerminalForFocused();
    return;
  }

  // Cmd+F: Finder/エクスプローラーで開く
  if (e.metaKey && e.key === 'f' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    openExplorerForFocused();
    return;
  }

  // Cmd+N: 新規ターミナル（Ctrl+Nは上でターミナルに送信済み）
  if (e.metaKey && e.key === 'n' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    postMessage({ type: 'requestFolderPicker' });
    return;
  }
}, true); // capture phase

// ============================================================
// パネル D&D（ペイン間並べ替え）
// ============================================================

/** すべてのペインからドロップインジケータークラスを除去する */
function clearDropIndicators(): void {
  for (const p of panes.values()) {
    p.element.classList.remove('terminal-pane--drop-before', 'terminal-pane--drop-after', 'terminal-pane--file-drop-target');
  }
}

/** DOM 上のペイン順序を paneOrder に合わせて更新する */
function updateDomOrder(): void {
  for (const id of paneOrder) {
    const pane = panes.get(id);
    if (pane) {
      terminalContainer.appendChild(pane.element); // 既存要素の appendChild は移動
    }
  }
  requestAnimationFrame(() => {
    for (const p of panes.values()) {
      p.fit();
    }
  });
}

/** paneOrder を更新してから DOM に反映する */
function reorderPanes(draggedId: string, targetId: string, insertBefore: boolean): void {
  paneOrder = reorderPaneIds(paneOrder, draggedId, targetId, insertBefore);
  updateDomOrder();
}

/** 各ペインの要素に dragover / dragleave / drop リスナーを設定する */
function setupPaneDragDrop(pane: TerminalPane): void {
  const el = pane.element;

  el.addEventListener('dragover', (e: DragEvent) => {
    if (e.dataTransfer?.types.includes('text/x-pane-id')) {
      // ペインD&D
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = el.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      clearDropIndicators();
      if (e.clientX < midX) {
        el.classList.add('terminal-pane--drop-before');
      } else {
        el.classList.add('terminal-pane--drop-after');
      }
      return;
    }
    // ファイルD&D → ドロップ先ハイライト
    // types チェックなしで全ドラッグを受け入れ（VSCode内部のMIMEタイプが不定のため）
    if (!e.dataTransfer?.types.includes('text/x-pane-id')) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      el.classList.add('terminal-pane--file-drop-target');
    }
  });

  el.addEventListener('dragleave', (e: DragEvent) => {
    if (el.contains(e.relatedTarget as Node)) return;
    el.classList.remove('terminal-pane--drop-before', 'terminal-pane--drop-after', 'terminal-pane--file-drop-target');
  });

  el.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();

    // ペイン並べ替えD&D
    const draggedId = e.dataTransfer?.getData('text/x-pane-id');
    if (draggedId) {
      e.stopPropagation();
      if (draggedId === pane.id) { clearDropIndicators(); return; }
      const rect = el.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      reorderPanes(draggedId, pane.id, e.clientX < midX);
      clearDropIndicators();
      return;
    }

    // ファイルD&D → document handler に委譲（stopPropagation しない）
    el.classList.remove('terminal-pane--file-drop-target');
  });
}

// VSCode Explorer D&D — document レベルハンドラ
document.addEventListener('dragover', (e) => {
  if (e.dataTransfer?.types.includes('text/x-pane-id')) return;
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
});

document.addEventListener('drop', (e: DragEvent) => {
  e.preventDefault();
  if (e.dataTransfer?.types.includes('text/x-pane-id')) return;

  // 全ペインのファイルドロップハイライトをクリア
  for (const p of panes.values()) {
    p.element.classList.remove('terminal-pane--file-drop-target');
  }

  if (!e.dataTransfer) return;

  const paths = extractFilePaths(
    e.dataTransfer.getData('text/uri-list'),
    e.dataTransfer.getData('text/plain')
  );
  if (paths.length === 0) return;

  // ドロップ先ペインを特定: e.target の祖先 → focusedPane → 先頭ペイン
  const targetEl = (e.target as HTMLElement).closest?.('.terminal-pane') as HTMLElement | null;
  const dropPaneId = targetEl?.dataset?.terminalId ?? null;

  const targetId = (dropPaneId && panes.has(dropPaneId))
    ? dropPaneId
    : (focusedPaneId && panes.has(focusedPaneId))
      ? focusedPaneId
      : paneOrder[0] ?? null;

  if (targetId) {
    focusPane(targetId);
    postMessage({ type: 'terminalInput', terminalId: targetId, data: paths.join(' ') });
  }
});

// ready 通知
postMessage({ type: 'ready' });
updateView();
