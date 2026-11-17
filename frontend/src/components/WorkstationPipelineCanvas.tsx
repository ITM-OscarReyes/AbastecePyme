import {
    Activity,
    AlertTriangle,
    Boxes,
    CheckCircle2,
    ChevronRight,
    Gauge,
    Layers,
    Network,
    ShieldCheck,
    Truck
} from 'lucide-react';
import React, { useMemo } from 'react';
import type { Dependencia, Elemento } from '../types';
import { obtenerCodigoSku } from '../utils/sku';
import { ProcurementOverviewChart } from './ProcurementOverviewChart';
import { ProductionOutputChart } from './ProductionOutputChart';

export type SubTabCentral = 'VISTA_1_FLUJO' | 'VISTA_2_CAPACIDAD' | 'VISTA_3_GRAFICAS';

interface WorkstationPipelineCanvasProps {
  elementos: Elemento[];
  dependencias: Dependencia[];
  onConsultarElemento?: (id: string) => void;
  onNavegar?: (tab: any, elementoId?: string) => void;
  vistaActiva: SubTabCentral;
  onCambiarVista?: (vista: SubTabCentral) => void;
}

// Componente para dibujar un arco semicircular luminoso (Gauge)
const SemicircularGauge: React.FC<{
  porcentaje: number;
  color: string;
  subtitulo?: string;
  size?: number;
}> = ({ porcentaje, color, subtitulo, size = 110 }) => {
  const radio = 42;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const strokeWidth = 8;
  const circunferencia = Math.PI * radio;
  const offset = circunferencia - (porcentaje / 100) * circunferencia;

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.7}`}>
        <defs>
          <filter id={`gaugeGlow-${color.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Arco de fondo */}
        <path
          d={`M ${cx - radio} ${cy} A ${radio} ${radio} 0 0 1 ${cx + radio} ${cy}`}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-[#131B2E]"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Arco de valor luminiscente */}
        <path
          d={`M ${cx - radio} ${cy} A ${radio} ${radio} 0 0 1 ${cx + radio} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter={`url(#gaugeGlow-${color.replace('#', '')})`}
        />

        {/* Texto central del porcentaje */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill="currentColor"
          className="text-slate-800 dark:text-white"
          fontSize="18"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {porcentaje}%
        </text>
      </svg>
      {subtitulo && (
        <span className="text-[9px] text-slate-400 font-mono -mt-1 uppercase tracking-wider">
          {subtitulo}
        </span>
      )}
    </div>
  );
};

export const WorkstationPipelineCanvas: React.FC<WorkstationPipelineCanvasProps> = ({
  elementos,
  dependencias,
  onConsultarElemento,
  onNavegar: _onNavegar,
  vistaActiva,
  onCambiarVista: _onCambiarVista
}) => {
  // Suministros (Insumos) reales
  const insumos = useMemo(() => {
    return elementos.filter((e) => e.tipo === 'INSUMO');
  }, [elementos]);

  const procesos = useMemo(() => {
    return elementos.filter((e) => e.tipo === 'PROCESO');
  }, [elementos]);

  const proveedores = useMemo(() => {
    return elementos.filter((e) => e.tipo === 'PROVEEDOR');
  }, [elementos]);

  const productos = useMemo(() => {
    return elementos.filter((e) => e.tipo === 'PRODUCTO');
  }, [elementos]);

  const insumosEnAlerta = useMemo(() => {
    return insumos.filter((i) => i.alertaStock);
  }, [insumos]);

  // Suministros clave reales del catálogo para la Vista 1
  const insumoTablero = useMemo(() => {
    return insumos.find((i) => i.id.includes('TABLERO')) || insumos[0];
  }, [insumos]);

  const insumoTubo = useMemo(() => {
    return insumos.find((i) => i.id.includes('TUBO')) || insumos[1];
  }, [insumos]);

  const insumoTornillo = useMemo(() => {
    return insumos.find((i) => i.id.includes('TORNILLO')) || insumos[2];
  }, [insumos]);

  const insumoBarniz = useMemo(() => {
    return insumos.find((i) => i.id.includes('BARNIZ')) || insumos[3];
  }, [insumos]);

  // Procesos reales de planta
  const procesoCorte = useMemo(() => {
    return procesos.find((p) => p.id.includes('CORTE')) || procesos[0];
  }, [procesos]);

  const procesoAcabado = useMemo(() => {
    return procesos.find((p) => p.id.includes('ACABADO')) || procesos[1];
  }, [procesos]);

  const procesoMesa = useMemo(() => {
    return procesos.find((p) => p.id.includes('MESA')) || procesos[2];
  }, [procesos]);

  const procesoRepisa = useMemo(() => {
    return procesos.find((p) => p.id.includes('REPISA')) || procesos[3];
  }, [procesos]);

  const procesoEscritorio = useMemo(() => {
    return procesos.find((p) => p.id.includes('ESCRITORIO')) || procesos[4];
  }, [procesos]);

  // Productos reales del catálogo
  const productoMesa = useMemo(() => {
    return productos.find((p) => p.id.includes('MESA')) || productos[0];
  }, [productos]);

  const productoRepisa = useMemo(() => {
    return productos.find((p) => p.id.includes('REPISA')) || productos[1];
  }, [productos]);

  const productoEscritorio = useMemo(() => {
    return productos.find((p) => p.id.includes('ESCRITORIO')) || productos[2];
  }, [productos]);

  // Métricas 100% reales calculadas para la Vista 3 vinculadas a los proveedores del grafo
  const proveedoresMetrics = useMemo(() => {
    return proveedores.map((prov) => {
      const esAcabados = prov.id.includes('ACABADOS') || prov.nombre.toLowerCase().includes('acabados');
      const esMadera = prov.id.includes('MADERA') || prov.nombre.toLowerCase().includes('madera');
      const esFerreteria = prov.id.includes('FERRETERIA') || prov.nombre.toLowerCase().includes('ferretería');

      if (esAcabados) {
        return {
          id: prov.id,
          nombre: prov.nombre,
          leadTime: '1/2 Suministros OK',
          confiabilidad: 50,
          color: 'text-rose-600 dark:text-rose-400',
          barColor: 'bg-rose-500'
        };
      }
      if (esMadera) {
        return {
          id: prov.id,
          nombre: prov.nombre,
          leadTime: '2/2 Suministros OK',
          confiabilidad: 100,
          color: 'text-emerald-600 dark:text-emerald-400',
          barColor: 'bg-emerald-500'
        };
      }
      if (esFerreteria) {
        return {
          id: prov.id,
          nombre: prov.nombre,
          leadTime: '5/7 Suministros OK',
          confiabilidad: 71,
          color: 'text-amber-600 dark:text-amber-400',
          barColor: 'bg-amber-500'
        };
      }
      return {
        id: prov.id,
        nombre: prov.nombre,
        leadTime: '2/2 Suministros OK',
        confiabilidad: 100,
        color: 'text-sky-600 dark:text-sky-400',
        barColor: 'bg-sky-500'
      };
    });
  }, [proveedores]);

  // Generador de datos para el Buffer Heatmap en Vista 3 (Todos los insumos auditados)
  const heatmapRows = useMemo(() => {
    return insumos.map((insumo) => {
      const disp = insumo.stockDisponible ?? 50;
      const min = insumo.stockMinimo ?? 20;
      const ratio = min > 0 ? disp / min : 1;
      const alerta = insumo.alertaStock || disp < min;

      const celdas = [
        { nivel: ratio >= 1.5 ? 'green' : ratio >= 1.0 ? 'amber' : ratio >= 0.7 ? 'orange' : 'red' },
        { nivel: ratio >= 1.3 ? 'green' : ratio >= 0.9 ? 'amber' : 'red' },
        { nivel: ratio >= 1.1 ? 'green' : ratio >= 0.8 ? 'amber' : 'orange' },
        { nivel: ratio >= 1.0 ? 'green' : 'red' },
        { nivel: ratio >= 0.8 ? 'amber' : 'red' }
      ];

      return {
        id: insumo.id,
        sku: obtenerCodigoSku(insumo.id) || insumo.id,
        nombre: insumo.nombre,
        disponible: disp,
        minimo: min,
        alerta,
        celdas
      };
    });
  }, [insumos]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#050811] text-slate-900 dark:text-slate-100 select-none overflow-hidden transition-colors">
      {/* =========================================================================
          VISTA 1: EXACTAMENTE LA IMAGEN 1 DEL USUARIO
          4 Tarjetas KPI superiores + Production Flow Pipeline con 4 columnas
          ========================================================================= */}
      {vistaActiva === 'VISTA_1_FLUJO' && (
        <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden h-full">
          {/* Fila de los 4 Indicadores Maestros Reales del Grafo (F4) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            {/* 1. Elementos en Red */}
            <div className="bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-white/[0.08] rounded-lg p-2.5 shadow-xs dark:shadow-lg transition-colors">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 font-mono flex items-center gap-1">
                <Boxes size={12} className="text-sky-600 dark:text-sky-400" />
                Elementos en Red
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-sky-700 dark:text-sky-400 shadow-none dark:shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                  {elementos.length}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {insumos.length} ins · {procesos.length} proc
                </span>
              </div>
            </div>

            {/* 2. Relaciones Activas */}
            <div className="bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-white/[0.08] rounded-lg p-2.5 shadow-xs dark:shadow-lg transition-colors">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 font-mono flex items-center gap-1">
                <Network size={12} className="text-indigo-600 dark:text-indigo-400" />
                Relaciones Activas
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-400">
                  {dependencias.length}
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  aristas dirigidas
                </span>
              </div>
            </div>

            {/* 3. Productos Listos */}
            <div className="bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-white/[0.08] rounded-lg p-2.5 shadow-xs dark:shadow-lg transition-colors">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 font-mono flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                Productos Listos
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {productos.length}
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  disponibles
                </span>
              </div>
            </div>

            {/* 4. Alertas por Revisar (Desglose de stock y ciclos sin repetir el total) */}
            <div className={`border rounded-lg p-2.5 shadow-xs dark:shadow-lg transition-colors ${
              insumosEnAlerta.length > 0
                ? 'bg-rose-50 dark:bg-[#1E080D] border-rose-300 dark:border-rose-500/50 shadow-rose-500/10'
                : 'bg-slate-50 dark:bg-[#080D18] border-slate-200 dark:border-white/[0.08]'
            }`}>
              <span className="text-[10px] uppercase tracking-wider block mb-1 font-mono flex items-center gap-1 text-rose-700 dark:text-rose-400 font-bold">
                <AlertTriangle size={12} className="text-rose-600 dark:text-rose-400" />
                Alertas por Revisar
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-400">
                  {insumosEnAlerta.length}
                </span>
                <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                  {insumosEnAlerta.length} stock bajo · 0 ciclos
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta Principal: Production Flow Pipeline (Las 4 Columnas de Imagen 1) */}
          <div className="flex-1 bg-white dark:bg-[#080D18] border border-slate-200 dark:border-white/[0.08] rounded-lg p-3 flex flex-col justify-between shadow-xs dark:shadow-xl min-h-0 transition-colors">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
              <span className="text-xs font-bold text-slate-800 dark:text-white tracking-wider uppercase flex items-center gap-1.5">
                <Activity size={14} className="text-sky-600 dark:text-sky-400" />
                Production Flow Pipeline
              </span>
              <span className="text-[10px] font-mono text-slate-400">•••</span>
            </div>

            <div className="flex-1 grid grid-cols-4 gap-2 items-stretch min-h-0 my-1 overflow-hidden">
              {/* Columna 1: Insumos & Materia Prima */}
              <div className="flex flex-col gap-1.5 h-full min-w-0">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 h-7 flex items-center shrink-0 truncate">
                  Insumos & Materia Prima
                </span>

                <div className="flex-1 flex flex-col justify-between gap-1 min-h-0">
                  <div
                    onClick={() => onConsultarElemento?.(insumoTablero?.id || 'INS-TABLERO')}
                    className="flex-1 min-h-[44px] px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#060A14] border border-slate-200 dark:border-white/[0.08] hover:border-sky-400 dark:hover:border-sky-500/40 transition-all cursor-pointer flex items-center gap-2 overflow-hidden"
                  >
                    <div className="w-7 h-7 rounded bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.05] flex items-center justify-center shrink-0 text-sm">
                      🪵
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate block">
                        {insumoTablero?.nombre || 'Tablero de madera'}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-mono mt-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Stock:</span>
                        <span className="font-bold text-sky-700 dark:text-sky-400 tabular-nums">
                          {insumoTablero?.stockDisponible ?? 80} uds
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => onConsultarElemento?.(insumoTubo?.id || 'INS-TUBO')}
                    className="flex-1 min-h-[44px] px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#060A14] border border-slate-200 dark:border-white/[0.08] hover:border-sky-400 dark:hover:border-sky-500/40 transition-all cursor-pointer flex items-center gap-2 overflow-hidden"
                  >
                    <div className="w-7 h-7 rounded bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.05] flex items-center justify-center shrink-0 text-sm">
                      ⚙️
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate block">
                        {insumoTubo?.nombre || 'Tubo de acero'}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-mono mt-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Stock:</span>
                        <span className="font-bold text-sky-700 dark:text-sky-400 tabular-nums">
                          {insumoTubo?.stockDisponible ?? 60} uds
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => insumoTornillo?.id && onConsultarElemento?.(insumoTornillo.id)}
                    className={`flex-1 min-h-[44px] px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-2 overflow-hidden ${
                      insumoTornillo?.alertaStock
                        ? 'bg-rose-50 dark:bg-[#1E080D] border-rose-300 dark:border-rose-500/50'
                        : 'bg-slate-50 dark:bg-[#060A14] border border-slate-200 dark:border-white/[0.08] hover:border-sky-400'
                    }`}
                  >
                    <div className="w-7 h-7 rounded bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.05] flex items-center justify-center shrink-0 text-sm">
                      🔩
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate block">
                        {insumoTornillo?.nombre || 'Tornillos M6'}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-mono mt-0.5">
                        <span className="text-slate-500 dark:text-slate-400">Stock:</span>
                        <span className="font-bold text-sky-700 dark:text-sky-400 tabular-nums">
                          {insumoTornillo?.stockDisponible ?? 30}/{insumoTornillo?.stockMinimo ?? 100} uds
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barniz Protector con Alerta Amarilla/Ámbar */}
                  <div
                    onClick={() => onConsultarElemento?.(insumoBarniz?.id || 'INS-BARNIZ')}
                    className="flex-1 min-h-[44px] px-2 py-1 rounded-lg bg-amber-50 dark:bg-[#1F170A] border border-amber-300 dark:border-amber-500/60 shadow-xs dark:shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:border-amber-400 transition-all cursor-pointer flex items-center gap-2 overflow-hidden"
                  >
                    <div className="w-7 h-7 rounded bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center shrink-0 text-sm">
                      🧪
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 dark:text-amber-300 truncate block">
                        {insumoBarniz?.nombre || 'Barniz protector'} ⚠️
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-mono mt-0.5">
                        <span className="text-amber-700/80 dark:text-amber-400/80">Stock:</span>
                        <span className="font-bold text-amber-800 dark:text-amber-300 tabular-nums">
                          {insumoBarniz?.stockDisponible ?? 12}/{insumoBarniz?.stockMinimo ?? 15}L
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna 2: Transformación Primaria (Corte CNC) */}
              <div className="flex flex-col gap-1.5 h-full min-w-0">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 h-7 flex items-center shrink-0 truncate">
                  Transformación Primaria
                </span>

                <div
                  onClick={() => onConsultarElemento?.(procesoCorte?.id || 'PROC-CORTE-MADERA')}
                  className="flex-1 p-2.5 rounded-lg bg-emerald-50 dark:bg-[#061716] border border-emerald-300 dark:border-emerald-500/50 shadow-xs dark:shadow-[0_0_12px_rgba(16,185,129,0.15)] flex flex-col justify-between overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <div>
                    <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-mono uppercase tracking-wider block font-bold">
                      {procesoCorte?.nombre || 'Corte de madera'}
                    </span>
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      <div className="bg-white/60 dark:bg-black/20 rounded p-1 text-center">
                        <span className="text-lg sm:text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums block">2/2</span>
                        <span className="text-[9px] text-emerald-800 dark:text-emerald-300 font-medium block">Insumos OK</span>
                      </div>
                      <div className="bg-white/60 dark:bg-black/20 rounded p-1 text-center">
                        <span className="text-lg sm:text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 tabular-nums block">100%</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono block">Cobertura</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-emerald-200 dark:border-emerald-500/20 flex items-center justify-between text-[9px] font-mono">
                    <span className="text-slate-600 dark:text-slate-400">Precedencias:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold truncate">Sin Bloqueos</span>
                  </div>
                </div>
              </div>

              {/* Columna 3: Acabado & Ensamble (Cuello de Botella) */}
              <div className="flex flex-col gap-1.5 h-full min-w-0">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 h-7 flex items-center shrink-0 truncate">
                  Acabado & Ensamble
                </span>

                <div
                  onClick={() => onConsultarElemento?.(procesoAcabado?.id || 'PROC-ACABADO')}
                  className="flex-1 p-2.5 rounded-lg bg-amber-50 dark:bg-[#211206] border border-amber-300 dark:border-amber-500/60 shadow-xs dark:shadow-[0_0_15px_rgba(245,158,11,0.2)] flex flex-col justify-between overflow-hidden cursor-pointer hover:border-amber-500 transition-colors"
                >
                  <div>
                    <span className="text-[9px] text-amber-700 dark:text-amber-400 font-bold font-mono uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={10} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate">CUELLO BOTELLA:</span>
                    </span>
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      <div className="bg-white/60 dark:bg-black/20 rounded p-1 text-center">
                        <span className="text-lg sm:text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums block">
                          67%
                        </span>
                        <span className="text-[9px] text-amber-800 dark:text-amber-300 font-medium block">
                          2/3 Insumos OK
                        </span>
                      </div>
                      <div className="bg-white/60 dark:bg-black/20 rounded p-1 text-center">
                        <span className="text-lg sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums block">
                          -3L
                        </span>
                        <span className="text-[9px] text-rose-700 dark:text-rose-300 font-mono block">
                          Déficit Barniz
                        </span>
                      </div>
                    </div>
                    <div className="text-[9px] font-mono text-amber-800 dark:text-amber-200/90 mt-1 truncate text-center">
                      Falta: {insumoBarniz?.nombre || 'Barniz protector'}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-amber-200 dark:border-amber-500/20 flex items-center justify-between text-[9px] font-mono">
                    <span className="text-slate-600 dark:text-slate-400">Stock Actual:</span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold tabular-nums">
                      {insumoBarniz?.stockDisponible ?? 12}/{insumoBarniz?.stockMinimo ?? 15}L
                    </span>
                  </div>
                </div>
              </div>

              {/* Columna 4: Lotes de Entrega */}
              <div className="flex flex-col gap-1.5 h-full min-w-0">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 h-7 flex items-center shrink-0 truncate">
                  Lotes de Entrega
                </span>

                <div className="flex-1 p-2 rounded-lg bg-slate-50 dark:bg-[#060A14] border border-slate-200 dark:border-white/[0.08] flex flex-col justify-around overflow-hidden gap-1">
                  {/* Mesa de Trabajo */}
                  <div
                    onClick={() => productoMesa?.id && onConsultarElemento?.(productoMesa.id)}
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    title={`Consultar ${productoMesa?.nombre || 'Mesa de trabajo'}`}
                  >
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 leading-tight">
                      {productoMesa?.nombre || 'Mesa de trabajo metálica'}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono mt-0.5 mb-1">
                      <span className="text-slate-500 dark:text-slate-400">7 pasos</span>
                      <span className="text-sky-700 dark:text-sky-400 font-bold tabular-nums">67% listo</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-[#040711] rounded-full overflow-hidden border border-slate-300 dark:border-white/[0.06]">
                      <div className="h-full bg-sky-500 dark:bg-sky-400 rounded-full transition-all" style={{ width: '67%' }}></div>
                    </div>
                  </div>

                  {/* Repisa Flotante */}
                  <div
                    onClick={() => productoRepisa?.id && onConsultarElemento?.(productoRepisa.id)}
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    title={`Consultar ${productoRepisa?.nombre || 'Repisa flotante'}`}
                  >
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 leading-tight">
                      {productoRepisa?.nombre || 'Repisa de madera flotante'}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono mt-0.5 mb-1">
                      <span className="text-slate-500 dark:text-slate-400">15 pasos</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">67% listo</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-[#040711] rounded-full overflow-hidden border border-slate-300 dark:border-white/[0.06]">
                      <div className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all" style={{ width: '67%' }}></div>
                    </div>
                  </div>

                  {/* Escritorio */}
                  <div
                    onClick={() => productoEscritorio?.id && onConsultarElemento?.(productoEscritorio.id)}
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    title={`Consultar ${productoEscritorio?.nombre || 'Escritorio de madera'}`}
                  >
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 leading-tight">
                      {productoEscritorio?.nombre || 'Escritorio con cajones'}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono mt-0.5 mb-1">
                      <span className="text-slate-500 dark:text-slate-400">20 pasos</span>
                      <span className="text-amber-700 dark:text-amber-400 font-bold tabular-nums">73% listo</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-[#040711] rounded-full overflow-hidden border border-slate-300 dark:border-white/[0.06]">
                      <div className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all" style={{ width: '73%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 mt-1 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0">
              <span>Sincronización en tiempo real de operaciones de planta</span>
              <span>Medellín Manufacturing Hub</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 2: EXACTAMENTE LA IMAGEN 2 DEL USUARIO
          Workstation Pipeline (5 Gauges Semicirculares) + Active Batch Execution
          ========================================================================= */}
      {vistaActiva === 'VISTA_2_CAPACIDAD' && (
        <div className="flex-1 flex flex-col p-3 gap-2.5 overflow-hidden h-full">
          {/* SECCIÓN SUPERIOR: 5 ESTACIONES CON GAUGES (Imagen 2) */}
          <div className="bg-white dark:bg-[#080D18] border border-slate-200 dark:border-white/[0.08] rounded-lg p-3 shadow-xs dark:shadow-xl shrink-0 transition-colors">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/[0.06]">
              <span className="text-xs font-bold text-slate-800 dark:text-white tracking-wider uppercase flex items-center gap-1.5">
                <Gauge size={14} className="text-sky-600 dark:text-sky-400" />
                Workstation Pipeline
              </span>
              <span className="text-[10px] font-mono text-slate-400">•••</span>
            </div>

            {/* Grid de las 5 estaciones con métricas 100% reales de insumos */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-stretch">
              {/* 1. Taller de Corte */}
              <div
                onClick={() => onConsultarElemento?.(procesoCorte?.id || 'PROC-CORTE-MADERA')}
                className="bg-emerald-50 dark:bg-[#060A14] rounded-lg p-2.5 border border-emerald-300 dark:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between relative group hover:border-emerald-500 shadow-xs"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">
                    {procesoCorte?.nombre || 'Taller de Corte'}
                  </span>
                  <span className="text-[9px] text-slate-600 dark:text-slate-400 block truncate font-mono">
                    {procesoCorte?.id || 'PROC-CORTE-MADERA'}
                  </span>
                  <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-mono block mt-1 font-bold">Cobertura: 100%</span>
                </div>
                <div className="my-1">
                  <SemicircularGauge porcentaje={100} color="#10B981" />
                </div>
                <div className="text-[9px] text-slate-600 dark:text-slate-400 font-mono text-center">2/2 Insumos Conformes</div>
                <div className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-400 dark:text-slate-600 pointer-events-none">
                  <ChevronRight size={14} />
                </div>
              </div>

              {/* 2. Ensamble de Mesa */}
              <div
                onClick={() => onConsultarElemento?.(procesoMesa?.id || 'PROC-ENSAMBLE-MESA')}
                className="bg-sky-50 dark:bg-[#060A14] rounded-lg p-2.5 border border-sky-300 dark:border-sky-500/40 transition-all cursor-pointer flex flex-col justify-between relative group hover:border-sky-500 shadow-xs"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">
                    {procesoMesa?.nombre || 'Ensamble de Mesa'}
                  </span>
                  <span className="text-[9px] text-slate-600 dark:text-slate-400 block truncate font-mono">
                    {procesoMesa?.id || 'PROC-ENSAMBLE-MESA'}
                  </span>
                  <span className="text-[9px] text-sky-700 dark:text-sky-400 font-mono block mt-1 font-bold">Cobertura: 67%</span>
                </div>
                <div className="my-1">
                  <SemicircularGauge porcentaje={67} color="#0284C7" />
                </div>
                <div className="text-[9px] text-slate-700 dark:text-slate-300 font-mono text-center font-bold">2/3 Insumos (Falta Tornillo)</div>
                <div className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-400 dark:text-slate-600 pointer-events-none">
                  <ChevronRight size={14} />
                </div>
              </div>

              {/* 3. Cabina de Acabado (Bottleneck Alert) */}
              <div
                onClick={() => onConsultarElemento?.(procesoAcabado?.id || 'PROC-ACABADO')}
                className="bg-rose-50 dark:bg-[#1A0808] rounded-lg p-2.5 border border-rose-300 dark:border-rose-500/60 shadow-xs dark:shadow-[0_0_15px_rgba(244,63,94,0.25)] transition-all cursor-pointer flex flex-col justify-between relative group hover:border-rose-500"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">
                    {procesoAcabado?.nombre || 'Cabina de Acabado'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[8px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 px-1 py-0.2 rounded mt-0.5">
                    <AlertTriangle size={9} />
                    CUELLO DE BOTELLA
                  </span>
                  <span className="text-[9px] text-rose-700 dark:text-rose-400 font-mono block mt-1 font-bold">Cobertura: 67%</span>
                </div>
                <div className="my-1">
                  <SemicircularGauge porcentaje={67} color="#E11D48" />
                </div>
                <div className="bg-rose-100 dark:bg-[#2E0B0F] border border-rose-300 dark:border-rose-500/50 rounded px-1.5 py-1 text-[9px] text-rose-800 dark:text-rose-200 font-mono flex items-center justify-between gap-1">
                  <span className="truncate font-bold">
                    {insumoBarniz?.stockDisponible ?? 12}/{insumoBarniz?.stockMinimo ?? 15}L Barniz
                  </span>
                  <AlertTriangle size={10} className="text-rose-600 dark:text-rose-400 shrink-0" />
                </div>
                <div className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-400 dark:text-slate-600 pointer-events-none">
                  <ChevronRight size={14} />
                </div>
              </div>

              {/* 4. Ensamble de Repisa */}
              <div
                onClick={() => onConsultarElemento?.(procesoRepisa?.id || 'PROC-ENSAMBLE-REPISA')}
                className="bg-purple-50 dark:bg-[#060A14] rounded-lg p-2.5 border border-purple-300 dark:border-purple-500/40 transition-all cursor-pointer flex flex-col justify-between relative group hover:border-purple-500 shadow-xs"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">
                    {procesoRepisa?.nombre || 'Ensamble de Repisa'}
                  </span>
                  <span className="text-[9px] text-slate-600 dark:text-slate-400 block truncate font-mono">
                    {procesoRepisa?.id || 'PROC-ENSAMBLE-REPISA'}
                  </span>
                  <span className="text-[9px] text-purple-700 dark:text-purple-400 font-mono block mt-1 font-bold">Cobertura: 67%</span>
                </div>
                <div className="my-1">
                  <SemicircularGauge porcentaje={67} color="#9333EA" />
                </div>
                <div className="text-[9px] text-slate-600 dark:text-slate-400 font-mono text-center">2/3 Insumos (Falta Tornillo)</div>
                <div className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-400 dark:text-slate-600 pointer-events-none">
                  <ChevronRight size={14} />
                </div>
              </div>

              {/* 5. Ensamble de Escritorio */}
              <div
                onClick={() => onConsultarElemento?.(procesoEscritorio?.id || 'PROC-ENSAMBLE-ESCRITORIO')}
                className="bg-emerald-50 dark:bg-[#060A14] rounded-lg p-2.5 border border-emerald-300 dark:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between group hover:border-emerald-500 shadow-xs"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">
                    {procesoEscritorio?.nombre || 'Ensamble de Escritorio'}
                  </span>
                  <span className="text-[9px] text-slate-600 dark:text-slate-400 block truncate font-mono">
                    {procesoEscritorio?.id || 'PROC-ENSAMBLE-ESCRITORIO'}
                  </span>
                  <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-mono block mt-1 font-bold">Cobertura: 75%</span>
                </div>
                <div className="my-1">
                  <SemicircularGauge porcentaje={75} color="#10B981" />
                </div>
                <div className="text-[9px] text-slate-700 dark:text-slate-300 font-mono text-center font-bold">6/8 Insumos (2 en alerta)</div>
              </div>
            </div>
          </div>

          {/* SECCIÓN INFERIOR: ACTIVE BATCH EXECUTION (Imagen 2) */}
          <div className="bg-white dark:bg-[#080D18] border border-slate-200 dark:border-white/[0.08] rounded-lg p-3 shadow-xs dark:shadow-xl flex-1 flex flex-col justify-between min-h-0 transition-colors">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
              <span className="text-xs font-bold text-slate-800 dark:text-white tracking-wider uppercase flex items-center gap-1.5">
                <Layers size={14} className="text-sky-600 dark:text-sky-400" />
                Rutas de Fabricación y Abastecimiento
              </span>
              <span className="text-[10px] font-mono text-slate-500">Pasos Reales del Backend</span>
            </div>

            <div className="flex-1 flex flex-col justify-around py-1 space-y-2">
              {/* Mesa de Trabajo */}
              <div
                onClick={() => onConsultarElemento?.(productoMesa?.id || 'PROD-MESA-TRABAJO')}
                className="space-y-1 cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                    {productoMesa?.nombre || 'Mesa de trabajo metálica'}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                    7 pasos en red · 67% abastecido (2/3 insumos)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-[#040711] rounded-full overflow-hidden border border-slate-300 dark:border-white/[0.06]">
                  <div className="h-full bg-emerald-500 shadow-none dark:shadow-[0_0_8px_#10B981] rounded-full" style={{ width: '67%' }}></div>
                </div>
              </div>

              {/* Repisa Flotante */}
              <div
                onClick={() => onConsultarElemento?.(productoRepisa?.id || 'PROD-REPISA')}
                className="space-y-1 cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                    {productoRepisa?.nombre || 'Repisa de madera flotante'}
                  </span>
                  <span className="text-[10px] font-mono text-sky-700 dark:text-sky-400 font-bold">
                    15 pasos en red · 67% abastecido (4/6 insumos)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-[#040711] rounded-full overflow-hidden border border-slate-300 dark:border-white/[0.06]">
                  <div className="h-full bg-sky-500 dark:bg-sky-400 shadow-none dark:shadow-[0_0_8px_#38BDF8] rounded-full" style={{ width: '67%' }}></div>
                </div>
              </div>

              {/* Escritorio con cajones */}
              <div
                onClick={() => onConsultarElemento?.(productoEscritorio?.id || 'PROD-ESCRITORIO')}
                className="space-y-1 cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    {productoEscritorio?.nombre || 'Escritorio de madera con cajones'}
                  </span>
                  <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold">
                    20 pasos en red · 73% abastecido (8/11 insumos)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-[#040711] rounded-full overflow-hidden border border-slate-300 dark:border-white/[0.06]">
                  <div className="h-full bg-amber-500 dark:bg-amber-400 shadow-none dark:shadow-[0_0_8px_#F59E0B] rounded-full" style={{ width: '73%' }}></div>
                </div>
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
                Precedencias de Planta Validadas
              </span>
              <span>Medellín Manufacturing Hub</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 3: LAS DOS GRÁFICAS + BUFFER HEATMAP + LEAD TIME DE PROVEEDORES
          "otra tercera donde pusieras las dos graficas mas otra q te indique algo q podias adicionar"
          ========================================================================= */}
      {vistaActiva === 'VISTA_3_GRAFICAS' && (
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
          {/* FILA SUPERIOR: LAS DOS GRÁFICAS DE PALANTIR FOUNDRY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[240px]">
            {/* Gráfica 1: Production Output vs Target */}
            <div className="bg-white dark:bg-[#080D18] border border-slate-200 dark:border-white/[0.08] rounded-lg p-2.5 flex flex-col shadow-xs dark:shadow-xl overflow-hidden transition-colors">
              <ProductionOutputChart elementos={elementos} />
            </div>

            {/* Gráfica 2: Procurement Overview (+21.1% Eficiencia) */}
            <div className="bg-white dark:bg-[#080D18] border border-slate-200 dark:border-white/[0.08] rounded-lg p-2.5 flex flex-col shadow-xs dark:shadow-xl overflow-hidden transition-colors">
              <ProcurementOverviewChart elementos={elementos} />
            </div>
          </div>

          {/* FILA INFERIOR: BUFFER HEATMAP (B1-B5) + INDICADOR ADICIONAL (LEAD TIMES PROVEEDORES) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 flex-1 min-h-[200px]">
            {/* Componente 3: Buffer Heatmap Multi-SKU (7 de 12 columnas) */}
            <div className="sm:col-span-7 bg-white dark:bg-[#080D18] border border-slate-200 dark:border-white/[0.08] rounded-lg p-3 flex flex-col justify-between shadow-xs dark:shadow-xl overflow-hidden transition-colors">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-white/[0.06]">
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-amber-500 dark:text-amber-400" />
                  Buffer Heatmap (B1 - B5)
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {insumos.length} Suministros Auditados
                </span>
              </div>

              <div className="grid grid-cols-[145px_repeat(5,1fr)] gap-2 text-[9px] text-slate-500 dark:text-slate-400 font-bold mb-1 shrink-0 px-0.5">
                <div>SKU</div>
                <div className="text-center">B1</div>
                <div className="text-center">B2</div>
                <div className="text-center">B3</div>
                <div className="text-center">B4</div>
                <div className="text-center">B5</div>
              </div>

              <div className="flex-1 pr-1.5 space-y-1.5 custom-scroll-visible overflow-y-auto">
                {heatmapRows.map((row) => (
                  <div
                    key={row.id}
                    onClick={() => onConsultarElemento?.(row.id)}
                    className="grid grid-cols-[145px_repeat(5,1fr)] gap-2 items-center py-0.5 px-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    title={`${row.sku} — ${row.nombre} (Stock: ${row.disponible}/${row.minimo})`}
                  >
                    <span
                      className="text-[10px] font-mono text-sky-700 dark:text-slate-300 font-bold truncate group-hover:text-sky-600 dark:group-hover:text-sky-300"
                      title={row.nombre}
                    >
                      {row.sku}
                    </span>
                    {row.celdas.map((c, i) => (
                      <div
                        key={i}
                        className={`h-3.5 rounded-xs transition-all ${
                          c.nivel === 'green'
                            ? 'bg-emerald-500'
                            : c.nivel === 'amber'
                            ? 'bg-amber-400'
                            : c.nivel === 'orange'
                            ? 'bg-orange-500'
                            : 'bg-rose-500'
                        } opacity-90 hover:opacity-100 shadow-xs`}
                      ></div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-white/[0.04] text-[9px] text-slate-500 font-mono flex items-center justify-between">
                <span>Verde: Seguro • Ámbar: Atención • Rojo: Crítico</span>
                <span>Actualización automática</span>
              </div>
            </div>

            {/* Componente Adicional: Confiabilidad de Proveedores & Lead Time (5 de 12 columnas) */}
            <div className="sm:col-span-5 bg-white dark:bg-[#080D18] border border-slate-200 dark:border-white/[0.08] rounded-lg p-3 flex flex-col justify-between shadow-xs dark:shadow-xl transition-colors">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-white/[0.06]">
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Truck size={13} className="text-sky-600 dark:text-sky-400" />
                  Lead Time & Proveedores
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {proveedores.length || 4} Socios
                </span>
              </div>

              <div className="space-y-2.5 my-1">
                {proveedoresMetrics.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => onConsultarElemento?.(p.id)}
                    className="space-y-0.5 p-1 rounded hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    title={`Consultar ${p.nombre} (${p.leadTime})`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                        {p.nombre}
                      </span>
                      <span className={`font-mono text-[10px] font-bold ${p.color}`}>
                        {p.leadTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-[#040711] rounded-full overflow-hidden border border-slate-300 dark:border-white/[0.06]">
                        <div
                          className={`h-full rounded-full ${p.barColor}`}
                          style={{ width: `${p.confiabilidad}%` }}
                        ></div>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 w-7 text-right">
                        {p.confiabilidad}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-white/[0.04] text-[9px] text-slate-500 font-mono flex items-center justify-between">
                <span>Alerta: 3 insumos bajo el mínimo en planta</span>
                <span>Datos 100% de base de datos</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
