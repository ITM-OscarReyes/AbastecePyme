import React, { useEffect } from 'react';
import { X, HelpCircle, ArrowRight, Building2, Package, Cog, CheckSquare, AlertOctagon, ShieldCheck } from 'lucide-react';

interface ModalAyudaOperativaProps {
  abierto: boolean;
  onCerrar: () => void;
}

export const ModalAyudaOperativa: React.FC<ModalAyudaOperativaProps> = ({ abierto, onCerrar }) => {
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
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 id="titulo-guia-operativa" className="text-base font-bold text-white">
                Guía Operativa & Manual de Planta
              </h2>
              <p className="text-xs text-slate-400">
                Protocolo de abastecimiento, simbología del grafo y atajos de teclado
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

        {/* Sección 1: Regla Fundamental del Grafo */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-sky-500/25 space-y-2">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
            <ArrowRight size={15} />
            <span>Dirección del Grafo · Origen Habilita Destino</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Cada flecha <span className="font-mono text-sky-300">A → B</span> se lee en planta como:
            <span className="italic text-white"> &ldquo;Para producir o ejecutar B, es indispensable que A esté disponible&rdquo;</span>.
            El análisis de impacto avanza aguas abajo en esa misma dirección.
          </p>
        </div>

        {/* Sección 2: Código Cromático Industrial */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Simbología por Eslabón Productivo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30 flex items-start gap-2.5">
              <Building2 size={18} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-blue-300">Proveedor</span>
                <p className="text-[11px] text-slate-400">Fuente externa de materias primas o servicios.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex items-start gap-2.5">
              <Package size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-300">Insumo</span>
                <p className="text-[11px] text-slate-400">Materia prima o parte que alimenta a las máquinas.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30 flex items-start gap-2.5">
              <Cog size={18} className="text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-purple-300">Proceso</span>
                <p className="text-[11px] text-slate-400">Estación interna de transformación, corte o ensamble.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-start gap-2.5">
              <CheckSquare size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-emerald-300">Producto</span>
                <p className="text-[11px] text-slate-400">Artículo final listo para despacho al cliente.</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-2.5 mt-2">
            <AlertOctagon size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-red-300">Alerta de Impacto (Rojo Carmesí)</span>
              <p className="text-[11px] text-red-200/80">
                Identifica en el mapa interactivo los procesos o productos paralizados en cascada por la falla de un suministro.
              </p>
            </div>
          </div>
        </div>

        {/* Sección 3: Atajos Rápidos de Teclado */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Navegación Rápida por Teclado
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <kbd className="px-2 py-1 bg-slate-800 text-sky-400 font-mono rounded font-bold border border-slate-700">1</kbd>
              <span className="block mt-1.5 text-[11px] text-slate-300">Cadena</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <kbd className="px-2 py-1 bg-slate-800 text-sky-400 font-mono rounded font-bold border border-slate-700">2</kbd>
              <span className="block mt-1.5 text-[11px] text-slate-300">Catálogo</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <kbd className="px-2 py-1 bg-slate-800 text-amber-400 font-mono rounded font-bold border border-slate-700">3</kbd>
              <span className="block mt-1.5 text-[11px] text-slate-300">Simulador</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <kbd className="px-2 py-1 bg-slate-800 text-emerald-400 font-mono rounded font-bold border border-slate-700">?</kbd>
              <span className="block mt-1.5 text-[11px] text-slate-300">Esta Guía</span>
            </div>
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>AbastecePyme · F1 & F2 Conforme a Especificación</span>
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
