import type { EstadoStock, TipoElemento } from '../types';

const ETIQUETAS_TIPO: Record<TipoElemento, string> = {
  PROVEEDOR: 'Proveedor',
  INSUMO: 'Suministro',
  PROCESO: 'Proceso',
  PRODUCTO: 'Producto'
};

const ETIQUETAS_PLURAL: Record<TipoElemento, string> = {
  PROVEEDOR: 'Proveedores',
  INSUMO: 'Suministros',
  PROCESO: 'Procesos',
  PRODUCTO: 'Productos'
};

export const etiquetaTipo = (tipo: TipoElemento): string => ETIQUETAS_TIPO[tipo];

export const etiquetaTipoPlural = (tipo: TipoElemento): string => ETIQUETAS_PLURAL[tipo];

/**
 * Clases estándar de Tailwind para badges de tipo con diseño idéntico
 * a la guía de diseño del proyecto:
 * - Proveedor: azul pastel con texto cobalto vivo
 * - Suministro: ámbar pastel con texto ámbar industrial profundo
 * - Proceso: violeta pastel con texto púrpura vivo
 * - Producto: menta/esmeralda pastel con texto esmeralda vivo
 */
export const claseBadgeTipo = (tipo: TipoElemento): string => {
  switch (tipo) {
    case 'PROVEEDOR':
      return 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30';
    case 'INSUMO':
      return 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30';
    case 'PROCESO':
      return 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30';
    case 'PRODUCTO':
      return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30';
  }
};

export const etiquetaEstadoStock = (estado: EstadoStock): string => {
  switch (estado) {
    case 'BAJO':
      return 'Bajo el mínimo';
    case 'SUFICIENTE':
      return 'Stock suficiente';
    default:
      return 'Sin inventario';
  }
};

export const formatearFechaHora = (fechaIso: string): string => {
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return fechaIso;
  return fecha.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};
