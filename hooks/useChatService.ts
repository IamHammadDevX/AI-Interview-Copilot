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
  const lastSoloRef = useRef<{ q: string; at: number } | null>(null);

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

    // Add user message and show thinking immediately — zero delay
    addMessageToHistory('user', question);
    setIsThinking(true);

    try {
      abortControllerRef.current = new AbortController();

      const shouldUseRag = Boolean(projectId) && !imageDataUrl && !process.env.NEXT_PUBLIC_SKIP_RAG;

      if (shouldUseRag) {
        const now = Date.now()
        const last = lastSoloRef.current
        const shouldDebounce = last?.q === question && now - last.at < 2500
        lastSoloRef.current = { q: question, at: now }

        let baseAssistantAdded = false
        let pendingDoc: null | { answer: string; confidence: 'high' } = null
        const flushDocIfReady = () => {
          if (!baseAssistantAdded) return
          if (!pendingDoc) return
          addMessageToHistory('assistant', pendingDoc.answer, {
            source: 'document',
            confidence: pendingDoc.confidence,
          })
          pendingDoc = null
        }

        const fastResPromise = fetch(`/api/projects/${projectId}/rag/fast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
          signal: abortControllerRef.current.signal,
        })

        const ragTask = shouldDebounce
          ? Promise.resolve(null)
          : (async (): Promise<null | { answer: string; confidence: 'high' }> => {
              const searchRes = await fetch(`/api/projects/${projectId}/rag/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
                signal: abortControllerRef.current?.signal,
              })

              const searchData = (await searchRes
                .json()
                .catch((): null => null)) as null | {
                matches?: Array<{ content: string; similarity: number }>
                confidence?: 'high' | 'medium' | 'low'
                error?: string
              }

              if (!searchRes.ok) return null

              const matches = searchData?.matches ?? []
              const confidence = searchData?.confidence ?? 'low'

              if (matches.length === 0 || confidence !== 'high') return null

              const answerRes = await fetch(`/api/projects/${projectId}/rag/answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, matches, confidence }),
                signal: abortControllerRef.current?.signal,
              })

              const answerData = (await answerRes
                .json()
                .catch((): null => null)) as null | {
                answer?: string
              }

              if (!answerRes.ok) return null
              if (!answerData?.answer) return null

              return { answer: answerData.answer, confidence: 'high' }
            })()

        ragTask
          .then((doc) => {
            if (!doc?.answer) return
            pendingDoc = doc
            flushDocIfReady()
          })
          .catch((): null => null)

        const fastRes = await fastResPromise

        if (!fastRes.ok) {
          const err = (await fastRes.json().catch((): null => null)) as any
          throw new Error(err?.error ?? 'AI search failed')
        }

        setIsThinking(false)
        setIsStreaming(true)

        addMessageToHistory('assistant', '', { source: 'base-ai', confidence: 'low' })
        baseAssistantAdded = true
        flushDocIfReady()

        const reader = fastRes.body?.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let accumulatedContent = ''

        while (reader) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (!data || data === '[DONE]') continue

            try {
              const json = JSON.parse(data) as any
              const delta = json?.choices?.[0]?.delta?.content
              if (typeof delta === 'string' && delta.length) {
                accumulatedContent += delta
                updateLastMessageInHistory(accumulatedContent)
              }
            } catch {
              // ignore
            }
          }
        }

        setIsStreaming(false)

        return
      }

      const fullHistory = [...chatHistoryRef.current];
      const historyToSend = fullHistory.slice(-5);

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
        const data = (await res.json().catch((): null => null)) as null | {
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

      addMessageToHistory('assistant', '', { source: 'base-ai', confidence: 'low' });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let sseBuffer = '';

      if (reader) {
        try {
          for (;;) {
            const { done, value } = await reader.read();

            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split('\n');
            // Keep incomplete last line in buffer
            sseBuffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();

              if (!data || data === '[DONE]') {
                if (data === '[DONE]') {
                  setIsStreaming(false);
                  return;
                }
                continue;
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
    transcript,
    handleTranscript,
    setTranscript,
    clearChatHistory,
  };
}
