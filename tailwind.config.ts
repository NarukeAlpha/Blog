import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./apps/**/*.{html,ts,tsx}", "./packages/shared/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        ring: "hsl(var(--ring))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))"
      },
      fontFamily: {
        sans: ["Outfit", "Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Space Grotesk", "Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      },
      boxShadow: {
        panel: "0 8px 32px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.15)",
        "glass-glow": "0 0 48px rgba(120, 80, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.2)",
        "glass-inset": "inset 0 1px 0 0 rgba(140, 130, 255, 0.1)",
        neon: "0 0 20px rgba(120, 80, 255, 0.15), 0 0 60px rgba(120, 80, 255, 0.05)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem"
      },
      backdropBlur: {
        glass: "28px",
        "glass-heavy": "44px"
      }
    }
  },
  plugins: []
};

export default config;
