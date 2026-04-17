import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium warm neutral palette — off-white, sand, stone
        brand: {
          50:  "#FAF7F2",
          100: "#F2EAD8",
          200: "#E4D3B4",
          300: "#CEAF7F",
          400: "#B8905C",
          500: "#8B7355",  // Primary CTA — warm brown
          600: "#6B5840",
          700: "#4E3F2B",
          800: "#362B1C",
          900: "#251E12",
          950: "#140F08",
        },
        surface: {
          DEFAULT: "#F7F4EF",  // Warm ivory — page background
          1: "#F0EBE3",         // Warm sand
          2: "#E9E2D9",         // Deeper sand
          3: "#E1D9CE",         // Warm stone
          4: "#D6CEBF",         // Medium stone
        },
        ink: "#1A1714",         // Near-black for text on light backgrounds
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-cal-sans)", "var(--font-inter)", "sans-serif"],
      },
      animation: {
        "fade-in":        "fadeIn 0.3s ease-in-out",
        "slide-up":       "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-slow":     "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer":        "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn:       { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp:      { "0%": { transform: "translateY(20px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        slideInRight: { "0%": { transform: "translateX(20px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        shimmer:      { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
    },
  },
  plugins: [],
};

export default config;
