# feature/fix-file-drop-path-insertion

## 概要
- VSCode ExplorerからファイルをD&Dした時、ペインレベルのdropハンドラが全dropイベントをstopPropagation()して遮断している問題を修正
- ファイルdropをペインレベルで直接処理する方式に変更
- DragDropHandler.ts（デッドコード）削除

## 進捗
- [x] ブランチ作成・コード読み込み
- [x] テスト作成（TDD: テストファースト）
- [x] index.ts drop/dragover/dragleave ハンドラ修正
- [x] main.css ファイルドロップターゲットCSS追加・デッドコード削除
- [x] DragDropHandler.ts 削除
- [x] ビルド確認 — エラーなし
- [x] テスト実行 — 75テスト全パス（fileDrop.test.ts: 12テスト）

## 変更ファイル
- webview/index.ts — drop/dragover/dragleave ハンドラ修正
- webview/styles/main.css — CSS追加・デッドコード削除
- webview/DragDropHandler.ts — 削除（デッドコード）
- tests/unit/webview/fileDrop.test.ts — 複数URI対応テスト5件追加
