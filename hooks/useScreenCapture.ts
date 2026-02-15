import { useRef, useState, useCallback, useEffect } from 'react';

export const useScreenCapture = (
  // eslint-disable-next-line no-unused-vars
  onStreamAvailable: (stream: MediaStream | null) => void,
  // eslint-disable-next-line no-unused-vars
  onSourcesAvailable?: (
    sources:
      | {
          mixed: MediaStream
          system: MediaStream
          mic: MediaStream
        }
      | null
  ) => void
) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const meetStreamRef = useRef<MediaStream | null>(null);

  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [audioMissing, setAudioMissing] = useState(false);

  const startCapture = useCallback(async () => {
    setLoading(true);
    setAudioMissing(false);
    try {
      const meet = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const audioTracks = meet.getAudioTracks();
      if (audioTracks.length === 0) {
        // User shared screen but did NOT check "Share tab audio"
        setAudioMissing(true);
      }

      const systemAudio = new MediaStream(audioTracks);
      const preview = new MediaStream([
        ...meet.getVideoTracks(),
        ...audioTracks,
      ]);

      if (videoRef.current) {
        videoRef.current.srcObject = preview;
        await videoRef.current.play();
      }

      onStreamAvailable(systemAudio);
      onSourcesAvailable?.({
        mixed: systemAudio,
        system: systemAudio,
        mic: new MediaStream(),
      });

      meetStreamRef.current = meet;
      setCapturing(true);
    } catch (err) {
      console.error('Screen capture error:', err);
    } finally {
      setLoading(false);
    }
  }, [onSourcesAvailable, onStreamAvailable]);

  const stopCapture = useCallback(() => {
    meetStreamRef.current?.getTracks().forEach((t) => t.stop());

    if (videoRef.current) videoRef.current.srcObject = null;

    onStreamAvailable(null);
    onSourcesAvailable?.(null);
    setCapturing(false);
    setAudioMissing(false);
  }, [onSourcesAvailable, onStreamAvailable]);

  // Handle stream end events
  useEffect(() => {
    const handleStreamEnd = () => {
      if (capturing) stopCapture();
    };

    const tracks = meetStreamRef.current?.getVideoTracks() ?? [];
    tracks.forEach((track) => track.addEventListener('ended', handleStreamEnd));

    return () => {
      tracks.forEach((track) =>
        track.removeEventListener('ended', handleStreamEnd)
      );
    };
  }, [capturing, stopCapture]);

  return {
    videoRef,
    capturing,
    loading,
    audioMissing,
    startCapture,
    stopCapture,
  };
};
