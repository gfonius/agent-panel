# feature/status-indicator

## 概要
- #8 ステータスインジケーター: 各ターミナルペインのヘッダーにClaude Codeの状態をドットで表示
- ANSIパターン解析でCLI出力から状態検出（thinking/waiting/error/idle）

## 進捗
- [x] statusDetector.ts + テスト (TDD) — 24テスト
- [x] messages.ts (型追加)
- [x] TerminalManager.ts (統合)
- [x] extension.ts (配線)
- [x] TerminalPane.ts (UI)
- [x] index.ts (ハンドラ)
- [x] main.css (スタイル)
- [x] ビルド・テスト確認 — 187テスト全通過、ビルド成功

## 変更ファイル
- src/utils/statusDetector.ts (新規)
- tests/unit/utils/statusDetector.test.ts (新規)
- src/protocol/messages.ts
- src/managers/TerminalManager.ts
- src/extension.ts
- webview/TerminalPane.ts
- webview/index.ts
- webview/styles/main.css
