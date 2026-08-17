# feature/font-size-adjustment

## 概要
- #7 フォントサイズ調整: Cmd+=/Cmd+-/Cmd+0 でフォントサイズ変更
- VS Code設定で永続化、レートバーにサイズ表示

## 進捗
- [x] 型定義・プロトコル
- [x] package.json（commands, keybindings, configuration）
- [x] extension.ts（コマンド登録、設定読み書き）
- [x] TerminalPane.ts（setFontSize）
- [x] index.ts（メッセージハンドラ）
- [x] KeyboardHandler.ts（xterm除外）
- [x] i18n + ShortcutGuide
- [x] RateLimitBar（フォントサイズ表示）
- [x] テスト（167テスト全通過）
- [x] ビルド確認
