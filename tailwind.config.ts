import type { Config } from "tailwindcss";

// Brand tokens sourced directly from the Vertex HRM logo files
// (vertexhrm-logo-primary.svg): gradient #2f3fd9 -> #7b3fd9, wordmark #17172b.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "var(--brand-start, #27272a)",
          600: "#3f3f46",
          700: "#27272a",
          800: "var(--brand-end, #09090b)",
          900: "#09090b"
        },
        ink: {
          DEFAULT: "var(--brand-ink, #17172b)",
          muted: "#4a4a63",
          soft: "#7b7b93"
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f6f6fb",
          border: "#e4e4f0"
        },
        state: {
          success: "#1a8a5f",
          successBg: "#e6f7ef",
          warning: "#b3790c",
          warningBg: "#fdf3e1",
          danger: "#c23a3a",
          dangerBg: "#fbeaea"
        }
      },
      fontFamily: {
        display: ["var(--font-poppins)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"]
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, var(--brand-start, #2f3fd9) 0%, var(--brand-end, #7b3fd9) 100%)"
      },
      borderRadius: {
        card: "12px"
      }
    }
  },
  plugins: []
};

export default config;
