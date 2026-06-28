import React from 'react';
import { Play, Pause, BarChart2 } from 'lucide-react';
import { StateEngine } from '../lib/StateEngine';

interface PauseControlProps {
  isPaused: boolean;
  bufferedBatchesCount: number;
  onAnalyticsView: () => void;
  analyticsOpen: boolean;
}

export const PauseControl: React.FC<PauseControlProps> = ({
  isPaused,
  bufferedBatchesCount,
  onAnalyticsView,
  analyticsOpen,
}) => {
  const engine = StateEngine.getInstance();

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => engine.togglePause()}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md font-semibold text-sm transition-all focus:outline-none focus:ring-1 focus:ring-accentBlue ${
          isPaused
            ? 'bg-statusWarning text-black hover:bg-statusWarning/90'
            : 'bg-accentBlue text-textPrimary hover:bg-accentBlue/90'
        }`}
      >
        {isPaused ? (
          <>
            <Play className="w-4 h-4 fill-black" />
            <span>Resume Stream</span>
          </>
        ) : (
          <>
            <Pause className="w-4 h-4 fill-textPrimary" />
            <span>Pause Stream</span>
          </>
        )}
      </button>

      {isPaused && (
        <>
          {/* Buffered batch count badge */}
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded bg-statusWarning/10 border border-statusWarning/30 text-statusWarning text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-statusWarning animate-ping" />
            <span>Paused &mdash; {bufferedBatchesCount} batches buffered</span>
          </span>

          {/* Analytics View toggle — only visible while paused, acts as true toggle */}
          <button
            onClick={onAnalyticsView}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-semibold text-sm border transition-all focus:outline-none focus:ring-1 focus:ring-accentBlue ${
              analyticsOpen
                ? 'bg-accentBlue/20 border-accentBlue text-accentBlue'
                : 'border-accentBlue/50 text-accentBlue hover:bg-accentBlue/10 hover:border-accentBlue'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>{analyticsOpen ? 'Close Analytics' : 'Analytics View'}</span>
          </button>
        </>
      )}
    </div>
  );
};
