import { describe, it, expect } from 'vitest';
import { uriToPath, quotePath } from '../../../webview/fileDropUtils';

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
  it('returns unquoted path for simple paths', () => {
    expect(quotePath('/Users/user/project/index.ts')).toBe('/Users/user/project/index.ts');
  });

  it('quotes path with spaces', () => {
    expect(quotePath('/Users/user/my project/index.ts')).toBe("'/Users/user/my project/index.ts'");
  });

  it('quotes path with special characters', () => {
    // $ is a special character
    expect(quotePath('/Users/user/project/$file.ts')).toBe("'/Users/user/project/$file.ts'");
    // & is a special character
    expect(quotePath('/Users/user/project/a&b.ts')).toBe("'/Users/user/project/a&b.ts'");
    // ; is a special character
    expect(quotePath('/Users/user/project/a;b.ts')).toBe("'/Users/user/project/a;b.ts'");
  });

  it('escapes single quotes in path', () => {
    // Path containing a single quote: /Users/user/it's/file.ts
    // Expected: '/Users/user/it'"'"'s/file.ts'
    expect(quotePath("/Users/user/it's/file.ts")).toBe("'/Users/user/it'\\''s/file.ts'");
  });
});
