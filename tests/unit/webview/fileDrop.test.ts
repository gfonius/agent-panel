import { describe, it, expect } from 'vitest';
import { uriToPath, quotePath, extractFilePaths } from '../../../webview/fileDropUtils';

describe('uriToPath', () => {
  it('converts file:// URI to filesystem path', () => {
    const uri = 'file:///Users/user/project/src/index.ts';
    expect(uriToPath(uri)).toBe('/Users/user/project/src/index.ts');
  });

  it('handles URI-encoded characters (spaces etc)', () => {
    const uri = 'file:///Users/user/my%20project/hello%20world.ts';
    expect(uriToPath(uri)).toBe('/Users/user/my project/hello world.ts');
  });

  it('handles Japanese characters in path', () => {
    const uri = 'file:///Users/user/%E3%83%97%E3%83%AD%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88/main.ts';
    expect(uriToPath(uri)).toBe('/Users/user/プロジェクト/main.ts');
  });
});

describe('quotePath', () => {
  it('wraps simple path in double quotes', () => {
    expect(quotePath('/Users/user/project/index.ts')).toBe('"/Users/user/project/index.ts"');
  });

  it('wraps path with spaces in double quotes', () => {
    expect(quotePath('/Users/user/my project/index.ts')).toBe('"/Users/user/my project/index.ts"');
  });

  it('wraps path with special characters in double quotes', () => {
    expect(quotePath('/Users/user/project/$file.ts')).toBe('"/Users/user/project/$file.ts"');
  });

  it('wraps path with single quotes in double quotes', () => {
    expect(quotePath("/Users/user/it's/file.ts")).toBe("\"/Users/user/it's/file.ts\"");
  });
});

describe('extractFilePaths', () => {
  // text/uri-list が使える場合
  it('extracts single path from text/uri-list', () => {
    const paths = extractFilePaths('file:///Users/user/project/index.ts', '');
    expect(paths).toEqual(['"/Users/user/project/index.ts"']);
  });

  it('extracts multiple paths from text/uri-list', () => {
    const uriList = [
      'file:///Users/user/project/src/index.ts',
      'file:///Users/user/project/src/app.ts',
    ].join('\n');
    const paths = extractFilePaths(uriList, '');
    expect(paths).toEqual([
      '"/Users/user/project/src/index.ts"',
      '"/Users/user/project/src/app.ts"',
    ]);
  });

  it('quotes paths with spaces from text/uri-list', () => {
    const uriList = 'file:///Users/user/my%20project/index.ts';
    const paths = extractFilePaths(uriList, '');
    expect(paths).toEqual(['"/Users/user/my project/index.ts"']);
  });

  it('filters comment lines from text/uri-list', () => {
    const uriList = '# comment\nfile:///Users/user/project/index.ts';
    const paths = extractFilePaths(uriList, '');
    expect(paths).toEqual(['"/Users/user/project/index.ts"']);
  });

  it('filters empty lines from text/uri-list', () => {
    const uriList = 'file:///Users/user/project/a.ts\n\nfile:///Users/user/project/b.ts\n';
    const paths = extractFilePaths(uriList, '');
    expect(paths).toHaveLength(2);
  });

  // text/uri-list が空で text/plain にフォールバック
  it('falls back to text/plain with file:// URI', () => {
    const paths = extractFilePaths('', 'file:///Users/user/project/index.ts');
    expect(paths).toEqual(['"/Users/user/project/index.ts"']);
  });

  it('falls back to text/plain with raw local path', () => {
    const paths = extractFilePaths('', '/Users/user/project/index.ts');
    expect(paths).toEqual(['"/Users/user/project/index.ts"']);
  });

  it('quotes raw local path with spaces', () => {
    const paths = extractFilePaths('', '/Users/user/my project/index.ts');
    expect(paths).toEqual(['"/Users/user/my project/index.ts"']);
  });

  it('handles multiple file:// URIs in text/plain', () => {
    const text = 'file:///Users/user/a.ts\nfile:///Users/user/b.ts';
    const paths = extractFilePaths('', text);
    expect(paths).toEqual(['"/Users/user/a.ts"', '"/Users/user/b.ts"']);
  });

  // 両方空の場合
  it('returns empty array when no data', () => {
    expect(extractFilePaths('', '')).toEqual([]);
  });

  // text/uri-list 優先
  it('prefers text/uri-list over text/plain', () => {
    const paths = extractFilePaths(
      'file:///Users/user/from-uri-list.ts',
      'file:///Users/user/from-plain.ts'
    );
    expect(paths).toEqual(['"/Users/user/from-uri-list.ts"']);
  });
});
