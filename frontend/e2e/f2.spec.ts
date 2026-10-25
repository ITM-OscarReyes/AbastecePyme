/**
 * AC-F2 · Interfaz de Análisis de Impacto (F2) en navegador real contra el backend real.
 *
 * El navegador carga la aplicación servida por Vite (puerto 3000), que
 * redirige `/api` al backend FastAPI (puerto 8000). No se inyecta ningún doble
 * de red: cada aserción compara la pantalla con lo que devuelve la API de F2.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const API = process.env.ABASTECEPYME_API_URL ?? 'http://127.0.0.1:8000';

interface ImpactoRespuesta {
  elemento: { id: string; tipo: string; nombre: string };
  afectados: Array<{ id: string; tipo: string; nombre: string }>;
  total: number;
}

const leerImpactoApi = async (id: string): Promise<ImpactoRespuesta> =>
  (await fetch(`${API}/api/v1/impacto/${id}`)).json();

async function abrirAplicacion(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText(/Sistema Sincronizado|API Conectada/)).toBeVisible();
}

async function navegarAImpacto(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Simulador de Fallas/i }).click();
  await expect(page.getByRole('heading', { name: /Simulador de Continuidad/i })).toBeVisible();
}

test.describe('F2 — Análisis de impacto en la interfaz', () => {
  test('AC-F2-01 consulta de impacto de PROV-ACERO muestra los 4 afectados del backend', async ({ page }) => {
    const apiData = await leerImpactoApi('PROV-ACERO');
    await abrirAplicacion(page);
    await navegarAImpacto(page);

    // Seleccionar PROV-ACERO desde los chips de componentes o escribirlo
    const chipProv = page.locator('button').filter({ hasText: /Proveedor de acero/i }).first();
    await chipProv.click();

    // Esperar a que el resultado se renderice
    await expect(page.getByText(/4 Componentes en Riesgo/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Proveedor de acero' })).toBeVisible();

    // Comprobar que los afectados coinciden con los que devolvió la API
    for (const afectado of apiData.afectados) {
      await expect(page.getByText(afectado.nombre, { exact: false }).first()).toBeVisible();
    }

    // Tornillo no debe figurar en la lista de afectados
    const panelAfectados = page.locator('.animate-in');
    await expect(panelAfectados.getByText(/Tornillo hexagonal/i)).toHaveCount(0);
  });

  test('AC-F2-01b PROD-PANEL solo muestra a PROD-BANCO como afectado', async ({ page }) => {
    await abrirAplicacion(page);
    await navegarAImpacto(page);

    const chipPanel = page.locator('button').filter({ hasText: /Panel de montaje/i }).first();
    await chipPanel.click();

    await expect(page.getByText(/1 Componente.* en Riesgo/i)).toBeVisible();
    await expect(page.getByText('Banco de montaje', { exact: false }).first()).toBeVisible();

    // Predecesores no aparecen
    const panelAfectados = page.locator('.animate-in');
    await expect(panelAfectados.getByText(/Corte de panel/i)).toHaveCount(0);
    await expect(panelAfectados.getByText(/Barra de acero/i)).toHaveCount(0);
    await expect(panelAfectados.getByText(/Proveedor de acero/i)).toHaveCount(0);
  });

  test('AC-F2-04 PROD-BANCO muestra 0 afectados (elemento terminal)', async ({ page }) => {
    await abrirAplicacion(page);
    await navegarAImpacto(page);

    const chipBanco = page.locator('button').filter({ hasText: /Banco de montaje/i }).first();
    await chipBanco.click();

    // Debe mostrar severidad nula / elemento terminal
    await expect(
      page.getByText(/Impacto Operativo Nulo|Sin Afectación en Cadena/i).first()
    ).toBeVisible();
  });

  test('AC-F2-03 elemento inexistente muestra mensaje de error del backend', async ({ page }) => {
    await abrirAplicacion(page);
    await navegarAImpacto(page);

    const input = page.getByRole('combobox');
    await input.fill('NO-EXISTE');
    await page.getByRole('button', { name: /Simular Contingencia/i }).click();

    // Debe aparecer la alerta de error con el mensaje de no encontrado
    await expect(page.getByText(/No fue posible completar la simulación/i)).toBeVisible();
    await expect(page.getByText(/no se encuentra registrado/i)).toBeVisible();
  });

  test('AC-F2-14 la vista de impacto no muestra indicadores de ciclos ni orden de producción', async ({ page }) => {
    await abrirAplicacion(page);
    await navegarAImpacto(page);

    const chipProv = page.locator('button').filter({ hasText: /Proveedor de acero/i }).first();
    await chipProv.click();
    await expect(page.getByText(/4 Componentes en Riesgo/i)).toBeVisible();

    // No debe haber textos de veredicto de ciclo ni orden topológico
    const contenido = await page.content();
    expect(contenido.toLowerCase()).not.toContain('tiene ciclo');
    expect(contenido.toLowerCase()).not.toContain('orden topológico');
    expect(contenido.toLowerCase()).not.toContain('orden de preparación');
  });
});
