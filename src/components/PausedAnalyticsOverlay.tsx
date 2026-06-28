import React, { useEffect, useRef } from 'react';
import {
  Chart,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  DoughnutController,
  BarController,
  LineController,
} from 'chart.js';
import { X, PieChart, BarChart2, TrendingUp, Cpu } from 'lucide-react';
import { StateEngine } from '../lib/StateEngine';
import { formatCurrency } from '../lib/formatters';

Chart.register(
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
  DoughnutController, BarController, LineController
);

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeOutQuart' as const },
  plugins: {
    legend: {
      labels: { color: '#9CA3AF', font: { size: 10, family: 'Outfit' }, boxWidth: 10, padding: 10 },
    },
    tooltip: {
      backgroundColor: '#111827',
      borderColor: '#1F2937',
      borderWidth: 1,
      titleColor: '#F9FAFB',
      bodyColor: '#9CA3AF',
      titleFont: { size: 11, family: 'Outfit', weight: 'bold' as const },
      bodyFont: { size: 10, family: 'Outfit' },
      padding: 10,
    },
  },
};

const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

interface Props {
  onClose: () => void;
}

export const PausedAnalyticsOverlay: React.FC<Props> = ({ onClose }) => {
  const statusRef     = useRef<HTMLCanvasElement>(null);
  const roiRef        = useRef<HTMLCanvasElement>(null);
  const savingsRef    = useRef<HTMLCanvasElement>(null);
  const automationRef = useRef<HTMLCanvasElement>(null);
  const chartsRef     = useRef<Chart[]>([]);

  // Snapshot frozen stats at mount time — never changes while overlay is open
  const frozenStats = useRef({ totalRows: 0, buffered: 0 });

  useEffect(() => {
    const engine = StateEngine.getInstance();
    // Capture frozen state the moment overlay opens
    frozenStats.current = {
      totalRows: engine.rowsList.length,
      buffered:  engine.pauseQueue.length,
    };
    const rows = engine.rowsList;

    // ── 1. Status Breakdown (Doughnut) ──────────────────────────────────────
    const statusCounts: Record<string, number> = {};
    const roiByDept: Record<string, { sum: number; count: number }> = {};
    const savingsByDept: Record<string, number> = {};
    const automationCounts: Record<string, number> = {};

    for (const row of rows) {
      // Status
      statusCounts[row.project_status] = (statusCounts[row.project_status] || 0) + 1;
      // ROI by dept
      if (row.department) {
        if (!roiByDept[row.department]) roiByDept[row.department] = { sum: 0, count: 0 };
        roiByDept[row.department].sum += Math.max(0, row.roi_percent);
        roiByDept[row.department].count += 1;
      }
      // Savings by dept (top 6)
      if (row.department) {
        savingsByDept[row.department] = (savingsByDept[row.department] || 0) + (row.annual_savings_usd || 0);
      }
      // Automation type
      if (row.automation_type) {
        automationCounts[row.automation_type] = (automationCounts[row.automation_type] || 0) + 1;
      }
    }

    // Top 6 departments by savings
    const topDepts = Object.entries(savingsByDept)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Avg ROI top 6 depts
    const avgRoiEntries = Object.entries(roiByDept)
      .map(([dept, v]) => [dept, v.sum / v.count] as [string, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Destroy previous charts
    chartsRef.current.forEach(c => c.destroy());
    chartsRef.current = [];

    // Chart 1 — Status Doughnut
    if (statusRef.current) {
      const labels = Object.keys(statusCounts);
      const statusColors: Record<string, string> = {
        Active: '#10B981', Completed: '#3B82F6', Failed: '#EF4444', Planned: '#F59E0B',
      };
      chartsRef.current.push(new Chart(statusRef.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: labels.map(l => statusCounts[l]),
            backgroundColor: labels.map(l => statusColors[l] || '#6B7280'),
            borderColor: '#111827',
            borderWidth: 2,
            hoverOffset: 6,
          }],
        },
        options: {
          ...CHART_DEFAULTS,
          cutout: '65%',
          plugins: {
            ...CHART_DEFAULTS.plugins,
            legend: { ...CHART_DEFAULTS.plugins.legend, position: 'bottom' },
          },
        },
      }));
    }

    // Chart 2 — Avg ROI by Department (Horizontal Bar)
    if (roiRef.current) {
      chartsRef.current.push(new Chart(roiRef.current, {
        type: 'bar',
        data: {
          labels: avgRoiEntries.map(([d]) => d),
          datasets: [{
            label: 'Avg ROI %',
            data: avgRoiEntries.map(([, v]) => parseFloat(v.toFixed(2))),
            backgroundColor: avgRoiEntries.map((_, i) => PALETTE[i % PALETTE.length] + 'CC'),
            borderColor:     avgRoiEntries.map((_, i) => PALETTE[i % PALETTE.length]),
            borderWidth: 1,
            borderRadius: 4,
          }],
        },
        options: {
          ...CHART_DEFAULTS,
          indexAxis: 'y',
          scales: {
            x: { ticks: { color: '#6B7280', font: { size: 9 } }, grid: { color: '#1F2937' } },
            y: { ticks: { color: '#9CA3AF', font: { size: 9 } }, grid: { display: false } },
          },
          plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
        },
      }));
    }

    // Chart 3 — Top Dept Savings (Line with fill)
    if (savingsRef.current) {
      chartsRef.current.push(new Chart(savingsRef.current, {
        type: 'line',
        data: {
          labels: topDepts.map(([d]) => d),
          datasets: [{
            label: 'Annual Savings',
            data: topDepts.map(([, v]) => v),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#3B82F6',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4,
          }],
        },
        options: {
          ...CHART_DEFAULTS,
          scales: {
            x: { ticks: { color: '#6B7280', font: { size: 9 } }, grid: { color: '#1F2937' } },
            y: {
              ticks: {
                color: '#6B7280', font: { size: 9 },
                callback: (v) => formatCurrency(v as number),
              },
              grid: { color: '#1F2937' },
            },
          },
          plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
        },
      }));
    }

    // Chart 4 — Automation Type Distribution (Bar)
    if (automationRef.current) {
      const entries = Object.entries(automationCounts).sort((a, b) => b[1] - a[1]);
      chartsRef.current.push(new Chart(automationRef.current, {
        type: 'bar',
        data: {
          labels: entries.map(([k]) => k),
          datasets: [{
            label: 'Projects',
            data: entries.map(([, v]) => v),
            backgroundColor: entries.map((_, i) => PALETTE[i % PALETTE.length] + 'BB'),
            borderColor:     entries.map((_, i) => PALETTE[i % PALETTE.length]),
            borderWidth: 1,
            borderRadius: 4,
          }],
        },
        options: {
          ...CHART_DEFAULTS,
          scales: {
            x: { ticks: { color: '#6B7280', font: { size: 9 } }, grid: { display: false } },
            y: { ticks: { color: '#6B7280', font: { size: 9 } }, grid: { color: '#1F2937' } },
          },
          plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
        },
      }));
    }

    return () => { chartsRef.current.forEach(c => c.destroy()); chartsRef.current = []; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-darkBg/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl mx-4 bg-darkSurface border border-darkBorder rounded-xl shadow-2xl shadow-black/60 flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-darkBorder shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-accentBlue/10">
              <PieChart className="w-4 h-4 text-accentBlue" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-textPrimary">
                Frozen Stream Analytics
              </h2>
              <p className="text-[10px] text-textMuted font-mono mt-0.5">
                Aggregated from{' '}
                <span className="text-textPrimary font-bold">{frozenStats.current.totalRows.toLocaleString()}</span> rows
                &nbsp;·&nbsp;
                <span className="text-statusWarning font-bold">{frozenStats.current.buffered} batches</span> buffered
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-statusWarning/10 border border-statusWarning/30 text-statusWarning text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-statusWarning animate-pulse" />
              <span>Stream Paused</span>
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-textMuted hover:text-textPrimary hover:bg-darkBorder/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-5">

          {/* Chart 1: Status Breakdown */}
          <div className="bg-darkBg border border-darkBorder rounded-lg p-4 flex flex-col">
            <div className="flex items-center space-x-2 mb-3">
              <PieChart className="w-3.5 h-3.5 text-accentBlue" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted">
                Project Status Breakdown
              </span>
            </div>
            <div className="flex-1 min-h-[200px]">
              <canvas ref={statusRef} />
            </div>
          </div>

          {/* Chart 2: Avg ROI by Department */}
          <div className="bg-darkBg border border-darkBorder rounded-lg p-4 flex flex-col">
            <div className="flex items-center space-x-2 mb-3">
              <BarChart2 className="w-3.5 h-3.5 text-statusSuccess" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted">
                Avg ROI % by Department
              </span>
            </div>
            <div className="flex-1 min-h-[200px]">
              <canvas ref={roiRef} />
            </div>
          </div>

          {/* Chart 3: Savings by Dept Line */}
          <div className="bg-darkBg border border-darkBorder rounded-lg p-4 flex flex-col">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-statusWarning" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted">
                Top 6 Dept Annual Savings
              </span>
            </div>
            <div className="flex-1 min-h-[200px]">
              <canvas ref={savingsRef} />
            </div>
          </div>

          {/* Chart 4: Automation Type */}
          <div className="bg-darkBg border border-darkBorder rounded-lg p-4 flex flex-col">
            <div className="flex items-center space-x-2 mb-3">
              <Cpu className="w-3.5 h-3.5 text-statusDanger" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted">
                Automation Type Distribution
              </span>
            </div>
            <div className="flex-1 min-h-[200px]">
              <canvas ref={automationRef} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
