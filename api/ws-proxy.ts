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

function buildDeepgramUrl(): string {
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

loadLocalEnvIfNeeded();

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
});

const wss = new WebSocketServer({ server, path: "/ws/transcribe" });

wss.on("connection", (client) => {
  let stopped = false;
  let dg: WebSocket | null = null;
  let dgConnecting = false;
  let dgAttempts = 0;
  const dgMaxAttempts = 5;
  const audioQueue: Buffer[] = [];

  const connectDeepgram = () => {
    if (stopped || dgConnecting || dg) return;
    dgConnecting = true;

    const apiKey = getEnv("DEEPGRAM_API_KEY");
    if (!apiKey) {
      dgConnecting = false;
      sendJson(client, status("error", "Missing DEEPGRAM_API_KEY in server env"));
      try {
        client.close();
      } catch {
        void 0;
      }
      return;
    }
    const url = buildDeepgramUrl();
    const sock = new WebSocket(url, ["token", apiKey]);
    sock.binaryType = "arraybuffer";

    sock.on("open", () => {
      dgConnecting = false;
      dgAttempts = 0;
      dg = sock;
      sendJson(client, status("streaming"));
      while (audioQueue.length) {
        const b = audioQueue.shift();
        if (!b) continue;
        try {
          sock.send(b);
        } catch {
          break;
        }
      }
    });

    sock.on("message", (data) => {
      if (typeof data !== "string") return;
      let msg: DeepgramMessage | null = null;
      try {
        msg = JSON.parse(data) as DeepgramMessage;
      } catch {
        return;
      }
      const alt = msg.channel?.alternatives?.[0];
      const transcript = (alt?.transcript ?? "").trim();
      if (!transcript) return;
      const words = alt?.words ?? [];
      const sp = speakerMajority(words);
      const speaker = sp === 0 || sp === null ? "interviewer" : "other";
      const out: ProxyTranscriptMsg = {
        type: "transcript",
        text: transcript,
        isFinal: Boolean(msg.is_final || msg.speech_final),
        speaker,
        ts: Date.now(),
      };
      sendJson(client, out);
    });

    sock.on("close", (ev) => {
      dgConnecting = false;
      dg = null;
      if (stopped) return;
      const reason = normalizeCloseReason((ev as any).reason ?? "");
      if (isAuthFailure((ev as any).code ?? 0, reason)) {
        sendJson(client, status("error", `Deepgram auth rejected: ${reason || "unauthorized"}`));
        try {
          client.close();
        } catch {
          void 0;
        }
        return;
      }

      if (dgAttempts >= dgMaxAttempts) {
        sendJson(client, status("error", "Deepgram reconnect limit reached"));
        try {
          client.close();
        } catch {
          void 0;
        }
        return;
      }
      const delay = Math.min(3000, 250 * 2 ** dgAttempts);
      dgAttempts += 1;
      sendJson(client, status("connected", `Deepgram reconnecting in ${delay}ms`));
      setTimeout(() => {
        if (stopped) return;
        connectDeepgram();
      }, delay);
    });

    sock.on("error", () => {
      dgConnecting = false;
      if (stopped) return;
      sendJson(client, status("error", "Deepgram socket error"));
    });
  };

  sendJson(client, status("connected"));
  connectDeepgram();

  client.on("message", (data) => {
    if (stopped) return;
    if (typeof data === "string") {
      let msg: ProxyControlMsg | null = null;
      try {
        msg = JSON.parse(data) as ProxyControlMsg;
      } catch {
        return;
      }
      if (msg.type === "stop") {
        stopped = true;
        try {
          dg?.close();
        } catch {
          void 0;
        }
        dg = null;
        try {
          client.close();
        } catch {
          void 0;
        }
      }
      return;
    }

    const buf = Buffer.from(data as any);
    if (!buf.length) return;
    if (dg && dg.readyState === WebSocket.OPEN) {
      try {
        dg.send(buf);
      } catch {
        void 0;
      }
      return;
    }
    audioQueue.push(buf);
    while (audioQueue.length > 50) audioQueue.shift();
  });

  client.on("close", () => {
    stopped = true;
    try {
      dg?.close();
    } catch {
      void 0;
    }
    dg = null;
  });
});

let port = Number(process.env.DG_PROXY_PORT ?? 3035);
const maxPort = port + 10;
let listening = false;
let retryScheduled = false;

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

listen();
