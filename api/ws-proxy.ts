import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { WebSocket, WebSocketServer } from "ws";
import type {
  ProxyControlMsg,
  ProxyServerMsg,
  ProxyStatusMsg,
  ProxyTranscriptMsg,
} from "../shared/transcription";

/* ─── Types ─────────────────────────────────────────────────── */

type DeepgramWord = {
  word?: string;
  speaker?: number;
  start?: number;
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
};

/* ─── Env helpers ───────────────────────────────────────────── */

function loadDotEnvFile(filePath: string): void {
  let raw = "";
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    if (process.env[key] != null) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadLocalEnvIfNeeded(): void {
  const cwd = process.cwd();
  loadDotEnvFile(path.join(cwd, ".env.local"));
  loadDotEnvFile(path.join(cwd, ".env"));
}

function getEnv(name: string): string | null {
  return process.env[name] ?? null;
}

/* ─── Deepgram URL — Nova-3 optimised for low-latency live streaming ── */

function buildDeepgramUrl(): string {
  const q = new URLSearchParams({
    model:           "nova-3",
    encoding:        "linear16",
    sample_rate:     "16000",
    channels:        "1",
    interim_results: "true",
    endpointing:     "150",        // 150ms — faster speech-end detection
    smart_format:    "true",
    diarize:         "false",      // skip diarization → lower latency
    vad_events:      "true",       // voice-activity events for faster detection
    no_delay:        "true",       // disable internal buffering → lowest latency
  });
  return `wss://api.deepgram.com/v1/listen?${q.toString()}`;
}

/* ─── Helpers ───────────────────────────────────────────────── */

function normalizeCloseReason(reason: string): string {
  if (!reason) return "";
  try {
    const j = JSON.parse(reason) as any;
    if (typeof j?.err_code === "string" || typeof j?.err_msg === "string") {
      return `${j.err_code ?? ""}${j.err_msg ? `: ${j.err_msg}` : ""}`.trim();
    }
  } catch {
    void 0;
  }
  return reason;
}

function isAuthFailure(code: number, reason: string): boolean {
  if (code === 1008) return true;
  const r = (reason || "").toLowerCase();
  if (r.includes("forbidden") || r.includes("unauthorized")) return true;
  if (r.includes("insufficient permissions")) return true;
  if (r.includes("invalid credentials") || r.includes("invalid api key")) return true;
  return false;
}

function speakerMajority(words: DeepgramWord[]): number | null {
  if (!words.length) return null;
  const counts = new Map<number, number>();
  for (const w of words) {
    const s = w.speaker;
    if (typeof s !== "number") continue;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [k, v] of counts.entries()) {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  }
  return best;
}

function sendJson(ws: WebSocket, msg: ProxyServerMsg): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    void 0;
  }
}

function status(state: ProxyStatusMsg["state"], detail?: string): ProxyStatusMsg {
  return { type: "status", state, detail };
}

/* ─── Boot ──────────────────────────────────────────────────── */

loadLocalEnvIfNeeded();

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
});

const wss = new WebSocketServer({ server, path: "/ws/transcribe" });

/* ─── Per-client connection handler ─────────────────────────── */

wss.on("connection", (client) => {
  console.log("[proxy] Browser client connected");

  /* ── Connection state ── */
  let stopped = false;
  let dg: WebSocket | null = null;
  let dgConnecting = false;
  let dgAttempts = 0;
  const DG_MAX_ATTEMPTS = 10;

  // Generation counter — prevents stale socket callbacks from
  // interfering when a newer connectDeepgram() call supersedes.
  let connectGen = 0;

  // Audio ring-buffer: keeps last ~5s (250 × 20ms frames) so
  // Deepgram gets immediate context after a reconnect.
  const AUDIO_RING_CAP = 250;
  const audioQueue: Buffer[] = [];

  // Timers
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
  let lastTranscriptMs = 0; // watchdog: detect silent connections

  /* ── teardownDg — clean up the Deepgram socket only ── */
  const teardownDg = () => {
    if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null; }
    const old = dg;
    dg = null;
    dgConnecting = false;
    if (old) {
      try { old.removeAllListeners(); } catch { void 0; }
      try { old.close(); } catch { void 0; }
    }
    // Keep buffered audio — reconnect will flush it to the new socket
    while (audioQueue.length > AUDIO_RING_CAP) audioQueue.shift();
  };

  /* ── scheduleReconnect — deduped, single timer ── */
  const scheduleReconnect = () => {
    if (stopped) return;
    if (reconnectTimerId) return;            // already scheduled
    if (dgAttempts >= DG_MAX_ATTEMPTS) {
      sendJson(client, status("error", "Deepgram reconnect limit reached. Refresh to retry."));
      try { client.close(); } catch { void 0; }
      return;
    }
    // Exponential backoff: 300, 600, 1200, 2400, 3000, 3000 …
    const delay = Math.min(3000, 300 * 2 ** dgAttempts);
    dgAttempts += 1;
    console.log(`[proxy] Scheduling reconnect in ${delay}ms (attempt ${dgAttempts}/${DG_MAX_ATTEMPTS})`);
    sendJson(client, status("connected", `Reconnecting…`));
    reconnectTimerId = setTimeout(() => {
      reconnectTimerId = null;
      if (!stopped) connectDeepgram();
    }, delay);
  };

  /* ── connectDeepgram — create a fresh Deepgram WebSocket ── */
  const connectDeepgram = () => {
    if (stopped) return;

    // Increment generation FIRST so any in-flight handlers from
    // a previous socket will see a stale gen and bail out.
    connectGen += 1;
    const thisGen = connectGen;

    // Clean up previous socket (if any)
    teardownDg();
    dgConnecting = true;

    const apiKey = getEnv("DEEPGRAM_API_KEY");
    if (!apiKey) {
      dgConnecting = false;
      sendJson(client, status("error", "Missing DEEPGRAM_API_KEY in server env"));
      try { client.close(); } catch { void 0; }
      return;
    }

    const url = buildDeepgramUrl();
    console.log(`[proxy] Connecting to Deepgram (attempt ${dgAttempts + 1}/${DG_MAX_ATTEMPTS})…`);

    // Use Authorization header (faster handshake than sub-protocol auth)
    const sock = new WebSocket(url, {
      headers: { Authorization: `Token ${apiKey}` },
      handshakeTimeout: 3_000,   // 3s — fail fast, retry fast
    });
    sock.binaryType = "arraybuffer";

    /* ── OPEN ── */
    sock.on("open", () => {
      if (thisGen !== connectGen) {
        // A newer connectDeepgram() superseded us — discard
        try { sock.close(); } catch { void 0; }
        return;
      }
      console.log("[proxy] Deepgram connection OPEN");
      dgConnecting = false;
      dgAttempts = 0;
      dg = sock;
      lastTranscriptMs = Date.now();
      sendJson(client, status("streaming"));

      // KeepAlive every 5s — Deepgram's idle timeout is ~10s,
      // so 5s interval provides safe margin.
      keepAliveTimer = setInterval(() => {
        if (dg?.readyState === WebSocket.OPEN) {
          try { dg.send(JSON.stringify({ type: "KeepAlive" })); } catch { void 0; }
        }
      }, 5_000);

      // Flush buffered audio so Deepgram gets immediate context
      const queued = audioQueue.splice(0, audioQueue.length);
      for (const b of queued) {
        try { sock.send(b); } catch { break; }
      }
    });

    /* ── MESSAGE — Deepgram transcript result ── */
    sock.on("message", (rawData, isBinary) => {
      if (thisGen !== connectGen) return;
      if (isBinary) return;
      const data = rawData.toString();
      let msg: DeepgramMessage | null = null;
      try {
        msg = JSON.parse(data) as DeepgramMessage;
      } catch {
        return;
      }
      const alt = msg.channel?.alternatives?.[0];
      const transcript = (alt?.transcript ?? "").trim();
      if (!transcript) return;

      lastTranscriptMs = Date.now();

      // With diarize=false, all speech comes from the system audio
      // (interviewer's voice). No speaker detection needed.
      const speaker = "interviewer";
      const out: ProxyTranscriptMsg = {
        type: "transcript",
        text: transcript,
        isFinal: Boolean(msg.is_final),
        speechFinal: Boolean(msg.speech_final),
        speaker,
        ts: Date.now(),
      };
      console.log(
        `[proxy] ▸ ${out.speaker} | final=${out.isFinal} speechFinal=${out.speechFinal} | "${out.text.slice(0, 80)}"`
      );
      sendJson(client, out);
    });

    /* ── CLOSE ── */
    sock.on("close", (code, reason) => {
      if (thisGen !== connectGen) return; // stale
      console.log(`[proxy] Deepgram closed: code=${code} reason=${reason?.toString() ?? ""}`);
      teardownDg();
      if (stopped) return;
      const reasonStr = normalizeCloseReason(reason?.toString() ?? "");
      if (isAuthFailure(code ?? 0, reasonStr)) {
        sendJson(client, status("error", `Deepgram auth rejected: ${reasonStr || "unauthorized"}`));
        try { client.close(); } catch { void 0; }
        return;
      }
      scheduleReconnect();
    });

    /* ── ERROR ── */
    sock.on("error", (err) => {
      if (thisGen !== connectGen) return; // stale
      console.error("[proxy] Deepgram socket error:", err?.message ?? err);
      teardownDg();
      if (stopped) return;
      sendJson(client, status("error", `DG error: ${err?.message ?? "unknown"}`));
      scheduleReconnect();
    });
  };

  /* ── Watchdog: if no transcripts for 25s despite audio flowing,
       force a reconnect (handles silent / zombie connections) ── */
  const watchdogTimer = setInterval(() => {
    if (stopped || !dg || dg.readyState !== WebSocket.OPEN) return;
    if (Date.now() - lastTranscriptMs > 25_000) {
      console.warn("[proxy] Watchdog: no transcripts for 25s — forcing reconnect");
      dgAttempts = 0; // give full retry budget
      teardownDg();
      scheduleReconnect();
    }
  }, 10_000);

  /* ── Kick off ── */
  sendJson(client, status("connected"));
  connectDeepgram();

  /* ── Browser → Deepgram audio pipeline ── */
  let audioFrames = 0;
  client.on("message", (rawData, isBinary) => {
    if (stopped) return;
    if (!isBinary) {
      const text = rawData.toString();
      let msg: ProxyControlMsg | null = null;
      try {
        msg = JSON.parse(text) as ProxyControlMsg;
      } catch {
        return;
      }
      if (msg.type === "stop") {
        stopped = true;
        teardownDg();
        if (reconnectTimerId) { clearTimeout(reconnectTimerId); reconnectTimerId = null; }
        clearInterval(watchdogTimer);
        try { client.close(); } catch { void 0; }
      }
      return;
    }

    const buf = Buffer.from(rawData as any);
    if (!buf.length) return;
    audioFrames++;
    if (audioFrames === 1) console.log("[proxy] First audio frame received from browser");
    if (audioFrames % 500 === 0) console.log(`[proxy] Audio frames: ${audioFrames} (~${Math.round(audioFrames * 20 / 1000)}s)`);

    // Send directly to Deepgram if connected, otherwise ring-buffer
    if (dg?.readyState === WebSocket.OPEN) {
      try { dg.send(buf); } catch { void 0; }
      return;
    }
    audioQueue.push(buf);
    while (audioQueue.length > AUDIO_RING_CAP) audioQueue.shift();
  });

  client.on("close", () => {
    console.log("[proxy] Browser client disconnected");
    stopped = true;
    teardownDg();
    if (reconnectTimerId) { clearTimeout(reconnectTimerId); reconnectTimerId = null; }
    clearInterval(watchdogTimer);
  });
});

/* ─── Server bootstrap ──────────────────────────────────────── */

let port = Number(process.env.DG_PROXY_PORT ?? 3035);
const maxPort = port + 10;
let listening = false;
let retryScheduled = false;

const killPortAndListen = async () => {
  try {
    const { execSync } = await import("node:child_process");
    const out = execSync(
      `powershell -Command "(Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue).OwningProcess"`,
      { encoding: "utf8", timeout: 3000 }
    ).trim();
    const pids = [...new Set(out.split(/\r?\n/).map(s => s.trim()).filter(Boolean))];
    for (const pid of pids) {
      if (pid && pid !== String(process.pid)) {
        try { execSync(`taskkill /F /PID ${pid}`, { timeout: 2000 }); } catch { void 0; }
        console.log(`[proxy] Killed stale PID ${pid} on port ${port}`);
      }
    }
    if (pids.length) await new Promise(r => setTimeout(r, 300));
  } catch {
    void 0;
  }
  listen();
};

const listen = () => {
  retryScheduled = false;
  server.listen(port, () => {
    listening = true;
    process.stdout.write(`Deepgram proxy listening on ws://localhost:${port}/ws/transcribe\n`);
  });
};

const handleListenError = (err: any) => {
  if (listening) return;
  if (err?.code === "EADDRINUSE" && port < maxPort) {
    if (retryScheduled) return;
    port += 1;
    retryScheduled = true;
    setTimeout(() => listen(), 50);
    return;
  }
  process.stderr.write(`${err?.message ?? "Proxy server error"}\n`);
  process.exit(1);
};

server.on("error", handleListenError);
wss.on("error", handleListenError);

killPortAndListen();
