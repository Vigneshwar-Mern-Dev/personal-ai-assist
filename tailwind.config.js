/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        shell:      "#060a10",
        panel:      "#0b1120",
        panelSoft:  "#0f1929",
        panelMid:   "#111e32",
        line:       "#1d2d45",
        accent:     "#22c55e",
        accentSoft: "#0d2619",
        accentGlow: "#16a34a",
        warning:    "#f59e0b",
        danger:     "#ef4444",
        sky:        "#38bdf8",
        purple:     "#a78bfa"
      },
      boxShadow: {
        glow:       "0 0 0 1px rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.5)",
        glowAccent: "0 0 30px rgba(34,197,94,0.15), 0 0 0 1px rgba(34,197,94,0.08)",
        glass:      "inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5)",
        card:       "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
      },
      backgroundImage: {
        "gradient-radial":   "radial-gradient(var(--tw-gradient-stops))",
        "noise":             "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")"
      },
      animation: {
        "pulse-slow":   "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":      "fadeIn 0.4s ease-out",
        "slide-up":     "slideUp 0.35s ease-out",
        "glow-pulse":   "glowPulse 2s ease-in-out infinite"
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(34,197,94,0.3)" },
          "50%":      { boxShadow: "0 0 20px rgba(34,197,94,0.7)" }
        }
      }
    }
  },
  plugins: []
};
