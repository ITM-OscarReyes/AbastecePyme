import { defineConfig, devices } from '@playwright/test';

/**
 * Verificación de extremo a extremo de la interfaz de F1.
 *
 * Se ejecuta en un navegador real (Chromium) contra la aplicación servida por
 * Vite, que a su vez consume el backend FastAPI real. No hay dobles de red ni
 * datos embebidos: lo que aparece en pantalla es lo que devuelve la API.
 *
 *   npx playwright test            # reutiliza los servidores ya levantados
 *   npx playwright test --ui       # depuración interactiva
 */
export default defineConfig({
  testDir: './e2e',
  // `vacio.spec.ts` necesita el backend con catálogo vacío: lo ejecuta
  // `playwright.vacio.config.ts` (npm run test:e2e:vacio).
  testIgnore: /vacio\.spec\.ts/,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.ABASTECEPYME_APP_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});