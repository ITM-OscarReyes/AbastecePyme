/**
 * AC-F1-14 · Interfaz mínima de F1 en navegador real contra el backend real.
 *
 * El navegador carga la aplicación servida por Vite (puerto 3000), que
 * redirige `/api` al backend FastAPI (puerto 8000). No se inyecta ningún doble
 * de red: cada aserción compara la pantalla con lo que devuelve la API.
 *
 * AC-F1-14c (dirección de la flecha) y AC-F1-14d (sin datos embebidos) se
 * comprueban en `direccion.test.tsx`; aquí se cubre la interacción visible.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const API = process.env.ABASTECEPYME_API_URL ?? 'http://127.0.0.1:8000';

const marca = `E2E${Date.now().toString(36).toUpperCase()}`;

interface ResumenGrafo {
  elementos: Array<{ id: string; tipo: string; nombre: string }>;
  dependencias: Array<{ origen: string; destino: string; tipoRelacion: string }>;
  resumen: { totalElementos: number; totalDependencias: number };
}

const leerGrafo = async () => (await fetch(`${API}/api/v1/grafo`)).json() as Promise<ResumenGrafo>;

async function abrirAplicacion(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('API FastAPI Conectada')).toBeVisible();
}

async function crearElemento(
  page: Page,
  id: string,
  nombre: string,
  tipo: 'INSUMO' | 'PRODUCTO' | 'PROCESO' | 'PROVEEDOR' = 'INSUMO'
): Promise<void> {
  await page.getByRole('button', { name: 'Elemento' }).click();
  const modal = page.locator('.fixed').filter({ hasText: 'Nuevo Elemento' });
  await expect(modal).toBeVisible();
  await modal.getByPlaceholder(/INS-TORNILLO/i).fill(id);
  await modal.locator('select').selectOption(tipo);
  await modal.getByPlaceholder(/Tornillo hexagonal/i).fill(nombre);
  await modal.getByRole('button', { name: 'Crear Elemento' }).click();
}

test.describe('Interfaz de F1 sobre la API real', () => {
  test('AC-F1-14 los KPI coinciden con el resumen de GET /grafo', async ({ page }) => {
    const grafo = await leerGrafo();
    await abrirAplicacion(page);

    const tarjeta = (titulo: string) =>
      page.locator('.glass-card').filter({ hasText: titulo }).first();

    await expect(tarjeta('Total Elementos')).toContainText(String(grafo.resumen.totalElementos));
    await expect(tarjeta('Dependencias')).toContainText(String(grafo.resumen.totalDependencias));
    await expect(tarjeta('Tipos en Catálogo')).toContainText(
      String(new Set(grafo.elementos.map((e) => e.tipo)).size)
    );
  });

  test('AC-F1-14 el catálogo muestra los elementos reales del backend', async ({ page }) => {
    const grafo = await leerGrafo();
    await abrirAplicacion(page);

    await page.getByRole('button', { name: 'Catálogo' }).click();
    const filas = page.locator('table tbody tr');

    await expect(filas).toHaveCount(grafo.elementos.length);
    for (const elemento of grafo.elementos) {
      await expect(page.getByRole('cell', { name: elemento.id, exact: true })).toBeVisible();
    }
  });

  test('AC-F1-14 el lienzo dibuja todos los elementos y aristas del backend', async ({ page }) => {
    const grafo = await leerGrafo();
    await abrirAplicacion(page);

    await expect(page.locator('canvas').first()).toBeVisible();

    // Cytoscape registra su instancia en el contenedor que recibe como
    // `container`; se consulta para comparar lo dibujado con lo devuelto.
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

  test('AC-F1-14c cada flecha va de origen a destino', async ({ page }) => {
    const grafo = await leerGrafo();
    await abrirAplicacion(page);
    await expect(page.locator('canvas').first()).toBeVisible();

    const aristas = await page.evaluate(() => {
      const contenedor = document.querySelector('.graph-canvas-bg') as (Element & {
        _cyreg?: {
          cy: {
            edges: () => ArrayLike<{
              source: () => {
                id: () => string;
                position: () => { x: number; y: number };
                renderedPosition: () => { x: number; y: number };
              };
              target: () => {
                id: () => string;
                position: () => { x: number; y: number };
                renderedPosition: () => { x: number; y: number };
              };
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
      // La punta de flecha está en el destino: sin punta no habría dirección.
      expect(dibujada.flecha).not.toBe('none');
    }
  });

  test('AC-F1-14d la interfaz no contiene datos embebidos del catálogo', async ({ page }) => {
    const grafo = await leerGrafo();
    await abrirAplicacion(page);
    await page.getByRole('button', { name: 'Catálogo' }).click();

    // Cualquier elemento no creado por estas pruebas debe provenir del backend.
    await expect(page.locator('table tbody tr')).toHaveCount(grafo.elementos.length);
  });

  test('AC-F1-14 el detalle de un elemento refleja las aristas entrantes', async ({ page }) => {
    const grafo = await leerGrafo();
    const destino = grafo.elementos.find((e) =>
      grafo.dependencias.some((d) => d.destino === e.id)
    );
    const entrantes = grafo.dependencias.filter((d) => d.destino === destino!.id);
    const salientes = grafo.dependencias.filter((d) => d.origen === destino!.id);

    await abrirAplicacion(page);
    await page.getByRole('button', { name: 'Catálogo' }).click();
    await page.getByRole('cell', { name: destino!.id, exact: true }).click();

    const panel = page.locator('.glass-card').filter({ hasText: 'Requerimientos Directos' });
    await expect(panel).toBeVisible();
    for (const arista of entrantes) {
      await expect(panel.getByText(arista.origen, { exact: true })).toBeVisible();
    }
    const panelSalientes = page.locator('.glass-card').filter({ hasText: 'Habilita a' });
    for (const arista of salientes) {
      await expect(panelSalientes.getByText(arista.destino, { exact: true })).toBeVisible();
    }
  });

  test('AC-F1-14 el alta desde la interfaz queda registrada en el backend', async ({ page }) => {
    const id = `${marca}-INSUMO`;
    await abrirAplicacion(page);

    await crearElemento(page, id, 'Insumo creado en navegador real');
    await expect(page.locator('.fixed')).toBeHidden();

    const respuesta = await fetch(`${API}/api/v1/elementos/${id}`);
    expect(respuesta.status).toBe(200);
    const creado = (await respuesta.json()) as { id: string; tipo: string; nombre: string };
    expect(creado).toEqual({
      id,
      tipo: 'INSUMO',
      nombre: 'Insumo creado en navegador real',
      descripcion: null
    });

    await page.getByRole('button', { name: 'Catálogo' }).click();
    await expect(page.getByRole('cell', { name: id, exact: true })).toBeVisible();
  });

  test('AC-F1-14b el duplicado de elemento se muestra como error del backend', async ({ page }) => {
    const id = `${marca}-DUP`;
    await abrirAplicacion(page);
    await crearElemento(page, id, 'Elemento original en navegador real');
    await expect(page.locator('.fixed')).toBeHidden();

    await crearElemento(page, id, 'Intento de duplicado en navegador real');
    const modal = page.locator('.fixed').filter({ hasText: 'Nuevo Elemento' });
    await expect(modal.getByText(/Ya existe un elemento/i)).toBeVisible();

    // El original no se altera (AC-F1-02).
    const consultado = (await (await fetch(`${API}/api/v1/elementos/${id}`)).json()) as {
      nombre: string;
    };
    expect(consultado.nombre).toBe('Elemento original en navegador real');
  });

  test('AC-F1-14 el alta de dependencia aparece en el grafo del backend', async ({ page }) => {
    const origen = `${marca}-ORIGEN`;
    const destino = `${marca}-DESTINO`;
    await abrirAplicacion(page);
    await crearElemento(page, origen, 'Origen de dependencia en navegador real', 'PROVEEDOR');
    await expect(page.locator('.fixed')).toBeHidden();
    await crearElemento(page, destino, 'Destino de dependencia en navegador real', 'PRODUCTO');
    await expect(page.locator('.fixed')).toBeHidden();

    await page.getByRole('button', { name: 'Dependencia', exact: true }).click();
    const modal = page.locator('.fixed').filter({ hasText: 'Nueva Dependencia Dirigida' });
    await expect(modal).toBeVisible();
    const selectores = modal.locator('select');
    await selectores.nth(0).selectOption(origen);
    await selectores.nth(1).selectOption(destino);
    await modal.getByRole('button', { name: 'Crear Dependencia' }).click();
    await expect(page.locator('.fixed')).toBeHidden();

    const grafo = await leerGrafo();
    const arista = grafo.dependencias.find(
      (d) => d.origen === origen && d.destino === destino
    );
    expect(arista).toEqual({ origen, destino, tipoRelacion: 'habilita' });
  });

  test('AC-F1-14b el duplicado de dependencia se muestra como error del backend', async ({ page }) => {
    const origen = `${marca}-DUPORIGEN`;
    const destino = `${marca}-DUPDESTINO`;
    await abrirAplicacion(page);
    await crearElemento(page, origen, 'Origen duplicado en navegador real', 'PROVEEDOR');
    await expect(page.locator('.fixed')).toBeHidden();
    await crearElemento(page, destino, 'Destino duplicado en navegador real', 'PRODUCTO');
    await expect(page.locator('.fixed')).toBeHidden();

    for (let intento = 1; intento <= 2; intento += 1) {
      await page.getByRole('button', { name: 'Dependencia', exact: true }).click();
      const modal = page.locator('.fixed').filter({ hasText: 'Nueva Dependencia Dirigida' });
      const selectores = modal.locator('select');
      await selectores.nth(0).selectOption(origen);
      await selectores.nth(1).selectOption(destino);
      await modal.getByRole('button', { name: 'Crear Dependencia' }).click();

      if (intento === 1) {
        await expect(page.locator('.fixed')).toBeHidden();
      } else {
        await expect(modal.getByText(/Ya existe una dependencia/i)).toBeVisible();
      }
    }
  });

  test('AC-F1-14b un rechazo del backend se muestra sin inventar datos', async ({ page }) => {
    await abrirAplicacion(page);

    // `descripcion` supera los 300 caracteres de RF-F1-01: la interfaz envía el
    // formulario sin decidir nada sobre ese campo, así que el aviso visible
    // tiene que ser el mensaje del backend, con su campo y su ERR-04.
    const id = `${marca}-DESCRIPCION`;
    await page.getByRole('button', { name: 'Elemento' }).click();
    const modal = page.locator('.fixed').filter({ hasText: 'Nuevo Elemento' });
    await modal.getByPlaceholder(/INS-TORNILLO/i).fill(id);
    await modal.getByPlaceholder(/Tornillo hexagonal/i).fill('Elemento con descripción larga');
    await modal.getByPlaceholder(/Descripción opcional/i).fill('x'.repeat(320));
    await modal.getByRole('button', { name: 'Crear Elemento' }).click();

    await expect(modal.getByText(/datos inválidos/i)).toBeVisible();
    await expect(modal.getByText(/descripcion/i)).toBeVisible();

    // El catálogo queda intacto: el rechazo no registró nada.
    const respuesta = await fetch(`${API}/api/v1/elementos/${id}`);
    expect(respuesta.status).toBe(404);
  });
});