import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SendButtonProps {
  isCompact?: boolean;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
}

const ClearContextButton = ({
  isCompact,
  onClick,
  disabled = false,
}: SendButtonProps) => {
  const [isSending, setIsSending] = useState(false);

  const handleClick = useCallback(async () => {
    if (isSending || disabled) return;

    setIsSending(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
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

      if (e.code === 'KeyD' && !isSending && !disabled) {
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
          className="cursor-pointer flex items-center justify-center w-8 h-8
      bg-muted/40 text-foreground rounded-xl font-medium transition-all duration-200 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-ring/30"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Clear recording (D)"
          title="Clear recording (D)"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </motion.button>
        <p className="text-xs opacity-70 mt-1">
          Press <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-xs">D</kbd>
        </p>
      </div>
    );
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={isSending || disabled}
      className="flex cursor-pointer lg:flex-1 items-center justify-center gap-3 w-10 h-10 lg:w-fit lg:h-fit p-1 lg:p-4 bg-muted/40 text-foreground rounded-2xl font-medium transition-all duration-200 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-ring/30"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label="Clear recording (D)"
      title="Clear recording (D)"
    >
      {isSending ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Trash2 className="w-5 h-5" />
      )}
      <span className="hidden lg:block font-semibold">
        {isSending ? 'Clearing...' : 'Clear'}
      </span>
      <kbd className="hidden lg:block px-2 py-1 bg-muted border border-border rounded text-xs">
        D
      </kbd>
    </motion.button>
  );
};

export default ClearContextButton;
