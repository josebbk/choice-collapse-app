import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core green design system — used for backgrounds, primary actions, and accents.
        brand: {
          50: "#f1faf3",
          100: "#dcf3e2",
          200: "#b8e6c7",
          300: "#88d1a3",
          400: "#57b67c",
          500: "#349960",
          600: "#25794c",
          700: "#1f6140",
          800: "#1c4d35",
          900: "#18402d",
          950: "#0a2419",
        },
        // Neutral surface tones with a faint green cast, so panels read as part of the
        // same family instead of a generic gray dropped on top of a green accent.
        surface: {
          50: "#f6f8f6",
          100: "#eaf0ea",
          800: "#12201a",
          900: "#0c1712",
          950: "#070f0b",
        },
        // Distinct badge accent for the nav-bar wordmark — contrasts with the green surfaces.
        badge: {
          DEFAULT: "#eab308",
          fg: "#1c1503",
        },
      },
      keyframes: {
        "flame-flicker": {
          "0%, 100%": { transform: "translateY(0) scale(1)", opacity: "0.55" },
          "50%": { transform: "translateY(-3px) scale(1.08)", opacity: "0.9" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(52,153,96,0)" },
          "50%": { boxShadow: "0 0 24px 4px rgba(52,153,96,0.35)" },
        },
      },
      animation: {
        "flame-flicker": "flame-flicker 1.1s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
