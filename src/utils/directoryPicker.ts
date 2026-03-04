import * as vscode from 'vscode';
import * as path from 'path';

export async function showDirectoryPicker(recentDirs: string[]): Promise<string | undefined> {
  // 履歴が空 → 即Finderダイアログ
  if (recentDirs.length === 0) {
    return showNativeDialog();
  }

  // QuickPick表示
  type DirItem = vscode.QuickPickItem & { directory?: string; isBrowse?: boolean };
  const items: DirItem[] = recentDirs.map(dir => ({
    label: path.basename(dir),
    description: path.dirname(dir),
    directory: dir,
  }));

  items.push({ label: '', kind: vscode.QuickPickItemKind.Separator });
  items.push({
    label: '$(folder-opened) Browse...',
    description: 'Open folder picker',
    isBrowse: true,
  });

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a recent directory or browse...',
    matchOnDescription: true,
  });

  if (!selected) {
    return undefined;
  }

  if (selected.isBrowse) {
    return showNativeDialog();
  }

  return selected.directory;
}

async function showNativeDialog(): Promise<string | undefined> {
  const uris = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: 'Open in Agent Panel',
  });
  return uris?.[0]?.fsPath;
}
