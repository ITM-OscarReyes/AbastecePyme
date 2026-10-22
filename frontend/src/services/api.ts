import axios, { AxiosError } from 'axios';
import type {
  CrearDependenciaDto,
  CrearElementoDto,
  Dependencia,
  Elemento,
  ErrorApiResponse,
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

export const apiService = {
  // F1 Endpoints
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
  }
};
