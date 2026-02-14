import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export class DocumentLimitError extends Error {
  code = "project_document_limit_exceeded";
}

export async function assertCanAddDocument(projectId: string) {
  const supabase = createSupabaseServerClient();

  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (error) throw new Error(error.message);

  if ((count ?? 0) >= 10) {
    throw new DocumentLimitError("Each project can have at most 10 documents.");
  }
}

