export type NormalizedTranscript = {
  speaker: "interviewer" | "user";
  text: string;
  timestampMs: number;
  isFinal: boolean;
};

type DeepgramWord = {
  word: string;
  start?: number;
  end?: number;
  speaker?: number;
  punctuated_word?: string;
};

type DeepgramMessage = {
  type?: string;
  channel?: {
    alternatives?: Array<{
      transcript?: string;
      words?: DeepgramWord[];
    }>;
  };
  is_final?: boolean;
  speech_final?: boolean;
  start?: number;
  duration?: number;
};

function deepgramDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("dg_debug") === "1";
  } catch {
    return false;
  }
}

type DeepgramOptions = {
  systemStream: MediaStream;
  micStream: MediaStream;
  onTranscript: (_t: NormalizedTranscript) => void;
  onError?: (_e: Error) => void;
  onStatus?: (_s: "connecting" | "open" | "closed") => void;
};

type EnergySample = { ts: number; mic: number; system: number };

function rmsFromTimeDomain(buf: Float32Array) {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / Math.max(1, buf.length));
}

function speakerMajority(words: DeepgramWord[]) {
  const counts = new Map<number, number>();
  for (const w of words) {
    if (typeof w.speaker !== "number") continue;
    counts.set(w.speaker, (counts.get(w.speaker) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  counts.forEach((v, k) => {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  });
  return best;
}

function closestEnergy(samples: EnergySample[], ts: number) {
  if (samples.length === 0) return null;
  let best = samples[0];
  let bestDist = Math.abs(best.ts - ts);
  for (let i = 1; i < samples.length; i++) {
    const d = Math.abs(samples[i].ts - ts);
    if (d < bestDist) {
      best = samples[i];
      bestDist = d;
    }
  }
  return best;
}

function buildDeepgramWsUrl() {
  const q = new URLSearchParams({
    model: "nova-3",
    diarize: "true",
    utterances: "true",
    smart_format: "true",
    filler_words: "false",
    profanity_filter: "true",
    encoding: "linear16",
    sample_rate: "16000",
    channels: "1",
    interim_results: "true",
    endpointing: "50",
  });
  return `wss://api.deepgram.com/v1/listen?${q.toString()}`;
}

async function openDeepgramWs(url: string, protocols?: string | string[]): Promise<WebSocket> {
  return await new Promise<WebSocket>((resolve, reject) => {
    let settled = false;
    const s = new WebSocket(url, protocols);
    s.binaryType = "arraybuffer";

    const debug = deepgramDebugEnabled();

    const cleanup = () => {
      s.removeEventListener("open", onOpen);
      s.removeEventListener("error", onError);
      s.removeEventListener("close", onClose);
    };

    const onOpen = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(s);
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        s.close();
      } catch {
        void 0;
      }
      if (debug) console.error("[deepgram] ws error before open", { url });
      reject(new Error("Deepgram WebSocket failed to open"));
    };

    const onClose = (ev: CloseEvent) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (debug) console.error("[deepgram] ws closed before open", { code: ev.code, reason: ev.reason, url });
      reject(
        new Error(
          `Deepgram WebSocket closed before open (code ${ev.code})${ev.reason ? `: ${ev.reason}` : ""}`
        )
      );
    };

    s.addEventListener("open", onOpen);
    s.addEventListener("error", onError);
    s.addEventListener("close", onClose);
  });
}

async function connectDeepgramWs(baseUrl: string, token: string): Promise<WebSocket> {
  // Deepgram browser authentication: credentials must be passed via Sec-WebSocket-Protocol.
  // Do NOT put secrets in the URL.
  return await openDeepgramWs(baseUrl, ["token", token]);
}

async function deepgramDiagnose(signal: AbortSignal): Promise<unknown> {
  const res = await fetch("/api/deepgram/diagnose?stt=1", { method: "GET", signal });
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    return { ok: res.ok, status: res.status, body: text };
  }
}

async function getDeepgramToken(signal: AbortSignal): Promise<string> {
  const res = await fetch("/api/deepgram/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
  });
  const json = (await res.json().catch((): null => null)) as null | {
    token?: string;
    tokenType?: "api_key" | "jwt";
    error?: string;
  };
  if (!res.ok) throw new Error(json?.error ?? "Failed to get Deepgram token");
  if (!json?.token) throw new Error("Missing Deepgram token");
  return json.token;
}

type PcmSender = {
  close: () => void;
  send: (_buf: ArrayBuffer) => void;
};

function createPcm16Sender({
  systemStream,
  micStream,
  onChunk,
  onEnergy,
}: {
  systemStream: MediaStream;
  micStream: MediaStream;
  onChunk: (_buf: ArrayBuffer) => void;
  onEnergy: (_sample: EnergySample) => void;
}): PcmSender {
  const ctx = new AudioContext({ sampleRate: 16000 });

  const systemSource = ctx.createMediaStreamSource(systemStream);
  const micSource = ctx.createMediaStreamSource(micStream);

  const systemAnalyser = ctx.createAnalyser();
  const micAnalyser = ctx.createAnalyser();
  systemAnalyser.fftSize = 1024;
  micAnalyser.fftSize = 1024;

  const systemGain = ctx.createGain();
  const micGain = ctx.createGain();
  systemGain.gain.value = 1;
  micGain.gain.value = 1;

  systemSource.connect(systemAnalyser);
  micSource.connect(micAnalyser);

  systemSource.connect(systemGain);
  micSource.connect(micGain);

  const merger = ctx.createGain();
  systemGain.connect(merger);
  micGain.connect(merger);

  let stopped = false;

  const workletCode = `
class Pcm16Worklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._carry = 0;
    this._last = 0;
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input || input.length === 0) return true;

    const srcRate = sampleRate;
    const dstRate = 16000;
    const ratio = srcRate / dstRate;

    if (ratio === 1) {
      const out = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        let s = input[i];
        if (s > 1) s = 1;
        if (s < -1) s = -1;
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(out.buffer, [out.buffer]);
      return true;
    }

    const outLen = Math.floor((input.length + this._carry) / ratio);
    if (outLen <= 0) return true;
    const out = new Int16Array(outLen);

    let inPos = -this._carry;
    for (let i = 0; i < outLen; i++) {
      const idx = inPos;
      const i0 = Math.floor(idx);
      const frac = idx - i0;
      const s0 = i0 >= 0 ? input[Math.min(i0, input.length - 1)] : this._last;
      const s1 = input[Math.min(i0 + 1, input.length - 1)];
      let s = s0 + (s1 - s0) * frac;
      if (s > 1) s = 1;
      if (s < -1) s = -1;
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      inPos += ratio;
    }

    const consumed = inPos;
    this._carry = input.length - consumed;
    this._last = input[input.length - 1];
    this.port.postMessage(out.buffer, [out.buffer]);
    return true;
  }
}
registerProcessor('pcm16-worklet', Pcm16Worklet);
`;

  const workletUrl = URL.createObjectURL(
    new Blob([workletCode], { type: "text/javascript" })
  );

  let node: AudioWorkletNode | null = null;
  const pending: ArrayBuffer[] = [];

  const enqueue = (buf: ArrayBuffer) => {
    pending.push(buf);
    while (pending.length > 12) pending.shift();
  };

  const send = (buf: ArrayBuffer) => {
    if (stopped) return;
    onChunk(buf);
  };

  const start = async () => {
    await ctx.audioWorklet.addModule(workletUrl);
    node = new AudioWorkletNode(ctx, "pcm16-worklet", {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
    });

    node.port.onmessage = (e) => {
      const buf = e.data as ArrayBuffer;
      if (stopped) return;
      send(buf);
    };

    merger.connect(node);

    const systemBuf = new Float32Array(systemAnalyser.fftSize);
    const micBuf = new Float32Array(micAnalyser.fftSize);

    const tick = () => {
      if (stopped) return;
      systemAnalyser.getFloatTimeDomainData(systemBuf);
      micAnalyser.getFloatTimeDomainData(micBuf);
      onEnergy({
        ts: Date.now(),
        mic: rmsFromTimeDomain(micBuf),
        system: rmsFromTimeDomain(systemBuf),
      });
      setTimeout(tick, 90);
    };
    tick();

    for (const b of pending.splice(0, pending.length)) send(b);
  };

  void start().catch(() => {
    URL.revokeObjectURL(workletUrl);
  });

  return {
    close: () => {
      stopped = true;
      try {
        if (node) {
          node.port.onmessage = null;
          node.disconnect();
        }
      } catch {
        void 0;
      }
      try {
        systemSource.disconnect();
        micSource.disconnect();
        systemGain.disconnect();
        micGain.disconnect();
        merger.disconnect();
      } catch {
        void 0;
      }
      try {
        ctx.close();
      } catch {
        void 0;
      }
      try {
        URL.revokeObjectURL(workletUrl);
      } catch {
        void 0;
      }
    },
    send: (buf: ArrayBuffer) => {
      if (stopped) return;
      enqueue(buf);
    },
  };
}

export function createDeepgramRealtimeTranscriber() {
  let ws: WebSocket | null = null;
  let stopped = false;
  let sender: PcmSender | null = null;
  let reconnectAttempt = 0;
  let lastPartialText = "";
  const speakerMap = new Map<number, "interviewer" | "user">();
  const energySamples: EnergySample[] = [];

  /*
    Deepgram 401/403 checklist:
    - Ensure server env `DEEPGRAM_API_KEY` is set.
    - Verify key validity + permissions by calling `/api/deepgram/diagnose?stt=1`.
    - A 403 “Insufficient permissions” usually means the key lacks `usage:write`.
    - Do not retry on auth failures; only retry on transient network errors.
  */

  const pushEnergy = (s: EnergySample) => {
    energySamples.push(s);
    while (energySamples.length > 140) energySamples.shift();
  };

  const mapSpeaker = (speakerId: number | null, ts: number) => {
    if (speakerId === null) {
      const e = closestEnergy(energySamples, ts);
      if (e && e.mic > e.system * 1.2) return "user";
      return "interviewer";
    }
    const existing = speakerMap.get(speakerId);
    if (existing) return existing;
    const e = closestEnergy(energySamples, ts);
    const mapped =
      e && e.mic > e.system * 1.2 ? ("user" as const) : ("interviewer" as const);
    speakerMap.set(speakerId, mapped);
    return mapped;
  };

  const connect = async ({
    systemStream,
    micStream,
    onTranscript,
    onError,
    onStatus,
  }: DeepgramOptions) => {
    const controller = new AbortController();
    const sessionStartMs = Date.now();
    const debug = deepgramDebugEnabled();

    const isAuthFailure = (reason: string) => {
      if (!reason) return false;
      const r = reason.toLowerCase();
      if (r.includes("forbidden") || r.includes("unauthorized")) return true;
      if (r.includes("insufficient permissions")) return true;
      if (r.includes("invalid credentials") || r.includes("invalid api key")) return true;
      return false;
    };

    const normalizeCloseReason = (reason: string) => {
      if (!reason) return "";
      try {
        const j = JSON.parse(reason) as any;
        if (typeof j?.err_code === "string" || typeof j?.err_msg === "string") {
          return `${j.err_code ?? ""}${j.err_msg ? `: ${j.err_msg}` : ""}`.trim();
        }
      } catch {
        /* ignore */
      }
      return reason;
    };

    const open = async (): Promise<void> => {
      onStatus?.("connecting");
      const token = await getDeepgramToken(controller.signal);

      if (debug) console.info("[deepgram] ws connecting", { url: buildDeepgramWsUrl() });
      ws = await connectDeepgramWs(buildDeepgramWsUrl(), token);
      reconnectAttempt = 0;
      onStatus?.("open");

      ws.onclose = (ev) => {
        onStatus?.("closed");
        if (stopped) return;

        const reason = normalizeCloseReason(ev.reason ?? "");
        if (debug) console.warn("[deepgram] ws closed", { code: ev.code, reason });
        if (ev.code === 1008 || isAuthFailure(reason)) {
          stopped = true;
          onError?.(
            new Error(
              `Deepgram auth rejected (code ${ev.code}). ${reason || "Check DEEPGRAM_API_KEY permissions (usage:write) and project access."}`
            )
          );
          return;
        }

        const delay = Math.min(2500, 250 * 2 ** reconnectAttempt);
        reconnectAttempt = Math.min(4, reconnectAttempt + 1);
        setTimeout(() => {
          if (stopped) return;
          void open().catch((): void => undefined);
        }, delay);
      };

      ws.onerror = () => {
        if (stopped) return;
        if (debug) console.error("[deepgram] ws error");
        onError?.(new Error("Deepgram WebSocket error"));
      };

      ws.onmessage = (ev) => {
        if (typeof ev.data !== "string") return;
        let msg: DeepgramMessage | null = null;
        try {
          msg = JSON.parse(ev.data) as DeepgramMessage;
        } catch {
          return;
        }
        const alt = msg.channel?.alternatives?.[0];
        const transcript = (alt?.transcript ?? "").trim();
        if (!transcript) return;

        const words = alt?.words ?? [];
        const startS =
          words.length && typeof words[0].start === "number"
            ? words[0].start
            : typeof msg.start === "number"
              ? msg.start
              : 0;
        const tsMs = Math.round(sessionStartMs + startS * 1000);

        const speakerId = speakerMajority(words);
        const speaker = mapSpeaker(speakerId, tsMs);

        const isFinal = Boolean(msg.is_final || msg.speech_final);
        if (!isFinal) {
          if (transcript === lastPartialText) return;
          lastPartialText = transcript;
        } else {
          lastPartialText = "";
        }

        onTranscript({
          speaker,
          text: transcript,
          timestampMs: tsMs,
          isFinal,
        });
      };
    };

    sender = createPcm16Sender({
      systemStream,
      micStream,
      onChunk: (buf) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (!buf || buf.byteLength === 0) return;
        try {
          ws.send(buf);
        } catch {
          void 0;
        }
      },
      onEnergy: pushEnergy,
    });

    try {
      await open();
    } catch (e: any) {
      if (stopped) {
        onError?.(e instanceof Error ? e : new Error("Deepgram connect failed"));
      } else {
        let diag: any = null;
        try {
          diag = await deepgramDiagnose(controller.signal);
          if (debug) console.error("[deepgram] diagnose", diag);
        } catch {
          void 0;
        }

        const authStatus =
          typeof diag?.checks?.restStt?.status === "number"
            ? diag.checks.restStt.status
            : typeof diag?.checks?.authToken?.status === "number"
              ? diag.checks.authToken.status
              : null;
        if (authStatus === 401 || authStatus === 403) {
          stopped = true;
          onError?.(
            new Error(
              `Deepgram auth rejected (${authStatus}). Verify the API key is a Member key and has usage:write permissions for streaming.`
            )
          );
        } else {
          onError?.(e instanceof Error ? e : new Error("Deepgram connect failed"));
          const delay = Math.min(2500, 250 * 2 ** reconnectAttempt);
          reconnectAttempt = Math.min(4, reconnectAttempt + 1);
          setTimeout(() => {
            if (stopped) return;
            void open().catch((): void => undefined);
          }, delay);
        }
      }
    }

    return {
      stop: () => {
        stopped = true;
        controller.abort();
        try {
          if (ws && ws.readyState === WebSocket.OPEN) ws.close();
        } catch {
          void 0;
        }
        ws = null;
        try {
          sender?.close();
        } catch {
          void 0;
        }
        sender = null;
      },
    };
  };

  return {
    start: connect,
  };
}
