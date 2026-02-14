import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import CreateProjectForm from "./ui/CreateProjectForm";

export default async function ProjectsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id,name,description,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error.message}</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Projects
          </h1>
          <p className="text-sm sm:text-base opacity-70 mt-1 max-w-2xl">
            Create sleek workspaces for interview prep. Your data is protected
            per user.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <CreateProjectForm />
          <Link className="btn btn-primary" href="/panel">
            Open panel
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(projects ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/projects/${p.id}`}
            className="group card bg-base-100 shadow-sm hover:shadow-md transition-all border border-base-300 hover:-translate-y-0.5 rounded-2xl"
          >
            <div className="card-body">
              <h2 className="card-title text-base sm:text-lg leading-tight">
                {p.name}
              </h2>
              {p.description && (
                <p className="text-sm opacity-80 line-clamp-3">{p.description}</p>
              )}
              <div className="mt-2 flex items-center justify-between text-xs opacity-60">
                <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
                <span className="link link-hover opacity-70 group-hover:opacity-100">
                  Open →
                </span>
              </div>
            </div>
          </Link>
        ))}
        {!projects?.length && (
          <div className="card bg-base-100 border border-base-300 shadow-sm sm:col-span-2 lg:col-span-3 rounded-2xl">
            <div className="card-body">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 text-primary w-12 h-12 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-6 w-6"
                    >
                      <path d="M3 6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1h6a2 2 0 0 1 2 2v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V6Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">No projects yet</div>
                    <div className="text-sm opacity-70 mt-1 max-w-xl">
                      Create a workspace to organize documents and keep your interview context tidy.
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <CreateProjectForm />
                  <Link className="btn btn-outline" href="/dashboard/prompt">
                    Open prompt
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
