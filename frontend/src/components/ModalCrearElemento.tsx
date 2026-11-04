import React, { useState } from 'react';
import type {
  ActualizarElementoDto,
  CrearElementoDto,
  Elemento,
  TipoElemento
} from '../types';
import { AlertCircle, Boxes, Pencil, PlusCircle, X } from 'lucide-react';
import { etiquetaTipo } from '../utils/etiquetas';

interface ModalCrearElementoProps {
  isOpen: boolean;
  elementos?: Elemento[];
  elementoEditar?: Elemento | null;
  onClose: () => void;
  onSubmit: (dto: CrearElementoDto) => Promise<void>;
  onSolicitarGuardar?: (dto: ActualizarElementoDto) => void;
}

const TIPOS: TipoElemento[] = ['PROVEEDOR', 'INSUMO', 'PROCESO', 'PRODUCTO'];

export const ModalCrearElemento: React.FC<ModalCrearElementoProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <FormularioElemento
      key={props.elementoEditar?.id ?? 'nuevo-elemento'}
      {...props}
    />
  );
};

const FormularioElemento: React.FC<ModalCrearElementoProps> = ({
  elementos,
  elementoEditar,
  onClose,
  onSubmit,
  onSolicitarGuardar
}) => {
  const [id, setId] = useState(elementoEditar?.id ?? '');
  const [tipo, setTipo] = useState<TipoElemento>(elementoEditar?.tipo ?? 'INSUMO');
  const [nombre, setNombre] = useState(elementoEditar?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(elementoEditar?.descripcion ?? '');
  const [stockDisponible, setStockDisponible] = useState(
    String(elementoEditar?.stockDisponible ?? 0)
  );
  const [stockMinimo, setStockMinimo] = useState(
    String(elementoEditar?.stockMinimo ?? 0)
  );
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const esEdicion = Boolean(elementoEditar);
  const manejaInventario = tipo === 'INSUMO';

  const sugerirIdUnico = () => {
    const prefijos: Record<TipoElemento, string> = {
      PROVEEDOR: 'PROV',
      INSUMO: 'INS',
      PROCESO: 'PROC',
      PRODUCTO: 'PROD',
    };
    const prefijo = prefijos[tipo] || 'ELM';
    const elementosExistentes = elementos || [];

    let correlativo = 1;
    let candidato = `${prefijo}-${String(correlativo).padStart(4, '0')}`;
    while (elementosExistentes.some((e) => e.id.toUpperCase() === candidato)) {
      correlativo += 1;
      candidato = `${prefijo}-${String(correlativo).padStart(4, '0')}`;
    }
    setId(candidato);
  };

  const construirDtoCreacion = (): CrearElementoDto => ({
    id,
    tipo,
    nombre,
    descripcion: descripcion || undefined,
    ...(manejaInventario
      ? {
          stockDisponible: Number(stockDisponible || 0),
          stockMinimo: Number(stockMinimo || 0)
        }
      : {})
  });

  const construirDtoEdicion = (): ActualizarElementoDto => ({
    nombre,
    descripcion: descripcion || null,
    ...(manejaInventario
      ? {
          stockDisponible: Number(stockDisponible || 0),
          stockMinimo: Number(stockMinimo || 0)
        }
      : {})
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (esEdicion) {
      onSolicitarGuardar?.(construirDtoEdicion());
      return;
    }

    // El formulario no decide si el dato es válido: solo lo envía y muestra el
    // error que devuelve la API.
    try {
      setCargando(true);
      await onSubmit(construirDtoCreacion());
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
            {esEdicion ? <Pencil size={22} /> : <PlusCircle size={22} />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {esEdicion ? 'Editar Elemento' : 'Nuevo Elemento'}
            </h2>
            <p className="text-xs text-slate-400">
              {esEdicion
                ? 'Actualiza los datos del elemento. El código y el tipo se conservan.'
                : 'Registra un proveedor, suministro, proceso o producto con código único.'}
            </p>
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Identificador Único (ID / Código)</label>
              {!esEdicion && (
                <button
                  type="button"
                  onClick={sugerirIdUnico}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Generar correlativo alfanumérico único para planta"
                >
                  <span>⚡ Generar Código Único</span>
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="ej: INS-0001, INS-TORNILLO, PROD-0001"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              disabled={esEdicion}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 transition-all uppercase font-mono disabled:opacity-60"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {esEdicion
                ? 'El código es inmutable para conservar la trazabilidad del catálogo.'
                : 'Estándar SKU [Categoría]-[Correlativo] (ej: INS-0001). Inmutable ante cambios de nombre y compatible con ERPs y etiquetas.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Elemento</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoElemento)}
              disabled={esEdicion}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-sm text-white transition-all disabled:opacity-60"
            >
              {TIPOS.map((valor) => (
                <option key={valor} value={valor}>
                  {etiquetaTipo(valor)} ({valor})
                </option>
              ))}
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

          {manejaInventario && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-amber-300">
                <Boxes size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Inventario del suministro</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Stock disponible
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={stockDisponible}
                    onChange={(e) => setStockDisponible(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nivel mínimo aceptable
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Cuando la cantidad disponible sea inferior al nivel mínimo, el sistema mostrará
                una alerta de stock próximo a agotarse.
              </p>
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
              className="px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50"
            >
              {cargando
                ? 'Guardando...'
                : esEdicion
                  ? 'Guardar cambios'
                  : 'Crear Elemento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
