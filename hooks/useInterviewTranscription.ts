import { ErrorToast } from '@/components/Toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { createDeepgramRealtimeTranscriber } from '@/lib/realtime-transcription'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type InterviewSpeaker = 'interviewer' | 'user'

export type InterviewTranscriptItem = {
  speaker: InterviewSpeaker
  text: string
  timestampMs: number
  isFinal?: boolean
}

type AudioSources = {
  system: MediaStream
  mic: MediaStream
}

export function useInterviewTranscription({
  projectId,
  sources,
  onTranscribingChange,
}: {
  projectId: string | null
  sources: AudioSources | null
  // eslint-disable-next-line no-unused-vars
  onTranscribingChange?: (active: boolean) => void
}) {
  const flushMs = 5000
  const [isListening, setIsListening] = useState(false)
  const [items, setItems] = useState<InterviewTranscriptItem[]>([])

  const listeningRef = useRef(false)
  const transcriberRef = useRef<ReturnType<typeof createDeepgramRealtimeTranscriber> | null>(null)
  const stopRef = useRef<null | (() => void)>(null)

  const pendingDbRef = useRef<InterviewTranscriptItem[]>([])
  const flushTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setItems([])
    pendingDbRef.current = []
  }, [projectId])

  const flushToDb = useCallback(async () => {
    if (!projectId) return
    const pending = pendingDbRef.current
    if (pending.length === 0) return
    pendingDbRef.current = []

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.from('interview_transcripts').insert(
        pending.filter((p) => p.isFinal !== false).map((p) => ({
          project_id: projectId,
          speaker: p.speaker,
          text: p.text,
          timestamp_ms: p.timestampMs,
        }))
      )

      if (error) {
        pendingDbRef.current = pending.concat(pendingDbRef.current)
      }
    } catch {
      pendingDbRef.current = pending.concat(pendingDbRef.current)
    }
  }, [projectId])

  const applyTranscript = useCallback((t: { speaker: InterviewSpeaker; text: string; timestampMs: number; isFinal: boolean }) => {
    setItems((prev) => {
      const out = prev.slice()
      const last = out[out.length - 1]
      if (last && last.speaker === t.speaker && last.isFinal === false) {
        last.text = t.text
        last.timestampMs = t.timestampMs
        last.isFinal = t.isFinal
      } else {
        out.push({
          speaker: t.speaker,
          text: t.text,
          timestampMs: t.timestampMs,
          isFinal: t.isFinal,
        })
      }
      return out.slice(-250)
    })
    if (t.isFinal) {
      pendingDbRef.current.push({
        speaker: t.speaker,
        text: t.text,
        timestampMs: t.timestampMs,
        isFinal: true,
      })
    }
  }, [])

  const startListening = useCallback(() => {
    if (!sources) {
      ErrorToast('Start capture first (share tab audio + mic).')
      return
    }
    if (!projectId) {
      ErrorToast('Open the panel from a project to enable live copilot.')
      return
    }
    if (listeningRef.current) return

    listeningRef.current = true

    setIsListening(true)
    onTranscribingChange?.(true)

    const t = createDeepgramRealtimeTranscriber()
    transcriberRef.current = t
    stopRef.current = null

    void t
      .start({
        systemStream: sources.system,
        micStream: sources.mic,
        onTranscript: (msg) => {
          applyTranscript({
            speaker: msg.speaker,
            text: msg.text,
            timestampMs: msg.timestampMs,
            isFinal: msg.isFinal,
          })
        },
        onError: (e) => {
          ErrorToast(e.message)
        },
        onStatus: (s) => {
          if (s === 'closed') onTranscribingChange?.(false)
          if (s === 'open') onTranscribingChange?.(true)
        },
      })
      .then((h) => {
        stopRef.current = h.stop
      })
      .catch((e: any) => {
        const msg = typeof e?.message === 'string' ? e.message : 'Deepgram connection failed'
        ErrorToast(msg)
      })

    if (flushTimerRef.current) window.clearInterval(flushTimerRef.current)
    flushTimerRef.current = window.setInterval(() => {
      void flushToDb()
    }, flushMs)
  }, [applyTranscript, flushToDb, flushMs, onTranscribingChange, projectId, sources])

  const stopListening = useCallback(() => {
    if (!listeningRef.current) return
    listeningRef.current = false
    setIsListening(false)
    onTranscribingChange?.(false)

    try {
      stopRef.current?.()
    } catch {
      /* empty */
    }
    stopRef.current = null
    transcriberRef.current = null

    if (flushTimerRef.current) window.clearInterval(flushTimerRef.current)
    flushTimerRef.current = null
    void flushToDb()
  }, [flushToDb, onTranscribingChange])

  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  const clearLocalTranscript = useCallback(() => {
    setItems([])
    pendingDbRef.current = []
  }, [])

  const lastInterviewerQuestion = useMemo(() => {
    const interviewer = items.filter((i) => i.speaker === 'interviewer')
    if (interviewer.length === 0) return ''
    const last = interviewer[interviewer.length - 1]
    if (last.text.includes('?')) return last.text

    const windowStart = last.timestampMs - 20_000
    const recent = interviewer.filter((i) => i.timestampMs >= windowStart).map((i) => i.text).join(' ').trim()
    return recent || last.text
  }, [items])

  return { isListening, items, startListening, stopListening, clearLocalTranscript, lastInterviewerQuestion }
}
