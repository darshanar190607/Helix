import React, { useEffect, useRef, useState } from 'react';
import { StateEngine } from '../lib/StateEngine';
import type { Row } from '../lib/types';
import { COLUMNS } from './GridHeader';
import { formatCurrency, formatRoi, formatHours, formatRobots } from '../lib/formatters';
import { Loader2 } from 'lucide-react';

const ROW_HEIGHT = 40;

export const VirtualGrid: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const phantomRef = useRef<HTMLDivElement>(null);
  
  // React state to track if we have loaded data and handle initial spinner
  const [hasData, setHasData] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [poolSize, setPoolSize] = useState(0);

  // Core virtualization refs
  const rowNodes = useRef<HTMLDivElement[]>([]);
  const scrollTop = useRef(0);
  const cachedViewportHeight = useRef(400);

  // Alert tracking ref
  const pendingAlerts = useRef<Set<string>>(new Set());

  // Listen to StateEngine updates
  useEffect(() => {
    const engine = StateEngine.getInstance();

    const unsubscribe = engine.subscribe((snapshot) => {
      if (snapshot.isPaused) return; // Freeze DOM updates

      const currentCount = engine.rowsList.length;
      if (currentCount > 0 && !hasData) {
        setHasData(true);
      }

      setPoolSize(engine.rowsList.length);
      // Sync visible count to update phantom spacer height
      setVisibleCount(snapshot.visibleCount);

      // Trigger redraw of visible rows on data update
      requestAnimationFrame(updateVisibleRows);
    });

    return unsubscribe;
  }, [hasData]);

  // Handle incoming telemetry batches to detect warning anomalies (Feature 3)
  useEffect(() => {
    const engine = StateEngine.getInstance();
    
    // We hook into the window's initializeRpaStream callback wrapper if needed, 
    // but the cleanest place is to watch StateEngine merges.
    // Let's monkeypatch the process function of the engine to collect anomalies on arrival.
    const originalProcess = engine.process;
    engine.process = function (incomingBatch: Row[]) {
      // Collect uids of rows that fail or have negative ROI
      incomingBatch.forEach((row) => {
        if (row.project_status === 'Failed' || row.roi_percent < 0) {
          pendingAlerts.current.add(row.internal_uid);
        }
      });
      originalProcess.call(engine, incomingBatch);
    };

    return () => {
      engine.process = originalProcess;
    };
  }, []);

  // Initialize DOM rows once on mount (Feature 8)
  useEffect(() => {
    if (!hasData || !scrollContainerRef.current) return;

    // Cache viewport height once on mount
    const containerHeight = scrollContainerRef.current.clientHeight;
    cachedViewportHeight.current = containerHeight;

    // Create N + 2 buffer rows
    const count = Math.ceil(containerHeight / ROW_HEIGHT) + 2;
    
    // Clear any previous nodes
    rowNodes.current.forEach((n) => n.remove());
    rowNodes.current = [];

    for (let i = 0; i < count; i++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'grid-row absolute left-0 right-0 flex items-center border-b border-darkBorder hover:bg-darkBorder/15 transition-colors duration-150 select-none';
      rowDiv.style.height = `${ROW_HEIGHT}px`;
      rowDiv.style.willChange = 'transform, background-color';
      
      // Cache cell elements for fast O(1) text update (avoid querySelector on scroll)
      const cells: HTMLDivElement[] = [];

      COLUMNS.forEach((col) => {
        const cell = document.createElement('div');
        cell.className = 'px-4 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-textPrimary flex items-center';
        cell.style.width = col.width;

        if (col.align === 'right') {
          cell.classList.add('justify-end', 'text-right', 'tabular-nums');
        } else if (col.align === 'center') {
          cell.classList.add('justify-center', 'text-center');
        } else {
          cell.classList.add('justify-start', 'text-left');
        }

        // Add special container for status badges
        if (col.field === 'project_status') {
          const badge = document.createElement('span');
          badge.className = 'status-badge px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border';
          cell.appendChild(badge);
        }

        rowDiv.appendChild(cell);
        cells.push(cell);
      });

      // Attach cells array to row element directly
      (rowDiv as any).cells = cells;

      // Feature 3: Add animationend listener to remove row-alert class
      rowDiv.addEventListener('animationend', () => {
        rowDiv.classList.remove('row-alert');
      });

      scrollContainerRef.current.appendChild(rowDiv);
      rowNodes.current.push(rowDiv);
    }

    // Initial update
    updateVisibleRows();

    // Resize observer to update cached viewport size and adjust row elements count
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height && height !== cachedViewportHeight.current) {
          cachedViewportHeight.current = height;
          updateVisibleRows();
        }
      }
    });

    resizeObserver.observe(scrollContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      rowNodes.current.forEach((n) => n.remove());
      rowNodes.current = [];
    };
  }, [hasData]);

  // Recycles row elements (Feature 8)
  const updateVisibleRows = () => {
    if (rowNodes.current.length === 0) return;

    const engine = StateEngine.getInstance();
    const totalFiltered = engine.sortedIndexes.length;
    const startIdx = Math.floor(scrollTop.current / ROW_HEIGHT);
    const sortedFields = new Set(engine.sortPriority.map(s => s.field));

    rowNodes.current.forEach((node, i) => {
      const dataIdx = startIdx + i;
      const row = engine.getRowAtIndex(dataIdx);

      if (!row || dataIdx >= totalFiltered) {
        node.style.visibility = 'hidden';
        node.style.transform = '';
        return;
      }

      node.style.visibility = 'visible';
      node.style.transform = `translateY(${dataIdx * ROW_HEIGHT}px)`;

      // Zebra stripe
      if (dataIdx % 2 === 0) {
        node.classList.add('row-even');
      } else {
        node.classList.remove('row-even');
      }

      // Update cells using direct cached array
      const cells = (node as any).cells as HTMLDivElement[];
      if (!cells) return;

      // Project Name
      cells[0].textContent = row.project_name || '';
      // Company ID
      cells[1].textContent = row.company_id || '';
      
      // Status Badge
      const statusBadge = cells[2].firstChild as HTMLSpanElement;
      if (statusBadge) {
        statusBadge.textContent = row.project_status || '';
        statusBadge.className = 'status-badge px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border';
        
        if (row.project_status === 'Active') {
          statusBadge.classList.add('bg-emerald-950/30', 'text-statusSuccess', 'border-statusSuccess/30');
        } else if (row.project_status === 'Completed') {
          statusBadge.classList.add('bg-accentBlue/10', 'text-accentBlue', 'border-accentBlue/30');
        } else if (row.project_status === 'Failed') {
          statusBadge.classList.add('bg-statusDanger/10', 'text-statusDanger', 'border-statusDanger/30');
        } else {
          statusBadge.classList.add('bg-statusWarning/10', 'text-statusWarning', 'border-statusWarning/30');
        }
      }

      // Automation Type
      cells[3].textContent = row.automation_type || '';
      // Budget
      cells[4].textContent = formatCurrency(row.budget_usd);
      // Annual Savings
      cells[5].textContent = formatCurrency(row.annual_savings_usd);
      // ROI Percent
      cells[6].textContent = formatRoi(row.roi_percent);
      // Robots Deployed
      cells[7].textContent = formatRobots(row.robots_deployed);
      // Employee Hours Saved
      cells[8].textContent = formatHours(row.employee_hours_saved);
      // Country
      cells[9].textContent = row.country || '';

      // Apply col-sorted highlight to cells in active sort columns
      COLUMNS.forEach((col, ci) => {
        if (sortedFields.has(col.field)) {
          cells[ci].classList.add('col-sorted');
        } else {
          cells[ci].classList.remove('col-sorted');
        }
      });

      // Feature 3: Visual Alert pulse triggers on arrival
      if (pendingAlerts.current.has(row.internal_uid)) {
        node.classList.remove('row-alert'); // reset
        // Trigger reflow to restart animation
        void node.offsetWidth; 
        node.classList.add('row-alert');
        pendingAlerts.current.delete(row.internal_uid); // remove from pending
      }
    });
  };

  // Scroll listener throttled with requestAnimationFrame
  const activeRAF = useRef<number | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    scrollTop.current = target.scrollTop;

    if (activeRAF.current === null) {
      activeRAF.current = requestAnimationFrame(() => {
        updateVisibleRows();
        activeRAF.current = null;
      });
    }
  };

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (activeRAF.current !== null) {
        cancelAnimationFrame(activeRAF.current);
      }
    };
  }, []);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full border border-darkBorder bg-darkSurface rounded-lg relative overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(90deg, #3B82F6 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-12 h-12 rounded-full border-2 border-accentBlue/20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-accentBlue animate-spin" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-statusSuccess animate-ping" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-textPrimary mb-1">Helix RPA Terminal</p>
          <p className="text-[10px] text-textMuted font-mono animate-pulse">Connecting to telemetry stream...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-darkBorder bg-darkSurface rounded-lg h-full overflow-hidden shadow-md relative scanlines">
      {/* Scrollable grid area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative min-h-[300px]"
        style={{ contentVisibility: 'auto' }}
      >
        {/* Phantom scroll height spacer */}
        <div
          ref={phantomRef}
          style={{ height: `${visibleCount * ROW_HEIGHT}px` }}
          className="absolute left-0 top-0 right-0 pointer-events-none"
        />

        {visibleCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-textMuted bg-darkSurface/90 z-20">
            No projects match the active search or filters.
          </div>
        )}
      </div>

      {/* Grid Footer — Pool stats */}
      <div className="shrink-0 flex items-center justify-between px-4 h-7 border-t border-darkBorder bg-darkBg/60 text-[10px] font-mono text-textMuted">
        <span>
          Showing <span className="text-textPrimary font-bold">{visibleCount.toLocaleString()}</span> rows
          {visibleCount !== poolSize && (
            <span> of <span className="text-textPrimary font-bold">{poolSize.toLocaleString()}</span> in pool</span>
          )}
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-statusSuccess animate-pulse" />
          <span>{poolSize.toLocaleString()} pool · {rowNodes.current.length} DOM nodes</span>
        </span>
      </div>
    </div>
  );
};
