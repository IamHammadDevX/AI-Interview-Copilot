import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100/80 backdrop-blur shadow-sm sticky top-0 z-50">
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
        <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-base-100 px-4 py-2 shadow-sm">
              <span className="badge badge-primary badge-sm" />
              <span className="text-sm opacity-80">
                Secure multi-user SaaS foundation
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Your private, real-time interview copilot — built like a SaaS.
            </h1>

            <p className="text-base sm:text-lg opacity-80 leading-relaxed">
              Sign in to access your dashboard and open the interview panel. All
              protected routes are gated by server-side session validation.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              {user ? (
                <>
                  <Link className="btn btn-primary" href="/panel">
                    Launch Panel
                  </Link>
                  <Link className="btn btn-outline" href="/dashboard/projects">
                    Manage Projects
                  </Link>
                </>
              ) : (
                <>
                  <Link className="btn btn-primary" href="/signup">
                    Create account
                  </Link>
                  <Link className="btn btn-outline" href="/login">
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-4">
                  <div className="font-semibold">Auth + RLS</div>
                  <div className="text-sm opacity-70">
                    Supabase Auth with row-level security.
                  </div>
                </div>
              </div>
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-4">
                  <div className="font-semibold">Projects</div>
                  <div className="text-sm opacity-70">
                    Organize prep by projects and documents.
                  </div>
                </div>
              </div>
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-4">
                  <div className="font-semibold">Protected Panel</div>
                  <div className="text-sm opacity-70">
                    Panel never renders without a session.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <h2 className="card-title">Quick Start</h2>
              <ol className="steps steps-vertical">
                <li className="step step-primary">Create an account</li>
                <li className="step step-primary">Create your first project</li>
                <li className="step step-primary">Open the panel</li>
              </ol>
              <div className="pt-4 text-sm opacity-70">
                Need to edit the system prompt? Use Dashboard → Prompt.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
