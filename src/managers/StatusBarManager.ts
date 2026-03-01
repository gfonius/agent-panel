import * as vscode from 'vscode';
import { COMMAND_OPEN } from '../constants';

export class StatusBarManager {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.text = '$(terminal) Agent Panel';
    this.item.command = COMMAND_OPEN;
    this.item.tooltip = 'Open Agent Panel';
    this.item.show();
  }

  updateBadge(count: number): void {
    this.item.text = count > 0
      ? `$(terminal) Agent Panel (${count})`
      : '$(terminal) Agent Panel';
  }

  dispose(): void {
    this.item.dispose();
  }
}
