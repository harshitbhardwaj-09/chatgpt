import type { Config } from "tailwindcss"

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
        // Token-based colors for ChatGPT styling
        'token-main-surface-primary': 'var(--token-main-surface-primary)',
        'token-main-surface-secondary': 'var(--token-main-surface-secondary)',
        'token-main-surface-tertiary': 'var(--token-main-surface-tertiary)',
        'token-bg-primary': 'var(--token-bg-primary)',
        'token-bg-secondary': 'var(--token-bg-secondary)',
        'token-bg-tertiary': 'var(--token-bg-tertiary)',
        'token-text-primary': 'var(--token-text-primary)',
        'token-text-secondary': 'var(--token-text-secondary)',
        'token-text-tertiary': 'var(--token-text-tertiary)',
        'token-border-light': 'var(--token-border-light)',
        'token-border-medium': 'var(--token-border-medium)',
        'token-sidebar-surface-primary': 'var(--token-sidebar-surface-primary)',
        'token-sidebar-surface-secondary': 'var(--token-sidebar-surface-secondary)',
        
        // Standard shadcn colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        '15': '3.75rem',
        '25': '6.25rem',
      },
      zIndex: {
        '21': '21',
      },
      width: {
        '16': '4rem',
        '64': '16rem',
      },
      gridTemplateAreas: {
        'composer': 'leading primary trailing',
      },
      boxShadow: {
        'short': '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config


