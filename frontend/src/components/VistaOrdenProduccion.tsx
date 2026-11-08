import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ListOrdered,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  PackageCheck,
  Truck
} from 'lucide-react';
import { apiService, extraerMensajeError, extraerReporteCiclo } from '../services/api';
import type {
  Elemento,
  OrdenProduccionRespuesta,
  PlanEntregaRespuesta,
  TipoElemento
} from '../types';
import { claseBadgeTipo, etiquetaTipo } from '../utils/etiquetas';
import { obtenerCodigoSku } from '../utils/sku';

interface VistaOrdenProduccionProps {
  onIrACatalogo?: () => void;
  onIrARed?: () => void;
}

export const VistaOrdenProduccion: React.FC<VistaOrdenProduccionProps> = ({
  onIrACatalogo: _onIrACatalogo,
  onIrARed: _onIrARed
}) => {
  // Pestaña activa dentro de la vista: Plan de Entrega o Diagnóstico Global
  const [subVista, setSubVista] = useState<'plan' | 'diagnostico'>('plan');

  // Estado del Diagnóstico Global
  const [cargandoDiagnostico, setCargandoDiagnostico] = useState<boolean>(true);
  const [diagnosticoData, setDiagnosticoData] = useState<OrdenProduccionRespuesta | null>(null);
  const [errorDiagnostico, setErrorDiagnostico] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [copiado, setCopiado] = useState<boolean>(false);

  // Mantener compatibilidad con extraerReporteCiclo
  const [_dummyReporte] = useState(() => extraerReporteCiclo(null));
  void _dummyReporte;

  // Estado del Plan de Entrega
  const [productosDisponibles, setProductosDisponibles] = useState<Elemento[]>([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState<string[]>([]);
  const [cargandoPlan, setCargandoPlan] = useState<boolean>(false);
  const [planData, setPlanData] = useState<PlanEntregaRespuesta | null>(null);
  const [errorPlan, setErrorPlan] = useState<string | null>(null);

  // 1. Cargar Diagnóstico Global de Planta
  const cargarDiagnostico = useCallback(async () => {
    setCargandoDiagnostico(true);
    setErrorDiagnostico(null);

    try {
      const data = await apiService.obtenerOrdenProduccion();
      setDiagnosticoData(data);
    } catch (err: unknown) {
      setErrorDiagnostico(extraerMensajeError(err));
    } finally {
      setCargandoDiagnostico(false);
    }
  }, []);

  // 2. Cargar Lista de Productos para el selector del Plan de Entrega
  const cargarProductos = useCallback(async () => {
    try {
      const res = await apiService.obtenerElementos('PRODUCTO');
      setProductosDisponibles(res.elementos);
      if (res.elementos.length > 0 && productosSeleccionados.length === 0) {
        setProductosSeleccionados([res.elementos[0].id]);
      }
    } catch {
      // Ignorar fallo de carga de lista
    }
  }, [productosSeleccionados.length]);

  // 3. Ejecutar consulta de Plan de Entrega para los productos seleccionados
  const consultarPlanEntrega = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setPlanData(null);
      return;
    }
    setCargandoPlan(true);
    setErrorPlan(null);
    try {
      const res = await apiService.obtenerPlanEntrega(ids);
      setPlanData(res);
    } catch (err: unknown) {
      setErrorPlan(extraerMensajeError(err));
    } finally {
      setCargandoPlan(false);
    }
  }, []);

  useEffect(() => {
    cargarDiagnostico();
    cargarProductos();
  }, [cargarDiagnostico, cargarProductos]);

  useEffect(() => {
    if (productosSeleccionados.length > 0) {
      consultarPlanEntrega(productosSeleccionados);
    }
  }, [productosSeleccionados, consultarPlanEntrega]);

  const toggleSeleccionProducto = (id: string) => {
    setProductosSeleccionados((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id);
      }
      return [...prev, id];
    });
  };

  const pasosFiltradosDiagnostico = useMemo(() => {
    if (!diagnosticoData?.orden) return [];
    if (filtroTipo === 'TODOS') return diagnosticoData.orden;
    return diagnosticoData.orden.filter((p) => p.tipo === filtroTipo);
  }, [diagnosticoData, filtroTipo]);

  const copiarSecuencia = (pasos: Array<{ paso: number; id: string; tipo: TipoElemento; nombre: string }>, titulo: string) => {
    if (!pasos || pasos.length === 0) return;

    const lineas = [
      '====================================================',
      `📋 ${titulo.toUpperCase()} — ABASTECEPYME`,
      `Fecha: ${new Date().toLocaleString()}`,
      `Total de etapas requeridas: ${pasos.length}`,
      '====================================================',
      ''
    ];

    pasos.forEach((p) => {
      const sku = obtenerCodigoSku(p.id);
      lineas.push(`[Paso ${p.paso}] ${p.nombre} (${sku}) — Tipo: ${etiquetaTipo(p.tipo)}`);
    });

    lineas.push('');
    lineas.push('Instrucción: Respetar rigurosamente el orden numérico de preparación.');
    navigator.clipboard.writeText(lineas.join('\n'));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm dark:shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ListOrdered size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Orden de Producción y Entregas
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Planificación secuencial de preparación por pedido y control de continuidad de planta.
            </p>
          </div>
        </div>

        {/* Selector de subvista */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setSubVista('plan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              subVista === 'plan'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Truck size={14} />
            <span>Plan de entrega</span>
          </button>
          <button
            type="button"
            onClick={() => setSubVista('diagnostico')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              subVista === 'diagnostico'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PackageCheck size={14} />
            <span>Control general de planta</span>
          </button>
        </div>
      </div>

      {/* SUBVISTA 1: PLAN DE ENTREGA */}
      {subVista === 'plan' && (
        <div className="space-y-6">
          {/* Selector de productos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Seleccionar productos para entrega</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                {productosSeleccionados.length} seleccionados
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {productosDisponibles.map((prod) => {
                const seleccionada = productosSeleccionados.includes(prod.id);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => toggleSeleccionProducto(prod.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      seleccionada
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span>{prod.nombre}</span>
                    <span className="text-[10px] opacity-75 font-mono">({prod.id})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {cargandoPlan && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Calculando plan de entrega y precedencias de los productos seleccionados...
              </p>
            </div>
          )}

          {!cargandoPlan && errorPlan && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 flex items-start gap-3">
              <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">No se pudo generar el plan de entrega</h4>
                <p className="text-xs text-rose-700 dark:text-rose-200/80 mt-1">{errorPlan}</p>
              </div>
            </div>
          )}

          {!cargandoPlan && planData && (
            <div className="space-y-5">
              {/* Resumen del estado de los productos solicitados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {planData.productos.map((prod) => (
                  <div
                    key={prod.id}
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      prod.estado === 'PLANIFICABLE'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{prod.nombre}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">{prod.id}</span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        prod.estado === 'PLANIFICABLE'
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {prod.estado === 'PLANIFICABLE' ? 'Planificable' : 'Bloqueado'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Alerta de bloqueo si existen ciclos en los requerimientos */}
              {planData.ciclos.length > 0 && (
                <div className="bg-rose-950/30 border border-rose-800/60 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase">
                    <ShieldAlert size={16} />
                    <span>Dependencia circular detectada en los requisitos solicitados</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Existe una contradicción de dependencias que impide preparar los productos bloqueados:
                  </p>
                  {planData.ciclos.map((c, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950/80 rounded-lg border border-rose-900/60 text-xs">
                      {c.secuencia.map((nodo, idx) => (
                        <React.Fragment key={idx}>
                          <span className="px-2 py-0.5 bg-rose-900/40 text-rose-200 rounded font-mono text-[11px]">
                            {nodo}
                          </span>
                          {idx < c.secuencia.length - 1 && <ArrowRight size={12} className="text-rose-400" />}
                        </React.Fragment>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Pasos de preparación para la entrega */}
              {planData.pasos.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Secuencia de preparación ({planData.totalPasos} pasos)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => copiarSecuencia(planData.pasos, 'Plan de entrega por producto')}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {copiado ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiado ? 'Copiado' : 'Copiar plan'}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {planData.pasos.map((paso) => (
                      <div
                        key={paso.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center">
                            {paso.paso}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{paso.nombre}</span>
                            <span className="text-[10px] text-slate-500 font-mono ml-2">({paso.id})</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${claseBadgeTipo(paso.tipo)}`}>
                          {etiquetaTipo(paso.tipo)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
                  <p className="text-xs text-slate-500">
                    No hay pasos disponibles porque todos los productos solicitados están bloqueados por dependencias circulares.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBVISTA 2: CONTROL GENERAL DE PLANTA (DIAGNÓSTICO GLOBAL) */}
      {subVista === 'diagnostico' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Diagnóstico global de la planta</h3>
              <p className="text-xs text-slate-500">
                Evalúa si la totalidad de las relaciones de la fábrica admite una secuencia de trabajo o contiene contradicciones.
              </p>
            </div>
            <button
              type="button"
              onClick={cargarDiagnostico}
              disabled={cargandoDiagnostico}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <RefreshCw size={13} className={cargandoDiagnostico ? 'animate-spin' : ''} />
              <span>Actualizar diagnóstico</span>
            </button>
          </div>

          {cargandoDiagnostico && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
              <RefreshCw size={28} className="animate-spin text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Evaluando la red completa de la planta...</p>
            </div>
          )}

          {!cargandoDiagnostico && errorDiagnostico && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 flex items-start gap-3">
              <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">Error al consultar diagnóstico</h4>
                <p className="text-xs text-rose-700 dark:text-rose-200/80 mt-1">{errorDiagnostico}</p>
              </div>
            </div>
          )}

          {!cargandoDiagnostico && diagnosticoData && (
            <div className="space-y-6">
              {/* Tarjeta de Estado del Diagnóstico */}
              <div
                className={`p-6 rounded-2xl border ${
                  diagnosticoData.esDag
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {diagnosticoData.esDag ? (
                      <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ShieldAlert size={24} className="text-rose-600 dark:text-rose-400" />
                    )}
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {diagnosticoData.esDag
                          ? 'Cadena de planta sin dependencias circulares'
                          : 'Se detectaron dependencias circulares en la planta'}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {diagnosticoData.esDag
                          ? 'Toda la fábrica puede operar en una secuencia de pasos ordenada.'
                          : 'Existen componentes con contradicciones mutuas. No se emite orden parcial para la planta.'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                      diagnosticoData.esDag
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                    }`}
                  >
                    {diagnosticoData.esDag ? 'Planta sincronizada' : 'Contradicción activa'}
                  </span>
                </div>
              </div>

              {/* Si hay ciclos: reporte detallado */}
              {!diagnosticoData.esDag && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/80 border border-rose-900/60 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Dependencias circulares detectadas</span>
                    </span>
                    <div className="space-y-2 pt-1">
                      {diagnosticoData.ciclos.map((c, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-1.5">
                          {c.secuencia.map((nodo, idx) => (
                            <React.Fragment key={idx}>
                              <span className="px-2 py-0.5 bg-rose-900/40 text-rose-200 rounded font-mono text-[11px]">
                                {nodo}
                              </span>
                              {idx < c.secuencia.length - 1 && <ArrowRight size={12} className="text-rose-400" />}
                            </React.Fragment>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={14} />
                      <span>Elementos bloqueados ({diagnosticoData.elementosBloqueados.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-1 pt-1 max-h-32 overflow-y-auto">
                      {diagnosticoData.elementosBloqueados.map((id) => (
                        <span key={id} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono text-[11px] border border-slate-700">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Si es DAG: secuencia completa */}
              {diagnosticoData.esDag && diagnosticoData.totalPasos > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Secuencia completa de fabricación ({diagnosticoData.totalPasos} pasos)
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] ml-2">
                        {['TODOS', 'PROVEEDOR', 'INSUMO', 'PROCESO', 'PRODUCTO'].map((tipo) => (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => setFiltroTipo(tipo)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                              filtroTipo === tipo
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            {tipo === 'TODOS' ? 'Todos' : tipo}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copiarSecuencia(diagnosticoData.orden, 'Orden global de preparación')}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {copiado ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiado ? 'Copiado' : 'Copiar orden global'}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {pasosFiltradosDiagnostico.map((paso) => (
                      <div
                        key={paso.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center">
                            {paso.paso}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{paso.nombre}</span>
                            <span className="text-[10px] text-slate-500 font-mono ml-2">({paso.id})</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${claseBadgeTipo(paso.tipo)}`}>
                          {etiquetaTipo(paso.tipo)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
