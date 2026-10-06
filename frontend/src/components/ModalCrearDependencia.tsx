import React, { useState } from 'react';
import type { CrearDependenciaDto, Elemento } from '../types';
import { X, AlertCircle, GitCommitHorizontal, ArrowRight } from 'lucide-react';

interface ModalCrearDependenciaProps {
  isOpen: boolean;
  elementos: Elemento[];
  onClose: () => void;
  onSubmit: (dto: CrearDependenciaDto) => Promise<void>;
}

export const ModalCrearDependencia: React.FC<ModalCrearDependenciaProps> = ({
  isOpen,
  elementos,
  onClose,
  onSubmit
}) => {
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const elementoOrigen = elementos.find(e => e.id === origen);
  const elementoDestino = elementos.find(e => e.id === destino);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    // La dirección, la existencia de los extremos y las relaciones inválidas se
    // deciden en el backend; aquí solo se envía y se muestra el error recibido
    // (docs/architecture.md, sección 2).
    if (!origen || !destino) {
      setErrorLocal('Debes seleccionar tanto el elemento de origen como el de destino.');
      return;
    }

    try {
      setCargando(true);
      await onSubmit({ origen, destino });
      setOrigen('');
      setDestino('');
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setErrorLocal(err.message);
      } else {
        setErrorLocal('Error al registrar la dependencia.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
            <GitCommitHorizontal size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Nueva Dependencia Dirigida</h2>
            <p className="text-xs text-slate-400">Establece qué elemento habilita o es requerido por otro.</p>
          </div>
        </div>

        {errorLocal && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorLocal}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Origen (Habilita a...)</label>
              <select
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3 py-2 text-sm text-white transition-all"
              >
                <option value="">Selecciona Origen...</option>
                {elementos.map(e => (
                  <option key={e.id} value={e.id}>
                    [{e.tipo}] {e.nombre} ({e.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Destino (Habilitado por...)</label>
              <select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3 py-2 text-sm text-white transition-all"
              >
                <option value="">Selecciona Destino...</option>
                {elementos.map(e => (
                  <option key={e.id} value={e.id}>
                    [{e.tipo}] {e.nombre} ({e.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tarjeta Explicativa de la Dirección de la Relación */}
          {elementoOrigen && elementoDestino && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3 text-xs text-slate-300">
              <span className="font-semibold text-sky-400">{elementoOrigen.nombre}</span>
              <div className="flex items-center gap-1 text-slate-500 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400">habilita</span>
                <ArrowRight size={14} />
              </div>
              <span className="font-semibold text-emerald-400">{elementoDestino.nombre}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
            >
              {cargando ? 'Conectando...' : 'Crear Dependencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
