import { describe, expect, it } from 'vitest';
import { apiService, extraerReporteCiclo } from '../services/api';

describe('F3 · Contrato e integración del frontend con orden de producción', () => {
  it('apiService expone el método obtenerOrdenProduccion', () => {
    expect(apiService.obtenerOrdenProduccion).toBeDefined();
    expect(typeof apiService.obtenerOrdenProduccion).toBe('function');
  });

  it('extraerReporteCiclo extrae correctamente el ciclo y los elementos bloqueados ante 409 Conflict', () => {
    const error409 = {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            codigo: 'CONFIGURACION_CICLICA',
            mensaje: 'El catálogo contiene dependencias circulares.',
            detalles: [
              { campo: 'ciclo', mensaje: 'INS-TABLERO -> PROC-ENSAMBLE -> INS-TABLERO' },
              { campo: 'elementosBloqueados', mensaje: 'INS-TABLERO, PROC-ENSAMBLE, PROD-ESCRITORIO' }
            ]
          }
        }
      }
    };

    const reporte = extraerReporteCiclo(error409);
    expect(reporte).not.toBeNull();
    expect(reporte?.esDag).toBe(false);
    expect(reporte?.mensaje).toBe('El catálogo contiene dependencias circulares.');
    expect(reporte?.ciclo).toEqual(['INS-TABLERO', 'PROC-ENSAMBLE', 'INS-TABLERO']);
    expect(reporte?.elementosBloqueados).toEqual(['INS-TABLERO', 'PROC-ENSAMBLE', 'PROD-ESCRITORIO']);
  });

  it('extraerReporteCiclo devuelve null para errores que no son de configuración cíclica', () => {
    const error404 = {
      isAxiosError: true,
      response: {
        status: 404,
        data: {
          error: {
            codigo: 'ELEMENTO_NO_ENCONTRADO',
            mensaje: 'No existe el elemento'
          }
        }
      }
    };

    expect(extraerReporteCiclo(error404)).toBeNull();
    expect(extraerReporteCiclo(new Error('Fallo de red'))).toBeNull();
  });
});
