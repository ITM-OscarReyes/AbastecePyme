import React from 'react';
import {
  LayoutDashboard,
  Network,
  Package,
  ShieldAlert,
  ListOrdered,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Lock
} from 'lucide-react';
import type { TabActiva } from './HeaderNavbar';
import type { Perfil } from '../types';

interface FoundrySidebarProps {
  tabActiva: TabActiva;
  onTabChange: (tab: TabActiva) => void;
  perfilActivo: Perfil | null;
  onAbrirModalPerfiles?: () => void;
  colapsada: boolean;
  onToggleColapso: () => void;
}

export const FoundrySidebar: React.FC<FoundrySidebarProps> = ({
  tabActiva,
  onTabChange,
  perfilActivo,
  onAbrirModalPerfiles,
  colapsada,
  onToggleColapso
}) => {
  // Las 5 secciones reales y oficiales del proyecto AbastecePyme
  const items: Array<{ id: TabActiva; label: string; sublabel: string; icon: React.ElementType }> = [
    { id: 'tablero', label: 'Dashboard', sublabel: 'Tablero Integral', icon: LayoutDashboard },
    { id: 'red', label: 'Supply Network', sublabel: 'Red de Conexiones', icon: Network },
    { id: 'catalogo', label: 'Materials & Stock', sublabel: 'Catálogo de Elementos', icon: Package },
    { id: 'impacto', label: 'Impact Analysis', sublabel: 'Análisis de Continuidad', icon: ShieldAlert },
    { id: 'produccion', label: 'Production Order', sublabel: 'Orden de Producción', icon: ListOrdered },
  ];

  return (
    <aside
      className={`shrink-0 flex flex-col justify-between bg-white dark:bg-[#080C14] border-r border-slate-200 dark:border-white/[0.08] transition-all duration-200 z-30 select-none font-mono ${
        colapsada ? 'w-14' : 'w-56'
      }`}
    >
      {/* Menú de Secciones Oficiales */}
      <div className="p-2 space-y-1">
        <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          {!colapsada && <span>Módulos de Planta</span>}
          <button
            type="button"
            onClick={onToggleColapso}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title={colapsada ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {colapsada ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {items.map((item) => {
          const activa = tabActiva === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs transition-all cursor-pointer text-left ${
                activa
                  ? 'bg-sky-50 text-sky-700 border border-sky-300 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04] border border-transparent'
              }`}
              title={colapsada ? `${item.label} (${item.sublabel})` : undefined}
            >
              <Icon size={17} className={`shrink-0 ${activa ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`} />
              {!colapsada && (
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[11px] leading-tight truncate">{item.label}</p>
                  <p className={`text-[9px] leading-tight truncate ${activa ? 'text-sky-600 dark:text-sky-400/80 font-medium' : 'text-slate-500'}`}>{item.sublabel}</p>
                </div>
              )}
            </button>
          );
        })}

        <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={onAbrirModalPerfiles}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all cursor-pointer text-left"
            title={colapsada ? 'Gobernanza de Perfiles' : undefined}
          >
            <Settings size={17} className="shrink-0 text-slate-500 dark:text-slate-400" />
            {!colapsada && (
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[11px] leading-tight truncate">Governance</p>
                <p className="text-[9px] text-slate-500 leading-tight truncate">Control de Acceso</p>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Perfil Real de la Sesión en el pie */}
      <div className="p-2 border-t border-slate-200 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={onAbrirModalPerfiles}
          className="w-full flex items-center gap-2.5 p-2 rounded-md bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border border-slate-200 dark:border-white/[0.06] text-left transition-colors cursor-pointer"
          title="Ver o cambiar perfil operativo de la sesión"
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
            perfilActivo?.id === 'ADMINISTRADOR'
              ? 'bg-purple-100 dark:bg-purple-950 border border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-400'
              : perfilActivo?.id === 'COMPRAS'
              ? 'bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-400'
              : perfilActivo?.id === 'PRODUCCION'
              ? 'bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400'
              : perfilActivo?.id === 'VENTAS'
              ? 'bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
              : 'bg-sky-100 dark:bg-sky-950 border border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-400'
          }`}>
            {perfilActivo?.puedeEscribir ? <ShieldCheck size={14} /> : <Lock size={13} />}
          </div>
          {!colapsada && (
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                {perfilActivo ? perfilActivo.nombre : 'Responsable de compras'}
              </p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate uppercase">
                {perfilActivo?.id === 'ADMINISTRADOR'
                  ? 'CONTROL TOTAL'
                  : perfilActivo?.id === 'COMPRAS'
                  ? 'COMPRAS Y PROVEEDORES'
                  : perfilActivo?.id === 'PRODUCCION'
                  ? 'PROCESOS Y PRODUCTOS'
                  : perfilActivo?.id === 'VENTAS'
                  ? 'COMERCIAL Y PEDIDOS'
                  : perfilActivo?.puedeEscribir ? 'EDICIÓN HABILITADA' : 'MODO PROTEGIDO'}
              </p>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
