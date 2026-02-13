/* eslint-disable no-unused-vars */
'use client';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import useVoiceRecorderWebAPI from '@/hooks/useWebSpeechRecorder';
import { useState } from 'react';
import ClearContextButton from './button/ClearContextButton';
import QuickAnswerButton from './button/QuickAnswerButton';
import RecordButton from './button/RecordButton';
import SpeechRecognitionToggle from './common/SpeechRecognitionToggle';
import TimerDisplay from './common/TimerDisplay';
import LiveTranscript from './LiveTranscript';

type Props = {
  audioStream: MediaStream | null;
  onAddUserTurn: (txt: string) => void;
  onTranscribingChange: (isTranscribing: boolean) => void;
};

export default function Recorder({
  audioStream,
  onAddUserTurn,
  onTranscribingChange,
}: Props) {
  const [useWebAPI, setUseWebAPI] = useState(true);
  const [transcript, setTranscript] = useState('');

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

  if (useWebAPI) {
    return (
      <div className="w-full h-full bg-gray-50 rounded-xl p-4 border border-gray-200">
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
        <div className="flex w-full lg:bg-gray-50 border border-gray-200 rounded-lg">
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
