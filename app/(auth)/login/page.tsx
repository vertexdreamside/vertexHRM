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
          ? "That email or password isn't right — try again."
          : error.message
      );
      return;
    }

    // Real Active Sessions log (Configuration §5.9) — one row per
    // login, device info from the browser's own user agent string.
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
    <div className="flex min-h-screen">
      {/* Brand panel — hidden on small screens */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <Image
          src="/login-background.webp"
          alt=""
          fill
          priority
          className="object-cover"
          aria-hidden="true"
        />
        {/* Subtle dark wash so white text stays legible over every part
            of the image, whichever color happens to sit underneath. */}
        <div className="absolute inset-0 bg-black/25" aria-hidden="true" />

        <div className="relative z-10">
          {/* Frosted glass card behind the logo so it "pops" regardless
              of what color of the background sits behind it, rather
              than relying on the reversed (white) mark having enough
              contrast on its own against a busy multi-color image. */}
          <div className="inline-block rounded-2xl bg-white/15 p-5 shadow-lg backdrop-blur-md">
            <Image
              src="/vertexhrm-logo-reversed.svg"
              alt="vertexhrm"
              width={220}
              height={66}
              priority
            />
          </div>
        </div>

        <p className="relative z-10 max-w-sm font-display text-2xl font-medium leading-snug drop-shadow-sm">
          HR, admin, and operations for the whole organization — in one
          place.
        </p>

        <p className="relative z-10 text-sm text-white/80 drop-shadow-sm">
          Vertex HRM &mdash; a product of <span className="font-medium">VERTEX</span>
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Image
            src="/vertexhrm-icon-gradient.svg"
            alt=""
            width={40}
            height={40}
            className="mb-6 lg:hidden"
            aria-hidden="true"
          />

          <h1 className="font-display text-2xl font-medium text-ink">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Use the account your administrator set up for you.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-ink"
              >
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
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-ink"
              >
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
              className="w-full rounded-md bg-brand-gradient py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
