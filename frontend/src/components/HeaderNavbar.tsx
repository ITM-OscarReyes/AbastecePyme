import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  Bell,
  Sun,
  Moon,
  MoreVertical,
  Plus,
  Link2,
  Check,
  ChevronDown
} from 'lucide-react';
import type { Perfil, PerfilId } from '../types';
import { LogoAbastecePyme } from './LogoAbastecePyme';

export type TabActiva = 'tablero' | 'red' | 'catalogo' | 'impacto' | 'produccion';

interface HeaderNavbarProps {
  tabActiva: TabActiva;
  onTabChange: (tab: TabActiva) => void;
  onAbrirModalElemento: () => void;
  onAbrirModalDependencia: () => void;
  onAbrirAyuda?: () => void;
  apiConectada: boolean;
  esModoOscuro: boolean;
  onToggleModoOscuro: () => void;
  perfilActivo?: Perfil | null;
  perfilesDisponibles?: Perfil[];
  onCambiarPerfil?: (perfilId: PerfilId) => void;
  onAbrirModalPerfiles?: () => void;
  puedeEscribir?: boolean;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  onAbrirModalElemento,
  onAbrirModalDependencia,
  onAbrirAyuda,
  apiConectada,
  esModoOscuro,
  onToggleModoOscuro,
  perfilActivo = null,
  perfilesDisponibles = [],
  onCambiarPerfil,
  onAbrirModalPerfiles,
  puedeEscribir = false
}) => {
  const [fechaHoraUtc, setFechaHoraUtc] = useState<string>('');
  const [menuAccionesAbierto, setMenuAccionesAbierto] = useState<boolean>(false);
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState<boolean>(false);
  const refMenuPerfil = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const actualizar = () => {
      const d = new Date();
      const meses = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const m = meses[d.getUTCMonth()];
      const dia = d.getUTCDate();
      const horas = String(d.getUTCHours()).padStart(2, '0');
      const min = String(d.getUTCMinutes()).padStart(2, '0');
      setFechaHoraUtc(`${m} ${dia}, ${horas}:${min} GMT`);
    };
    actualizar();
    const interval = setInterval(actualizar, 10000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar menú al hacer clic afuera
  useEffect(() => {
    const manejarClicExterior = (e: MouseEvent) => {
      if (refMenuPerfil.current && !refMenuPerfil.current.contains(e.target as Node)) {
        setMenuPerfilAbierto(false);
      }
    };
    document.addEventListener('mousedown', manejarClicExterior);
    return () => document.removeEventListener('mousedown', manejarClicExterior);
  }, []);

  return (
    <header className="h-12 bg-white dark:bg-[#06090F] border-b border-slate-200 dark:border-white/[0.08] px-4 flex items-center justify-between select-none z-40 shrink-0 font-mono transition-colors">
      {/* Izquierda: Logo Oficial AbastecePyme + SYSTEM NOMINAL + Fecha GMT */}
      <div className="flex items-center gap-4">
        <LogoAbastecePyme size={24} mostrarTexto={true} />

        {/* Badge SYSTEM NOMINAL de Palantir Foundry */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          <span className="led-indicator led-green"></span>
          <span>{apiConectada ? 'SYSTEM NOMINAL' : 'CONNECTING...'}</span>
        </div>

        {/* Timestamp GMT */}
        <span className="hidden md:inline text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wider">
          {fechaHoraUtc || 'NOV 15, 18:38 GMT'}
        </span>
      </div>

      {/* Derecha: Acciones rapidas, Ayuda, Notificaciones, Selector de Perfiles y Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {puedeEscribir && (
          <div className="hidden lg:flex items-center gap-1.5 mr-1">
            <button
              type="button"
              onClick={onAbrirModalElemento}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold border border-[#0284C7] shadow-xs dark:bg-sky-500/20 dark:hover:bg-sky-500/30 dark:text-sky-300 dark:border-sky-500/40 text-[11px] transition-all cursor-pointer"
              title="Registrar nuevo elemento en la red de abastecimiento"
            >
              <Plus size={13} className="text-white dark:text-sky-300" />
              <span>NUEVO ELEMENTO</span>
            </button>
            <button
              type="button"
              onClick={onAbrirModalDependencia}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-white/[0.1] dark:text-slate-200 text-[11px] font-bold transition-all cursor-pointer shadow-xs"
              title="Conectar dos elementos con dependencia"
            >
              <Link2 size={13} />
              <span>CONEXIÓN</span>
            </button>
          </div>
        )}

        {/* Boton Ayuda (?) */}
        <button
          type="button"
          onClick={onAbrirAyuda}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          title="Guía Operativa de Planta"
        >
          <HelpCircle size={16} />
        </button>

        {/* Boton Notificaciones con punto rojo */}
        <div className="relative">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Telemetría y Alertas de Sistema"
          >
            <Bell size={16} />
          </button>
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#06090F] animate-pulse"></span>
        </div>

        {/* Toggle Modo Oscuro / Claro interactivo */}
        <button
          type="button"
          onClick={onToggleModoOscuro}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/[0.1] transition-all cursor-pointer shadow-xs"
          title={esModoOscuro ? 'Modo Oscuro activo (clic para cambiar a Claro)' : 'Modo Claro activo (clic para cambiar a Oscuro)'}
        >
          {esModoOscuro ? (
            <>
              <Moon size={13} className="text-sky-400" />
              <span className="text-[10px] font-bold text-sky-400">OSCURO</span>
            </>
          ) : (
            <>
              <Sun size={13} className="text-amber-500" />
              <span className="text-[10px] font-bold text-amber-600">CLARO</span>
            </>
          )}
        </button>

        {/* SELECTOR DE PERFILES REALES (COMPRAS / PRODUCCIÓN) */}
        <div className="relative" ref={refMenuPerfil}>
          <button
            type="button"
            onClick={() => setMenuPerfilAbierto((prev) => !prev)}
            className="flex items-center gap-2 pl-2 pr-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] transition-colors cursor-pointer text-left"
            title="Alternar entre perfil Responsable de Compras y Coordinador de Producción"
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              perfilActivo?.puedeEscribir ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-400/40' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40'
            }`}>
              {perfilActivo ? perfilActivo.nombre.charAt(0) : 'C'}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {perfilActivo ? perfilActivo.nombre : 'Responsable de compras'}
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                {perfilActivo?.puedeEscribir ? 'EDICIÓN TOTAL' : 'SOLO LECTURA'}
              </span>
            </div>
            <ChevronDown size={12} className="text-slate-500 dark:text-slate-400" />
          </button>

          {/* Menú flotante de perfiles reales */}
          {menuPerfilAbierto && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-white/[0.1] rounded-lg shadow-2xl py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-white/[0.08] text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                Perfiles del Sistema (F4)
              </div>
              {perfilesDisponibles.map((p) => {
                const activo = perfilActivo?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onCambiarPerfil?.(p.id);
                      setMenuPerfilAbierto(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                      activo ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-[11px]">{p.nombre}</p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400">
                        {p.puedeEscribir ? 'Permiso total de edición' : 'Modo protegido (solo consulta)'}
                      </p>
                    </div>
                    {activo && <Check size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />}
                  </button>
                );
              })}
              <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-white/[0.08] px-3 py-1">
                <button
                  type="button"
                  onClick={() => {
                    onAbrirModalPerfiles?.();
                    setMenuPerfilAbierto(false);
                  }}
                  className="w-full text-center text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline py-1 cursor-pointer"
                >
                  Comparativa de permisos detallada
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Menú ⋮ de Acciones */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAccionesAbierto((prev) => !prev)}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Opciones de consola"
          >
            <MoreVertical size={16} />
          </button>

          {menuAccionesAbierto && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-white/[0.1] rounded-lg shadow-2xl py-1 z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  onAbrirModalPerfiles?.();
                  setMenuAccionesAbierto(false);
                }}
                className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Gobernanza de Perfiles
              </button>
              {puedeEscribir && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onAbrirModalElemento();
                      setMenuAccionesAbierto(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    + Registrar Elemento
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAbrirModalDependencia();
                      setMenuAccionesAbierto(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    + Crear Dependencia
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
