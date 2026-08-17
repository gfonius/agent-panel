# feature/usage-limits

## 概要
Claude の使用量枠の仕様変更に追従する。固定3枠のハードコードをやめ、
API が返した枠だけを動的に描画する方式へ変更する。

## 背景（調査結果）
Claude Code CLI v2.1.228 のバイナリおよび 2月版 cli.js から確認:

- `/api/oauth/usage` が返しうる枠キー
  - `five_hour` … "Current session"
  - `seven_day` … "Current week (all models)"
  - `seven_day_opus` … "Opus limit"
  - `seven_day_sonnet` … "Current week (Sonnet only)" / Pro・Enterprise では "weekly limit"
  - `seven_day_oauth_apps` … OAuth アプリ経由
  - `cinder_cove` … "Fable 5 limit"（2月版には存在せず、後から追加された枠）
  - `extra_usage` … "usage credit limit"（クレジット制・別構造）
- どの枠が返るかは **プランと時期に依存**。CLI 自身も
  `limit && <Row/>` で「返ってきた枠だけ描画」している。

### 枠オブジェクトの型
```ts
{ utilization: number | null, resets_at: string | null }
```
- `utilization === null` の枠は行ごと描画しない（CLI と同じ挙動）
- `resets_at` も null 許容

### extra_usage の型
```ts
{ is_enabled: boolean, monthly_limit: number | null, used_credits: number, utilization: number }
```
- `monthly_limit === null` → "Unlimited"
- Pro / Max プランのみ表示

## 現行実装の問題
1. `five_hour` / `seven_day` / `seven_day_sonnet` の3枠固定 → Fable・Opus・クレジット枠が表示されない
2. `utilization` / `resets_at` の null を考慮していない → NaN・0% 誤表示の可能性
3. 枠が増減するたびに型と UI の両方を書き換える必要がある

## 方針
枠を配列化し、UI は存在する枠だけ行を生やす。未知キーはキー名フォールバックで表示。

## 進捗
- [x] 型定義変更 (src/types.ts)
- [x] ラベルマッピング追加 (src/constants.ts)
- [x] レスポンスパース動的化 (src/utils/rateLimitClient.ts)
- [x] 既存テスト更新 + 新規テスト (tests/unit/utils/rateLimitClient.test.ts) — 13→26テスト
- [x] protocol 型更新 (src/protocol/messages.ts)
- [x] UI 動的レンダリング (webview/RateLimitBar.ts)
- [x] extra_usage 表示対応（Intl.NumberFormatで通貨整形、$ 決め打ちなし）
- [x] スタイル調整 (webview/styles/main.css)
- [x] i18n ラベル追加 (webview/i18n.ts に rate.credit / rate.unlimited)
- [x] テスト・ビルド確認（`npm run test` 176件全通過 / `npm run compile` 成功）

## 実データ確認結果（判明した仕様）
`/api/oauth/usage` の実レスポンスを確認できた。想定と異なっていた点:

- **対象外の枠はキーの値そのものが `null`** で返る（`{ utilization: null }` ではない）。
  非null で返ったのは `five_hour` / `seven_day` / `nimbus_quill` の3枠のみ。
  null で返った枠: `seven_day_oauth_apps` / `seven_day_opus` / `seven_day_sonnet` /
  `seven_day_cowork` / `seven_day_omelette` / `tangelo` / `iguana_necktie` /
  `omelette_promotional` / `cinder_cove` / `amber_ladder`
  → 判定を `v !== null && typeof v === 'object' && typeof v.utilization === 'number'` に変更。
- **`nimbus_quill` が実際の Fable 枠**と判明（ユーザーのWeb画面の「5h/7d/Fable」の3枠と一致）。
  `cinder_cove` は将来用にラベルマップへ残しつつ、`RATE_LIMIT_ORDER` では `nimbus_quill` を先に配置。
- 枠オブジェクトには `limit_dollars` / `used_dollars` / `remaining_dollars` も含まれる。
  `RateLimitWindow` にオプショナルフィールドとして追加（今回はパースのみ、UI描画は行わない）。
- `extra_usage` は当初想定より複雑で、`currency` / `decimal_places` / `spend_limit_reached` /
  `disabled_reason` などを含む。金額表示は `$` 決め打ちをやめ、`Intl.NumberFormat` で
  `currency` と `decimal_places` を使って整形（欠落時は 'USD' / 2 にフォールバック）。
- トップレベルには他に `limits`（配列）/ `spend`（オブジェクト）/
  `member_dashboard_available`（bool）も含まれるが、今回は未使用。誤って枠として
  拾わないことをテストで保証済み。

## 未確認事項
- なし（実データで検証済み）

## レビュー指摘のバグ修正（TDD）

コーディネーターのレビューで2件のバグを指摘され、TDDで修正した。

### バグ1: `updateLocale()` がクレジット行を再描画しない
- 症状: クレジット行のラベル (`rate.credit`) / "Unlimited" (`rate.unlimited`) は
  行構築時に文字列として DOM に焼き付くため、言語切替 (`updateLocale()`) 時に
  再生成されず旧言語のまま残っていた。
- 修正: `webview/RateLimitBar.ts`
  - `lastData: RateLimitData | null` を追加し、`update()` で直近データを保持
  - 行生成部分を `private renderRows(data)` に切り出し、`update()` と
    `updateLocale()` の両方から呼び出す
  - `errorMessage.style.display` の切り替えは `renderRows()` に含めず `update()` 側にのみ残し、
    `updateLocale()` 呼び出しではエラー表示状態を変更しないようにした
  - `lastData` が null（初回 update 前）でも `updateLocale()` は安全に何もしない

### バグ2: 不正な `currency` で `Intl.NumberFormat` が RangeError を投げる
- 症状: `parseExtraUsage()` は `typeof eu.currency === 'string'` しか検証しておらず、
  空文字や不正な長さの文字列がそのまま `ExtraUsage.currency` に入り、
  `formatExtraUsage()` の `Intl.NumberFormat({ currency })` が RangeError を投げて
  `update()` 全体が中断していた。
- 修正（二重防御）:
  1. パース側 `src/utils/rateLimitClient.ts`: `normalizeCurrency()` で ISO 4217 の
     3文字英字コード（`/^[A-Za-z]{3}$/`）のみ許可し、それ以外は `'USD'` にフォールバック
     （大文字化して保持）。`normalizeDecimalPlaces()` で 0〜20 の整数のみ許可、それ以外は `2`。
  2. 表示側 `webview/RateLimitBar.ts`: `formatExtraUsage()` を DOM 非依存の純粋関数として
     `export` し、`Intl.NumberFormat` 呼び出しを try/catch で保護。失敗時は
     `"12.30 US / 50.00 US"` のように通貨コードを後置した素の数値表記にフォールバック
     （フォールバック内の `decimalPlaces` も 0〜20 の範囲外なら 2 に再度サニタイズ）

### 追加テスト
- `tests/unit/utils/rateLimitClient.test.ts`: 26 → 37テスト
  （currency 正規化5件 + decimalPlaces 境界値・範囲外テスト、`it.each` 含む）
- `tests/unit/webview/RateLimitBar.test.ts`（新規）: 7テスト
  `formatExtraUsage()` を DOM 非依存の純粋関数として直接テスト
  （正常系のIntl整形・Unlimited表示・不正currencyでのフォールバック・
  decimalPlaces異常値のサニタイズを検証）

### DOMテストについて（報告事項）
`RateLimitBar` クラス自体（`updateLocale()` 呼び出し時に実際にDOMの行が
再構築されるか等）は `document.createElement` / `innerHTML` / `querySelector` /
`classList` に依存しているが、本リポジトリの `vitest.config.ts` は
`environment: 'node'` で jsdom 等のDOM実装が devDependencies に存在しない
（既存の `tests/unit/webview/*.test.ts` も DOM を使わない純粋関数のみテストする方針）。
そのため `updateLocale()` のクラスレベルの再描画自体の自動テストは追加していない。
`formatExtraUsage()` を純粋関数として切り出すことで、少なくとも文字列整形ロジックは
自動テストで担保した。クラスの DOM 挙動まで自動テストしたい場合は `jsdom`/`happy-dom`
の追加とテスト環境設定の変更が別途必要になる。

## 進捗（バグ修正後）
- [x] バグ1修正: `updateLocale()` でのクレジット行再描画 (webview/RateLimitBar.ts)
- [x] バグ2修正: currency/decimalPlaces のバリデーション（パース側・表示側の二重防御）
- [x] TDD: 先にテストを書いて red を確認してから実装
- [x] `npm run test` 全通過（194件: 既存176 + 新規18）
- [x] `npm run compile` 成功
