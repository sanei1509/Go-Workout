/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── Tokens semánticos GO Workout ──────────────────────────
        // Estos nombres coinciden con ThemeTokens en constants/theme.ts.
        // En pantallas que usan NativeWind se pueden aplicar como clases:
        //   bg-surface, text-action, border-border, etc.
        // Para el valor dinámico (dark/light), usar useTheme() y style={}.
        //
        // Los valores aquí son los del dark theme (base).
        // El cambio dinámico se maneja en ThemeContext, no en Tailwind.
        surface:          '#090f12',
        'surface-elevated': '#141d21',
        border:           'rgba(255,255,255,0.10)',
        'text-primary':   '#E8EDEF',
        'text-secondary': 'rgba(232,237,239,0.45)',
        action:           '#00D1FF',
        'action-fg':      '#04161c',
        done:             '#4ade80',
        attention:        '#FEB127',
      },
    },
  },
  plugins: [],
};
