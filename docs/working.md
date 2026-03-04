# feature/recent-directories-picker

## 概要
- 新しいパネルを開く時（Cmd+N / "Open Folder"ボタン）にFinderの代わりに最近開いたディレクトリのQuickPick一覧を表示
- 末尾に「Browse...」でFinderにフォールバック
- 初回（履歴なし）はFinderが直接開く

## 影響範囲
- `src/constants.ts` — 定数追加
- `src/managers/RecentDirectoriesManager.ts` — 新規
- `src/utils/directoryPicker.ts` — 新規
- `src/extension.ts` — showOpenDialogをQuickPickに差し替え
- `tests/unit/managers/RecentDirectoriesManager.test.ts` — 新規

## 進捗
- [x] constants.ts に定数追加
- [x] RecentDirectoriesManager テスト作成（TDD）
- [x] RecentDirectoriesManager 実装
- [x] directoryPicker ユーティリティ作成
- [x] extension.ts 差し替え
- [x] テスト実行・ビルド確認（141テスト全パス、ビルドOK）

## 課題
- なし（現時点）

## 変更ファイル
- src/constants.ts
- src/managers/RecentDirectoriesManager.ts
- src/utils/directoryPicker.ts
- src/extension.ts
- tests/unit/managers/RecentDirectoriesManager.test.ts
