import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getDeepgramKey(): string {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    throw new Error("Missing DEEPGRAM_API_KEY in server env.");
  }
  return key;
}

function silentWav16kMonoMs(ms: number) {
  const sampleRate = 16000;
  const samples = Math.max(1, Math.floor((sampleRate * ms) / 1000));
  const bytesPerSample = 2;
  const dataSize = samples * bytesPerSample;

  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buf.writeUInt16LE(bytesPerSample, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const runStt = url.searchParams.get("stt") === "1";
  const key = getDeepgramKey();

  const out: any = { ok: true, checks: {} };

  const tokenRes = await fetch("https://api.deepgram.com/v1/auth/token", {
    method: "GET",
    headers: { Authorization: `Token ${key}` },
  });

  const tokenText = await tokenRes.text().catch(() => "");
  out.checks.authToken = {
    ok: tokenRes.ok,
    status: tokenRes.status,
    body: tokenText,
  };

  if (runStt) {
    const sttUrl =
      "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&filler_words=false&profanity_filter=true";

    const wav = silentWav16kMonoMs(250);
    const wavBody = Uint8Array.from(wav);
    const sttRes = await fetch(sttUrl, {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "audio/wav",
      },
      body: wavBody,
    });
    const sttText = await sttRes.text().catch(() => "");
    out.checks.restStt = {
      ok: sttRes.ok,
      status: sttRes.status,
      body: sttText,
    };
  }

  out.ok = Boolean(out.checks.authToken.ok) && (!runStt || Boolean(out.checks.restStt.ok));
  return NextResponse.json(out, { status: out.ok ? 200 : 500 });
}
