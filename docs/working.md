# v0.0.9 リリース

## 完了済みfeature
- [x] feature/windows-ctrl-n — Windows/Linux の新規ターミナルを Ctrl+N に戻す
- [x] fix/webgl-canvas-font — VS Code 1.147 (Chromium 150) で WebGL の字が約半分の大きさになる問題

## リリース作業
- [x] package.json バージョン 0.0.9
- [x] CHANGELOG.md 更新
- [x] develop / main へマージ、タグ v0.0.9
- [x] .vsix パッケージ生成 (先に `npx webpack --mode production`。`vsce package` はビルドしない)

## 未リリース・持ち越し
- fix/resize-observer-loop — develop と3ファイルでコンフリクト（6ヶ月前のブランチ）。要手動統合
- xterm.js が kitty keyboard の問い合わせ (CSI ? u) に答えないため、Claude Code のヒントは
  「ctrl+x ctrl+s to send now」と表示される（Ctrl+Enter 自体は効く）
- canvasFontFix は xterm.js 側が先頭の空白を出さなくなったら不要。xterm を上げるときに見直す

## 検証状況
- Windows: テスト262件通過・ビルド成功
- WebGL の字の大きさ: 隔離したデバッグ用 VS Code 1.147.0 (Chromium 150.0.7871.250、表示倍率150%、fontSize 16) で
  旧版は字が約半分の大きさで再現、修正版は正常。WebGL の canvas で描かれていることも確認
- Chromium 150 の canvas: `" normal 24px Menlo, …"` は捨てられて `10px sans-serif` のまま、先頭の空白なしは通ることを実測
- Mac は未確認 (空白を落としても指定の意味は変わらないので、古い Chromium でも同じ描画になる見込み)
