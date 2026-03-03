import type { Terminal, ILinkProvider, ILink } from '@xterm/xterm';
import type { WebviewToHostMessage } from '../src/protocol/messages';

// 対象拡張子リスト（長い拡張子を先に: tsx before ts, jsx before js, etc.）
const EXTENSIONS =
  'tsx|ts|jsx|js|mjs|cjs|json|css|scss|sass|less|html|htm|mdx|md|' +
  'txt|pyi|py|rb|go|rs|java|kt|cpp|cc|hpp|cpp|c|h|' +
  'yaml|yml|toml|xml|svg|bash|zsh|sh|' +
  'sql|graphql|gql|vue|svelte|astro|prisma|proto|' +
  'env|cfg|conf|ini|lock|log|csv|php|lua|swift|exs|ex|hs|scala|r';

// ファイルパス正規表現:
// - パスに / が少なくとも1つ必要（bare filename を除外）
// - 拡張子マッチ必須（\b で完全拡張子を保証）
// - オプションで :行番号 および :行番号:列番号
const FILE_PATH_REGEX = new RegExp(
  `((?:\\.{0,2}\\/)?(?:[\\w.@~+\\-]+\\/)+[\\w.@~+\\-]+\\.(?:${EXTENSIONS}))\\b(?::(\\d+)(?::(\\d+))?)?`,
  'gi'
);

// URL正規表現
const URL_REGEX = /https?:\/\/[^\s'")\]}>]+/g;

export interface FilePathMatch {
  path: string;
  line?: number;
  column?: number;
  startIndex: number;
  endIndex: number;
}

export function findFilePathsInLine(lineText: string): FilePathMatch[] {
  // URL の範囲を先に検出し、重複するファイルパスマッチを除外する
  const urlRanges = findUrlsInLine(lineText).map((u) => ({ start: u.startIndex, end: u.endIndex }));

  const results: FilePathMatch[] = [];
  FILE_PATH_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = FILE_PATH_REGEX.exec(lineText)) !== null) {
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    // URL と重複するマッチを除外
    const overlapsUrl = urlRanges.some((u) => matchStart < u.end && matchEnd > u.start);
    if (overlapsUrl) {
      continue;
    }

    results.push({
      path: match[1],
      line: match[2] ? parseInt(match[2], 10) : undefined,
      column: match[3] ? parseInt(match[3], 10) : undefined,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return results;
}

export function findUrlsInLine(lineText: string): Array<{ url: string; startIndex: number; endIndex: number }> {
  const results: Array<{ url: string; startIndex: number; endIndex: number }> = [];
  URL_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = URL_REGEX.exec(lineText)) !== null) {
    results.push({
      url: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return results;
}

export function createFilePathLinkProvider(
  terminal: Terminal,
  directory: string,
  postMessage: (msg: WebviewToHostMessage) => void
): ILinkProvider {
  return {
    provideLinks(bufferLineNumber: number, callback: (links: ILink[] | undefined) => void): void {
      const line = terminal.buffer.active.getLine(bufferLineNumber - 1);
      if (!line) {
        callback(undefined);
        return;
      }

      const lineText = line.translateToString(true);
      const matches = findFilePathsInLine(lineText);

      if (matches.length === 0) {
        callback(undefined);
        return;
      }

      const links: ILink[] = matches.map((m) => ({
        range: {
          start: { x: m.startIndex + 1, y: bufferLineNumber },
          end: { x: m.endIndex, y: bufferLineNumber },
        },
        text: m.path + (m.line !== undefined ? `:${m.line}` : '') + (m.column !== undefined ? `:${m.column}` : ''),
        decorations: { pointerCursor: true, underline: true },
        activate(_event: MouseEvent, _text: string): void {
          postMessage({
            type: 'openFile',
            filePath: m.path,
            directory,
            line: m.line,
            column: m.column,
          });
        },
      }));

      callback(links);
    },
  };
}

export function createUrlLinkProvider(
  terminal: Terminal,
  postMessage: (msg: WebviewToHostMessage) => void
): ILinkProvider {
  return {
    provideLinks(bufferLineNumber: number, callback: (links: ILink[] | undefined) => void): void {
      const line = terminal.buffer.active.getLine(bufferLineNumber - 1);
      if (!line) {
        callback(undefined);
        return;
      }

      const lineText = line.translateToString(true);
      const matches = findUrlsInLine(lineText);

      if (matches.length === 0) {
        callback(undefined);
        return;
      }

      const links: ILink[] = matches.map((m) => ({
        range: {
          start: { x: m.startIndex + 1, y: bufferLineNumber },
          end: { x: m.endIndex, y: bufferLineNumber },
        },
        text: m.url,
        decorations: { pointerCursor: true, underline: true },
        activate(_event: MouseEvent, _text: string): void {
          postMessage({ type: 'openUrl', url: m.url });
        },
      }));

      callback(links);
    },
  };
}
