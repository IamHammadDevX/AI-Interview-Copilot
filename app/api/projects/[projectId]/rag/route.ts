import { generateAnswer } from "@/lib/rag";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: { projectId: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
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
  };

  const question = body?.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  try {
    const result = await generateAnswer(projectId, question);
    return NextResponse.json(result);
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "RAG failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

