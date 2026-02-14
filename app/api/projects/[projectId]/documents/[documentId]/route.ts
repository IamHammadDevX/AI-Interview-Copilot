import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: { projectId: string; documentId: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, documentId } = ctx.params;

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

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("id,status,error")
    .eq("id", documentId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (docErr) {
    return NextResponse.json({ error: docErr.message }, { status: 500 });
  }

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: doc.id,
    status: doc.status,
    error: doc.error,
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: { projectId: string; documentId: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, documentId } = ctx.params;

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

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select("id,file_path,status")
    .eq("id", documentId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (docErr) {
    return NextResponse.json({ error: docErr.message }, { status: 500 });
  }

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (doc.status === "processing") {
    return NextResponse.json(
      { error: "Document is processing. Please wait until it finishes." },
      { status: 409 }
    );
  }

  await supabase.from("embeddings").delete().eq("document_id", documentId);

  if (doc.file_path) {
    const prefix = `${user.id}/${projectId}/${documentId}`;

    const { data: listed } = await supabase.storage
      .from("project-documents")
      .list(prefix, { limit: 100 });

    const toRemove = (listed ?? []).map((o) => `${prefix}/${o.name}`);
    if (toRemove.length) {
      await supabase.storage.from("project-documents").remove(toRemove);
    }

    await supabase.storage.from("project-documents").remove([doc.file_path]);
  }

  const { error: delErr } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("project_id", projectId);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
