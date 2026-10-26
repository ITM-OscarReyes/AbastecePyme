import { useCallback, useState } from 'react';
import type { AnalisisReciente, ImpactoRespuesta } from '../types';

const CLAVE_ALMACENAMIENTO = 'abastecepyme.historialImpactos';
const MAXIMO_ANALISIS = 10;

function leerHistorial(): AnalisisReciente[] {
  if (typeof window === 'undefined') return [];
  try {
    const almacenado = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (!almacenado) return [];
    const datos = JSON.parse(almacenado) as AnalisisReciente[];
    if (!Array.isArray(datos)) return [];
    return datos.slice(0, MAXIMO_ANALISIS);
  } catch {
    return [];
  }
}

function guardarHistorial(historial: AnalisisReciente[]): void {
  try {
    window.localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(historial));
  } catch {
    // El historial es una ayuda de interfaz: si el almacenamiento no está
    // disponible, el análisis sigue funcionando sin persistencia.
  }
}

export function useHistorialImpactos() {
  const [historial, setHistorial] = useState<AnalisisReciente[]>(leerHistorial);

  const registrarAnalisis = useCallback((resultado: ImpactoRespuesta) => {
    const registro: AnalisisReciente = {
      elementoId: resultado.elemento.id,
      nombre: resultado.elemento.nombre,
      tipo: resultado.elemento.tipo,
      fecha: new Date().toISOString(),
      total: resultado.total
    };

    setHistorial((anterior) => {
      const actualizado = [registro, ...anterior].slice(0, MAXIMO_ANALISIS);
      guardarHistorial(actualizado);
      return actualizado;
    });
  }, []);

  return { historial, registrarAnalisis };
}
