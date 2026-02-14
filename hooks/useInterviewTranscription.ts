import { ErrorToast } from '@/components/Toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type InterviewSpeaker = 'interviewer' | 'user'

export type InterviewTranscriptItem = {
  speaker: InterviewSpeaker
  text: string
  timestampMs: number
}

type AudioSources = {
  system: MediaStream
  mic: MediaStream
}

async function transcribeBlob(blob: Blob, signal: AbortSignal): Promise<string> {
  const fd = new FormData()
  fd.append('audio', blob, `seg-${Date.now()}.webm`)

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: fd,
    signal,
  })

  const json = (await (async (): Promise<null | { transcript?: string; error?: string }> => {
    try {
      return (await res.json()) as any
    } catch {
      return null
    }
  })())

  if (!res.ok) {
    throw new Error(json?.error ?? 'Transcription failed')
  }

  return (json?.transcript ?? '').trim()
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
  const segmentMs = 2500
  const flushMs = 5000
  const [isListening, setIsListening] = useState(false)
  const [items, setItems] = useState<InterviewTranscriptItem[]>([])

  const listeningRef = useRef(false)
  const systemRecorderRef = useRef<MediaRecorder | null>(null)
  const micRecorderRef = useRef<MediaRecorder | null>(null)
  const systemTimerRef = useRef<number | null>(null)
  const micTimerRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const queueRef = useRef<Array<{ speaker: InterviewSpeaker; blob: Blob; timestampMs: number }>>([])
  const busyRef = useRef(false)

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
        pending.map((p) => ({
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

  const pumpQueue = useCallback(async () => {
    if (busyRef.current) return
    if (queueRef.current.length === 0) return
    if (!abortRef.current) abortRef.current = new AbortController()

    busyRef.current = true
    try {
      while (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!
        onTranscribingChange?.(true)
        const text = await transcribeBlob(next.blob, abortRef.current.signal)
        onTranscribingChange?.(false)

        if (!text) continue

        const item: InterviewTranscriptItem = {
          speaker: next.speaker,
          text,
          timestampMs: next.timestampMs,
        }

        pendingDbRef.current.push(item)
        setItems((prev) => prev.concat(item).slice(-200))
      }
    } catch (e: any) {
      onTranscribingChange?.(false)
      const msg = typeof e?.message === 'string' ? e.message : 'Transcription failed'
      ErrorToast(msg)
    } finally {
      busyRef.current = false
      onTranscribingChange?.(false)
    }
  }, [onTranscribingChange])

  const startSegmentLoop = useCallback(
    (speaker: InterviewSpeaker, stream: MediaStream) => {
      const tracks = stream.getAudioTracks()
      if (tracks.length === 0) {
        ErrorToast('Missing audio track. Ensure system audio + mic are enabled.')
        return
      }

      let chunks: BlobPart[] = []

      const recorder = new MediaRecorder(new MediaStream(tracks), {
        mimeType: 'audio/webm;codecs=opus',
      })

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data)
      }

      recorder.onstop = () => {
        if (!listeningRef.current) return

        const endedAt = Date.now()
        const blob = chunks.length ? new Blob(chunks, { type: 'audio/webm' }) : null
        chunks = []

        if (blob) {
          queueRef.current.push({
            speaker,
            blob,
            timestampMs: endedAt,
          })
          void pumpQueue()
        }

        try {
          recorder.start()
        } catch {
          return
        }

        const timerId = window.setTimeout(() => {
          if (recorder.state === 'recording') {
            try {
              recorder.stop()
            } catch {
              /* empty */
            }
          }
        }, segmentMs)

        if (speaker === 'interviewer') systemTimerRef.current = timerId
        if (speaker === 'user') micTimerRef.current = timerId
      }

      try {
        recorder.start()
      } catch {
        ErrorToast('Failed to start audio recorder.')
        return
      }

      const timerId = window.setTimeout(() => {
        if (recorder.state === 'recording') {
          try {
            recorder.stop()
          } catch {
            /* empty */
          }
        }
      }, segmentMs)

      if (speaker === 'interviewer') {
        systemRecorderRef.current = recorder
        systemTimerRef.current = timerId
      } else {
        micRecorderRef.current = recorder
        micTimerRef.current = timerId
      }
    },
    [pumpQueue, segmentMs]
  )

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

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setIsListening(true)

    startSegmentLoop('interviewer', sources.system)
    startSegmentLoop('user', sources.mic)

    if (flushTimerRef.current) window.clearInterval(flushTimerRef.current)
    flushTimerRef.current = window.setInterval(() => {
      void flushToDb()
    }, flushMs)
  }, [flushToDb, flushMs, projectId, sources, startSegmentLoop])

  const stopListening = useCallback(() => {
    if (!listeningRef.current) return
    listeningRef.current = false
    setIsListening(false)

    if (systemTimerRef.current) window.clearTimeout(systemTimerRef.current)
    if (micTimerRef.current) window.clearTimeout(micTimerRef.current)
    systemTimerRef.current = null
    micTimerRef.current = null

    const rs = [systemRecorderRef.current, micRecorderRef.current]
    rs.forEach((r) => {
      if (r && r.state === 'recording') {
        try {
          r.stop()
        } catch {
          /* empty */
        }
      }
    })
    systemRecorderRef.current = null
    micRecorderRef.current = null

    abortRef.current?.abort()
    abortRef.current = null

    if (flushTimerRef.current) window.clearInterval(flushTimerRef.current)
    flushTimerRef.current = null
    void flushToDb()
  }, [flushToDb])

  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  const clearLocalTranscript = useCallback(() => {
    setItems([])
    pendingDbRef.current = []
    queueRef.current = []
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
