import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, apiService } from '../services/api';

afterEach(() => {
  vi.restoreAllMocks();
  apiService.establecerTokenSesion(null);
});

describe('F4 · Contrato del cliente de API para perfiles y sesión', () => {
  it('expone los métodos requeridos para perfiles y sesión', () => {
    expect(typeof apiService.obtenerPerfiles).toBe('function');
    expect(typeof apiService.crearSesion).toBe('function');
    expect(typeof apiService.obtenerSesion).toBe('function');
    expect(typeof apiService.cerrarSesion).toBe('function');
    expect(typeof apiService.establecerTokenSesion).toBe('function');
    expect(typeof apiService.obtenerTokenSesion).toBe('function');
  });

  it('obtenerPerfiles consulta GET /perfiles', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        perfiles: [
          { id: 'COMPRAS', nombre: 'Responsable de compras', puedeEscribir: true },
          { id: 'PRODUCCION', nombre: 'Coordinador de producción', puedeEscribir: false }
        ],
        total: 2
      }
    });

    const resultado = await apiService.obtenerPerfiles();

    expect(get).toHaveBeenCalledWith('/perfiles');
    expect(resultado.total).toBe(2);
    expect(resultado.perfiles).toHaveLength(2);
    expect(resultado.perfiles[0].puedeEscribir).toBe(true);
    expect(resultado.perfiles[1].puedeEscribir).toBe(false);
  });

  it('crearSesion envía POST /sesion y almacena el token en memoria', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        token: 'token-prueba-f4',
        perfil: { id: 'COMPRAS', nombre: 'Responsable de compras', puedeEscribir: true }
      }
    });

    const respuesta = await apiService.crearSesion({ perfil: 'COMPRAS' });

    expect(post).toHaveBeenCalledWith('/sesion', { perfil: 'COMPRAS' });
    expect(respuesta.token).toBe('token-prueba-f4');
    expect(apiService.obtenerTokenSesion()).toBe('token-prueba-f4');
  });

  it('obtenerSesion consulta GET /sesion', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        token: 'token-existente',
        perfil: { id: 'PRODUCCION', nombre: 'Coordinador de producción', puedeEscribir: false }
      }
    });

    const respuesta = await apiService.obtenerSesion();

    expect(get).toHaveBeenCalledWith('/sesion');
    expect(respuesta.token).toBe('token-existente');
    expect(respuesta.perfil.id).toBe('PRODUCCION');
  });

  it('cerrarSesion envía DELETE /sesion e invalida el token', async () => {
    apiService.establecerTokenSesion('token-a-eliminar');
    expect(apiService.obtenerTokenSesion()).toBe('token-a-eliminar');

    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ status: 204 });

    await apiService.cerrarSesion();

    expect(deleteSpy).toHaveBeenCalledWith('/sesion');
    expect(apiService.obtenerTokenSesion()).toBeNull();
  });
});
