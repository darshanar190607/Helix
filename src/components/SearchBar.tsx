import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { StateEngine } from '../lib/StateEngine';

interface SearchBarProps {
  initialValue: string;
}

/**
 * Feature 10: Multi-Field Fuzzy Search Engine
 * Supports 80ms debounced input query dispatching.
 */
export const SearchBar: React.FC<SearchBarProps> = ({ initialValue }) => {
  const [value, setValue] = useState(initialValue);
  const engine = StateEngine.getInstance();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevInitial = useRef(initialValue);

  // Only sync from outside when it's a genuine reset (empty string) not a tick update
  useEffect(() => {
    if (initialValue === '' && prevInitial.current !== '') {
      setValue('');
    }
    prevInitial.current = initialValue;
  }, [initialValue]);

  // Handle cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce by 80ms
    timeoutRef.current = setTimeout(() => {
      engine.setSearchQuery(val);
    }, 80);
  };

  const handleClear = () => {
    setValue('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    engine.setSearchQuery('');
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-textMuted" />
      </div>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Fuzzy search projects, companies, partners..."
        className="block w-full pl-9 pr-8 py-2 bg-darkSurface border border-darkBorder rounded-md text-sm text-textPrimary placeholder-textMuted focus:outline-none focus:ring-1 focus:ring-accentBlue focus:border-accentBlue transition-colors"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-textMuted hover:text-textPrimary"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
