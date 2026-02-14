import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

async function openRouterChat(system: string, user: string) {
  const key = getOpenRouterKey();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: getChatModel(),
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter chat failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Invalid chat response");
  return content.trim();
}

export async function POST(
  req: Request,
  ctx: { params: { projectId: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = ctx.params.projectId;
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id,user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectErr) {
    return NextResponse.json({ error: projectErr.message }, { status: 500 });
  }

  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as null | {
    question?: string;
    matches?: Array<{ content: string; similarity: number }>;
    confidence?: "high" | "medium" | "low";
  };

  const question = body?.question?.trim();
  const matches = body?.matches ?? [];
  const confidence = body?.confidence ?? "high";

  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  if (matches.length === 0) {
    return NextResponse.json({ error: "Missing matches" }, { status: 400 });
  }

  const context = matches
    .slice(0, 5)
    .map(
      (m, i) =>
        `Chunk ${i + 1} (similarity ${m.similarity.toFixed(3)}):\n${m.content}`
    )
    .join("\n\n---\n\n");

  try {
    const answer = await openRouterChat(
      "Answer ONLY using the provided context. If the context does not contain the answer, reply with: \"I don't know based on the provided documents.\"",
      `Context:\n${context}\n\nQuestion:\n${question}`
    );

    return NextResponse.json({
      answer,
      source: "document",
      confidence,
      metadata: {
        matchedChunks: matches.map((m) => m.content),
        similarityScores: matches.map((m) => m.similarity),
      },
    });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "RAG failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

