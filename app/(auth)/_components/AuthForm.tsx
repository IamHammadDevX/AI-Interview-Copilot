"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { AuthActionState, loginAction } from "../actions";

type AuthAction = typeof loginAction;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="btn btn-primary w-full"
      disabled={pending}
    >
      {pending ? "Loading..." : label}
    </button>
  );
}

export default function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup";
  action: AuthAction;
}) {
  const [state, formAction] = useFormState<AuthActionState, FormData>(
    action,
    null
  );

  const isSignup = mode === "signup";

  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100/80 backdrop-blur shadow-sm sticky top-0 z-50">
        <div className="flex-1">
          <Link className="btn btn-ghost text-xl" href="/">
            AI Interview Copilot
          </Link>
        </div>
        <div className="flex-none">
          <Link className="btn btn-ghost btn-sm" href="/">
            Home
          </Link>
        </div>
      </div>

      <div className="px-4 py-10">
        <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-2 items-stretch">
          <div className="card bg-base-100 shadow-lg border border-base-300">
            <div className="card-body">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-base-200 px-3 py-1.5 text-sm">
                  <span className="badge badge-primary badge-sm" />
                  <span className="opacity-80">Secure access</span>
                </div>
                <h1 className="text-3xl font-bold">
                  {isSignup ? "Create your account" : "Sign in"}
                </h1>
                <p className="opacity-80">
                  {isSignup
                    ? "Get access to your dashboard and the protected interview panel."
                    : "Welcome back. Continue where you left off."}
                </p>
              </div>

              <form action={formAction} className="space-y-3 mt-4">
                {isSignup && (
                  <label className="form-control w-full">
                    <div className="label">
                      <span className="label-text">Full name</span>
                    </div>
                    <input
                      name="full_name"
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Jane Doe"
                      autoComplete="name"
                    />
                  </label>
                )}

                <label className="form-control w-full">
                  <div className="label">
                    <span className="label-text">Email</span>
                  </div>
                  <input
                    name="email"
                    type="email"
                    className="input input-bordered w-full"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="form-control w-full">
                  <div className="label">
                    <span className="label-text">Password</span>
                  </div>
                  <input
                    name="password"
                    type="password"
                    className="input input-bordered w-full"
                    placeholder="••••••••"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    required
                  />
                </label>

                {state?.error && (
                  <div className="alert alert-error">
                    <span>{state.error}</span>
                  </div>
                )}

                <SubmitButton label={isSignup ? "Create account" : "Sign in"} />
              </form>

              <div className="text-sm opacity-80">
                {isSignup ? (
                  <span>
                    Already have an account?{" "}
                    <Link className="link link-primary" href="/login">
                      Sign in
                    </Link>
                  </span>
                ) : (
                  <span>
                    New here?{" "}
                    <Link className="link link-primary" href="/signup">
                      Create an account
                    </Link>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg border border-base-300">
            <div className="card-body">
              <h2 className="card-title">What you get</h2>
              <div className="grid gap-3">
                <div className="flex items-start gap-3">
                  <div className="badge badge-primary badge-sm mt-1" />
                  <div>
                    <div className="font-semibold">Protected routes</div>
                    <div className="text-sm opacity-70">
                      Panel and dashboard are server-side gated by session.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="badge badge-primary badge-sm mt-1" />
                  <div>
                    <div className="font-semibold">Per-user data isolation</div>
                    <div className="text-sm opacity-70">
                      Supabase RLS prevents cross-user access.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="badge badge-primary badge-sm mt-1" />
                  <div>
                    <div className="font-semibold">Responsive UI</div>
                    <div className="text-sm opacity-70">
                      Works cleanly on mobile, tablet, and desktop.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4">
                <div className="alert">
                  <span className="text-sm">
                    Tip: After signing in, go to Dashboard → Prompt to set the
                    assistant behavior.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
