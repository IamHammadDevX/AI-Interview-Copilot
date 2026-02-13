/* eslint-disable no-unused-vars */
import { ErrorToast } from '@/components/Toast';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useVoiceRecorder({
  audioStream,
  onAddUserTurn,
  onLiveTranscript,
  onTranscribingChange,
}: {
  audioStream: MediaStream | null;
  onAddUserTurn: (txt: string) => void;
  onLiveTranscript: (txt: string) => void;
  onTranscribingChange: (isTranscribing: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const qaStopRef = useRef(false);
  const resetStopRef = useRef(false);
  const queueRef = useRef<Blob[]>([]);
  const busyRef = useRef(false);
  const recordingRef = useRef(false);

  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const formatTime = (s: number) =>
    new Date(s * 1000).toISOString().substring(14, 19);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  const startTimer = () => {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((p) => p + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setSeconds(0);
  };

  const processNext = useCallback(async () => {
    if (busyRef.current || queueRef.current.length === 0) return;
    busyRef.current = true;

    const blob = queueRef.current.shift()!;
    try {
      onTranscribingChange(true);
      const fd = new FormData();
      fd.append('audio', blob, `qa-${Date.now()}.webm`);
      const r = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const { transcript } = await r.json();
      const text = transcript.trim();

      onTranscribingChange(false);
      onLiveTranscript(text);
      onAddUserTurn(text);
    } catch {
      onTranscribingChange(false);
      ErrorToast('Transcription failed.');
    } finally {
      busyRef.current = false;
      processNext();
    }
  }, [onAddUserTurn, onLiveTranscript, onTranscribingChange]);

  const enqueue = useCallback(
    (blob: Blob) => {
      queueRef.current.push(blob);
      processNext();
    },
    [processNext]
  );

  const startRecorder = useCallback(() => {
    if (!audioStream || audioStream.getAudioTracks().length === 0) {
      ErrorToast('No tab audio – did you pick "Share tab audio"?');
      return;
    }

    chunksRef.current = [];
    const rec = new MediaRecorder(
      new MediaStream(audioStream.getAudioTracks()),
      {
        mimeType: 'audio/webm;codecs=opus',
      }
    );

    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };

    rec.onstop = () => {
      stopTimer();     
      setRecording(false);

      if (resetStopRef.current) {
        resetStopRef.current = false;
        chunksRef.current = [];
        startRecorder();
        setRecording(true);
        return;
      }

      const segment = chunksRef.current;
      chunksRef.current = [];

      if (qaStopRef.current) {
        qaStopRef.current = false;
        if (segment.length) {
          const blob = new Blob(segment, { type: 'audio/webm' });
          enqueue(blob);
        }
        startRecorder();
        setRecording(true);
        return;
      }
    };

    rec.start();
    mediaRecorderRef.current = rec;
    setRecording(true);
    startTimer(); 
  }, [audioStream, enqueue]);

  const stopRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  useEffect(() => {
    if (recording && !audioStream) {
      console.log('Audio stream lost, stopping recording...');

      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      stopTimer();
      setRecording(false);

      qaStopRef.current = false;
      resetStopRef.current = false;

      onTranscribingChange(false);
    }
  }, [audioStream, recording, onTranscribingChange]);

  const toggleRecorder = useCallback(() => {
    recordingRef.current ? stopRecorder() : startRecorder();
  }, [startRecorder, stopRecorder]);

  const quickAnswer = () => {
    if (!recordingRef.current) {
      ErrorToast('Start listening first.');
      return;
    }
    qaStopRef.current = true;
    stopRecorder();
  };

  const clearContext = () => {
    if (!recordingRef.current) {
      ErrorToast('Start listening first.');
      return;
    }
    resetStopRef.current = true;
    stopRecorder();
  };

  return {
    recording,
    formattedTime: formatTime(seconds),
    toggleRecorder,
    quickAnswer,
    clearContext,
  };
}
