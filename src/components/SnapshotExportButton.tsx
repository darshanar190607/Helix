import React, { useState, useCallback } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { StateEngine } from '../lib/StateEngine';
import { exportSnapshotCsv } from '../lib/csvExport';

type ExportState = 'idle' | 'exporting' | 'done';

/**
 * Bounty Task 3: Snapshot Export Button
 *
 * When clicked:
 * 1. Reads the StateEngine's current sortedIndexes (already filtered + sorted)
 * 2. Defers the CSV generation via setTimeout(0) so the ongoing stream is NEVER frozen
 * 3. Triggers a client-side download of a timestamped .csv file
 * 4. Shows idle → exporting → done feedback states for clear UX
 */
export const SnapshotExportButton: React.FC = () => {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [lastExportCount, setLastExportCount] = useState<number>(0);

  const handleExport = useCallback(() => {
    if (exportState === 'exporting') return; // Debounce double-clicks

    const engine = StateEngine.getInstance();
    const visibleCount = engine.sortedIndexes.length;

    if (visibleCount === 0) return; // Nothing to export

    // 1. Immediately flip to "exporting" — React renders this frame first
    setExportState('exporting');

    // 2. Defer heavy CSV work to a subsequent macrotask (non-blocking guarantee)
    setTimeout(() => {
      try {
        // Snapshot the sorted rows at this exact moment
        // sortedIndexes already reflects: search query + all filters + multi-column sort
        const sortedRows = engine.sortedIndexes.map(
          (originalIdx) => engine.rowsList[originalIdx]
        ).filter(Boolean); // Guard against any undefined entries

        const exportedCount = exportSnapshotCsv(sortedRows);
        setLastExportCount(exportedCount);
        setExportState('done');

        // Reset to idle after brief success flash
        setTimeout(() => setExportState('idle'), 2000);
      } catch (err) {
        console.error('[SnapshotExport] CSV generation failed:', err);
        setExportState('idle');
      }
    }, 0);
  }, [exportState]);

  const engine = StateEngine.getInstance();
  const visibleCount = engine.sortedIndexes.length;

  // Derive display values based on state
  const isExporting = exportState === 'exporting';
  const isDone = exportState === 'done';
  const isEmpty = visibleCount === 0;

  const label = isExporting
    ? 'Exporting...'
    : isDone
    ? `✓ ${lastExportCount.toLocaleString()} rows`
    : `Export ${visibleCount > 0 ? visibleCount.toLocaleString() + ' rows' : 'Snapshot'}`;

  return (
    <button
      id="snapshot-export-btn"
      onClick={handleExport}
      disabled={isExporting || isEmpty}
      title={
        isEmpty
          ? 'No visible rows to export'
          : `Export ${visibleCount.toLocaleString()} rows as CSV (respecting current sort & filters)`
      }
      className={[
        'flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all duration-200 border select-none',
        // State-based styles
        isExporting
          ? 'border-accentBlue/40 bg-accentBlue/10 text-accentBlue cursor-wait'
          : isDone
          ? 'border-statusSuccess/50 bg-statusSuccess/10 text-statusSuccess cursor-default'
          : isEmpty
          ? 'border-darkBorder text-textMuted cursor-not-allowed opacity-40'
          : 'border-accentBlue/40 text-accentBlue hover:border-accentBlue hover:bg-accentBlue/10 active:scale-95 cursor-pointer',
      ].join(' ')}
    >
      {/* Icon */}
      {isExporting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : isDone ? (
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Download className="w-3.5 h-3.5 shrink-0" />
      )}

      {/* Label */}
      <span className="tabular-nums whitespace-nowrap">{label}</span>
    </button>
  );
};
