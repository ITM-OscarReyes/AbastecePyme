export type TipoElemento = 'PROVEEDOR' | 'INSUMO' | 'PRODUCTO' | 'PROCESO';

export type EstadoStock = 'NO_APLICA' | 'SUFICIENTE' | 'BAJO';

export interface Elemento {
  id: string;
  tipo: TipoElemento;
  nombre: string;
  descripcion: string | null;
  stockDisponible: number | null;
  stockMinimo: number | null;
  estadoStock: EstadoStock;
  alertaStock: boolean;
}

export interface Dependencia {
  origen: string;
  destino: string;
  tipoRelacion: 'habilita' | string;
}

export interface ResumenGrafo {
  totalElementos: number;
  totalDependencias: number;
}

export interface RespuestaGrafo {
  elementos: Elemento[];
  dependencias: Dependencia[];
  resumen: ResumenGrafo;
}

export interface RespuestaColeccionElementos {
  elementos: Elemento[];
  total: number;
}

export interface RespuestaColeccionDependencias {
  dependencias: Dependencia[];
  total: number;
}

export interface DetalleError {
  campo: string;
  mensaje: string;
}

export interface ErrorApiPayload {
  codigo: string;
  mensaje: string;
  detalles?: DetalleError[];
}

export interface ErrorApiResponse {
  error: ErrorApiPayload;
}

export interface CrearElementoDto {
  id: string;
  tipo: TipoElemento;
  nombre: string;
  descripcion?: string | null;
  stockDisponible?: number | null;
  stockMinimo?: number | null;
}

export interface ActualizarElementoDto {
  nombre?: string;
  descripcion?: string | null;
  stockDisponible?: number | null;
  stockMinimo?: number | null;
}

export interface CrearDependenciaDto {
  origen: string;
  destino: string;
}

// Análisis de impacto
export interface ElementoImpacto {
  id: string;
  tipo: TipoElemento;
  nombre: string;
  descripcion: string | null;
  stockDisponible: number | null;
  stockMinimo: number | null;
  estadoStock: EstadoStock;
  alertaStock: boolean;
}

export interface ResumenStockImpacto {
  totalSuministros: number;
  suministrosBajoMinimo: number;
}

export interface ImpactoRespuesta {
  elemento: ElementoImpacto;
  afectados: ElementoImpacto[];
  total: number;
  resumenStock: ResumenStockImpacto;
}

export interface ReglaDependencia {
  tipoOrigen: TipoElemento;
  tipoDestino: TipoElemento;
  permitida: boolean;
  motivo: string;
}

export interface ReglasDependenciaRespuesta {
  tipos: TipoElemento[];
  reglas: ReglaDependencia[];
}

export interface AnalisisReciente {
  elementoId: string;
  nombre: string;
  tipo: TipoElemento;
  fecha: string;
  total: number;
}
