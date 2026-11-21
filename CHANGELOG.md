# Changelog / 変更履歴

## [Unreleased]

### Changed / 変更
- Windows/Linux: new terminal is back to Ctrl+N (Close/VS Code terminal/Explorer stay on Ctrl+Shift) / Windows/Linux: 新規ターミナルを Ctrl+N に戻す (閉じる/VSCodeターミナル/エクスプローラーは Ctrl+Shift のまま)

## [0.0.8] - 2026-09-29

### Added / 追加
- Ctrl+Enter sends "send now" to Claude Code / Ctrl+Enter で Claude Code の割り込み送信 (send now)
  - Sent as kitty CSI u (`ESC[13;5u`) so it is distinguishable from Enter / Enter と区別できるよう CSI u 形式で送信
- Windows: Ctrl+C copies when text is selected / Windows: 選択中の Ctrl+C はコピー

### Changed / 変更
- Windows/Linux: panel actions moved to Ctrl+Shift+N/W/T/F / Windows/Linux: パネル操作を Ctrl+Shift+N/W/T/F に変更
  - Ctrl+W/T/F/N now reach Claude Code (word delete, task list, etc.) / Ctrl+W/T/F/N は Claude Code 側に渡す
- Windows/Linux: Ctrl+Left/Right moves by word instead of jumping to line start/end / Windows/Linux: Ctrl+←/→ は単語移動

### Fixed / 修正
- Windows: Ctrl+V pasted twice / Windows: Ctrl+V で 2 回貼り付けられる問題

## [0.0.7] - 2026-08-17

### Added / 追加
- Font size adjustment / フォントサイズ調整
- Status indicator on pane headers / ペインヘッダーのステータスインジケーター
  - Detects Claude CLI state from output (thinking / waiting / error / idle)
- Dynamic usage limit display / 使用量枠の動的表示
  - Renders only the quota windows returned by the API, so new quotas appear automatically
  - Fable quota support / Fable 枠に対応
  - Usage credits (extra_usage) support with currency formatting / クレジット枠に対応

### Fixed / 修正
- Windows: `claude` was not executed until Enter was pressed / Windows: Enter を押すまで `claude` が実行されない問題
  - PowerShell/conpty treats CR as Enter; now sends `\r` on Windows only
- Windows: Ctrl+V did not paste / Windows: Ctrl+V で貼り付けできない問題
  - Uses xterm's `terminal.paste()` so bracketed paste mode is preserved for multi-line pastes

## [0.0.6] - 2026-03-06

### Added / 追加
- Pane number jump & rename / ペイン番号ジャンプ & リネーム

## [0.0.5] - 2026-03-04

### Added / 追加
- Windows/Linux cross-platform support / Windows/Linux クロスプラットフォーム対応
  - Keyboard shortcuts: Ctrl+N/W/T/F, Ctrl+Shift+Arrow on Windows/Linux
  - OAuth token: env var → macOS Keychain → ~/.claude/.credentials.json fallback
  - Shortcut guide: platform-specific symbols (⌘ vs Ctrl+)
  - i18n: dynamic modifier key display
- New icon: minimal terminal grid design with green text / 新アイコン

## [0.0.1] - TBD

### Added / 追加
- Initial release / 初回リリース
- Multi-terminal grid layout / マルチターミナルグリッド表示
- Pane drag & drop reordering / パネルD&D並べ替え
- File explorer drag & drop path insertion / ファイラーD&Dパス挿入
- macOS keyboard shortcuts (Cmd+N/W/T, Cmd+Shift+Arrow, Cmd+Backspace) / macOSキーボードショートカット
- Rate limit monitoring / レート制限モニター
