import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CheckSquare,
  Cog,
  ExternalLink,
  Factory,
  ListOrdered,
  Network,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Zap
} from 'lucide-react';
import type {
  ImpactoRespuesta,
  OrdenProduccionRespuesta,
  Perfil,
  PlanEntregaRespuesta,
  RespuestaGrafo
} from '../types';
import type { TabActiva } from './HeaderNavbar';
import { apiService, extraerMensajeError } from '../services/api';
import { obtenerCodigoSku } from '../utils/sku';
import { claseBadgeTipo, etiquetaTipo } from '../utils/etiquetas';

interface VistaTableroProps {
  grafo: RespuestaGrafo;
  cargandoGrafo: boolean;
  errorGrafo: string | null;
  onRecargarGrafo: () => void;
  onNavegar: (tab: TabActiva, elementoId?: string, filtroTipo?: string) => void;
  onConsultarElemento: (id: string) => void;
  perfilActivo: Perfil | null;
  puedeEscribir?: boolean;
  onAbrirModalElemento?: () => void;
  onAbrirModalDependencia?: () => void;
  onAbrirModalPerfiles?: () => void;
}

export const VistaTablero: React.FC<VistaTableroProps> = ({
  grafo,
  cargandoGrafo,
  errorGrafo,
  onRecargarGrafo,
  onNavegar,
  onConsultarElemento,
  perfilActivo,
  puedeEscribir: _puedeEscribir,
  onAbrirModalElemento: _onAbrirModalElemento,
  onAbrirModalDependencia: _onAbrirModalDependencia,
  onAbrirModalPerfiles
}) => {
  void _puedeEscribir;
  void _onAbrirModalElemento;
  void _onAbrirModalDependencia;
  // Estado para Diagnóstico General de Planta (F3)
  const [ordenProduccion, setOrdenProduccion] = useState<OrdenProduccionRespuesta | null>(null);
  const [cargandoOrden, setCargandoOrden] = useState<boolean>(false);
  const [errorOrden, setErrorOrden] = useState<string | null>(null);

  // Estado para Plan de Entrega de Producto (F3)
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<string>('');
  const [planEntrega, setPlanEntrega] = useState<PlanEntregaRespuesta | null>(null);
  const [cargandoPlan, setCargandoPlan] = useState<boolean>(false);
  const [errorPlan, setErrorPlan] = useState<string | null>(null);

  // Estado para Evaluación de Impacto In-Situ (F2 / F4)
  const [elementoImpactoId, setElementoImpactoId] = useState<string>('');
  const [impactoResultado, setImpactoResultado] = useState<ImpactoRespuesta | null>(null);
  const [cargandoImpacto, setCargandoImpacto] = useState<boolean>(false);
  const [errorImpacto, setErrorImpacto] = useState<string | null>(null);

  // Buscador de elemento para impacto
  const [busquedaElemento, setBusquedaElemento] = useState<string>('');

  // 1. Cargar Diagnóstico Global de Planta
  const cargarDiagnostico = useCallback(async () => {
    setCargandoOrden(true);
    setErrorOrden(null);
    try {
      const data = await apiService.obtenerOrdenProduccion();
      setOrdenProduccion(data);
    } catch (err) {
      setErrorOrden(extraerMensajeError(err));
      setOrdenProduccion(null);
    } finally {
      setCargandoOrden(false);
    }
  }, []);

  useEffect(() => {
    cargarDiagnostico();
  }, [cargarDiagnostico]);

  // Lista de productos terminados en el catálogo
  const productosDisponibles = grafo.elementos.filter((e) => e.tipo === 'PRODUCTO');

  // Si hay productos y no se ha seleccionado ninguno, seleccionar el primero automáticamente
  useEffect(() => {
    if (productosDisponibles.length > 0 && !productoSeleccionadoId) {
      setProductoSeleccionadoId(productosDisponibles[0].id);
    }
  }, [productosDisponibles, productoSeleccionadoId]);

  // 2. Cargar Plan de Entrega cuando cambia el producto seleccionado
  useEffect(() => {
    if (!productoSeleccionadoId) {
      setPlanEntrega(null);
      return;
    }

    let activo = true;
    const cargarPlan = async () => {
      setCargandoPlan(true);
      setErrorPlan(null);
      try {
        const respuesta = await apiService.obtenerPlanEntrega([productoSeleccionadoId]);
        if (activo) {
          setPlanEntrega(respuesta);
        }
      } catch (err) {
        if (activo) {
          setErrorPlan(extraerMensajeError(err));
          setPlanEntrega(null);
        }
      } finally {
        if (activo) {
          setCargandoPlan(false);
        }
      }
    };

    cargarPlan();
    return () => {
      activo = false;
    };
  }, [productoSeleccionadoId]);

  // 3. Ejecutar Evaluación de Impacto In-Situ
  const ejecutarImpacto = async (id: string) => {
    if (!id.trim()) return;
    setElementoImpactoId(id);
    setCargandoImpacto(true);
    setErrorImpacto(null);
    try {
      const data = await apiService.obtenerImpacto(id.trim());
      setImpactoResultado(data);
    } catch (err) {
      setErrorImpacto(extraerMensajeError(err));
      setImpactoResultado(null);
    } finally {
      setCargandoImpacto(false);
    }
  };

  // Contadores por tipo de componente
  const totalProveedores = grafo.elementos.filter((e) => e.tipo === 'PROVEEDOR').length;
  const totalInsumos = grafo.elementos.filter((e) => e.tipo === 'INSUMO').length;
  const totalProcesos = grafo.elementos.filter((e) => e.tipo === 'PROCESO').length;
  const totalProductos = productosDisponibles.length;

  // Insumos con alerta de stock
  const insumosEnAlerta = grafo.elementos.filter((e) => e.tipo === 'INSUMO' && e.alertaStock);

  // Elementos filtrados para selector de impacto
  const elementosParaImpacto = grafo.elementos.filter((e) => {
    if (!busquedaElemento.trim()) return true;
    const termino = busquedaElemento.toLowerCase();
    return (
      e.id.toLowerCase().includes(termino) ||
      e.nombre.toLowerCase().includes(termino) ||
      (e.descripcion && e.descripcion.toLowerCase().includes(termino))
    );
  });

  return (
    <div className="w-full flex-1 flex flex-col gap-5 p-3 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Aviso de error de carga si ocurre */}
      {errorGrafo && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorGrafo}</span>
          </div>
          <button
            type="button"
            onClick={onRecargarGrafo}
            className="font-semibold underline cursor-pointer hover:text-red-950 dark:hover:text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* 1. Encabezado del Tablero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0 mt-0.5">
            <Factory size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Tablero de Control de Abastecimiento
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Operación en Vivo
              </span>
              {perfilActivo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {perfilActivo.nombre}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Resumen integral de la cadena de suministro, continuidad de producción, evaluación de impacto operativo y preparación de pedidos.
            </p>
          </div>
        </div>

        {/* Acciones Rápidas del Encabezado */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={() => {
              onRecargarGrafo();
              cargarDiagnostico();
              if (productoSeleccionadoId) {
                apiService.obtenerPlanEntrega([productoSeleccionadoId]).then(setPlanEntrega).catch(() => {});
              }
            }}
            disabled={cargandoGrafo || cargandoOrden}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-sm"
            title="Actualizar datos del tablero desde el sistema"
          >
            <RefreshCw size={14} className={cargandoGrafo || cargandoOrden ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Flujo Continuo de la Cadena de Suministro & Telemetría */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* FASE 1: Proveedores */}
        <div
          onClick={() => onNavegar('catalogo', undefined, 'PROVEEDOR')}
          className="card-corporate hover:border-blue-400 dark:hover:border-blue-500/50 p-4 shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
          title="Ver únicamente proveedores en el catálogo"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              FASE 1
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
              {cargandoGrafo ? '—' : totalProveedores}
            </span>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
              Proveedores Externos
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Fuentes de suministro</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
            <span>Filtrar catálogo</span>
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* FASE 2: Insumos */}
        <div
          onClick={() => onNavegar('catalogo', undefined, 'INSUMO')}
          className="card-corporate hover:border-amber-400 dark:hover:border-amber-500/50 p-4 shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
          title="Ver únicamente materias primas e insumos en el catálogo"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              FASE 2
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Package size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
                {cargandoGrafo ? '—' : totalInsumos}
              </span>
              {insumosEnAlerta.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle size={10} />
                  {insumosEnAlerta.length} bajo mín.
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
              Insumos & Materiales
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Materias primas y partes</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            <span>Filtrar catálogo</span>
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* FASE 3: Procesos */}
        <div
          onClick={() => onNavegar('catalogo', undefined, 'PROCESO')}
          className="card-corporate hover:border-purple-400 dark:hover:border-purple-500/50 p-4 shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
          title="Ver únicamente procesos de planta en el catálogo"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              FASE 3
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Cog size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
              {cargandoGrafo ? '—' : totalProcesos}
            </span>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
              Procesos de Planta
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Transformación y corte</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
            <span>Filtrar catálogo</span>
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* FASE 4: Productos */}
        <div
          onClick={() => onNavegar('produccion')}
          className="card-corporate hover:border-emerald-400 dark:hover:border-emerald-500/50 p-4 shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
          title="Ver planes de producción de productos"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              FASE 4
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckSquare size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
                {cargandoGrafo ? '—' : totalProductos}
              </span>
              {ordenProduccion && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  {ordenProduccion.productosPlanificables.length} listos
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
              Productos Finales
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Disponibles para entrega</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>Ver en orden</span>
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Conexiones de Red */}
        <div
          onClick={() => onNavegar('red')}
          className="col-span-1 sm:col-span-2 lg:col-span-1 card-corporate hover:border-sky-400 dark:hover:border-sky-500/50 p-4 shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
          title="Ver red de suministro completa"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              RED
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Network size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
              {cargandoGrafo ? '—' : grafo.resumen.totalDependencias}
            </span>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
              Conexiones de Red
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Relaciones origen habilita destino</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
            <span>Explorar mapa</span>
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* 3. Sección Principal Dividida en 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Columna Izquierda: Continuidad Operativa & Plan de Entrega (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Diagnóstico de Planta (RF-F4-05) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <ListOrdered size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Diagnóstico General de Planta
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Evaluación de coherencia en la secuencia de operaciones
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavegar('produccion')}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver orden completo</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {cargandoOrden ? (
              <div className="flex items-center justify-center p-8 text-xs text-slate-500">
                <RefreshCw size={18} className="animate-spin text-sky-500 mr-2" />
                <span>Analizando continuidad de planta...</span>
              </div>
            ) : errorOrden ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertOctagon size={16} className="text-amber-600 dark:text-amber-400" />
                  <span>Atención en la secuencia operativa</span>
                </div>
                <p>{errorOrden}</p>
              </div>
            ) : ordenProduccion ? (
              <div className="space-y-3">
                {ordenProduccion.esDag ? (
                  <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
                            Cadena sin dependencias circulares
                          </span>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                            La planta cuenta con una secuencia viable de {ordenProduccion.totalPasos} operaciones ordenadas.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200">
                        Óptimo
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-100 dark:border-emerald-900/50">
                        <span className="block text-lg font-black text-emerald-700 dark:text-emerald-400">
                          {ordenProduccion.productosPlanificables.length}
                        </span>
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                          Productos viables
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-100 dark:border-emerald-900/50">
                        <span className="block text-lg font-black text-slate-700 dark:text-slate-300">
                          {ordenProduccion.totalPasos}
                        </span>
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                          Pasos de preparación
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertOctagon size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-red-900 dark:text-red-100">
                          Alerta: Dependencia circular detectada
                        </span>
                        <p className="text-[11px] text-red-700 dark:text-red-300 mt-1 leading-relaxed">
                          Existen componentes que se requieren mutuamente en un circuito cerrado. Esto impide calcular un orden de preparación válido para los elementos afectados.
                        </p>
                      </div>
                    </div>

                    {ordenProduccion.productosBloqueados.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/80">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Productos con preparación bloqueada:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ordenProduccion.productosBloqueados.map((id) => (
                            <span
                              key={id}
                              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700"
                            >
                              {id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => onNavegar('produccion')}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Revisar y corregir en Orden de producción
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Plan de Entrega Rápido por Producto (RF-F4-05) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckSquare size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Plan de Entrega por Producto
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Secuencia requerida e insumos para despachar productos finales
                  </p>
                </div>
              </div>
            </div>

            {/* Selector de Producto */}
            {productosDisponibles.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-50 dark:bg-slate-950 rounded-xl">
                No hay productos finales registrados en el catálogo.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {productosDisponibles.map((prod) => {
                    const esSeleccionado = prod.id === productoSeleccionadoId;
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => setProductoSeleccionadoId(prod.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                          esSeleccionado
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
                        }`}
                      >
                        {prod.nombre}
                      </button>
                    );
                  })}
                </div>

                {/* Resultado del Plan */}
                {cargandoPlan ? (
                  <div className="flex items-center justify-center p-8 text-xs text-slate-500">
                    <RefreshCw size={16} className="animate-spin text-emerald-500 mr-2" />
                    <span>Calculando secuencia de entrega...</span>
                  </div>
                ) : errorPlan ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-200">
                    {errorPlan}
                  </div>
                ) : planEntrega ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            planEntrega.esPlanificable ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        ></span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Estado de viabilidad:
                        </span>
                        <span
                          className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                            planEntrega.esPlanificable
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {planEntrega.esPlanificable ? 'Viable para entrega' : 'Bloqueado'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          ({planEntrega.totalPasos} operaciones)
                        </span>
                      </div>

                      {/* Botones de acción directa del producto */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onNavegar('red', productoSeleccionadoId)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Ver línea de producción de este producto en el mapa"
                        >
                          <Network size={13} />
                          <span>Ver línea en el mapa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavegar('produccion', productoSeleccionadoId)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Abrir este producto en la orden de producción"
                        >
                          <span>Ver en orden de producción</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Previa de Pasos */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {planEntrega.pasos.map((paso) => (
                        <div
                          key={`${paso.paso}-${paso.id}`}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-400 text-xs transition-colors group"
                        >
                          <div
                            onClick={() => onNavegar('catalogo', paso.id)}
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                            title="Ver este componente en el catálogo"
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                              {paso.paso}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                              {paso.nombre}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">
                              {obtenerCodigoSku(paso.id)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${claseBadgeTipo(paso.tipo)}`}>
                              {etiquetaTipo(paso.tipo)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onNavegar('red', paso.id)}
                              className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              title="Ver este elemento en el mapa de red"
                            >
                              <Network size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavegar('catalogo', paso.id)}
                              className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              title="Ver ficha en el catálogo"
                            >
                              <Package size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onNavegar('produccion', productoSeleccionadoId)}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Abrir plan en detalle</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Alertas de Stock y Evaluación de Impacto In-Situ (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Alertas Críticas de Stock */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Alertas de Suministro y Stock
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Insumos por debajo del stock mínimo operativo
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                {insumosEnAlerta.length}
              </span>
            </div>

            {insumosEnAlerta.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                <ShieldCheck size={20} className="mx-auto text-emerald-500 mb-1" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Stock operativo en orden
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Todos los insumos cumplen con el nivel mínimo requerido.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {insumosEnAlerta.map((insumo) => {
                  const disponible = insumo.stockDisponible ?? 0;
                  const minimo = Math.max(1, insumo.stockMinimo ?? 1);
                  const porcentaje = Math.min(100, Math.round((disponible / minimo) * 100));
                  return (
                    <div
                      key={insumo.id}
                      className="p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 flex flex-col gap-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div
                          onClick={() => onNavegar('catalogo', insumo.id)}
                          className="min-w-0 cursor-pointer flex-1"
                          title="Ir a este insumo en el catálogo"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white truncate hover:underline">
                              {insumo.nombre}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {obtenerCodigoSku(insumo.id)}
                            </span>
                          </div>
                          <div className="text-[11px] text-red-600 dark:text-red-400 font-mono font-bold mt-0.5 tabular-nums">
                            Stock: {disponible} / Mín: {insumo.stockMinimo ?? 0} ({porcentaje}%)
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onNavegar('red', insumo.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                            title="Ver este insumo en el mapa de red"
                          >
                            <Network size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavegar('catalogo', insumo.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                            title="Ver ficha en el catálogo"
                          >
                            <Package size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => ejecutarImpacto(insumo.id)}
                            className="px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                            title="Evaluar a qué productos o procesos afecta este insumo"
                          >
                            <Zap size={12} />
                            <span>Impacto</span>
                          </button>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-red-500"
                          style={{ width: `${Math.max(6, porcentaje)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Evaluación In-Situ de Impacto (RF-F4-04 / AC-F4-04) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Consulta Rápida de Impacto
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Evalúa la cascada de afectación si un componente falla
                  </p>
                </div>
              </div>
            </div>

            {/* Selector con Buscador */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={busquedaElemento}
                  onChange={(e) => setBusquedaElemento(e.target.value)}
                  placeholder="Buscar componente para evaluar..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={elementoImpactoId}
                  onChange={(e) => setElementoImpactoId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="">-- Elige un componente --</option>
                  {elementosParaImpacto.map((elem) => (
                    <option key={elem.id} value={elem.id}>
                      [{etiquetaTipo(elem.tipo)}] {elem.nombre} ({elem.id})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => ejecutarImpacto(elementoImpactoId)}
                  disabled={!elementoImpactoId || cargandoImpacto}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer active:scale-95 shrink-0 flex items-center gap-1.5"
                >
                  <Zap size={14} className={cargandoImpacto ? 'animate-spin' : ''} />
                  <span>Evaluar</span>
                </button>
              </div>
            </div>

            {/* Resultados de Impacto In-Situ */}
            {cargandoImpacto ? (
              <div className="flex items-center justify-center p-6 text-xs text-slate-500">
                <RefreshCw size={16} className="animate-spin text-amber-500 mr-2" />
                <span>Analizando impacto en la cadena...</span>
              </div>
            ) : errorImpacto ? (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200">
                <div className="font-bold mb-1">No se pudo evaluar el impacto:</div>
                <p>{errorImpacto}</p>
              </div>
            ) : impactoResultado ? (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                      {impactoResultado.elemento.nombre}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {obtenerCodigoSku(impactoResultado.elemento.id)}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {impactoResultado.total} afectados
                  </span>
                </div>

                {impactoResultado.total === 0 ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic py-2">
                    Este componente no afecta a otros elementos de la cadena.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {impactoResultado.afectados.map((afectado) => (
                      <div
                        key={afectado.id}
                        onClick={() => onConsultarElemento(afectado.id)}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-xs cursor-pointer hover:border-amber-400 transition-colors"
                        title="Ver detalle del elemento afectado"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {afectado.nombre}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-[10px] text-slate-400">
                            {obtenerCodigoSku(afectado.id)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${claseBadgeTipo(afectado.tipo)}`}>
                            {etiquetaTipo(afectado.tipo)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => onNavegar('red', impactoResultado.elemento.id)}
                    className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver en el mapa</span>
                    <ExternalLink size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavegar('impacto', impactoResultado.elemento.id)}
                    className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Abrir en análisis de impacto</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 4. Guía de Escenarios de Demostración (RF-F4-11 / AC-F4-11) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-indigo-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold tracking-tight">
              Escenarios de Demostración y Verificación Operativa
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
            F4 Certificada
          </span>
        </div>
        <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">
          Este tablero reúne y comprueba los 4 escenarios de aceptación con datos sintéticos del sistema real:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs">
          <div
            onClick={() => onNavegar('red')}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors space-y-1"
          >
            <span className="font-bold text-sky-400 block">1. Cadena de suministro válida</span>
            <p className="text-[11px] text-slate-300">
              Visualiza elementos conectados, plan de entrega con secuencia ordenada e impacto en cascada.
            </p>
          </div>

          <div
            onClick={() => onNavegar('impacto', '001')}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors space-y-1"
          >
            <span className="font-bold text-amber-400 block">2. Elemento inexistente</span>
            <p className="text-[11px] text-slate-300">
              Comprueba el rechazo explícito de identificadores no registrados sin datos simulados.
            </p>
          </div>

          <div
            onClick={() => {
              if (onAbrirModalPerfiles) {
                onAbrirModalPerfiles();
              } else {
                onNavegar('catalogo');
              }
            }}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors space-y-1"
          >
            <span className="font-bold text-purple-400 block">3. Validación de datos y permisos</span>
            <p className="text-[11px] text-slate-300">
              Garantiza la autorización por perfil (Compras vs Producción) y la regla de no duplicidad.
            </p>
          </div>

          <div
            onClick={() => onNavegar('produccion')}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors space-y-1"
          >
            <span className="font-bold text-emerald-400 block">4. Detección de ciclos</span>
            <p className="text-[11px] text-slate-300">
              Identifica contradicciones circulares, aísla productos bloqueados y evita órdenes erróneos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
