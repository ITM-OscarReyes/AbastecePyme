/**
 * Catálogo vacío en la interfaz.
 *
 * Se ejecuta contra el backend con el catálogo vacío (`backend/tests/servidor_vacio.py`).
 * Comprueba que la aplicación muestra el estado vacío, los totales en cero y que el
 * alta de elementos y la selección por tipo funcionan sin datos inventados.
 */
import { test, expect } from '@playwright/test';

test.describe('Interfaz con catálogo vacío', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Sistema Sincronizado')).toBeVisible();
  });

  test('los totales muestran cero sin errores', async ({ page }) => {
    const tarjeta = (titulo: string) =>
      page.locator('.glass-card').filter({ hasText: titulo }).first();

    await expect(tarjeta('Proveedores')).toContainText('0');
    await expect(tarjeta('Materias & Suministros')).toContainText('0');
    await expect(tarjeta('Procesos de Planta')).toContainText('0');
    await expect(tarjeta('Productos Finales')).toContainText('0');
    await expect(page.getByText('Sin Conexión')).toHaveCount(0);
  });

  test('el catálogo se muestra vacío, no con datos inventados', async ({ page }) => {
    await page.getByRole('button', { name: /Materiales & Procesos/i }).click();

    const filas = page.locator('table tbody tr');
    await expect(filas).toHaveCount(1);
    await expect(filas.getByRole('cell').first()).toHaveAttribute('colspan', '6');
    await expect(page.locator('table tbody')).toContainText(/no se encontraron elementos/i);
  });

  test('el lienzo se monta sin nodos ni aristas', async ({ page }) => {
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

  test('el alta desde la interfaz funciona sobre el catálogo vacío', async ({ page }) => {
    const id = 'VACIO-TEST-INSUMO';

    await page.getByRole('button', { name: /Nuevo Componente/i }).click();
    const modal = page.locator('.fixed').filter({ hasText: 'Nuevo Elemento' });
    await modal.getByPlaceholder(/INS-TORNILLO/i).fill(id);
    await modal.getByPlaceholder(/Tornillo hexagonal/i).fill('Primer suministro del catálogo vacío');
    await modal.getByRole('button', { name: 'Crear Elemento' }).click();
    await expect(page.locator('.fixed')).toBeHidden();

    const tarjeta = page.locator('.glass-card').filter({ hasText: 'Materias & Suministros' }).first();
    await expect(tarjeta).toContainText('1');

    await page.getByRole('button', { name: /Materiales & Procesos/i }).click();
    await expect(page.getByText(`${id}-01`, { exact: true })).toBeVisible();
  });

  test('el formulario de relación filtra elementos por tipo', async ({ page }) => {
    await page.getByRole('button', { name: /Nuevo Componente/i }).click();
    let modal = page.locator('.fixed').filter({ hasText: 'Nuevo Elemento' });
    await modal.getByPlaceholder(/INS-TORNILLO/i).fill('VACIO-TEST-PRODUCTO');
    await modal.getByPlaceholder(/Tornillo hexagonal/i).fill('Producto del catálogo vacío');
    await modal.locator('select').selectOption('PRODUCTO');
    await modal.getByRole('button', { name: 'Crear Elemento' }).click();
    await expect(page.locator('.fixed')).toBeHidden();

    await page.getByRole('button', { name: /Enlazar Suministro/i }).click();
    modal = page.locator('.fixed').filter({ hasText: 'Enlazar Suministro' });
    const selectores = modal.locator('select');
    await selectores.nth(0).selectOption('INSUMO');
    await selectores.nth(2).selectOption('PRODUCTO');

    const opcionesOrigen = selectores.nth(1).locator('option');
    const opcionesDestino = selectores.nth(3).locator('option');
    await expect(opcionesOrigen).toHaveCount(2); // vacío + el suministro creado
    await expect(opcionesDestino).toHaveCount(2); // vacío + el producto creado
    await expect(opcionesOrigen.nth(1)).toContainText('VACIO-TEST-INSUMO');
    await expect(opcionesDestino.nth(1)).toContainText('VACIO-TEST-PRODUCTO');
  });
});
