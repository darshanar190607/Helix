import React, { useEffect, useRef } from 'react';
import { StateEngine } from '../lib/StateEngine';
import { formatCurrency } from '../lib/formatters';
import { BarChart3 } from 'lucide-react';

/**
 * Feature 6 Panel B: Department Analytics Chart
 * Renders a lightweight, high-performance bar chart of the Top 5 Departments
 * by savings using direct DOM ref updates (no React re-renders on ticks).
 */
export const AnalyticsChart: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<HTMLDivElement[]>([]);
  const labelRefs = useRef<HTMLSpanElement[]>([]);
  const valRefs = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    const engine = StateEngine.getInstance();
    let lastUpdate = 0;

    const updateChart = (isPaused: boolean) => {
      if (isPaused) return;
      const now = Date.now();
      if (now - lastUpdate < 2000) return; // throttle to 2s
      lastUpdate = now;

      const savingsMap = new Map<string, number>();
      
      for (let i = 0; i < engine.rowsList.length; i++) {
        const row = engine.rowsList[i];
        if (row.department) {
          const savings = row.annual_savings_usd || 0;
          savingsMap.set(row.department, (savingsMap.get(row.department) || 0) + savings);
        }
      }

      const topDepartments = Array.from(savingsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const maxSavings = topDepartments.length > 0 ? topDepartments[0][1] : 0;

      for (let i = 0; i < 5; i++) {
        const bar = barRefs.current[i];
        const label = labelRefs.current[i];
        const val = valRefs.current[i];

        if (!bar || !label || !val) continue;

        const data = topDepartments[i];

        if (data && maxSavings > 0) {
          const [deptName, deptSavings] = data;
          const percentage = (deptSavings / maxSavings) * 100;

          label.textContent = deptName;
          val.textContent = formatCurrency(deptSavings);
          
          // Smooth width transition
          bar.style.width = `${percentage}%`;
          bar.style.opacity = '1';
        } else {
          // Hide unused bars
          label.textContent = '';
          val.textContent = '';
          bar.style.width = '0%';
          bar.style.opacity = '0';
        }
      }
    };

    const unsubscribe = engine.subscribe((snapshot) => {
      updateChart(snapshot.isPaused);
    });

    // Initial render
    const initial = engine.getSnapshot();
    updateChart(initial.isPaused);

    return unsubscribe;
  }, []);

  return (
    <div className="flex flex-col border border-darkBorder bg-darkSurface rounded-lg p-5 h-full shadow-md select-none">
      <div className="flex items-center space-x-2 border-b border-darkBorder pb-3.5 mb-4">
        <BarChart3 className="w-4 h-4 text-accentBlue" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-textPrimary">
          Top 5 Departments by Annual Savings
        </h3>
      </div>

      <div ref={containerRef} className="flex-1 flex flex-col justify-around min-h-[220px] space-y-4">
        {[0, 1, 2, 3, 4].map((index) => {
          // Generate custom colors for the bars
          const colors = [
            'from-blue-600 to-accentBlue shadow-blue-500/10',
            'from-emerald-600 to-statusSuccess shadow-emerald-500/10',
            'from-amber-600 to-statusWarning shadow-amber-500/10',
            'from-indigo-600 to-indigo-500 shadow-indigo-500/10',
            'from-pink-600 to-pink-500 shadow-pink-500/10',
          ];

          return (
            <div key={index} className="flex flex-col space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-semibold text-textMuted uppercase tracking-wider">
                <span
                  ref={(el) => {
                    if (el) labelRefs.current[index] = el;
                  }}
                  className="truncate max-w-[70%]"
                >
                  &mdash;
                </span>
                <span
                  ref={(el) => {
                    if (el) valRefs.current[index] = el;
                  }}
                  className="text-textPrimary font-bold tabular-nums"
                >
                  $0
                </span>
              </div>
              <div className="w-full bg-darkBg border border-darkBorder/40 rounded-full h-3.5 overflow-hidden">
                <div
                  ref={(el) => {
                    if (el) barRefs.current[index] = el;
                  }}
                  style={{ width: '0%' }}
                  className={`bg-gradient-to-r ${colors[index]} h-full rounded-full transition-all duration-300 ease-out shadow-sm`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
