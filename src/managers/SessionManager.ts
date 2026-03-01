import * as vscode from 'vscode';
import { SESSION_STORAGE_KEY } from '../constants';
import { TerminalSession, SavedState } from '../types';

export class SessionManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  save(sessions: TerminalSession[]): void {
    const state: SavedState = {
      sessions,
      version: 1,
    };
    this.context.globalState.update(SESSION_STORAGE_KEY, state);
  }

  load(): TerminalSession[] {
    const state = this.context.globalState.get<SavedState>(SESSION_STORAGE_KEY);
    if (!state || state.version !== 1) {
      return [];
    }
    return state.sessions;
  }

  clear(): void {
    this.context.globalState.update(SESSION_STORAGE_KEY, undefined);
  }

  hasSavedSessions(): boolean {
    return this.load().length > 0;
  }
}
