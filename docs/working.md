# v0.0.11 リリース

## 完了済みfeature
- [x] feature/spawn-helper-permission — macOS でターミナルを作れない (`posix_spawnp failed`)
  - node-pty の `prebuilds/darwin-*/spawn-helper` は配布物の時点で 644 (実行権限なし)
  - Mac で vsix を作ると `build/Release/spawn-helper` (755) が入るので表に出なかった。
    Windows で作った v0.0.10 は `build/Release` に conpty しか無く、prebuilds 側を使って落ちた
  - `loadNodePty()` の初回に `src/utils/ensureSpawnHelper.ts` で
    `prebuilds/<platform>-<arch>/spawn-helper` と `build/Release/spawn-helper` に実行権限を付ける。
    win32 は何もしない。失敗しても console.warn だけでターミナル作成は続ける
  - webpack では node-pty が external なので、場所は `__non_webpack_require__` で解決する

## リリース作業
- [ ] package.json バージョン 0.0.11
- [ ] CHANGELOG.md 更新
- [ ] develop / main へマージ、タグ v0.0.11
- [ ] .vsix パッケージ生成 (Mac で作る。先に `npx webpack --mode production`。`vsce package` はビルドしない)
- [ ] VS Code に入れて実機確認

## 未リリース・持ち越し
- fix/resize-observer-loop — develop と3ファイルでコンフリクト（6ヶ月前のブランチ）。要手動統合
- xterm.js が kitty keyboard の問い合わせ (CSI ? u) に答えないため、Claude Code のヒントは
  「ctrl+x ctrl+s to send now」と表示される（Ctrl+Enter 自体は効く）
- canvasFontFix は xterm.js 側が先頭の空白を出さなくなったら不要。xterm を上げるときに見直す

## 検証状況
- Windows: テスト267件通過・ビルド成功
- Fable の使用量: 実 API (2026-11-22) で 7d 28% と Fable 39% (limits:weekly_scoped:Fable) の 2 本が出ることを確認
- WebGL の字の大きさ: 隔離したデバッグ用 VS Code 1.147.0 (Chromium 150.0.7871.250、表示倍率150%、fontSize 16) で
  旧版は字が約半分の大きさで再現、修正版は正常。WebGL の canvas で描かれていることも確認
- Chromium 150 の canvas: `" normal 24px Menlo, …"` は捨てられて `10px sans-serif` のまま、先頭の空白なしは通ることを実測
- Mac は未確認 (空白を落としても指定の意味は変わらないので、古い Chromium でも同じ描画になる見込み)
