import { defineConfig, devices } from '@playwright/test';

/**
 * Verificación del estado vacío (AC-F1-13, AC-F1-14d).
 *
 * Levanta dos procesos: el backend con `V = ∅`
 * (`backend/tests/servidor_vacio.py`, que no carga los datos de demostración)
 * y la interfaz con la configuración que proxya hacia ese backend.
 *
 * El backend se reinicia en cada ejecución porque mantiene el catálogo en
 * memoria: reutilizar uno ya modificado invalidaría las aserciones de vacío.
 *
 *   npx playwright test -c playwright.vacio.config.ts
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /vacio\.spec\.ts/,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [['list']],
  webServer: [
    {
      command: '.venv\\Scripts\\python.exe -m uvicorn tests.servidor_vacio:app --port 8001',
      cwd: '../backend',
      url: 'http://127.0.0.1:8001/api/v1/grafo',
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: 'npx vite --config e2e/vite.vacio.config.ts --port 3100 --strictPort --host localhost',
      url: 'http://localhost:3100',
      reuseExistingServer: true,
      timeout: 120_000
    }
  ],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});