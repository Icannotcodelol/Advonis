import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legal annotation colors
        legal: {
          risk: '#ef4444', // Red for legal risks
          warning: '#f59e0b', // Yellow for warnings
          suggestion: '#10b981', // Green for suggestions
          neutral: '#6b7280', // Gray for neutral comments
        },
        // Brand colors
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        glass: 'rgba(255,255,255,0.1)',
        glassBorder: 'rgba(255,255,255,0.2)',
        glassBg: 'rgba(255,255,255,0.6)',
        trust: '#1a365d', // deep blue
        authority: '#23272f', // charcoal gray
        clarity: '#ffffff', // pure white
        urgency: '#e57373', // soft red
        accent: '#7dd3fc', // subtle blue accent
      },
      fontFamily: {
        'legal': ['Georgia', 'Times New Roman', 'serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'lg': '16px',
        'xl': '20px',
        'glass': '20px',
      },
      boxShadow: {
        glass: '0 20px 40px rgba(0,0,0,0.10)',
        glassHover: '0 24px 48px rgba(0,0,0,0.14)',
      },
      backdropBlur: {
        glass: '20px',
      },
      transitionTimingFunction: {
        glass: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      transitionDuration: {
        glass: '300ms',
      },
    },
  },
  plugins: [],
}
export default config 