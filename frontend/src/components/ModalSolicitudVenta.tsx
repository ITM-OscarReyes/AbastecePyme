import React, { useState } from 'react';
import { CheckCircle2, Clock, PackageCheck, ShoppingBag, X } from 'lucide-react';
import type { Elemento } from '../types';
import { obtenerCodigoSku } from '../utils/sku';

interface ModalSolicitudVentaProps {
  isOpen: boolean;
  onClose: () => void;
  productos: Elemento[];
}

export const ModalSolicitudVenta: React.FC<ModalSolicitudVentaProps> = ({
  isOpen,
  onClose,
  productos
}) => {
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<string>(
    productos[0]?.id || ''
  );
  const [cantidad, setCantidad] = useState<number>(5);
  const [cliente, setCliente] = useState<string>('Distribuidora del Norte S.A.S.');
  const [enviado, setEnviado] = useState<boolean>(false);

  if (!isOpen) return null;

  const productoActual = productos.find((p) => p.id === productoSeleccionadoId) || productos[0];

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    setTimeout(() => {
      setEnviado(false);
      onClose();
    }, 2200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0A101D] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-solicitud-venta"
      >
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 id="titulo-solicitud-venta" className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Solicitud de Producción (Ventas)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Petición comercial dirigida al Coordinador de Producción
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={16} />
          </button>
        </div>

        {enviado ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
              <CheckCircle2 size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              ¡Solicitud Enviada a Producción!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Se ha emitido el requerimiento comercial para <span className="font-bold text-slate-800 dark:text-slate-200">{cantidad} unidades</span> de <span className="font-bold text-slate-800 dark:text-slate-200">{productoActual?.nombre}</span> para el cliente {cliente}.
            </p>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              ORDEN COMERCIAL #SOL-VT-084 REGISTRADA
            </span>
          </div>
        ) : (
          <form onSubmit={handleEnviar} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Producto Terminado a Solicitar:
              </label>
              <select
                value={productoSeleccionadoId}
                onChange={(e) => setProductoSeleccionadoId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#060A14] border border-slate-300 dark:border-white/[0.12] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {productos.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.nombre} [{obtenerCodigoSku(prod.id)}]
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cantidad Requerida (uds):
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-[#060A14] border border-slate-300 dark:border-white/[0.12] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cliente / Destino:
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#060A14] border border-slate-300 dark:border-white/[0.12] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono flex items-center gap-1">
                <Clock size={11} className="text-sky-500" />
                Viabilidad Operativa (Lógica de Producción F3):
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                La solicitud no modifica procesos ni relaciones. Al enviarse, Producción evalúa los insumos y la secuencia acíclica de preparación calculada por el backend.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <PackageCheck size={14} />
                <span>Enviar Solicitud a Planta</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
