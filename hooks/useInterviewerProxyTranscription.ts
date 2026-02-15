import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProxyServerMsg, ProxyStatusMsg, ProxyTranscriptMsg } from "../shared/transcription";

type StatusState = ProxyStatusMsg["state"];

export type FinalizedLine = {
  text: string;
  ts: number;
};

function buildProxyWsUrl(port: number) {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.hostname;
  return `${proto}://${host}:${port}/ws/transcribe`;
}

function createWorkletUrl() {
  const workletCode = `
class SystemPcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._carry = 0;
    this._pending = new Int16Array(0);
    this._energyCount = 0;
  }

  _appendPending(chunk) {
    if (this._pending.length === 0) {
      this._pending = chunk;
      return;
    }
    const out = new Int16Array(this._pending.length + chunk.length);
    out.set(this._pending, 0);
    out.set(chunk, this._pending.length);
    this._pending = out;
  }

  _drainFrames() {
    const frameSamples = 320;
    while (this._pending.length >= frameSamples) {
      const frame = this._pending.subarray(0, frameSamples);
      const rest = this._pending.subarray(frameSamples);
      const buf = frame.slice().buffer;
      this.port.postMessage({ type: 'chunk', buf }, [buf]);
      this._pending = rest.length ? rest.slice() : new Int16Array(0);
    }
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input || input.length === 0) return true;

    const srcRate = sampleRate;
    const dstRate = 16000;
    const ratio = srcRate / dstRate;
    const outLen = Math.floor((input.length + this._carry) / ratio);
    if (outLen <= 0) return true;

    const out = new Int16Array(outLen);
    let sumSq = 0;
    for (let i = 0; i < outLen; i++) {
      const srcIndex = Math.floor(i * ratio - this._carry);
      let s = input[Math.min(input.length - 1, Math.max(0, srcIndex))];
      if (s > 1) s = 1;
      if (s < -1) s = -1;
      sumSq += s * s;
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    const consumed = outLen * ratio - this._carry;
    this._carry = Math.max(0, consumed - input.length);

    this._appendPending(out);
    this._drainFrames();

    this._energyCount++;
    if (this._energyCount % 5 === 0) {
      const rms = Math.sqrt(sumSq / outLen);
      this.port.postMessage({ type: 'energy', rms });
    }

    return true;
  }
}

registerProcessor('system-pcm-worklet', SystemPcmWorklet);
`;

  return URL.createObjectURL(new Blob([workletCode], { type: "text/javascript" }));
}

/** Max finalized lines to keep in memory */
const MAX_LINES = 300;

export function useInterviewerProxyTranscription({
  onSpeechActiveChange,
  systemStream,
}: {
  onSpeechActiveChange?: (active: boolean) => void;
  systemStream?: MediaStream | null;
} = {}) {
  const [status, setStatus] = useState<StatusState>("closed");
  const [error, setError] = useState<string | null>(null);

  // --- Transcript state ---
  const [finalizedLines, setFinalizedLines] = useState<FinalizedLine[]>([]);
  const [interimText, setInterimText] = useState("");
  const lastFinalSentenceRef = useRef("");

  const [isSpeechActive, setIsSpeechActive] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletUrlRef = useRef<string | null>(null);

  const lastRmsRef = useRef(0);
  const lastSpeechMsRef = useRef(0);
  const speechActiveRef = useRef(false);
  const stoppedRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const proxyPortRef = useRef(3035);

  const envProxyUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_DG_PROXY_URL || "";
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    reconnectAttemptRef.current = 0;

    try {
      wsRef.current?.send(JSON.stringify({ type: "stop", sampleRate: 16000, encoding: "linear16", chunkMs: 20 }));
    } catch {
      void 0;
    }

    try {
      wsRef.current?.close();
    } catch {
      void 0;
    }
    wsRef.current = null;

    try {
      nodeRef.current?.port && (nodeRef.current.port.onmessage = null);
      nodeRef.current?.disconnect();
    } catch {
      void 0;
    }
    nodeRef.current = null;

    try {
      ctxRef.current?.close();
    } catch {
      void 0;
    }
    ctxRef.current = null;

    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      void 0;
    }
    streamRef.current = null;

    try {
      if (workletUrlRef.current) URL.revokeObjectURL(workletUrlRef.current);
    } catch {
      void 0;
    }
    workletUrlRef.current = null;

    setStatus("closed");
    setError(null);
    setIsSpeechActive(false);
  }, []);

  const connectProxy = useCallback(() => {
    const url = envProxyUrl || buildProxyWsUrl(proxyPortRef.current);
    if (!url) {
      setError("Missing proxy WebSocket URL");
      setStatus("error");
      return;
    }

    setStatus("connected");
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setStatus("connected");
      setError(null);
      try {
        ws.send(JSON.stringify({ type: "start", sampleRate: 16000, encoding: "linear16", chunkMs: 20 }));
      } catch {
        void 0;
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (stoppedRef.current) return;
      const attempt = reconnectAttemptRef.current;
      if (attempt >= 8) {
        setStatus("error");
        setError(
          "Proxy reconnect limit reached. Start the proxy server with `npm run dev:proxy` (or just use `npm run dev`) and retry."
        );
        return;
      }
      if (!envProxyUrl) {
        proxyPortRef.current = 3035 + Math.min(attempt + 1, 10);
      }
      const delay = Math.min(2000, 200 * 2 ** attempt);
      reconnectAttemptRef.current = attempt + 1;
      reconnectTimerRef.current = window.setTimeout(() => {
        connectProxy();
      }, delay);
    };

    ws.onerror = () => {
      setStatus("error");
      setError(
        `Proxy WebSocket error (${url}). Ensure the proxy is running: npm run dev:proxy (or npm run dev).`
      );
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data !== "string") return;
      let msg: ProxyServerMsg | null = null;
      try {
        msg = JSON.parse(ev.data) as ProxyServerMsg;
      } catch {
        return;
      }

      if (msg.type === "status") {
        setStatus(msg.state);
        if (msg.state === "error") setError(msg.detail || "Proxy error");
        return;
      }

      const t = msg as ProxyTranscriptMsg;

      // Only show interviewer lines — ignore mic/local speaker
      if (t.speaker !== "interviewer") return;

      const text = (t.text || "").trim();
      if (!text) return;

      if (t.speechFinal) {
        // End of utterance — finalize this line, clear interim
        setFinalizedLines((prev) => {
          // Dedupe: don't add if identical to last line
          const last = prev[prev.length - 1];
          if (last && last.text === text) return prev;
          const next = [...prev, { text, ts: t.ts }];
          return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
        });
        setInterimText("");
        lastFinalSentenceRef.current = text;
      } else {
        // Interim or is_final-but-not-speech_final — update current line in place
        setInterimText(text);
      }
    };
  }, [envProxyUrl]);

  const start = useCallback(async () => {
    stoppedRef.current = false;
    setError(null);
    setInterimText("");

    // Require system audio from ScreenCapture — never request getDisplayMedia here
    if (!systemStream || systemStream.getAudioTracks().length === 0) {
      setStatus("error");
      setError(
        "No system audio. Click \"Start Capture\" first and make sure \"Share tab audio\" is checked."
      );
      return;
    }

    connectProxy();

    try {
      streamRef.current = new MediaStream(systemStream.getAudioTracks());

      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const workletUrl = createWorkletUrl();
      workletUrlRef.current = workletUrl;
      await ctx.audioWorklet.addModule(workletUrl);

      const source = ctx.createMediaStreamSource(streamRef.current);
      const node = new AudioWorkletNode(ctx, "system-pcm-worklet");
      nodeRef.current = node;

      node.port.onmessage = (e) => {
        const data = e.data as any;
        if (!data) return;
        if (data.type === "energy" && typeof data.rms === "number") {
          lastRmsRef.current = data.rms;
          const now = Date.now();
          if (data.rms > 0.02) lastSpeechMsRef.current = now;
          return;
        }
        if (data.type === "chunk" && data.buf) {
          const ws = wsRef.current;
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          try {
            ws.send(data.buf);
            setStatus((s) => (s === "streaming" ? s : "streaming"));
          } catch {
            void 0;
          }
        }
      };

      source.connect(node);
      setStatus("streaming");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message ?? "Failed to start audio pipeline.");
    }
  }, [connectProxy, systemStream]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const active = now - lastSpeechMsRef.current < 350;
      if (speechActiveRef.current !== active) {
        speechActiveRef.current = active;
        setIsSpeechActive(active);
        onSpeechActiveChange?.(active);
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [onSpeechActiveChange]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const clearTranscript = useCallback(() => {
    setFinalizedLines([]);
    setInterimText("");
    lastFinalSentenceRef.current = "";
  }, []);

  return {
    status,
    error,
    finalizedLines,
    interimText,
    lastFinalSentence: lastFinalSentenceRef.current,
    isSpeechActive,
    start,
    stop,
    clearTranscript,
  };
}
