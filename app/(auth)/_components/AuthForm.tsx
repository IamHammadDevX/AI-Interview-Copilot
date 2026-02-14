"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { AuthActionState, loginAction } from "../actions";

type AuthAction = typeof loginAction;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Loading..." : label}
    </Button>
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
      <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <Link className="font-semibold tracking-tight" href="/">
            AI Interview Copilot
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </header>

      <div className="px-4 py-10">
        <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-2 items-stretch">
          <Card className="bg-card/80 backdrop-blur shadow-xl overflow-hidden">
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

            <CardContent className="p-6">
              <form action={formAction} className="space-y-4">
                {isSignup && (
                  <div className="grid gap-2">
                    <Label htmlFor="full_name">Full name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      placeholder="Jane Doe"
                      autoComplete="name"
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    required
                  />
                </div>

                {state?.error && (
                  <Alert className="border-destructive/30">
                    <AlertDescription>{state.error}</AlertDescription>
                  </Alert>
                )}

                <SubmitButton label={isSignup ? "Create account" : "Sign in"} />
              </form>

              <div className="text-sm text-muted-foreground">
                {isSignup ? (
                  <span>
                    Already have an account?{" "}
                    <Link className="text-primary hover:underline" href="/login">
                      Sign in
                    </Link>
                  </span>
                ) : (
                  <span>
                    New here?{" "}
                    <Link className="text-primary hover:underline" href="/signup">
                      Create an account
                    </Link>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold">What you get</h2>
              <div className="mt-2 grid gap-3">
                <div className="rounded-[var(--radius)] border border-border bg-card p-4">
                  <div className="font-semibold">Protected routes</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Dashboard and panel are server-side gated by session.
                  </div>
                </div>
                <div className="rounded-[var(--radius)] border border-border bg-card p-4">
                  <div className="font-semibold">Per-user isolation</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    RLS prevents cross-user access by default.
                  </div>
                </div>
                <div className="rounded-[var(--radius)] border border-border bg-card p-4">
                  <div className="font-semibold">Modern responsive UI</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Clean layout that adapts to light/dark backgrounds.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
