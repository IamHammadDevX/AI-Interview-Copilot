import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import CreateProjectForm from './CreateProjectForm'

export default async function ProjectsList() {
  const supabase = createSupabaseServerClient()
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id,name,description,created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  if (!projects?.length) {
    return (
      <Card className="sm:col-span-2 lg:col-span-3">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="rounded-[calc(var(--radius)-2px)] bg-primary/10 text-primary w-12 h-12 flex items-center justify-center">
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
                <div className="text-sm text-muted-foreground mt-1 max-w-xl">
                  Create a workspace to organize documents and keep your interview context tidy.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <CreateProjectForm />
              <Button asChild variant="outline">
                <Link href="/dashboard/prompt">Open prompt</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <Link
          key={p.id}
          href={`/dashboard/projects/${p.id}`}
          className="group rounded-[var(--radius)] border border-border bg-card shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="p-5">
            <h2 className="text-base sm:text-lg font-semibold leading-tight tracking-tight">
              {p.name}
            </h2>
            {p.description && (
              <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
                {p.description}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Created {new Date(p.created_at).toLocaleDateString()}</span>
              <span className="opacity-70 group-hover:opacity-100">Open →</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
