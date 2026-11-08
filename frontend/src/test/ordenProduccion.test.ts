import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, apiService } from '../services/api';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('F3 · Contrato del cliente de API', () => {
  it('expone obtenerOrdenProduccion y obtenerPlanEntrega', () => {
    expect(typeof apiService.obtenerOrdenProduccion).toBe('function');
    expect(typeof apiService.obtenerPlanEntrega).toBe('function');
  });

  it('obtenerOrdenProduccion consulta el diagnóstico global', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        esDag: true,
        orden: [],
        totalPasos: 0,
        ciclos: [],
        elementosBloqueados: [],
        productosBloqueados: [],
        productosPlanificables: []
      }
    });

    await apiService.obtenerOrdenProduccion();

    expect(get).toHaveBeenCalledWith('/orden-produccion');
  });

  it('obtenerPlanEntrega envía los productos como lista separada por comas', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        productos: [],
        esPlanificable: true,
        pasos: [],
        totalPasos: 0,
        ciclos: [],
        elementosBloqueados: []
      }
    });

    await apiService.obtenerPlanEntrega(['PROD-B', 'PROD-A']);

    expect(get).toHaveBeenCalledWith('/plan-entrega', {
      params: { productos: 'PROD-B,PROD-A' }
    });
  });
});
