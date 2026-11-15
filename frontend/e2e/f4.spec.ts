/**
 * Tablero de abastecimiento (F4) en navegador real contra el backend real.
 *
 * Cubre los criterios de interfaz de F4 sobre el catálogo de demostración
 * (27 elementos y 37 dependencias) y las respuestas reales de la API:
 * - AC-F4-01: al abrir la aplicación la sección activa es «Tablero» y hay
 *   cinco secciones de navegación.
 * - AC-F4-01b: el tablero es usable a 360 px (menú móvil) y no provoca
 *   desplazamiento horizontal a 360, 768, 1024, 1440 y 1920 px.
 * - AC-F4-02 / AC-F4-03: los totales del resumen coinciden con
 *   `GET /api/v1/grafo` y con `GET /api/v1/orden-produccion`.
 * - AC-F4-05: se muestran el plan del primer producto y el diagnóstico global.
 * - AC-F4-04 / AC-F4-04b: la consulta rápida de impacto muestra los afectados
 *   reales y distingue el producto terminal sin afectados.
 * - AC-F4-09 / AC-F4-09c: el control de perfil condiciona las acciones de
 *   escritura y refleja el perfil activo.
 * - AC-F4-13 / AC-F4-13b: no hay términos técnicos prohibidos y el tema
 *   claro/oscuro alterna con un único control.
 *
 * Las pruebas leen los valores esperados de la API y los comparan con lo que
 * muestra la pantalla. No hay dobles de red ni datos incrustados.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const API = process.env.ABASTECEPYME_API_URL ?? 'http://127.0.0.1:8000';

const SECCIONES_ESCRITORIO = [
  'Tablero',
  'Cadena de Suministro',
  'Materiales & Procesos',
  'Análisis de impacto',
  'Orden de producción'
];

const SECCIONES_MOVIL = [
  'Tablero General',
  'Cadena de Suministro',
  'Materiales & Procesos',
  'Análisis de impacto',
  'Orden de producción'
];

interface ElementoGrafo {
  id: string;
  tipo: 'PROVEEDOR' | 'INSUMO' | 'PROCESO' | 'PRODUCTO';
  nombre: string;
  alertaStock?: boolean;
}

interface RespuestaGrafo {
  elementos: ElementoGrafo[];
  dependencias: { origen: string; destino: string }[];
  resumen: { totalElementos: number; totalDependencias: number };
}

interface ImpactoRespuesta {
  elemento: ElementoGrafo;
  afectados: ElementoGrafo[];
  total: number;
}

interface PasoProduccion {
  paso: number;
  id: string;
  tipo: string;
  nombre: string;
}

interface PlanEntregaRespuesta {
  productos: { id: string; estado: string }[];
  esPlanificable: boolean;
  pasos: PasoProduccion[];
  totalPasos: number;
}

interface OrdenProduccionRespuesta {
  esDag: boolean;
  totalPasos: number;
  productosPlanificables: string[];
}

/** Código de planta que muestra la interfaz para un identificador. */
function codigoSku(id: string): string {
  return /\d/.test(id) ? id : `${id}-01`;
}

async function leerGrafo(): Promise<RespuestaGrafo> {
  const respuesta = await fetch(`${API}/api/v1/grafo`);
  expect(respuesta.status).toBe(200);
  return (await respuesta.json()) as RespuestaGrafo;
}

async function leerImpacto(id: string): Promise<ImpactoRespuesta> {
  const respuesta = await fetch(`${API}/api/v1/impacto/${encodeURIComponent(id)}`);
  expect(respuesta.status).toBe(200);
  return (await respuesta.json()) as ImpactoRespuesta;
}

async function leerPlan(productoId: string): Promise<PlanEntregaRespuesta> {
  const respuesta = await fetch(
    `${API}/api/v1/plan-entrega?productos=${encodeURIComponent(productoId)}`
  );
  expect(respuesta.status).toBe(200);
  return (await respuesta.json()) as PlanEntregaRespuesta;
}

async function leerOrden(): Promise<OrdenProduccionRespuesta> {
  const respuesta = await fetch(`${API}/api/v1/orden-produccion`);
  expect(respuesta.status).toBe(200);
  return (await respuesta.json()) as OrdenProduccionRespuesta;
}

function contarPorTipo(grafo: RespuestaGrafo, tipo: ElementoGrafo['tipo']): number {
  return grafo.elementos.filter((elemento) => elemento.tipo === tipo).length;
}

async function abrirAplicacion(page: Page): Promise<void> {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Tablero de Control de Abastecimiento', exact: true })
  ).toBeVisible();
}

/** Espera a que el navegador complete un ciclo de pintado tras cambiar el viewport. */
async function esperarPintado(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolver) => requestAnimationFrame(() => requestAnimationFrame(() => resolver())))
  );
}

test.describe('Tablero de abastecimiento (F4)', () => {
  test('AC-F4-01 al abrir la aplicación la sección activa es Tablero y hay cinco secciones', async ({
    page
  }) => {
    await abrirAplicacion(page);

    // Contenido propio del tablero: sección activa por defecto.
    await expect(
      page.getByRole('heading', { name: 'Diagnóstico General de Planta', exact: true })
    ).toBeVisible();

    const nav = page.locator('nav');
    await expect(nav).toHaveCount(1);
    for (const seccion of SECCIONES_ESCRITORIO) {
      await expect(
        nav.getByRole('button', { name: new RegExp(seccion.replace('&', '\\&')) })
      ).toBeVisible();
    }
    await expect(nav.getByRole('button')).toHaveCount(5);
  });

  test('AC-F4-02 y AC-F4-03 el resumen refleja los totales reales del backend', async ({
    page
  }) => {
    const grafo = await leerGrafo();
    const orden = await leerOrden();

    await abrirAplicacion(page);

    const tarjetaProveedores = page.locator('[title="Ver únicamente proveedores en el catálogo"]');
    await expect(tarjetaProveedores.locator('.tabular-nums')).toHaveText(
      String(contarPorTipo(grafo, 'PROVEEDOR'))
    );

    const tarjetaInsumos = page.locator(
      '[title="Ver únicamente materias primas e insumos en el catálogo"]'
    );
    await expect(tarjetaInsumos.locator('.tabular-nums')).toHaveText(
      String(contarPorTipo(grafo, 'INSUMO'))
    );

    const tarjetaProcesos = page.locator('[title="Ver únicamente procesos de planta en el catálogo"]');
    await expect(tarjetaProcesos.locator('.tabular-nums')).toHaveText(
      String(contarPorTipo(grafo, 'PROCESO'))
    );

    const tarjetaProductos = page.locator('[title="Ver planes de producción de productos"]');
    await expect(tarjetaProductos.locator('.tabular-nums')).toHaveText(
      String(contarPorTipo(grafo, 'PRODUCTO'))
    );
    await expect(tarjetaProductos).toContainText(
      `${orden.productosPlanificables.length} listos`
    );

    const tarjetaRed = page.locator('[title="Ver red de suministro completa"]');
    await expect(tarjetaRed.locator('.tabular-nums')).toHaveText(
      String(grafo.resumen.totalDependencias)
    );
  });

  test('AC-F4-03c el resumen señala los insumos con alerta de stock del backend', async ({
    page
  }) => {
    const grafo = await leerGrafo();
    const enAlerta = grafo.elementos.filter(
      (elemento) => elemento.tipo === 'INSUMO' && elemento.alertaStock
    );
    expect(enAlerta.length).toBeGreaterThan(0);

    await abrirAplicacion(page);

    await expect(
      page.getByRole('heading', { name: 'Alertas de Suministro y Stock', exact: true })
    ).toBeVisible();
    await expect(page.getByText(`${enAlerta.length} bajo mín.`)).toBeVisible();

    for (const insumo of enAlerta) {
      await expect(page.getByText(insumo.nombre, { exact: true }).first()).toBeVisible();
    }
  });

  test('AC-F4-05 el tablero muestra el plan del primer producto y el diagnóstico global', async ({
    page
  }) => {
    const grafo = await leerGrafo();
    const producto = grafo.elementos.find((elemento) => elemento.tipo === 'PRODUCTO');
    expect(producto).toBeDefined();
    const plan = await leerPlan(producto!.id);
    const orden = await leerOrden();
    expect(orden.esDag).toBe(true);

    await abrirAplicacion(page);

    // Diagnóstico global real de `GET /orden-produccion`.
    await expect(page.getByText('Cadena sin dependencias circulares', { exact: true })).toBeVisible();

    // Plan de entrega del primer producto del catálogo (seleccionado por defecto).
    const pasos = page.locator('.max-h-56');
    await expect(page.getByText(`(${plan.totalPasos} operaciones)`, { exact: true })).toBeVisible();
    expect(plan.pasos).toHaveLength(plan.totalPasos);
    for (const paso of plan.pasos) {
      await expect(pasos.getByText(paso.nombre, { exact: true })).toBeVisible();
      await expect(pasos.getByText(codigoSku(paso.id), { exact: true })).toBeVisible();
    }
  });

  test('AC-F4-04 la consulta rápida de impacto muestra los afectados reales', async ({ page }) => {
    const impacto = await leerImpacto('INS-BARNIZ');
    expect(impacto.total).toBeGreaterThan(0);

    await abrirAplicacion(page);

    await page.locator('select').selectOption('INS-BARNIZ');
    await page.getByRole('button', { name: 'Evaluar' }).click();

    await expect(page.getByText(`${impacto.total} afectados`, { exact: true })).toBeVisible();
    const afectados = page.locator('.max-h-44');
    for (const afectado of impacto.afectados) {
      await expect(afectados.getByText(afectado.nombre, { exact: true })).toBeVisible();
    }
  });

  test('AC-F4-04b un producto terminal no afecta a otros elementos', async ({ page }) => {
    const grafo = await leerGrafo();
    const producto = grafo.elementos.find((elemento) => elemento.tipo === 'PRODUCTO');
    expect(producto).toBeDefined();
    const impacto = await leerImpacto(producto!.id);
    expect(impacto.total).toBe(0);

    await abrirAplicacion(page);

    await page.locator('select').selectOption(producto!.id);
    await page.getByRole('button', { name: 'Evaluar' }).click();

    await expect(page.getByText('0 afectados', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Este componente no afecta a otros elementos de la cadena.', { exact: true })
    ).toBeVisible();
    await expect(page.locator('.max-h-44')).toHaveCount(0);
  });

  test('AC-F4-06 el tablero conduce a la red con la dirección origen habilita destino', async ({
    page
  }) => {
    const grafo = await leerGrafo();

    await abrirAplicacion(page);

    // La leyenda del tablero explica que el origen habilita al destino.
    await expect(
      page.getByText('Relaciones origen habilita destino', { exact: true })
    ).toBeVisible();

    // El tablero conduce a la red de suministro real.
    await page.locator('[title="Ver red de suministro completa"]').click();
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

  test('AC-F4-10 el impacto resalta el elemento y exactamente sus afectados en la red', async ({
    page
  }) => {
    const impacto = await leerImpacto('INS-BARNIZ');
    expect(impacto.total).toBeGreaterThan(0);

    await abrirAplicacion(page);

    await page.locator('select').selectOption('INS-BARNIZ');
    await page.getByRole('button', { name: 'Evaluar' }).click();
    await expect(page.getByText(`${impacto.total} afectados`, { exact: true })).toBeVisible();

    // El tablero conduce a la red con el elemento consultado.
    await page.getByRole('button', { name: 'Ver en el mapa' }).click();
    await expect(page.locator('canvas').first()).toBeVisible();

    // El elemento consultado queda resaltado en el lienzo.
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const contenedor = document.querySelector('.graph-canvas-bg') as (Element & {
            _cyreg?: { cy: { getElementById: (id: string) => { data: (k: string) => unknown } } };
          }) | null;
          const cy = contenedor?._cyreg?.cy;
          return cy?.getElementById('INS-BARNIZ').data('borderWidth') ?? -1;
        })
      )
      .toBe(4);

    const resaltados = await page.evaluate(() => {
      const contenedor = document.querySelector('.graph-canvas-bg') as (Element & {
        _cyreg?: {
          cy: {
            nodes: () => ArrayLike<{ id: () => string; data: (k: string) => unknown }>;
          };
        };
      }) | null;
      const cy = contenedor?._cyreg?.cy;
      const nodos = Array.from(cy?.nodes() ?? []).map((nodo) => ({
        id: nodo.id(),
        borde: nodo.data('borderWidth') as number,
        etiqueta: String(nodo.data('label'))
      }));
      return {
        seleccionado: nodos.filter((nodo) => nodo.borde === 4).map((nodo) => nodo.id),
        afectados: nodos.filter((nodo) => nodo.etiqueta.startsWith('⚠️')).map((nodo) => nodo.id)
      };
    });

    expect(resaltados.seleccionado).toEqual(['INS-BARNIZ']);
    expect(new Set(resaltados.afectados)).toEqual(new Set(impacto.afectados.map((a) => a.id)));
  });

  test('AC-F4-10b la línea del producto resalta sus requisitos según el plan de la API', async ({
    page
  }) => {
    const grafo = await leerGrafo();
    const producto = grafo.elementos.find((elemento) => elemento.tipo === 'PRODUCTO');
    expect(producto).toBeDefined();
    const plan = await leerPlan(producto!.id);

    await abrirAplicacion(page);

    // El tablero selecciona el primer producto y permite ver su línea en el mapa.
    await page.getByRole('button', { name: 'Ver línea en el mapa' }).click();
    await expect(page.locator('canvas').first()).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const contenedor = document.querySelector('.graph-canvas-bg') as (Element & {
            _cyreg?: {
              cy: { nodes: () => ArrayLike<{ data: (k: string) => unknown }> };
            };
          }) | null;
          const cy = contenedor?._cyreg?.cy;
          return Array.from(cy?.nodes() ?? []).filter((nodo) => nodo.data('opacidad') === 1)
            .length;
        })
      )
      .toBeGreaterThan(0);

    const resaltados = await page.evaluate(() => {
      const contenedor = document.querySelector('.graph-canvas-bg') as (Element & {
        _cyreg?: {
          cy: {
            nodes: () => ArrayLike<{ id: () => string; data: (k: string) => unknown }>;
          };
        };
      }) | null;
      const cy = contenedor?._cyreg?.cy;
      return Array.from(cy?.nodes() ?? [])
        .filter((nodo) => nodo.data('opacidad') === 1)
        .map((nodo) => nodo.id());
    });

    // Los requisitos resaltados son exactamente los pasos del plan que devuelve la API.
    expect(new Set(resaltados)).toEqual(new Set(plan.pasos.map((paso) => paso.id)));
  });

  test('AC-F4-09 y AC-F4-09c el perfil condiciona las acciones de escritura', async ({ page }) => {
    await abrirAplicacion(page);

    const botonPerfil = page.locator('[title="Cambiar perfil de usuario"]');
    const botonNuevo = page.getByRole('button', { name: 'Nuevo Componente' });
    const botonRelacion = page.getByRole('button', { name: 'Crear relación' });

    // Sesión inicial de demostración: perfil de compras con escritura.
    await expect(botonPerfil).toContainText('Responsable de compras');
    await expect(botonNuevo).toBeEnabled();
    await expect(botonRelacion).toBeEnabled();

    // Cambio a Coordinador de producción: se cierra la sesión y se bloquea la edición.
    await botonPerfil.click();
    await page.getByRole('button', { name: /Coordinador de producción/ }).click();

    await expect(botonPerfil).toContainText('Coordinador de producción');
    await expect(botonNuevo).toBeDisabled();
    await expect(botonRelacion).toBeDisabled();
    await expect(botonNuevo).toHaveAttribute(
      'title',
      'Acción restringida: solo disponible para Responsable de compras'
    );

    // Vuelta al perfil de compras: la edición se habilita de nuevo.
    await botonPerfil.click();
    await page.getByRole('button', { name: /Responsable de compras/ }).click();

    await expect(botonPerfil).toContainText('Responsable de compras');
    await expect(botonNuevo).toBeEnabled();
    await expect(botonRelacion).toBeEnabled();
  });

  test('AC-F4-13 el tablero no muestra términos técnicos prohibidos ni códigos HTTP', async ({
    page
  }) => {
    const prohibidos =
      /\b(backend|frontend|API|endpoint|HTTP|409|CONFLICT|DAG|acíclico|topológico|secuenciación|Kahn|determinista|SCC|payload|JSON|Feature 1|Feature 2|F1|F2|F3|ID Técnico|motor de ordenamiento|grafo|nodo|arista)\b/i;

    await abrirAplicacion(page);
    const texto = await page.locator('body').innerText();

    expect.soft(texto).not.toMatch(prohibidos);
    expect.soft(texto).not.toMatch(/\b(200|201|204|400|401|403|404|409|422|500|4xx|5xx)\b/);
  });

  test('AC-F4-13b el tablero alterna entre tema claro y oscuro con un único control', async ({
    page
  }) => {
    await abrirAplicacion(page);

    const controlTema = page.getByRole('button', { name: 'Alternar tema de interfaz' });
    await expect(controlTema).toHaveCount(1);

    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    await controlTema.click();
    await expect(html).not.toHaveClass(/dark/);

    await controlTema.click();
    await expect(html).toHaveClass(/dark/);
  });

  test('AC-F4-01b el tablero es usable a 360 px y no desborda horizontalmente', async ({
    page
  }) => {
    for (const ancho of [360, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width: ancho, height: 800 });
      await abrirAplicacion(page);
      await esperarPintado(page);

      const desborde = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect.soft(desborde, `desborde horizontal a ${ancho}px`).toBeLessThanOrEqual(1);
    }
  });

  test('AC-F4-01b en móvil las cinco secciones son alcanzables desde el menú', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await abrirAplicacion(page);

    const abrirMenu = page.getByRole('button', { name: 'Abrir menú de navegación' });
    await expect(abrirMenu).toBeVisible();
    await abrirMenu.click();

    const navMovil = page.getByRole('navigation', { name: 'Navegación móvil' });
    await expect(navMovil).toBeVisible();
    for (const seccion of SECCIONES_MOVIL) {
      await expect(
        navMovil.getByRole('button', { name: new RegExp(seccion.replace('&', '\\&')) })
      ).toBeVisible();
    }
  });
});
