// Host → Webview
export type HostToWebviewMessage =
  | { type: 'terminalCreated'; terminalId: string; directory: string }
  | { type: 'terminalOutput'; terminalId: string; data: string }
  | { type: 'terminalClosed'; terminalId: string }
  | {
      type: 'rateLimitUpdate';
      fiveHour: { utilization: number; resetsAt: string };
      sevenDay: { utilization: number; resetsAt: string };
      sevenDaySonnet: { utilization: number; resetsAt: string } | null;
    }
  | { type: 'focusDirection'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'closeActiveTerminal' }
  | { type: 'openActiveInVscodeTerminal' }
  | { type: 'openActiveInExplorer' }
  | { type: 'deleteWordBack' }
  | { type: 'setLocale'; locale: string }

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
