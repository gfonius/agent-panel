# Claude Codeを4並列で回したくてVS Code拡張を自作した話

Claude Codeの並列実行といえば、tmuxやghosttyで複数ターミナルを開くのが定番になりつつある。でも自分は逆のアプローチを取った。**エディタの外に出るんじゃなくて、VS Codeの中に全部入れる**という方向だ。

この記事では、なぜそのアプローチを選んだのか、どう実装したのか、そして実際に使ってみてどうだったのかを書く。

---

## tmuxアプローチの限界

まず前提として、tmux + Claude Codeの構成は優秀だ。枯れた技術で安定しているし、ペインの分割・移動も自在にできる。自分も最初はこの構成で運用していた。

ただ、使い込むうちにいくつかの摩擦に気づいた。

**1. VS Codeとの行き来がストレスになる**

Claude Codeがファイルパスを出力する。それを見てVS Codeで開く。またtmuxに戻る。Claudeが別のファイルに言及する。またVS Codeに切り替える──この往復が、4並列で回していると指数的に増える。

**2. セッション管理が手動**

Claude Codeには `--resume` というセッション復元機能がある。だが複数インスタンスを同時に動かしていると、どのターミナルのresume IDがどれだったかを覚えておくのは現実的じゃない。結局、再開のたびにコンテキストを失う。

**3. レート制限の把握が難しい**

Max Planで4並列するとAPI使用量が一気に膨らむ。「今どれくらい使ってるのか」を確認するには別のツールやダッシュボードを開く必要があった。

これらは個別には小さな不便だけど、毎日8時間使っていると積み重なる。

---

## 逆のアプローチ：VS Code内で完結させる

そこで作ったのが **Agent Panel** というVS Code拡張だ。

コンセプトはシンプルで、**VS Codeのエディタ領域にターミナルグリッドを展開して、その中でClaude Codeを並列実行する**というもの。

![Agent Panelのスクリーンショット](※ここにスクリーンショット)

tmuxが「エディタの外に出て並列化する」アプローチなら、こちらは「エディタの中に並列化を持ち込む」アプローチになる。

### なぜVS Code内なのか

単にUIの好みの話ではない。VS Code内に統合することで、以下が可能になる。

- **Explorerからのファイルドラッグ&ドロップ**：ファイルをペインにドロップすると、そのパスがClaude Codeの入力に挿入される
- **ファイルパスのCmd+Click**：Claude Codeが出力したファイルパスをクリックすると、VS Codeのエディタで直接開ける
- **セッションの自動復元**：終了時にresume IDを自動キャプチャし、次回起動時に復元できる
- **レート制限のリアルタイム監視**：API使用量をパネル下部に常時表示

こういった統合は、ターミナルマルチプレクサの外側に立つtmuxでは原理的に難しい。

---

## アーキテクチャ

技術的な話に入る。Agent Panelの構成は、大きく3つのレイヤーに分かれる。

```
┌──────────────────────────────────────┐
│         VS Code Extension Host       │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Terminal  │  │  Session/Rate    │  │
│  │ Manager   │  │  Limit Manager   │  │
│  │ (node-pty)│  │                  │  │
│  └─────┬─────┘  └────────┬─────────┘  │
│        │   IPC (postMessage)   │       │
├────────┼───────────────────────┼───────┤
│        ▼                       ▼       │
│         Webview (iframe)              │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Terminal  │  │  Grid Layout     │  │
│  │ Pane      │  │  + D&D           │  │
│  │ (xterm.js)│  │  + Keyboard Nav  │  │
│  └──────────┘  └──────────────────┘  │
└──────────────────────────────────────┘
```

### Extension Host側：node-ptyでシェルを生成

ターミナルの実体はExtension Host（Node.jsプロセス）側で動くnode-ptyだ。

```typescript
create(directory: string, resumeId?: string): string {
    const id = crypto.randomUUID();
    const shell = getDefaultShell();
    const ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: directory,
        env: { ...process.env, TERM: 'xterm-256color' },
    });

    // シェル起動後にClaude CLIを自動実行
    setTimeout(() => {
        if (resumeId) {
            ptyProcess.write(`claude --resume ${resumeId}\n`);
        } else {
            ptyProcess.write('claude\n');
        }
    }, 500);

    return id;
}
```

ポイントが2つある。

**1つ目は、node-ptyの遅延読み込み。** node-ptyはネイティブモジュールなので、VS CodeのElectronとABIが一致しないとクラッシュする。トップレベルでimportすると拡張自体が起動しなくなるため、`require()` で遅延読み込みしている。

```typescript
function loadNodePty(): typeof import('node-pty') {
    return require('node-pty');
}
```

**2つ目は、`claude` コマンドの自動実行。** ターミナル作成時にClaude CLIを自動起動するので、ユーザーはフォルダを選ぶだけでいい。resume IDがあれば `--resume` 付きで起動する。

### Webview側：xterm.jsでターミナルを描画

Webview側はxterm.jsを使ってターミナルを描画する。VS Codeのカラーテーマに自動追従するため、CSS変数から色情報を取得している。

```typescript
function getXtermTheme() {
    const style = getComputedStyle(document.documentElement);
    return {
        background:
            style.getPropertyValue('--vscode-terminal-background').trim() ||
            style.getPropertyValue('--vscode-editor-background').trim() ||
            '#1e1e1e',
        foreground:
            style.getPropertyValue('--vscode-terminal-foreground').trim() ||
            style.getPropertyValue('--vscode-editor-foreground').trim() ||
            '#cccccc',
        // ... ANSI 16色も同様にVS Codeテーマから取得
    };
}
```

WebGLレンダラーを優先的にロードし、GPU非対応環境ではCanvasにフォールバックする。4ペイン同時描画でもカクつかないのはWebGLのおかげだ。

### IPC：Extension HostとWebviewの通信

VS Code拡張のWebviewはiframeで動くため、Extension Hostと直接メモリを共有できない。すべての通信は `postMessage` によるメッセージパッシングになる。

```typescript
// 型定義（一部抜粋）
type HostToWebviewMessage =
    | { type: 'terminalCreated'; terminalId: string; directory: string }
    | { type: 'terminalOutput'; terminalId: string; data: string }
    | { type: 'terminalClosed'; terminalId: string }
    | { type: 'rateLimitUpdate'; fiveHour: {...}; sevenDay: {...} }
    | { type: 'quitting' }
    // ...

type WebviewToHostMessage =
    | { type: 'ready' }
    | { type: 'terminalInput'; terminalId: string; data: string }
    | { type: 'terminalResize'; terminalId: string; cols: number; rows: number }
    | { type: 'requestQuit' }
    // ...
```

型付きのメッセージプロトコルにすることで、Host側とWebview側の不整合をコンパイル時に検出できる。

---

## 技術的に面白かった3つのポイント

### 1. resume IDの自動キャプチャ

これがこの拡張の一番の技術的チャレンジだった。

Claude CLIは `/exit` コマンドで終了すると、以下のような出力を返す。

```
To resume this conversation, run:
claude --resume a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Agent Panelの「終了」ボタンを押すと、**全ターミナルに対して `/exit` を並列送信し、出力からresume IDを正規表現でキャプチャする**。

```typescript
async gracefulClose(terminalId: string): Promise<{ directory: string; resumeId?: string }> {
    const terminal = this.terminals.get(terminalId);
    return new Promise((resolve) => {
        let outputBuffer = '';

        // 出力をバッファリング
        const listener = terminal.pty.onData((data: string) => {
            outputBuffer += data;
        });

        // /exit を送信
        terminal.pty.write('/exit\n');

        // 5秒待ってからresume IDを解析
        setTimeout(() => {
            listener.dispose();
            const resumeId = parseResumeId(outputBuffer);
            terminal.pty.kill();
            resolve({ directory, resumeId });
        }, 5000);
    });
}
```

```typescript
// resume IDのパース
export function parseResumeId(output: string): string | undefined {
    const match = output.match(/claude\s+(?:--resume|-r)\s+([0-9a-f-]{36})/i);
    return match?.[1];
}
```

キャプチャしたresume IDはVS Codeの `globalState` に保存される。次回Agent Panelを開いたとき「前回のセッションを復元しますか？」というダイアログが表示され、「復元する」を選ぶと各ターミナルが `claude --resume <id>` で起動する。

4つのClaude Codeセッションを同時に復元できるのは、tmuxでは実現困難な体験だ。

### 2. グリッドレイアウトの自動計算

ペイン数が変わるたびに、グリッドのレイアウトを再計算する。方針は「できるだけ正方形に近い配置にする」こと。

```
1ペイン: 1×1
2ペイン: 2×1
3ペイン: 2×2（1つ空き）
4ペイン: 2×2
5ペイン: 3×2（1つ空き）
6ペイン: 3×2
```

CSS Gridの `grid-template-columns` と `grid-template-rows` を動的に設定することで、ペインの追加・削除にスムーズに対応している。

### 3. VS Code Explorerとのドラッグ&ドロップ統合

VS CodeのExplorerからファイルやフォルダをAgent Panelのペインにドラッグ&ドロップすると、そのパスがClaude CLIの入力に挿入される。

これは地味だけど実用上かなり効く。「このファイルを読んで」とClaude Codeに伝えるとき、パスを手打ちする代わりにExplorerからドラッグするだけでいい。

実装上の注意点として、VS Code内部のドラッグイベントはMIMEタイプが不定なので、`text/uri-list` と `text/plain` の両方をパースしてファイルパスを抽出している。

---

## レート制限の可視化

Max Planで並列実行すると、APIの使用量が急速に増える。Agent Panelはパネル下部にレート制限バーを常時表示する。

- **5時間枠**：短期的な使用量
- **7日間枠**：長期的な使用量
- **7日間Sonnet枠**：Sonnetモデルの使用量（該当する場合）

使用率に応じて緑→黄→赤にバーの色が変わる。リセットまでの残り時間もカウントダウン表示される。

OAuth認証情報はmacOSのKeychainからClaude Codeの保存済みトークンを取得するため、追加のログイン操作は不要だ。

```typescript
function getOAuthToken(): string | null {
    const result = execSync(
        'security find-generic-password -s "Claude Code-credentials" -a "$(whoami)" -w',
        { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    const credentials = JSON.parse(result);
    return credentials?.claudeAiOauth?.accessToken ?? null;
}
```

---

## tmux vs Agent Panel：どちらを選ぶか

最後に正直な比較をしておく。

| 観点 | tmux / ghostty | Agent Panel |
|------|---------------|-------------|
| セットアップ | シェルだけで完結 | VS Code必須 |
| 安定性 | 枯れている | 開発中（v0.0.3） |
| カスタマイズ性 | 無限 | 拡張の範囲内 |
| SSH先での利用 | そのまま使える | 不可 |
| VS Code統合 | なし | ファイルD&D、Cmd+Click、テーマ追従 |
| セッション復元 | 手動スクリプト | 自動 |
| レート制限監視 | 別ツール必要 | 内蔵 |

**tmuxが向いているケース：**
- リモートサーバーでClaude Codeを動かす
- VS Code以外のエディタを使っている
- 既にtmuxの設定を極めている

**Agent Panelが向いているケース：**
- VS Codeがメインエディタ
- セッションの中断・復元を頻繁に行う
- レート制限を常に意識したい
- ファイル指定の手間を減らしたい

どちらが正解ということはない。ただ、「Claude Codeの並列化 = tmux」一択だった選択肢に、別のアプローチが加わったということだ。

---

## まとめ

Claude Codeを本格的に使い始めると、並列実行の需要が自然に生まれる。tmuxやghosttyはその需要に応える定番の選択肢だ。

Agent Panelは逆方向から同じ問題にアプローチした。VS Codeの中にターミナルグリッドを組み込むことで、エディタとの統合から生まれるメリットを取りにいった。特にセッションの自動復元とレート制限の可視化は、並列運用の日常的なペインポイントを直接解決する。

node-pty + xterm.js + VS Code Webviewという構成は、Claude Code以外のCLIツールにも応用できるので、似たようなことをやりたい人の参考になれば嬉しい。

**リポジトリ**: [GitHub - gfonius/agent-panel](https://github.com/gfonius/agent-panel)
**VS Code Marketplace**: ※リンク

---

*この記事で紹介したAgent Panelはオープンソースで公開しています。Issue・PRお待ちしています。*
