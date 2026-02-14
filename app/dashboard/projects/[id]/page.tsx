import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import ProjectDetailForm from "../ui/ProjectDetailForm";

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
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Project</h1>
      <ProjectDetailForm project={project} />
    </div>
  );
}

