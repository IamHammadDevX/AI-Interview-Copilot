import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ProjectDetailForm from "../ui/ProjectDetailForm";
import ProjectDocumentsSection from "../ui/ProjectDocumentsSection";

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id,name,description,created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !project) notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider opacity-60">Project</div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-sm sm:text-base opacity-70 mt-1 max-w-2xl">
              {project.description}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            href={`/panel?projectId=${encodeURIComponent(project.id)}`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Open panel
          </Link>
        </div>
      </div>
      <ProjectDetailForm project={project} />
      <ProjectDocumentsSection projectId={project.id} />
    </div>
  );
}
