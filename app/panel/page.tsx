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

export default async function PanelPage() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <PanelClient />
}

