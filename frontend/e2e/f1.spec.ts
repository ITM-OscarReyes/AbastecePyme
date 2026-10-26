/**
 * Interfaz de la cadena de suministro y del catálogo en navegador real.
 *
 * Cada aserción compara la pantalla con lo que devuelve la API real: no hay
 * dobles de red ni datos embebidos en el frontend.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const API = process.env.ABASTECEPYME_API_URL ?? 'http://127.0.0.1:8000';

interface Grafo {
  elementos: Array<{
    id: string;
    tipo: string;
    nombre: string;
    stockDisponible: number | null;
    stockMinimo: number | null;
    alertaStock: boolean;
  }>;
  dependencias: Array<{ origen: string; destino: string; tipoRelacion: string }>;
  resumen: { totalElementos: number; totalDependencias: number };
}

const leerGrafo = async (): Promise<Grafo> =>
  (await fetch(`${API}/api/v1/grafo`)).json() as Promise<Grafo>;

const codigoSku = (id: string): string => (/\d/.test(id) ? id : `${id}-01`);

async function abrirAplicacion(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Sistema Sincronizado')).toBeVisible();
}

async function crearElemento(
  page: Page,
  id: string,
  nombre: string,
  tipo: 'INSUMO' | 'PRODUCTO' | 'PROCESO' | 'PROVEEDOR' = 'INSUMO'
): Promise<void> {
  await page.getByRole('button', { name: /Nuevo Componente/i }).click();
  const modal = page.locator('.fixed').filter({ hasText: 'Nuevo Elemento' });
  await expect(modal).toBeVisible();
  await modal.getByPlaceholder(/INS-TORNILLO/i).fill(id);
  await modal.locator('select').selectOption(tipo);
  await modal.getByPlaceholder(/Tornillo hexagonal/i).fill(nombre);
  await modal.getByRole('button', { name: 'Crear Elemento' }).click();
  await expect(page.locator('.fixed')).toBeHidden();
}

async function enlazar(
  page: Page,
  tipoOrigen: string,
  origen: string,
  tipoDestino: string,
  destino: string
): Promise<void> {
  await page.getByRole('button', { name: /Enlazar Suministro/i }).click();
  const modal = page.locator('.fixed').filter({ hasText: 'Enlazar Suministro' });
  await expect(modal).toBeVisible();
  const selectores = modal.locator('select');
  await selectores.nth(0).selectOption(tipoOrigen);
  await selectores.nth(1).selectOption(origen);
  await selectores.nth(2).selectOption(tipoDestino);
  await selectores.nth(3).selectOption(destino);
  await modal.getByRole('button', { name: /Crear dependencia/i }).click();
}

test.describe('Cadena de suministro y catálogo sobre la API real', () => {
  test('los KPI coinciden con el resumen de GET /grafo', async ({ page }) => {
    const grafo = await leerGrafo();
    await abrirAplicacion(page);

    const tarjeta = (titulo: string) =>
      page.locator('.glass-card').filter({ hasText: titulo }).first();

    const contar = (tipo: string) =>
      grafo.elementos.filter((elemento) => elemento.tipo === tipo).length;

    await expect(tarjeta('Proveedores')).toContainText(String(contar('PROVEEDOR')));
    await expect(tarjeta('Materias & Suministros')).toContainText(String(contar('INSUMO')));
    await expect(tarjeta('Procesos de Planta')).toContainText(String(contar('PROCESO')));
    await expect(tarjeta('Productos Finales')).toContainText(String(contar('PRODUCTO')));
  });

  test('el catálogo muestra los elementos reales del backend', async ({ page }) => {
    const grafo = await leerGrafo();
    await abrirAplicacion(page);
    await page.getByRole('button', { name: /Materiales & Procesos/i }).click();

    const filas = page.locator('table tbody tr');
    await expect(filas).toHaveCount(grafo.elementos.length);
    for (const elemento of grafo.elementos) {
      await expect(
        page.getByText(codigoSku(elemento.id), { exact: true }).first()
      ).toBeVisible();
    }
  });

  test('el lienzo dibuja todos los elementos y aristas del backend', async ({ page }) => {
    const grafo = await leerGrafo();
    await abrirAplicacion(page);

    await expect(page.locator('canvas').first()).toBeVisible();

    const dibujado = await page.evaluate(() => {
      const contenedor = document.querySelector('.graph-canvas-bg') as (Element & {
        _cyreg?: {
          cy: {
            nodes: () => { length: number };
            edges: () => { length: number };
          };
        };
      }) | null;
      const cy = contenedor?._cyreg?.cy;
      return { nodos: cy?.nodes().length ?? -1, aristas: cy?.edges().length ?? -1 };
    });

    expect(dibujado.nodos).toBe(grafo.elementos.length);
    expect(dibujado.aristas).toBe(grafo.dependencias.length);
  });

  test('cada flecha va de origen a destino', async ({ page }) => {
    const grafo = await leerGrafo();
    await abrirAplicacion(page);
    await expect(page.locator('canvas').first()).toBeVisible();

    const aristas = await page.evaluate(() => {
      const contenedor = document.querySelector('.graph-canvas-bg') as (Element & {
        _cyreg?: {
          cy: {
            edges: () => ArrayLike<{
              source: () => { id: () => string };
              target: () => { id: () => string };
              data: (clave: string) => unknown;
              style: (propiedad: string) => string;
            }>;
          };
        };
      }) | null;
      const cy = contenedor?._cyreg?.cy;
      return Array.from(cy?.edges() ?? []).map((arista) => ({
        origen: arista.source().id(),
        destino: arista.target().id(),
        etiqueta: arista.data('label'),
        flecha: arista.style('target-arrow-shape')
      }));
    });

    expect(aristas).toHaveLength(grafo.dependencias.length);
    for (const dibujada of aristas) {
      const esperada = grafo.dependencias.find(
        (d) => d.origen === dibujada.origen && d.destino === dibujada.destino
      );
      expect(esperada).toBeDefined();
      expect(dibujada.etiqueta).toBe('habilita');
      expect(dibujada.flecha).not.toBe('none');
    }
  });

  test('la ficha modal muestra descripción, relaciones y stock del suministro', async ({ page }) => {
    await abrirAplicacion(page);
    await page.getByRole('button', { name: /Materiales & Procesos/i }).click();
    await page.getByText('Tornillo hexagonal M6', { exact: true }).first().click();

    const modal = page.locator('[role=dialog]').first();
    await expect(modal).toContainText('Tornillo hexagonal M6');
    await expect(modal).toContainText('Inventario del suministro');
    await expect(modal).toContainText('30');
    await expect(modal).toContainText('100');
    await expect(modal).toContainText('Bajo el mínimo');
    await expect(modal.getByRole('button', { name: /Ver en el mapa/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /Evaluar impacto/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Editar', exact: true })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Eliminar', exact: true })).toBeVisible();
  });

  test('el alta desde la interfaz queda registrada en el backend', async ({ page }) => {
    const marca = `E2E${Date.now().toString(36).toUpperCase()}`;
    const id = `${marca}-INSUMO`;
    await abrirAplicacion(page);

    await crearElemento(page, id, 'Suministro creado en navegador real');

    const respuesta = await fetch(`${API}/api/v1/elementos/${id}`);
    expect(respuesta.status).toBe(200);
    const creado = (await respuesta.json()) as {
      id: string;
      tipo: string;
      nombre: string;
      stockDisponible: number;
      stockMinimo: number;
    };
    expect(creado.id).toBe(id);
    expect(creado.tipo).toBe('INSUMO');
    expect(creado.nombre).toBe('Suministro creado en navegador real');
    expect(creado.stockDisponible).toBe(0);
    expect(creado.stockMinimo).toBe(0);

    await page.getByRole('button', { name: /Materiales & Procesos/i }).click();
    await expect(page.getByText(codigoSku(id), { exact: true }).first()).toBeVisible();
  });

  test('el duplicado de elemento se muestra como error del backend', async ({ page }) => {
    const marca = `DUP${Date.now().toString(36).toUpperCase()}`;
    const id = `${marca}-INSUMO`;
    await abrirAplicacion(page);
    await crearElemento(page, id, 'Elemento original en navegador real');

    await page.getByRole('button', { name: /Nuevo Componente/i }).click();
    const modal = page.locator('.fixed').filter({ hasText: 'Nuevo Elemento' });
    await modal.getByPlaceholder(/INS-TORNILLO/i).fill(id);
    await modal.getByPlaceholder(/Tornillo hexagonal/i).fill('Intento de duplicado');
    await modal.getByRole('button', { name: 'Crear Elemento' }).click();

    await expect(modal.getByText(/Ya existe un elemento/i)).toBeVisible();
  });

  test('el alta de relación aparece en el grafo del backend', async ({ page }) => {
    const marca = `REL${Date.now().toString(36).toUpperCase()}`;
    const origen = `${marca}-PROV`;
    const destino = `${marca}-PROD`;
    await abrirAplicacion(page);
    await crearElemento(page, origen, 'Proveedor de relación', 'PROVEEDOR');
    await crearElemento(page, destino, 'Producto de relación', 'PRODUCTO');

    await enlazar(page, 'PROVEEDOR', origen, 'PRODUCTO', destino);
    await expect(page.locator('.fixed')).toBeHidden();

    const grafo = await leerGrafo();
    const arista = grafo.dependencias.find(
      (d) => d.origen === origen && d.destino === destino
    );
    expect(arista).toEqual({ origen, destino, tipoRelacion: 'habilita' });
  });

  test('el duplicado de relación se muestra como error del backend', async ({ page }) => {
    const marca = `DUPREL${Date.now().toString(36).toUpperCase()}`;
    const origen = `${marca}-PROV`;
    const destino = `${marca}-PROD`;
    await abrirAplicacion(page);
    await crearElemento(page, origen, 'Proveedor duplicado', 'PROVEEDOR');
    await crearElemento(page, destino, 'Producto duplicado', 'PRODUCTO');

    await enlazar(page, 'PROVEEDOR', origen, 'PRODUCTO', destino);
    await expect(page.locator('.fixed')).toBeHidden();

    await page.getByRole('button', { name: /Enlazar Suministro/i }).click();
    const modal = page.locator('.fixed').filter({ hasText: 'Enlazar Suministro' });
    const selectores = modal.locator('select');
    await selectores.nth(0).selectOption('PROVEEDOR');
    await selectores.nth(1).selectOption(origen);
    await selectores.nth(2).selectOption('PRODUCTO');
    await selectores.nth(3).selectOption(destino);
    await modal.getByRole('button', { name: /Crear dependencia/i }).click();

    await expect(modal.getByText(/Ya existe una dependencia/i)).toBeVisible();
  });

  test('un rechazo del backend se muestra sin inventar datos', async ({ page }) => {
    const marca = `DESC${Date.now().toString(36).toUpperCase()}`;
    const id = `${marca}-INSUMO`;
    await abrirAplicacion(page);

    await page.getByRole('button', { name: /Nuevo Componente/i }).click();
    const modal = page.locator('.fixed').filter({ hasText: 'Nuevo Elemento' });
    await modal.getByPlaceholder(/INS-TORNILLO/i).fill(id);
    await modal.getByPlaceholder(/Tornillo hexagonal/i).fill('Elemento con descripción larga');
    await modal.getByPlaceholder(/Descripción opcional/i).fill('x'.repeat(320));
    await modal.getByRole('button', { name: 'Crear Elemento' }).click();

    await expect(modal.getByText(/datos inválidos/i)).toBeVisible();
    await expect(modal.getByText(/descripcion/i)).toBeVisible();
  });

  test('editar el stock actualiza la alerta y eliminar el elemento lo retira', async ({ page }) => {
    const marca = `EDIT${Date.now().toString(36).toUpperCase()}`;
    const id = `${marca}-INSUMO`;
    await abrirAplicacion(page);
    await crearElemento(page, id, 'Suministro editable');

    await page.getByRole('button', { name: /Materiales & Procesos/i }).click();
    await page.getByText(codigoSku(id), { exact: true }).first().click();
    await page.getByRole('button', { name: 'Editar', exact: true }).click();

    const edicion = page.locator('.fixed').filter({ hasText: 'Editar Elemento' });
    await edicion.locator('input[type=number]').nth(0).fill('5');
    await edicion.locator('input[type=number]').nth(1).fill('10');
    await edicion.getByRole('button', { name: /Guardar cambios/i }).click();

    const confirmacion = page.locator('[role=dialog]').last();
    await expect(confirmacion).toContainText('Efectos sobre la continuidad operativa');
    await confirmacion.getByRole('button', { name: /Confirmar cambios/i }).click();

    const consultado = await (await fetch(`${API}/api/v1/elementos/${id}`)).json();
    expect(consultado.stockDisponible).toBe(5);
    expect(consultado.stockMinimo).toBe(10);
    expect(consultado.alertaStock).toBe(true);

    await page.getByRole('button', { name: /Materiales & Procesos/i }).click();
    await page.getByText(codigoSku(id), { exact: true }).first().click();
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page
      .locator('[role=dialog]')
      .last()
      .getByRole('button', { name: /Confirmar eliminación/i })
      .click();

    const despues = await fetch(`${API}/api/v1/elementos/${id}`);
    expect(despues.status).toBe(404);
  });
});
