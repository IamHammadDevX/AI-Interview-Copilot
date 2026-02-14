import { createSupabaseServerClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'

const PanelClient = dynamic(() => import('./ui/PanelClient'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 lg:h-[420px] rounded-[var(--radius)] border border-border bg-card/60 animate-pulse" />
        <div className="h-[640px] rounded-[var(--radius)] border border-border bg-card/60 animate-pulse" />
      </div>
    </div>
  ),
})

export default async function PanelPage({
  searchParams,
}: {
  searchParams: { projectId?: string };
}) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/panel')

  const requestedProjectId = searchParams.projectId

  if (!requestedProjectId) {
    const { data: latestProject } = await supabase
      .from('projects')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latestProject?.id) {
      redirect('/dashboard/projects')
    }

    redirect(`/panel?projectId=${encodeURIComponent(latestProject.id)}`)
  }

  return <PanelClient projectId={requestedProjectId} />
}
