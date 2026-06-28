import React, { useEffect, useRef, useState } from 'react';
import { Terminal, ShieldAlert, RefreshCw, Activity } from 'lucide-react';
import { StateEngine } from './lib/StateEngine';
import type { Row, StateEngineSnapshot } from './lib/types';

// Components
import { KPIStrip } from './components/KPIStrip';
import { SearchBar } from './components/SearchBar';
import { FilterBar } from './components/FilterBar';
import { PauseControl } from './components/PauseControl';
import { LayoutPanel } from './components/LayoutPanel';
import { GridHeader } from './components/GridHeader';
import { VirtualGrid } from './components/VirtualGrid';
import { AnalyticsChart } from './components/AnalyticsChart';
import { InfraToggles } from './components/InfraToggles';
import { PausedAnalyticsOverlay } from './components/PausedAnalyticsOverlay';

export const App: React.FC = () => {
  // Feature 6: Operator Workspace Layout Persistence
  const [layout, setLayout] = useState({
    gridVisible: true,
    analyticsVisible: true,
    togglesVisible: true,
  });

  const [snapshot, setSnapshot] = useState<StateEngineSnapshot | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // Restore layout on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('rpa-layout-v1');
    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout));
      } catch (e) {
        console.error('Failed to parse layout persistence key:', e);
      }
    }
  }, []);

  // Single consolidated subscription — avoids multiple re-renders per tick
  const tickCountRef = useRef(0);
  const tickBadgeRef = useRef<HTMLSpanElement>(null);
  const tickerTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const engine = StateEngine.getInstance();
    const unsubscribe = engine.subscribe((snap) => {
      setSnapshot(snap);
      // Auto-close analytics overlay when stream resumes
      if (!snap.isPaused) setAnalyticsOpen(false);
      // Tick counter via DOM ref — no extra setState
      if (!snap.isPaused) {
        tickCountRef.current += 1;
        if (tickBadgeRef.current) {
          tickBadgeRef.current.textContent = `#${tickCountRef.current}`;
        }
        // Ticker items via DOM ref
        if (tickerTrackRef.current && engine.rowsList.length > 0) {
          const count = Math.min(12, engine.rowsList.length);
          const items: string[] = [];
          for (let i = 0; i < count; i++) {
            const r = engine.rowsList[engine.rowsList.length - 1 - i];
            if (r?.project_name) items.push(`${r.project_name} · ${r.country}`);
          }
          const doubled = [...items, ...items];
          tickerTrackRef.current.innerHTML = doubled
            .map(t => `<span class="text-[10px] text-textMuted font-mono px-4"><span class="text-accentBlue/50 mr-1">›</span>${t}</span>`)
            .join('');
        }
      }
    });
    return unsubscribe;
  }, []);

  // Initialize official telemetry firehose on mount
  useEffect(() => {
    let active = true;
    if (typeof window !== 'undefined' && (window as any).initializeRpaStream) {
      (window as any).initializeRpaStream((incomingBatch: Row[]) => {
        if (!active) return;
        StateEngine.getInstance().process(incomingBatch);
      }, '/automation_projects.csv');
    }
    return () => { active = false; };
  }, []);


  const togglePanel = (panel: 'gridVisible' | 'analyticsVisible' | 'togglesVisible') => {
    setLayout((prev) => {
      const next = { ...prev, [panel]: !prev[panel] };
      localStorage.setItem('rpa-layout-v1', JSON.stringify(next));
      return next;
    });
  };

  const handleClearSort = () => {
    StateEngine.getInstance().clearSort();
  };

  const handleResetFilters = () => {
    StateEngine.getInstance().setFilter('automation_type', new Set());
    StateEngine.getInstance().setFilter('department', new Set());
    StateEngine.getInstance().setFilter('industry', new Set());
    StateEngine.getInstance().setSearchQuery('');
    StateEngine.getInstance().setSwitchFilter('ai_enabled', 'All');
    StateEngine.getInstance().setSwitchFilter('cloud_deployment', 'All');
  };

  return (
    <div className="flex flex-col h-screen bg-darkBg text-textPrimary select-none">
      {analyticsOpen && snapshot?.isPaused && (
        <PausedAnalyticsOverlay onClose={() => setAnalyticsOpen(false)} />
      )}
      {/* Navbar Headers */}
      <header className="flex items-center justify-between px-6 h-14 bg-darkSurface border-b border-darkBorder z-20 shrink-0 select-none shadow-md relative">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accentBlue to-transparent opacity-60" />
        {/* Left Logo + Connection Dot */}
        <div className="flex items-center space-x-3">
          <Terminal className="w-5 h-5 text-accentBlue" />
          <span className="font-extrabold text-sm tracking-widest text-textPrimary uppercase">
            Helix <span className="text-accentBlue font-light text-[10px] tracking-normal lowercase ml-1">RPA Control Terminal</span>
          </span>
          <div className="flex items-center space-x-1.5 bg-darkBg/60 border border-darkBorder px-2.5 py-1 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-statusSuccess opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-statusSuccess"></span>
            </span>
            <span className="text-[9px] font-bold text-statusSuccess uppercase tracking-wider">Live Connection</span>
          </div>
        </div>

        {/* Center Actions */}
        <div className="flex items-center space-x-4 max-w-lg w-full px-4">
          <PauseControl
            isPaused={snapshot?.isPaused || false}
            bufferedBatchesCount={snapshot?.bufferedBatchesCount || 0}
            onAnalyticsView={() => setAnalyticsOpen(prev => !prev)}
            analyticsOpen={analyticsOpen}
          />
          <SearchBar initialValue={snapshot?.searchQuery || ''} />
        </div>

        {/* Right Switch Toggles */}
        <div className="flex items-center space-x-3">
          <LayoutPanel layout={layout} togglePanel={togglePanel} />
          
          <div className="text-[10px] font-mono text-textMuted uppercase border-l border-darkBorder pl-3 h-4 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accentBlue animate-ping" />
            <span>200ms</span>
            <span ref={tickBadgeRef} className="text-accentBlue font-bold tabular-nums">#0</span>
          </div>
        </div>
      </header>

      {/* Live Ticker Bar — always rendered, populated via DOM ref */}
      <div className="h-7 bg-darkBg border-b border-darkBorder/60 flex items-center overflow-hidden shrink-0 relative">
        <div className="flex items-center space-x-2 px-3 shrink-0 border-r border-darkBorder/60 h-full">
          <Activity className="w-3 h-3 text-accentBlue animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-accentBlue">Live</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div ref={tickerTrackRef} className="ticker-track flex whitespace-nowrap" />
        </div>
      </div>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col p-6 overflow-hidden space-y-4">
        {/* KPI Strip (Feature 1) */}
        <div className="shrink-0">
          <KPIStrip />
        </div>

        {/* Workspace Toolbar (Filters & Sorting Controls) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-darkSurface/50 border border-darkBorder/70 p-3 rounded-lg shrink-0">
          {snapshot && (
            <FilterBar
              activeFilters={snapshot.activeFilters}
              uniqueValues={snapshot.uniqueValues}
            />
          )}

          {/* Action Cleaners */}
          <div className="flex items-center space-x-2 shrink-0">
            {snapshot && snapshot.sortPriority.length > 0 && (
              <button
                onClick={handleClearSort}
                className="flex items-center space-x-1.5 px-3 py-1.5 border border-statusDanger/30 hover:border-statusDanger/60 hover:bg-statusDanger/10 rounded text-xs text-statusDanger font-bold transition-all"
              >
                <span>Clear Sort</span>
              </button>
            )}

            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-darkBorder hover:border-textMuted hover:bg-darkBorder/40 rounded text-xs text-textMuted hover:text-textPrimary font-semibold transition-all"
              title="Reset search, sorting, categorical and infrastructure filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Layout</span>
            </button>
          </div>
        </div>

        {/* Dynamic Panels (Grid + Charts + Toggles) */}
        <div className="flex-grow flex gap-4 overflow-hidden relative">
          {/* Main Grid Viewport Panel A */}
          {layout.gridVisible && (
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
              <GridHeader sortPriority={snapshot?.sortPriority || []} />
              <div className="flex-grow overflow-hidden relative">
                <VirtualGrid />
              </div>
            </div>
          )}

          {/* Sidebar Panels (Panel B: Charts, Panel C: Switches) */}
          {(layout.analyticsVisible || layout.togglesVisible) && (
            <div className="w-[380px] shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
              {layout.analyticsVisible && (
                <div className="flex-1 min-h-[300px]">
                  <AnalyticsChart />
                </div>
              )}
              {layout.togglesVisible && (
                <div className="shrink-0 h-[220px]">
                  <InfraToggles />
                </div>
              )}
            </div>
          )}

          {/* If everything is toggled off */}
          {!layout.gridVisible && !layout.analyticsVisible && !layout.togglesVisible && (
            <div className="absolute inset-0 flex flex-col items-center justify-center border border-darkBorder bg-darkSurface rounded-lg">
              <ShieldAlert className="w-12 h-12 text-statusWarning mb-3 animate-bounce" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-textPrimary">Workspace Empty</h3>
              <p className="text-xs text-textMuted mt-1">Enable panels in the header layout controller to view data feeds.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
export default App;
