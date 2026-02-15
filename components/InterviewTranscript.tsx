'use client'

import type { InterviewTranscriptItem } from '@/hooks/useInterviewTranscription'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useRef } from 'react'

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export default function InterviewTranscript({
  items,
  isListening,
}: {
  items: InterviewTranscriptItem[]
  isListening: boolean
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const baseTs = useMemo(() => {
    return items.length ? items[0].timestampMs : Date.now()
  }, [items])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items.length, isListening])

  return (
    <div className="h-full bg-card/80 backdrop-blur rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              isListening ? 'bg-red-500 animate-pulse' : 'bg-muted'
            )}
          />
          <span className="text-xs font-medium">
            {isListening ? 'Listening' : 'Transcript'}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {items.length ? `${items.length} lines` : '—'}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground p-2">
            Start capture, then press the record button to begin.
          </div>
        ) : (
          items.map((it) => (
            <div key={`${it.speaker}-${it.timestampMs}-${it.text.slice(0, 16)}`} className="flex gap-2">
              <div
                className={cn(
                  'shrink-0 text-[10px] px-2 py-0.5 rounded-full border h-fit',
                  it.speaker === 'interviewer'
                    ? 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-50'
                    : 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-50'
                )}
              >
                {it.speaker === 'interviewer' ? 'Interviewer' : 'You'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {formatTime(it.timestampMs - baseTs)}
                  </div>
                </div>
                <div className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                  <span className={cn(it.isFinal === false && 'opacity-70 italic')}>
                    {it.text}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
