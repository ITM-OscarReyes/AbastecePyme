/**
 * Pestaña «Análisis de impacto» en navegador real contra el backend real.
 *
 * Comprueba la entrada desde el botón superior, la entrada desde Materiales y
 * procesos, el historial de análisis, el modal de afectados y el informe.
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
  await expect(page.getByText('Sistema Sincronizado')).toBeVisible();
}

async function abrirPestanaImpacto(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Análisis de impacto/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Análisis de Impacto', exact: true })
  ).toBeVisible();
}

async function evaluarPorBuscador(page: Page, texto: string): Promise<void> {
  const input = page.getByRole('combobox');
  await input.fill(texto);
  await page.locator('form').getByRole('button', { name: /Evaluar impacto/i }).click();
}

test.describe('Análisis de impacto en la interfaz', () => {
  test('al entrar desde el botón superior no se ejecuta ningún análisis', async ({ page }) => {
    await abrirAplicacion(page);
    await abrirPestanaImpacto(page);

    await expect(page.getByText('Comienza un análisis de impacto')).toBeVisible();
    await expect(page.getByText('Punto de partida del análisis')).toHaveCount(0);
  });

  test('el buscador evalúa PROV-ACERO y muestra los 5 afectados del backend', async ({ page }) => {
    const apiData = await leerImpactoApi('PROV-ACERO');
    await abrirAplicacion(page);
    await abrirPestanaImpacto(page);

    await evaluarPorBuscador(page, 'Proveedor de acero');

    await expect(page.getByText(/5 elementos afectados/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Proveedor de acero' })).toBeVisible();

    for (const afectado of apiData.afectados) {
      await expect(page.getByText(afectado.nombre, { exact: false }).first()).toBeVisible();
    }
    await expect(page.getByText(/Alerta de stock en el análisis/i)).toBeVisible();
  });

  test('entrar desde Materiales y procesos abre el análisis ya ejecutado', async ({ page }) => {
    await abrirAplicacion(page);
    await page.getByRole('button', { name: /Materiales & Procesos/i }).click();
    await page.getByText('Tornillo hexagonal M6', { exact: true }).first().click();

    const modal = page.locator('[role=dialog]').first();
    await modal.getByRole('button', { name: /Evaluar impacto/i }).click();

    await expect(
    page.getByRole('heading', { name: 'Análisis de Impacto', exact: true })
  ).toBeVisible();
    await expect(page.getByText('Punto de partida del análisis')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tornillo hexagonal M6' })).toBeVisible();
    await expect(page.getByText(/3 elementos afectados/i)).toBeVisible();
  });

  test('el historial conserva los análisis y permite reutilizarlos', async ({ page }) => {
    await abrirAplicacion(page);
    await abrirPestanaImpacto(page);

    await evaluarPorBuscador(page, 'Tornillo hexagonal');
    await expect(page.getByText(/3 elementos afectados/i)).toBeVisible();

    await evaluarPorBuscador(page, 'Corte de panel');
    await expect(page.getByText(/2 elementos afectados/i)).toBeVisible();

    const historial = page.getByText('Últimos 10 análisis de impacto').locator('..').locator('..');
    await expect(historial.getByText('Tornillo hexagonal M6', { exact: false })).toBeVisible();
    await expect(historial.getByText('Corte de panel', { exact: false })).toBeVisible();

    const guardado = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem('abastecepyme.historialImpactos') ?? '[]')
    );
    expect(guardado).toHaveLength(2);
  });

  test('el modal de un afectado permite consultar e iniciar un nuevo análisis sin editar', async ({ page }) => {
    await abrirAplicacion(page);
    await abrirPestanaImpacto(page);
    await evaluarPorBuscador(page, 'Tornillo hexagonal');
    await expect(page.getByText(/3 elementos afectados/i)).toBeVisible();

    await page.getByRole('button', { name: /Corte de panel/i }).first().click();
    const modal = page.locator('[role=dialog]').first();
    await expect(modal).toContainText('Elemento afectado por el análisis de impacto');
    await expect(modal.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
    await expect(modal.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(0);
    await expect(modal.getByRole('button', { name: /Ver en el mapa/i })).toBeVisible();

    await modal.getByRole('button', { name: /Iniciar análisis de impacto/i }).click();

    await expect(page.getByRole('heading', { name: 'Corte de panel' })).toBeVisible();
    await expect(page.getByText(/2 elementos afectados/i)).toBeVisible();
  });

  test('«Ver en el mapa» mantiene la selección y resalta los afectados', async ({ page }) => {
    await abrirAplicacion(page);
    await abrirPestanaImpacto(page);
    await evaluarPorBuscador(page, 'Proveedor de acero');
    await expect(page.getByText(/5 elementos afectados/i)).toBeVisible();

    await page.getByRole('button', { name: /Ver en el mapa/i }).click();

    await expect(page.getByRole('button', { name: /Cadena de Suministro/i })).toBeVisible();
    await expect(page.getByText('Riesgo de continuidad')).toBeVisible();
    await expect(page.getByText('5 en riesgo')).toBeVisible();
  });

  test('volver a entrar por el botón superior limpia el resultado anterior', async ({ page }) => {
    await abrirAplicacion(page);
    await abrirPestanaImpacto(page);
    await evaluarPorBuscador(page, 'Proveedor de acero');
    await expect(page.getByText(/5 elementos afectados/i)).toBeVisible();

    await page.getByRole('button', { name: /Cadena de Suministro/i }).click();
    await abrirPestanaImpacto(page);

    await expect(page.getByText('Comienza un análisis de impacto')).toBeVisible();
    await expect(page.getByText('Punto de partida del análisis')).toHaveCount(0);
  });

  test('un elemento inexistente muestra el mensaje del backend', async ({ page }) => {
    await abrirAplicacion(page);
    await abrirPestanaImpacto(page);

    await evaluarPorBuscador(page, 'NO-EXISTE');

    await expect(page.getByText(/no fue posible completar el análisis de impacto/i)).toBeVisible();
    await expect(page.getByText(/no se encuentra registrado/i)).toBeVisible();
  });
});
