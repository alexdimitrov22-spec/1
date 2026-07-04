import type { Config } from "tailwindcss";

/**
 * Revio design tokens.
 * Palette: near-white surfaces, cool neutral greys, a single confident emerald
 * accent, and an ink that is a very dark desaturated green so accent + text
 * feel of the same family. Radii are generous; shadows are soft and low.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.25rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        ink: "#0C0F0E", // near-black text / dark surfaces
        surface: "#FFFFFF",
        muted: {
          DEFAULT: "#F5F6F5", // page background wash
          fg: "#61706A", // secondary text
        },
        line: "#E7E9E8", // hairline borders
        accent: {
          DEFAULT: "#0B7A54", // emerald
          hover: "#0A6B4A",
          soft: "#E8F4EF", // tinted background for accent chips
          fg: "#FFFFFF",
        },
        warn: "#B4530A",
        danger: "#B42318",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(12,15,14,0.04), 0 8px 24px rgba(12,15,14,0.06)",
        pop: "0 12px 40px rgba(12,15,14,0.12)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { "fade-up": "fade-up 0.4s ease-out both" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
