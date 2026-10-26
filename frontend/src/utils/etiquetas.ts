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
