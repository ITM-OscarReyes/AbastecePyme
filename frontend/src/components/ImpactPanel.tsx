import React, { useState } from 'react';
import type { RespuestaGrafo, ResultadoImpacto } from '../types';
import { apiService } from '../services/api';
import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ImpactPanelProps {
  grafo: RespuestaGrafo;
  onImpactoCalculado: (nodosAfectadosIds: string[]) => void;
}

export const ImpactPanel: React.FC<ImpactPanelProps> = ({ grafo, onImpactoCalculado }) => {
  const [elementoIdSeleccionado, setElementoIdSeleccionado] = useState<string>('');
  const [resultado, setResultado] = useState<ResultadoImpacto | null>(null);

  const handleSimularImpacto = (id: string) => {
    setElementoIdSeleccionado(id);
    if (!id) {
      setResultado(null);
      onImpactoCalculado([]);
      return;
    }

    const res = apiService.calcularImpacto(id, grafo);
    setResultado(res);
    onImpactoCalculado([id, ...res.elementosAfectados.map(e => e.id)]);
  };

  const elementoOriginal = grafo.elementos.find(e => e.id === elementoIdSeleccionado);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl">
          <ShieldAlert size={22} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Simulador de Análisis de Impacto</h3>
          <p className="text-xs text-slate-400">Evalúa qué procesos y productos quedan paralizados ante la falla de un insumo o proveedor.</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300">Selecciona el elemento fuera de servicio:</label>
        <select
          value={elementoIdSeleccionado}
          onChange={(e) => handleSimularImpacto(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3 py-2 text-xs text-white cursor-pointer transition-all"
        >
          <option value="">-- Seleccionar Elemento --</option>
          {grafo.elementos.map(el => (
            <option key={el.id} value={el.id}>
              [{el.tipo}] {el.nombre} ({el.id})
            </option>
          ))}
        </select>
      </div>

      {resultado && elementoOriginal && (
        <div className="space-y-4 pt-2 border-t border-slate-800 animate-in fade-in duration-200">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Falla Simulada en:</span>
              <h4 className="text-sm font-bold text-red-400">{elementoOriginal.nombre} ({elementoOriginal.id})</h4>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Cadena Paralizada</span>
              <p className="text-lg font-black text-red-500">{resultado.totalAfectados} elementos</p>
            </div>
          </div>

          {resultado.totalAfectados > 0 ? (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                Elementos y Productos Afectados en Cascada:
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {resultado.elementosAfectados.map(af => (
                  <div key={af.id} className="p-2.5 bg-red-950/20 border border-red-900/30 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{af.nombre}</span>
                      <span className="font-mono text-[10px] text-red-400">{af.id}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800/40">
                      {af.tipo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-emerald-400 text-xs font-medium">
              <CheckCircle2 size={16} />
              <span>Este elemento no afecta a ningún otro componente ni producto final en la red actual.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
