import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F2EEE5",
        cream: "#E9E3D6",
        ink: "#141312",
        graphite: "#2A2724",
        muted: "#8C857A",
        blood: "#B4261E",
        redacted: "#0F0E0D",
        accent: "#C8541C",
        ok: "#1E5128",
      },
      fontFamily: {
        display: ['"Canela", "GT Sectra", "Tiempos Headline", Georgia, serif'],
        serif: ['"Tiempos Text", "Source Serif Pro", Georgia, serif'],
        mono: ['"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace'],
        sans: ['"Inter Tight", ui-sans-serif, system-ui'],
      },
      fontSize: {
        "display-1": ["clamp(4rem, 12vw, 11rem)", { lineHeight: "0.92", letterSpacing: "-0.045em" }],
        "display-2": ["clamp(2.5rem, 6vw, 5rem)", { lineHeight: "0.95", letterSpacing: "-0.035em" }],
        "eyebrow": ["0.68rem", { lineHeight: "1", letterSpacing: "0.22em" }],
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        tick: {
          "0%, 90%, 100%": { transform: "scaleY(1)" },
          "45%": { transform: "scaleY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.4s ease-in-out infinite",
        scan: "scan 6s linear infinite",
        marquee: "marquee 40s linear infinite",
        tick: "tick 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
