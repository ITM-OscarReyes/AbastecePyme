import axios, { AxiosError } from 'axios';
import type {
  ActualizarElementoDto,
  CrearDependenciaDto,
  CrearElementoDto,
  Dependencia,
  Elemento,
  ErrorApiResponse,
  ImpactoRespuesta,
  OrdenProduccionRespuesta,
  PlanEntregaRespuesta,
  ReglasDependenciaRespuesta,
  ReporteCicloError,
  RespuestaColeccionDependencias,
  RespuestaColeccionElementos,
  RespuestaGrafo,
  TipoElemento
} from '../types';

const API_BASE = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function extraerMensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<ErrorApiResponse>;
    if (axiosErr.response?.data?.error) {
      const errPayload = axiosErr.response.data.error;
      if (errPayload.detalles && errPayload.detalles.length > 0) {
        return `${errPayload.mensaje} (${errPayload.detalles.map(d => `${d.campo}: ${d.mensaje}`).join(', ')})`;
      }
      return errPayload.mensaje;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Error en la comunicación con el servidor.';
}

export function extraerReporteCiclo(error: unknown): ReporteCicloError | null {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<ErrorApiResponse>;
    if (axiosErr.response?.status === 409 && axiosErr.response?.data?.error) {
      const errPayload = axiosErr.response.data.error;
      if (errPayload.codigo === 'CONFIGURACION_CICLICA') {
        const cicloDetalle = errPayload.detalles?.find(d => d.campo === 'ciclo');
        const bloqueadosDetalle = errPayload.detalles?.find(d => d.campo === 'elementosBloqueados');

        const cicloArray = cicloDetalle?.mensaje
          ? cicloDetalle.mensaje.split(' -> ').map(s => s.trim()).filter(Boolean)
          : [];
        const bloqueadosArray = bloqueadosDetalle?.mensaje
          ? bloqueadosDetalle.mensaje.split(',').map(s => s.trim()).filter(Boolean)
          : [];

        return {
          esDag: false,
          mensaje: errPayload.mensaje,
          ciclo: cicloArray,
          elementosBloqueados: bloqueadosArray,
        };
      }
    }
  }
  return null;
}

export const apiService = {
  async obtenerGrafo(): Promise<RespuestaGrafo> {
    const { data } = await apiClient.get<RespuestaGrafo>('/grafo');
    return data;
  },

  async obtenerElementos(tipo?: TipoElemento): Promise<RespuestaColeccionElementos> {
    const params = tipo ? { tipo } : undefined;
    const { data } = await apiClient.get<RespuestaColeccionElementos>('/elementos', { params });
    return data;
  },

  async obtenerElementoPorId(id: string): Promise<Elemento> {
    const { data } = await apiClient.get<Elemento>(`/elementos/${encodeURIComponent(id)}`);
    return data;
  },

  async crearElemento(dto: CrearElementoDto): Promise<Elemento> {
    const { data } = await apiClient.post<Elemento>('/elementos', dto);
    return data;
  },

  async actualizarElemento(id: string, dto: ActualizarElementoDto): Promise<Elemento> {
    const { data } = await apiClient.put<Elemento>(`/elementos/${encodeURIComponent(id)}`, dto);
    return data;
  },

  async eliminarElemento(id: string): Promise<void> {
    await apiClient.delete(`/elementos/${encodeURIComponent(id)}`);
  },

  async obtenerDependencias(origen?: string, destino?: string): Promise<RespuestaColeccionDependencias> {
    const params: Record<string, string> = {};
    if (origen) params.origen = origen;
    if (destino) params.destino = destino;
    const { data } = await apiClient.get<RespuestaColeccionDependencias>('/dependencias', { params });
    return data;
  },

  async crearDependencia(dto: CrearDependenciaDto): Promise<Dependencia> {
    const { data } = await apiClient.post<Dependencia>('/dependencias', dto);
    return data;
  },

  async actualizarDependencia(
    origen: string,
    destino: string,
    dto: CrearDependenciaDto
  ): Promise<Dependencia> {
    const { data } = await apiClient.put<Dependencia>(
      `/dependencias/${encodeURIComponent(origen)}/${encodeURIComponent(destino)}`,
      dto
    );
    return data;
  },

  async eliminarDependencia(origen: string, destino: string): Promise<void> {
    await apiClient.delete(
      `/dependencias/${encodeURIComponent(origen)}/${encodeURIComponent(destino)}`
    );
  },

  async obtenerReglasDependencia(): Promise<ReglasDependenciaRespuesta> {
    const { data } = await apiClient.get<ReglasDependenciaRespuesta>('/reglas-dependencia');
    return data;
  },

  async obtenerImpacto(id: string): Promise<ImpactoRespuesta> {
    const { data } = await apiClient.get<ImpactoRespuesta>(`/impacto/${encodeURIComponent(id)}`);
    return data;
  },

  async obtenerOrdenProduccion(): Promise<OrdenProduccionRespuesta> {
    const { data } = await apiClient.get<OrdenProduccionRespuesta>('/orden-produccion');
    return data;
  },

  async obtenerPlanEntrega(productos: string[]): Promise<PlanEntregaRespuesta> {
    const params = { productos: productos.join(',') };
    const { data } = await apiClient.get<PlanEntregaRespuesta>('/plan-entrega', { params });
    return data;
  }
};
