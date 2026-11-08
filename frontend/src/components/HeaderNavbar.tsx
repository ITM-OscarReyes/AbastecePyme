import React from 'react';
import { Network, Package, ShieldAlert, Plus, Link2, Factory, HelpCircle, ListOrdered, Sun, Moon } from 'lucide-react';

export type TabActiva = 'red' | 'catalogo' | 'impacto' | 'produccion';

interface HeaderNavbarProps {
  tabActiva: TabActiva;
  onTabChange: (tab: TabActiva) => void;
  onAbrirModalElemento: () => void;
  onAbrirModalDependencia: () => void;
  onAbrirAyuda?: () => void;
  apiConectada: boolean;
  esModoOscuro: boolean;
  onToggleModoOscuro: () => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  tabActiva,
  onTabChange,
  onAbrirModalElemento,
  onAbrirModalDependencia,
  onAbrirAyuda,
  apiConectada,
  esModoOscuro,
  onToggleModoOscuro
}) => {
  return (
    <header className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-40 shadow-sm dark:shadow-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Identidad de la Empresa y Aplicación */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 p-0.5 shadow-md shadow-sky-500/20">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Factory className="text-sky-600 dark:text-sky-400" size={20} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">AbastecePyme</h1>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded">
                  Planta Activa
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Control de Abastecimiento & Continuidad de Producción</p>
            </div>
          </div>

          {/* Navegación Orientada al Negocio */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onTabChange('red')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tabActiva === 'red'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-slate-200/80 dark:border-transparent'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800'
              }`}
              title="Cadena de Suministro (Atajo: 1)"
            >
              <Network size={14} />
              <span>Cadena de Suministro</span>
              <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50">1</kbd>
            </button>
            <button
              onClick={() => onTabChange('catalogo')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tabActiva === 'catalogo'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm border border-slate-200/80 dark:border-transparent'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800'
              }`}
              title="Materiales y Procesos (Atajo: 2)"
            >
              <Package size={14} />
              <span>Materiales & Procesos</span>
              <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50">2</kbd>
            </button>
            <button
              onClick={() => onTabChange('impacto')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tabActiva === 'impacto'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200/80 dark:border-transparent'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800'
              }`}
              title="Análisis de Impacto (Atajo: 3)"
            >
              <ShieldAlert size={14} />
              <span>Análisis de impacto</span>
              <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50">3</kbd>
            </button>
            <button
              onClick={() => onTabChange('produccion')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tabActiva === 'produccion'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-transparent'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800'
              }`}
              title="Orden de Preparación y Producción (Atajo: 4)"
            >
              <ListOrdered size={14} />
              <span>Orden de producción</span>
              <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50">4</kbd>
            </button>
          </nav>

          {/* Acciones de Operación y Estado */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-medium">
              <span className={`w-2 h-2 rounded-full ${apiConectada ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 animate-pulse'}`}></span>
              <span className={apiConectada ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-amber-700 dark:text-amber-400 font-semibold'}>
                {apiConectada ? 'Sistema Sincronizado' : 'Sin Conexión'}
              </span>
            </div>

            {/* Selector Dark / Light Mode */}
            <button
              type="button"
              onClick={onToggleModoOscuro}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-500 dark:text-amber-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-sm"
              title={esModoOscuro ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              aria-label="Alternar tema de interfaz"
            >
              {esModoOscuro ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {onAbrirAyuda && (
              <button
                type="button"
                onClick={onAbrirAyuda}
                className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-sm"
                title="Abrir Guía Operativa y Atajos de Teclado (?)"
              >
                <HelpCircle size={15} className="text-sky-400" />
                <span className="hidden sm:inline">Guía</span>
                <kbd className="hidden md:inline text-[9px] font-mono px-1 bg-white dark:bg-slate-900 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">?</kbd>
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
              title="Crear relación entre componentes del catálogo"
            >
              <Link2 size={14} />
              <span className="hidden sm:inline">Crear relación</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
