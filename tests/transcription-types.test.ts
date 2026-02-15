/**
 * Tests for shared/transcription.ts  — type contracts
 *
 * These tests verify that the ProxyTranscriptMsg, ProxyStatusMsg,
 * and related types are well-formed and have the expected shape.
 */
import { describe, it, expect } from "vitest";
import type {
  ProxyControlMsg,
  ProxyTranscriptMsg,
  ProxyStatusMsg,
  ProxyServerMsg,
} from "../shared/transcription";

describe("shared/transcription types", () => {
  it("ProxyControlMsg start message has required fields", () => {
    const msg: ProxyControlMsg = {
      type: "start",
      sampleRate: 16000,
      encoding: "linear16",
      chunkMs: 20,
    };
    expect(msg.type).toBe("start");
    expect(msg.sampleRate).toBe(16000);
    expect(msg.encoding).toBe("linear16");
    expect(msg.chunkMs).toBe(20);
  });

  it("ProxyControlMsg stop message", () => {
    const msg: ProxyControlMsg = {
      type: "stop",
      sampleRate: 16000,
      encoding: "linear16",
      chunkMs: 20,
    };
    expect(msg.type).toBe("stop");
  });

  it("ProxyTranscriptMsg has separate isFinal and speechFinal", () => {
    const msg: ProxyTranscriptMsg = {
      type: "transcript",
      text: "Hello world",
      isFinal: true,
      speechFinal: false,
      speaker: "interviewer",
      ts: Date.now(),
    };
    expect(msg.type).toBe("transcript");
    expect(msg.isFinal).toBe(true);
    expect(msg.speechFinal).toBe(false);
    expect(msg.speaker).toBe("interviewer");
    expect(msg.text).toBe("Hello world");
    expect(typeof msg.ts).toBe("number");
  });

  it("ProxyTranscriptMsg speechFinal=true represents end of utterance", () => {
    const msg: ProxyTranscriptMsg = {
      type: "transcript",
      text: "What is your greatest strength?",
      isFinal: true,
      speechFinal: true,
      speaker: "interviewer",
      ts: Date.now(),
    };
    expect(msg.speechFinal).toBe(true);
    expect(msg.isFinal).toBe(true);
  });

  it("ProxyTranscriptMsg can have speaker=other", () => {
    const msg: ProxyTranscriptMsg = {
      type: "transcript",
      text: "I think...",
      isFinal: false,
      speechFinal: false,
      speaker: "other",
      ts: Date.now(),
    };
    expect(msg.speaker).toBe("other");
  });

  it("ProxyStatusMsg states", () => {
    const states: ProxyStatusMsg["state"][] = [
      "connected",
      "streaming",
      "error",
      "closed",
    ];
    for (const state of states) {
      const msg: ProxyStatusMsg = { type: "status", state };
      expect(msg.type).toBe("status");
      expect(msg.state).toBe(state);
    }
  });

  it("ProxyStatusMsg error includes detail", () => {
    const msg: ProxyStatusMsg = {
      type: "status",
      state: "error",
      detail: "Missing DEEPGRAM_API_KEY",
    };
    expect(msg.detail).toBe("Missing DEEPGRAM_API_KEY");
  });

  it("ProxyServerMsg union discriminates on type field", () => {
    const transcript: ProxyServerMsg = {
      type: "transcript",
      text: "test",
      isFinal: false,
      speechFinal: false,
      speaker: "interviewer",
      ts: 1,
    };
    const status: ProxyServerMsg = {
      type: "status",
      state: "connected",
    };

    expect(transcript.type).toBe("transcript");
    expect(status.type).toBe("status");

    // Discriminated union check
    if (transcript.type === "transcript") {
      expect(transcript.text).toBe("test");
    }
    if (status.type === "status") {
      expect(status.state).toBe("connected");
    }
  });
});
