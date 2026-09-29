# v0.0.8 リリース

## 完了済みfeature
- [x] feature/claude-code-keys — Ctrl+Enter の send now / Windows 二重貼り付け修正 / 選択中 Ctrl+C のコピー
- [x] feature/windows-shortcut-remap — Windows/Linux のパネル操作を Ctrl+Shift に、Ctrl+←/→ を単語移動に

## リリース作業
- [x] package.json バージョン 0.0.8
- [x] CHANGELOG.md 更新
- [x] develop / main へマージ、タグ v0.0.8
- [x] .vsix パッケージ生成

## 未リリース・持ち越し
- fix/resize-observer-loop — develop と3ファイルでコンフリクト（6ヶ月前のブランチ）。要手動統合
- xterm.js が kitty keyboard の問い合わせ (CSI ? u) に答えないため、Claude Code のヒントは
  「ctrl+x ctrl+s to send now」と表示される（Ctrl+Enter 自体は効く）

## 検証状況
- Windows: テスト256件通過・ビルド成功
- Ctrl+Enter の send now は node-pty + claude.exe で実測（実行中ターンへの割り込み送信を確認）
- Windows 実機の VSCode 上での貼り付け 1 回化・Ctrl+Shift 系は**ユーザー確認待ち**
