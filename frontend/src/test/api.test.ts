/**
 * AC-F1-14 · La interfaz mínima consume la API real de F1.
 *
 * No hay dobles ni datos embebidos: cada prueba llama al backend levantado por
 * HTTP (RNF-F1-06). El estado que se crea en cada prueba usa el prefijo
 * `TEST-` para poder distinguirse del conjunto de demostración.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { apiClient, apiService, extraerMensajeError } from '../services/api';
import type { ErrorApiResponse } from '../types';

const marca = `TEST-${Date.now().toString(36).toUpperCase()}`;

const elementoNuevo = {
  id: `${marca}-INSUMO`,
  tipo: 'INSUMO' as const,
  nombre: 'Insumo de prueba de interfaz'
};

const elementoDestino = {
  id: `${marca}-PRODUCTO`,
  tipo: 'PRODUCTO' as const,
  nombre: 'Producto de prueba de interfaz'
};

beforeAll(async () => {
  await apiService.crearElemento(elementoNuevo);
  await apiService.crearElemento(elementoDestino);
});

describe('Cliente de API contra el backend real', () => {
  it('AC-F1-14 GET /elementos devuelve el catálogo real del backend', async () => {
    const resultado = await apiService.obtenerElementos();

    expect(resultado.total).toBe(resultado.elementos.length);
    expect(resultado.elementos.map((e) => e.id)).toContain(elementoNuevo.id);
    expect(resultado.total).toBeGreaterThan(0);
  });

  it('AC-F1-14 el filtro por tipo lo resuelve el backend', async () => {
    const resultado = await apiService.obtenerElementos('INSUMO');

    expect(resultado.elementos.every((e) => e.tipo === 'INSUMO')).toBe(true);
    expect(resultado.elementos.map((e) => e.id)).toContain(elementoNuevo.id);
  });

  it('AC-F1-14 POST /elementos crea el elemento y lo devuelve', async () => {
    const propio = {
      id: `${marca}-NUEVO`,
      tipo: 'PROCESO' as const,
      nombre: 'Proceso de prueba de interfaz'
    };
    const creado = await apiService.crearElemento(propio);

    expect(creado.id).toBe(propio.id);
    expect(creado.tipo).toBe('PROCESO');
    expect(creado.descripcion).toBeNull();

    const consultado = await apiService.obtenerElementoPorId(propio.id);
    expect(consultado).toEqual(creado);
  });

  it('AC-F1-14b el cliente expone el mensaje de error del backend (ERR-01)', async () => {
    try {
      await apiService.crearElemento({ ...elementoNuevo, tipo: 'PRODUCTO' });
      throw new Error('La API debería haber respondido 409');
    } catch (error) {
      const mensaje = extraerMensajeError(error);
      expect(mensaje).toContain('Ya existe un elemento');
      expect(mensaje).toContain('id');
    }
  });

  it('AC-F1-14b el cliente expone el mensaje de error del backend (ERR-04)', async () => {
    try {
      await apiService.crearElemento({ id: 'AB', tipo: 'INSUMO', nombre: 'Nombre valido' });
      throw new Error('La API debería haber respondido 422');
    } catch (error) {
      const mensaje = extraerMensajeError(error);
      expect(mensaje).toContain('datos inválidos');
      expect(mensaje).toContain('id');
    }
  });

  it('AC-F1-14b el cliente no convierte un error en un resultado vacío', async () => {
    const respuesta = await apiClient.post<ErrorApiResponse>('/elementos', {
      id: 'AB',
      tipo: 'INSUMO',
      nombre: 'Nombre valido'
    }).catch((error) => error.response);

    expect(respuesta.status).toBe(422);
    expect(respuesta.data.error.codigo).toBe('VALIDACION_FALLIDA');
    expect(respuesta.data.elementos).toBeUndefined();
    expect(respuesta.data.total).toBeUndefined();
  });

  it('AC-F1-14 POST /dependencias registra la arista y GET la devuelve', async () => {
    const creada = await apiService.crearDependencia({
      origen: elementoNuevo.id,
      destino: elementoDestino.id
    });

    expect(creada).toEqual({
      origen: elementoNuevo.id,
      destino: elementoDestino.id,
      tipoRelacion: 'habilita'
    });

    const listado = await apiService.obtenerDependencias(elementoNuevo.id);
    expect(listado.total).toBe(1);
    expect(listado.dependencias[0].destino).toBe(elementoDestino.id);
  });

  it('AC-F1-14b el duplicado de dependencia se ve como error del backend', async () => {
    try {
      await apiService.crearDependencia({
        origen: elementoNuevo.id,
        destino: elementoDestino.id
      });
      throw new Error('La API debería haber respondido 409');
    } catch (error) {
      expect(extraerMensajeError(error)).toContain('Ya existe una dependencia');
    }
  });

  it('AC-F1-14 el grafo que dibuja la interfaz viene del backend', async () => {
    const grafo = await apiService.obtenerGrafo();

    expect(grafo.resumen.totalElementos).toBe(grafo.elementos.length);
    expect(grafo.resumen.totalDependencias).toBe(grafo.dependencias.length);
    expect(grafo.elementos.map((e) => e.id)).toContain(elementoNuevo.id);
    const arista = grafo.dependencias.find(
      (d) => d.origen === elementoNuevo.id && d.destino === elementoDestino.id
    );
    expect(arista).toBeDefined();
    expect(arista?.tipoRelacion).toBe('habilita');
  });

  it('AC-F1-14d el frontend no inventa datos: el listado viene íntegro del backend', async () => {
    const grafo = await apiService.obtenerGrafo();
    const listado = await apiService.obtenerElementos();

    expect(grafo.elementos).toEqual(listado.elementos);
  });
});
