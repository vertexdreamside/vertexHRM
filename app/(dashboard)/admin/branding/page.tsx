"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload, RotateCcw, Eye, UploadCloud } from "lucide-react";
import type { BrandingSettings } from "@/lib/types";

// Defaults match the CSS custom properties in globals.css, which in turn
// match your uploaded logo files — this is the "factory" state Reset to
// Default returns to.
const DEFAULTS: BrandingSettings = {
  primaryColor: "#27272a",
  primaryFontColor: "#18181b",
  primaryGradientColor1: "#09090b",
  logoUrl: "/vertexhrm-logo-primary.svg",
  loginBannerUrl: null,
  socialPreviewEnabled: true
};

function applyToDocument(settings: BrandingSettings) {
  const root = document.documentElement;
  root.style.setProperty("--brand-start", settings.primaryColor);
  root.style.setProperty("--brand-end", settings.primaryGradientColor1);
  root.style.setProperty("--brand-ink", settings.primaryFontColor);
}

export default function BrandingPage() {
  const [settings, setSettings] = useState<BrandingSettings>(DEFAULTS);
  const [logoPreview, setLogoPreview] = useState<string | null>(DEFAULTS.logoUrl);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [publishedNote, setPublishedNote] = useState<string | null>(null);

  function handlePreview() {
    applyToDocument(settings);
    setPublishedNote("Previewing — not saved yet. Refresh to discard.");
  }

  function handlePublish() {
    applyToDocument(settings);
    setPublishedNote("Published.");
    setTimeout(() => setPublishedNote(null), 2000);
    // TODO(supabase): upsert into `branding_settings` (single row, same
    // pattern as organization_profile). Also: this only applies the
    // change in the current browser tab — making it stick for every
    // visitor means the root layout needs to fetch branding_settings
    // server-side and set these same CSS custom properties via an
    // inline <style> tag before first paint, so there's no flash of
    // default colors. Not wired yet.
  }

  function handleReset() {
    setSettings(DEFAULTS);
    setLogoPreview(DEFAULTS.logoUrl);
    setBannerPreview(null);
    applyToDocument(DEFAULTS);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert("Logo must be under 1MB.");
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
    // TODO(supabase): upload to Storage bucket `branding`, store the
    // resulting public URL in branding_settings.logo_url.
  }

  function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert("Login banner must be under 1MB.");
      return;
    }
    setBannerPreview(URL.createObjectURL(file));
    // TODO(supabase): same as logo, different Storage path.
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink">
        Corporate Branding
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Colors, logo, and login banner. Preview applies changes to this
        browser tab only — Publish is what makes it permanent (once wired
        to Supabase).
      </p>

      {/* Theme Colors */}
      <section className="mt-6 rounded-card border border-surface-border bg-white p-6">
        <h2 className="font-display text-base font-medium text-ink">
          Theme colors
        </h2>
        <div className="mt-4 space-y-4">
          <ColorField
            label="Primary Color *"
            value={settings.primaryColor}
            onChange={(v) => setSettings((s) => ({ ...s, primaryColor: v }))}
          />
          <ColorField
            label="Primary Font Color *"
            value={settings.primaryFontColor}
            onChange={(v) =>
              setSettings((s) => ({ ...s, primaryFontColor: v }))
            }
          />
          <ColorField
            label="Primary Gradient Color 1 *"
            value={settings.primaryGradientColor1}
            onChange={(v) =>
              setSettings((s) => ({ ...s, primaryGradientColor1: v }))
            }
          />
        </div>

        <div
          className="mt-4 flex h-16 items-center justify-center rounded-md text-sm font-medium text-white"
          style={{
            background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.primaryGradientColor1})`
          }}
        >
          Gradient preview
        </div>
      </section>

      {/* Client Logo */}
      <section className="mt-6 rounded-card border border-surface-border bg-white p-6">
        <h2 className="font-display text-base font-medium text-ink">
          Client logo
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          JPG, PNG, GIF, or SVG — up to 1MB. Recommended 50×50px.
        </p>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-surface-border bg-surface-subtle">
            {logoPreview && (
              <Image src={logoPreview} alt="" width={48} height={48} unoptimized />
            )}
          </div>
          <label
            htmlFor="logo"
            className="flex cursor-pointer items-center gap-2 rounded-md border border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
          >
            <Upload size={14} /> Browse
          </label>
          <input
            id="logo"
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.svg"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
      </section>

      {/* Login Banner */}
      <section className="mt-6 rounded-card border border-surface-border bg-white p-6">
        <h2 className="font-display text-base font-medium text-ink">
          Login banner
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          JPG, PNG, GIF, or SVG — up to 1MB.
        </p>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex h-16 w-28 items-center justify-center rounded-md border border-dashed border-surface-border bg-surface-subtle text-xs text-ink-soft">
            {bannerPreview ? (
              <Image src={bannerPreview} alt="" width={112} height={64} unoptimized className="rounded-md object-cover" />
            ) : (
              "No banner set"
            )}
          </div>
          <label
            htmlFor="banner"
            className="flex cursor-pointer items-center gap-2 rounded-md border border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
          >
            <Upload size={14} /> Browse
          </label>
          <input
            id="banner"
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.svg"
            className="hidden"
            onChange={handleBannerUpload}
          />
        </div>
      </section>

      {/* Social Media Preview */}
      <section className="mt-6 rounded-card border border-surface-border bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-medium text-ink">
              Social media preview image
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              Use the branded logo/colors when this site is shared as a
              link preview.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.socialPreviewEnabled}
            onClick={() =>
              setSettings((s) => ({
                ...s,
                socialPreviewEnabled: !s.socialPreviewEnabled
              }))
            }
            className={`h-6 w-11 rounded-full transition-colors ${
              settings.socialPreviewEnabled ? "bg-brand-gradient" : "bg-surface-border"
            }`}
          >
            <span
              className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${
                settings.socialPreviewEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
        >
          <RotateCcw size={14} /> Reset to default
        </button>
        <button
          onClick={handlePreview}
          className="flex items-center gap-2 rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle"
        >
          <Eye size={14} /> Preview
        </button>
        <button
          onClick={handlePublish}
          className="flex items-center gap-2 rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <UploadCloud size={14} /> Publish
        </button>
        {publishedNote && (
          <span className="text-sm text-state-success">{publishedNote}</span>
        )}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 cursor-pointer rounded border border-surface-border"
        aria-label={label}
      />
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-ink">
          {label}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-surface-border px-3 py-1.5 text-sm font-mono focus:border-brand-500"
        />
      </div>
    </div>
  );
}
