import * as os from 'os';

export function getDefaultShell(): string {
  const platform = os.platform();
  if (platform === 'darwin' || platform === 'linux') {
    return process.env.SHELL || '/bin/zsh';
  }
  return 'powershell.exe';
}

export function isMac(): boolean {
  return os.platform() === 'darwin';
}

export function getShellArgs(shell: string): string[] {
  // ログインシェルにするため -l を渡す
  if (shell.endsWith('zsh') || shell.endsWith('bash')) {
    return ['-l'];
  }
  return [];
}
