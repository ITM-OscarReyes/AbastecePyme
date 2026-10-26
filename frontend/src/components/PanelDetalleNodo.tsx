import React from 'react';
import type { Dependencia, Elemento, ImpactoRespuesta } from '../types';
import {
  AlertOctagon,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Pencil,
  Trash2
} from 'lucide-react';
import { TarjetaStock } from './TarjetaStock';
import { etiquetaTipo } from '../utils/etiquetas';
import { obtenerCodigoSku } from '../utils/sku';

interface PanelDetalleNodoProps {
  elemento: Elemento;
  elementos: Elemento[];
  dependencias: Dependencia[];
  impacto: ImpactoRespuesta | null;
  cargandoImpacto: boolean;
  onEditar: (elemento: Elemento) => void;
  onEliminar: (elemento: Elemento) => void;
  onEditarRelacion: (origen: string, destino: string) => void;
  onEliminarRelacion: (origen: string, destino: string) => void;
}

export const PanelDetalleNodo: React.FC<PanelDetalleNodoProps> = ({
  elemento,
  elementos,
  dependencias,
  impacto,
  cargandoImpacto,
  onEditar,
  onEliminar,
  onEditarRelacion,
  onEliminarRelacion
}) => {
  const entrantes = dependencias.filter((dependencia) => dependencia.destino === elemento.id);
  const salientes = dependencias.filter((dependencia) => dependencia.origen === elemento.id);

  const nombreDe = (id: string): string =>
    elementos.find((candidato) => candidato.id === id)?.nombre ?? id;

  return (
    <div className="glass-card p-5 rounded-2xl shadow-xl space-y-4 animate-in fade-in border border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <span className="font-mono text-xs font-bold text-sky-400">
          {obtenerCodigoSku(elemento.id)}
        </span>
        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
          {etiquetaTipo(elemento.tipo)}
        </span>
      </div>

      <div>
        <h3 className="text-base font-bold text-white">{elemento.nombre}</h3>
        <p className="text-xs text-slate-400 mt-1">
          {elemento.descripcion || 'Sin notas operativas adicionales.'}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onEditar(elemento)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <Pencil size={14} />
          Editar elemento
        </button>
        <button
          type="button"
          onClick={() => onEliminar(elemento)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"
        >
          <Trash2 size={14} />
          Eliminar
        </button>
      </div>

      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">
          Etapa del flujo:
        </span>
        <div className="flex items-center justify-between text-[10px] font-semibold">
          {(['PROVEEDOR', 'INSUMO', 'PROCESO', 'PRODUCTO'] as const).map((tipo, indice) => (
            <React.Fragment key={tipo}>
              {indice > 0 && <span className="text-slate-700 font-bold">→</span>}
              <span
                className={`px-2 py-0.5 rounded transition-colors ${
                  elemento.tipo === tipo
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold'
                    : 'text-slate-600'
                }`}
              >
                {etiquetaTipo(tipo)}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <TarjetaStock elemento={elemento} />

      <div className="p-3.5 rounded-xl border bg-slate-900/90 border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <AlertOctagon
              size={14}
              className={
                impacto && impacto.total > 0 ? 'text-red-400' : 'text-emerald-400'
              }
            />
            Riesgo de continuidad
          </span>
          {impacto && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                impacto.total > 0
                  ? 'bg-red-500/10 text-red-300 border-red-500/25'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
              }`}
            >
              {impacto.total === 0
                ? 'Sin riesgo en cadena'
                : `${impacto.total} en riesgo`}
            </span>
          )}
        </div>

        {cargandoImpacto ? (
          <p className="text-[11px] text-slate-400 italic">
            Evaluando dependencias con el sistema...
          </p>
        ) : impacto ? (
          impacto.total === 0 ? (
            <p className="text-[11px] text-emerald-300/90 leading-relaxed">
              Elemento terminal: su indisponibilidad no detiene otras estaciones ni productos
              de la cadena.
            </p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[11px] text-red-300/90 leading-relaxed">
                Alerta: su indisponibilidad afecta a los elementos resaltados en rojo en el
                mapa.
              </p>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {impacto.afectados.map((afectado) => (
                  <span
                    key={afectado.id}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/80 text-red-200 border border-red-800/40"
                    title={`${afectado.nombre} (${etiquetaTipo(afectado.tipo)})`}
                  >
                    {afectado.nombre} [{obtenerCodigoSku(afectado.id)}]
                  </span>
                ))}
              </div>
            </div>
          )
        ) : null}
      </div>

      <div className="pt-2 border-t border-slate-800 space-y-2">
        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <ArrowDownLeft size={14} className="text-sky-400" />
          Requiere o es abastecido por
        </h4>
        <ul className="space-y-1.5 text-xs">
          {entrantes.map((dependencia) => (
            <li
              key={`${dependencia.origen}-${dependencia.destino}`}
              className="p-2 bg-slate-950 rounded-lg text-slate-300 flex items-center justify-between gap-2 border border-slate-800/80"
            >
              <span className="min-w-0 truncate font-medium">
                {nombreDe(dependencia.origen)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-slate-500 font-mono text-[10px]">
                  [{obtenerCodigoSku(dependencia.origen)}]
                </span>
                <button
                  type="button"
                  onClick={() => onEditarRelacion(dependencia.origen, dependencia.destino)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-sky-300"
                  title="Editar relación"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onEliminarRelacion(dependencia.origen, dependencia.destino)}
                  className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                  title="Eliminar relación"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
          {entrantes.length === 0 && (
            <li className="text-slate-500 text-[11px] italic p-2 bg-slate-950/50 rounded-lg">
              Sin relaciones de entrada.
            </li>
          )}
        </ul>
      </div>

      <div className="pt-2 border-t border-slate-800 space-y-2">
        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <ArrowUpRight size={14} className="text-emerald-400" />
          Habilita o abastece a
        </h4>
        <ul className="space-y-1.5 text-xs">
          {salientes.map((dependencia) => (
            <li
              key={`${dependencia.origen}-${dependencia.destino}`}
              className="p-2 bg-slate-950 rounded-lg text-slate-300 flex items-center justify-between gap-2 border border-slate-800/80"
            >
              <span className="min-w-0 truncate font-medium">
                {nombreDe(dependencia.destino)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-slate-500 font-mono text-[10px]">
                  [{obtenerCodigoSku(dependencia.destino)}]
                </span>
                <button
                  type="button"
                  onClick={() => onEditarRelacion(dependencia.origen, dependencia.destino)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-sky-300"
                  title="Editar relación"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onEliminarRelacion(dependencia.origen, dependencia.destino)}
                  className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                  title="Eliminar relación"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
          {salientes.length === 0 && (
            <li className="text-slate-500 text-[11px] italic p-2 bg-slate-950/50 rounded-lg">
              Sin relaciones de salida: es el final de la cadena.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export const MensajeSinSeleccion: React.FC = () => (
  <div className="glass-card p-6 rounded-2xl text-center space-y-3 border border-slate-800">
    <Layers size={32} className="mx-auto text-slate-600" />
    <h4 className="text-sm font-bold text-white">Inspeccionar elemento de la cadena</h4>
    <p className="text-xs text-slate-400 leading-relaxed">
      Haz clic sobre cualquier proveedor, suministro, proceso o producto en el mapa para
      consultar su información, su stock, sus relaciones y su impacto operativo.
    </p>
  </div>
);
