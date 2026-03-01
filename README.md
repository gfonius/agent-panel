# Agent Panel

A VS Code extension that manages multiple terminals in a grid layout.

複数のターミナルをグリッドレイアウトで管理する VS Code 拡張機能。

## Features / 機能

- **Multi-terminal grid layout** - View and manage multiple terminals side by side
- **Pane drag & drop reordering** - Rearrange terminal panes by dragging headers
- **File explorer drag & drop** - Drop files or folders to insert their path into the active terminal
- **Keyboard shortcuts** - Navigate and manage panes with Cmd+N/W/T, Cmd+Shift+Arrow, etc.
- **Rate limit monitor** - Built-in API rate limit status display

---

- **マルチターミナルグリッド表示** - 複数のターミナルを並べて表示・管理
- **パネルD&D並べ替え** - ヘッダーをドラッグしてペインの順序を変更
- **ファイラーD&Dパス挿入** - エクスプローラーからファイル・フォルダーをドロップしてパスを挿入
- **キーボードショートカット** - Cmd+N/W/T、Cmd+Shift+Arrow等でペイン操作
- **レート制限モニター** - APIレート制限のステータス表示

## Keyboard Shortcuts / キーボードショートカット

| Action / 操作 | macOS | Windows/Linux |
|---------------|-------|---------------|
| New terminal / 新規ターミナル | `Cmd+N` | `Ctrl+N` |
| Close terminal / ターミナルを閉じる | `Cmd+W` | `Ctrl+W` |
| Open in VS Code terminal / VSCodeターミナルで開く | `Cmd+T` | `Ctrl+T` |
| Focus pane up / 上のペインへ | `Cmd+Shift+Up` | `Ctrl+Shift+Up` |
| Focus pane down / 下のペインへ | `Cmd+Shift+Down` | `Ctrl+Shift+Down` |
| Focus pane left / 左のペインへ | `Cmd+Shift+Left` | `Ctrl+Shift+Left` |
| Focus pane right / 右のペインへ | `Cmd+Shift+Right` | `Ctrl+Shift+Right` |
| Delete word back / 単語削除 | `Cmd+Backspace` | `Ctrl+Backspace` |
| Line break / 改行 | `Shift+Enter` | `Shift+Enter` |
| Cursor to line start / 行頭移動 | `Cmd+Left` | - |
| Cursor to line end / 行末移動 | `Cmd+Right` | - |
| Word cursor move / 単語移動 | `Option+Left/Right` | - |

All shortcuts are active only when the Agent Panel is focused.

ショートカットは Agent Panel にフォーカスがある場合のみ有効です。

## Installation / インストール

### From VS Code Marketplace / マーケットプレイスから

Search for "Agent Panel" in the Extensions view (`Cmd+Shift+X`) and click Install.

拡張機能ビュー（`Cmd+Shift+X`）で "Agent Panel" を検索してインストール。

### From VSIX / VSIXファイルから

1. Download the `.vsix` file from the [releases page](https://github.com/gfonius/agent-panel/releases)
2. Open the Extensions view and click `...` > "Install from VSIX..."
3. Select the downloaded file

---

1. [リリースページ](https://github.com/gfonius/agent-panel/releases)から `.vsix` ファイルをダウンロード
2. 拡張機能ビューの `...` → 「VSIXからインストール...」を選択
3. ダウンロードしたファイルを選択

## Usage / 使い方

1. Open the Command Palette (`Cmd+Shift+P`) / コマンドパレットを開く
2. Run `Open Agent Panel` / `Open Agent Panel` を実行
3. Use `Cmd+N` to create a new terminal / `Cmd+N` で新規ターミナルを作成

## Platform / 対応環境

- **macOS**: Tested and supported / 動作確認済み
- **Windows/Linux**: Not yet tested. Some keyboard shortcuts may not work correctly. / 未テスト。一部ショートカットが正常に動作しない可能性あり。

## Requirements / 要件

- VS Code 1.96.0+

## License / ライセンス

[MIT](LICENSE)
