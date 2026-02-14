/* eslint-disable no-unused-vars */
import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, Globe } from 'lucide-react';
import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  description: string;
  isVisible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const Tooltip = ({
  children,
  content,
  description,
  isVisible,
  onMouseEnter,
  onMouseLeave,
}: TooltipProps) => (
  <div
    className="relative"
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    {children}
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
        >
          <div className="bg-popover/95 backdrop-blur text-popover-foreground p-3 rounded-2xl shadow-xl border border-border min-w-64 max-w-xs">
            <div className="font-semibold text-sm mb-1">{content}</div>
            <div className="text-xs opacity-70 leading-relaxed">
              {description}
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-popover"></div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

interface SpeechRecognitionToggleProps {
  useWebAPI: boolean;
  onToggle: (useWebAPI: boolean) => void;
  disabled?: boolean;
  isCompact?: boolean;
}

const SpeechRecognitionToggle = ({
  useWebAPI,
  onToggle,
  disabled = false,
  isCompact,
}: SpeechRecognitionToggleProps) => {
  const [whisperTooltipVisible, setWhisperTooltipVisible] = useState(false);
  const [webAPITooltipVisible, setWebAPITooltipVisible] = useState(false);

  if (isCompact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-card/70 backdrop-blur rounded-2xl border border-border shadow-sm">
        <div
          className={`text-xs ${
            !useWebAPI ? 'text-primary font-medium' : 'opacity-50'
          }`}
        >
          <Globe className="w-3 h-3" />
        </div>

        <motion.button
          onClick={() => !disabled && onToggle(!useWebAPI)}
          disabled={disabled}
          className={`
            relative w-8 h-4 rounded-full transition-colors duration-300 focus:outline-none
            ${useWebAPI ? 'bg-primary' : 'bg-muted'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          whileTap={!disabled ? { scale: 0.95 } : {}}
          title={`Switch to ${useWebAPI ? 'Whisper' : 'Web API'}`}
        >
          <motion.div
            className="absolute top-0.5 w-3 h-3 bg-background rounded-full shadow-sm"
            animate={{ x: useWebAPI ? 16 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </motion.button>

        <div
          className={`text-xs ${
            useWebAPI ? 'text-primary font-medium' : 'opacity-50'
          }`}
        >
          <Cpu className="w-3 h-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center gap-4 p-3 bg-muted/40 rounded-2xl border border-border">
      <Tooltip
        content="Whisper API"
        description="AI-powered speech recognition with Whisper. Auto language detection. Backend processing for high accuracy (slightly slower). Requires API key."
        isVisible={whisperTooltipVisible}
        onMouseEnter={() => setWhisperTooltipVisible(true)}
        onMouseLeave={() => setWhisperTooltipVisible(false)}
      >
        <div className="flex items-center gap-2 text-sm font-medium cursor-help">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">Whisper API</span>
        </div>
      </Tooltip>

      <motion.button
        onClick={() => !disabled && onToggle(!useWebAPI)}
        disabled={disabled}
        className={`
          relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-primary/15
          ${useWebAPI ? 'bg-primary' : 'bg-muted'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        aria-label={`Switch to ${
          useWebAPI ? 'Custom' : 'Web API'
        } speech recognition`}
        title={`Currently using ${
          useWebAPI ? 'Web API' : 'Whisper API'
        } recognition`}
      >
        <motion.div
          className="absolute top-0.5 w-6 h-6 bg-background rounded-full shadow-md"
          animate={{
            x: useWebAPI ? 28 : 2,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        />
      </motion.button>

      <Tooltip
        content="Web Speech API"
        description="Browser-native speech recognition. Completely free and a bit faster. Uses your device’s built-in engine with good accuracy. Defaults to English; language can be changed in code."
        isVisible={webAPITooltipVisible}
        onMouseEnter={() => setWebAPITooltipVisible(true)}
        onMouseLeave={() => setWebAPITooltipVisible(false)}
      >
        <div className="flex items-center gap-2 text-sm font-medium cursor-help">
          <Cpu className="w-4 h-4" />
          <span className="hidden sm:inline">Web API</span>
        </div>
      </Tooltip>
    </div>
  );
};

export default SpeechRecognitionToggle;
