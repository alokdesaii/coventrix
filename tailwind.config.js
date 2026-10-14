/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      // Brand tokens — Coventrix +
      colors: {
        navy: '#023e63',
        teal: '#00bfb3',
        ink: '#000c14',
        slate: '#94a3b8',
        mist: '#f1f5f9',
        night: '#020617',
        label: '#e6eef6', // label cells in key/value tables — distinct from the mist page bg
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
