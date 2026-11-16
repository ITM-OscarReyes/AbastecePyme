import React from 'react';
import {
  Check,
  Shield,
  UserCheck,
  X,
  KeyRound,
  Unlock,
  Wrench,
  ShoppingBag
} from 'lucide-react';
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

  const seleccionarYSalir = (perfilId: PerfilId) => {
    onCambiarPerfil(perfilId);
    onClose();
  };

  const infoPerfiles: Record<
    PerfilId,
    {
      icono: React.ReactNode;
      colorFondo: string;
      colorBorde: string;
      textoBadge: string;
      descripcion: string;
      permisos: string[];
    }
  > = {
    ADMINISTRADOR: {
      icono: <Shield size={20} className="text-purple-600 dark:text-purple-400" />,
      colorFondo: 'bg-purple-500/10 dark:bg-purple-950/40',
      colorBorde: 'border-purple-300 dark:border-purple-700',
      textoBadge: 'Control Total',
      descripcion: 'Acceso irrestricto a todas las funciones, catálogos y órdenes.',
      permisos: [
        'Crear, editar y eliminar proveedores e insumos',
        'Crear, editar y eliminar procesos y productos',
        'Gestionar todas las relaciones de la cadena',
        'Supervisión y control de gobernanza'
      ]
    },
    COMPRAS: {
      icono: <UserCheck size={20} className="text-sky-600 dark:text-sky-400" />,
      colorFondo: 'bg-sky-500/10 dark:bg-sky-950/40',
      colorBorde: 'border-sky-300 dark:border-sky-700',
      textoBadge: 'Gestión Externa',
      descripcion: 'Responsable de aprovisionamiento de materias primas y proveedores.',
      permisos: [
        'Alta y gestión de proveedores externos',
        'Registro de materias primas y suministros',
        'Crear relación Proveedor → Insumo',
        'Control de stock disponible y mínimo'
      ]
    },
    PRODUCCION: {
      icono: <Wrench size={20} className="text-amber-600 dark:text-amber-400" />,
      colorFondo: 'bg-amber-500/10 dark:bg-amber-950/40',
      colorBorde: 'border-amber-300 dark:border-amber-700',
      textoBadge: 'Planta y Armado',
      descripcion: 'Coordinador de manufactura, ensamble y productos terminados.',
      permisos: [
        'Creación y configuración de procesos de manufactura',
        'Alta de productos terminados de catálogo',
        'Crear relaciones Insumo → Proceso y Proceso → Producto',
        'Consulta de diagnósticos y planes de entrega'
      ]
    },
    VENTAS: {
      icono: <ShoppingBag size={20} className="text-emerald-600 dark:text-emerald-400" />,
      colorFondo: 'bg-emerald-500/10 dark:bg-emerald-950/40',
      colorBorde: 'border-emerald-300 dark:border-emerald-700',
      textoBadge: 'Comercial',
      descripcion: 'Consulta de disponibilidad y emisión de solicitudes de pedidos.',
      permisos: [
        'Consulta de productos terminados disponibles',
        'Visualización de la red y tiempos de entrega',
        'Solicitar preparación o producción para ventas',
        'Protegido: no altera la estructura de la planta'
      ]
    }
  };

  const perfilesAMostrar =
    perfilesDisponibles.length > 0
      ? perfilesDisponibles
      : ([
          { id: 'ADMINISTRADOR', nombre: 'Administrador', puedeEscribir: true },
          { id: 'COMPRAS', nombre: 'Responsable de compras', puedeEscribir: true },
          { id: 'PRODUCCION', nombre: 'Coordinador de producción', puedeEscribir: true },
          { id: 'VENTAS', nombre: 'Asesor de ventas', puedeEscribir: false }
        ] as Perfil[]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0A101D] border border-slate-200 dark:border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-perfiles"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 id="titulo-modal-perfiles" className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Control de Acceso y Perfiles de Demostración
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Matriz de gobernanza operativa: Administrador · Compras · Producción · Ventas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tarjetas de los 4 perfiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {perfilesAMostrar.map((perfil) => {
            const perfilId = perfil.id as PerfilId;
            const config = infoPerfiles[perfilId] || infoPerfiles.COMPRAS;
            const activo = perfilActivo?.id === perfilId;

            return (
              <div
                key={perfil.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  activo
                    ? `${config.colorFondo} ${config.colorBorde} shadow-md`
                    : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center">
                      {config.icono}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-white dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08]">
                      <Unlock size={11} />
                      <span>{config.textoBadge}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {perfil.nombre}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Código: {perfil.id}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {config.descripcion}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    {config.permisos.map((permiso) => (
                      <div key={permiso} className="flex items-start gap-1.5">
                        <Check size={13} className="text-sky-500 shrink-0 mt-0.5" />
                        <span>{permiso}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => seleccionarYSalir(perfilId)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 ${
                    activo
                      ? 'bg-sky-600 text-white cursor-default shadow-sky-600/20'
                      : 'bg-white dark:bg-white/[0.06] hover:bg-sky-50 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/[0.1]'
                  }`}
                >
                  {activo ? (
                    <>
                      <Check size={14} />
                      <span>Perfil actualmente activo</span>
                    </>
                  ) : (
                    <span>Activar perfil {perfil.nombre}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
