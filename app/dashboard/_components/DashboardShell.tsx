import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { logoutAction } from '../actions'

function SidebarLink({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[calc(var(--radius)-6px)] px-3 py-2 text-sm font-medium text-foreground/90 hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

export default function DashboardShell({
  userEmail,
  children,
}: {
  userEmail: string | null
  children: ReactNode
}) {
  return (
    <div className="min-h-screen">
      <input id="dash-nav" type="checkbox" className="peer hidden" />

      <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label
              htmlFor="dash-nav"
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-[calc(var(--radius)-6px)] border border-border bg-background hover:bg-accent transition-colors cursor-pointer"
              aria-label="Open navigation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </label>

            <Link
              className="text-base sm:text-lg font-semibold tracking-tight"
              href="/dashboard/projects"
            >
              Copilot<span className="text-muted-foreground font-normal hidden sm:inline"> Workspace</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/panel">Open panel</Link>
            </Button>

            <details className="relative">
              <summary className="list-none cursor-pointer inline-flex items-center justify-center rounded-[calc(var(--radius)-6px)] border border-border bg-background hover:bg-accent transition-colors h-9 w-9">
                <div className="rounded-full w-9 h-9 bg-gradient-to-br from-[#FF6B00] to-[#FFA63D] p-[2px]">
                  <div className="rounded-full w-full h-full bg-background flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">
                      {(userEmail ?? 'U').slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                </div>
              </summary>

              <div className="absolute right-0 mt-3 w-64 rounded-[var(--radius)] border border-border bg-popover p-2 shadow-xl">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground truncate">
                  {userEmail ?? 'Account'}
                </div>
                <div className="sm:hidden px-2 py-1">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/panel">Open panel</Link>
                  </Button>
                </div>
                <div className="h-px bg-border my-2" />
                <form action={logoutAction} className="px-2 py-1">
                  <Button
                    type="submit"
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:bg-destructive/10"
                  >
                    Logout
                  </Button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>

      <label
        htmlFor="dash-nav"
        className="fixed inset-0 z-40 bg-black/40 opacity-0 pointer-events-none peer-checked:opacity-100 peer-checked:pointer-events-auto transition-opacity lg:hidden"
      />

      <div className="mx-auto max-w-7xl flex">
        <aside className="fixed inset-y-0 left-0 z-50 w-72 -translate-x-full peer-checked:translate-x-0 transition-transform duration-200 bg-background/85 backdrop-blur border-r border-border lg:static lg:translate-x-0">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <Link
                href="/dashboard/projects"
                className="text-lg font-semibold tracking-tight"
              >
                Copilot
              </Link>
              <Badge variant="outline">SaaS</Badge>
            </div>

            <div className="mt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground px-2">
                Navigation
              </div>
              <nav className="mt-2 grid gap-1">
                <SidebarLink
                  href="/dashboard/projects"
                  label="Projects"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path d="M4 6a2 2 0 0 1 2-2h3a1 1 0 0 1 1 1v1h8a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6Z" />
                    </svg>
                  }
                />
                <SidebarLink
                  href="/dashboard/prompt"
                  label="Prompt"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path d="M7 4a3 3 0 0 0-3 3v9a4 4 0 0 0 4 4h5.586a2 2 0 0 0 1.414-.586l3.414-3.414A2 2 0 0 0 19 14.586V7a3 3 0 0 0-3-3H7Zm10 10.586L13.586 18H8a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v7.586Z" />
                    </svg>
                  }
                />
              </nav>
            </div>

            <div className="mt-4">
              <Button asChild className="w-full">
                <Link href="/panel">Open panel</Link>
              </Button>
            </div>

            <div className="mt-6 rounded-[var(--radius)] border border-border bg-card/60 p-4">
              <div className="text-xs text-muted-foreground">Signed in as</div>
              <div className="text-sm font-semibold truncate mt-1">
                {userEmail ?? 'Account'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Secure session</div>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-4 md:px-6 py-6 min-w-0">{children}</main>
      </div>
    </div>
  )
}

