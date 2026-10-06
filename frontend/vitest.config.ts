import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Verificación de la interfaz de F1 contra el backend real levantado por HTTP.
// El origen simulado coincide con el que el backend acepta en CORS
// (`http://localhost:5173`, ver `app/api/aplicacion.py`).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/preparacion.ts'],
    environmentOptions: {
      jsdom: { url: 'http://localhost:5173' }
    },
    include: ['src/test/**/*.test.ts'],
    reporters: 'default'
  }
});
