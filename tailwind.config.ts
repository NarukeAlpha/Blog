import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
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
        sans: ["Public Sans", "Avenir Next", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Iowan Old Style", "Palatino Linotype", "Book Antiqua", "serif"]
      },
      boxShadow: {
        panel: "0 8px 32px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)",
        "glass-glow": "0 0 48px rgba(255, 255, 255, 0.12), 0 8px 32px rgba(0, 0, 0, 0.06)",
        "glass-inset": "inset 0 1px 0 0 rgba(255, 255, 255, 0.72)"
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
