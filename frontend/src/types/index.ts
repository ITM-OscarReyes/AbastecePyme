export type TipoElemento = 'PROVEEDOR' | 'INSUMO' | 'PRODUCTO' | 'PROCESO';

export interface Elemento {
  id: string;
  tipo: TipoElemento;
  nombre: string;
  descripcion: string | null;
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
}

export interface CrearDependenciaDto {
  origen: string;
  destino: string;
}

// Modelos para F2 (Análisis de Impacto) y F3 (Orden & Ciclos)
export interface ResultadoImpacto {
  elementoId: string;
  elementosAfectados: Elemento[];
  totalAfectados: number;
}

export interface ResultadoOrden {
  esAciclico: boolean;
  ordenTrabajo: Elemento[];
  cicloDetectado: string[] | null;
}
