import * as vscode from 'vscode';
import { COMMAND_OPEN } from '../constants';

export class StatusBarManager {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.text = '$(terminal) Claude Panel';
    this.item.command = COMMAND_OPEN;
    this.item.tooltip = 'Open Claude Panel';
    this.item.show();
  }

  updateBadge(count: number): void {
    this.item.text = count > 0
      ? `$(terminal) Claude Panel (${count})`
      : '$(terminal) Claude Panel';
  }

  dispose(): void {
    this.item.dispose();
  }
}
