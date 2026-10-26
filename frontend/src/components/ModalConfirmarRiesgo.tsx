import React from 'react';
import type { ImpactoRespuesta, TipoElemento } from '../types';
import { AlertOctagon, AlertTriangle, ArrowRight, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { etiquetaTipo, etiquetaTipoPlural } from '../utils/etiquetas';
import { obtenerCodigoSku as codigoSku } from '../utils/sku';

interface ModalConfirmarRiesgoProps {
  abierto: boolean;
  titulo: string;
  accion: 'editar' | 'eliminar';
  descripcion: string;
  detalle?: string | null;
  impacto: ImpactoRespuesta | null;
  cargando: boolean;
  error?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

const TIPOS_AFECTADOS: TipoElemento[] = ['INSUMO', 'PROCESO', 'PRODUCTO', 'PROVEEDOR'];

export const ModalConfirmarRiesgo: React.FC<ModalConfirmarRiesgoProps> = ({
  abierto,
  titulo,
  accion,
  descripcion,
  detalle,
  impacto,
  cargando,
  error,
  onConfirmar,
  onCancelar
}) => {
  if (!abierto) return null;

  const esEliminar = accion === 'eliminar';
  const afectados = impacto?.afectados ?? [];
  const suministrosConAlerta = afectados.filter((afectado) => afectado.alertaStock);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-confirmar-riesgo"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-xl border p-2.5 ${
                esEliminar
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {esEliminar ? <Trash2 size={22} /> : <Pencil size={22} />}
            </div>
            <div>
              <h2 id="titulo-confirmar-riesgo" className="text-base font-bold text-white">
                {titulo}
              </h2>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">{descripcion}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {detalle && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
              {detalle}
            </div>
          )}

          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertOctagon size={17} className="text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Efectos sobre la continuidad operativa
              </h3>
            </div>

            {cargando ? (
              <p className="flex items-center gap-2 text-xs text-slate-300">
                <Loader2 size={15} className="animate-spin text-amber-400" />
                Calculando los elementos que podrían verse afectados...
              </p>
            ) : impacto ? (
              impacto.total === 0 ? (
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  El análisis no detecta procesos ni productos que dependan de este elemento.
                  La cadena no se vería afectada aguas abajo.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-amber-100/90 leading-relaxed">
                    Esta acción puede afectar a <strong>{impacto.total}</strong>{' '}
                    {impacto.total === 1 ? 'elemento' : 'elementos'} de la cadena. Revisa la
                    lista antes de confirmar.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {TIPOS_AFECTADOS.map((tipo) => {
                      const cantidad = afectados.filter((afectado) => afectado.tipo === tipo).length;
                      if (cantidad === 0) return null;
                      return (
                        <span
                          key={tipo}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-semibold text-slate-300"
                        >
                          {etiquetaTipoPlural(tipo)}: {cantidad}
                        </span>
                      );
                    })}
                  </div>

                  <ul className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                    {afectados.map((afectado) => (
                      <li
                        key={afectado.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ArrowRight size={13} className="shrink-0 text-red-400" />
                          <span className="truncate font-medium text-slate-200">
                            {afectado.nombre}
                          </span>
                          {afectado.alertaStock && (
                            <span className="shrink-0 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-300">
                              Stock bajo
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-mono text-[10px] text-sky-400">
                            {codigoSku(afectado.id)}
                          </span>
                          <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">
                            {etiquetaTipo(afectado.tipo)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {suministrosConAlerta.length > 0 && (
                    <p className="flex items-start gap-1.5 text-[11px] text-red-200">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
                      Hay {suministrosConAlerta.length} suministro(s) afectado(s) con stock por
                      debajo del mínimo. El impacto puede ser inmediato.
                    </p>
                  )}
                </div>
              )
            ) : (
              <p className="text-xs text-slate-400">
                No se pudo calcular la afectación, pero la operación puede modificar la cadena.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 p-5">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={cargando}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50 ${
              esEliminar
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
            }`}
          >
            {esEliminar ? <Trash2 size={15} /> : <Pencil size={15} />}
            <span>{esEliminar ? 'Confirmar eliminación' : 'Confirmar cambios'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
