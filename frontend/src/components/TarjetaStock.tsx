import React from 'react';
import type { EstadoStock, TipoElemento } from '../types';
import { AlertTriangle, Boxes, ShieldCheck } from 'lucide-react';
import { etiquetaEstadoStock } from '../utils/etiquetas';

interface ElementoConStock {
  tipo: TipoElemento;
  stockDisponible: number | null;
  stockMinimo: number | null;
  estadoStock: EstadoStock;
  alertaStock: boolean;
}

interface TarjetaStockProps {
  elemento: ElementoConStock;
  mostrarTitulo?: boolean;
}

/**
 * Inventario de un suministro. Solo se pinta para elementos que manejan
 * inventario; el estado y la alerta los calcula el backend.
 */
export const TarjetaStock: React.FC<TarjetaStockProps> = ({ elemento, mostrarTitulo = true }) => {
  if (elemento.tipo !== 'INSUMO') return null;

  const bajoMinimo = elemento.alertaStock;

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 font-mono ${
        bajoMinimo
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-white/[0.08]'
      }`}
    >
      {mostrarTitulo && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Boxes size={13} className={bajoMinimo ? 'text-red-500' : 'text-emerald-500'} />
            INVENTARIO DEL SUMINISTRO
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
              bajoMinimo
                ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
          >
            {etiquetaEstadoStock(elemento.estadoStock)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] px-2.5 py-1.5 shadow-xs">
          <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">
            DISPONIBLE
          </span>
          <span className="text-base font-black font-mono tabular-nums text-slate-900 dark:text-white">
            {elemento.stockDisponible ?? 0}
          </span>
          <span className="text-[9px] text-slate-400"> UDS</span>
        </div>
        <div className="rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] px-2.5 py-1.5 shadow-xs">
          <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">
            MÍNIMO
          </span>
          <span className="text-base font-black font-mono tabular-nums text-slate-900 dark:text-white">
            {elemento.stockMinimo ?? 0}
          </span>
          <span className="text-[10px] text-slate-500"> unidades</span>
        </div>
      </div>

      {bajoMinimo ? (
        <p className="text-[11px] text-red-700 dark:text-red-200 flex items-start gap-1.5 leading-relaxed font-medium">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <span>
            Alerta de stock: la cantidad disponible está por debajo del mínimo aceptable.
            El suministro está próximo a agotarse.
          </span>
        </p>
      ) : (
        <p className="text-[11px] text-emerald-700 dark:text-emerald-200/90 flex items-start gap-1.5 leading-relaxed font-medium">
          <ShieldCheck size={14} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <span>El stock disponible cubre el nivel mínimo configurado.</span>
        </p>
      )}
    </div>
  );
};
