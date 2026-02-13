/* eslint-disable no-unused-vars */
// @ts-nocheck

import { ErrorToast } from '@/components/Toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_WEB_SPEECH_LANGUAGE } from '@/config';
import { useMicGainAndVAD } from './useMicGainAndVAD';

type Callbacks = {
  audioStream: MediaStream | null;
  onAddUserTurn: (txt: string) => void;
  onLiveTranscript: (txt: string) => void;
  onTranscribingChange: (busy: boolean) => void;
};

export function useVoiceRecorderWebAPI({
  audioStream,
  onAddUserTurn,
  onLiveTranscript,
  onTranscribingChange,
}: Callbacks) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // eslint-disable-next-line no-undef
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptSegmentsRef = useRef<string[]>([]);
  const currentSegmentRef = useRef('');
  const currentUtteranceRef = useRef('');
  const finalResultsProcessed = useRef(0);

  const processedStream = useMicGainAndVAD({
    rawStream: audioStream,
    silenceSeconds: 4,
    onSilence: () => recognitionRef.current?.stop(),
  });

  const timerRef = useRef(null);
  const recordingRef = useRef(false);
  const isProcessingQARef = useRef(false);

  // Sync recordingRef with recording state
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  const formatTime = (s: number) =>
    new Date(s * 1000).toISOString().substring(14, 19);

  const startTimer = () => {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((p) => p + 1), 1_000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setSeconds(0);
  };

  const composeFullTranscript = (currentDisplay: string) => {
    const allSegments = [...transcriptSegmentsRef.current];
    if (currentDisplay.trim()) {
      allSegments.push(currentDisplay);
    }
    return allSegments.join('\n').trim();
  };

  const buildRecognizer = useCallback(() => {
    const SR =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;
    if (!SR) {
      ErrorToast('Speech recognition is not supported in this browser.');
      return null;
    }

    // eslint-disable-next-line no-undef
    const rec: SpeechRecognition = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = DEFAULT_WEB_SPEECH_LANGUAGE;

    // Note: Web Speech API doesn't support custom audio streams
    // It always uses the default microphone input
    // The processedStream from useMicGainAndVAD is not used here

    // eslint-disable-next-line no-undef
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      // Benign cases we can ignore
      if (['aborted', 'no-speech'].includes(e.error)) return;

      if (['not-allowed', 'service-not-allowed'].includes(e.error)) {
        ErrorToast(
          'Microphone access was denied. Please click the mic icon in the ' +
            'address bar or system prompt to allow audio capture, then try again.'
        );
      } else {
        ErrorToast(`Speech recognition error: ${e.error}`);
      }

      console.error('SpeechRecognition error:', e.error);
      setRecording(false);
      onTranscribingChange(false);
      stopTimer();
    };

    rec.onresult = (e: { results: string | any[] }) => {
      let allFinalText = '';
      let allInterimText = '';

      for (let i = finalResultsProcessed.current; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          allFinalText += transcript;
        } else {
          allInterimText += transcript;
        }
      }

      let newFinalCount = 0;
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          newFinalCount = i + 1;
        }
      }

      if (newFinalCount > finalResultsProcessed.current) {
        for (let i = finalResultsProcessed.current; i < newFinalCount; i++) {
          if (e.results[i].isFinal) {
            currentUtteranceRef.current += e.results[i][0].transcript;
          }
        }
        finalResultsProcessed.current = newFinalCount;
      }

      const currentSegmentDisplay =
        currentSegmentRef.current +
        currentUtteranceRef.current +
        allInterimText;

      const fullDisplay = composeFullTranscript(currentSegmentDisplay);

      onLiveTranscript(fullDisplay);
    };

    rec.onstart = () => {
      finalResultsProcessed.current = 0;
    };

    rec.onend = () => {
      onTranscribingChange(false);
      setRecording(false);
      stopTimer();
    };

    return rec;
  }, [onLiveTranscript, onTranscribingChange]);

  const startRecognizer = useCallback(() => {
    const rec = buildRecognizer();
    if (!rec) return;
    recognitionRef.current = rec;

    currentUtteranceRef.current = '';
    finalResultsProcessed.current = 0;

    rec.start();
    setRecording(true);
    startTimer();
  }, [buildRecognizer]);

  const stopRecognizer = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
  }, []);

  const toggleRecorder = useCallback(
    () => (recordingRef.current ? stopRecognizer() : startRecognizer()),
    [startRecognizer, stopRecognizer]
  );

  const quickAnswer = () => {
    // Prevent concurrent calls
    if (isProcessingQARef.current) {
      console.warn('Quick answer already in progress');
      return false;
    }

    try {
      isProcessingQARef.current = true;

      // Get current state including any interim results from the recognizer
      let contentToSubmit = '';

      // First add any accumulated segments
      if (currentSegmentRef.current?.trim()) {
        contentToSubmit = currentSegmentRef.current.trim();
      }

      // Then add current utterance (finalized results)
      if (currentUtteranceRef.current?.trim()) {
        contentToSubmit = contentToSubmit
          ? `${contentToSubmit} ${currentUtteranceRef.current.trim()}`
          : currentUtteranceRef.current.trim();
      }

      // If still nothing, try to get any interim results from the recognizer
      if (!contentToSubmit && recognitionRef.current) {
        try {
          // Force a stop to finalize any interim results, then restart
          const wasRecording = recordingRef.current;
          recognitionRef.current.stop();

          // Wait a moment for results to finalize
          setTimeout(() => {
            // Check again after stop
            const finalContent = currentSegmentRef.current?.trim() || currentUtteranceRef.current?.trim() || '';

            if (finalContent) {
              transcriptSegmentsRef.current.push(finalContent);
              onAddUserTurn(finalContent);
              currentSegmentRef.current = '';
              currentUtteranceRef.current = '';
            }

            // Update display
            const fullDisplay = composeFullTranscript('');
            onLiveTranscript(fullDisplay);

            // Restart if was recording
            if (wasRecording) {
              startRecognizer();
            }
          }, 300);

          return true;
        } catch (e) {
          console.warn('Error handling interim results:', e);
        }
      }

      if (contentToSubmit) {
        transcriptSegmentsRef.current.push(contentToSubmit);

        try {
          onAddUserTurn(contentToSubmit);
        } catch (callbackError) {
          console.error('Error in onAddUserTurn callback:', callbackError);
        }

        currentSegmentRef.current = '';
        currentUtteranceRef.current = '';

        // Update transcript display to show submitted segments
        const fullDisplay = composeFullTranscript('');
        onLiveTranscript(fullDisplay);

        return true;
      } else {
        console.warn('No transcript content available to submit');
        return false;
      }
    } catch (error) {
      console.error('Error in quickAnswer:', error);
      return false;
    } finally {
      isProcessingQARef.current = false;
    }
  };
  const clearContext = () => {
    transcriptSegmentsRef.current = [];
    currentSegmentRef.current = '';
    currentUtteranceRef.current = '';

    onLiveTranscript('');
  };

  const clearAllTranscript = () => {
    transcriptSegmentsRef.current = [];
    currentSegmentRef.current = '';
    currentUtteranceRef.current = '';
    finalResultsProcessed.current = 0;
    onLiveTranscript('');
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => stopRecognizer(), []);

  return {
    recording,
    formattedTime: formatTime(seconds),
    toggleRecorder,
    quickAnswer,
    clearContext,
    clearAllTranscript,
    getTranscriptSegments: () => transcriptSegmentsRef.current,
  };
}

export default useVoiceRecorderWebAPI;
