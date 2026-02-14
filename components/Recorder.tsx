/* eslint-disable no-unused-vars */
'use client';

import InterviewTranscript from '@/components/InterviewTranscript'
import { ErrorToast } from '@/components/Toast'
import { useInterviewTranscription } from '@/hooks/useInterviewTranscription'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import useVoiceRecorderWebAPI from '@/hooks/useWebSpeechRecorder';
import { useEffect, useMemo, useState } from 'react';
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
  const hasInterviewSources = Boolean(audioSources?.system && audioSources?.mic && projectId)

  const interview = useInterviewTranscription({
    projectId: projectId ?? null,
    sources:
      audioSources?.system && audioSources?.mic
        ? { system: audioSources.system, mic: audioSources.mic }
        : null,
    onTranscribingChange,
  })

  const [elapsed, setElapsed] = useState(0)
  const formattedElapsed = useMemo(
    () => new Date(elapsed * 1000).toISOString().substring(14, 19),
    [elapsed]
  )

  const [useWebAPI, setUseWebAPI] = useState(true);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (!interview.isListening) {
      setElapsed(0)
      return
    }
    const start = Date.now()
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [interview.isListening])

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

  const handleInterviewAnswer = async () => {
    if (!interview.isListening) {
      ErrorToast('Start listening first.')
      return
    }
    const q = interview.lastInterviewerQuestion.trim()
    if (!q) {
      ErrorToast('No interviewer question detected yet.')
      return
    }
    onAddUserTurn(q)
  }

  if (hasInterviewSources) {
    return (
      <div className="w-full h-full bg-muted/40 rounded-3xl p-4 border border-border">
        <div className="flex gap-4 h-full">
          <div className="flex flex-col gap-3 min-w-0 flex-shrink-0">
            <div className="flex flex-col gap-2">
              <TimerDisplay
                isCompact
                formattedTime={formattedElapsed}
                recording={interview.isListening}
              />
              <div className="text-[11px] text-muted-foreground px-1">
                System audio + mic capture
              </div>
            </div>

            <div className="flex justify-center flex-1 items-center">
              <RecordButton
                onClick={interview.isListening ? interview.stopListening : interview.startListening}
                disabled={false}
                recording={interview.isListening}
                isCompact
              />
            </div>

            <div className="flex gap-2 justify-center">
              <QuickAnswerButton
                isCompact
                onClick={handleInterviewAnswer}
                disabled={!interview.isListening}
              />
              <ClearContextButton
                isCompact
                onClick={interview.clearLocalTranscript}
                disabled={false}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <InterviewTranscript
              items={interview.items}
              isListening={interview.isListening}
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
