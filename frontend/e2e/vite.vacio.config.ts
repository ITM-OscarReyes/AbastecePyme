import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Servidor de la interfaz apuntando al backend con el catálogo vacío
 * (`V = ∅`, levantado desde `backend/tests/servidor_vacio.py`).
 *
 * Existe solo para verificar AC-F1-13 y AC-F1-14d: una aplicación iniciada sin
 * datos debe mostrar el estado vacío, no datos inventados ni errores.
 * El puerto 3000 queda reservado para el backend con datos de demostración.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3100,
    proxy: {
      '/api': {
        target: process.env.ABASTECEPYME_API_VACIA_URL ?? 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false
      }
    }
  }
});