import { describe, it, expect, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { RecentDirectoriesManager } from '../../../src/managers/RecentDirectoriesManager';
import { RECENT_DIRECTORIES_MAX } from '../../../src/constants';

function createMockContext(): vscode.ExtensionContext {
  const store = new Map<string, unknown>();
  return {
    globalState: {
      get: (key: string) => store.get(key),
      update: (key: string, value: unknown) => {
        if (value === undefined) {
          store.delete(key);
        } else {
          store.set(key, value);
        }
        return Promise.resolve();
      },
    },
  } as unknown as vscode.ExtensionContext;
}

describe('RecentDirectoriesManager', () => {
  let context: vscode.ExtensionContext;
  let manager: RecentDirectoriesManager;

  beforeEach(() => {
    context = createMockContext();
    manager = new RecentDirectoriesManager(context);
  });

  it('初期状態で空配列を返す', () => {
    expect(manager.getAll()).toEqual([]);
  });

  it('add() でディレクトリを追加できる', () => {
    manager.add('/home/user/project');
    expect(manager.getAll()).toEqual(['/home/user/project']);
  });

  it('add() で複数ディレクトリを追加すると先頭が最新になる', () => {
    manager.add('/home/user/project1');
    manager.add('/home/user/project2');
    expect(manager.getAll()).toEqual(['/home/user/project2', '/home/user/project1']);
  });

  it('add() で重複は先頭に移動（再追加）', () => {
    manager.add('/home/user/project1');
    manager.add('/home/user/project2');
    manager.add('/home/user/project1');
    expect(manager.getAll()).toEqual(['/home/user/project1', '/home/user/project2']);
  });

  it(`add() で上限(${RECENT_DIRECTORIES_MAX}件)を超えたら古いものを削除`, () => {
    for (let i = 0; i < RECENT_DIRECTORIES_MAX + 5; i++) {
      manager.add(`/home/user/project${i}`);
    }
    const result = manager.getAll();
    expect(result.length).toBe(RECENT_DIRECTORIES_MAX);
    // 最新のものが先頭にある
    expect(result[0]).toBe(`/home/user/project${RECENT_DIRECTORIES_MAX + 4}`);
    // 最も古いものは削除されている
    expect(result).not.toContain('/home/user/project0');
  });

  it('remove() で指定ディレクトリを削除', () => {
    manager.add('/home/user/project1');
    manager.add('/home/user/project2');
    manager.remove('/home/user/project1');
    expect(manager.getAll()).toEqual(['/home/user/project2']);
  });

  it('remove() で存在しないディレクトリを指定しても変化しない', () => {
    manager.add('/home/user/project1');
    manager.remove('/home/user/nonexistent');
    expect(manager.getAll()).toEqual(['/home/user/project1']);
  });

  it('clear() で全削除', () => {
    manager.add('/home/user/project1');
    manager.add('/home/user/project2');
    manager.clear();
    expect(manager.getAll()).toEqual([]);
  });
});
