import * as vscode from 'vscode';
import { PANEL_VIEW_TYPE } from '../constants';

export class PanelManager {
  private panel: vscode.WebviewPanel | undefined;
  private readonly extensionUri: vscode.Uri;
  private onDidDispose: () => void;
  private onMessage: ((msg: unknown) => void) | undefined;

  constructor(
    extensionUri: vscode.Uri,
    onDidDispose?: () => void,
    onMessage?: (msg: unknown) => void
  ) {
    this.extensionUri = extensionUri;
    this.onDidDispose = onDidDispose ?? (() => {});
    this.onMessage = onMessage;
  }

  reveal(): vscode.WebviewPanel {
    if (this.panel) {
      this.panel.reveal();
      return this.panel;
    }

    this.panel = vscode.window.createWebviewPanel(
      PANEL_VIEW_TYPE,
      'Claude Panel',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview'),
        ],
      }
    );

    this.panel.iconPath = new vscode.ThemeIcon('terminal');
    this.panel.webview.html = this.getWebviewContent(this.panel.webview);

    // メッセージハンドラを1回だけ登録
    if (this.onMessage) {
      this.panel.webview.onDidReceiveMessage(this.onMessage);
    }

    // パネルの表示状態に応じてcontext keyを設定
    vscode.commands.executeCommand('setContext', 'claudePanel.active', true);

    this.panel.onDidChangeViewState((e) => {
      vscode.commands.executeCommand('setContext', 'claudePanel.active', e.webviewPanel.active);
    });

    this.panel.onDidDispose(() => {
      this.panel = undefined;
      vscode.commands.executeCommand('setContext', 'claudePanel.active', false);
      this.onDidDispose();
    });

    return this.panel;
  }

  getPanel(): vscode.WebviewPanel | undefined {
    return this.panel;
  }

  postMessage(message: unknown): void {
    this.panel?.webview.postMessage(message);
  }

  private getWebviewContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'webview.css')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <link href="${styleUri}" rel="stylesheet">
  <title>Claude Panel</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
