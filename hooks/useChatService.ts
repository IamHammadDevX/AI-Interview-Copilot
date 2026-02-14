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
  const [isSearchingDocs, setIsSearchingDocs] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const storageKey = `chat-history:${projectId ?? 'global'}`;

  useEffect(() => {
    const savedHistory = localStorage.getItem(storageKey);
    if (savedHistory) {
      try {
        const parsed: Turn[] = JSON.parse(savedHistory);
        setChatHistory(parsed);
        chatHistoryRef.current = parsed;
      } catch (e) {
        console.error('Failed to parse saved turns from localStorage');
      }
    } else {
      setChatHistory([]);
      chatHistoryRef.current = [];
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isStreaming && chatHistory.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(chatHistory));
    }
  }, [isStreaming, chatHistory, storageKey]);

  const handleTranscript = async (question: string, imageDataUrl?: string) => {
    if (!question.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    addMessageToHistory('user', question);

    setIsThinking(true);
    setIsSearchingDocs(false);

    try {
      abortControllerRef.current = new AbortController();
      const fullHistory = [...chatHistoryRef.current];
      const historyToSend = fullHistory.slice(-9);

      const shouldUseRag = Boolean(projectId) && !imageDataUrl;

      if (shouldUseRag) {
        setIsSearchingDocs(true);

        const searchRes = await fetch(`/api/projects/${projectId}/rag/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
          signal: abortControllerRef.current.signal,
        });

        const searchData = (await searchRes.json().catch(() => null)) as null | {
          matches?: Array<{ content: string; similarity: number }>
          confidence?: 'high' | 'medium' | 'low'
          error?: string
        }

        if (!searchRes.ok) {
          throw new Error(searchData?.error ?? 'Document search failed')
        }

        const matches = searchData?.matches ?? []
        const confidence = searchData?.confidence ?? 'low'

        if (matches.length > 0) {
          const answerRes = await fetch(`/api/projects/${projectId}/rag/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, matches, confidence }),
            signal: abortControllerRef.current.signal,
          })

          const answerData = (await answerRes.json().catch(() => null)) as null | {
            answer?: string
            source?: 'document'
            confidence?: 'high' | 'medium' | 'low'
            error?: string
          }

          setIsThinking(false)
          setIsSearchingDocs(false)

          if (!answerRes.ok) {
            throw new Error(answerData?.error ?? 'RAG answer failed')
          }

          addMessageToHistory('assistant', answerData?.answer ?? '', {
            source: 'document',
            confidence: (answerData?.confidence ?? confidence) as any,
          })
          return
        }

        setIsSearchingDocs(false)

        const baseRes = await fetch(`/api/projects/${projectId}/rag/base`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
          signal: abortControllerRef.current.signal,
        })

        const baseData = (await baseRes.json().catch(() => null)) as null | {
          answer?: string
          source?: 'base-ai'
          confidence?: 'high' | 'medium' | 'low'
          error?: string
        }

        setIsThinking(false)

        if (!baseRes.ok) {
          throw new Error(baseData?.error ?? 'AI search failed')
        }

        addMessageToHistory('assistant', baseData?.answer ?? '', {
          source: 'base-ai',
          confidence: 'low',
        })
        return
      }

      const res = await makeCopilotRequest({
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
        setIsSearchingDocs(false);
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
      setIsSearchingDocs(false);
      setIsStreaming(true);

      addMessageToHistory('assistant', '', { source: 'base-ai', confidence: 'low' });

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
      setIsSearchingDocs(false);
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
    localStorage.removeItem(storageKey);
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
    isSearchingDocs,
    transcript,
    handleTranscript,
    setTranscript,
    clearChatHistory,
  };
}
