import * as fs from 'fs';
import * as path from 'path';

declare const __non_webpack_require__: NodeRequire | undefined;

export interface EnsureSpawnHelperOptions {
  packageDir?: string;
  resolvePackageDir?: () => string;
  platform?: NodeJS.Platform;
  arch?: string;
  chmod?: (p: string, mode: number) => void;
}

// webpackにバンドルされないよう、実行時のrequireでnode-ptyの場所を解決する
function defaultResolvePackageDir(): string {
  const req: NodeRequire =
    typeof __non_webpack_require__ === 'function' ? __non_webpack_require__ : eval('require');
  return path.dirname(req.resolve('node-pty/package.json'));
}

/**
 * vsixインストール後にnode-ptyのspawn-helperが実行権限を失う問題への対処。
 * 失敗してもターミナル作成を妨げないよう、例外は握りつぶして警告のみ出す。
 */
export function ensureSpawnHelperExecutable(options: EnsureSpawnHelperOptions = {}): void {
  const platform = options.platform ?? process.platform;
  if (platform === 'win32') return;
  const arch = options.arch ?? process.arch;
  const chmod = options.chmod ?? fs.chmodSync;

  try {
    const packageDir = options.packageDir ?? (options.resolvePackageDir ?? defaultResolvePackageDir)();
    const candidates = [
      path.join(packageDir, 'prebuilds', `${platform}-${arch}`, 'spawn-helper'),
      path.join(packageDir, 'build', 'Release', 'spawn-helper'),
    ];
    for (const candidate of candidates) {
      try {
        if (!fs.existsSync(candidate)) continue;
        const mode = fs.statSync(candidate).mode;
        if ((mode & 0o111) !== 0) continue;
        chmod(candidate, mode | 0o111);
      } catch (err) {
        console.warn(`[agent-panel] spawn-helper の権限設定に失敗: ${candidate}`, err);
      }
    }
  } catch (err) {
    console.warn('[agent-panel] node-pty の場所を解決できず spawn-helper の権限確認をスキップ', err);
  }
}
