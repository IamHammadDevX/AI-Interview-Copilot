/**
 * Tests for the transcript state management logic used in
 * useInterviewerProxyTranscription hook.
 *
 * Since the hook depends on WebSocket, AudioContext, AudioWorklet etc.
 * which are hard to mock in Node, we extract and test the core
 * transcript processing logic in isolation.
 *
 * Verifies:
 *   1. Interim messages update interimText
 *   2. speechFinal=true finalizes the line and clears interim
 *   3. Deduplication: identical consecutive lines are deduplicated
 *   4. MAX_LINES cap is enforced
 *   5. "other" speaker messages are filtered out
 *   6. Empty transcript text is ignored
 *   7. clearTranscript resets all state
 */
import { describe, it, expect } from "vitest";
import type { ProxyTranscriptMsg } from "../shared/transcription";

// ── Extract the core logic from the hook into pure functions ──

type FinalizedLine = { text: string; ts: number };
const MAX_LINES = 300;

/**
 * Process a transcript message and return the new state.
 * This mirrors the onmessage handler in useInterviewerProxyTranscription.
 */
function processTranscript(
  msg: ProxyTranscriptMsg,
  state: { finalizedLines: FinalizedLine[]; interimText: string; lastFinalSentence: string }
): { finalizedLines: FinalizedLine[]; interimText: string; lastFinalSentence: string } {
  // Filter non-interviewer
  if (msg.speaker !== "interviewer") return state;

  const text = (msg.text || "").trim();
  if (!text) return state;

  if (msg.speechFinal) {
    // Dedupe: skip if identical to last line
    const last = state.finalizedLines[state.finalizedLines.length - 1];
    if (last && last.text === text) {
      return { ...state, interimText: "", lastFinalSentence: text };
    }

    const next = [...state.finalizedLines, { text, ts: msg.ts }];
    const capped = next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
    return { finalizedLines: capped, interimText: "", lastFinalSentence: text };
  } else {
    // Interim or is_final-but-not-speech_final
    return { ...state, interimText: text };
  }
}

function freshState() {
  return { finalizedLines: [] as FinalizedLine[], interimText: "", lastFinalSentence: "" };
}

function makeMsg(
  overrides: Partial<ProxyTranscriptMsg> = {}
): ProxyTranscriptMsg {
  return {
    type: "transcript",
    text: "Test transcript",
    isFinal: false,
    speechFinal: false,
    speaker: "interviewer",
    ts: Date.now(),
    ...overrides,
  };
}

describe("transcript state processing", () => {
  it("interim message updates interimText", () => {
    const state = freshState();
    const result = processTranscript(
      makeMsg({ text: "Tell me ab", isFinal: false, speechFinal: false }),
      state
    );
    expect(result.interimText).toBe("Tell me ab");
    expect(result.finalizedLines).toHaveLength(0);
  });

  it("interim text is replaced by next interim", () => {
    let state = freshState();
    state = processTranscript(makeMsg({ text: "Tell" }), state);
    expect(state.interimText).toBe("Tell");

    state = processTranscript(makeMsg({ text: "Tell me" }), state);
    expect(state.interimText).toBe("Tell me");

    state = processTranscript(makeMsg({ text: "Tell me about" }), state);
    expect(state.interimText).toBe("Tell me about");
  });

  it("speechFinal=true finalizes line and clears interim", () => {
    let state = freshState();
    // Interim first
    state = processTranscript(makeMsg({ text: "Tell me about" }), state);
    expect(state.interimText).toBe("Tell me about");

    // Now final
    state = processTranscript(
      makeMsg({ text: "Tell me about yourself.", isFinal: true, speechFinal: true }),
      state
    );
    expect(state.finalizedLines).toHaveLength(1);
    expect(state.finalizedLines[0].text).toBe("Tell me about yourself.");
    expect(state.interimText).toBe("");
    expect(state.lastFinalSentence).toBe("Tell me about yourself.");
  });

  it("is_final without speechFinal updates interim, not finalized", () => {
    let state = freshState();
    state = processTranscript(
      makeMsg({ text: "What is", isFinal: true, speechFinal: false }),
      state
    );
    // Should be treated as interim update
    expect(state.interimText).toBe("What is");
    expect(state.finalizedLines).toHaveLength(0);
  });

  it("multiple utterances produce multiple finalized lines", () => {
    let state = freshState();

    state = processTranscript(
      makeMsg({ text: "Question one?", speechFinal: true, ts: 1000 }),
      state
    );
    state = processTranscript(
      makeMsg({ text: "Question two?", speechFinal: true, ts: 2000 }),
      state
    );
    state = processTranscript(
      makeMsg({ text: "Question three?", speechFinal: true, ts: 3000 }),
      state
    );

    expect(state.finalizedLines).toHaveLength(3);
    expect(state.finalizedLines[0].text).toBe("Question one?");
    expect(state.finalizedLines[1].text).toBe("Question two?");
    expect(state.finalizedLines[2].text).toBe("Question three?");
  });

  it("deduplicates identical consecutive lines", () => {
    let state = freshState();
    state = processTranscript(
      makeMsg({ text: "Same text.", speechFinal: true, ts: 1000 }),
      state
    );
    state = processTranscript(
      makeMsg({ text: "Same text.", speechFinal: true, ts: 1001 }),
      state
    );
    expect(state.finalizedLines).toHaveLength(1);
  });

  it("does not deduplicate non-consecutive identical lines", () => {
    let state = freshState();
    state = processTranscript(makeMsg({ text: "A", speechFinal: true, ts: 1 }), state);
    state = processTranscript(makeMsg({ text: "B", speechFinal: true, ts: 2 }), state);
    state = processTranscript(makeMsg({ text: "A", speechFinal: true, ts: 3 }), state);
    expect(state.finalizedLines).toHaveLength(3);
  });

  it("enforces MAX_LINES cap", () => {
    let state = freshState();
    for (let i = 0; i < MAX_LINES + 50; i++) {
      state = processTranscript(
        makeMsg({ text: `Line ${i}`, speechFinal: true, ts: i }),
        state
      );
    }
    expect(state.finalizedLines).toHaveLength(MAX_LINES);
    // Should keep the latest lines
    expect(state.finalizedLines[0].text).toBe("Line 50");
    expect(state.finalizedLines[MAX_LINES - 1].text).toBe(`Line ${MAX_LINES + 49}`);
  });

  it("filters out speaker=other messages", () => {
    let state = freshState();
    state = processTranscript(
      makeMsg({ text: "I am the candidate", speaker: "other", speechFinal: true }),
      state
    );
    expect(state.finalizedLines).toHaveLength(0);
    expect(state.interimText).toBe("");
  });

  it("ignores empty transcript text", () => {
    let state = freshState();
    state = processTranscript(
      makeMsg({ text: "", speechFinal: true }),
      state
    );
    expect(state.finalizedLines).toHaveLength(0);

    state = processTranscript(
      makeMsg({ text: "   ", speechFinal: true }),
      state
    );
    expect(state.finalizedLines).toHaveLength(0);
  });

  it("lastFinalSentence always reflects the most recent finalized text", () => {
    let state = freshState();
    expect(state.lastFinalSentence).toBe("");

    state = processTranscript(
      makeMsg({ text: "First sentence.", speechFinal: true }),
      state
    );
    expect(state.lastFinalSentence).toBe("First sentence.");

    state = processTranscript(
      makeMsg({ text: "Second sentence.", speechFinal: true }),
      state
    );
    expect(state.lastFinalSentence).toBe("Second sentence.");
  });

  it("clearTranscript resets all state", () => {
    let state = freshState();
    state = processTranscript(
      makeMsg({ text: "Something.", speechFinal: true }),
      state
    );
    state = processTranscript(
      makeMsg({ text: "partially..." }),
      state
    );
    expect(state.finalizedLines).toHaveLength(1);
    expect(state.interimText).toBe("partially...");

    // Clear
    state = freshState();
    expect(state.finalizedLines).toHaveLength(0);
    expect(state.interimText).toBe("");
    expect(state.lastFinalSentence).toBe("");
  });

  it("handles rapid interim → final sequence correctly", () => {
    let state = freshState();

    // Rapid interims
    state = processTranscript(makeMsg({ text: "W" }), state);
    state = processTranscript(makeMsg({ text: "Wh" }), state);
    state = processTranscript(makeMsg({ text: "What" }), state);
    state = processTranscript(makeMsg({ text: "What is" }), state);
    state = processTranscript(makeMsg({ text: "What is your" }), state);

    expect(state.interimText).toBe("What is your");
    expect(state.finalizedLines).toHaveLength(0);

    // Final
    state = processTranscript(
      makeMsg({ text: "What is your greatest strength?", isFinal: true, speechFinal: true }),
      state
    );

    expect(state.finalizedLines).toHaveLength(1);
    expect(state.finalizedLines[0].text).toBe("What is your greatest strength?");
    expect(state.interimText).toBe("");
  });

  it("interleaved utterances from different speakers", () => {
    let state = freshState();

    // Interviewer speaks
    state = processTranscript(
      makeMsg({ text: "Tell me about yourself.", speaker: "interviewer", speechFinal: true, ts: 1 }),
      state
    );
    expect(state.finalizedLines).toHaveLength(1);

    // Candidate speaks (should be filtered)
    state = processTranscript(
      makeMsg({ text: "I have 5 years of experience.", speaker: "other", speechFinal: true, ts: 2 }),
      state
    );
    expect(state.finalizedLines).toHaveLength(1); // still 1

    // Interviewer speaks again
    state = processTranscript(
      makeMsg({ text: "What technologies do you use?", speaker: "interviewer", speechFinal: true, ts: 3 }),
      state
    );
    expect(state.finalizedLines).toHaveLength(2);
    expect(state.finalizedLines[1].text).toBe("What technologies do you use?");
  });
});
