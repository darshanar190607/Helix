import React from 'react';
import type { SortKey } from '../lib/types';
import { StateEngine } from '../lib/StateEngine';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface GridHeaderProps {
  sortPriority: SortKey[];
}

interface ColumnDef {
  label: string;
  field: string;
  width: string;
  sortable: boolean;
  align: 'left' | 'right' | 'center';
}

// Columns configuration aligned with F8 and sortable definitions
export const COLUMNS: ColumnDef[] = [
  { label: 'Project Name', field: 'project_name', width: '220px', sortable: false, align: 'left' },
  { label: 'Company ID', field: 'company_id', width: '100px', sortable: false, align: 'left' },
  { label: 'Status', field: 'project_status', width: '100px', sortable: false, align: 'center' },
  { label: 'Type', field: 'automation_type', width: '150px', sortable: false, align: 'left' },
  { label: 'Budget', field: 'budget_usd', width: '110px', sortable: true, align: 'right' },
  { label: 'Savings', field: 'annual_savings_usd', width: '110px', sortable: true, align: 'right' }, // Make Savings sortable too!
  { label: 'ROI', field: 'roi_percent', width: '90px', sortable: true, align: 'right' },
  { label: 'Robots', field: 'robots_deployed', width: '90px', sortable: true, align: 'right' },
  { label: 'Hours Saved', field: 'employee_hours_saved', width: '120px', sortable: true, align: 'right' },
  { label: 'Country', field: 'country', width: '110px', sortable: false, align: 'left' },
];

const SUPERSCRIPTS = ['¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

export const GridHeader: React.FC<GridHeaderProps> = ({ sortPriority }) => {
  const engine = StateEngine.getInstance();

  const handleHeaderClick = (field: string, event: React.MouseEvent) => {
    // Check if Shift key was pressed for multi-column sorting (Feature 9)
    engine.toggleSort(field, event.shiftKey);
  };

  const getSortIndicator = (field: string) => {
    const priorityIndex = sortPriority.findIndex((s) => s.field === field);
    if (priorityIndex === -1) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-30 text-textMuted group-hover:opacity-100 transition-opacity ml-1" />;
    }

    const item = sortPriority[priorityIndex];
    const indicator = item.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-accentBlue ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-accentBlue ml-1" />
    );

    // Get priority number
    const priorityNum = SUPERSCRIPTS[priorityIndex] || `(${priorityIndex + 1})`;

    return (
      <div className="flex items-center">
        {indicator}
        <span className="text-[10px] text-accentBlue font-black ml-0.5">{priorityNum}</span>
      </div>
    );
  };

  return (
    <div className="flex items-center bg-darkSurface border-b border-darkBorder text-[10px] font-bold text-textMuted uppercase tracking-wider h-10 w-full select-none select-none sticky top-0 z-10 shadow-sm shadow-black/20">
      {COLUMNS.map((col) => {
        const isSortable = col.sortable;
        const alignClass =
          col.align === 'right'
            ? 'justify-end'
            : col.align === 'center'
            ? 'justify-center'
            : 'justify-start';

        return (
          <div
            key={col.field}
            style={{ width: col.width }}
            onClick={(e) => isSortable && handleHeaderClick(col.field, e)}
            className={`flex items-center px-4 shrink-0 h-full ${alignClass} ${
              isSortable ? 'cursor-pointer hover:bg-darkBorder/40 hover:text-textPrimary group transition-colors' : ''
            }`}
            title={isSortable ? 'Click to sort, Shift+Click to add secondary sort' : undefined}
          >
            <span className="truncate">{col.label}</span>
            {isSortable && getSortIndicator(col.field)}
          </div>
        );
      })}
    </div>
  );
};
