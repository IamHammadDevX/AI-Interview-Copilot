"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function CheckEmailClient({ email }: { email: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    if (!email) return;
    setIsSending(true);
    setError(null);
    setSent(false);

    const { error } = await supabase.auth.resend({ type: "signup", email });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setIsSending(false);
  };

  return (
    <div className="min-h-screen">
      <div className="navbar bg-base-100/70 backdrop-blur border-b border-base-300 sticky top-0 z-50">
        <div className="flex-1">
          <Link className="btn btn-ghost text-xl" href="/">
            AI Interview Copilot
          </Link>
        </div>
      </div>

      <main className="px-4 py-10">
        <div className="max-w-xl mx-auto card bg-base-100/80 backdrop-blur shadow-xl border border-base-300 overflow-hidden rounded-3xl">
          <div className="bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] px-6 py-7">
            <h1 className="text-2xl font-bold text-white">Confirm your email</h1>
            <p className="text-white/90 text-sm mt-1">
              Open the link we sent to finish setting up your account.
            </p>
          </div>

          <div className="card-body space-y-3">
            <p className="opacity-80">
              We sent a confirmation link to{" "}
              <span className="font-semibold">{email || "your email"}</span>.
              Open it to activate your account, then you’ll be signed in.
            </p>

            <div className="alert">
              <span className="text-sm">
                Add this Redirect URL in Supabase Auth settings:
                <span className="font-semibold"> http://localhost:3000/auth/callback</span>
              </span>
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}
            {sent && (
              <div className="alert alert-success">
                <span>Confirmation email re-sent.</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                className="btn btn-primary"
                onClick={resend}
                disabled={isSending || !email}
              >
                {isSending ? "Sending..." : "Resend email"}
              </button>
              <Link className="btn btn-outline" href="/login">
                Back to login
              </Link>
            </div>

            {!email && (
              <div className="text-sm opacity-70">
                If you don’t see an email, go back and sign up again so we know
                which address to resend to.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
