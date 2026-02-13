import { useRef, useCallback } from 'react';

export const useMediaRecording = () => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback((stream: MediaStream) => {
    recordedChunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current = rec;

    rec.ondataavailable = (e) =>
      e.data.size && recordedChunksRef.current.push(e.data);

    rec.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: 'audio/webm',
      });
      if (!blob.size) return;

      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `screen-recording-${Date.now()}.webm`,
      });
      a.click();
      URL.revokeObjectURL(url);
    };

    rec.start();
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  return {
    startRecording,
    stopRecording,
  };
};
