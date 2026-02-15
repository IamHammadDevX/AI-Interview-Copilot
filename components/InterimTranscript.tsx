'use client'

import { cn } from '@/lib/utils'

export default function InterimTranscript({
  text,
  streaming,
}: {
  text: string
  streaming: boolean
}) {
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
          {text ? `${text.split(/\s+/).filter(Boolean).length} words` : '—'}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {text ? (
          <div
            className={cn(
              'text-sm leading-relaxed whitespace-pre-wrap break-words',
              streaming && 'animate-pulse'
            )}
          >
            {text}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Start system audio capture to see realtime interviewer transcript.
          </div>
        )}
      </div>
    </div>
  )
}

