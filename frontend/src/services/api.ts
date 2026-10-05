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
  ResultadoImpacto,
  ResultadoOrden,
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
  },

  // F2: Análisis de Impacto (Cliente/Servidor)
  calcularImpacto(elementoId: string, grafo: RespuestaGrafo): ResultadoImpacto {
    const visitados = new Set<string>();
    const cola: string[] = [elementoId];
    
    // Grafo dirigido: origen habilita destino.
    // Si falla 'origen', se ven afectados los 'destino' directos e indirectos.
    const mapaAdyacencia = new Map<string, string[]>();
    grafo.dependencias.forEach(dep => {
      if (!mapaAdyacencia.has(dep.origen)) {
        mapaAdyacencia.set(dep.origen, []);
      }
      mapaAdyacencia.get(dep.origen)!.push(dep.destino);
    });

    while (cola.length > 0) {
      const actual = cola.shift()!;
      const vecinos = mapaAdyacencia.get(actual) || [];
      for (const vecino of vecinos) {
        if (!visitados.has(vecino)) {
          visitados.add(vecino);
          cola.push(vecino);
        }
      }
    }

    const elementosAfectados = grafo.elementos.filter(e => visitados.has(e.id));
    return {
      elementoId,
      elementosAfectados,
      totalAfectados: elementosAfectados.length
    };
  },

  // F3: Orden Topológico & Detección de Ciclos
  calcularOrdenYDetectarCiclos(grafo: RespuestaGrafo): ResultadoOrden {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    grafo.elementos.forEach(e => {
      inDegree.set(e.id, 0);
      adj.set(e.id, []);
    });

    grafo.dependencias.forEach(dep => {
      if (adj.has(dep.origen)) {
        adj.get(dep.origen)!.push(dep.destino);
      }
      if (inDegree.has(dep.destino)) {
        inDegree.set(dep.destino, (inDegree.get(dep.destino) || 0) + 1);
      }
    });

    const cola: string[] = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) {
        cola.push(id);
      }
    });

    const ordenIds: string[] = [];
    while (cola.length > 0) {
      const actual = cola.shift()!;
      ordenIds.push(actual);

      const vecinos = adj.get(actual) || [];
      vecinos.forEach(vecino => {
        const actualDegree = inDegree.get(vecino) || 0;
        inDegree.set(vecino, actualDegree - 1);
        if (actualDegree - 1 === 0) {
          cola.push(vecino);
        }
      });
    }

    const esAciclico = ordenIds.length === grafo.elementos.length;

    if (esAciclico) {
      const mapaElementos = new Map(grafo.elementos.map(e => [e.id, e]));
      const ordenTrabajo = ordenIds.map(id => mapaElementos.get(id)!).filter(Boolean);
      return {
        esAciclico: true,
        ordenTrabajo,
        cicloDetectado: null
      };
    } else {
      // Identificar nodos en el ciclo
      const nodosEnCiclo = Array.from(inDegree.entries())
        .filter(([_, degree]) => degree > 0)
        .map(([id]) => id);

      return {
        esAciclico: false,
        ordenTrabajo: [],
        cicloDetectado: nodosEnCiclo
      };
    }
  }
};
