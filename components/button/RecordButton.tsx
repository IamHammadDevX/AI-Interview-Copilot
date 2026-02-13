import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
import { useEffect } from 'react';

interface RecordButtonProps {
  onClick: () => void;
  disabled?: boolean;
  recording: boolean;
  useWebAPI?: boolean;
  isCompact?: boolean;
}

const RecordButton = ({
  onClick,
  disabled,
  recording,
  isCompact,
  useWebAPI = false,
}: RecordButtonProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'KeyS') {
        e.preventDefault();
        onClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClick, recording, disabled]);

  if (isCompact) {
    return (
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onClick}
          disabled={disabled}
          className={`cursor-pointer
            relative w-12 h-12 rounded-full font-semibold text-white transition-all duration-300 
            transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-offset-1 shadow-lg
            ${
              recording
                ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:ring-red-200'
                : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-200'
            }
          `}
          whileTap={{ scale: 0.9 }}
          title={recording ? 'Stop recording (S)' : 'Start recording (S)'}
        >
          <div className="relative flex items-center justify-center">
            {recording && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/30"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  ease: 'easeOut',
                  repeat: Infinity,
                }}
              />
            )}
            {recording ? (
              <Square size={16} className="fill-current" />
            ) : (
              <Mic size={18} />
            )}
          </div>
        </motion.button>
        <p className="text-xs text-gray-500 mt-1">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">S</kbd>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden lg:flex justify-center lg:mb-4">
        <motion.button
          onClick={onClick}
          disabled={disabled}
          className={`
                relative cursor-pointer w-14 h-14 rounded-full font-semibold text-white transition-all duration-300 
                transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-4 focus:ring-offset-2
                ${
                  recording
                    ? 'bg-red-500 hover:bg-red-600 focus:ring-red-200 shadow-lg shadow-red-200'
                    : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-200 shadow-lg shadow-blue-200'
                }
              `}
          whileTap={{ scale: 0.95 }}
          aria-label={recording ? 'Stop recording (S)' : 'Start recording (S)'}
          title={recording ? 'Stop recording (S)' : 'Start recording (S)'}
        >
          <div className="relative flex items-center justify-center">
            {recording && (
              <AnimatePresence>
                {[0, 0.3, 0.6].map((delay) => (
                  <motion.div
                    key={delay}
                    className="absolute inset-0 rounded-full bg-white/20"
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{
                      delay,
                      duration: 1.5,
                      ease: 'easeOut',
                      repeat: Infinity,
                    }}
                  />
                ))}
              </AnimatePresence>
            )}
            {recording ? (
              <div className="w-6 h-6 bg-white rounded-sm" />
            ) : (
              <Mic size={32} />
            )}
          </div>
        </motion.button>
      </div>

      <div className="flex lg:hidden justify-center lg:mb-4">
        <motion.button
          onClick={onClick}
          disabled={disabled}
          className={`
                relative w-12 h-12 rounded-full font-semibold text-white transition-all duration-300 
                disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1
                ${
                  recording
                    ? 'bg-red-500 hover:bg-red-600 focus:ring-red-200'
                    : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-200'
                }
              `}
          whileTap={{ scale: 0.95 }}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          <div className="relative flex items-center justify-center">
            {recording && (
              <AnimatePresence>
                {[0, 0.4].map((delay) => (
                  <motion.div
                    key={delay}
                    className="absolute inset-0 rounded-full bg-white/20"
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{
                      delay,
                      duration: 1.2,
                      ease: 'easeOut',
                      repeat: Infinity,
                    }}
                  />
                ))}
              </AnimatePresence>
            )}
            {recording ? (
              <div className="w-3 h-3 bg-white rounded-sm" />
            ) : (
              <Mic size={18} />
            )}
          </div>
        </motion.button>
      </div>

      <div className="hidden lg:block text-center mb-8">
        <p className="text-gray-600 font-medium text-sm">
          {recording ? 'Click to stop recording' : 'Click to start recording'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Use <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">S</kbd>{' '}
          for quick access
        </p>
        {useWebAPI && (
          <p className="text-xs text-blue-600 mt-1">
            Live transcript enabled with Web API
          </p>
        )}
      </div>
    </>
  );
};

export default RecordButton;
