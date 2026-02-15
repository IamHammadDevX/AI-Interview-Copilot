/* eslint-disable no-unused-vars */
'use client';

import { ErrorToast } from '@/components/Toast'
import InterimTranscript from '@/components/InterimTranscript'
import { useInterviewerProxyTranscription } from '@/hooks/useInterviewerProxyTranscription'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import useVoiceRecorderWebAPI from '@/hooks/useWebSpeechRecorder';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ClearContextButton from './button/ClearContextButton';
import QuickAnswerButton from './button/QuickAnswerButton';
import RecordButton from './button/RecordButton';
import SpeechRecognitionToggle from './common/SpeechRecognitionToggle';
import TimerDisplay from './common/TimerDisplay';
import LiveTranscript from './LiveTranscript';

/** Instant client-side question cleanup — zero latency, no network call */
function cleanQuestion(raw: string): string {
  const text = raw.trim()
  if (!text) return text
  // Already a clean question
  if (text.endsWith('?') && text.split(/\s+/).length >= 3) return text
  // Starts with a question/instruction word → clean punctuation, add "?"
  const qPattern = /^(what|how|why|when|where|who|which|can|could|would|should|do|does|did|is|are|was|were|have|has|had|will|shall|tell|explain|describe)/i
  if (qPattern.test(text)) {
    return text.replace(/[.!,;:]+$/, '').trim() + '?'
  }
  // Fallback: just append "?"
  return text.replace(/[.!,;:]+$/, '').trim() + '?'
}

type Props = {
  audioStream: MediaStream | null;
  audioSources?:
    | {
        mixed: MediaStream;
        system: MediaStream;
        mic: MediaStream;
      }
    | null;
  projectId?: string | null;
  onAddUserTurn: (txt: string) => void;
  onTranscribingChange: (isTranscribing: boolean) => void;
};

export default function Recorder({
  audioStream,
  audioSources,
  projectId,
  onAddUserTurn,
  onTranscribingChange,
}: Props) {
  const hasProject = Boolean(projectId)

  const interview = useInterviewerProxyTranscription({
    onSpeechActiveChange: (active) => {
      if (active) onTranscribingChange(true)
      if (!active) onTranscribingChange(false)
    },
    systemStream: audioSources?.system ?? null,
  })

  // Mirror finalized lines in a ref so the hotkey callback
  // always reads the latest lines without needing a dependency
  const finalLinesRef = useRef(interview.finalizedLines)
  useEffect(() => {
    finalLinesRef.current = interview.finalizedLines
  }, [interview.finalizedLines])

  const [elapsed, setElapsed] = useState(0)
  const formattedElapsed = useMemo(
    () => new Date(elapsed * 1000).toISOString().substring(14, 19),
    [elapsed]
  )

  const [useWebAPI, setUseWebAPI] = useState(true);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (interview.status !== 'streaming') {
      setElapsed(0)
      return
    }
    const start = Date.now()
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [interview.status])

  const handleLiveTranscript = (txt: string) => {
    setTranscript(txt);
  };

  const customRecorder = useVoiceRecorder({
    audioStream,
    onAddUserTurn,
    onLiveTranscript: handleLiveTranscript,
    onTranscribingChange,
  });

  const webAPIRecorder = useVoiceRecorderWebAPI({
    audioStream,
    onAddUserTurn,
    onLiveTranscript: handleLiveTranscript,
    onTranscribingChange,
  });

  const activeRecorder = useWebAPI ? webAPIRecorder : customRecorder;
  const {
    recording,
    formattedTime,
    toggleRecorder,
    quickAnswer,
    clearContext,
  } = activeRecorder;

  const handleToggle = (newUseWebAPI: boolean) => {
    if (!newUseWebAPI) {
      setTranscript('');
    }
    setUseWebAPI(newUseWebAPI);
  };

  const handleClearContext = () => {
    setTranscript('');
    clearContext();
  };

  const handleInterviewAnswer = useCallback(() => {
    const lines = finalLinesRef.current
    if (lines.length === 0) {
      ErrorToast('No finalized interviewer sentence yet.')
      return
    }
    if (interview.isSpeechActive) {
      ErrorToast('Wait for speech to pause before sending to copilot.')
      return
    }

    // Aggregate recent finalized lines within a 20-second window
    // so multi-segment questions are captured fully
    const lastTs = lines[lines.length - 1].ts
    const recent = lines
      .filter(l => l.ts >= lastTs - 20_000)
      .map(l => l.text)
      .join(' ')
      .trim()

    const raw = recent || lines[lines.length - 1].text

    // Instant client-side question cleanup — no network call
    const question = cleanQuestion(raw)
    onAddUserTurn(question)
  }, [interview.isSpeechActive, onAddUserTurn])

  // Unified hotkey "A" — works for all modes (project + voice recorder)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.key.toLowerCase() !== 'a') return
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return

      e.preventDefault()
      if (hasProject) {
        handleInterviewAnswer()
      } else if (recording) {
        quickAnswer()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasProject, handleInterviewAnswer, recording, quickAnswer])

  if (hasProject) {
    return (
      <div className="w-full h-full bg-muted/40 rounded-3xl p-4 border border-border">
        <div className="flex gap-4 h-full">
          <div className="flex flex-col gap-3 min-w-0 flex-shrink-0">
            <div className="flex flex-col gap-2">
              <TimerDisplay
                isCompact
                formattedTime={formattedElapsed}
                recording={interview.status === 'streaming'}
              />
              <div className="text-[11px] text-muted-foreground px-1">
                System audio only (20ms PCM)
              </div>
              {interview.error && (
                <div className="text-[11px] text-destructive px-1 max-w-[180px] break-words">
                  {interview.error}
                </div>
              )}
            </div>

            <div className="flex justify-center flex-1 items-center">
              <RecordButton
                onClick={interview.status === 'streaming' ? interview.stop : interview.start}
                disabled={false}
                recording={interview.status === 'streaming'}
                isCompact
              />
            </div>

            <div className="flex gap-2 justify-center">
              <QuickAnswerButton
                isCompact
                onClick={handleInterviewAnswer}
                disabled={interview.status !== 'streaming' || interview.isSpeechActive || interview.finalizedLines.length === 0}
              />
              <ClearContextButton
                isCompact
                onClick={interview.clearTranscript}
                disabled={false}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <InterimTranscript
              finalizedLines={interview.finalizedLines}
              interimText={interview.interimText}
              streaming={interview.status === 'streaming'}
            />
          </div>
        </div>
      </div>
    )
  }

  if (useWebAPI) {
    return (
      <div className="w-full h-full bg-muted/40 rounded-3xl p-4 border border-border">
        <div className="flex gap-4 h-full">
          <div className="flex flex-col gap-3 min-w-0 flex-shrink-0">
            <div className="flex flex-col gap-2">
              <TimerDisplay
                isCompact={useWebAPI}
                formattedTime={formattedTime}
                recording={recording}
              />
              <SpeechRecognitionToggle
                useWebAPI={useWebAPI}
                onToggle={handleToggle}
                disabled={recording}
                isCompact={useWebAPI}
              />
            </div>

            <div className="flex justify-center flex-1 items-center">
              <RecordButton
                onClick={toggleRecorder}
                disabled={false}
                recording={recording}
                isCompact={useWebAPI}
              />
            </div>

            <div className="flex gap-2 justify-center">
              <QuickAnswerButton
                isCompact={useWebAPI}
                onClick={quickAnswer}
                disabled={!recording}
              />
              <ClearContextButton
                isCompact={useWebAPI}
                onClick={handleClearContext}
                disabled={false}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <LiveTranscript
              transcript={transcript}
              recording={recording}
              useWebAPI={useWebAPI}
            />
          </div>
        </div>
      </div>
    );
  }
    return (
      <div className="flex w-full justify-between lg:flex-col h-full">
        <div className="flex w-full bg-muted/40 border border-border rounded-2xl">
          <TimerDisplay formattedTime={formattedTime} recording={recording} />
          <SpeechRecognitionToggle
            useWebAPI={useWebAPI}
            onToggle={handleToggle}
            disabled={recording}
          />
        </div>

        <div className="lg:flex-1 flex flex-col items-center justify-center">
          <LiveTranscript
            transcript={transcript}
            recording={recording}
            useWebAPI={useWebAPI}
          />
          <RecordButton
            onClick={toggleRecorder}
            disabled={!audioStream}
            recording={recording}
            useWebAPI={useWebAPI}
          />
        </div>

        <div className="flex justify-end lg:justify-stretch items-center gap-1 lg:gap-4">
          <QuickAnswerButton
            onClick={quickAnswer}
            disabled={!audioStream || !recording}
          />
          <ClearContextButton
            onClick={handleClearContext}
            disabled={!recording}
          />
        </div>
      </div>
    );
}
