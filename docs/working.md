# v0.0.7 リリース準備

## 完了済みfeature
- [x] feature/font-size-adjustment — フォントサイズ調整
- [x] feature/status-indicator — ペインヘッダーのステータスインジケーター
- [x] feature/usage-limits — 使用量枠の動的化・Fable枠・クレジット枠対応
- [x] fix/windows-terminal-input — Windows の起動時Enter問題 / Ctrl+V問題

## リリース作業
- [x] package.json バージョン 0.0.7
- [x] CHANGELOG.md 更新（抜けていた 0.0.6 分も補完）
- [ ] develop / main へマージ、タグ v0.0.7
- [ ] .vsix パッケージ生成

## 未リリース・持ち越し
- fix/resize-observer-loop — develop と3ファイルでコンフリクト（6ヶ月前のブランチ）。要手動統合
- Windows の Ctrl+W / Ctrl+F / Ctrl+N / Ctrl+T がターミナル操作と衝突する件。操作体系の変更になるため別途検討

## 検証状況
- macOS: テスト236件通過・ビルド成功・実機確認済み
- Windows: **実機未検証**。開発環境が macOS のため、
  「起動時Enter不要」「Ctrl+V貼り付け」「複数行貼り付けが1コマンドにまとまるか」は
  ユーザー側での確認が必要
