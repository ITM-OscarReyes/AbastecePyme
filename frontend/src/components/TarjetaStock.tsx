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
      className={`rounded-xl border p-3.5 space-y-2.5 ${
        bajoMinimo
          ? 'bg-red-950/40 border-red-500/30'
          : 'bg-slate-950/80 border-slate-800'
      }`}
    >
      {mostrarTitulo && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Boxes size={14} className={bajoMinimo ? 'text-red-400' : 'text-emerald-400'} />
            Inventario del suministro
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              bajoMinimo
                ? 'bg-red-500/10 text-red-300 border-red-500/25'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
            }`}
          >
            {etiquetaEstadoStock(elemento.estadoStock)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-900/80 border border-slate-800 px-2.5 py-2">
          <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
            Disponible
          </span>
          <span className="text-lg font-black text-white">
            {elemento.stockDisponible ?? 0}
          </span>
          <span className="text-[10px] text-slate-500"> unidades</span>
        </div>
        <div className="rounded-lg bg-slate-900/80 border border-slate-800 px-2.5 py-2">
          <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
            Mínimo aceptable
          </span>
          <span className="text-lg font-black text-white">
            {elemento.stockMinimo ?? 0}
          </span>
          <span className="text-[10px] text-slate-500"> unidades</span>
        </div>
      </div>

      {bajoMinimo ? (
        <p className="text-[11px] text-red-200 flex items-start gap-1.5 leading-relaxed">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-400" />
          <span>
            Alerta de stock: la cantidad disponible está por debajo del mínimo aceptable.
            El suministro está próximo a agotarse.
          </span>
        </p>
      ) : (
        <p className="text-[11px] text-emerald-200/90 flex items-start gap-1.5 leading-relaxed">
          <ShieldCheck size={14} className="shrink-0 mt-0.5 text-emerald-400" />
          <span>El stock disponible cubre el nivel mínimo configurado.</span>
        </p>
      )}
    </div>
  );
};
