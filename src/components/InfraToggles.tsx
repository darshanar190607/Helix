import React, { useState } from 'react';
import { ToggleRight, Cpu, Cloud } from 'lucide-react';
import { StateEngine } from '../lib/StateEngine';

export const InfraToggles: React.FC = () => {
  const [aiFilter, setAiFilter] = useState<'All' | 'Yes' | 'No'>('All');
  const [cloudFilter, setCloudFilter] = useState<'All' | 'Yes' | 'No'>('All');

  const handleAiChange = (val: 'All' | 'Yes' | 'No') => {
    setAiFilter(val);
    StateEngine.getInstance().setSwitchFilter('ai_enabled', val);
  };

  const handleCloudChange = (val: 'All' | 'Yes' | 'No') => {
    setCloudFilter(val);
    StateEngine.getInstance().setSwitchFilter('cloud_deployment', val);
  };

  // Sync on reset: subscribe only to filter resets (when both go back to 'All')
  React.useEffect(() => {
    const engine = StateEngine.getInstance();
    // Only re-subscribe for external resets, not every tick
    const unsub = engine.subscribe((snap) => {
      const ai = (snap.activeFilters.ai_enabled as string) || 'All';
      const cloud = (snap.activeFilters.cloud_deployment as string) || 'All';
      setAiFilter(ai as 'All' | 'Yes' | 'No');
      setCloudFilter(cloud as 'All' | 'Yes' | 'No');
    });
    return unsub;
  }, []);

  return (
    <div className="flex flex-col border border-darkBorder bg-darkSurface rounded-lg p-5 h-full shadow-md select-none">
      <div className="flex items-center space-x-2 border-b border-darkBorder pb-3.5 mb-4">
        <ToggleRight className="w-4 h-4 text-accentBlue" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-textPrimary">
          Infrastructure Deployment Switches
        </h3>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-6">
        {/* AI Enabled Switch */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-1.5 text-xs text-textMuted font-bold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-accentBlue/80" />
            <span>AI Enabled Status</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-darkBg border border-darkBorder/60 p-1 rounded-md">
            {(['All', 'Yes', 'No'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => handleAiChange(opt)}
                className={`py-1 text-xs font-semibold rounded transition-all ${
                  aiFilter === opt
                    ? 'bg-accentBlue text-textPrimary shadow-sm shadow-accentBlue/25'
                    : 'text-textMuted hover:text-textPrimary hover:bg-darkBorder/40'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Cloud Deployment Switch */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-1.5 text-xs text-textMuted font-bold uppercase tracking-wider">
            <Cloud className="w-3.5 h-3.5 text-accentBlue/80" />
            <span>Cloud Deployment</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-darkBg border border-darkBorder/60 p-1 rounded-md">
            {(['All', 'Yes', 'No'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => handleCloudChange(opt)}
                className={`py-1 text-xs font-semibold rounded transition-all ${
                  cloudFilter === opt
                    ? 'bg-accentBlue text-textPrimary shadow-sm shadow-accentBlue/25'
                    : 'text-textMuted hover:text-textPrimary hover:bg-darkBorder/40'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
