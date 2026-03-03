# feature/quit-and-resume

## 概要
- RateLimitBarの「+」ボタン右に「終了」ボタンを追加
- 押すと全ターミナルに /exit を送信し、resume IDを取得・保存
- 次回起動時にそのIDからセッション復元（既存インフラ活用）

## 進捗
- [x] ブランチ作成・コード読み込み
- [x] protocol/messages.ts — requestQuit, quitting メッセージ型追加
- [x] i18n.ts — rate.quitTitle, quit.overlay キー追加
- [x] RateLimitBar.ts — 終了ボタン追加
- [x] main.css — .rate-limit-bar__quit, .quit-overlay スタイル
- [x] webview/index.ts — quit関数、quittingメッセージ処理
- [x] extension.ts — requestQuit ハンドラ
- [x] TerminalManager.ts — gracefulDisposeAll並列化、exit通知抑制
- [x] ビルド確認 — エラーなし
- [x] テスト実行 — 133テスト全パス

## 変更ファイル
- src/protocol/messages.ts — requestQuit, quitting メッセージ型追加
- webview/i18n.ts — rate.quitTitle, quit.overlay 翻訳キー追加
- webview/RateLimitBar.ts — ⏻終了ボタンHTML/クリック/locale対応
- webview/styles/main.css — .rate-limit-bar__quit, .quit-overlay スタイル
- webview/index.ts — quit()関数、quittingオーバーレイ表示
- src/extension.ts — requestQuitハンドラ (gracefulDisposeAll → save → dispose)
- src/managers/TerminalManager.ts — suppressExitNotifications, gracefulDisposeAll並列化
