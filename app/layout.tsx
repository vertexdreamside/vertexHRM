import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-poppins",
  display: "swap"
});

export const metadata: Metadata = {
  title: "vertexhrm",
  description: "HR, admin, and operations for the whole organization.",
  icons: {
    icon: "/favicon.ico"
  }
};

interface BrandingRow {
  primary_color: string;
  primary_font_color: string;
  primary_gradient_color_1: string;
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Fetches Corporate Branding (§4) server-side so every visitor gets
  // the org's actual theme colors before first paint — not just
  // whoever last clicked Publish in their own browser tab. This is
  // what makes branding_settings.update() from the admin screen
  // actually propagate platform-wide instead of only previewing
  // locally, which was a known gap until now.
  const supabase = await createClient();
  const { data: branding } = await supabase
    .from("branding_settings")
    .select("primary_color, primary_font_color, primary_gradient_color_1")
    .eq("id", true)
    .single<BrandingRow>();

  const brandStyle = branding
    ? ({
        "--brand-start": branding.primary_color,
        "--brand-end": branding.primary_gradient_color_1,
        "--brand-ink": branding.primary_font_color
      } as React.CSSProperties)
    : undefined;

  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} style={brandStyle}>
      <body>{children}</body>
    </html>
  );
}
