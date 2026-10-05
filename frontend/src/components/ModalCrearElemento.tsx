import React, { useState } from 'react';
import type { CrearElementoDto, TipoElemento } from '../types';
import { X, AlertCircle, PlusCircle } from 'lucide-react';

interface ModalCrearElementoProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CrearElementoDto) => Promise<void>;
}

export const ModalCrearElemento: React.FC<ModalCrearElementoProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [id, setId] = useState('');
  const [tipo, setTipo] = useState<TipoElemento>('INSUMO');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const idNormalizado = id.trim().toUpperCase();
    const nombreNormalizado = nombre.trim();
    const descNormalizada = descripcion.trim() || undefined;

    // Validación básica previa
    const regexId = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;
    if (!regexId.test(idNormalizado)) {
      setErrorLocal('El ID debe tener entre 3 y 40 caracteres alfanuméricos en mayúsculas (ej: INS-TORNILLO).');
      return;
    }
    if (nombreNormalizado.length < 3 || nombreNormalizado.length > 80) {
      setErrorLocal('El nombre debe tener entre 3 y 80 caracteres.');
      return;
    }

    try {
      setCargando(true);
      await onSubmit({
        id: idNormalizado,
        tipo,
        nombre: nombreNormalizado,
        descripcion: descNormalizada
      });
      // Limpiar y cerrar
      setId('');
      setNombre('');
      setDescripcion('');
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setErrorLocal(err.message);
      } else {
        setErrorLocal('Error al registrar el elemento.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
            <PlusCircle size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Nuevo Elemento</h2>
            <p className="text-xs text-slate-400">Registra un proveedor, insumo, proceso o producto.</p>
          </div>
        </div>

        {errorLocal && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorLocal}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Identificador Único (ID)</label>
            <input
              type="text"
              placeholder="ej: INS-TORNILLO, PROD-PANEL"
              value={id}
              onChange={(e) => setId(e.target.value.toUpperCase())}
              required
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 transition-all uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Elemento</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoElemento)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-sm text-white transition-all"
            >
              <option value="PROVEEDOR">PROVEEDOR (Proveedor externo)</option>
              <option value="INSUMO">INSUMO (Materia prima / componente)</option>
              <option value="PROCESO">PROCESO (Operación interna)</option>
              <option value="PRODUCTO">PRODUCTO (Producto final)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre</label>
            <input
              type="text"
              placeholder="ej: Tornillo hexagonal M6"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción (Opcional)</label>
            <textarea
              placeholder="Descripción opcional del elemento..."
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 transition-all resize-none"
            />
          </div>

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
              className="px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50"
            >
              {cargando ? 'Guardando...' : 'Crear Elemento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
