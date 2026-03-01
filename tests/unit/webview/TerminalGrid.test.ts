import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalGrid } from '../../../webview/TerminalGrid';

// Minimal HTMLElement mock sufficient for TerminalGrid
function makeContainer(childCount: number = 0): HTMLElement {
  const children: HTMLElement[] = Array.from({ length: childCount }, () => ({
    style: { gridColumn: 'initial' },
  } as unknown as HTMLElement));

  return {
    style: { gridTemplateColumns: '', gridTemplateRows: '' },
    children,
    get childElementCount() { return children.length; },
    appendChild(child: HTMLElement) { children.push(child); },
  } as unknown as HTMLElement;
}

describe('TerminalGrid', () => {
  let container: HTMLElement;
  let grid: TerminalGrid;

  beforeEach(() => {
    container = makeContainer();
    grid = new TerminalGrid(container);
  });

  it('has count 0 before any update', () => {
    expect(grid.count).toBe(0);
  });

  it('does nothing when count is 0', () => {
    grid.update(0);
    expect(container.style.gridTemplateColumns).toBe('');
    expect(container.style.gridTemplateRows).toBe('');
  });

  describe('grid layout for various pane counts', () => {
    it('1 pane → 1x1 grid', () => {
      container = makeContainer(1);
      grid = new TerminalGrid(container);
      grid.update(1);
      expect(container.style.gridTemplateColumns).toBe('repeat(1, 1fr)');
      expect(container.style.gridTemplateRows).toBe('repeat(1, 1fr)');
      expect(grid.count).toBe(1);
    });

    it('2 panes → 2 cols, 1 row', () => {
      container = makeContainer(2);
      grid = new TerminalGrid(container);
      grid.update(2);
      // ceil(sqrt(2)) = 2 cols, ceil(2/2) = 1 row
      expect(container.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
      expect(container.style.gridTemplateRows).toBe('repeat(1, 1fr)');
    });

    it('3 panes → 2x2 grid (4th slot empty)', () => {
      container = makeContainer(3);
      grid = new TerminalGrid(container);
      grid.update(3);
      // ceil(sqrt(3)) = 2 cols, ceil(3/2) = 2 rows
      expect(container.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
      expect(container.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    });

    it('4 panes → 2x2 grid', () => {
      container = makeContainer(4);
      grid = new TerminalGrid(container);
      grid.update(4);
      // ceil(sqrt(4)) = 2 cols, ceil(4/2) = 2 rows
      expect(container.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
      expect(container.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    });

    it('5 panes → 3 cols, 2 rows', () => {
      container = makeContainer(5);
      grid = new TerminalGrid(container);
      grid.update(5);
      // ceil(sqrt(5)) = 3 cols, ceil(5/3) = 2 rows
      expect(container.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
      expect(container.style.gridTemplateRows).toBe('repeat(2, 1fr)');
    });

    it('9 panes → 3x3 grid', () => {
      container = makeContainer(9);
      grid = new TerminalGrid(container);
      grid.update(9);
      // ceil(sqrt(9)) = 3 cols, ceil(9/3) = 3 rows
      expect(container.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
      expect(container.style.gridTemplateRows).toBe('repeat(3, 1fr)');
    });
  });

  describe('no span behavior', () => {
    it('clears gridColumn on all children (all panes same size)', () => {
      container = makeContainer(3);
      grid = new TerminalGrid(container);
      // Pre-set a gridColumn value to verify it gets cleared
      (Array.from(container.children) as HTMLElement[]).forEach((child) => {
        child.style.gridColumn = 'span 2';
      });
      grid.update(3);
      (Array.from(container.children) as HTMLElement[]).forEach((child) => {
        expect(child.style.gridColumn).toBe('');
      });
    });
  });

  it('updates count after calling update', () => {
    container = makeContainer(4);
    grid = new TerminalGrid(container);
    grid.update(4);
    expect(grid.count).toBe(4);
  });
});
