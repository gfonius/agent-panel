import type { ExtraUsage, RateLimitWindow } from '../types';

// Host → Webview
export type HostToWebviewMessage =
  | { type: 'terminalCreated'; terminalId: string; directory: string; customName?: string }
  | { type: 'terminalOutput'; terminalId: string; data: string }
  | { type: 'terminalClosed'; terminalId: string }
  | {
      type: 'rateLimitUpdate';
      windows: RateLimitWindow[];
      extraUsage: ExtraUsage | null;
    }
  | { type: 'focusDirection'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'closeActiveTerminal' }
  | { type: 'openActiveInVscodeTerminal' }
  | { type: 'openActiveInExplorer' }
  | { type: 'deleteWordBack' }
  | { type: 'setLocale'; locale: string }
  | { type: 'toggleMaximize' }
  | { type: 'quitting' }
  | { type: 'focusPaneByIndex'; index: number }

// Webview → Host
export type WebviewToHostMessage =
  | { type: 'ready' }
  | { type: 'terminalInput'; terminalId: string; data: string }
  | { type: 'terminalResize'; terminalId: string; cols: number; rows: number }
  | { type: 'requestNewTerminal'; directory: string }
  | { type: 'closeTerminal'; terminalId: string }
  | { type: 'requestRateLimit' }
  | { type: 'openVscodeTerminal'; directory: string }
  | { type: 'openExplorer'; directory: string }
  | { type: 'requestFolderPicker' }
  | { type: 'openFile'; filePath: string; directory: string; line?: number; column?: number }
  | { type: 'openUrl'; url: string }
  | { type: 'requestQuit' }
  | { type: 'paneRenamed'; terminalId: string; customName: string }
