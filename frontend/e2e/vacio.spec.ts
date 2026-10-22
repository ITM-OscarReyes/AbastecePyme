/**
 * AC-F1-13 / AC-F1-14d · Catálogo vacío en la interfaz.
 *
 * Se ejecuta contra el backend con `V = ∅` (`backend/tests/servidor_vacio.py`).
 * Una aplicación iniciada sin datos debe mostrar el estado vacío y totales en
 * cero; no debe inventar elementos ni un error de conexión.
 */
import { test, expect } from '@playwright/test';

test.describe('Interfaz con catálogo vacío', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('API Conectada')).toBeVisible();
  });

  test('AC-F1-13 los totales muestran cero sin errores', async ({ page }) => {
    const tarjeta = (titulo: string) =>
      page.locator('.glass-card').filter({ hasText: titulo }).first();

    await expect(tarjeta('Total Elementos')).toContainText('0');
    await expect(tarjeta('Dependencias')).toContainText('0');
    await expect(tarjeta('Tipos en Catálogo')).toContainText('0');
    await expect(page.getByText('API Desconectada')).toHaveCount(0);
  });

  test('AC-F1-13 el catálogo se muestra vacío, no con datos inventados', async ({ page }) => {
    await page.getByRole('button', { name: 'Catálogo' }).click();

    // La tabla conserva su cabecera y un único aviso de "sin resultados":
    // no hay filas de datos, es decir, ningún elemento inventado.
    const cuerpo = page.locator('table tbody');
    await expect(cuerpo.getByRole('cell')).toHaveCount(1);
    await expect(cuerpo).toContainText(/no se encontraron elementos/i);

    const filas = page.locator('table tbody tr');
    await expect(filas).toHaveCount(1);
    await expect(filas.getByRole('cell').first()).toHaveAttribute('colspan', '4');
  });

  test('AC-F1-14d el lienzo se monta sin nodos ni aristas', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible();

    const dibujado = await page.evaluate(() => {
      const contenedor = document.querySelector('.graph-canvas-bg') as (Element & {
        _cyreg?: {
          cy: { nodes: () => { length: number }; edges: () => { length: number } };
        };
      }) | null;
      const cy = contenedor?._cyreg?.cy;
      return { nodos: cy?.nodes().length ?? -1, aristas: cy?.edges().length ?? -1 };
    });

    expect(dibujado).toEqual({ nodos: 0, aristas: 0 });
  });

  test('AC-F1-14 el alta desde la interfaz funciona sobre el catálogo vacío', async ({ page }) => {
    const id = 'VACIO-TEST-INSUMO';

    await page.getByRole('button', { name: 'Elemento' }).click();
    const modal = page.locator('.fixed').filter({ hasText: 'Nuevo Elemento' });
    await modal.getByPlaceholder(/INS-TORNILLO/i).fill(id);
    await modal.getByPlaceholder(/Tornillo hexagonal/i).fill('Primer insumo del catálogo vacío');
    await modal.getByRole('button', { name: 'Crear Elemento' }).click();
    await expect(page.locator('.fixed')).toBeHidden();

    const tarjeta = page.locator('.glass-card').filter({ hasText: 'Total Elementos' }).first();
    await expect(tarjeta).toContainText('1');

    await page.getByRole('button', { name: 'Catálogo' }).click();
    await expect(page.getByRole('cell', { name: id, exact: true })).toBeVisible();
  });

  test('AC-F1-14 el selector de dependencias ofrece los elementos reales', async ({ page }) => {
    await page.getByRole('button', { name: 'Elemento' }).click();
    let modal = page.locator('.fixed').filter({ hasText: 'Nuevo Elemento' });
    await modal.getByPlaceholder(/INS-TORNILLO/i).fill('VACIO-TEST-PRODUCTO');
    await modal.getByPlaceholder(/Tornillo hexagonal/i).fill('Producto del catálogo vacío');
    await modal.locator('select').selectOption('PRODUCTO');
    await modal.getByRole('button', { name: 'Crear Elemento' }).click();
    await expect(page.locator('.fixed')).toBeHidden();

    await page.getByRole('button', { name: 'Dependencia', exact: true }).click();
    modal = page.locator('.fixed').filter({ hasText: 'Nueva Dependencia Dirigida' });
    const opciones = modal.locator('select').first().locator('option');
    await expect(opciones).toHaveCount(3); // vacío + los dos creados
    await expect(opciones.nth(1)).toContainText('VACIO-TEST-INSUMO');
  });
});