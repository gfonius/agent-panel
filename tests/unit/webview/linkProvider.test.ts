import { describe, it, expect } from 'vitest';
import { findFilePathsInLine, findUrlsInLine } from '../../../webview/linkProvider';

describe('findFilePathsInLine', () => {
  describe('absolute paths', () => {
    it('matches absolute path with extension', () => {
      const results = findFilePathsInLine('/home/user/project/src/index.ts');
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('/home/user/project/src/index.ts');
    });

    it('matches absolute path with line number', () => {
      const results = findFilePathsInLine('/home/user/project/src/index.ts:42');
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('/home/user/project/src/index.ts');
      expect(results[0].line).toBe(42);
    });

    it('matches absolute path with line and column', () => {
      const results = findFilePathsInLine('/home/user/project/src/index.ts:42:10');
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('/home/user/project/src/index.ts');
      expect(results[0].line).toBe(42);
      expect(results[0].column).toBe(10);
    });
  });

  describe('relative paths', () => {
    it('matches relative path with slash', () => {
      const results = findFilePathsInLine('src/index.ts');
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('src/index.ts');
    });

    it('matches dot-slash relative path', () => {
      const results = findFilePathsInLine('./src/index.ts');
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('./src/index.ts');
    });

    it('matches dot-dot-slash relative path', () => {
      const results = findFilePathsInLine('../src/index.ts');
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('../src/index.ts');
    });

    it('matches relative path with line number', () => {
      const results = findFilePathsInLine('src/components/Button.tsx:15');
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('src/components/Button.tsx');
      expect(results[0].line).toBe(15);
    });
  });

  describe('paths embedded in text', () => {
    it('matches path in error message', () => {
      const results = findFilePathsInLine('Error in src/index.ts:42:10 - unexpected token');
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('src/index.ts');
      expect(results[0].line).toBe(42);
      expect(results[0].column).toBe(10);
    });

    it('matches multiple paths on same line', () => {
      const results = findFilePathsInLine('Copied src/old.ts to src/new.ts');
      expect(results).toHaveLength(2);
      expect(results[0].path).toBe('src/old.ts');
      expect(results[1].path).toBe('src/new.ts');
    });

    it('matches path in quotes', () => {
      const results = findFilePathsInLine('File "src/index.ts" not found');
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('src/index.ts');
    });
  });

  describe('various extensions', () => {
    it.each([
      'src/file.ts', 'src/file.tsx', 'src/file.js', 'src/file.jsx',
      'src/file.json', 'src/file.css', 'src/file.html', 'src/file.md',
      'src/file.py', 'src/file.go', 'src/file.rs', 'src/file.yaml',
      'src/file.yml', 'src/file.toml', 'src/file.sh', 'src/file.sql',
      'src/file.vue', 'src/file.svelte',
    ])('matches %s', (filePath) => {
      const results = findFilePathsInLine(filePath);
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe(filePath);
    });
  });

  describe('false positives to avoid', () => {
    it('does not match URL paths as file paths', () => {
      const results = findFilePathsInLine('Visit https://example.com/path/to/page.html');
      expect(results).toHaveLength(0);
    });

    it('does not match http URL paths as file paths', () => {
      const results = findFilePathsInLine('http://localhost:3000/api/test.json');
      expect(results).toHaveLength(0);
    });

    it('does not match bare filenames without slashes', () => {
      const results = findFilePathsInLine('index.ts');
      expect(results).toHaveLength(0);
    });
  });

  describe('startIndex and endIndex', () => {
    it('reports correct start and end indices', () => {
      const line = 'Error: src/index.ts:42 failed';
      const results = findFilePathsInLine(line);
      expect(results).toHaveLength(1);
      expect(results[0].startIndex).toBe(7);
      // "src/index.ts:42" = 15 chars, endIndex = 7 + 15 = 22
      expect(results[0].endIndex).toBe(22);
    });

    it('reports correct indices for path without line number', () => {
      const line = 'File src/index.ts was modified';
      const results = findFilePathsInLine(line);
      expect(results).toHaveLength(1);
      expect(results[0].startIndex).toBe(5);
      // "src/index.ts" = 12 chars, endIndex = 5 + 12 = 17
      expect(results[0].endIndex).toBe(17);
    });
  });
});

describe('findUrlsInLine', () => {
  it('matches https URL', () => {
    const results = findUrlsInLine('Visit https://example.com for more info');
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com');
  });

  it('matches http URL', () => {
    const results = findUrlsInLine('Server at http://localhost:3000');
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('http://localhost:3000');
  });

  it('matches URL with path and query', () => {
    const results = findUrlsInLine('See https://example.com/docs?v=2#section');
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com/docs?v=2#section');
  });

  it('matches multiple URLs', () => {
    const results = findUrlsInLine('https://foo.com and https://bar.com');
    expect(results).toHaveLength(2);
    expect(results[0].url).toBe('https://foo.com');
    expect(results[1].url).toBe('https://bar.com');
  });

  it('stops at closing parenthesis', () => {
    const results = findUrlsInLine('(https://example.com)');
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com');
  });

  it('stops at closing bracket', () => {
    const results = findUrlsInLine('[https://example.com]');
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com');
  });

  it('reports correct indices', () => {
    const line = 'Visit https://example.com now';
    const results = findUrlsInLine(line);
    expect(results).toHaveLength(1);
    expect(results[0].startIndex).toBe(6);
    expect(results[0].endIndex).toBe(25);
  });

  it('does not match text without protocol', () => {
    const results = findUrlsInLine('example.com is a website');
    expect(results).toHaveLength(0);
  });
});
