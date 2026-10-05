import React, { useMemo } from 'react';
import type { Elemento, RespuestaGrafo } from '../types';
import { apiService } from '../services/api';
import { AlertOctagon, CheckCircle2, ArrowRight, Play, ShieldAlert } from 'lucide-react';

interface ProductionPlannerPanelProps {
  grafo: RespuestaGrafo;
  onCicloDetectado: (nodosCicloIds: string[]) => void;
  onSelectNode?: (nodoId: string) => void;
  nodoSeleccionadoId?: string | null;
}

export const ProductionPlannerPanel: React.FC<ProductionPlannerPanelProps> = ({
  grafo,
  onCicloDetectado,
  onSelectNode,
  nodoSeleccionadoId
}) => {
  const resultadoOrden = useMemo(() => {
    const res = apiService.calcularOrdenYDetectarCiclos(grafo);
    if (!res.esAciclico && res.cicloDetectado) {
      onCicloDetectado(res.cicloDetectado);
    } else {
      onCicloDetectado([]);
    }
    return res;
  }, [grafo, onCicloDetectado]);

  const getTipoStyle = (tipo: Elemento['tipo']) => {
    switch (tipo) {
      case 'PROVEEDOR':
        return {
          icon: '🏢',
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          indicator: 'bg-blue-500'
        };
      case 'INSUMO':
        return {
          icon: '📦',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          indicator: 'bg-amber-500'
        };
      case 'PROCESO':
        return {
          icon: '⚙️',
          badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          indicator: 'bg-purple-500'
        };
      case 'PRODUCTO':
        return {
          icon: '🏆',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          indicator: 'bg-emerald-500'
        };
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 shadow-2xl space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Play className="text-emerald-400 fill-emerald-400/20" size={20} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white tracking-tight">Secuencia de Preparación</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300 rounded-md">
                Topological DAG
              </span>
            </div>
            <p className="text-xs text-slate-400">Orden de ensamblaje libre de bloqueos y dependencias circulares.</p>
          </div>
        </div>

        {resultadoOrden.esAciclico ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold glow-success">
            <CheckCircle2 size={16} />
            <span>Red Acíclica Saludable (OK)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold glow-alert">
            <AlertOctagon size={16} />
            <span>¡Ciclo Detectado!</span>
          </div>
        )}
      </div>

      {resultadoOrden.esAciclico ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Fases secuenciales de producción:</span>
            <span className="font-semibold text-slate-300">{resultadoOrden.ordenTrabajo.length} pasos calculados</span>
          </div>

          {/* Línea de tiempo visual conectada */}
          <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-sky-500 before:via-purple-500 before:to-emerald-500">
            {resultadoOrden.ordenTrabajo.map((item, index) => {
              const estilo = getTipoStyle(item.tipo);
              const esSeleccionado = nodoSeleccionadoId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectNode?.(item.id)}
                  className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    esSeleccionado
                      ? 'bg-sky-950/40 border-sky-500 shadow-lg shadow-sky-500/15 translate-x-1'
                      : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  {/* Punto en la línea de tiempo */}
                  <div className={`absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] font-black ${
                    esSeleccionado ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xl" role="img" aria-label={item.tipo}>
                      {estilo.icon}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{item.nombre}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-slate-400">{item.id}</span>
                        {item.descripcion && (
                          <span className="text-[11px] text-slate-500 truncate max-w-xs hidden sm:inline">
                            • {item.descripcion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${estilo.badge}`}>
                    {item.tipo}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-5 bg-rose-950/30 border border-rose-500/40 rounded-2xl space-y-4 text-rose-300">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-500/20 rounded-xl text-rose-400 shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">¡Configuración Imposible por Dependencia Circular!</h4>
              <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                El sistema detectó una contradicción de abastecimiento. Por regla de negocio estricta, no se generará un orden falso mientras los siguientes elementos dependan cíclicamente entre sí:
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/90 border border-rose-900/60 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block">Circuito en Conflicto:</span>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {resultadoOrden.cicloDetectado?.map((id, idx) => (
                <React.Fragment key={id}>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-900/40 border border-rose-600/50 text-rose-200 font-bold shadow-sm">
                    {id}
                  </span>
                  {idx < (resultadoOrden.cicloDetectado?.length || 0) - 1 && (
                    <ArrowRight size={14} className="text-rose-500" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
