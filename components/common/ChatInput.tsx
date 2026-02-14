import React, { useRef, useEffect, useImperativeHandle } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  // eslint-disable-next-line no-unused-vars
  onSend: (question: string) => Promise<void>;
  isLoading?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(function ChatInput(
  {
    onSend,
    isLoading = false,
    isStreaming = false,
    placeholder = 'Type or edit your question here…',
    disabled = false,
  },
  ref
) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const blurTimeoutRef = useRef(null);
  const [value, setValue] = React.useState('');

  useImperativeHandle(ref, () => inputRef.current as HTMLTextAreaElement, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      inputRef.current?.blur();
    }, 2000);
  };

  const handleSend = () => {
    if (value.trim() && !disabled && !isLoading && !isStreaming) {
      onSend(value);
      setValue('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = '1.5rem';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const canSend = value.trim() && !disabled && !isLoading && !isStreaming;

  return (
    <div className="lg:mt-4 relative">
      <div className="relative flex items-center gap-2 p-1 lg:p-3 bg-muted/40 rounded-2xl border border-border focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-ring/30 transition-all">
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground text-sm leading-relaxed max-h-32"
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 128) + 'px';
          }}
        />

        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          variant={canSend ? 'default' : 'ghost'}
          className={canSend ? '' : 'opacity-40'}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
});

export default ChatInput;
