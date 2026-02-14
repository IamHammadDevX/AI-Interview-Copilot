import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProjectDocumentsUploader from "./ProjectDocumentsUploader";
import { unstable_noStore as noStore } from "next/cache";

export default async function ProjectDocumentsSection({
  projectId,
}: {
  projectId: string;
}) {
  noStore();
  const supabase = createSupabaseServerClient();

  const { data: docs, error } = await supabase
    .from("documents")
    .select("id,file_name,status,created_at,error")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card/70 p-4 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  return <ProjectDocumentsUploader projectId={projectId} initialDocuments={docs ?? []} />;
}
