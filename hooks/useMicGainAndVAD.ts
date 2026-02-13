import { useEffect, useRef } from 'react';

export function useMicGainAndVAD({
  rawStream,
  silenceSeconds = 5,
  minDb = -60, // "speech starts" threshold
  targetDb = -25, // we'll normalise towards this
  maxGainDb = +12, // safety ceiling
  onSilence,
  onLevelChange,
}: {
  rawStream: MediaStream | null;
  silenceSeconds?: number;
  minDb?: number;
  targetDb?: number;
  maxGainDb?: number;
  onSilence: () => void;
  // eslint-disable-next-line no-unused-vars
  onLevelChange?: (db: number) => void;
}) {
  const actxRef = useRef<AudioContext>();
  const gainRef = useRef<GainNode>();
  const vadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!rawStream) return;

    const ctx = new AudioContext();
    actxRef.current = ctx;

    const src = ctx.createMediaStreamSource(rawStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;

    const gain = ctx.createGain();
    gainRef.current = gain;

    src.connect(analyser);
    analyser.connect(gain);
    const dest = ctx.createMediaStreamDestination();
    gain.connect(dest);
    processedStreamRef.current = dest.stream;

    // VAD loop
    const buf = new Uint8Array(analyser.fftSize);
    const check = () => {
      analyser.getByteTimeDomainData(buf);
      // Compute RMS → dB
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const n = (buf[i] - 128) / 128;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / buf.length);
      const db = 20 * Math.log10(rms);

      // Notify UI
      onLevelChange?.(db);

      // Auto-gain
      if (db > minDb) {
        const needed = targetDb - db; // positive if too quiet
        const newGain = Math.min(
          Math.pow(10, Math.min(needed, maxGainDb) / 20),
          8 /* an extra hard ceiling */
        );
        gain.gain.linearRampToValueAtTime(newGain, ctx.currentTime + 0.1);
      } else {
        // below noise floor → reset gain slowly
        gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.5);
      }

      // Silence timeout
      if (db < minDb) {
        if (!vadTimerRef.current) {
          vadTimerRef.current = setTimeout(onSilence, silenceSeconds * 1000);
        }
      } else if (vadTimerRef.current) {
        clearTimeout(vadTimerRef.current);
        vadTimerRef.current = null;
      }

      requestAnimationFrame(check);
    };
    check();

    return () => {
      if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
      processedStreamRef.current = null;
      ctx.close();
    };
  }, [
    rawStream,
    silenceSeconds,
    minDb,
    targetDb,
    maxGainDb,
    onSilence,
    onLevelChange,
  ]);

  return processedStreamRef.current;
}
