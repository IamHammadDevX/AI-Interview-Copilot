import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import CreateProjectForm from "./ui/CreateProjectForm";
import ProjectsList from "./ui/ProjectsList";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ProjectsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
          <Button asChild>
            <Link href="/panel">Open panel</Link>
          </Button>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-[var(--radius)]" />
            ))}
          </div>
        }
      >
        <ProjectsList />
      </Suspense>
    </div>
  );
}
