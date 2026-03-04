import * as vscode from 'vscode';
import { RECENT_DIRECTORIES_KEY, RECENT_DIRECTORIES_MAX } from '../constants';

export class RecentDirectoriesManager {
  constructor(private context: vscode.ExtensionContext) {}

  getAll(): string[] {
    return this.context.globalState.get<string[]>(RECENT_DIRECTORIES_KEY) ?? [];
  }

  add(dir: string): void {
    const dirs = this.getAll().filter(d => d !== dir);
    dirs.unshift(dir);
    if (dirs.length > RECENT_DIRECTORIES_MAX) {
      dirs.length = RECENT_DIRECTORIES_MAX;
    }
    this.context.globalState.update(RECENT_DIRECTORIES_KEY, dirs);
  }

  remove(dir: string): void {
    const dirs = this.getAll().filter(d => d !== dir);
    this.context.globalState.update(RECENT_DIRECTORIES_KEY, dirs);
  }

  clear(): void {
    this.context.globalState.update(RECENT_DIRECTORIES_KEY, undefined);
  }
}
