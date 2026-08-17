"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail, Lock, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "That email or password isn't right - try again."
          : error.message
      );
      return;
    }

    if (data.user) {
      const { data: sessionRow } = await supabase
        .from("user_sessions")
        .insert({ user_id: data.user.id, device_info: navigator.userAgent })
        .select("id")
        .single();
      if (sessionRow) {
        sessionStorage.setItem("vertexhrm_session_row_id", sessionRow.id);
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - brand/background, hidden below md so the form is
          never pushed off-screen on a phone. */}
      <div
        className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-cover bg-center p-10 text-white md:flex"
        style={{ backgroundImage: "url(/login-background.png)" }}
      >
        <div className="absolute inset-0 bg-ink/55" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="rounded-2xl bg-white/15 p-4 shadow-lg backdrop-blur-md">
            <Image src="/vertexhrm-logo-reversed.svg" alt="vertexhrm" width={180} height={54} priority />
          </div>
          <h1 className="mt-6 font-display text-3xl font-medium">Vertex HRM</h1>
          <div className="mx-auto mt-2 h-0.5 w-16 bg-gradient-to-r from-brand-500 to-sky-400" />
          <p className="mt-4 max-w-xs text-sm text-white/80">All your HR and admin, in one place.</p>

          <p className="mt-10 flex items-center gap-1.5 text-xs text-white/60">
            <ShieldCheck size={13} /> Data encrypted in transit and at rest
          </p>
          <p className="mt-8 text-xs text-white/50">
            Vertex HRM - A product of <span className="font-medium text-white/70">Databytes</span>
          </p>
        </div>
      </div>

      {/* Right panel - sign in. */}
      <div className="flex w-full flex-col items-center justify-center bg-surface-subtle p-6 md:w-1/2">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
          {mode === "signin" ? (
            <>
              <h1 className="font-display text-2xl font-medium text-ink">Sign In</h1>
              <p className="mt-1 text-sm text-ink-muted">Enter your credentials to access the system.</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                    Username or Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full rounded-md border border-surface-border py-2.5 pl-9 pr-3 text-sm text-ink focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wide text-ink-soft">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setMode("reset"); setError(null); }}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                    <input
                      id="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-md border border-surface-border py-2.5 pl-9 pr-3 text-sm text-ink focus:border-brand-500"
                    />
                  </div>
                </div>

                {error && (
                  <p role="alert" className="text-sm text-state-danger">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-gradient py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <Lock size={15} /> {loading ? "Signing in..." : "Sign In to Vertex HRM"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-medium text-ink">Reset your password</h1>
              <p className="mt-1 text-sm text-ink-muted">Enter your email and we&apos;ll send a reset link.</p>

              {resetSent ? (
                <div className="mt-6 rounded-md bg-state-successBg p-4 text-sm text-state-success">
                  If an account exists for that email, a reset link is on its way.
                </div>
              ) : (
                <form onSubmit={handleReset} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-ink">Email</label>
                    <div className="relative">
                      <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                      <input
                        id="reset-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border border-surface-border py-2 pl-9 pr-3 text-sm text-ink focus:border-brand-500"
                      />
                    </div>
                  </div>
                  {error && <p role="alert" className="text-sm text-state-danger">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full rounded-md bg-state-success py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60">
                    {loading ? "Sending..." : "Send reset link"}
                  </button>
                </form>
              )}

              <button
                onClick={() => { setMode("signin"); setResetSent(false); setError(null); }}
                className="mt-4 text-sm font-medium text-brand-700 hover:underline"
              >
                &larr; Back to sign in
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-soft">
          Vertex HRM v0.1
        </p>
      </div>
    </div>
  );
}
