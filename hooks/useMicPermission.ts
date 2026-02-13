// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';

export default function useMicPermission() {
  const [micPermission, setMicPermission] = useState<
    'granted' | 'denied' | 'prompt'
  >('prompt');

  const requestMic = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Mic access denied:', err);
    }
  }, []);

  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'microphone' })
      .then((status) => {
        setMicPermission(status.state as 'granted' | 'denied' | 'prompt');
        if (status.state === 'granted') {
          requestMic();
        }
        status.onchange = () =>
          setMicPermission(status.state as 'granted' | 'denied' | 'prompt');
      })
      .catch((err) => {
        console.error('Permission API unavailable:', err);
      });
  }, [requestMic]);

  return { micPermission, requestMic };
}
