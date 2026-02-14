import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <Link className="font-semibold tracking-tight" href="/">
            AI Interview Copilot
          </Link>
          <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/projects">Dashboard</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/panel">Open panel</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
          </div>
        </div>
      </header>

      <main className="px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <Card className="overflow-hidden bg-card/80 backdrop-blur">
            <div className="bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] px-6 sm:px-10 py-10">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-6 w-6 text-white"
                    >
                      <path d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2Z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                      AI Interview Copilot
                    </h1>
                    <p className="text-white/90 mt-1">
                      A clean, secure workspace for interview prep and real-time panel access.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  {user ? (
                    <>
                      <Button asChild>
                        <Link href="/dashboard/projects">Go to dashboard</Link>
                      </Button>
                      <Button asChild variant="outline" className="border-white/40 text-white hover:bg-white/10">
                        <Link href="/panel">Open panel</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild>
                        <Link href="/signup">Create account</Link>
                      </Button>
                      <Button asChild variant="outline" className="border-white/40 text-white hover:bg-white/10">
                        <Link href="/login">Sign in</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="px-6 sm:px-10 py-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[var(--radius)] border border-border bg-card p-5">
                  <div className="font-semibold">Projects</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Keep prep organized into focused workspaces.
                  </div>
                </div>
                <div className="rounded-[var(--radius)] border border-border bg-card p-5">
                  <div className="font-semibold">Prompt control</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Tune the assistant voice per your workflow.
                  </div>
                </div>
                <div className="rounded-[var(--radius)] border border-border bg-card p-5">
                  <div className="font-semibold">Secure by default</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Auth-gated routes with per-user isolation.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
