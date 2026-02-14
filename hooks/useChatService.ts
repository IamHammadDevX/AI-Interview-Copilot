import { ErrorToast } from '@/components/Toast';
import { makeCopilotRequest } from '@/utils/apiUtils';
import { useEffect, useRef, useState } from 'react';

type Role = 'user' | 'assistant';
interface Turn {
  role: Role;
  content: string;
  meta?: {
    source: 'document' | 'internet' | 'base-ai';
    confidence: 'high' | 'medium' | 'low';
  };
}

export default function useChatService({
  projectId,
}: {
  projectId?: string | null;
} = {}) {
  const chatHistoryRef = useRef<Turn[]>([]);
  const [chatHistory, setChatHistory] = useState<Turn[]>([]);
  const [transcript, setTranscript] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('chat-history');
    if (savedHistory) {
      try {
        const parsed: Turn[] = JSON.parse(savedHistory);
        setChatHistory(parsed);
        chatHistoryRef.current = parsed;
      } catch (e) {
        console.error('Failed to parse saved turns from localStorage');
      }
    }
  }, []);

  useEffect(() => {
    if (!isStreaming && chatHistory.length > 0) {
      localStorage.setItem('chat-history', JSON.stringify(chatHistory));
    }
  }, [isStreaming, chatHistory]);

  const handleTranscript = async (question: string, imageDataUrl?: string) => {
    if (!question.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    addMessageToHistory('user', question);

    setIsThinking(true);

    try {
      abortControllerRef.current = new AbortController();
      const fullHistory = [...chatHistoryRef.current];
      const historyToSend = fullHistory.slice(-9);

      const shouldUseRag = Boolean(projectId) && !imageDataUrl;

      const res = shouldUseRag
        ? await fetch(`/api/projects/${projectId}/rag`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
            signal: abortControllerRef.current.signal,
          })
        : await makeCopilotRequest({
            question,
            history: historyToSend,
            imageDataUrl,
            signal: abortControllerRef.current.signal,
          });

      if (!res.ok) {
        let code = '';
        try {
          const data = await res.json();
          code = (data?.error?.code || '').toLowerCase();
        } catch {
          /* empty */
        }

        if (code === 'insufficient_quota') {
          ErrorToast(
            'Quota exceeded. Please top up your OpenAI/Deepseek account.',
            7000
          );
          return;
        }

        ErrorToast('Something went wrong. Try again');
        return;
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        setIsThinking(false);
        const data = (await res.json().catch(() => null)) as null | {
          answer?: string;
          source?: 'document' | 'internet' | 'base-ai';
          confidence?: 'high' | 'medium' | 'low';
        };

        addMessageToHistory(
          'assistant',
          data?.answer ?? '',
          data?.source && data?.confidence
            ? { source: data.source, confidence: data.confidence }
            : undefined
        );

        return;
      }

      setIsThinking(false);
      setIsStreaming(true);

      addMessageToHistory('assistant', '');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        try {
          for (;;) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  setIsStreaming(false);
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    accumulatedContent += parsed.content;
                    updateLastMessageInHistory(accumulatedContent);
                  }
                } catch {
                  /* ignore */
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error: any) {
      console.error('Error getting response:', error);
      if (error.name !== 'AbortError') {
        addMessageToHistory(
          'assistant',
          'Sorry, I encountered an error. Please try again.'
        );
      }
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const addMessageToHistory = (
    role: Turn['role'],
    content: string,
    meta?: Turn['meta']
  ) => {
    const updated = [...chatHistoryRef.current, { role, content, meta }];
    chatHistoryRef.current = updated;
    setChatHistory(updated);
  }

  const clearChatHistory = () => {
    chatHistoryRef.current = [];
    setChatHistory([]);
    localStorage.removeItem('chat-history');
  };

  const updateLastMessageInHistory = (content: string) => {
    setChatHistory((prevHistory) => {
      const newMessages = [...prevHistory];
      if (
        newMessages.length > 0 &&
        newMessages[newMessages.length - 1].role === 'assistant'
      ) {
        newMessages[newMessages.length - 1].content = content;
      }

      chatHistoryRef.current = newMessages;

      return newMessages;
    });
  };

  return {
    chatHistory,
    isThinking,
    isStreaming,
    transcript,
    handleTranscript,
    setTranscript,
    clearChatHistory,
  };
}
