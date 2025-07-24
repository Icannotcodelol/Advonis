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
        }
      },
      fontFamily: {
        'legal': ['Georgia', 'Times New Roman', 'serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    },
  },
  plugins: [],
}
export default config 