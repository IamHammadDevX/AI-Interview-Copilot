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

async function openRouterChat(user: string) {
  const key = getOpenRouterKey();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: getChatModel(),
      temperature: 0.4,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
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

  const body = (await req.json().catch(() => null)) as null | { question?: string };
  const question = body?.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  try {
    const answer = await openRouterChat(question);
    return NextResponse.json({ answer, source: "base-ai", confidence: "low" });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "AI failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

