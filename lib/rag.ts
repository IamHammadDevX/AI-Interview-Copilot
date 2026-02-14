import "server-only";

import { searchSimilarChunks } from "@/lib/rag/search";

export type RagSource = "document" | "internet" | "base-ai";
export type RagConfidence = "high" | "medium" | "low";

export type RagResult = {
  answer: string;
  source: RagSource;
  confidence: RagConfidence;
  metadata?: {
    matchedChunks?: string[];
    similarityScores?: number[];
  };
};

function getOpenRouterKey() {
  const key = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "Missing OpenRouter API key. Set OPEN_ROUTER_API_KEY (recommended) or OPENROUTER_API_KEY in server env."
    );
  }
  return key;
}

function getChatModel() {
  return process.env.OPENROUTER_CHAT_MODEL || "openai/gpt-4o-mini";
}

async function openRouterChat(params: {
  system: string;
  user: string;
  temperature?: number;
}) {
  const key = getOpenRouterKey();

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: getChatModel(),
      temperature: params.temperature ?? 0.2,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter chat failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenRouter chat returned invalid payload.");
  }
  return content.trim();
}

async function internetFallback(question: string): Promise<string | null> {
  void question;
  return null;
}

export async function generateAnswer(
  projectId: string,
  question: string
): Promise<RagResult> {
  const matches = await searchSimilarChunks(projectId, question);

  if (matches.length > 0) {
    const context = matches
      .map(
        (m, i) =>
          `Chunk ${i + 1} (similarity ${m.similarity.toFixed(3)}):\n${m.content}`
      )
      .join("\n\n---\n\n");

    const answer = await openRouterChat({
      system:
        "Answer ONLY using the provided context. If the context does not contain the answer, reply with: \"I don't know based on the provided documents.\"",
      user: `Context:\n${context}\n\nQuestion:\n${question}`,
      temperature: 0.1,
    });

    return {
      answer,
      source: "document",
      confidence: "high",
      metadata: {
        matchedChunks: matches.map((m) => m.content),
        similarityScores: matches.map((m) => m.similarity),
      },
    };
  }

  const web = await internetFallback(question);
  if (web) {
    return {
      answer: web,
      source: "internet",
      confidence: "medium",
    };
  }

  const answer = await openRouterChat({
    system: "You are a helpful assistant.",
    user: question,
    temperature: 0.4,
  });

  return {
    answer,
    source: "base-ai",
    confidence: "low",
  };
}
