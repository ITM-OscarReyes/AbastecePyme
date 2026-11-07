import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ListOrdered,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { apiService, extraerMensajeError, extraerReporteCiclo } from '../services/api';
import type { OrdenProduccionRespuesta, ReporteCicloError, TipoElemento } from '../types';
import { claseBadgeTipo, etiquetaTipo } from '../utils/etiquetas';
import { obtenerCodigoSku } from '../utils/sku';

interface VistaOrdenProduccionProps {
  onIrACatalogo?: () => void;
  onIrARed?: () => void;
}


export const VistaOrdenProduccion: React.FC<VistaOrdenProduccionProps> = ({
  onIrACatalogo,
  onIrARed
}) => {
  const [cargando, setCargando] = useState<boolean>(true);
  const [ordenData, setOrdenData] = useState<OrdenProduccionRespuesta | null>(null);
  const [errorCiclo, setErrorCiclo] = useState<ReporteCicloError | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [copiado, setCopiado] = useState<boolean>(false);

  const cargarOrdenProduccion = useCallback(async () => {
    setCargando(true);
    setErrorGeneral(null);
    setErrorCiclo(null);
    setOrdenData(null);

    try {
      const data = await apiService.obtenerOrdenProduccion();
      setOrdenData(data);
    } catch (err: unknown) {
      const reporteCiclico = extraerReporteCiclo(err);
      if (reporteCiclico) {
        setErrorCiclo(reporteCiclico);
      } else {
        setErrorGeneral(extraerMensajeError(err));
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarOrdenProduccion();
  }, [cargarOrdenProduccion]);

  const pasosFiltrados = useMemo(() => {
    if (!ordenData?.orden) return [];
    if (filtroTipo === 'TODOS') return ordenData.orden;
    return ordenData.orden.filter((p) => p.tipo === filtroTipo);
  }, [ordenData, filtroTipo]);

  const conteoPorTipo = useMemo(() => {
    const conteos: Record<TipoElemento, number> = {
      PROVEEDOR: 0,
      INSUMO: 0,
      PROCESO: 0,
      PRODUCTO: 0
    };
    if (ordenData?.orden) {
      for (const paso of ordenData.orden) {
        if (conteos[paso.tipo] !== undefined) {
          conteos[paso.tipo]++;
        }
      }
    }
    return conteos;
  }, [ordenData]);

  const copiarPlan = () => {
    if (!ordenData?.orden || ordenData.orden.length === 0) return;

    const lineas = [
      '====================================================',
      '📋 PLAN DE PRODUCCIÓN Y PREPARACIÓN — ABASTECEPYME',
      `Fecha: ${new Date().toLocaleString()}`,
      `Total de etapas requeridas: ${ordenData.totalPasos}`,
      'Estado: Secuencia Topológica Válida (DAG Acíclico)',
      '====================================================',
      ''
    ];

    ordenData.orden.forEach((p) => {
      const sku = obtenerCodigoSku(p.id);
      lineas.push(
        `[Paso ${p.paso}] ${p.nombre} (${sku}) — Tipo: ${etiquetaTipo(p.tipo)}`
      );
    });

    lineas.push('');
    lineas.push('Instrucción de Planta: Respetar rigurosamente el orden numérico.');
    lineas.push('Generado automáticamente por el motor de ordenamiento del backend.');

    navigator.clipboard.writeText(lineas.join('\n'));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Encabezado Industrial de la Vista */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm dark:shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ListOrdered size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Orden de Producción y Preparación
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-full">
                  Feature 3
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Secuenciación topológica calculada en backend (Kahn determinista). Resuelve dependencias y valida ausencia de ciclos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cargarOrdenProduccion}
            disabled={cargando}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
            title="Recalcular orden de producción desde el backend"
          >
            <RefreshCw size={14} className={cargando ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''} />
            <span>Recalcular</span>
          </button>

          {ordenData && ordenData.orden.length > 0 && (
            <button
              type="button"
              onClick={copiarPlan}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
              title="Copiar secuencia de producción para órdenes de trabajo"
            >
              {copiado ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiado ? '¡Plan Copiado!' : 'Copiar Plan para Planta'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ESTADO 1: CARGANDO */}
      {cargando && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <RefreshCw size={32} className="animate-spin text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-300">
            Analizando precedencias y calculando orden topológico...
          </h3>
          <p className="text-xs text-slate-500">
            El backend está verificando aciclicidad y ordenando etapas disponibles.
          </p>
        </div>
      )}

      {/* ESTADO 2: ERROR GENERAL */}
      {!cargando && errorGeneral && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-6 flex items-start gap-4">
          <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="text-sm font-bold text-rose-300">Error al consultar el orden de producción</h3>
            <p className="text-xs text-rose-200/80 mt-1">{errorGeneral}</p>
            <button
              type="button"
              onClick={cargarOrdenProduccion}
              className="mt-3 px-3 py-1.5 bg-rose-900/50 hover:bg-rose-800 text-rose-200 text-xs font-semibold rounded-lg border border-rose-700/50 cursor-pointer"
            >
              Intentar nuevamente
            </button>
          </div>
        </div>
      )}

      {/* ESTADO 3: BLOQUEO CRÍTICO POR CICLO (HTTP 409) */}
      {!cargando && errorCiclo && (
        <div className="bg-gradient-to-br from-rose-950/90 via-slate-950 to-slate-900 border-2 border-rose-500/70 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-800/60 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-inner">
                <ShieldAlert size={28} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-rose-300 tracking-tight">
                    BLOQUEO CRÍTICO: CONFIGURACIÓN CÍCLICA
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded">
                    HTTP 409 CONFLICT
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 mt-0.5 font-medium">
                  {errorCiclo.mensaje}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-rose-950 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-bold text-center">
              Orden de producción cancelado
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Lazo circular detectado */}
            <div className="bg-slate-950/80 border border-rose-900/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                <RefreshCw size={14} className="animate-spin" />
                <span>Lazo de Dependencia Circular Detectado</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Los siguientes componentes se requieren mutuamente en un ciclo cerrado imposible de resolver:
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {errorCiclo.ciclo.map((nodo, idx) => (
                  <React.Fragment key={`${nodo}-${idx}`}>
                    <span className="px-3 py-1 rounded-lg bg-rose-900/40 border border-rose-700/60 text-rose-200 font-mono text-xs font-bold shadow-sm">
                      {nodo}
                    </span>
                    {idx < errorCiclo.ciclo.length - 1 && (
                      <ArrowRight size={14} className="text-rose-400 animate-pulse" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Elementos bloqueados */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle size={14} />
                <span>Componentes Bloqueados para Producción</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Elementos que no pueden ser preparados ni fabricados debido a la contradicción circular:
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1 max-h-36 overflow-y-auto">
                {errorCiclo.elementosBloqueados.map((id) => (
                  <span
                    key={id}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[11px]"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-rose-950/30 border border-rose-900/40 rounded-xl text-xs text-rose-200/90">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-rose-400 shrink-0" />
              <span>
                Para restablecer la producción, ingrese al mapa de relaciones o catálogo y rompa el ciclo eliminando una de las aristas conflictivas.
              </span>
            </div>
            {onIrARed && (
              <button
                type="button"
                onClick={onIrARed}
                className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-white font-semibold rounded-lg text-xs cursor-pointer shrink-0 ml-4"
              >
                Ir a la Red de Suministro
              </button>
            )}
          </div>
        </div>
      )}

      {/* ESTADO 4: GRAFO VACÍO */}
      {!cargando && !errorCiclo && !errorGeneral && ordenData && ordenData.totalPasos === 0 && (
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto">
            <Layers size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Catálogo sin componentes</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            No existen elementos registrados en el catálogo para generar un plan de preparación. Comience agregando proveedores, suministros y procesos.
          </p>
          {onIrACatalogo && (
            <button
              type="button"
              onClick={onIrACatalogo}
              className="mt-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-sky-600/20"
            >
              Registrar Componentes
            </button>
          )}
        </div>
      )}

      {/* ESTADO 5: PLAN VÁLIDO (DAG ACÍCLICO) */}
      {!cargando && !errorCiclo && !errorGeneral && ordenData && ordenData.totalPasos > 0 && (
        <div className="space-y-6">
          {/* Tarjetas de Métricas de Preparación */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs dark:shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Etapas de Producción</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{ordenData.totalPasos}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                  <CheckCircle2 size={12} /> DAG Válido
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs dark:shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Suministros & Proveedores</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
                  {conteoPorTipo.PROVEEDOR + conteoPorTipo.INSUMO}
                </span>
                <span className="text-[10px] text-slate-500">Etapa inicial</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs dark:shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Procesos de Planta</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {conteoPorTipo.PROCESO}
                </span>
                <span className="text-[10px] text-slate-500">Transformación</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs dark:shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Productos Terminados</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {conteoPorTipo.PRODUCTO}
                </span>
                <span className="text-[10px] text-slate-500">Entrega final</span>
              </div>
            </div>
          </div>

          {/* Barra de Filtros de Visualización */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 px-4 py-2.5 rounded-xl">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-semibold mr-1 flex items-center gap-1">
                <Clock size={13} /> Filtrar por:
              </span>
              {[
                { id: 'TODOS', label: 'Todas las etapas' },
                { id: 'PROVEEDOR', label: 'Proveedores' },
                { id: 'INSUMO', label: 'Suministros' },
                { id: 'PROCESO', label: 'Procesos' },
                { id: 'PRODUCTO', label: 'Productos' }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroTipo(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filtroTipo === f.id
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-slate-200/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/80 dark:hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Mostrando {pasosFiltrados.length} de {ordenData.totalPasos} pasos
            </span>
          </div>

          {/* Timeline Secuencial de Producción (Stepper) */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Secuencia Lineal de Fabricación Paso a Paso</span>
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Resuelve precedencias: cada paso cuenta con todos sus suministros previos listos.
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {pasosFiltrados.map((paso) => {
                const sku = obtenerCodigoSku(paso.id);

                return (
                  <div
                    key={paso.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:bg-slate-100/70 dark:hover:bg-slate-950/90 group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Número secuencial del paso */}
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        {paso.paso}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                            {paso.nombre}
                          </h4>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700">
                            {sku}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          ID Técnico del Catálogo: <code className="text-slate-700 dark:text-slate-300 font-mono">{paso.id}</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-xs ${claseBadgeTipo(paso.tipo)}`}
                      >
                        {etiquetaTipo(paso.tipo)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
