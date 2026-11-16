/**
 * QA independiente de F4 — Tablero de abastecimiento (interfaz).
 *
 * Verifica, con el cliente de API sustituido por dobles autocontenidos (sin
 * depender de un backend levantado), los criterios de interfaz de F4:
 *
 * - AC-F4-02 / 05: el tablero compone diagnóstico, plan e impacto desde la API.
 * - AC-F4-03 / 03b / 03c: resumen, estado vacío y alerta de stock del backend.
 * - AC-F4-04: impacto consultado en el tablero refleja los afectados de la API.
 * - AC-F4-05b: alerta de ciclo sin orden ni plan presentados como válidos.
 * - AC-F4-09 / 09b / 09c / 09d: interfaz condicionada por perfil.
 * - AC-F4-09b / RNF-F4-02: la sesión viaja en la cabecera Authorization.
 * - AC-F4-02b / AC-F4-15: revisión estática de la separación de capas.
 *
 * No modifica ni sustituye las pruebas de F1, F2 o F3. Las comprobaciones de
 * arquitectura complementan (no reemplazan) a `arquitectura.test.ts`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiClient, apiService } from '../services/api';
import { VistaTablero } from '../components/VistaTablero';
import { HeaderNavbar } from '../components/HeaderNavbar';
import type {
  ImpactoRespuesta,
  OrdenProduccionRespuesta,
  Perfil,
  PlanEntregaRespuesta,
  RespuestaGrafo,
  Elemento
} from '../types';

afterEach(() => {
  vi.restoreAllMocks();
  apiService.establecerTokenSesion(null);
});

const RAIZ = process.cwd();
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8');

function elemento(
  id: string,
  tipo: Elemento['tipo'],
  nombre: string,
  extra: Partial<Elemento> = {}
): Elemento {
  return {
    id,
    tipo,
    nombre,
    descripcion: null,
    stockDisponible: null,
    stockMinimo: null,
    estadoStock: 'NO_APLICA',
    alertaStock: false,
    ...extra
  };
}

/** Conjunto A de §11.1 con un insumo en alerta de stock (AC-F4-03c). */
function grafoConjuntoA(): RespuestaGrafo {
  return {
    elementos: [
      elemento('PROV-ACERO', 'PROVEEDOR', 'Proveedor de acero'),
      elemento('INS-BARRA', 'INSUMO', 'Barra de acero', {
        estadoStock: 'BAJO',
        alertaStock: true,
        stockDisponible: 2,
        stockMinimo: 10
      }),
      elemento('INS-TORNILLO', 'INSUMO', 'Tornillo hexagonal M6'),
      elemento('PROC-CORTE', 'PROCESO', 'Corte de panel'),
      elemento('PROD-PANEL', 'PRODUCTO', 'Panel de montaje'),
      elemento('PROD-BANCO', 'PRODUCTO', 'Banco de montaje')
    ],
    dependencias: [
      { origen: 'PROV-ACERO', destino: 'INS-BARRA', tipoRelacion: 'habilita' },
      { origen: 'PROV-ACERO', destino: 'INS-TORNILLO', tipoRelacion: 'habilita' },
      { origen: 'INS-BARRA', destino: 'PROC-CORTE', tipoRelacion: 'habilita' },
      { origen: 'INS-TORNILLO', destino: 'PROC-CORTE', tipoRelacion: 'habilita' },
      { origen: 'PROC-CORTE', destino: 'PROD-PANEL', tipoRelacion: 'habilita' },
      { origen: 'PROC-CORTE', destino: 'PROD-BANCO', tipoRelacion: 'habilita' }
    ],
    resumen: { totalElementos: 6, totalDependencias: 6 }
  };
}

const ORDEN_DAG: OrdenProduccionRespuesta = {
  esDag: true,
  orden: [
    { paso: 1, id: 'PROV-ACERO', tipo: 'PROVEEDOR', nombre: 'Proveedor de acero' },
    { paso: 2, id: 'INS-BARRA', tipo: 'INSUMO', nombre: 'Barra de acero' },
    { paso: 3, id: 'INS-TORNILLO', tipo: 'INSUMO', nombre: 'Tornillo hexagonal M6' },
    { paso: 4, id: 'PROC-CORTE', tipo: 'PROCESO', nombre: 'Corte de panel' },
    { paso: 5, id: 'PROD-BANCO', tipo: 'PRODUCTO', nombre: 'Banco de montaje' },
    { paso: 6, id: 'PROD-PANEL', tipo: 'PRODUCTO', nombre: 'Panel de montaje' }
  ],
  totalPasos: 6,
  ciclos: [],
  elementosBloqueados: [],
  productosBloqueados: [],
  productosPlanificables: ['PROD-BANCO', 'PROD-PANEL']
};

const PLAN_PANEL: PlanEntregaRespuesta = {
  productos: [
    { id: 'PROD-PANEL', tipo: 'PRODUCTO', nombre: 'Panel de montaje', estado: 'PLANIFICABLE' }
  ],
  esPlanificable: true,
  pasos: [
    { paso: 1, id: 'PROV-ACERO', tipo: 'PROVEEDOR', nombre: 'Proveedor de acero' },
    { paso: 2, id: 'INS-BARRA', tipo: 'INSUMO', nombre: 'Barra de acero' },
    { paso: 3, id: 'INS-TORNILLO', tipo: 'INSUMO', nombre: 'Tornillo hexagonal M6' },
    { paso: 4, id: 'PROC-CORTE', tipo: 'PROCESO', nombre: 'Corte de panel' },
    { paso: 5, id: 'PROD-PANEL', tipo: 'PRODUCTO', nombre: 'Panel de montaje' }
  ],
  totalPasos: 5,
  ciclos: [],
  elementosBloqueados: []
};

const IMPACTO_BARRA: ImpactoRespuesta = {
  elemento: elemento('INS-BARRA', 'INSUMO', 'Barra de acero'),
  afectados: [
    elemento('PROC-CORTE', 'PROCESO', 'Corte de panel'),
    elemento('PROD-BANCO', 'PRODUCTO', 'Banco de montaje'),
    elemento('PROD-PANEL', 'PRODUCTO', 'Panel de montaje')
  ],
  total: 3,
  resumenStock: { totalSuministros: 1, suministrosBajoMinimo: 0 }
};

const PERFILES: Perfil[] = [
  { id: 'COMPRAS', nombre: 'Responsable de compras', puedeEscribir: true },
  { id: 'PRODUCCION', nombre: 'Coordinador de producción', puedeEscribir: false }
];

function renderTablero(grafo: RespuestaGrafo = grafoConjuntoA()) {
  const props = {
    grafo,
    cargandoGrafo: false,
    errorGrafo: null,
    onRecargarGrafo: vi.fn(),
    onNavegar: vi.fn(),
    onConsultarElemento: vi.fn(),
    perfilActivo: PERFILES[0]
  };
  return render(React.createElement(VistaTablero, props));
}

// ---------------------------------------------------------------------------
// AC-F4-02 / 05 — El tablero compone las consultas reales
// ---------------------------------------------------------------------------


describe('F4 · VistaTablero compone diagnóstico, plan e impacto (AC-F4-02/04/05)', () => {
  it('AC-F4-02/05 muestra el diagnóstico y el plan de PROD-PANEL desde la API', async () => {
    const orden = vi.spyOn(apiService, 'obtenerOrdenProduccion').mockResolvedValue(ORDEN_DAG);
    const plan = vi.spyOn(apiService, 'obtenerPlanEntrega').mockResolvedValue(PLAN_PANEL);

    renderTablero();

    expect(await screen.findByText('Cadena sin dependencias circulares')).toBeDefined();
    expect(orden).toHaveBeenCalledTimes(1);
    expect(plan).toHaveBeenCalledWith(['PROD-PANEL']);
    expect(await screen.findByText('Viable para entrega')).toBeDefined();
    expect(screen.getByText(/\(5 operaciones\)/)).toBeDefined();
    // Los pasos se presentan tal cual los devuelve la API.
    expect(screen.getByText('Proveedor de acero')).toBeDefined();
    expect(screen.getAllByText('Panel de montaje').length).toBeGreaterThan(0);
  });

  it('AC-F4-04 la consulta de impacto muestra los afectados de la API', async () => {
    vi.spyOn(apiService, 'obtenerOrdenProduccion').mockResolvedValue(ORDEN_DAG);
    vi.spyOn(apiService, 'obtenerPlanEntrega').mockResolvedValue(PLAN_PANEL);
    const impacto = vi.spyOn(apiService, 'obtenerImpacto').mockResolvedValue(IMPACTO_BARRA);

    renderTablero();
    await screen.findByText('Cadena sin dependencias circulares');

    const selector = screen.getByRole('combobox');
    fireEvent.change(selector, { target: { value: 'INS-BARRA' } });
    fireEvent.click(screen.getByText('Evaluar'));

    expect(await screen.findByText('3 afectados')).toBeDefined();
    expect(impacto).toHaveBeenCalledWith('INS-BARRA');
    expect(screen.getAllByText('Corte de panel').length).toBeGreaterThan(0);
  });

  it('AC-F4-03c refleja la alerta de stock del backend sin recalcularla', async () => {
    vi.spyOn(apiService, 'obtenerOrdenProduccion').mockResolvedValue(ORDEN_DAG);
    vi.spyOn(apiService, 'obtenerPlanEntrega').mockResolvedValue(PLAN_PANEL);

    renderTablero();

    expect(await screen.findByText('1 bajo mín.')).toBeDefined();
  });

  it('AC-F4-03b catálogo vacío muestra estado vacío sin productos de ejemplo', async () => {
    vi.spyOn(apiService, 'obtenerOrdenProduccion').mockResolvedValue({
      ...ORDEN_DAG,
      orden: [],
      totalPasos: 0,
      productosPlanificables: []
    });

    renderTablero({
      elementos: [],
      dependencias: [],
      resumen: { totalElementos: 0, totalDependencias: 0 }
    });

    expect(
      await screen.findByText('No hay productos finales registrados en el catálogo.')
    ).toBeDefined();
  });

  it('AC-F4-05b con ciclo muestra alerta y bloqueo sin orden falso', async () => {
    vi.spyOn(apiService, 'obtenerOrdenProduccion').mockResolvedValue({
      esDag: false,
      orden: [],
      totalPasos: 0,
      ciclos: [{ secuencia: ['INS-BARRA', 'PROC-CORTE', 'INS-BARRA'] }],
      elementosBloqueados: ['INS-BARRA', 'PROC-CORTE', 'PROD-BANCO', 'PROD-PANEL'],
      productosBloqueados: ['PROD-BANCO', 'PROD-PANEL'],
      productosPlanificables: []
    });
    vi.spyOn(apiService, 'obtenerPlanEntrega').mockResolvedValue({
      productos: [
        { id: 'PROD-PANEL', tipo: 'PRODUCTO', nombre: 'Panel de montaje', estado: 'BLOQUEADO' }
      ],
      esPlanificable: false,
      pasos: [],
      totalPasos: 0,
      ciclos: [{ secuencia: ['INS-BARRA', 'PROC-CORTE', 'INS-BARRA'] }],
      elementosBloqueados: ['INS-BARRA', 'PROC-CORTE', 'PROD-PANEL']
    });

    renderTablero();

    expect(await screen.findByText('Alerta: Dependencia circular detectada')).toBeDefined();
    expect(screen.queryByText('Cadena sin dependencias circulares')).toBeNull();
    expect(screen.getByText('Bloqueado')).toBeDefined();
  });

  it('AC-F4-14 cada bloque muestra su propio error sin ocultar los demás', async () => {
    vi.spyOn(apiService, 'obtenerOrdenProduccion').mockRejectedValue(new Error('sin conexión'));
    vi.spyOn(apiService, 'obtenerPlanEntrega').mockResolvedValue(PLAN_PANEL);

    renderTablero();

    expect(await screen.findByText('Atención en la secuencia operativa')).toBeDefined();
    expect(screen.getByText('Viable para entrega')).toBeDefined();
  });

  it('AC-F4-04d si el backend no responde el bloque de impacto no inventa datos', async () => {
    vi.spyOn(apiService, 'obtenerOrdenProduccion').mockResolvedValue(ORDEN_DAG);
    vi.spyOn(apiService, 'obtenerPlanEntrega').mockResolvedValue(PLAN_PANEL);
    vi.spyOn(apiService, 'obtenerImpacto').mockRejectedValue(new Error('sin conexión'));

    const { container } = renderTablero();
    await screen.findByText('Cadena sin dependencias circulares');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'INS-BARRA' } });
    fireEvent.click(screen.getByText('Evaluar'));

    // Mensaje explícito de no disponibilidad, sin lista de afectados ni resultados simulados.
    expect(await screen.findByText('No se pudo evaluar el impacto:')).toBeDefined();
    expect(screen.queryByText(/\d+ afectados/)).toBeNull();
    expect(container.querySelector('.max-h-44')).toBeNull();
  });

  it('AC-F4-13c los estados de stock, plan y diagnóstico incluyen texto, no solo color', async () => {
    vi.spyOn(apiService, 'obtenerOrdenProduccion').mockResolvedValue(ORDEN_DAG);
    vi.spyOn(apiService, 'obtenerPlanEntrega').mockResolvedValue(PLAN_PANEL);

    renderTablero();

    // Cada estado relevante lleva una etiqueta textual legible además del color.
    expect(await screen.findByText('1 bajo mín.')).toBeDefined();
    expect(await screen.findByText('Viable para entrega')).toBeDefined();
    expect(screen.getByText('Cadena sin dependencias circulares')).toBeDefined();
    expect(screen.getByText('Conexiones de Red')).toBeDefined();
    expect(screen.getByText('Relaciones origen habilita destino')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC-F4-09 / 09b / 09c / 09d — Interfaz condicionada por perfil
// ---------------------------------------------------------------------------


describe('F4 · HeaderNavbar condiciona las escrituras por perfil (AC-F4-09)', () => {
  function renderNavbar(puedeEscribir: boolean, overrides: Record<string, unknown> = {}) {
    const props = {
      tabActiva: 'tablero' as const,
      onTabChange: vi.fn(),
      onAbrirModalElemento: vi.fn(),
      onAbrirModalDependencia: vi.fn(),
      apiConectada: true,
      esModoOscuro: false,
      onToggleModoOscuro: vi.fn(),
      perfilActivo: PERFILES[0],
      perfilesDisponibles: PERFILES,
      onCambiarPerfil: vi.fn(),
      puedeEscribir,
      ...overrides
    };
    return render(React.createElement(HeaderNavbar, props));
  }

  it('AC-F4-09 sin permiso deshabilita Nuevo Componente y Crear relación', () => {
    renderNavbar(false);

    expect(screen.getByLabelText('Nuevo Componente')).toBeDisabled();
    expect(screen.getByLabelText('Crear relación')).toBeDisabled();
  });

  it('AC-F4-09d el mensaje de permiso explica el perfil y no muestra códigos HTTP', () => {
    renderNavbar(false);

    const titulo = screen.getByLabelText('Nuevo Componente').getAttribute('title') ?? '';
    expect(titulo).toContain('Responsable de compras');
    expect(titulo).not.toMatch(/40[13]/);
  });

  it('AC-F4-09b con permiso habilita las acciones de escritura', () => {
    const onAbrirModalElemento = vi.fn();
    const onAbrirModalDependencia = vi.fn();
    renderNavbar(true, { onAbrirModalElemento, onAbrirModalDependencia });

    const nuevo = screen.getByLabelText('Nuevo Componente');
    expect(nuevo).not.toBeDisabled();
    fireEvent.click(nuevo);
    expect(onAbrirModalElemento).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Crear relación'));
    expect(onAbrirModalDependencia).toHaveBeenCalled();
  });

  it('AC-F4-09c el selector muestra el perfil activo y permite cambiarlo', () => {
    const onCambiarPerfil = vi.fn();
    renderNavbar(true, { onCambiarPerfil });

    expect(screen.getByText('Edición permitida')).toBeDefined();
    fireEvent.click(screen.getByTitle('Cambiar perfil de usuario'));
    fireEvent.click(screen.getByText('Coordinador de producción'));

    expect(onCambiarPerfil).toHaveBeenCalledWith('PRODUCCION');
  });

  it('AC-F4-09c con PRODUCCION el selector indica solo consulta', () => {
    renderNavbar(false, { perfilActivo: PERFILES[1] });

    expect(screen.getByText('Solo consulta')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC-F4-09b / RNF-F4-02 — La sesión viaja en la cabecera Authorization
// ---------------------------------------------------------------------------


describe('F4 · Sesión en el cliente de API (AC-F4-09b)', () => {
  it('inyecta el token Bearer y lo retira al cerrar sesión', async () => {
    const capturadas: Array<Record<string, unknown>> = [];
    const adaptadorOriginal = apiClient.defaults.adapter;
    apiClient.defaults.adapter = async (config) => {
      capturadas.push(config.headers as unknown as Record<string, unknown>);
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    try {
      apiService.establecerTokenSesion('token-f4');
      await apiClient.get('/perfiles');
      apiService.establecerTokenSesion(null);
      await apiClient.get('/perfiles');
    } finally {
      apiClient.defaults.adapter = adaptadorOriginal;
    }

    expect(capturadas[0].Authorization).toBe('Bearer token-f4');
    expect(capturadas[1].Authorization).toBeUndefined();
  });

  it('crearSesion guarda el token devuelto por el backend', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { token: 'abc123', perfil: PERFILES[0] }
    });

    await apiService.crearSesion({ perfil: 'COMPRAS' });

    expect(apiService.obtenerTokenSesion()).toBe('abc123');
  });
});

// ---------------------------------------------------------------------------
// AC-F4-02b / AC-F4-15 — Revisión estática de separación de capas
// ---------------------------------------------------------------------------


describe('F4 · El frontend presenta, no calcula (AC-F4-02b / AC-F4-15)', () => {
  it('AC-F4-02b VistaTablero consume los servicios del backend y no calcula el grafo', () => {
    const vista = leer('src/components/VistaTablero.tsx');

    expect(vista).toContain('apiService.obtenerOrdenProduccion');
    expect(vista).toContain('apiService.obtenerPlanEntrega');
    expect(vista).toContain('apiService.obtenerImpacto');
    expect(vista).not.toContain('apiClient.get');
    expect(vista).not.toMatch(
      /(?:function|const|let|var|class)\s+\w*(?:kahn|topolog|dfs|scc|tarjan|kosaraju)\w*|topologicalSort|inDegree/i
    );
  });

  it('AC-F4-15 el frontend solo refleja el permiso, no lo decide', () => {
    const navbar = leer('src/components/HeaderNavbar.tsx');

    expect(navbar).toContain('disabled={!puedeEscribir}');
    expect(navbar).not.toMatch(/\b(40[13]|SESION_REQUERIDA|PERMISO_DENEGADO)\b/);
  });

  it('AC-F4-15 App delega perfiles y sesión en el cliente de API', () => {
    const app = leer('src/App.tsx');

    expect(app).toContain('apiService.obtenerPerfiles');
    expect(app).toContain('apiService.crearSesion');
    expect(app).toContain('apiService.obtenerSesion');
    expect(app).toContain('apiService.cerrarSesion');
    expect(app).toContain('perfilActivo?.puedeEscribir');
  });

  it('AC-F4-13 los componentes de F4 no muestran códigos HTTP', () => {
    for (const ruta of [
      'src/components/VistaTablero.tsx',
      'src/components/HeaderNavbar.tsx',
      'src/components/ModalPerfilesAcceso.tsx'
    ]) {
      expect(leer(ruta)).not.toMatch(/\b(401|403)\b/);
    }
  });
});
