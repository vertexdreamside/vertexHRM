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
          50: "#eef0fd",
          100: "#d6d9fa",
          200: "#adb3f5",
          300: "#848ceb",
          400: "#5d63e0",
          500: "#2f3fd9", // logo gradient start
          600: "#4a3ed6",
          700: "#5f3fd8",
          800: "#7b3fd9", // logo gradient end
          900: "#4c2589"
        },
        ink: {
          DEFAULT: "#17172b", // wordmark color
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
        "brand-gradient": "linear-gradient(135deg, #2f3fd9 0%, #7b3fd9 100%)"
      },
      borderRadius: {
        card: "12px"
      }
    }
  },
  plugins: []
};

export default config;
