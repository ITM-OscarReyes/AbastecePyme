import React, { useMemo, useState } from 'react';
import type {
  CrearDependenciaDto,
  Elemento,
  ReglaDependencia,
  TipoElemento
} from '../types';
import { X, AlertCircle, ArrowRight, CheckCircle2, GitCommitHorizontal, Info, ShieldAlert } from 'lucide-react';
import { etiquetaTipo } from '../utils/etiquetas';
import { obtenerCodigoSku } from '../utils/sku';

interface ModalCrearDependenciaProps {
  isOpen: boolean;
  elementos: Elemento[];
  reglas: ReglaDependencia[];
  relacionEditar?: { origen: string; destino: string } | null;
  onClose: () => void;
  onSubmit: (dto: CrearDependenciaDto) => Promise<void>;
  onSolicitarEdicion?: (
    origenActual: string,
    destinoActual: string,
    dto: CrearDependenciaDto
  ) => void;
}

const TIPOS: TipoElemento[] = ['PROVEEDOR', 'INSUMO', 'PROCESO', 'PRODUCTO'];

export const ModalCrearDependencia: React.FC<ModalCrearDependenciaProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <FormularioDependencia
      key={`${props.relacionEditar?.origen ?? 'nueva'}-${props.relacionEditar?.destino ?? ''}`}
      {...props}
    />
  );
};

const FormularioDependencia: React.FC<ModalCrearDependenciaProps> = ({
  elementos,
  reglas,
  relacionEditar,
  onClose,
  onSubmit,
  onSolicitarEdicion
}) => {
  const origenInicial = relacionEditar
    ? elementos.find((elemento) => elemento.id === relacionEditar.origen)
    : undefined;
  const destinoInicial = relacionEditar
    ? elementos.find((elemento) => elemento.id === relacionEditar.destino)
    : undefined;

  const [tipoOrigen, setTipoOrigen] = useState<TipoElemento | ''>(origenInicial?.tipo ?? '');
  const [origen, setOrigen] = useState(relacionEditar?.origen ?? '');
  const [tipoDestino, setTipoDestino] = useState<TipoElemento | ''>(destinoInicial?.tipo ?? '');
  const [destino, setDestino] = useState(relacionEditar?.destino ?? '');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const elementoOrigen = elementos.find((elemento) => elemento.id === origen);
  const elementoDestino = elementos.find((elemento) => elemento.id === destino);

  const reglaSeleccionada = useMemo<ReglaDependencia | undefined>(() => {
    if (!tipoOrigen || !tipoDestino) return undefined;
    return reglas.find(
      (regla) => regla.tipoOrigen === tipoOrigen && regla.tipoDestino === tipoDestino
    );
  }, [reglas, tipoOrigen, tipoDestino]);

  const esEdicion = Boolean(relacionEditar);
  const elementosOrigen = elementos.filter((elemento) =>
    tipoOrigen ? elemento.tipo === tipoOrigen : false
  );
  const elementosDestino = elementos.filter((elemento) =>
    tipoDestino ? elemento.tipo === tipoDestino : false
  );

  const reglasPorOrigen = TIPOS.map((tipo) => ({
    tipo,
    permitidas: reglas
      .filter((regla) => regla.tipoOrigen === tipo && regla.permitida)
      .sort((a, b) => TIPOS.indexOf(a.tipoDestino) - TIPOS.indexOf(b.tipoDestino))
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!origen || !destino) {
      setErrorLocal('Debes seleccionar el tipo y el elemento de origen y de destino.');
      return;
    }
    if (reglaSeleccionada && !reglaSeleccionada.permitida) {
      setErrorLocal(reglaSeleccionada.motivo);
      return;
    }

    if (esEdicion && relacionEditar) {
      onSolicitarEdicion?.(relacionEditar.origen, relacionEditar.destino, { origen, destino });
      return;
    }

    try {
      setCargando(true);
      await onSubmit({ origen, destino });
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setErrorLocal(err.message);
      } else {
        setErrorLocal('Error al registrar la relación entre elementos.');
      }
    } finally {
      setCargando(false);
    }
  };

  const puedeEnviar = Boolean(origen && destino && reglaSeleccionada?.permitida);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
            <GitCommitHorizontal size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {esEdicion ? 'Editar Relación de Suministro' : 'Enlazar Suministro'}
            </h2>
            <p className="text-xs text-slate-400">
              Elige primero el tipo de elemento y luego el elemento concreto.
            </p>
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
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                Origen · habilita a
              </span>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tipo de elemento
                </label>
                <select
                  value={tipoOrigen}
                  onChange={(e) => {
                    setTipoOrigen(e.target.value as TipoElemento | '');
                    setOrigen('');
                  }}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3 py-2 text-sm text-white transition-all"
                >
                  <option value="">Selecciona el tipo...</option>
                  {TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {etiquetaTipo(tipo)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Elemento de origen
                </label>
                <select
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  required
                  disabled={!tipoOrigen}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3 py-2 text-sm text-white transition-all disabled:opacity-50"
                >
                  <option value="">
                    {tipoOrigen ? 'Selecciona el elemento...' : 'Primero elige el tipo'}
                  </option>
                  {elementosOrigen.map((elemento) => (
                    <option key={elemento.id} value={elemento.id}>
                      {elemento.nombre} ({obtenerCodigoSku(elemento.id)})
                    </option>
                  ))}
                </select>
                {tipoOrigen && elementosOrigen.length === 0 && (
                  <p className="mt-1 text-[10px] text-amber-300">
                    No hay elementos de este tipo registrados.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Destino · es habilitado por
              </span>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tipo de elemento
                </label>
                <select
                  value={tipoDestino}
                  onChange={(e) => {
                    setTipoDestino(e.target.value as TipoElemento | '');
                    setDestino('');
                  }}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3 py-2 text-sm text-white transition-all"
                >
                  <option value="">Selecciona el tipo...</option>
                  {TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {etiquetaTipo(tipo)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Elemento de destino
                </label>
                <select
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  required
                  disabled={!tipoDestino}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3 py-2 text-sm text-white transition-all disabled:opacity-50"
                >
                  <option value="">
                    {tipoDestino ? 'Selecciona el elemento...' : 'Primero elige el tipo'}
                  </option>
                  {elementosDestino.map((elemento) => (
                    <option key={elemento.id} value={elemento.id}>
                      {elemento.nombre} ({obtenerCodigoSku(elemento.id)})
                    </option>
                  ))}
                </select>
                {tipoDestino && elementosDestino.length === 0 && (
                  <p className="mt-1 text-[10px] text-amber-300">
                    No hay elementos de este tipo registrados.
                  </p>
                )}
              </div>
            </div>
          </div>

          {elementoOrigen && elementoDestino && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
              <span className="font-semibold text-sky-400">{elementoOrigen.nombre}</span>
              <div className="flex shrink-0 items-center gap-1 text-slate-500">
                <span className="text-[10px] font-bold uppercase text-slate-400">habilita</span>
                <ArrowRight size={14} />
              </div>
              <span className="font-semibold text-emerald-400">{elementoDestino.nombre}</span>
            </div>
          )}

          {reglaSeleccionada && (
            <div
              className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                reglaSeleccionada.permitida
                  ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-200'
                  : 'border-red-500/25 bg-red-500/5 text-red-200'
              }`}
            >
              {reglaSeleccionada.permitida ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
              ) : (
                <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-400" />
              )}
              <div>
                <p className="font-bold">
                  {reglaSeleccionada.permitida
                    ? 'Relación permitida'
                    : 'Relación no permitida'}
                </p>
                <p className="mt-0.5 leading-relaxed opacity-90">{reglaSeleccionada.motivo}</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-sky-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Reglas generales de dependencia
              </span>
            </div>
            <div className="space-y-2">
              {reglas.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  Cargando las reglas de dependencia del servidor...
                </p>
              ) : (
                reglasPorOrigen.map(({ tipo, permitidas }) => (
                  <div
                    key={tipo}
                    className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-xs font-semibold text-slate-200">{etiquetaTipo(tipo)}</span>
                    <span className="text-[11px] text-slate-400">
                      {permitidas.length === 0
                        ? 'No habilita a ningún otro elemento: es el final de la cadena.'
                        : `Puede habilitar a: ${permitidas
                            .map((regla) => etiquetaTipo(regla.tipoDestino).toLowerCase())
                            .join(', ')}.`}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Un suministro debe estar asociado a un proveedor o proceso antes de enlazarse
              con un proceso o producto. Esa condición se comprueba al confirmar la relación.
            </p>
          </div>

          {!reglaSeleccionada && (
            <p className="text-[11px] text-slate-500">
              Selecciona el tipo de origen y de destino para ver si la relación está permitida.
            </p>
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
              disabled={cargando || !puedeEnviar}
              className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando
                ? 'Conectando...'
                : esEdicion
                  ? 'Guardar cambios'
                  : 'Crear dependencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
