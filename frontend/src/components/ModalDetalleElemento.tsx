import React from 'react';
import type { Dependencia, Elemento } from '../types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckSquare,
  Cog,
  Info,
  Network,
  Package,
  Pencil,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { TarjetaStock } from './TarjetaStock';
import { etiquetaTipo } from '../utils/etiquetas';
import { obtenerCodigoSku } from '../utils/sku';

interface ModalDetalleElementoProps {
  elemento: Elemento | null;
  elementos: Elemento[];
  dependencias: Dependencia[];
  modo: 'catalogo' | 'afectado';
  onCerrar: () => void;
  onVerEnMapa: (id: string) => void;
  onEvaluarImpacto: (id: string) => void;
  onEditar?: (elemento: Elemento) => void;
  onEliminar?: (elemento: Elemento) => void;
}

const iconoTipo = (tipo: Elemento['tipo']) => {
  switch (tipo) {
    case 'PROVEEDOR':
      return <Building2 size={17} className="text-blue-400" />;
    case 'INSUMO':
      return <Package size={17} className="text-amber-400" />;
    case 'PROCESO':
      return <Cog size={17} className="text-purple-400" />;
    case 'PRODUCTO':
      return <CheckSquare size={17} className="text-emerald-400" />;
  }
};

export const ModalDetalleElemento: React.FC<ModalDetalleElementoProps> = ({
  elemento,
  elementos,
  dependencias,
  modo,
  onCerrar,
  onVerEnMapa,
  onEvaluarImpacto,
  onEditar,
  onEliminar
}) => {
  if (!elemento) return null;

  const entrantes = dependencias.filter((dependencia) => dependencia.destino === elemento.id);
  const salientes = dependencias.filter((dependencia) => dependencia.origen === elemento.id);
  const gestionHabilitada = modo === 'catalogo';

  const nombreDe = (id: string): string =>
    elementos.find((candidato) => candidato.id === id)?.nombre ?? id;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-detalle-elemento"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-2.5">
              {iconoTipo(elemento.tipo)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-sky-400">
                  {obtenerCodigoSku(elemento.id)}
                </span>
                <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                  {etiquetaTipo(elemento.tipo)}
                </span>
                {elemento.alertaStock && (
                  <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    Stock bajo
                  </span>
                )}
              </div>
              <h2 id="titulo-detalle-elemento" className="mt-1 text-lg font-bold text-white">
                {elemento.nombre}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {modo === 'afectado'
                  ? 'Elemento afectado por el análisis de impacto'
                  : 'Ficha de consulta del elemento'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Descripción
            </h3>
            <p className="text-xs leading-relaxed text-slate-300">
              {elemento.descripcion || 'Sin descripción registrada para este elemento.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Identificador
              </span>
              <span className="mt-1 block break-all font-mono text-xs font-semibold text-sky-400">
                {elemento.id}
              </span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Tipo
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                {iconoTipo(elemento.tipo)}
                {etiquetaTipo(elemento.tipo)}
              </span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Relaciones
              </span>
              <span className="mt-1 block text-xs font-semibold text-slate-200">
                {entrantes.length} entrada(s) · {salientes.length} salida(s)
              </span>
            </div>
          </div>

          <TarjetaStock elemento={elemento} />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <ArrowDownLeft size={14} className="text-sky-400" />
                Requiere o es abastecido por
              </h3>
              {entrantes.length === 0 ? (
                <p className="text-[11px] italic text-slate-500">Sin relaciones de entrada.</p>
              ) : (
                <ul className="space-y-1.5">
                  {entrantes.map((dependencia) => (
                    <li
                      key={`${dependencia.origen}-${dependencia.destino}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="truncate text-slate-300">
                        {nombreDe(dependencia.origen)}
                      </span>
                      <span className="shrink-0 font-mono text-[9px] text-slate-500">
                        {obtenerCodigoSku(dependencia.origen)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <ArrowUpRight size={14} className="text-emerald-400" />
                Habilita o abastece a
              </h3>
              {salientes.length === 0 ? (
                <p className="text-[11px] italic text-slate-500">Sin relaciones de salida.</p>
              ) : (
                <ul className="space-y-1.5">
                  {salientes.map((dependencia) => (
                    <li
                      key={`${dependencia.origen}-${dependencia.destino}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="truncate text-slate-300">
                        {nombreDe(dependencia.destino)}
                      </span>
                      <span className="shrink-0 font-mono text-[9px] text-slate-500">
                        {obtenerCodigoSku(dependencia.destino)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {modo === 'afectado' && (
            <div className="flex items-start gap-2 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3 text-[11px] text-sky-200">
              <Info size={15} className="mt-0.5 shrink-0 text-sky-400" />
              <span>
                Esta ficha es solo de consulta. Puedes verlo en el mapa o iniciar un nuevo
                análisis de impacto tomando este elemento como punto de partida.
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 p-5">
          <button
            type="button"
            onClick={() => onVerEnMapa(elemento.id)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-sky-300 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <Network size={15} />
            Ver en el mapa
          </button>
          <button
            type="button"
            onClick={() => onEvaluarImpacto(elemento.id)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
          >
            <Zap size={15} />
            {modo === 'afectado' ? 'Iniciar análisis de impacto' : 'Evaluar impacto'}
          </button>
          {gestionHabilitada && onEditar && (
            <button
              type="button"
              onClick={() => onEditar(elemento)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <Pencil size={15} />
              Editar
            </button>
          )}
          {gestionHabilitada && onEliminar && (
            <button
              type="button"
              onClick={() => onEliminar(elemento)}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"
            >
              <Trash2 size={15} />
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
