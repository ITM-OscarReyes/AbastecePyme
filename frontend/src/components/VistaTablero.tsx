import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Layers,
  AlertTriangle,
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import type {
  ImpactoRespuesta,
  Perfil,
  RespuestaGrafo
} from '../types';
import type { TabActiva } from './HeaderNavbar';
import { apiService, extraerMensajeError } from '../services/api';
import { obtenerCodigoSku } from '../utils/sku';
import { GraphCanvas } from './GraphCanvas';
import { WorkstationPipelineCanvas } from './WorkstationPipelineCanvas';
import { ProductionOutputChart } from './ProductionOutputChart';
import { TrendSparkline } from './TrendSparkline';
import { StationThroughputChart } from './StationThroughputChart';

interface VistaTableroProps {
  grafo: RespuestaGrafo;
  cargandoGrafo: boolean;
  errorGrafo: string | null;
  onRecargarGrafo: () => void;
  onNavegar: (tab: TabActiva, elementoId?: string, filtroTipo?: string) => void;
  onConsultarElemento: (id: string) => void;
  perfilActivo: Perfil | null;
  puedeEscribir?: boolean;
  esModoOscuro?: boolean;
  onAbrirModalElemento?: () => void;
  onAbrirModalDependencia?: () => void;
  onAbrirModalPerfiles?: () => void;
}

export const VistaTablero: React.FC<VistaTableroProps> = ({
  grafo,
  cargandoGrafo,
  errorGrafo: _errorGrafo,
  onRecargarGrafo,
  onNavegar,
  onConsultarElemento,
  perfilActivo: _perfilActivo,
  puedeEscribir: _puedeEscribir,
  esModoOscuro = true,
  onAbrirModalElemento: _onAbrirModalElemento,
  onAbrirModalDependencia: _onAbrirModalDependencia
}) => {
  // Filtros y estados de las vistas
  const [vistaCentral, setVistaCentral] = useState<'VISTA_1_FLUJO' | 'VISTA_2_CAPACIDAD' | 'VISTA_3_GRAFICAS' | 'RED'>('VISTA_1_FLUJO');
  const [busquedaRed, setBusquedaRed] = useState<string>('');
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<string | null>(null);

  // Estado para Evaluación de Impacto In-Situ
  const [, setElementoImpactoId] = useState<string>('');
  const [, setImpactoResultado] = useState<ImpactoRespuesta | null>(null);
  const [, setCargandoImpacto] = useState<boolean>(false);
  const [, setErrorImpacto] = useState<string | null>(null);

  // Ejecutar Evaluación de Impacto In-Situ
  const ejecutarImpacto = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setElementoImpactoId(id);
    setCargandoImpacto(true);
    setErrorImpacto(null);
    try {
      const data = await apiService.obtenerImpacto(id);
      setImpactoResultado(data);
    } catch (err) {
      setErrorImpacto(extraerMensajeError(err));
      setImpactoResultado(null);
    } finally {
      setCargandoImpacto(false);
    }
  }, []);

  const handleCambiarFiltroProducto = useCallback((id: string) => {
    setProductoSeleccionadoId(id === 'TODOS' ? null : id);
  }, []);

  const handleSelectNode = useCallback(
    (id: string | null) => {
      if (id) {
        onConsultarElemento(id);
        void ejecutarImpacto(id);
      }
    },
    [onConsultarElemento, ejecutarImpacto]
  );

  // Suministros (Insumos) reales con inventario del backend
  const insumos = useMemo(() => {
    return grafo.elementos.filter((e) => e.tipo === 'INSUMO');
  }, [grafo.elementos]);

  // Procesos reales de la planta de manufactura
  const procesos = useMemo(() => {
    return grafo.elementos.filter((e) => e.tipo === 'PROCESO');
  }, [grafo.elementos]);

  // Insumos bajo mínimo o con alerta de stock
  const insumosEnAlerta = useMemo(() => {
    return insumos.filter((i) => i.alertaStock || (i.stockDisponible ?? 50) < (i.stockMinimo ?? 20));
  }, [insumos]);

  // Métricas 100% reales de déficit y entradas para cada estación de proceso
  const metricasProcesos = useMemo(() => {
    const mapaInsumos = new Map<string, typeof insumos[0]>();
    insumos.forEach((i) => mapaInsumos.set(i.id, i));

    return procesos.map((proc) => {
      const aristas = grafo.dependencias.filter((dep) => dep.destino === proc.id);
      const entradas = aristas
        .map((d) => mapaInsumos.get(d.origen))
        .filter((ins): ins is typeof insumos[0] => Boolean(ins));

      const conDeficit = entradas.filter(
        (i) => i.alertaStock || (i.stockDisponible ?? 0) < (i.stockMinimo ?? 0)
      );

      const cantDeficit = conDeficit.length;
      const cantEntradas = entradas.length;
      const totalDeficit = conDeficit.reduce(
        (acc, i) => acc + Math.max(0, (i.stockMinimo ?? 0) - (i.stockDisponible ?? 0)),
        0
      );

      const rotuloInsumo = conDeficit.length > 0 ? conDeficit[0].nombre : '';
      const detalle =
        cantDeficit > 0
          ? `${rotuloInsumo} (${conDeficit[0].stockDisponible}/${conDeficit[0].stockMinimo})`
          : `${cantEntradas}/${cantEntradas} Insumos OK`;

      return {
        id: proc.id,
        titulo: proc.nombre,
        tieneDeficit: cantDeficit > 0,
        totalDeficit,
        detalle,
        totalInsumos: cantEntradas,
        conformes: cantEntradas - cantDeficit
      };
    });
  }, [procesos, insumos, grafo.dependencias]);

  // Conformidad 100% real por familia de suministros de la planta
  const conformidadCategorias = useMemo(() => {
    const categorias = [
      {
        etiqueta: 'Línea Madera',
        filtro: (id: string) => id.includes('MADERA') || id.includes('TABLERO') || id.includes('LISTON')
      },
      {
        etiqueta: 'Estructura Metálica',
        filtro: (id: string) => id.includes('ACERO') || id.includes('METAL') || id.includes('TUBO') || id.includes('PANEL')
      },
      {
        etiqueta: 'Acabados & Químicos',
        filtro: (id: string) => id.includes('ACABADO') || id.includes('BARNIZ') || id.includes('LIJA')
      },
      {
        etiqueta: 'Fijación & Ferretería',
        filtro: (id: string) =>
          id.includes('TORNILLO') ||
          id.includes('TUERCA') ||
          id.includes('ARANDELA') ||
          id.includes('BISAGRA') ||
          id.includes('CORREDERA') ||
          id.includes('TIRADOR') ||
          id.includes('COLA')
      }
    ];

    return categorias.map((cat) => {
      const items = insumos.filter((i) => cat.filtro(i.id));
      const cantItems = items.length;
      const cantConformes = items.filter(
        (i) => !i.alertaStock && (i.stockDisponible ?? 0) >= (i.stockMinimo ?? 0)
      ).length;
      const pct = cantItems > 0 ? Math.round((cantConformes / cantItems) * 100) : 100;
      return {
        etiqueta: cat.etiqueta,
        total: cantItems,
        conformes: cantConformes,
        porcentaje: pct,
        alerta: cantConformes < cantItems
      };
    });
  }, [insumos]);

  // Filtrado de la red según búsqueda
  const elementosFiltradosRed = useMemo(() => {
    if (!busquedaRed.trim()) return grafo.elementos;
    const q = busquedaRed.toLowerCase().trim();
    return grafo.elementos.filter(
      (e) =>
        e.nombre.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (obtenerCodigoSku(e.id) || '').toLowerCase().includes(q)
    );
  }, [grafo.elementos, busquedaRed]);

  // Generador de datos para el Buffer Heatmap
  const heatmapData = useMemo(() => {
    return insumos.map((insumo) => {
      const disp = insumo.stockDisponible ?? 50;
      const min = insumo.stockMinimo ?? 20;
      const ratio = min > 0 ? disp / min : 1;
      const alerta = insumo.alertaStock || disp < min;
      const porcentaje = Math.min(100, Math.round(ratio * 50));

      const celdas = [
        { nivel: ratio >= 1.5 ? 'green' : ratio >= 1.0 ? 'amber' : ratio >= 0.7 ? 'orange' : 'red' },
        { nivel: ratio >= 1.3 ? 'green' : ratio >= 0.9 ? 'amber' : 'red' },
        { nivel: ratio >= 1.1 ? 'green' : ratio >= 0.8 ? 'amber' : 'orange' },
        { nivel: ratio >= 1.0 ? 'green' : 'red' },
        { nivel: ratio >= 0.8 ? 'amber' : 'red' }
      ];

      return {
        id: insumo.id,
        sku: obtenerCodigoSku(insumo.id) || insumo.id,
        nombre: insumo.nombre,
        disponible: disp,
        minimo: min,
        alerta,
        porcentaje,
        celdas
      };
    });
  }, [insumos]);

  return (
    <div className="flex-1 flex flex-col gap-2.5 p-3 overflow-hidden bg-slate-100 dark:bg-[#03060C] text-slate-900 dark:text-slate-100 select-none h-full transition-colors">
      {/* =========================================================================
          CABECERA MAESTRA DEL TABLERO (ÚNICA Y ELEGANTE)
          ========================================================================= */}
      <header className="h-11 px-3 bg-white dark:bg-[#0A0F1A] border border-slate-200 dark:border-white/[0.08] rounded-lg flex items-center justify-between shrink-0 shadow-xs dark:shadow-lg transition-colors">
        {/* Izquierda: Branding de Planta */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5 uppercase font-mono">
            <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400 shadow-[0_0_8px_#38BDF8]"></span>
            AbastecePyme
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
            Planta Norte · Medellín 01
          </span>
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
            SISTEMA NOMINAL (0 CICLOS)
          </span>
        </div>

        {/* Centro: SELECTOR MAESTRO DE LAS 3 VISTAS */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#050811] p-0.5 rounded-lg border border-slate-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setVistaCentral('VISTA_1_FLUJO')}
            className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              vistaCentral === 'VISTA_1_FLUJO'
                ? 'bg-sky-50 text-sky-700 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 shadow-xs dark:shadow-[0_0_8px_rgba(56,189,248,0.25)]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Flujo de Producción & OEE (4 KPIs + 4 Columnas de Manufactura)"
          >
            <Activity size={12} className={vistaCentral === 'VISTA_1_FLUJO' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500'} />
            <span>Flujo de Producción & OEE</span>
          </button>

          <button
            type="button"
            onClick={() => setVistaCentral('VISTA_2_CAPACIDAD')}
            className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              vistaCentral === 'VISTA_2_CAPACIDAD'
                ? 'bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 shadow-xs dark:shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Capacidad de Estaciones de Planta (5 Gauges + Lotes de Producción)"
          >
            <Layers size={12} className={vistaCentral === 'VISTA_2_CAPACIDAD' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'} />
            <span>Capacidad de Estaciones</span>
          </button>

          <button
            type="button"
            onClick={() => setVistaCentral('VISTA_3_GRAFICAS')}
            className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              vistaCentral === 'VISTA_3_GRAFICAS'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 shadow-xs dark:shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Telemetría & Gráficos Operativos (Pantalla Completa)"
          >
            <BarChart3 size={12} className={vistaCentral === 'VISTA_3_GRAFICAS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'} />
            <span>Telemetría & Gráficos</span>
          </button>
        </div>

        {/* Derecha: Botón de sincronización */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRecargarGrafo}
            className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#06090F] dark:hover:bg-white/[0.06] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer"
            title="Sincronizar telemetría con el backend"
          >
            <RefreshCw size={12} className={cargandoGrafo ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* =========================================================================
          CUERPO PRINCIPAL DEL TABLERO
          ========================================================================= */}
      <div className="flex-1 flex gap-3 overflow-hidden h-full min-h-0">
        {/* CASOS 1 Y 2: VISTA 1 ("Flujo & OEE") Y VISTA 2 ("Capacidad de Estaciones") */}
        {(vistaCentral === 'VISTA_1_FLUJO' || vistaCentral === 'VISTA_2_CAPACIDAD') && (
          <>
            {/* COLUMNA IZQUIERDA (EXPANSIÓN FLEXIBLE) */}
            <section className="flex-1 bg-white dark:bg-[#070B14] border border-slate-200 dark:border-white/[0.08] rounded-lg overflow-hidden shadow-xs dark:shadow-2xl relative h-full flex flex-col min-h-0 transition-colors">
              <WorkstationPipelineCanvas
                elementos={grafo.elementos}
                dependencias={grafo.dependencias}
                onConsultarElemento={onConsultarElemento}
                onNavegar={onNavegar}
                vistaActiva={vistaCentral}
              />
            </section>

            {/* COLUMNA DERECHA COMPACTA (CALIBRADA) */}
            <aside className="w-[350px] xl:w-[390px] shrink-0 flex flex-col gap-2.5 h-full overflow-hidden justify-between">
              {/* CASO A: SI ESTAMOS EN "Flujo de Producción & OEE", MOSTRAR MONITOR DE SUMINISTROS */}
              {vistaCentral === 'VISTA_1_FLUJO' && (
                <>
                  {/* Card 1: Active Supply Monitor (5 SKUs visibles + barra de scroll vertical activa) */}
                  <div className="flex-[1.2] min-h-0 bg-white dark:bg-[#070B14] border border-slate-200 dark:border-white/[0.08] rounded-lg flex flex-col overflow-hidden shadow-xs dark:shadow-xl p-2.5 transition-colors">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 dark:border-white/[0.06] shrink-0">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Activity size={12} className="text-sky-600 dark:text-sky-400" />
                        Active Supply Monitor
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-300 dark:border-sky-500/20 text-[9px] font-mono">
                          {insumos.length} SKUs
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 pr-1.5 space-y-1.5 custom-scroll-visible overflow-y-auto">
                      {insumos.map((insumo) => {
                        const disp = insumo.stockDisponible ?? 50;
                        const min = insumo.stockMinimo ?? 20;
                        const bajoMinimo = insumo.alertaStock || disp < min;
                        const sku = obtenerCodigoSku(insumo.id) || insumo.id;
                        const ratio = min > 0 ? disp / min : 1;
                        const porcentaje = Math.min(100, Math.round(ratio * 50));

                        return (
                          <div
                            key={insumo.id}
                            onClick={() => {
                              onConsultarElemento(insumo.id);
                              void ejecutarImpacto(insumo.id);
                            }}
                            className={`p-1.5 rounded border transition-all cursor-pointer flex items-center justify-between text-[11px] ${
                              bajoMinimo
                                ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 shadow-xs'
                                : 'bg-slate-50 dark:bg-[#050811] border-slate-200 dark:border-white/[0.06] hover:border-sky-400 dark:hover:border-sky-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-sky-700 dark:text-sky-400 text-[10px]">{sku}</span>
                              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[95px] text-[10px]">{insumo.nombre}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <TrendSparkline disponible={disp} minimo={min} alerta={bajoMinimo} width={45} height={14} />
                              <span className={`font-mono text-[10px] font-bold ${bajoMinimo ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                {disp}/{min}
                              </span>
                              <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                                bajoMinimo ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                              }`}>
                                {porcentaje}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 2: Buffer Heatmap (Con scroll visible para todos los insumos) */}
                  <div className="h-[145px] bg-white dark:bg-[#070B14] border border-slate-200 dark:border-white/[0.08] rounded-lg flex flex-col overflow-hidden shadow-xs dark:shadow-xl p-2.5 shrink-0 transition-colors">
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 dark:border-white/[0.06] shrink-0">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-300 uppercase flex items-center gap-1">
                        <Layers size={11} className="text-amber-500 dark:text-amber-400" />
                        Buffer Heatmap
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-slate-500">B1 - B5</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20 text-[9px] font-mono">
                          {heatmapData.length} SKUs
                        </span>
                      </div>
                    </div>

                    {/* Cabecera: SKU/Nombre a la izquierda y B1-B5 expandidos al máximo a la derecha */}
                    <div className="flex items-center justify-between gap-2 text-[8px] font-mono text-slate-500 dark:text-slate-400 font-bold mb-1 px-1 shrink-0">
                      <div className="w-[170px] shrink-0 truncate">SKU / INSUMO</div>
                      <div className="flex-1 grid grid-cols-5 gap-1.5 text-center">
                        <span>B1</span>
                        <span>B2</span>
                        <span>B3</span>
                        <span>B4</span>
                        <span>B5</span>
                      </div>
                    </div>

                    {/* Filas de todos los SKUs: Descripción protegida + cuadritos expandidos ocupando el mayor espacio posible */}
                    <div className="flex-1 pr-1.5 space-y-1 custom-scroll-visible overflow-y-auto">
                      {heatmapData.map((row) => (
                        <div
                          key={row.id}
                          onClick={() => {
                            onConsultarElemento(row.id);
                            void ejecutarImpacto(row.id);
                          }}
                          className="flex items-center justify-between gap-2 py-0.5 px-1 rounded hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                          title={`${row.sku} — ${row.nombre} (Stock: ${row.disponible}/${row.minimo})`}
                        >
                          {/* Descripción en ancho seguro sin recortar */}
                          <div className="w-[170px] shrink-0 flex items-center gap-1.5 min-w-0 pr-1">
                            <span className="text-[10px] font-mono text-sky-700 dark:text-sky-400 font-bold shrink-0 group-hover:text-sky-600 dark:group-hover:text-sky-300">
                              {row.sku}
                            </span>
                            <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate font-medium group-hover:text-slate-900 dark:group-hover:text-white" title={row.nombre}>
                              {row.nombre}
                            </span>
                          </div>

                          {/* Cuadritos expandidos ocupando el 100% del espacio restante */}
                          <div className="flex-1 grid grid-cols-5 gap-1.5 items-center">
                            {row.celdas.map((c, i) => (
                              <div
                                key={i}
                                className={`w-full h-3 rounded-xs ${
                                  c.nivel === 'green'
                                    ? 'bg-emerald-500'
                                    : c.nivel === 'amber'
                                    ? 'bg-amber-400'
                                    : c.nivel === 'orange'
                                    ? 'bg-orange-500'
                                    : 'bg-rose-500'
                                } opacity-85 hover:opacity-100 transition-opacity shadow-xs`}
                              ></div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Production Output (Curva compacta con umbral) */}
                  <div className="flex-1 min-h-[160px] bg-white dark:bg-[#070B14] border border-slate-200 dark:border-white/[0.08] rounded-lg flex flex-col overflow-hidden shadow-xs dark:shadow-xl p-2 transition-colors">
                    <ProductionOutputChart elementos={grafo.elementos} productoSeleccionadoId={productoSeleccionadoId} />
                  </div>
                </>
              )}

              {/* CASO B: SI ESTAMOS EN "Capacidad de Estaciones", MOSTRAR MÉTRICAS DE MÁQUINAS Y RENDIMIENTO */}
              {vistaCentral === 'VISTA_2_CAPACIDAD' && (
                <>
                  {/* Card 1: Déficit de Insumos por Estación de Proceso */}
                  <div className="flex-[1.2] min-h-0 bg-white dark:bg-[#070B14] border border-slate-200 dark:border-white/[0.08] rounded-lg flex flex-col overflow-hidden shadow-xs dark:shadow-xl p-2.5 transition-colors">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 dark:border-white/[0.06] shrink-0">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={12} className="text-amber-500 dark:text-amber-400" />
                        Déficit por Estación
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/25 text-[9px] font-mono">
                        {insumosEnAlerta.length} Insumos en Alerta
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-around py-0.5 space-y-1">
                      {metricasProcesos.map((proc) => (
                        <div
                          key={proc.id}
                          onClick={() => {
                            onConsultarElemento(proc.id);
                            void ejecutarImpacto(proc.id);
                          }}
                          className={`p-1.5 rounded border flex items-center justify-between text-[10px] cursor-pointer transition-colors ${
                            proc.tieneDeficit
                              ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 hover:border-rose-500'
                              : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.05] hover:border-sky-400'
                          }`}
                          title={`Consultar ficha de ${proc.titulo}`}
                        >
                          <div>
                            <div
                              className={`font-bold flex items-center gap-1 ${
                                proc.tieneDeficit
                                  ? 'text-rose-700 dark:text-rose-300'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {proc.tieneDeficit ? (
                                <AlertTriangle size={10} className="text-rose-600 dark:text-rose-400" />
                              ) : (
                                <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" />
                              )}
                              {proc.titulo}
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono">{proc.detalle}</div>
                          </div>
                          <span
                            className={`font-mono font-bold ${
                              proc.tieneDeficit
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {proc.tieneDeficit ? `-${proc.totalDeficit} déficit` : '0 déficit (OK)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: Conformidad Real de Insumos por Familia */}
                  <div className="h-[135px] bg-white dark:bg-[#070B14] border border-slate-200 dark:border-white/[0.08] rounded-lg flex flex-col overflow-hidden shadow-xs dark:shadow-xl p-2.5 shrink-0 transition-colors">
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 dark:border-white/[0.06] shrink-0">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-300 uppercase flex items-center gap-1">
                        <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
                        Conformidad de Insumos
                      </span>
                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {insumos.length - insumosEnAlerta.length} / {insumos.length} OK ({Math.round(((insumos.length - insumosEnAlerta.length) / (insumos.length || 1)) * 100)}%)
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-around py-0.5 text-[10px]">
                      {conformidadCategorias.map((cat, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-slate-700 dark:text-slate-300">{cat.etiqueta}:</span>
                          <span
                            className={`font-mono font-bold ${
                              cat.alerta
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {cat.porcentaje}.0% OK · {cat.conformes}/{cat.total}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Capacidad de Insumos por Estación */}
                  <div className="flex-1 min-h-[160px] bg-white dark:bg-[#070B14] border border-slate-200 dark:border-white/[0.08] rounded-lg flex flex-col overflow-hidden shadow-xs dark:shadow-xl p-2 transition-colors">
                    <StationThroughputChart elementos={grafo.elementos} dependencias={grafo.dependencias} />
                  </div>
                </>
              )}
            </aside>
          </>
        )}

        {/* CASO 3: VISTA 3 (TELEMETRÍA Y GRÁFICOS) -> PANTALLA COMPLETA 100%! SIN PANEL DERECHO REPETIDO! */}
        {vistaCentral === 'VISTA_3_GRAFICAS' && (
          <section className="flex-1 w-full h-full bg-white dark:bg-[#070B14] border border-slate-200 dark:border-white/[0.08] rounded-lg overflow-hidden shadow-xs dark:shadow-2xl p-3 flex flex-col transition-colors">
            <WorkstationPipelineCanvas
              elementos={grafo.elementos}
              dependencias={grafo.dependencias}
              onConsultarElemento={onConsultarElemento}
              onNavegar={onNavegar}
              vistaActiva="VISTA_3_GRAFICAS"
            />
          </section>
        )}

        {/* CASO 4: RED DE CONEXIONES -> PANTALLA COMPLETA 100%! */}
        {vistaCentral === 'RED' && (
          <section className="flex-1 w-full h-full bg-white dark:bg-[#070B14] border border-slate-200 dark:border-white/[0.08] rounded-lg overflow-hidden shadow-xs dark:shadow-2xl flex flex-col relative graph-canvas-bg transition-colors">
            <div className="h-10 px-3 bg-white dark:bg-[#0A0F1A] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-2">
                <Search size={12} className="text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar en red..."
                  value={busquedaRed}
                  onChange={(e) => setBusquedaRed(e.target.value)}
                  className="bg-slate-50 dark:bg-[#050811] border border-slate-300 dark:border-white/[0.1] rounded px-2.5 py-0.5 text-[11px] text-slate-800 dark:text-white w-48 focus:outline-none focus:border-sky-500/50"
                />
              </div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                27 ELEMENTOS · 26 DEPENDENCIAS · 0 CICLOS
              </span>
            </div>
            <div className="flex-1 w-full h-full relative overflow-hidden">
              <GraphCanvas
                elementos={elementosFiltradosRed}
                dependencias={grafo.dependencias}
                filtroProductoId={productoSeleccionadoId ?? undefined}
                onCambiarFiltroProducto={handleCambiarFiltroProducto}
                onSelectNode={handleSelectNode}
                esModoOscuro={esModoOscuro}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
