import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getOpenRouterKey(): string {
  const key = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "Missing OpenRouter API key. Set OPEN_ROUTER_API_KEY (recommended) or OPENROUTER_API_KEY in server env."
    );
  }
  return key;
}

function getFastChatModel(): string {
  return (
    process.env.OPENROUTER_FAST_MODEL ||
    process.env.OPENROUTER_CHAT_MODEL ||
    "openai/gpt-4o-mini"
  );
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

  const body = await req
    .json()
    .catch((): null => null) as null | { question?: string };
  const question = body?.question?.trim();

  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const key = getOpenRouterKey();
  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: getFastChatModel(),
      stream: true,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an interview copilot. Answer concisely and confidently. Use bullet points when helpful.",
        },
        { role: "user", content: question },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `OpenRouter stream failed (${upstream.status}): ${text}` },
      { status: 500 }
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
