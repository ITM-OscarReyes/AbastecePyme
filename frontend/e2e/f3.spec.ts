/**
 * Pestaña «Orden de producción» en navegador real contra el backend real.
 *
 * Comprueba AC-F3-07 (lista numerada de pasos para un catálogo acíclico) y
 * AC-F3-07b (alerta prominente cuando el catálogo contiene un ciclo). El ciclo
 * se crea y se elimina a través de la API para no dejar el catálogo de
 * demostración modificado.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const API = process.env.ABASTECEPYME_API_URL ?? 'http://127.0.0.1:8000';
const ORIGEN_CICLO = 'PROC-CORTE';
const DESTINO_CICLO = 'INS-BARRA';

interface PasoOrden {
  paso: number;
  id: string;
  tipo: string;
  nombre: string;
}

interface OrdenRespuesta {
  esDag: boolean;
  orden: PasoOrden[];
  totalPasos: number;
}

const ETIQUETA_TIPO: Record<string, string> = {
  PROVEEDOR: 'Proveedor',
  INSUMO: 'Suministro',
  PROCESO: 'Proceso',
  PRODUCTO: 'Producto'
};

async function leerOrden(): Promise<OrdenRespuesta> {
  const respuesta = await fetch(`${API}/api/v1/orden-produccion`);
  expect(respuesta.status).toBe(200);
  return (await respuesta.json()) as OrdenRespuesta;
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
    page.getByRole('heading', { name: 'Orden de Producción y Preparación' })
  ).toBeVisible();
}

test.beforeEach(async () => {
  // Estado de partida conocido: sin el ciclo PROC-CORTE -> INS-BARRA.
  await eliminarCiclo();
});

test.afterEach(async () => {
  await eliminarCiclo();
});

test.describe('Orden de producción en la interfaz', () => {
  test('AC-F3-07 muestra la lista numerada con los pasos del backend', async ({ page }) => {
    const orden = await leerOrden();
    expect(orden.esDag).toBe(true);
    expect(orden.totalPasos).toBeGreaterThan(0);

    await abrirAplicacion(page);
    await abrirPestanaProduccion(page);

    await expect(page.getByText('Secuencia Lineal de Fabricación Paso a Paso')).toBeVisible();
    await expect(
      page.getByText(`Mostrando ${orden.totalPasos} de ${orden.totalPasos} pasos`)
    ).toBeVisible();

    const etiquetas = page.getByText('ID Técnico del Catálogo:');
    await expect(etiquetas).toHaveCount(orden.totalPasos);

    for (const paso of orden.orden) {
      // El nombre no es único en el catálogo; se acota la fila por su id.
      const fila = page
        .getByText(paso.id, { exact: true })
        .first()
        .locator('xpath=ancestor::div[contains(@class,"flex-col")][1]');
      await expect(fila.getByRole('heading', { name: paso.nombre, exact: true })).toBeVisible();
      await expect(fila.getByText(ETIQUETA_TIPO[paso.tipo], { exact: true })).toBeVisible();
      // Cada fila muestra su número de paso (1..totalPasos).
      await expect(fila.getByText(String(paso.paso), { exact: true })).toBeVisible();
    }
  });

  test('AC-F3-07b alerta del ciclo y muestra los elementos involucrados', async ({ page }) => {
    await crearCiclo();

    const respuesta = await fetch(`${API}/api/v1/orden-produccion`);
    expect(respuesta.status).toBe(409);
    const cuerpo = (await respuesta.json()) as {
      error: { codigo: string; detalles: Array<{ campo: string; mensaje: string }> };
    };
    expect(cuerpo.error.codigo).toBe('CONFIGURACION_CICLICA');

    await abrirAplicacion(page);
    await abrirPestanaProduccion(page);

    await expect(page.getByText('BLOQUEO CRÍTICO: CONFIGURACIÓN CÍCLICA')).toBeVisible();
    await expect(page.getByText('Lazo de Dependencia Circular Detectado')).toBeVisible();
    await expect(page.getByText('Componentes Bloqueados para Producción')).toBeVisible();
    await expect(page.getByText(ORIGEN_CICLO, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(DESTINO_CICLO, { exact: true }).first()).toBeVisible();

    // No se presenta el estado de catálogo vacío ni un plan parcial.
    await expect(page.getByText('Catálogo sin componentes')).toHaveCount(0);
    await expect(page.getByText('Secuencia Lineal de Fabricación Paso a Paso')).toHaveCount(0);
  });
});
