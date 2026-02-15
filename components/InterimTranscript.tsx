'use client'

import { cn } from '@/lib/utils'
import type { FinalizedLine } from '@/hooks/useInterviewerProxyTranscription'
import { useEffect, useMemo, useRef } from 'react'

export default function InterimTranscript({
  finalizedLines,
  interimText,
  streaming,
}: {
  finalizedLines: FinalizedLine[]
  interimText: string
  streaming: boolean
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const wordCount = useMemo(() => {
    let count = 0
    for (const line of finalizedLines) {
      count += line.text.split(/\s+/).filter(Boolean).length
    }
    if (interimText) {
      count += interimText.split(/\s+/).filter(Boolean).length
    }
    return count
  }, [finalizedLines, interimText])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [finalizedLines.length, interimText])

  const hasContent = finalizedLines.length > 0 || interimText

  return (
    <div className="h-full bg-card/80 backdrop-blur rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              streaming ? 'bg-red-500 animate-pulse' : 'bg-muted'
            )}
          />
          <span className="text-xs font-medium">Interviewer</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {wordCount > 0 ? `${wordCount} words` : '—'}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5">
        {hasContent ? (
          <>
            {finalizedLines.map((line, i) => (
              <div
                key={`${line.ts}-${i}`}
                className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground"
              >
                {line.text}
              </div>
            ))}

            {interimText && (
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/70 italic">
                {interimText}
              </div>
            )}
            <div ref={bottomRef} />
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            Start system audio capture to see realtime interviewer transcript.
          </div>
        )}
      </div>
    </div>
  )
}

