import React from 'react';
import { Share2, Database, Plus, GitCommitHorizontal, Activity } from 'lucide-react';

export type TabActiva = 'red' | 'catalogo';

interface HeaderNavbarProps {
  tabActiva: TabActiva;
  onTabChange: (tab: TabActiva) => void;
  onAbrirModalElemento: () => void;
  onAbrirModalDependencia: () => void;
  apiConectada: boolean;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  tabActiva,
  onTabChange,
  onAbrirModalElemento,
  onAbrirModalDependencia,
  apiConectada
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Nombre */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Activity className="text-sky-400" size={20} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">AbastecePyme</h1>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">v1.0</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Gestión de Dependencias & Red de Manufactura</p>
            </div>
          </div>

          {/* Navegación por Pestañas */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onTabChange('red')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tabActiva === 'red'
                  ? 'bg-slate-800 text-sky-400 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Share2 size={14} />
              <span>Red de Dependencias</span>
            </button>
            <button
              onClick={() => onTabChange('catalogo')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tabActiva === 'catalogo'
                  ? 'bg-slate-800 text-sky-400 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Database size={14} />
              <span>Catálogo</span>
            </button>
          </nav>

          {/* Botones de Acción y Estado de API */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-medium">
              <span className={`w-2 h-2 rounded-full ${apiConectada ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 animate-pulse'}`}></span>
              <span className={apiConectada ? 'text-emerald-400' : 'text-amber-400'}>
                {apiConectada ? 'API Conectada' : 'API Desconectada'}
              </span>
            </div>

            <button
              onClick={onAbrirModalElemento}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all active:scale-95"
            >
              <Plus size={14} />
              <span>Elemento</span>
            </button>
            <button
              onClick={onAbrirModalDependencia}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all active:scale-95"
            >
              <GitCommitHorizontal size={14} />
              <span>Dependencia</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
