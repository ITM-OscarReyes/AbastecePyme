/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0369a1',
          900: '#0c4a6e',
        },
        node: {
          proveedor: '#3b82f6', // azul
          insumo: '#f59e0b',    // ámbar
          proceso: '#a855f7',   // púrpura
          producto: '#10b981',  // esmeralda
        }
      },
    },
  },
  plugins: [],
}
