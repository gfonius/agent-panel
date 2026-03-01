export class TerminalGrid {
  private container: HTMLElement;
  private paneCount: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  update(count: number): void {
    this.paneCount = count;
    if (count === 0) return;

    // 次の完全グリッドサイズに切り上げて全ペイン同サイズにする
    // 3→4(2x2), 5→6(3x2), 7→9(3x3) のように空きスロットを作る
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    this.container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    // spanを使わず全ペイン同サイズ（余ったスロットは空白）
    const children = Array.from(this.container.children) as HTMLElement[];
    children.forEach((child) => {
      child.style.gridColumn = '';
    });
  }

  get count(): number {
    return this.paneCount;
  }
}
