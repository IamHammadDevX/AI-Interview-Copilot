/**
 * Tests for InterimTranscript component rendering.
 *
 * Verifies:
 *   1. Placeholder shown when no content
 *   2. Finalized lines rendered correctly
 *   3. Interim text shown in italic
 *   4. Word count calculation
 *   5. Streaming indicator dot
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import InterimTranscript from "../components/InterimTranscript";
import type { FinalizedLine } from "../hooks/useInterviewerProxyTranscription";

// Mock @/lib/utils since it uses tailwind-merge
vi.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("InterimTranscript", () => {
  it("shows placeholder when no content", () => {
    render(
      <InterimTranscript
        finalizedLines={[]}
        interimText=""
        streaming={false}
      />
    );
    expect(
      screen.getByText(/Start system audio capture/i)
    ).toBeInTheDocument();
  });

  it("renders finalized lines", () => {
    const lines: FinalizedLine[] = [
      { text: "Tell me about yourself.", ts: 1000 },
      { text: "What are your strengths?", ts: 2000 },
    ];
    render(
      <InterimTranscript
        finalizedLines={lines}
        interimText=""
        streaming={true}
      />
    );
    expect(screen.getByText("Tell me about yourself.")).toBeInTheDocument();
    expect(screen.getByText("What are your strengths?")).toBeInTheDocument();
  });

  it("renders interim text in italic", () => {
    render(
      <InterimTranscript
        finalizedLines={[]}
        interimText="What is your experi..."
        streaming={true}
      />
    );
    const interim = screen.getByText("What is your experi...");
    expect(interim).toBeInTheDocument();
    // The interim text should have italic class
    expect(interim.className).toContain("italic");
  });

  it("shows both finalized and interim text", () => {
    const lines: FinalizedLine[] = [
      { text: "First question here.", ts: 1000 },
    ];
    render(
      <InterimTranscript
        finalizedLines={lines}
        interimText="Second question parti..."
        streaming={true}
      />
    );
    expect(screen.getByText("First question here.")).toBeInTheDocument();
    expect(screen.getByText("Second question parti...")).toBeInTheDocument();
  });

  it("displays correct word count", () => {
    const lines: FinalizedLine[] = [
      { text: "Tell me about yourself", ts: 1000 }, // 4 words
      { text: "What are your strengths", ts: 2000 }, // 4 words
    ];
    render(
      <InterimTranscript
        finalizedLines={lines}
        interimText="How do you" // 3 words
        streaming={true}
      />
    );
    // 4 + 4 + 3 = 11 words
    expect(screen.getByText("11 words")).toBeInTheDocument();
  });

  it("shows word count of 0 as dash", () => {
    render(
      <InterimTranscript
        finalizedLines={[]}
        interimText=""
        streaming={false}
      />
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows 'Interviewer' label", () => {
    render(
      <InterimTranscript
        finalizedLines={[]}
        interimText=""
        streaming={false}
      />
    );
    expect(screen.getByText("Interviewer")).toBeInTheDocument();
  });

  it("has streaming pulse indicator when streaming=true", () => {
    const { container } = render(
      <InterimTranscript
        finalizedLines={[]}
        interimText=""
        streaming={true}
      />
    );
    // The streaming dot should have animate-pulse class
    const dot = container.querySelector(".animate-pulse");
    expect(dot).not.toBeNull();
  });

  it("no pulse indicator when streaming=false", () => {
    const { container } = render(
      <InterimTranscript
        finalizedLines={[]}
        interimText=""
        streaming={false}
      />
    );
    const dot = container.querySelector(".animate-pulse");
    expect(dot).toBeNull();
  });

  it("does not show placeholder when there is content", () => {
    render(
      <InterimTranscript
        finalizedLines={[{ text: "Hello", ts: 1 }]}
        interimText=""
        streaming={true}
      />
    );
    expect(
      screen.queryByText(/Start system audio capture/i)
    ).not.toBeInTheDocument();
  });
});
