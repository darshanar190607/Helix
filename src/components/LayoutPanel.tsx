import React from 'react';
import { LayoutGrid, BarChart3, ToggleLeft } from 'lucide-react';

interface LayoutPanelProps {
  layout: {
    gridVisible: boolean;
    analyticsVisible: boolean;
    togglesVisible: boolean;
  };
  togglePanel: (panel: 'gridVisible' | 'analyticsVisible' | 'togglesVisible') => void;
}

/**
 * Feature 6: Operator Workspace Layout Persistence Panel Controls
 */
export const LayoutPanel: React.FC<LayoutPanelProps> = ({ layout, togglePanel }) => {
  return (
    <div className="flex items-center space-x-1 bg-darkSurface border border-darkBorder p-1 rounded-md">
      <button
        onClick={() => togglePanel('gridVisible')}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
          layout.gridVisible
            ? 'bg-accentBlue text-textPrimary shadow-sm shadow-accentBlue/25'
            : 'text-textMuted hover:text-textPrimary hover:bg-darkBorder/55'
        }`}
        title="Toggle Grid Window"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Grid Window</span>
      </button>

      <button
        onClick={() => togglePanel('analyticsVisible')}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
          layout.analyticsVisible
            ? 'bg-accentBlue text-textPrimary shadow-sm shadow-accentBlue/25'
            : 'text-textMuted hover:text-textPrimary hover:bg-darkBorder/55'
        }`}
        title="Toggle Department Analytics"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Analytics</span>
      </button>

      <button
        onClick={() => togglePanel('togglesVisible')}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all ${
          layout.togglesVisible
            ? 'bg-accentBlue text-textPrimary shadow-sm shadow-accentBlue/25'
            : 'text-textMuted hover:text-textPrimary hover:bg-darkBorder/55'
        }`}
        title="Toggle Infrastructure Filters"
      >
        <ToggleLeft className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Infra Switches</span>
      </button>
    </div>
  );
};
