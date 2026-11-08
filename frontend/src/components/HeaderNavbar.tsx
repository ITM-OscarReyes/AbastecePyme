import React, { useState, useEffect } from 'react';
import {
  Network,
  Package,
  ShieldAlert,
  Plus,
  Link2,
  Factory,
  HelpCircle,
  ListOrdered,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';

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
  const [menuMovilAbierto, setMenuMovilAbierto] = useState<boolean>(false);

  // Cerrar menú móvil al presionar Escape
  useEffect(() => {
    const manejarEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuMovilAbierto) {
        setMenuMovilAbierto(false);
      }
    };
    window.addEventListener('keydown', manejarEscape);
    return () => window.removeEventListener('keydown', manejarEscape);
  }, [menuMovilAbierto]);

  const seleccionarTab = (tab: TabActiva) => {
    onTabChange(tab);
    setMenuMovilAbierto(false);
  };

  return (
    <header className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-40 shadow-sm dark:shadow-xl transition-colors duration-200">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 py-2.5 gap-2 sm:gap-4">
          {/* Identidad de la Empresa y Aplicación */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Botón de navegación móvil (accesible en pantallas < 768px, objetivo táctil min 44x44px) */}
            <button
              type="button"
              onClick={() => setMenuMovilAbierto((prev) => !prev)}
              className="md:hidden flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-label={menuMovilAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
              aria-expanded={menuMovilAbierto}
              title="Menú de navegación de secciones"
            >
              {menuMovilAbierto ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-500 p-0.5 shadow-md shadow-sky-500/20 shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Factory className="text-sky-600 dark:text-sky-400" size={20} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">AbastecePyme</h1>
                <span className="hidden xs:inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded">
                  Planta Activa
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Control de Abastecimiento & Continuidad de Producción</p>
            </div>
          </div>

          {/* Navegación de Escritorio Orientada al Negocio (>= 768px) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => seleccionarTab('red')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
              onClick={() => seleccionarTab('catalogo')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
              onClick={() => seleccionarTab('impacto')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
              onClick={() => seleccionarTab('produccion')}
              className={`flex items-center gap-2 px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-medium">
              <span className={`w-2 h-2 rounded-full ${apiConectada ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 animate-pulse'}`}></span>
              <span className={apiConectada ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-amber-700 dark:text-amber-400 font-semibold'}>
                {apiConectada ? 'Sistema Sincronizado' : 'Sin Conexión'}
              </span>
            </div>

            {/* Selector Dark / Light Mode - Con objetivo táctil de 44x44px */}
            <button
              type="button"
              onClick={onToggleModoOscuro}
              className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-500 dark:text-amber-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95 shadow-sm"
              title={esModoOscuro ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              aria-label="Alternar tema de interfaz"
            >
              {esModoOscuro ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {onAbrirAyuda && (
              <button
                type="button"
                onClick={onAbrirAyuda}
                className="flex items-center justify-center gap-1.5 w-11 h-11 min-w-[44px] min-h-[44px] sm:w-auto sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-sm"
                title="Abrir Guía Operativa y Atajos de Teclado (?)"
                aria-label="Guía operativa"
              >
                <HelpCircle size={16} className="text-sky-400" />
                <span className="hidden sm:inline">Guía</span>
                <kbd className="hidden md:inline text-[9px] font-mono px-1 bg-white dark:bg-slate-900 rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">?</kbd>
              </button>
            )}

            <button
              onClick={onAbrirModalElemento}
              className="flex items-center justify-center gap-1.5 w-11 h-11 min-w-[44px] min-h-[44px] sm:w-auto sm:px-3.5 sm:py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all active:scale-95 cursor-pointer"
              title="Registrar nuevo proveedor, suministro, proceso o producto"
              aria-label="Nuevo Componente"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nuevo Componente</span>
            </button>
            <button
              onClick={onAbrirModalDependencia}
              className="flex items-center justify-center gap-1.5 w-11 h-11 min-w-[44px] min-h-[44px] sm:w-auto sm:px-3.5 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
              title="Crear relación entre componentes del catálogo"
              aria-label="Crear relación"
            >
              <Link2 size={16} />
              <span className="hidden sm:inline">Crear relación</span>
            </button>
          </div>
        </div>

        {/* Menú Móvil Desplegable (< 768px): Garantiza acceso a las 4 secciones */}
        {menuMovilAbierto && (
          <nav
            aria-label="Navegación móvil"
            className="md:hidden py-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-1.5 animate-in fade-in duration-150"
          >
            <button
              onClick={() => seleccionarTab('red')}
              className={`flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                tabActiva === 'red'
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Network size={16} />
                <span>Cadena de Suministro</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400">1</kbd>
            </button>

            <button
              onClick={() => seleccionarTab('catalogo')}
              className={`flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                tabActiva === 'catalogo'
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package size={16} />
                <span>Materiales & Procesos</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400">2</kbd>
            </button>

            <button
              onClick={() => seleccionarTab('impacto')}
              className={`flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                tabActiva === 'impacto'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={16} />
                <span>Análisis de impacto</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400">3</kbd>
            </button>

            <button
              onClick={() => seleccionarTab('produccion')}
              className={`flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                tabActiva === 'produccion'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ListOrdered size={16} />
                <span>Orden de producción</span>
              </div>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400">4</kbd>
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};
