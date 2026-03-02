/**
 * file:// URI をファイルシステムのパスに変換する
 * URI エンコードされた文字（スペース、日本語など）をデコードする
 */
export function uriToPath(uri: string): string {
  const url = new URL(uri);
  return decodeURIComponent(url.pathname);
}

/**
 * Claude CLIに渡すためパスをダブルクォートで囲む
 * Claude CLIでは "ファイルパス" 形式でファイル参照する
 */
export function quotePath(path: string): string {
  return `"${path}"`;
}

/**
 * ドロップイベントのデータからファイルパスを抽出する
 * 複数のMIMEタイプにフォールバックして対応:
 * 1. text/uri-list（標準）
 * 2. text/plain（file:// URI またはローカルパス）
 */
export function extractFilePaths(uriListData: string, plainTextData: string): string[] {
  // 1. text/uri-list
  if (uriListData) {
    const paths = uriListData.split('\n')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('#'))
      .map(u => quotePath(uriToPath(u)));
    if (paths.length > 0) return paths;
  }

  // 2. text/plain
  const text = plainTextData?.trim();
  if (text) {
    if (text.startsWith('file://')) {
      const paths = text.split('\n')
        .map(s => s.trim())
        .filter(s => s.startsWith('file://'))
        .map(u => quotePath(uriToPath(u)));
      if (paths.length > 0) return paths;
    }
    if (text.startsWith('/')) {
      return [quotePath(text)];
    }
  }

  return [];
}
