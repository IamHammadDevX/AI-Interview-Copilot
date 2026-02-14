import { searchSimilarChunks } from "@/lib/rag/search";
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

  const primary = await searchSimilarChunks(projectId, question, {
    minSimilarity: 0.75,
  });

  if (primary.length > 0) {
    return NextResponse.json({ matches: primary, confidence: "high" });
  }

  const secondary = await searchSimilarChunks(projectId, question, {
    minSimilarity: 0.65,
  });

  if (secondary.length > 0) {
    return NextResponse.json({ matches: secondary, confidence: "medium" });
  }

  return NextResponse.json({ matches: [], confidence: "low" });
}

