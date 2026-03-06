import * as vscode from 'vscode';
import * as path from 'path';
import {
  COMMAND_OPEN,
  COMMAND_NEW_TERMINAL,
  COMMAND_FOCUS_UP,
  COMMAND_FOCUS_DOWN,
  COMMAND_FOCUS_LEFT,
  COMMAND_FOCUS_RIGHT,
  COMMAND_CLOSE_TERMINAL,
  COMMAND_OPEN_VSCODE_TERMINAL,
  COMMAND_OPEN_EXPLORER,
  COMMAND_DELETE_WORD_BACK,
  COMMAND_TOGGLE_MAXIMIZE,
  RATE_LIMIT_CACHE_TTL,
} from './constants';
import { StatusBarManager } from './managers/StatusBarManager';
import { PanelManager } from './managers/PanelManager';
import { TerminalManager } from './managers/TerminalManager';
import { SessionManager } from './managers/SessionManager';
import { fetchRateLimitInfo } from './utils/rateLimitClient';
import { RecentDirectoriesManager } from './managers/RecentDirectoriesManager';
import { showDirectoryPicker } from './utils/directoryPicker';
import type { WebviewToHostMessage } from './protocol/messages';

export function activate(context: vscode.ExtensionContext) {
  const statusBar = new StatusBarManager();
  const sessionManager = new SessionManager(context);
  const recentDirs = new RecentDirectoriesManager(context);
  const customNames = new Map<string, string>();

  let terminalManager: TerminalManager | undefined;
  let rateLimitInterval: NodeJS.Timeout | undefined;

  function setupTerminalManager(): TerminalManager {
    if (terminalManager) {
      return terminalManager;
    }

    terminalManager = new TerminalManager(
      // onData: pty 出力を Webview に転送
      (terminalId, data) => {
        panelManager.postMessage({
          type: 'terminalOutput',
          terminalId,
          data,
        });
      },
      // onExit: ターミナル終了を Webview に通知
      (terminalId) => {
        panelManager.postMessage({
          type: 'terminalClosed',
          terminalId,
        });
        statusBar.updateBadge(terminalManager?.count ?? 0);
      }
    );

    return terminalManager;
  }

  function createTerminal(directory: string): void {
    try {
      const tm = setupTerminalManager();
      const terminalId = tm.create(directory);
      recentDirs.add(directory);
      panelManager.postMessage({
        type: 'terminalCreated',
        terminalId,
        directory,
      });
      statusBar.updateBadge(tm.count);
    } catch (err) {
      vscode.window.showErrorMessage(
        `ターミナルの作成に失敗しました: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async function updateRateLimit(): Promise<void> {
    const info = await fetchRateLimitInfo();
    if (info) {
      panelManager.postMessage({
        type: 'rateLimitUpdate',
        fiveHour: info.fiveHour,
        sevenDay: info.sevenDay,
        sevenDaySonnet: info.sevenDaySonnet,
      });
    }
  }

  async function handleWebviewMessage(msg: WebviewToHostMessage): Promise<void> {
    switch (msg.type) {
      case 'ready':
        // ロケールを送信
        panelManager.postMessage({ type: 'setLocale', locale: vscode.env.language });
        // バックグラウンドで動いてるターミナルがあれば再接続
        if (terminalManager && terminalManager.count > 0) {
          const terminals = terminalManager.getAllTerminals();
          for (const t of terminals) {
            panelManager.postMessage({
              type: 'terminalCreated',
              terminalId: t.id,
              directory: t.directory,
              customName: customNames.get(t.id),
            });
          }
          statusBar.updateBadge(terminalManager.count);
        }
        break;
      case 'terminalInput':
        terminalManager?.write(msg.terminalId, msg.data);
        break;
      case 'terminalResize':
        terminalManager?.resize(msg.terminalId, msg.cols, msg.rows);
        break;
      case 'requestNewTerminal':
        createTerminal(msg.directory);
        break;
      case 'closeTerminal':
        terminalManager?.close(msg.terminalId);
        customNames.delete(msg.terminalId);
        statusBar.updateBadge(terminalManager?.count ?? 0);
        break;
      case 'paneRenamed': {
        if (msg.customName) {
          customNames.set(msg.terminalId, msg.customName);
        } else {
          customNames.delete(msg.terminalId);
        }
        break;
      }
      case 'requestFolderPicker': {
        const dir = await showDirectoryPicker(recentDirs.getAll());
        if (dir) {
          panelManager.reveal();
          createTerminal(dir);
        }
        break;
      }
      case 'openVscodeTerminal': {
        const terminal = vscode.window.createTerminal({
          cwd: msg.directory,
          name: `Agent Panel: ${msg.directory.split('/').pop()}`,
        });
        terminal.show();
        break;
      }
      case 'openExplorer': {
        vscode.env.openExternal(vscode.Uri.file(msg.directory));
        break;
      }
      case 'requestRateLimit':
        updateRateLimit();
        break;
      case 'openFile': {
        const resolved = path.isAbsolute(msg.filePath)
          ? msg.filePath
          : path.resolve(msg.directory, msg.filePath);
        const fileUri = vscode.Uri.file(resolved);
        const options: vscode.TextDocumentShowOptions = { preview: true };
        if (msg.line !== undefined) {
          const line = Math.max(0, msg.line - 1);
          const col = msg.column ? Math.max(0, msg.column - 1) : 0;
          options.selection = new vscode.Range(line, col, line, col);
        }
        vscode.window.showTextDocument(fileUri, options).then(undefined, () => {
          vscode.window.showWarningMessage(`ファイルを開けません: ${resolved}`);
        });
        break;
      }
      case 'openUrl': {
        vscode.env.openExternal(vscode.Uri.parse(msg.url));
        break;
      }
      case 'requestQuit': {
        // ターミナルなし → パネルだけ閉じる
        if (!terminalManager || terminalManager.count === 0) {
          panelManager.getPanel()?.dispose();
          break;
        }
        // オーバーレイ表示指示
        panelManager.postMessage({ type: 'quitting' });
        // graceful shutdown
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'セッションを保存中...' },
          async () => {
            const results = await terminalManager!.gracefulDisposeAll();
            const sessions = results.map((r) => ({
              id: crypto.randomUUID(),
              directory: r.directory,
              resumeId: r.resumeId,
              gridPosition: r.gridPosition,
              customName: customNames.get(r.terminalId),
            }));
            sessionManager.save(sessions);
            statusBar.updateBadge(0);
            terminalManager = undefined;
            panelManager.getPanel()?.dispose();
          }
        );
        break;
      }
    }
  }

  const panelManager = new PanelManager(
    context.extensionUri,
    () => {
      // パネルが閉じられた時
      // レート制限ポーリング停止
      if (rateLimitInterval) {
        clearInterval(rateLimitInterval);
        rateLimitInterval = undefined;
      }
      // ptyはkillしない（バックグラウンドで維持）
      // terminalManager は保持したまま
      // バッジはバックグラウンドターミナル数を表示し続ける（statusBar.updateBadge(0)は呼ばない）
    },
    (msg: unknown) => handleWebviewMessage(msg as WebviewToHostMessage)
  );

  const openCommand = vscode.commands.registerCommand(COMMAND_OPEN, async () => {
    panelManager.reveal();

    // レート制限ポーリング開始
    if (!rateLimitInterval) {
      updateRateLimit(); // 初回即時取得
      rateLimitInterval = setInterval(updateRateLimit, RATE_LIMIT_CACHE_TTL);
    }

    // 保存セッションがあり、かつ現在ターミナルが起動していない場合のみ復元確認
    if (sessionManager.hasSavedSessions() && (!terminalManager || terminalManager.count === 0)) {
      const choice = await vscode.window.showInformationMessage(
        '前回のセッションを復元しますか？',
        '復元する',
        '新規開始'
      );

      if (choice === '復元する') {
        const sessions = sessionManager.load();
        const tm = setupTerminalManager();
        for (const session of sessions) {
          const terminalId = tm.create(session.directory, session.resumeId);
          recentDirs.add(session.directory);
          panelManager.postMessage({
            type: 'terminalCreated',
            terminalId,
            directory: session.directory,
            customName: session.customName,
          });
        }
        statusBar.updateBadge(tm.count);
        sessionManager.clear();
      } else {
        sessionManager.clear();
      }
    }
  });

  const newTerminalCommand = vscode.commands.registerCommand(
    COMMAND_NEW_TERMINAL,
    async () => {
      const dir = await showDirectoryPicker(recentDirs.getAll());
      if (dir) {
        panelManager.reveal();
        createTerminal(dir);
      }
    }
  );

  // 方向ナビゲーションコマンド（WebviewにpostMessageで指示を送る）
  const focusUpCmd = vscode.commands.registerCommand(COMMAND_FOCUS_UP, () => {
    panelManager.postMessage({ type: 'focusDirection', direction: 'up' });
  });
  const focusDownCmd = vscode.commands.registerCommand(COMMAND_FOCUS_DOWN, () => {
    panelManager.postMessage({ type: 'focusDirection', direction: 'down' });
  });
  const focusLeftCmd = vscode.commands.registerCommand(COMMAND_FOCUS_LEFT, () => {
    panelManager.postMessage({ type: 'focusDirection', direction: 'left' });
  });
  const focusRightCmd = vscode.commands.registerCommand(COMMAND_FOCUS_RIGHT, () => {
    panelManager.postMessage({ type: 'focusDirection', direction: 'right' });
  });
  const closeTermCmd = vscode.commands.registerCommand(COMMAND_CLOSE_TERMINAL, () => {
    panelManager.postMessage({ type: 'closeActiveTerminal' });
  });
  const openVscTermCmd = vscode.commands.registerCommand(COMMAND_OPEN_VSCODE_TERMINAL, () => {
    panelManager.postMessage({ type: 'openActiveInVscodeTerminal' });
  });
  const openExplorerCmd = vscode.commands.registerCommand(COMMAND_OPEN_EXPLORER, () => {
    panelManager.postMessage({ type: 'openActiveInExplorer' });
  });
  const deleteWordBackCmd = vscode.commands.registerCommand(COMMAND_DELETE_WORD_BACK, () => {
    panelManager.postMessage({ type: 'deleteWordBack' });
  });
  const toggleMaximizeCmd = vscode.commands.registerCommand(COMMAND_TOGGLE_MAXIMIZE, () => {
    panelManager.postMessage({ type: 'toggleMaximize' });
  });

  // ペイン番号ジャンプコマンド（1〜9）
  const focusPaneCmds: vscode.Disposable[] = [];
  for (let i = 1; i <= 9; i++) {
    const cmd = vscode.commands.registerCommand(`agentPanel.focusPane${i}`, () => {
      panelManager.postMessage({ type: 'focusPaneByIndex', index: i - 1 });
    });
    focusPaneCmds.push(cmd);
  }

  // 初回起動時：履歴が空ならセッションデータからシード
  if (recentDirs.getAll().length === 0) {
    const sessions = sessionManager.load();
    for (const session of sessions) {
      recentDirs.add(session.directory);
    }
  }

  context.subscriptions.push(
    openCommand, newTerminalCommand,
    focusUpCmd, focusDownCmd, focusLeftCmd, focusRightCmd,
    closeTermCmd, openVscTermCmd, openExplorerCmd, deleteWordBackCmd, toggleMaximizeCmd,
    ...focusPaneCmds,
    {
      dispose: () => {
        if (rateLimitInterval) {
          clearInterval(rateLimitInterval);
          rateLimitInterval = undefined;
        }
        statusBar.dispose();
        terminalManager?.disposeAll();
      },
    }
  );
}

export function deactivate() {}
