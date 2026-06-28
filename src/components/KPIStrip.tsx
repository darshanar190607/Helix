import React, { useEffect, useRef } from 'react';
import { Database, Cpu, DollarSign } from 'lucide-react';
import { StateEngine } from '../lib/StateEngine';
import { formatCurrency } from '../lib/formatters';

/**
 * Feature 1: KPI Dashboard Strip
 * Bypasses React render cycles completely by using direct DOM ref mutations.
 * Freezes DOM updates when the stream is paused.
 */
export const KPIStrip: React.FC = () => {
  const processedRef = useRef<HTMLParagraphElement>(null);
  const robotsRef = useRef<HTMLParagraphElement>(null);
  const savingsRef = useRef<HTMLParagraphElement>(null);

  // Cache last rendered values to restore on resume or display initial values
  const lastProcessed = useRef(0);
  const lastRobots = useRef(0);
  const lastSavings = useRef(0);

  useEffect(() => {
    const engine = StateEngine.getInstance();
    
    const unsubscribe = engine.subscribe((snapshot) => {
      // Feature 5: If the stream is paused, freeze all DOM mutations
      if (snapshot.isPaused) return;

      lastProcessed.current = snapshot.totalProcessedCount;
      lastRobots.current = snapshot.activeRobotsCount;
      lastSavings.current = snapshot.cumulativeSavings;

      const flash = (el: HTMLParagraphElement | null) => {
        if (!el) return;
        el.classList.remove('kpi-tick');
        void el.offsetWidth;
        el.classList.add('kpi-tick');
      };
      if (processedRef.current) {
        processedRef.current.textContent = lastProcessed.current.toLocaleString('en-US');
        flash(processedRef.current);
      }
      if (robotsRef.current) {
        robotsRef.current.textContent = lastRobots.current.toLocaleString('en-US');
        flash(robotsRef.current);
      }
      if (savingsRef.current) {
        savingsRef.current.textContent = formatCurrency(lastSavings.current);
        flash(savingsRef.current);
      }
    });

    // Initial render values on mount (when stream might not be ticking yet)
    const initial = engine.getSnapshot();
    if (processedRef.current) processedRef.current.textContent = initial.totalProcessedCount.toLocaleString('en-US');
    if (robotsRef.current) robotsRef.current.textContent = initial.activeRobotsCount.toLocaleString('en-US');
    if (savingsRef.current) savingsRef.current.textContent = formatCurrency(initial.cumulativeSavings);

    return unsubscribe;
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full select-none">
      {/* Total Processed Rows Card */}
      <div className="flex items-center space-x-4 bg-darkSurface border border-darkBorder border-t-accentBlue border-t-2 p-5 rounded-lg shadow-sm hover:shadow-accentBlue/10 hover:shadow-md transition-all">
        <div className="p-3 rounded-lg bg-accentBlue/10 text-accentBlue">
          <Database className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Streamed Rows Processed</p>
          <p
            ref={processedRef}
            className="text-2xl font-black text-textPrimary tracking-tight tabular-nums h-8 mt-1"
          >
            0
          </p>
        </div>
      </div>

      {/* Active Robots Card */}
      <div className="flex items-center space-x-4 bg-darkSurface border border-darkBorder border-t-statusSuccess border-t-2 p-5 rounded-lg shadow-sm hover:shadow-statusSuccess/10 hover:shadow-md transition-all">
        <div className="p-3 rounded-lg bg-statusSuccess/10 text-statusSuccess">
          <Cpu className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Active Robots Deployed</p>
          <p
            ref={robotsRef}
            className="text-2xl font-black text-textPrimary tracking-tight tabular-nums h-8 mt-1"
          >
            0
          </p>
        </div>
      </div>

      {/* Global Cumulative Savings Card */}
      <div className="flex items-center space-x-4 bg-darkSurface border border-darkBorder border-t-statusWarning border-t-2 p-5 rounded-lg shadow-sm hover:shadow-statusWarning/10 hover:shadow-md transition-all">
        <div className="p-3 rounded-lg bg-statusWarning/10 text-statusWarning">
          <DollarSign className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Global Cumulative Savings</p>
          <p
            ref={savingsRef}
            className="text-2xl font-black text-textPrimary tracking-tight tabular-nums h-8 mt-1 text-emerald-400"
          >
            $0
          </p>
        </div>
      </div>
    </div>
  );
};
