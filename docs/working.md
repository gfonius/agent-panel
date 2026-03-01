# feature/initial-setup

## 概要
- VSCode拡張「Claude Panel」の全9フェーズ実装完了
- node-pty + xterm.js によるWebview内ターミナル管理
- グリッド分割、セッション永続化、レート制限モニター

## フェーズ進捗 - 全完了

- [x] Phase 1: プロジェクト基盤
- [x] Phase 2: ステータスバー + パネル表示
- [x] Phase 3: 単一ターミナル動作
- [x] Phase 4: マルチターミナル・グリッド
- [x] Phase 5: D&D（VSCode Explorer D&D対応、Finder D&Dは非対応）
- [x] Phase 6: キーボードナビゲーション
- [x] Phase 7: セッション永続化
- [x] Phase 8: レート制限モニター（5h/7d/Sonnet + リセット日時）
- [x] Phase 9: 仕上げ

## 追加実装（フェーズ後）

- [x] macOSキーバインド修正（Ctrl→Cmd）
- [x] ペイン開時にclaude自動実行
- [x] グリッド均等化（spanなし、3ペイン→2x2で空白スロット）
- [x] 初期画面にOpen Folderボタン追加
- [x] レート制限バー右に「+」ボタン追加
- [x] Shift+Enter改行対応（LF送信 + TERM_PROGRAM=vscode）
- [x] Cmd+Arrow行頭/行末カーソル移動
- [x] Option+Arrow単語単位カーソル移動
- [x] Ctrl+Up/Downエスケープシーケンス対応
- [x] ユニットテスト追加（vitest, 54テスト）
- [ ] restart terminal機能（今後対応）

## ショートカット一覧

| キー | macOS | 機能 |
|------|-------|------|
| 新規ターミナル | Cmd+N | フォルダーピッカー |
| ペイン閉じる | Cmd+W | フォーカス中のペイン |
| ペイン移動 | Cmd+Shift+Arrow | 上下左右 |
| VSCodeターミナル | Cmd+T | フォーカス中をVSCodeで開く |
| 改行 | Shift+Enter | Claude CLI入力で改行 |
| 行頭/行末 | Cmd+Left/Right | カーソル移動 |
| 単語移動 | Option+Left/Right | カーソル移動 |

## 解決済みの課題
- node-pty Electronリビルド: `npx @electron/rebuild --version 39.3.0 -w node-pty`
- パスのスペース問題: ディレクトリリネーム
- CLAUDECODE環境変数除外（ネスト防止）
- node-pty遅延読み込み（ABI不一致対策）
- macOSでCtrl→Cmdキーバインド統一
- Finder D&D非対応（webviewサンドボックス制約）
- TERM_PROGRAM=vscode設定でClaude CLI互換性確保

## ビルド・インストール
```bash
npm run compile    # ビルド
npm test           # テスト実行
npx vsce package   # .vsix作成
code --install-extension claude-panel-0.0.1.vsix  # インストール
```
