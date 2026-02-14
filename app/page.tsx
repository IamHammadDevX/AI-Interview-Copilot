import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <div className="navbar bg-base-100/70 backdrop-blur border-b border-base-300 sticky top-0 z-50">
        <div className="flex-1">
          <Link className="btn btn-ghost text-xl" href="/">
            AI Interview Copilot
          </Link>
        </div>
        <div className="flex-none gap-2">
          {user ? (
            <>
              <Link className="btn btn-ghost btn-sm" href="/dashboard/projects">
                Dashboard
              </Link>
              <Link className="btn btn-primary btn-sm" href="/panel">
                Open Panel
              </Link>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm" href="/login">
                Login
              </Link>
              <Link className="btn btn-primary btn-sm" href="/signup">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      <main className="px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="card bg-base-100/80 backdrop-blur border border-base-300 shadow-xl overflow-hidden rounded-3xl">
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
                      <Link className="btn btn-primary" href="/dashboard/projects">
                        Go to dashboard
                      </Link>
                      <Link className="btn btn-outline border-white/40 text-white hover:bg-white/10" href="/panel">
                        Open panel
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link className="btn btn-primary" href="/signup">
                        Create account
                      </Link>
                      <Link className="btn btn-outline border-white/40 text-white hover:bg-white/10" href="/login">
                        Sign in
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-10 py-8">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
                  <div className="font-semibold">Projects</div>
                  <div className="text-sm opacity-70 mt-1">
                    Keep prep organized into focused workspaces.
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
                  <div className="font-semibold">Prompt control</div>
                  <div className="text-sm opacity-70 mt-1">
                    Tune the assistant voice per your workflow.
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
                  <div className="font-semibold">Secure by default</div>
                  <div className="text-sm opacity-70 mt-1">
                    Auth-gated routes with per-user isolation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
