import type { Row } from './types';

export interface SortKey {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Feature 9: Multi-Column Concurrent Sorter
 * Compares two rows based on an ordered list of sorting priority keys.
 */
export function multiSort(
  a: Row,
  b: Row,
  sortPriority: SortKey[]
): number {
  for (const { field, direction } of sortPriority) {
    const av = a[field];
    const bv = b[field];

    if (av === undefined || av === null) return direction === 'asc' ? 1 : -1;
    if (bv === undefined || bv === null) return direction === 'asc' ? -1 : 1;

    let cmp = 0;
    if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv));
    }

    if (cmp !== 0) {
      return direction === 'asc' ? cmp : -cmp;
    }
  }
  return 0;
}
