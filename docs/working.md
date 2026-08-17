# fix/windows-terminal-input

## 概要
Windows 環境で報告された2件の不具合を修正する。
**いずれも Windows のときだけ分岐し、macOS / Linux の既存挙動は一切変えない。**

## 不具合1: 起動時に Enter を押さないと PowerShell のまま

### 原因
`src/managers/TerminalManager.ts` がシェル起動後に送る初期コマンドの終端が `\n`（LF）。

```ts
ptyProcess.write(`claude --resume ${resumeId}\n`);
ptyProcess.write('claude\n');
```

PowerShell / conpty は `\r`（CR）を Enter として扱うため、LF では行が確定しない。
結果、`claude` がプロンプトに入力されたまま実行されず、ユーザーが Enter を押して初めて起動する。

なお同ファイルの終了処理では既に `\r` を使っており、実装が一貫していない。

### 方針
`src/utils/platform.ts` に改行文字を返す関数を追加し、Windows のみ `\r` を返す。
macOS / Linux は現行どおり `\n` を維持する（挙動を変えない）。

## 不具合2: Ctrl+V が効かない

### 原因
`webview/KeyboardHandler.ts` の修飾キー判定が `isMac ? metaKey : ctrlKey` のため、
Windows では Ctrl が拡張側のショートカット修飾キーになっている。
加えて xterm.js が Ctrl+V を通常のキー入力として処理するため、
textarea に paste イベントが到達せず、ブラウザのネイティブ貼り付けが発生しない。

### 方針
xterm.js の公開 API `terminal.paste(data)` を使う（`@xterm/xterm` 5.5.0 で提供）。

1. Windows のときだけ Ctrl+V を捕捉する
2. `navigator.clipboard.readText()` でクリップボードを読む
3. `terminal.paste(text)` に渡す
4. `preventDefault()` で二重貼り付けを防ぐ

**`terminal.paste()` を使う理由**: bracketed paste mode（`\x1b[200~` … `\x1b[201~`）を
正しく処理するため。pty へ直接 write すると囲みが付かず、複数行テキストを貼った際に
改行がすべて Enter として解釈され、行ごとに送信されてしまう。

### フォールバック
VS Code の webview では `navigator.clipboard.readText()` が権限で拒否される可能性がある。
失敗時は拡張ホストの `vscode.env.clipboard.readText()` にメッセージで問い合わせ、
返ってきたテキストを `terminal.paste()` に渡す。

## 対象外（今回は触らない）
Windows では以下が xterm のターミナル操作と衝突しているが、操作体系の変更になるため別途検討する。

| ショートカット | 拡張の割当 | ターミナル本来の動作 |
|---|---|---|
| `Ctrl+W` | ペインを閉じる | 単語削除 |
| `Ctrl+F` | エクスプローラーで開く | カーソル前進 |
| `Ctrl+N` | 新規ターミナル | 履歴を次へ |
| `Ctrl+T` | VSCodeターミナル | 文字入れ替え |

## 進捗
- [x] platform.ts に改行文字・Windows判定を追加 + テスト
- [x] TerminalManager.ts の初期コマンド送信を修正
- [x] Ctrl+V 判定ロジックを純粋関数として実装 + テスト
- [x] TerminalPane に paste 処理を配線
- [x] クリップボード読み取りのフォールバック（拡張ホスト経由）
- [x] protocol/messages.ts に往復メッセージを追加
- [x] テスト・ビルド確認

### 実装メモ
- `src/utils/platform.ts`: `isWindows()` / `getCommandLineEnding()` を追加。
  `getDefaultShell` / `isMac` と同じ `os.platform()` モック方式でテスト。
- `src/managers/TerminalManager.ts`: `create()` の初期コマンド送信を
  `getCommandLineEnding()` の返り値（win32: `\r` / それ以外: `\n`）で送信するよう変更。
  この関数は node-pty 依存で単体テスト対象外のため、直接テストは追加していない
  （`getCommandLineEnding()` 自体のテストで担保）。
- `webview/pasteUtils.ts`: `shouldInterceptPaste(e, isWindows)` を純粋関数として新規作成。
  isWindows=false（Mac/Linux）では常に false を返すため、既存挙動には影響しない。
- `webview/TerminalPane.ts`: `attachCustomKeyEventHandler` に渡す関数をラップし、
  `shouldInterceptPaste` が true の場合のみ `preventDefault` + `terminal.paste()` を実行。
  非Windowsでは `isWindows` 引数が false/undefined なので常に元の `keyHandler` に委譲される。
- `webview/index.ts`: `isWindows` 判定（UA文字列）、`getClipboardText()`
  （`navigator.clipboard.readText()` → 失敗/空文字時は拡張ホストへ `requestClipboard` を
  postMessage → `clipboardContent` 応答を Promise resolve、3秒タイムアウトで空文字resolve）を追加。
  `terminalCreated` 時に `isWindows` と `getClipboardText` を TerminalPane に渡すよう変更。
- `src/protocol/messages.ts`: `requestClipboard` (Webview→Host) / `clipboardContent` (Host→Webview)
  を追加。
- `src/extension.ts`: `requestClipboard` 受信時に `vscode.env.clipboard.readText()` を呼び、
  `clipboardContent` で返す処理を追加。

### テスト結果
- `npm run test`: 236 passed（既存222 + platform.test.ts追加6 + pasteUtils.test.ts新規8）
- `npm run compile`: extension / webview ともに成功

## 検証について
開発環境は macOS のため、**Windows 実機での動作確認は実施できない**。
macOS 側は「既存挙動が変わっていないこと」を以下で確認済み:
- `isMac()` 判定は変更なし、`getCommandLineEnding()` は darwin/linux で `\n` を返す
- `shouldInterceptPaste()` は isWindows=false で常に false（KeyboardHandler本体・Ctrl+Vの
  ブラウザネイティブ挙動は無変更）
Windows 実機での確認（起動時Enter不要になるか、Ctrl+Vでの複数行貼り付けが1コマンドとして
送信されるか、クリップボード権限拒否時のフォールバックが機能するか）はユーザーに依頼する。
