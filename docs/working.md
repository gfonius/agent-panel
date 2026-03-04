# feature/windows-support

## 概要
- Windows/Linux対応: ショートカットキー、資格情報取得、UI表示のクロスプラットフォーム対応
- v0.0.5ベータ公開に向けた準備

## 進捗
- [x] platform.ts: isMac()ヘルパー追加
- [x] rateLimitClient.ts: クロスプラットフォーム対応（環境変数 → Keychain → .credentials.json）
- [x] KeyboardHandler.ts: mod()抽象化でmetaKey/ctrlKey対応
- [x] index.ts: documentキーハンドラのクロスプラットフォーム対応
- [x] ShortcutGuide.ts: プラットフォーム別表示（⌘ vs Ctrl+）
- [x] i18n.ts: base.subtitleのプラットフォーム別表示
- [x] テスト作成・実行（156テスト全パス、ビルドOK）

## 変更ファイル
- src/utils/platform.ts — isMac()追加
- src/utils/rateLimitClient.ts — 3段階フォールバック（env → keychain → file）
- webview/KeyboardHandler.ts — isMacフラグ + mod()メソッド
- webview/index.ts — isMac検出 + mod()関数 + Ctrl+Up/Down macOSガード
- webview/ShortcutGuide.ts — プラットフォーム別記号
- webview/i18n.ts — modKey動的生成
- tests/unit/utils/platform.test.ts — isMac()テスト追加
- tests/unit/utils/rateLimitClient.test.ts — クロスプラットフォームテスト追加
- tests/unit/webview/KeyboardHandler.test.ts — Windows/Linuxテスト追加
