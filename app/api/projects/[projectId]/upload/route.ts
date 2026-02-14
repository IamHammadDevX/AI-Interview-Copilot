import { assertCanAddDocument, DocumentLimitError } from "@/lib/documents/limits";
import { ingestUploadedDocument } from "@/lib/rag/ingest";
import { getSupportedDocumentType } from "@/lib/rag/extract";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180);
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
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
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
    return NextResponse.json(
      { success: false, error: projectErr.message },
      { status: 500 }
    );
  }

  if (!project || project.user_id !== user.id) {
    return NextResponse.json(
      { success: false, error: "Project not found" },
      { status: 404 }
    );
  }

  try {
    await assertCanAddDocument(projectId);
  } catch (e: any) {
    if (e instanceof DocumentLimitError) {
      return NextResponse.json(
        { success: false, error: e.message, code: e.code },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to validate limits" },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "Missing file" },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "File too large (max 10MB)" },
      { status: 400 }
    );
  }

  const supported = getSupportedDocumentType(file.name, file.type);
  if (!supported) {
    return NextResponse.json(
      { success: false, error: "Unsupported file type" },
      { status: 400 }
    );
  }

  const { data: docRow, error: insertErr } = await supabase
    .from("documents")
    .insert({
      project_id: projectId,
      user_id: user.id,
      file_name: file.name,
      file_path: "",
      mime_type: file.type || null,
      size_bytes: file.size,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (insertErr || !docRow) {
    return NextResponse.json(
      { success: false, error: insertErr?.message ?? "Failed to create document" },
      { status: 500 }
    );
  }

  const documentId = docRow.id as string;
  const safeName = sanitizeFileName(file.name);
  const objectPath = `${user.id}/${projectId}/${documentId}/${safeName}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from("project-documents")
    .upload(objectPath, bytes, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadErr) {
    await supabase
      .from("documents")
      .update({ status: "error", error: uploadErr.message })
      .eq("id", documentId);

    return NextResponse.json(
      { success: false, error: uploadErr.message },
      { status: 500 }
    );
  }

  const { error: updateErr } = await supabase
    .from("documents")
    .update({ file_path: objectPath, status: "processing" })
    .eq("id", documentId);

  if (updateErr) {
    return NextResponse.json(
      { success: false, error: updateErr.message },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const sync = url.searchParams.get("sync") === "1";

  const job = ingestUploadedDocument({
    documentId,
    projectId,
    userId: user.id,
    fileName: file.name,
    mimeType: file.type || null,
    buffer: bytes,
    storeExtractedText: true,
  });

  if (sync) {
    await job;
  } else {
    job.catch(() => {
      /* status persisted in DB */
    });
  }

  return NextResponse.json({ success: true, documentId });
}

