import { Loader2, MonitorPlay } from 'lucide-react';
import React from 'react';

interface CaptureButtonProps {
  capturing?: boolean;
  loading?: boolean;
  onStartCapture?: () => void;
  onTakeScreenshot?: () => void;
  className?: string;
}

const CaptureButton: React.FC<CaptureButtonProps> = ({ 
  capturing = false, 
  loading = false, 
  onStartCapture, 
  onTakeScreenshot,
  className = ''
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!loading) {
      capturing ? onTakeScreenshot?.() : onStartCapture?.();
    }
  };

  return (
    <button
      className={`
        relative flex items-center gap-2 px-3 py-2 
        font-medium text-white rounded-xl
        bg-gradient-to-r from-amber-500 to-orange-600
        hover:from-amber-600 hover:to-orange-700
        focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2
        shadow-md hover:shadow-xl
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
        ${!capturing && !loading ? 'hover:scale-105 active:scale-95' : ''}
        ${!capturing && !loading ? 'animate-bounce' : ''}
        ${className}
      `}
      onClick={handleClick}
      disabled={loading}
      type="button"
    >
      {/* Icon */}
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : capturing ? (
        ''
      ) : (
        <MonitorPlay className="w-5 h-5" />
      )}

      {/* Text Content */}
      <span className="flex items-center gap-1">
        {loading ? (
          'Connecting...'
        ) : capturing ? (
          <>
            <kbd className="px-1.5 mr-2 py-0.5 text-xs font-mono bg-white/20 text-white rounded border border-white/30">
              X
            </kbd>
            AI Screenshot
          </>
        ) : (
          'Start Capture'
        )}
      </span>
    </button>
  );
};

export default CaptureButton;