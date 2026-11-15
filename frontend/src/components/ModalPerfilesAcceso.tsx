import React from 'react';
import { Check, Shield, UserCheck, X, KeyRound, Lock, Unlock } from 'lucide-react';
import type { Perfil, PerfilId } from '../types';

interface ModalPerfilesAccesoProps {
  isOpen: boolean;
  onClose: () => void;
  perfilActivo: Perfil | null;
  perfilesDisponibles: Perfil[];
  onCambiarPerfil: (perfilId: PerfilId) => void;
}

export const ModalPerfilesAcceso: React.FC<ModalPerfilesAccesoProps> = ({
  isOpen,
  onClose,
  perfilActivo,
  perfilesDisponibles,
  onCambiarPerfil
}) => {
  if (!isOpen) return null;

  const comprasPerfil = perfilesDisponibles.find((p) => p.id === 'COMPRAS') ?? {
    id: 'COMPRAS' as const,
    nombre: 'Responsable de compras',
    puedeEscribir: true
  };

  const produccionPerfil = perfilesDisponibles.find((p) => p.id === 'PRODUCCION') ?? {
    id: 'PRODUCCION' as const,
    nombre: 'Coordinador de producción',
    puedeEscribir: false
  };

  const seleccionarYSalir = (perfilId: PerfilId) => {
    onCambiarPerfil(perfilId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-perfiles"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 id="titulo-modal-perfiles" className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Control de Acceso y Perfiles de Demostración
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gobernanza de permisos operativos: Compras vs Producción
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tarjetas de los dos perfiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Perfil 1: Responsable de compras */}
          <div
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
              perfilActivo?.id === 'COMPRAS'
                ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 shadow-md shadow-sky-500/10'
                : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center">
                  <UserCheck size={20} />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  <Unlock size={11} />
                  <span>Edición total</span>
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {comprasPerfil.nombre}
                </h3>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Código de perfil: {comprasPerfil.id}
                </p>
              </div>

              <div className="space-y-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-1.5">
                  <Check size={13} className="text-sky-500 shrink-0 mt-0.5" />
                  <span>Alta de nuevos proveedores y materiales</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Check size={13} className="text-sky-500 shrink-0 mt-0.5" />
                  <span>Creación y modificación de relaciones en la cadena</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Check size={13} className="text-sky-500 shrink-0 mt-0.5" />
                  <span>Eliminación de componentes y dependencias</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Check size={13} className="text-sky-500 shrink-0 mt-0.5" />
                  <span>Actualización de inventario y stock mínimo</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => seleccionarYSalir('COMPRAS')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 ${
                perfilActivo?.id === 'COMPRAS'
                  ? 'bg-sky-600 text-white cursor-default shadow-sky-600/20'
                  : 'bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {perfilActivo?.id === 'COMPRAS' ? (
                <>
                  <Check size={15} />
                  <span>Perfil actualmente activo</span>
                </>
              ) : (
                <span>Ingresar como Responsable de compras</span>
              )}
            </button>
          </div>

          {/* Perfil 2: Coordinador de producción */}
          <div
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
              perfilActivo?.id === 'PRODUCCION'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-md shadow-emerald-500/10'
                : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                  <Shield size={20} />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Lock size={11} />
                  <span>Solo consulta</span>
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {produccionPerfil.nombre}
                </h3>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Código de perfil: {produccionPerfil.id}
                </p>
              </div>

              <div className="space-y-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-1.5">
                  <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Consulta de la red completa y trazabilidad</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Análisis de impacto y cálculo de líneas de producto</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Generación de planes de entrega y secuencias</span>
                </div>
                <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300 font-medium">
                  <Lock size={13} className="shrink-0 mt-0.5" />
                  <span>Modo protegido: edición y eliminación bloqueadas</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => seleccionarYSalir('PRODUCCION')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 ${
                perfilActivo?.id === 'PRODUCCION'
                  ? 'bg-emerald-600 text-white cursor-default shadow-emerald-600/20'
                  : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {perfilActivo?.id === 'PRODUCCION' ? (
                <>
                  <Check size={15} />
                  <span>Perfil actualmente activo</span>
                </>
              ) : (
                <span>Ingresar como Coordinador de producción</span>
              )}
            </button>
          </div>
        </div>

        {/* Nota explicativa de sesión */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="truncate">
              Sesión de demostración activa: <strong className="text-slate-800 dark:text-slate-200">{perfilActivo?.nombre}</strong>
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider shrink-0 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded">
            Token en memoria
          </span>
        </div>
      </div>
    </div>
  );
};
