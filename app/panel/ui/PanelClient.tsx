'use client'

import ChatInput from '@/components/common/ChatInput'
import PreWithCopy from '@/components/PreWithCopy'
import ThinkingAnimation from '@/components/ThinkingAnimation'
import TranscribingAnimation from '@/components/TranscribingAnimation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useChatService from '@/hooks/useChatService'
import useMicPermission from '@/hooks/useMicPermission'
import { Download, Edit3, Settings, Trash2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal'
import UpdatePromptModal from '@/components/common/UpdatePromptModal'

const ScreenCapture = dynamic(() => import('@/components/ScreenCapture'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
      Loading capture…
    </div>
  ),
})

const Recorder = dynamic(() => import('@/components/Recorder'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[260px] flex items-center justify-center text-sm text-muted-foreground">
      Loading recorder…
    </div>
  ),
})

type Turn = {
  role: 'assistant' | 'user'
  content: string
  meta?: {
    source: 'document' | 'internet' | 'base-ai'
    confidence: 'high' | 'medium' | 'low'
  }
}

const Bubble = memo(function Bubble({
  turn,
  streaming,
}: {
  turn: Turn
  streaming: boolean
}) {
  const isAssistant = turn.role === 'assistant'

  const assistantClass = useMemo(() => {
    if (!isAssistant) return ''
    if (turn.meta?.source === 'document') {
      return 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-50'
    }
    if (turn.meta?.source === 'internet') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-50'
    }
    return 'border-border bg-card/70 text-foreground'
  }, [isAssistant, turn.meta?.source])

  return (
    <div className={isAssistant ? 'flex justify-start' : 'flex justify-end'}>
      <div
        className={
          isAssistant
            ? `max-w-[min(720px,100%)] rounded-[calc(var(--radius)-6px)] border px-3 py-2 text-sm shadow-sm ${assistantClass}`
            : 'max-w-[min(720px,100%)] rounded-[calc(var(--radius)-6px)] border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm prose-invert'
        }
      >
        <div className="prose max-w-none prose-compact prose-sm prose-p:my-0 prose-li:my-0 prose-li:py-0 prose-ul:my-0 prose-ul:py-1 prose-pre:my-0">
          <ReactMarkdown components={{ pre: PreWithCopy }} remarkPlugins={[remarkGfm]}>
            {turn.content}
          </ReactMarkdown>
          {isAssistant && streaming && (
            <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
          )}
        </div>
      </div>
    </div>
  )
})

export default function PanelClient({ projectId }: { projectId?: string | null }) {
  const { requestMic } = useMicPermission()
  const [captureStream, setCaptureStream] = useState<MediaStream | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const bottomRef = useRef<HTMLSpanElement | null>(null)
  const [isPending, startTransition] = useTransition()

  const { chatHistory, isThinking, isStreaming, handleTranscript, clearChatHistory } =
    useChatService({ projectId })

  const [shouldStopCapture, setShouldStopCapture] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, isThinking, isTranscribing, isStreaming])

  useEffect(() => {
    requestMic()
  }, [requestMic])

  const handleExternalStopHandled = useCallback(() => {
    setShouldStopCapture(false)
  }, [])

  const handleGoogleAPIDisconnect = useCallback(() => {
    setShouldStopCapture(true)
  }, [])

  useEffect(() => {
    const handleMeetDisconnect = () => {
      handleGoogleAPIDisconnect()
    }
    window.addEventListener('google-api-disconnect', handleMeetDisconnect)
    return () => {
      window.removeEventListener('google-api-disconnect', handleMeetDisconnect)
    }
  }, [handleGoogleAPIDisconnect])

  const handleScreenshot = useCallback(
    async (dataUrl: string, fileName: string) => {
      await handleTranscript(`Image: ${fileName}`, dataUrl)
    },
    [handleTranscript]
  )

  const handleExportChat = useCallback(() => {
    const contextData = {
      timestamp: new Date().toISOString(),
      chatHistory: chatHistory,
      totalMessages: chatHistory.length,
    }

    const blob = new Blob([JSON.stringify(contextData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-context-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [chatHistory])

  const turns = useMemo(() => chatHistory as Turn[], [chatHistory])
  const deferredTurns = useDeferredValue(turns)
  const renderTurns = useMemo(() => {
    if (!turns.length) return [] as Turn[]
    const latest = turns[turns.length - 1]
    const base = deferredTurns.slice(0, Math.max(0, turns.length - 1))
    return base.concat(latest)
  }, [deferredTurns, turns])

  const sendTranscript = useCallback(
    async (text: string) => {
      await new Promise<void>((resolve) => {
        startTransition(() => {
          void handleTranscript(text).finally(resolve)
        })
      })
    },
    [handleTranscript, startTransition]
  )

  return (
    <div className="min-h-screen w-full">
      <UpdatePromptModal open={promptOpen} onOpenChange={setPromptOpen} />
      <ConfirmDeleteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        handleClick={clearChatHistory}
      />

      <div className="mx-auto max-w-7xl px-2 md:px-6 py-2 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 grid-rows-[auto_1fr_auto] gap-2 lg:gap-4">
          <div className="rounded-[var(--radius)] border border-border bg-card/70 backdrop-blur shadow-xl flex items-center justify-center max-h-64 lg:max-h-[420px] overflow-hidden">
            <ScreenCapture
              handleScreenshot={handleScreenshot}
              onStreamAvailable={setCaptureStream}
              externalStop={shouldStopCapture}
              onExternalStopHandled={handleExternalStopHandled}
            />
          </div>

          <div className="flex flex-col row-span-2 bg-card/80 backdrop-blur p-2 lg:p-4 rounded-[var(--radius)] border border-border shadow-xl overflow-hidden min-h-[620px]">
            <header className="flex items-center justify-between gap-3 text-lg sm:text-xl font-semibold px-2 py-2">
              <span className="truncate">Interview Copilot</span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setPromptOpen(true)}>
                    <Edit3 className="h-4 w-4 text-primary" />
                    <span>Update prompt</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleExportChat}>
                    <Download className="h-4 w-4" />
                    <span>Export chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <Alert className="bg-transparent border-border text-xs">
                      {chatHistory.length} messages in current session
                    </Alert>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4">
              {renderTurns.map((t, i) => (
                <Bubble
                  key={i}
                  turn={t}
                  streaming={t.role === 'assistant' && isStreaming && i === renderTurns.length - 1}
                />
              ))}

              {isTranscribing && <TranscribingAnimation />}
              {isThinking && <ThinkingAnimation />}
              <span ref={bottomRef} />
            </div>

            <div className="border-t border-border bg-background/60 backdrop-blur p-2 rounded-[calc(var(--radius)-6px)]">
              <ChatInput
                onSend={sendTranscript}
                isLoading={isThinking || isPending}
                isStreaming={isStreaming}
                placeholder="Type your question here…"
                disabled={isTranscribing}
              />
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur p-2 lg:p-4 rounded-[var(--radius)] border border-border shadow-xl flex flex-col gap-4">
            <Recorder
              audioStream={captureStream}
              onAddUserTurn={(text) => handleTranscript(text)}
              onTranscribingChange={setIsTranscribing}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
