import React from 'react';
import { Network, Package, ShieldAlert, Plus, Link2, Factory, HelpCircle } from 'lucide-react';

export type TabActiva = 'red' | 'catalogo' | 'impacto';

interface HeaderNavbarProps {
  tabActiva: TabActiva;
  onTabChange: (tab: TabActiva) => void;
  onAbrirModalElemento: () => void;
  onAbrirModalDependencia: () => void;
  onAbrirAyuda?: () => void;
  apiConectada: boolean;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  tabActiva,
  onTabChange,
  onAbrirModalElemento,
  onAbrirModalDependencia,
  onAbrirAyuda,
  apiConectada
}) => {
  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Identidad de la Empresa y Aplicación */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 p-0.5 shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Factory className="text-sky-400" size={20} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">AbastecePyme</h1>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  Planta Activa
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Control de Abastecimiento & Continuidad de Producción</p>
            </div>
          </div>

          {/* Navegación Orientada al Negocio */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onTabChange('red')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tabActiva === 'red'
                  ? 'bg-slate-800 text-sky-400 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Network size={14} />
              <span>Cadena de Suministro</span>
              <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-700/50">1</kbd>
            </button>
            <button
              onClick={() => onTabChange('catalogo')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tabActiva === 'catalogo'
                  ? 'bg-slate-800 text-sky-400 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Package size={14} />
              <span>Materiales & Procesos</span>
              <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-700/50">2</kbd>
            </button>
            <button
              onClick={() => onTabChange('impacto')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tabActiva === 'impacto'
                  ? 'bg-slate-800 text-amber-400 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <ShieldAlert size={14} />
              <span>Análisis de impacto</span>
              <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-700/50">3</kbd>
            </button>
          </nav>

          {/* Acciones de Operación y Estado */}
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-medium">
              <span className={`w-2 h-2 rounded-full ${apiConectada ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 animate-pulse'}`}></span>
              <span className={apiConectada ? 'text-emerald-400' : 'text-amber-400'}>
                {apiConectada ? 'Sistema Sincronizado' : 'Sin Conexión'}
              </span>
            </div>

            {onAbrirAyuda && (
              <button
                type="button"
                onClick={onAbrirAyuda}
                className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title="Abrir Guía Operativa y Atajos de Teclado (?)"
              >
                <HelpCircle size={15} className="text-sky-400" />
                <span className="hidden sm:inline">Guía</span>
                <kbd className="hidden md:inline text-[9px] font-mono px-1 bg-slate-900 rounded text-slate-400 border border-slate-700">?</kbd>
              </button>
            )}

            <button
              onClick={onAbrirModalElemento}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all active:scale-95 cursor-pointer"
              title="Registrar nuevo proveedor, suministro, proceso o producto"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Nuevo Componente</span>
            </button>
            <button
              onClick={onAbrirModalDependencia}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
              title="Vincular relación de suministro entre componentes"
            >
              <Link2 size={14} />
              <span className="hidden sm:inline">Enlazar Suministro</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
