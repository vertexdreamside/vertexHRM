"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Upload, RotateCcw, Eye, UploadCloud, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BrandingSettings } from "@/lib/types";

// Defaults match the CSS custom properties in globals.css, which in turn
// match your uploaded logo files — this is the "factory" state Reset to
// Default returns to.
const DEFAULTS: BrandingSettings = {
  primaryColor: "#2f3fd9",
  primaryFontColor: "#18181b",
  primaryGradientColor1: "#7b3fd9",
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
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BrandingSettings>(DEFAULTS);
  const [logoPreview, setLogoPreview] = useState<string | null>(DEFAULTS.logoUrl);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedNote, setPublishedNote] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("branding_settings").select("*").eq("id", true).single();
    if (data) {
      const loaded: BrandingSettings = {
        primaryColor: data.primary_color,
        primaryFontColor: data.primary_font_color,
        primaryGradientColor1: data.primary_gradient_color_1,
        logoUrl: data.logo_url ?? DEFAULTS.logoUrl,
        loginBannerUrl: data.login_banner_url,
        socialPreviewEnabled: data.social_preview_enabled
      };
      setSettings(loaded);
      setLogoPreview(loaded.logoUrl);
      setBannerPreview(loaded.loginBannerUrl);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePreview() {
    applyToDocument(settings);
    setPublishedNote("Previewing in this browser only — not saved yet.");
  }

  async function handlePublish() {
    setPublishing(true);
    applyToDocument(settings);

    const { error } = await supabase
      .from("branding_settings")
      .update({
        primary_color: settings.primaryColor,
        primary_font_color: settings.primaryFontColor,
        primary_gradient_color_1: settings.primaryGradientColor1,
        logo_url: settings.logoUrl,
        login_banner_url: settings.loginBannerUrl,
        social_preview_enabled: settings.socialPreviewEnabled,
        updated_at: new Date().toISOString()
      })
      .eq("id", true);

    setPublishing(false);
    if (error) {
      setPublishedNote(`Couldn't publish: ${error.message}`);
      return;
    }
    setPublishedNote("Published — everyone sees this on their next page load.");
    setTimeout(() => setPublishedNote(null), 4000);
  }

  function handleReset() {
    setSettings(DEFAULTS);
    setLogoPreview(DEFAULTS.logoUrl);
    setBannerPreview(null);
    applyToDocument(DEFAULTS);
  }

  async function uploadToStorage(file: File, prefix: string): Promise<string | null> {
    const path = `${prefix}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) {
      alert(`Upload failed: ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert("Logo must be under 1MB.");
      return;
    }
    setUploadingLogo(true);
    const url = await uploadToStorage(file, "logo");
    setUploadingLogo(false);
    if (url) {
      setLogoPreview(url);
      setSettings((s) => ({ ...s, logoUrl: url }));
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert("Login banner must be under 1MB.");
      return;
    }
    setUploadingBanner(true);
    const url = await uploadToStorage(file, "banner");
    setUploadingBanner(false);
    if (url) {
      setBannerPreview(url);
      setSettings((s) => ({ ...s, loginBannerUrl: url }));
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 py-16 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink">Corporate Branding</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Colors, logo, and login banner — live from Supabase. Preview applies to this browser only; Publish makes it permanent for everyone.
      </p>

      <section className="mt-6 rounded-card border border-surface-border bg-white p-6">
        <h2 className="font-display text-base font-medium text-ink">Theme colors</h2>
        <div className="mt-4 space-y-4">
          <ColorField label="Primary Color *" value={settings.primaryColor} onChange={(v) => setSettings((s) => ({ ...s, primaryColor: v }))} />
          <ColorField label="Primary Font Color *" value={settings.primaryFontColor} onChange={(v) => setSettings((s) => ({ ...s, primaryFontColor: v }))} />
          <ColorField label="Primary Gradient Color 1 *" value={settings.primaryGradientColor1} onChange={(v) => setSettings((s) => ({ ...s, primaryGradientColor1: v }))} />
        </div>
        <div
          className="mt-4 flex h-16 items-center justify-center rounded-md text-sm font-medium text-white"
          style={{ background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.primaryGradientColor1})` }}
        >
          Gradient preview
        </div>
      </section>

      <section className="mt-6 rounded-card border border-surface-border bg-white p-6">
        <h2 className="font-display text-base font-medium text-ink">Client logo</h2>
        <p className="mt-1 text-xs text-ink-soft">JPG, PNG, GIF, or SVG — up to 1MB. Recommended 50×50px.</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-surface-border bg-surface-subtle">
            {uploadingLogo ? <Loader2 size={18} className="animate-spin text-ink-soft" /> : logoPreview && (
              <Image src={logoPreview} alt="" width={48} height={48} unoptimized />
            )}
          </div>
          <label htmlFor="logo" className="flex cursor-pointer items-center gap-2 rounded-md border border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
            <Upload size={14} /> Browse
          </label>
          <input id="logo" type="file" accept=".jpg,.jpeg,.png,.gif,.svg" className="hidden" onChange={handleLogoUpload} />
        </div>
      </section>

      <section className="mt-6 rounded-card border border-surface-border bg-white p-6">
        <h2 className="font-display text-base font-medium text-ink">Login banner</h2>
        <p className="mt-1 text-xs text-ink-soft">JPG, PNG, GIF, or SVG — up to 1MB.</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex h-16 w-28 items-center justify-center rounded-md border border-dashed border-surface-border bg-surface-subtle text-xs text-ink-soft">
            {uploadingBanner ? <Loader2 size={18} className="animate-spin text-ink-soft" /> : bannerPreview ? (
              <Image src={bannerPreview} alt="" width={112} height={64} unoptimized className="rounded-md object-cover" />
            ) : "No banner set"}
          </div>
          <label htmlFor="banner" className="flex cursor-pointer items-center gap-2 rounded-md border border-surface-border px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
            <Upload size={14} /> Browse
          </label>
          <input id="banner" type="file" accept=".jpg,.jpeg,.png,.gif,.svg" className="hidden" onChange={handleBannerUpload} />
        </div>
      </section>

      <section className="mt-6 rounded-card border border-surface-border bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-medium text-ink">Social media preview image</h2>
            <p className="mt-1 text-xs text-ink-soft">Use the branded logo/colors when this site is shared as a link preview.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.socialPreviewEnabled}
            onClick={() => setSettings((s) => ({ ...s, socialPreviewEnabled: !s.socialPreviewEnabled }))}
            className={`h-6 w-11 rounded-full transition-colors ${settings.socialPreviewEnabled ? "bg-brand-gradient" : "bg-surface-border"}`}
          >
            <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${settings.socialPreviewEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </section>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={handleReset} className="flex items-center gap-2 rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
          <RotateCcw size={14} /> Reset to default
        </button>
        <button onClick={handlePreview} className="flex items-center gap-2 rounded-md border border-surface-border px-4 py-2 text-sm text-ink-muted hover:bg-surface-subtle">
          <Eye size={14} /> Preview
        </button>
        <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 rounded-md bg-state-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
          {publishing ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} Publish
        </button>
        {publishedNote && <span className="text-sm text-state-success">{publishedNote}</span>}
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-9 cursor-pointer rounded border border-surface-border" aria-label={label} />
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-surface-border px-3 py-1.5 text-sm font-mono focus:border-brand-500" />
      </div>
    </div>
  );
}
