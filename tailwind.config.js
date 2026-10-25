/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ocbc: {
          DEFAULT: '#E30613',
          dark: '#C10512',
          soft: '#FDECEE',
        },
        ink: '#1A1A1A',
        mute: '#6B6B6B',
        caption: '#8E8E93',
        line: '#EEEEEE',
        canvas: '#F6F7F9',
        tile: '#F3F4F6',
      },
      fontSize: {
        nav: ['10px', { lineHeight: '12px', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '16px' }],
        balance: ['32px', { lineHeight: '38px', fontWeight: '700' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,23,23,0.04), 0 8px 20px rgba(23,23,23,0.05)',
      },
      borderRadius: {
        card: '16px',
        btn: '8px',
      },
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' },
    },
  },
  plugins: [],
}
