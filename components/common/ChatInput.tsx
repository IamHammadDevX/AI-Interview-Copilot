import React, { useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  // eslint-disable-next-line no-unused-vars
  onSend: (question: string) => Promise<void>;
  isLoading?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const ChatInput = ({
  onSend,
  isLoading = false,
  isStreaming = false,
  placeholder = 'Type or edit your question here…',
  disabled = false,
}: ChatInputProps) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const blurTimeoutRef = useRef(null);
  const [value, setValue] = React.useState('');

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
      <div className="relative flex items-center gap-2 p-1 lg:p-3 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-500 text-sm leading-relaxed max-h-32"
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 128) + 'px';
          }}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 flex-shrink-0 ${
            canSend
              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
