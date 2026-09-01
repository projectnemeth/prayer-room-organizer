import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        altar: {
          teal: '#3F5F5B',
          sage: '#6F8580',
          parchment: '#F5F1E8',
          stone: '#D9D3C6',
          ink: '#1F2421',
          gold: '#B99A61',
        },
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
