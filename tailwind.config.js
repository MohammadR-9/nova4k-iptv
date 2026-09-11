/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oled: '#000000',
        'surface-primary': '#070a10',
        'surface-elevated': '#0e1422',
        'surface-card': '#141c2e',
        'surface-glass': 'rgba(14, 20, 34, 0.88)',
        'accent-cyan': '#00E5FF',
        'accent-gold': '#FFB300',
        'accent-live': '#FF1744',
        'look4k-cyan': '#00f0ff',
        'asmr-purple': '#a855f7',
        'asmr-emerald': '#10b981',
        'asmr-rose': '#f43f5e',
        'nova-cyan': '#00F2FE',
        'nova-purple': '#A855F7',
        'nova-emerald': '#10B981',
        'nova-gold': '#FFB703',
      },
      boxShadow: {
        'focus-glow': '0 0 25px rgba(0, 229, 255, 0.55), 0 0 5px rgba(0, 229, 255, 0.8)',
        'focus-glow-subtle': '0 0 15px rgba(0, 229, 255, 0.35)',
        'focus-glow-purple': '0 0 25px rgba(168, 85, 247, 0.55), 0 0 5px rgba(168, 85, 247, 0.8)',
        'focus-glow-emerald': '0 0 25px rgba(16, 185, 129, 0.55), 0 0 5px rgba(16, 185, 129, 0.8)',
        'card-elevated': '0 8px 30px rgba(0, 0, 0, 0.7)',
        'look4k-neon': '0 0 35px rgba(0, 240, 255, 0.25)',
        'nova-glow': '0 0 35px rgba(0, 242, 254, 0.35)',
        'nova-purple': '0 0 35px rgba(168, 85, 247, 0.35)',
        'shadow-nova-glow': '0 0 35px rgba(0, 242, 254, 0.35)',
        'shadow-nova-purple': '0 0 35px rgba(168, 85, 247, 0.35)',
      },
      scale: {
        'focus': '1.06',
        'focus-subtle': '1.03',
      },
      fontFamily: {
        sans: ['Cairo', 'Readex Pro', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
