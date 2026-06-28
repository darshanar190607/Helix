import React from 'react';
import { Play, Pause } from 'lucide-react';
import { StateEngine } from '../lib/StateEngine';

interface PauseControlProps {
  isPaused: boolean;
  bufferedBatchesCount: number;
}

/**
 * Feature 5: Pipeline Buffer Control (Pause / Play)
 */
export const PauseControl: React.FC<PauseControlProps> = ({
  isPaused,
  bufferedBatchesCount,
}) => {
  const engine = StateEngine.getInstance();

  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={() => engine.togglePause()}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md font-semibold text-sm transition-all focus:outline-none focus:ring-1 focus:ring-accentBlue ${
          isPaused
            ? 'bg-statusWarning text-black hover:bg-statusWarning/90 animate-pulse'
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
        <span className="flex items-center space-x-1.5 px-3 py-1 rounded bg-statusWarning/10 border border-statusWarning/30 text-statusWarning text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-statusWarning animate-ping" />
          <span>Paused &mdash; {bufferedBatchesCount} batches buffered</span>
        </span>
      )}
    </div>
  );
};
