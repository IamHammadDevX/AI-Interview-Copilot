import React, { useState, useEffect, useRef, useCallback } from 'react';
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
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (onClick) await onClick();
    } catch (error) {
      console.error('Request failed:', error);
    } finally {
      setIsSending(false);
    }
  }, [onClick, isSending, disabled]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'KeyA' && !isSending && !disabled) {
        e.preventDefault();
        handleClick();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClick, isSending, disabled]);

  if (isCompact) {
    return (
      <div className="flex flex-col items-center">
        <motion.button
          onClick={onClick}
          disabled={disabled}
          className={`cursor-pointer
        flex items-center justify-center w-8 h-8
      bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium transition-all duration-200 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2
        
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
        <p className="text-xs text-gray-500 mt-1">
          Press <kbd className=" py-0.5 bg-gray-100 rounded text-xs">A</kbd>
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
      className="lg:flex-1 cursor-pointer flex items-center justify-center gap-3 w-10 h-10 lg:w-fit lg:h-fit p-1 lg:p-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium transition-all duration-200 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2"
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
      <kbd className="hidden lg:block px-2 py-1 bg-orange-700/50 rounded text-xs">
        A
      </kbd>
    </motion.button>
  );
};

export default QuickAnswerButton;
