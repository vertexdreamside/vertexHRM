"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-gradient p-6">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="rounded-2xl bg-white/15 p-4 shadow-lg backdrop-blur-md">
            <Image src="/vertexhrm-logo-reversed.svg" alt="vertexhrm" width={180} height={54} priority />
          </div>
          <p className="mt-4 text-sm text-white/80">
            Vertex HRM - a product of <span className="font-medium">VERTEX</span>
          </p>
        </div>

        <div className="rounded-2xl bg-white/95 p-8 shadow-xl backdrop-blur">
          <h1 className="font-display text-2xl font-medium text-ink">Sign in</h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm text-ink focus:border-brand-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm text-ink focus:border-brand-500"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-state-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-state-success py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
