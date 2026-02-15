import React, { useState, useRef, useCallback } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SendButtonProps {
  isCompact?: boolean;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
}

const QuickAnswerButton = ({
  isCompact,
  onClick,
  disabled = false,
}: SendButtonProps) => {
  const [isSending, setIsSending] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(async () => {
    if (isSending || disabled) return;

    setIsSending(true);
    try {
      if (onClick) await onClick();
    } catch (error) {
      console.error('Request failed:', error);
    } finally {
      setIsSending(false);
    }
  }, [onClick, isSending, disabled]);

  // Keyboard shortcut "A" is handled by the parent Recorder component
  // to avoid duplicate handlers and ensure correct behavior across modes

  if (isCompact) {
    return (
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onClick}
          disabled={disabled}
          className={`cursor-pointer
        flex items-center justify-center w-8 h-8
      bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] text-white rounded-xl font-medium transition-all duration-200 hover:from-[#E85F00] hover:to-[#FF8A2A] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-primary/15
        
      `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Get AI answer (A)"
          title="Get AI answer (A)"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
        </motion.button>
        <p className="text-xs opacity-70 mt-1">
          Press <kbd className="py-0.5 px-1 bg-muted border border-border rounded text-xs">A</kbd>
        </p>
      </div>
    );
  }

  return (
    <motion.button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={isSending || disabled}
      className="lg:flex-1 cursor-pointer flex items-center justify-center gap-3 w-10 h-10 lg:w-fit lg:h-fit p-1 lg:p-4 bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] text-white rounded-2xl font-medium transition-all duration-200 hover:from-[#E85F00] hover:to-[#FF8A2A] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-primary/15"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label="Get AI answer (A)"
      title="Get AI answer (A)"
    >
      {isSending ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Zap className="w-5 h-5" />
      )}
      <span className="font-semibold hidden lg:block">
        {isSending ? 'Answering...' : 'AI Answer'}
      </span>
      <kbd className="hidden lg:block px-2 py-1 bg-white/20 border border-white/30 rounded text-xs">
        A
      </kbd>
    </motion.button>
  );
};

export default QuickAnswerButton;
