# feature/pane-number-and-rename

## 概要
- #6 ペイン番号ジャンプ: Cmd/Ctrl+1~9でペインにジャンプ、ヘッダーにバッジ表示
- #5 ペインリネーム: タイトルダブルクリックでリネーム、セッション保存/復元対応
- 影響範囲: 13ファイル

## 進捗
- [x] Step 1: 型定義・プロトコル（types.ts, messages.ts, constants.ts）
- [x] Step 2: ペイン番号ジャンプ（package.json, extension.ts, TerminalPane.ts, index.ts, KeyboardHandler.ts, CSS, i18n, ShortcutGuide）
- [x] Step 3: ペインリネーム（TerminalPane.ts, index.ts, extension.ts, TerminalManager.ts, CSS）
- [x] Step 4: テスト（KeyboardHandler.test.ts）
- [x] ビルド確認（webpack compiled successfully）
- [x] テスト実行確認（9ファイル 163テスト全通過）

## 変更ファイル
- src/types.ts
- src/protocol/messages.ts
- src/constants.ts
- package.json
- src/extension.ts
- src/managers/TerminalManager.ts
- webview/TerminalPane.ts
- webview/index.ts
- webview/KeyboardHandler.ts
- webview/styles/main.css
- webview/i18n.ts
- webview/ShortcutGuide.ts
- tests/unit/webview/KeyboardHandler.test.ts
