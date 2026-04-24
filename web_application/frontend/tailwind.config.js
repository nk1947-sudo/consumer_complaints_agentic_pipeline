/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['var(--font-sans)',  'Inter',    'system-ui', 'sans-serif'],
        mono:  ['var(--font-mono)',  'DM Mono',  'Menlo',     'monospace'],
      },
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        surface:     'hsl(var(--surface))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success:  'hsl(var(--success))',
        warning:  'hsl(var(--warning))',
      },
      borderRadius: {
        sm:   'calc(var(--radius) - 2px)',
        md:   'var(--radius)',
        lg:   'calc(var(--radius) + 2px)',
        xl:   'calc(var(--radius) + 4px)',
        '2xl':'calc(var(--radius) + 8px)',
        '3xl':'calc(var(--radius) + 14px)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(-14px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'track-grow': {
          from: { height: '0%' },
          to:   { height: 'var(--track-pct)' },
        },
        'counter-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      animation: {
        'fade-up':         'fade-up 0.5s cubic-bezier(0.22,1,0.36,1)',
        'fade-up-delay':   'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s both',
        'fade-up-delay2':  'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.3s both',
        'fade-in':         'fade-in 0.3s ease-out',
        'slide-in-right':  'slide-in-right 0.4s cubic-bezier(0.22,1,0.36,1)',
        'scale-in':        'scale-in 0.2s ease-out',
        'counter-up':      'counter-up 0.5s cubic-bezier(0.22,1,0.36,1)',
        'pulse':           'pulse 2s ease-in-out infinite',
      },
      boxShadow: {
        'card':        '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover':  '0 4px 16px rgba(0,0,0,0.4)',
        'elevation-1': '0 2px 8px rgba(0,0,0,0.4)',
        'elevation-2': '0 8px 32px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
