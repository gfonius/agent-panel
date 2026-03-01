/**
 * file:// URI をファイルシステムのパスに変換する
 * URI エンコードされた文字（スペース、日本語など）をデコードする
 */
export function uriToPath(uri: string): string {
  const url = new URL(uri);
  return decodeURIComponent(url.pathname);
}

/**
 * シェルで安全に使用できるようパスをクォートする
 * スペースや特殊文字を含む場合はシングルクォートで囲む
 * シングルクォート自体は '"'"' でエスケープする
 */
export function quotePath(path: string): string {
  if (/[\s"'\\$`!#&|;(){}]/.test(path)) {
    return `'${path.replace(/'/g, "'\\''")}'`;
  }
  return path;
}
