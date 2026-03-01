/**
 * ペインの表示順序を並べ替えるユーティリティ（純粋関数）
 *
 * @param order    現在のペインID配列
 * @param draggedId ドラッグ中のペインID
 * @param targetId  ドロップ先のペインID
 * @param insertBefore true: targetの前に挿入, false: targetの後に挿入
 * @returns 新しいペインID配列（元の配列は変更しない）
 */
export function reorderPaneIds(
  order: string[],
  draggedId: string,
  targetId: string,
  insertBefore: boolean
): string[] {
  if (draggedId === targetId) return [...order];
  const filtered = order.filter((id) => id !== draggedId);
  const targetIndex = filtered.indexOf(targetId);
  const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
  filtered.splice(insertIndex, 0, draggedId);
  return filtered;
}
