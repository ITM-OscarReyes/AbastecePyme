import React, { useEffect } from 'react';
import {
  AlertOctagon,
  Boxes,
  Building2,
  CheckSquare,
  Cog,
  HelpCircle,
  Info,
  Network,
  Package,
  ShieldCheck,
  X,
  Zap
} from 'lucide-react';
import type { TabActiva } from './HeaderNavbar';

interface ModalAyudaOperativaProps {
  abierto: boolean;
  onCerrar: () => void;
  onNavegar?: (tab: TabActiva) => void;
}

const navegar = (onNavegar: ((tab: TabActiva) => void) | undefined, tab: TabActiva) => {
  onNavegar?.(tab);
};

export const ModalAyudaOperativa: React.FC<ModalAyudaOperativaProps> = ({
  abierto,
  onCerrar,
  onNavegar
}) => {
  useEffect(() => {
    const manejarEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && abierto) {
        onCerrar();
      }
    };
    window.addEventListener('keydown', manejarEscape);
    return () => window.removeEventListener('keydown', manejarEscape);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-guia-operativa"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
    >
      <div className="glass-card bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 id="titulo-guia-operativa" className="text-base font-bold text-white">
                Guía de uso de AbastecePyme
              </h2>
              <p className="text-xs text-slate-400">
                Cómo consultar la cadena, gestionar sus elementos y evaluar impactos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar guía (Escape)"
          >
            <X size={18} />
          </button>
        </div>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Cómo se relacionan los elementos
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            La cadena se lee de izquierda a derecha: cada flecha indica que el elemento de la
            izquierda permite preparar el de la derecha. Por ejemplo, un proveedor entrega una
            barra de acero; la barra alimenta el proceso de corte; el corte produce un panel.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30 flex items-start gap-2.5">
              <Building2 size={18} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-blue-300">Proveedor</span>
                <p className="text-[11px] text-slate-400">
                  Fuente externa. Puede abastecer suministros, procesos o productos.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex items-start gap-2.5">
              <Package size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-300">Suministro</span>
                <p className="text-[11px] text-slate-400">
                  Material o componente con inventario. Debe estar asociado a un proveedor o a un
                  proceso y puede alimentar procesos y productos.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30 flex items-start gap-2.5">
              <Cog size={18} className="text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-purple-300">Proceso</span>
                <p className="text-[11px] text-slate-400">
                  Estación interna que transforma suministros. Puede generar suministros o
                  productos y también recibir suministros de un proveedor.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-start gap-2.5">
              <CheckSquare size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-emerald-300">Producto</span>
                <p className="text-[11px] text-slate-400">
                  Artículo final listo para despacho. Es el final de la cadena y no habilita a
                  otros elementos.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-sky-500/25">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Al crear una relación, primero eliges el tipo de elemento de origen y de destino.
              La pantalla te muestra de inmediato si esa combinación está permitida. Un suministro
              debe estar asociado a un proveedor o proceso antes de enlazarse con un proceso o
              producto.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Alertas de continuidad operativa
          </h3>
          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/25 flex items-start gap-2.5">
            <AlertOctagon size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-red-300">Elementos afectados en el mapa</span>
              <p className="text-[11px] text-red-200/80 leading-relaxed">
                Cuando un elemento deja de estar disponible, el mapa resalta en rojo los procesos
                y productos que dependen de él. La ficha del elemento indica cuántos elementos
                quedarían en riesgo.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Antes de confirmar la edición o eliminación de un elemento o de una relación, el
            sistema muestra un aviso con los procesos, productos y demás elementos que podrían
            verse afectados. Revisa ese aviso antes de continuar.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Alertas de stock
          </h3>
          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/25 flex items-start gap-2.5">
            <Boxes size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-amber-300">
                Nivel mínimo aceptable y stock disponible
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cada suministro tiene una cantidad disponible y un nivel mínimo aceptable. Si la
                cantidad disponible es inferior al mínimo, el sistema muestra una alerta de stock
                bajo y avisa que el suministro está próximo a agotarse. El mínimo se configura al
                crear o editar el suministro.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            La alerta aparece en el mapa, en la ficha del suministro, en Materiales y procesos y
            en los análisis de impacto cuando el suministro está involucrado.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Consultar, gestionar y evaluar
          </h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <Network size={16} className="mt-0.5 shrink-0 text-sky-400" />
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-white">Consultar:</strong> haz clic en un elemento del mapa
                para abrir su ficha lateral, o en una fila o tarjeta de Materiales y procesos para
                abrir su ventana de información.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" />
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-white">Gestionar:</strong> desde la ficha puedes editar o
                eliminar el elemento. En el mapa también puedes editar o eliminar sus relaciones.
                Toda edición o eliminación muestra primero el aviso de continuidad.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <Zap size={16} className="mt-0.5 shrink-0 text-amber-400" />
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-white">Evaluar impacto:</strong> usa el botón
                «Evaluar impacto» de la pestaña Análisis de impacto o el de la ficha de un
                elemento. Si entras desde el botón superior, la pestaña se abre sin resultados y
                el análisis se ejecuta al presionar el botón.
              </p>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <Info size={16} className="mt-0.5 shrink-0 text-sky-400" />
              <p className="text-[11px] text-slate-300 leading-relaxed">
                El análisis muestra los elementos afectados, permite copiar un informe, ver el
                resultado en el mapa y abrir la ficha de cada afectado. La pestaña conserva los
                10 análisis más recientes. Desde la ficha de un afectado puedes iniciar un nuevo
                análisis.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Navegación rápida
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <button
              type="button"
              onClick={() => {
                navegar(onNavegar, 'red');
                onCerrar();
              }}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/40 transition-colors"
            >
              <kbd className="px-2 py-1 bg-slate-800 text-sky-400 font-mono rounded font-bold border border-slate-700">1</kbd>
              <span className="block mt-1.5 text-[11px] text-slate-300">Cadena de suministro</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navegar(onNavegar, 'catalogo');
                onCerrar();
              }}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/40 transition-colors"
            >
              <kbd className="px-2 py-1 bg-slate-800 text-sky-400 font-mono rounded font-bold border border-slate-700">2</kbd>
              <span className="block mt-1.5 text-[11px] text-slate-300">Materiales y procesos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navegar(onNavegar, 'impacto');
                onCerrar();
              }}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-colors"
            >
              <kbd className="px-2 py-1 bg-slate-800 text-amber-400 font-mono rounded font-bold border border-slate-700">3</kbd>
              <span className="block mt-1.5 text-[11px] text-slate-300">Análisis de impacto</span>
            </button>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <kbd className="px-2 py-1 bg-slate-800 text-emerald-400 font-mono rounded font-bold border border-slate-700">?</kbd>
              <span className="block mt-1.5 text-[11px] text-slate-300">Esta guía</span>
            </div>
          </div>
        </section>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>AbastecePyme · Guía para usuarios</span>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
