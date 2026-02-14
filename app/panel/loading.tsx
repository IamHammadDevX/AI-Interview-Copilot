import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 lg:h-[420px] rounded-[var(--radius)]" />
        <Skeleton className="h-[640px] rounded-[var(--radius)]" />
      </div>
    </div>
  )
}

