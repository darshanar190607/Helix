import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { StateEngine } from '../lib/StateEngine';

interface DropdownProps {
  label: string;
  field: 'automation_type' | 'department' | 'industry';
  options: string[];
  selected: Set<string>;
  onSelect: (selected: Set<string>) => void;
}

/**
 * Optimized Dropdown Component. Uses React.memo to prevent re-renders (Feature 7).
 * It will only re-render if the options list changes, or if selection changes.
 */
const FilterDropdown: React.FC<DropdownProps> = React.memo(({
  label,
  options,
  selected,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (option: string) => {
    const nextSelected = new Set(selected);
    if (nextSelected.has(option)) {
      nextSelected.delete(option);
    } else {
      nextSelected.add(option);
    }
    onSelect(nextSelected);
  };

  const handleClear = () => {
    onSelect(new Set());
  };

  const selectedCount = selected.size;
  const labelText = selectedCount > 0 ? `${label} (${selectedCount})` : label;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between space-x-2 px-3 py-2 bg-darkSurface border rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-accentBlue ${
          selectedCount > 0
            ? 'border-accentBlue/65 text-accentBlue'
            : 'border-darkBorder text-textPrimary hover:border-textMuted'
        }`}
      >
        <span>{labelText}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 max-h-72 overflow-y-auto bg-darkSurface border border-darkBorder rounded-md shadow-lg shadow-black/50 z-50 py-1">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-darkBorder mb-1">
            <span className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Select Options</span>
            {selectedCount > 0 && (
              <button
                onClick={handleClear}
                className="text-[10px] text-statusDanger hover:underline font-semibold"
              >
                Clear All
              </button>
            )}
          </div>
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-textMuted italic">No values loaded...</div>
          ) : (
            options.map((option) => {
              const isChecked = selected.has(option);
              return (
                <label
                  key={option}
                  className="flex items-center space-x-2.5 px-3 py-2 hover:bg-darkBorder/40 cursor-pointer text-xs text-textPrimary transition-colors select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleOption(option)}
                    className="w-3.5 h-3.5 rounded border-darkBorder bg-darkBg text-accentBlue focus:ring-accentBlue/50 focus:ring-offset-0 focus:outline-none"
                  />
                  <span className="truncate">{option}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-render unless values or options references actually change.
  if (prevProps.options !== nextProps.options) return false;
  if (prevProps.selected.size !== nextProps.selected.size) return false;
  
  // Check Set equality
  for (const item of prevProps.selected) {
    if (!nextProps.selected.has(item)) return false;
  }
  return true;
});

FilterDropdown.displayName = 'FilterDropdown';

interface FilterBarProps {
  activeFilters: {
    automation_type: Set<string>;
    department: Set<string>;
    industry: Set<string>;
  };
  uniqueValues: {
    automation_type: string[];
    department: string[];
    industry: string[];
  };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeFilters,
  uniqueValues,
}) => {
  const engine = StateEngine.getInstance();

  const handleSelect = (field: 'automation_type' | 'department' | 'industry') => (selectedSet: Set<string>) => {
    engine.setFilter(field, selectedSet);
  };

  const hasAnyFilters =
    activeFilters.automation_type.size > 0 ||
    activeFilters.department.size > 0 ||
    activeFilters.industry.size > 0;

  const handleClearAll = () => {
    engine.setFilter('automation_type', new Set());
    engine.setFilter('department', new Set());
    engine.setFilter('industry', new Set());
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center space-x-1 text-textMuted text-xs font-semibold mr-1">
        <Filter className="w-3.5 h-3.5" />
        <span>Filters:</span>
      </div>

      <FilterDropdown
        label="Automation Type"
        field="automation_type"
        options={uniqueValues.automation_type}
        selected={activeFilters.automation_type}
        onSelect={handleSelect('automation_type')}
      />

      <FilterDropdown
        label="Department"
        field="department"
        options={uniqueValues.department}
        selected={activeFilters.department}
        onSelect={handleSelect('department')}
      />

      <FilterDropdown
        label="Industry"
        field="industry"
        options={uniqueValues.industry}
        selected={activeFilters.industry}
        onSelect={handleSelect('industry')}
      />

      {hasAnyFilters && (
        <button
          onClick={handleClearAll}
          className="text-xs text-statusDanger hover:text-statusDanger/80 font-bold px-2 py-1.5 rounded hover:bg-statusDanger/5 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
};
