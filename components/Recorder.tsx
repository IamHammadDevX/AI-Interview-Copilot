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

  // Cache last final sentence in a ref so hotkey always reads latest
  const lastFinalRef = useRef("")
  useEffect(() => {
    if (interview.lastFinalSentence) {
      lastFinalRef.current = interview.lastFinalSentence
    }
  }, [interview.lastFinalSentence])

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
    // Use the cached last finalized interviewer sentence
    const q = lastFinalRef.current.trim()
    if (!q) {
      ErrorToast('No finalized interviewer sentence yet.')
      return
    }
    if (interview.isSpeechActive) {
      ErrorToast('Wait for speech to pause before sending to copilot.')
      return
    }
    onAddUserTurn(q)
  }, [interview.isSpeechActive, onAddUserTurn])

  // Hotkey "A" → trigger AI with last finalized interviewer sentence
  // Only fires when not focused on input/textarea
  useEffect(() => {
    if (!hasProject) return

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input field
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return

      // Only plain "A" key (no modifiers)
      if (e.key.toLowerCase() !== 'a') return
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return

      e.preventDefault()
      handleInterviewAnswer()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasProject, handleInterviewAnswer])

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
                disabled={interview.status !== 'streaming' || interview.isSpeechActive || !lastFinalRef.current.trim()}
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
