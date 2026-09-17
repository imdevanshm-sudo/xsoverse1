import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      spacing: {
        'xso-1': '0.25rem',
        'xso-2': '0.5rem',
        'xso-3': '0.75rem',
        'xso-4': '1rem',
        'xso-5': '1.25rem',
        'xso-6': '1.5rem',
        'xso-8': '2rem',
        'xso-page': 'clamp(0.75rem, 2.5vw, 2rem)',
        'xso-section': 'clamp(1.25rem, 3vw, 2rem)',
        'xso-header': '3.5rem',
      },
      borderRadius: {
        'xso-shell': '1.75rem',
        'xso-bezel': '1.15rem',
        'xso-panel': '0.75rem',
        'xso-control': '0.5rem',
        'xso-phone': '1.5rem',
      },
      maxWidth: {
        store: '64rem',
        studio: '72rem',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        arcade: ['var(--font-space-grotesk)', 'sans-serif'],
        pixel: ['var(--font-press-start)', 'monospace'],
        mono: ['var(--font-space-mono)', 'ui-monospace', 'monospace'],
        receipt: [
          'var(--font-courier-prime)',
          'Courier New',
          'Courier',
          'monospace',
        ],
        hand: ['var(--font-caveat)', 'Segoe Print', 'Bradley Hand', 'cursive'],
        sans: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#0f0e0c',
        paper: '#f4efe6',
        acid: '#e8ff4a',
        hotpink: '#ff4db8',
        cyber: '#00f5ff',
        navy: '#071428',
        phosphor: '#9dffb0',
        'console-shell': '#2c323a',
        'console-mist': '#d7dde6',
        'console-ink': '#070908',
      },
      boxShadow: {
        receipt: '0 22px 50px rgba(0,0,0,0.35)',
        chassis:
          '0 28px 60px rgba(0,0,0,0.55), 0 8px 18px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -2px 0 rgba(0,0,0,0.35)',
        phone:
          '0 24px 60px rgba(0,0,0,0.45), inset 0 0 60px rgba(0,0,0,0.85)',
      },
      transitionTimingFunction: {
        xso: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        drop: {
          '0%': { opacity: '0', transform: 'translateY(-24px) rotate(-1.2deg)' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(0.35deg)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'arcade-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        'crt-flicker': {
          '0%, 100%': { opacity: '0.04' },
          '46%': { opacity: '0.04' },
          '47%': { opacity: '0.09' },
          '48%': { opacity: '0.03' },
          '92%': { opacity: '0.05' },
          '93%': { opacity: '0.02' },
        },
      },
      animation: {
        drop: 'drop 0.8s cubic-bezier(0.22,1,0.36,1) both',
        blink: 'blink 1.2s ease-in-out infinite',
        'arcade-glow': 'arcade-glow 1.6s ease-in-out infinite',
        'crt-flicker': 'crt-flicker 4.5s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
