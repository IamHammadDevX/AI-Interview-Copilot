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
    <div className="min-h-screen">
      <div className="navbar bg-base-100/70 backdrop-blur border-b border-base-300 sticky top-0 z-50">
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
          <div className="card bg-base-100/80 backdrop-blur border border-base-300 shadow-xl overflow-hidden rounded-3xl">
            <div className="bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] px-6 py-7">
              <div className="flex items-center gap-4">
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
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {isSignup ? "Create account" : "Welcome back"}
                  </h1>
                  <p className="text-white/90 text-sm mt-1">
                    {isSignup
                      ? "Create your workspace and start preparing."
                      : "Sign in to continue to your dashboard."}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-body">
              <form action={formAction} className="space-y-3">
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

          <div className="card bg-base-100/80 backdrop-blur border border-base-300 shadow-xl rounded-3xl">
            <div className="card-body">
              <h2 className="text-lg font-semibold">What you get</h2>
              <div className="mt-2 grid gap-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
                  <div className="font-semibold">Protected routes</div>
                  <div className="text-sm opacity-70 mt-1">
                    Dashboard and panel are server-side gated by session.
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
                  <div className="font-semibold">Per-user isolation</div>
                  <div className="text-sm opacity-70 mt-1">
                    RLS prevents cross-user access by default.
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
                  <div className="font-semibold">Modern responsive UI</div>
                  <div className="text-sm opacity-70 mt-1">
                    Clean layout that adapts to light/dark backgrounds.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
