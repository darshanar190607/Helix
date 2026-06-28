import type { Row } from './types';

/**
 * Feature 10: Multi-Field Fuzzy Search Engine
 * Matches a query against project_name, company_id, implementation_partner, and country.
 */
export function fuzzyMatch(query: string, row: Row): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = [
    row.project_name || '',
    row.company_id || '',
    row.implementation_partner || '',
    row.country || ''
  ].join(' ').toLowerCase();

  return terms.every(term => haystack.includes(term));
}

/**
 * High-performance chunked search filter to prevent main thread blocking (Feature 10).
 * Yields control back to the browser using requestIdleCallback or setTimeout.
 */
export function chunkedFuzzySearch(
  rows: Row[],
  query: string,
  onComplete: (matchingIndices: number[]) => void
) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    // Return all indices
    onComplete(rows.map((_, idx) => idx));
    return;
  }

  const matchingIndices: number[] = [];
  const totalRows = rows.length;
  const chunkSize = 10000;
  let currentIndex = 0;

  function runChunk() {
    const limit = Math.min(currentIndex + chunkSize, totalRows);
    
    for (let i = currentIndex; i < limit; i++) {
      const row = rows[i];
      const haystack = [
        row.project_name || '',
        row.company_id || '',
        row.implementation_partner || '',
        row.country || ''
      ].join(' ').toLowerCase();

      const isMatch = terms.every(term => haystack.includes(term));
      if (isMatch) {
        matchingIndices.push(i);
      }
    }

    currentIndex = limit;

    if (currentIndex < totalRows) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(runChunk);
      } else {
        setTimeout(runChunk, 0);
      }
    } else {
      onComplete(matchingIndices);
    }
  }

  runChunk();
}
