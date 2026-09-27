import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Core LEGO/Duolingo Claymorphism Palette ──
        "primary":         "#58CC02",  // Duolingo green → LEGO lime
        "primary-dark":    "#3C9A00",
        "secondary":       "#FF9600",  // Orange energy
        "tertiary":        "#8B5CF6",  // Purple accent
        "success":         "#22C55E",
        "error":           "#FF6B6B",
        "background":      "#FFF8F0",  // Warm off-white
        "surface":         "#FFFFFF",
        "surface-border":  "#F5EFE6",
        "text-primary":    "#2D2A26",
        "text-muted":      "#8B8578",
        "locked":          "#D1D5DB",

        // ── League System Colors ──
        "league-bronze":   "#CD7F32",
        "league-silver":   "#A8A9AD",
        "league-gold":     "#FFD700",
        "league-diamond":  "#60CBFF",

        // ── XP Bar Gradient ──
        "xp-start":        "#58CC02",
        "xp-end":          "#00D4AA",

        // ── Notification / Social Colors ──
        "notify-info":     "#3B82F6",
        "notify-success":  "#22C55E",
        "notify-warn":     "#F59E0B",

        // ── Legacy design-system tokens (kept for backward compat) ──
        "on-primary-fixed-variant": "#005321",
        "on-error":                 "#ffffff",
        "on-secondary-fixed":       "#2a1700",
        "tertiary-fixed":           "#d8e2ff",
        "on-primary-fixed":         "#002109",
        "on-tertiary-fixed":        "#001a42",
        "surface-container-high":   "#e2e7ff",
        "surface-variant":          "#dae2fd",
        "on-background":            "#131b2e",
        "on-surface-variant":       "#3d4a3d",
        "surface-dim":              "#d2d9f4",
        "secondary-container":      "#fea619",
        "outline-variant":          "#bccbb9",
        "on-tertiary":              "#ffffff",
        "inverse-surface":          "#283044",
        "on-secondary-container":   "#684000",
        "surface-container":        "#eaedff",
        "tertiary-container":       "#82abff",
        "on-surface":               "#131b2e",
        "on-secondary":             "#ffffff",
        "secondary-fixed":          "#ffddb8",
        "error-container":          "#ffdad6",
        "on-secondary-fixed-variant":"#653e00",
        "primary-fixed":            "#6bff8f",
        "surface-container-lowest": "#ffffff",
        "surface-bright":           "#faf8ff",
        "surface-container-low":    "#f2f3ff",
        "on-error-container":       "#93000a",
        "primary-fixed-dim":        "#4ae176",
        "on-tertiary-fixed-variant":"#004395",
        "primary-container":        "#22c55e",
        "on-primary":               "#ffffff",
        "surface-tint":             "#006e2f",
        "outline":                  "#6d7b6c",
        "inverse-primary":          "#4ae176",
        "secondary-fixed-dim":      "#ffb95f",
        "on-primary-container":     "#004b1e",
        "surface-container-highest":"#dae2fd",
        "tertiary-fixed-dim":       "#adc6ff",
        "on-tertiary-container":    "#003d88",
        "inverse-on-surface":       "#eef0ff",
      },

      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg":      "0.5rem",
        "xl":      "0.75rem",
        "2xl":     "1rem",
        "3xl":     "1.5rem",
        "4xl":     "2rem",
        "full":    "9999px",
      },

      fontFamily: {
        "headline-xl": ["var(--font-rubik)", "sans-serif"],
        "headline-lg": ["var(--font-rubik)", "sans-serif"],
        "headline-md": ["var(--font-rubik)", "sans-serif"],
        "label-lg":    ["var(--font-rubik)", "sans-serif"],
        "label-md":    ["var(--font-rubik)", "sans-serif"],
        "label-sm":    ["var(--font-rubik)", "sans-serif"],
        "body-lg":     ["var(--font-nunito-sans)", "sans-serif"],
        "body-md":     ["var(--font-nunito-sans)", "sans-serif"],
        "body-sm":     ["var(--font-nunito-sans)", "sans-serif"],
      },

      fontSize: {
        "headline-xl": ["2rem",    { lineHeight: "1.1", fontWeight: "800" }],
        "headline-lg": ["1.5rem",  { lineHeight: "1.2", fontWeight: "800" }],
        "headline-md": ["1.25rem", { lineHeight: "1.3", fontWeight: "700" }],
        "label-lg":    ["1rem",    { lineHeight: "1.4", fontWeight: "700" }],
        "label-md":    ["0.875rem",{ lineHeight: "1.4", fontWeight: "600" }],
        "label-sm":    ["0.75rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg":     ["1rem",    { lineHeight: "1.6" }],
        "body-md":     ["0.875rem",{ lineHeight: "1.6" }],
        "body-sm":     ["0.75rem", { lineHeight: "1.5" }],
      },

      boxShadow: {
        // ── Claymorphism Shadows (with inset highlight) ──
        "clay-primary":         "0 8px 24px rgba(88,204,2,0.35), inset 0 2px 4px rgba(255,255,255,0.4)",
        "clay-primary-pressed": "0 2px 8px rgba(88,204,2,0.2), inset 0 2px 8px rgba(88,204,2,0.15)",
        "clay-secondary":       "0 8px 24px rgba(255,150,0,0.35), inset 0 2px 4px rgba(255,255,255,0.4)",
        "clay-secondary-pressed":"0 2px 8px rgba(255,150,0,0.2), inset 0 2px 8px rgba(255,150,0,0.15)",
        "clay-tertiary":        "0 8px 24px rgba(139,92,246,0.35), inset 0 2px 4px rgba(255,255,255,0.4)",
        "clay-tertiary-pressed":"0 2px 8px rgba(139,92,246,0.2), inset 0 2px 8px rgba(139,92,246,0.15)",
        "clay-surface":         "0 8px 24px rgba(45,42,38,0.08), inset 0 2px 4px rgba(255,255,255,0.6)",
        "clay-surface-pressed": "0 2px 8px rgba(45,42,38,0.05), inset 0 2px 8px rgba(45,42,38,0.03)",
        "clay-success":         "0 8px 24px rgba(34,197,94,0.35), inset 0 2px 4px rgba(255,255,255,0.4)",
        "clay-error":           "0 8px 24px rgba(255,107,107,0.35), inset 0 2px 4px rgba(255,255,255,0.4)",
        // ── League Glows ──
        "glow-gold":            "0 0 24px rgba(255,200,0,0.55)",
        "glow-diamond":         "0 0 28px rgba(96,203,255,0.65)",
        // ── Legacy ──
        "subtle":               "0 1px 8px rgba(0,0,0,0.04)",
        "glow":                 "0 2px 0 0 #22c55e",
      },

      animation: {
        "pop-in":      "pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        "xp-pop":      "xp-pop 0.8s ease-out forwards",
        "fire":        "fire-flicker 0.5s ease-in-out infinite",
        "float":       "float 3s ease-in-out infinite",
        "slide-up":    "slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        "streak-ring": "streak-ring 1.5s ease-out infinite",
        "wiggle":      "wiggle 0.4s ease-in-out",
        "spin-slow":   "spin-slow 3s linear infinite",
        "shimmer":     "shimmer 1.5s infinite",
        "fill-bar":    "fill-bar 0.8s cubic-bezier(0.34,1.56,0.64,1) both",
      },

      keyframes: {
        "pop-in": {
          "0%":   { transform: "scale(0.8)", opacity: "0" },
          "70%":  { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "xp-pop": {
          "0%":   { transform: "translateY(0) scale(1)", opacity: "1" },
          "50%":  { transform: "translateY(-20px) scale(1.2)", opacity: "1" },
          "100%": { transform: "translateY(-40px) scale(0.8)", opacity: "0" },
        },
        "fire-flicker": {
          "0%, 100%": { transform: "scale(1) rotate(-2deg)" },
          "25%":      { transform: "scale(1.05) rotate(2deg)" },
          "50%":      { transform: "scale(0.98) rotate(-1deg)" },
          "75%":      { transform: "scale(1.03) rotate(1deg)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        "slide-up": {
          "0%":   { transform: "translateY(24px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "streak-ring": {
          "0%":   { boxShadow: "0 0 0 0 rgba(255,150,0,0.6)" },
          "70%":  { boxShadow: "0 0 0 12px rgba(255,150,0,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(255,150,0,0)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%":      { transform: "rotate(-5deg)" },
          "75%":      { transform: "rotate(5deg)" },
        },
        "spin-slow": {
          "from": { transform: "rotate(0deg)" },
          "to":   { transform: "rotate(360deg)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fill-bar": {
          "from": { width: "0%" },
        },
      },

      transitionTimingFunction: {
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
