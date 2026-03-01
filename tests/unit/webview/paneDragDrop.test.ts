import { describe, it, expect } from 'vitest';
import { reorderPaneIds } from '../../../webview/paneOrderUtils';

describe('reorderPaneIds', () => {
  it('inserts before target: drag C before B → [A, C, B, D]', () => {
    const result = reorderPaneIds(['A', 'B', 'C', 'D'], 'C', 'B', true);
    expect(result).toEqual(['A', 'C', 'B', 'D']);
  });

  it('inserts after target: drag A after C → [B, C, A, D]', () => {
    const result = reorderPaneIds(['A', 'B', 'C', 'D'], 'A', 'C', false);
    expect(result).toEqual(['B', 'C', 'A', 'D']);
  });

  it('does nothing when dragging onto self', () => {
    const original = ['A', 'B', 'C'];
    const result = reorderPaneIds(original, 'B', 'B', true);
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('handles drag from first to last (insertAfter)', () => {
    const result = reorderPaneIds(['A', 'B', 'C', 'D'], 'A', 'D', false);
    expect(result).toEqual(['B', 'C', 'D', 'A']);
  });

  it('handles drag from last to first (insertBefore)', () => {
    const result = reorderPaneIds(['A', 'B', 'C', 'D'], 'D', 'A', true);
    expect(result).toEqual(['D', 'A', 'B', 'C']);
  });

  it('does not mutate the original array', () => {
    const original = ['A', 'B', 'C'];
    reorderPaneIds(original, 'C', 'A', true);
    expect(original).toEqual(['A', 'B', 'C']);
  });

  it('handles 2 panes: drag second before first', () => {
    const result = reorderPaneIds(['A', 'B'], 'B', 'A', true);
    expect(result).toEqual(['B', 'A']);
  });

  it('handles 2 panes: drag first after second', () => {
    const result = reorderPaneIds(['A', 'B'], 'A', 'B', false);
    expect(result).toEqual(['B', 'A']);
  });

  it('inserts before target adjacent: drag B before C → [A, B, C, D] (no-op position)', () => {
    // B is already before C, but result should still be correct
    const result = reorderPaneIds(['A', 'B', 'C', 'D'], 'B', 'C', true);
    expect(result).toEqual(['A', 'B', 'C', 'D']);
  });

  it('inserts after target: drag C after D → [A, B, D, C]', () => {
    const result = reorderPaneIds(['A', 'B', 'C', 'D'], 'C', 'D', false);
    expect(result).toEqual(['A', 'B', 'D', 'C']);
  });
});
