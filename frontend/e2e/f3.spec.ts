/**
 * Pestaña «Orden de producción» en navegador real contra el backend real.
 *
 * Cubre los criterios de interfaz de F3:
 * - AC-F3-10: el plan de entrega muestra los pasos numerados y el estado de
 *   cada producto con los datos reales de `GET /api/v1/plan-entrega`.
 * - AC-F3-10b: el control general de planta muestra el orden global cuando el
 *   catálogo es acíclico y una alerta con ciclos, elementos bloqueados y
 *   productos bloqueados cuando hay un ciclo.
 * - AC-UI-01 y AC-UI-04b: textos visibles de la vista y de la guía integrada.
 *
 * El ciclo se crea y se elimina a través de la API para no dejar el catálogo de
 * demostración modificado. El ciclo de prueba es
 * `PROC-ACABADO → INS-PIEZA-CORTADA`, que cierra el ciclo existente
 * `INS-PIEZA-CORTADA → PROC-ACABADO`.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const API = process.env.ABASTECEPYME_API_URL ?? 'http://127.0.0.1:8000';
const ORIGEN_CICLO = 'PROC-ACABADO';
const DESTINO_CICLO = 'INS-PIEZA-CORTADA';

interface PasoProduccion {
  paso: number;
  id: string;
  tipo: string;
  nombre: string;
}

interface CicloDetectado {
  secuencia: string[];
}

interface OrdenProduccionRespuesta {
  esDag: boolean;
  orden: PasoProduccion[];
  totalPasos: number;
  ciclos: CicloDetectado[];
  elementosBloqueados: string[];
  productosBloqueados: string[];
  productosPlanificables: string[];
  elementosIncompletos: string[];
  productosIncompletos: string[];
}

interface ProductoEntrega {
  id: string;
  tipo: string;
  nombre: string;
  estado: 'PLANIFICABLE' | 'BLOQUEADO' | 'INCOMPLETO';
}

interface PlanEntregaRespuesta {
  productos: ProductoEntrega[];
  esPlanificable: boolean;
  pasos: PasoProduccion[];
  totalPasos: number;
  ciclos: CicloDetectado[];
  elementosBloqueados: string[];
}

interface ElementoProducto {
  id: string;
  nombre: string;
}

const ETIQUETA_TIPO: Record<string, string> = {
  PROVEEDOR: 'Proveedor',
  INSUMO: 'Suministro',
  PROCESO: 'Proceso',
  PRODUCTO: 'Producto'
};

async function leerProductos(): Promise<ElementoProducto[]> {
  const respuesta = await fetch(`${API}/api/v1/elementos?tipo=PRODUCTO`);
  expect(respuesta.status).toBe(200);
  const cuerpo = (await respuesta.json()) as { elementos: ElementoProducto[] };
  return cuerpo.elementos;
}

async function leerOrden(): Promise<OrdenProduccionRespuesta> {
  const respuesta = await fetch(`${API}/api/v1/orden-produccion`);
  // Un ciclo es un resultado de negocio: el diagnóstico global siempre es 200.
  expect(respuesta.status).toBe(200);
  return (await respuesta.json()) as OrdenProduccionRespuesta;
}

async function leerPlan(productos: string[]): Promise<PlanEntregaRespuesta> {
  const respuesta = await fetch(
    `${API}/api/v1/plan-entrega?productos=${encodeURIComponent(productos.join(','))}`
  );
  expect(respuesta.status).toBe(200);
  return (await respuesta.json()) as PlanEntregaRespuesta;
}

async function eliminarCiclo(): Promise<void> {
  await fetch(`${API}/api/v1/dependencias/${ORIGEN_CICLO}/${DESTINO_CICLO}`, {
    method: 'DELETE'
  });
}

async function crearCiclo(): Promise<void> {
  const respuesta = await fetch(`${API}/api/v1/dependencias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origen: ORIGEN_CICLO, destino: DESTINO_CICLO })
  });
  expect(respuesta.status).toBe(201);
}

async function abrirAplicacion(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Sistema Sincronizado')).toBeVisible();
}

async function abrirPestanaProduccion(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Orden de producción/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Orden de Producción y Entregas', exact: true })
  ).toBeVisible();
}

async function abrirControlGeneral(page: Page): Promise<void> {
  await abrirPestanaProduccion(page);
  await page.getByRole('button', { name: /Control general de planta/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Diagnóstico global de la planta', exact: true })
  ).toBeVisible();
}

/** Fila de un paso: se acota por el identificador entre paréntesis. */
function filaPaso(page: Page, id: string) {
  return page
    .getByText(`(${id})`, { exact: true })
    .first()
    .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
}

test.beforeEach(async () => {
  // Estado de partida conocido: sin el ciclo PROC-ACABADO -> INS-PIEZA-CORTADA.
  await eliminarCiclo();
});

test.afterEach(async () => {
  await eliminarCiclo();
});

test.describe('Plan de entrega y control general de planta', () => {
  test('AC-F3-10 muestra los pasos numerados y el estado del producto del backend', async ({
    page
  }) => {
    const [producto] = await leerProductos();
    expect(producto).toBeDefined();
    const plan = await leerPlan([producto.id]);

    await abrirAplicacion(page);
    await abrirPestanaProduccion(page);

    // La subvista por defecto es el plan de entrega del primer producto.
    await expect(
      page.getByRole('heading', { name: `Secuencia de preparación (${plan.totalPasos} pasos)` })
    ).toBeVisible();
    await expect(page.getByText(producto.id, { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(
        plan.productos[0].estado === 'PLANIFICABLE' ? 'Planificable' : 'Bloqueado',
        { exact: true }
      )
    ).toBeVisible();

    expect(plan.pasos).toHaveLength(plan.totalPasos);
    for (const paso of plan.pasos) {
      const fila = filaPaso(page, paso.id);
      await expect(fila.getByText(String(paso.paso), { exact: true })).toBeVisible();
      await expect(fila.getByText(paso.nombre, { exact: true })).toBeVisible();
      await expect(fila.getByText(ETIQUETA_TIPO[paso.tipo], { exact: true })).toBeVisible();
    }

    // Cada paso aparece una sola vez en la secuencia.
    for (const paso of plan.pasos) {
      await expect(page.getByText(`(${paso.id})`, { exact: true })).toHaveCount(1);
    }
  });

  test('AC-F3-10b en un catálogo acíclico muestra el orden global completo', async ({ page }) => {
    const orden = await leerOrden();
    expect(orden.esDag).toBe(true);
    expect(orden.orden).toHaveLength(orden.totalPasos);

    await abrirAplicacion(page);
    await abrirControlGeneral(page);

    await expect(page.getByText('Cadena de planta sin dependencias circulares')).toBeVisible();
    await expect(page.getByText('Planta sincronizada')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: `Secuencia completa de fabricación (${orden.totalPasos} pasos)`
      })
    ).toBeVisible();
    await expect(page.getByText('Dependencias circulares detectadas')).toHaveCount(0);

    for (const paso of orden.orden) {
      await expect(page.getByText(`(${paso.id})`, { exact: true })).toBeVisible();
    }
  });

  test('AC-F3-10b con un ciclo muestra los ciclos y los elementos bloqueados', async ({
    page
  }) => {
    await crearCiclo();
    const orden = await leerOrden();
    expect(orden.esDag).toBe(false);
    expect(orden.orden).toEqual([]);
    expect(orden.totalPasos).toBe(0);
    expect(orden.ciclos.length).toBeGreaterThan(0);
    expect(orden.elementosBloqueados.length).toBeGreaterThan(0);

    await abrirAplicacion(page);
    await abrirControlGeneral(page);

    await expect(
      page.getByText('Se detectaron dependencias circulares en la planta')
    ).toBeVisible();
    await expect(page.getByText('Contradicción activa')).toBeVisible();
    await expect(page.getByText('Dependencias circulares detectadas')).toBeVisible();
    await expect(
      page.getByText(`Elementos bloqueados (${orden.elementosBloqueados.length})`)
    ).toBeVisible();

    for (const ciclo of orden.ciclos) {
      for (const id of ciclo.secuencia) {
        await expect(page.getByText(id, { exact: true }).first()).toBeVisible();
      }
    }
    for (const id of orden.elementosBloqueados) {
      await expect(page.getByText(id, { exact: true }).first()).toBeVisible();
    }

    // No se presenta el orden global ni un estado vacío como si todo estuviera bien.
    await expect(
      page.getByRole('heading', { name: /Secuencia completa de fabricación/i })
    ).toHaveCount(0);
    await expect(page.getByText('Cadena de planta sin dependencias circulares')).toHaveCount(0);
  });

  test('AC-F3-10b con un ciclo muestra los productos bloqueados', async ({ page }) => {
    await crearCiclo();
    const orden = await leerOrden();
    expect(orden.esDag).toBe(false);
    expect(orden.productosBloqueados.length).toBeGreaterThan(0);

    await abrirAplicacion(page);
    await abrirControlGeneral(page);

    // La alerta debe nombrar los productos bloqueados, no solo los elementos.
    await expect(page.getByText('Productos bloqueados', { exact: false })).toBeVisible();
    for (const id of orden.productosBloqueados) {
      await expect(page.getByText(id, { exact: true }).first()).toBeVisible();
    }
  });

  test('AC-UI-01 la vista y la guía no muestran términos técnicos prohibidos', async ({
    page
  }) => {
    const prohibidos =
      /\b(backend|frontend|API|endpoint|HTTP|409|CONFLICT|DAG|acíclico|topológico|secuenciación|Kahn|determinista|SCC|payload|JSON|Feature 1|Feature 2|F1|F2|F3|ID Técnico|motor de ordenamiento|grafo|nodo|arista)\b/i;

    await abrirAplicacion(page);
    await abrirPestanaProduccion(page);
    const textoVista = await page.locator('body').innerText();
    expect.soft(textoVista).not.toMatch(prohibidos);

    await page.getByRole('button', { name: 'Guía operativa' }).click();
    const guia = page.getByRole('dialog');
    await expect(guia.getByRole('heading', { name: 'Guía de uso de AbastecePyme' })).toBeVisible();
    const textoGuia = await guia.innerText();
    expect.soft(textoGuia).not.toMatch(prohibidos);
  });

  test('AC-UI-12 el orden global copiado está en español y sin términos técnicos', async ({
    page,
    context
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const orden = await leerOrden();
    expect(orden.esDag).toBe(true);
    expect(orden.orden.length).toBeGreaterThan(0);

    await abrirAplicacion(page);
    await abrirControlGeneral(page);
    await page.getByRole('button', { name: /Copiar orden global/i }).click();
    await expect(page.getByRole('button', { name: /Copiado/i })).toBeVisible();

    const texto = await page.evaluate(() => navigator.clipboard.readText());
    expect(texto).toContain('ORDEN GLOBAL DE PREPARACIÓN');
    expect(texto).toContain(orden.orden[0].nombre);
    expect(texto).toMatch(/Paso 1/);
    expect(texto).not.toMatch(
      /\b(backend|frontend|API|endpoint|HTTP|409|CONFLICT|DAG|acíclico|topológico|secuenciación|Kahn|determinista|SCC|payload|JSON|Feature 1|Feature 2|F1|F2|F3|ID Técnico|motor de ordenamiento|grafo|nodo|arista)\b/i
    );
    expect(texto).not.toMatch(/\b(200|404|409|4xx|5xx)\b/i);
  });

  test('AC-UI-04b la guía explica el plan de entrega y el control general de planta', async ({
    page
  }) => {
    await abrirAplicacion(page);
    await abrirPestanaProduccion(page);
    await page.getByRole('button', { name: 'Guía operativa' }).click();

    const guia = page.getByRole('dialog');
    await expect(guia.getByRole('heading', { name: 'Guía de uso de AbastecePyme' })).toBeVisible();
    const texto = await guia.innerText();

    expect.soft(texto).toMatch(/plan de entrega/i);
    expect.soft(texto).toMatch(/uno o más productos/i);
    expect.soft(texto).toMatch(/dependencias circulares/i);
    expect.soft(texto).toMatch(/productos bloqueados/i);
    expect.soft(texto).toMatch(/productos planificables/i);
  });
});
