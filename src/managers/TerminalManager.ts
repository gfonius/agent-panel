import { getDefaultShell, getShellArgs } from '../utils/platform';
import { parseResumeId } from '../utils/sessionParser';

// node-ptyはネイティブモジュールのため遅延読み込み
// トップレベルimportだとElectronとのABI不一致で拡張が起動しない
function loadNodePty(): typeof import('node-pty') {
  return require('node-pty');
}

export interface TerminalProcess {
  id: string;
  pty: import('node-pty').IPty;
  directory: string;
}

export class TerminalManager {
  private terminals: Map<string, TerminalProcess> = new Map();
  private onData: (terminalId: string, data: string) => void;
  private onExit: (terminalId: string) => void;
  private suppressExitNotifications = false;

  constructor(
    onData: (terminalId: string, data: string) => void,
    onExit: (terminalId: string) => void
  ) {
    this.onData = onData;
    this.onExit = onExit;
  }

  create(directory: string, resumeId?: string): string {
    const id = crypto.randomUUID();
    const shell = getDefaultShell();
    const args = getShellArgs(shell);

    const pty = loadNodePty();
    const ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: directory,
      env: (() => {
        const env: Record<string, string> = { ...process.env as Record<string, string>, TERM: 'xterm-256color', COLORTERM: 'truecolor', TERM_PROGRAM: 'vscode' };
        delete env['CLAUDECODE'];
        return env;
      })(),
    });

    ptyProcess.onData((data: string) => {
      this.onData(id, data);
    });

    ptyProcess.onExit(() => {
      this.terminals.delete(id);
      if (!this.suppressExitNotifications) {
        this.onExit(id);
      }
    });

    this.terminals.set(id, { id, pty: ptyProcess, directory });

    // シェル起動後にclaudeを実行
    setTimeout(() => {
      if (resumeId) {
        ptyProcess.write(`claude --resume ${resumeId}\n`);
      } else {
        ptyProcess.write('claude\n');
      }
    }, 500); // シェル起動待ち

    return id;
  }

  write(terminalId: string, data: string): void {
    this.terminals.get(terminalId)?.pty.write(data);
  }

  resize(terminalId: string, cols: number, rows: number): void {
    this.terminals.get(terminalId)?.pty.resize(cols, rows);
  }

  close(terminalId: string): void {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      terminal.pty.kill();
      this.terminals.delete(terminalId);
    }
  }

  getTerminal(terminalId: string): TerminalProcess | undefined {
    return this.terminals.get(terminalId);
  }

  getAllTerminals(): TerminalProcess[] {
    return Array.from(this.terminals.values());
  }

  get count(): number {
    return this.terminals.size;
  }

  /**
   * 指定したターミナルに /exit を送信し、resume IDを取得してから終了する
   * Claude CLIが /exit に応答するまで最大5秒待機する
   */
  async gracefulClose(terminalId: string): Promise<{ directory: string; resumeId?: string }> {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      return { directory: '' };
    }

    return new Promise((resolve) => {
      let outputBuffer = '';

      // gracefulClose専用の出力バッファリングリスナーを追加
      const listener = terminal.pty.onData((data: string) => {
        outputBuffer += data;
      });

      // /exit を送信してClaude CLIにセッション情報を出力させる
      // Claude CLIのTUIはオートコンプリートを表示するため、
      // テキスト入力後に少し待ってからEnterを送信する
      terminal.pty.write('/exit');
      setTimeout(() => terminal.pty.write('\r'), 200);

      // 5秒待ってからresume IDを解析
      setTimeout(() => {
        listener.dispose();
        const resumeId = parseResumeId(outputBuffer);
        const directory = terminal.directory;
        terminal.pty.kill();
        this.terminals.delete(terminalId);
        resolve({ directory, resumeId });
      }, 5000);
    });
  }

  /**
   * 全ターミナルをgracefulに閉じてセッション情報を返す
   */
  async gracefulDisposeAll(): Promise<Array<{ directory: string; resumeId?: string; gridPosition: number }>> {
    this.suppressExitNotifications = true;
    const entries = Array.from(this.terminals.entries());
    const promises = entries.map(([id], i) =>
      this.gracefulClose(id).then((result) => ({ ...result, gridPosition: i }))
    );
    const results = await Promise.all(promises);
    this.suppressExitNotifications = false;
    return results;
  }

  disposeAll(): void {
    for (const terminal of this.terminals.values()) {
      terminal.pty.kill();
    }
    this.terminals.clear();
  }
}
