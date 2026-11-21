/**
 * Chromium 150 (VS Code 1.147) 以降、canvas の `ctx.font` に先頭の空白がある値
 * (例: " normal 24px Menlo") を入れると無効として捨てられ、既定の "10px sans-serif" のまま残る。
 *
 * xterm.js 5.5 の TextureAtlas は斜体でないとき `${''} ${fontWeight} ${size}px ${family}` と
 * 組み立てるため必ず先頭に空白が付き、WebGL レンダラーの文字テクスチャが 10px で描かれる。
 * その結果、マスの大きさは正しいのに字だけが小さく、字間がスカスカに見える。
 *
 * CanvasRenderingContext2D / OffscreenCanvasRenderingContext2D の `font` setter を包み、
 * 代入前に前後の空白を落とす。
 */

/** canvas の font に入れる値を、Chromium が受け付ける形に整える */
export function normalizeCanvasFont(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

type CtxProto = { prototype: object } | undefined;

/** font setter を一度だけ包む。包んだら true */
export function patchCanvasFontSetter(ctor: CtxProto): boolean {
  if (!ctor) return false;
  const proto = ctor.prototype as Record<string | symbol, unknown>;
  const marker = Symbol.for('agentPanel.canvasFontFix');
  if (proto[marker]) return false;
  const desc = Object.getOwnPropertyDescriptor(proto, 'font');
  if (!desc || !desc.set || !desc.get || !desc.configurable) return false;
  const origSet = desc.set;
  Object.defineProperty(proto, 'font', {
    configurable: true,
    enumerable: desc.enumerable,
    get: desc.get,
    set(this: unknown, value: unknown) {
      origSet.call(this, normalizeCanvasFont(value));
    },
  });
  proto[marker] = true;
  return true;
}

/** webview で 1 回呼ぶ */
export function installCanvasFontFix(): void {
  const g = globalThis as Record<string, unknown>;
  patchCanvasFontSetter(g.CanvasRenderingContext2D as CtxProto);
  patchCanvasFontSetter(g.OffscreenCanvasRenderingContext2D as CtxProto);
}
