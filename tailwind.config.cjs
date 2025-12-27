/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: '0',
        md: '0',
        sm: '0',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Solarized accent colors
        status: {
          green: '#859900',   /* solarized green */
          yellow: '#b58900',  /* solarized yellow */
          red: '#dc322f',     /* solarized red */
        },
        solarized: {
          yellow: '#b58900',
          orange: '#cb4b16',
          red: '#dc322f',
          magenta: '#d33682',
          violet: '#6c71c4',
          blue: '#268bd2',
          cyan: '#2aa198',
          green: '#859900',
        },
      },
    },
  },
  plugins: [],
};
