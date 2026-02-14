"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <Link className="font-semibold tracking-tight" href="/">
            AI Interview Copilot
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </header>

      <main className="px-4 py-10">
        <Card className="max-w-xl mx-auto bg-card/80 backdrop-blur shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] px-6 py-7">
            <h1 className="text-2xl font-bold text-white">Confirm your email</h1>
            <p className="text-white/90 text-sm mt-1">
              Open the link we sent to finish setting up your account.
            </p>
          </div>

          <CardContent className="p-6 space-y-4">
            <p className="text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-semibold">{email || "your email"}</span>.
              Open it to activate your account, then you’ll be signed in.
            </p>

            <Alert>
              <AlertTitle>Supabase redirect URL</AlertTitle>
              <AlertDescription>
                Add this Redirect URL in Supabase Auth settings:
                <span className="font-semibold"> http://localhost:3000/auth/callback</span>
              </AlertDescription>
            </Alert>

            {error && (
              <Alert className="border-destructive/30">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {sent && (
              <Alert className="border-primary/30">
                <AlertDescription>Confirmation email re-sent.</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={resend} disabled={isSending || !email}>
                {isSending ? "Sending..." : "Resend email"}
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Back to login</Link>
              </Button>
            </div>

            {!email && (
              <div className="text-sm text-muted-foreground">
                If you don’t see an email, go back and sign up again so we know
                which address to resend to.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
