import { AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { Dependencia, Elemento } from '../types';

interface StationThroughputChartProps {
  elementos?: Elemento[];
  dependencias?: Dependencia[];
}

interface PuntoEstacionReal {
  id: string;
  rotulo: string;
  nombreCompleto: string;
  stockDisponible: number;
  stockMinimo: number;
  esBajoUmbral: boolean;
  insumosConAlerta: string[];
  insumosEntrada: string[];
}

interface CoordenadaEstacion extends PuntoEstacionReal {
  x: number;
  y: number;
  yUmbral: number;
}

export const StationThroughputChart: React.FC<StationThroughputChartProps> = ({
  elementos = [],
  dependencias = []
}) => {
  const [puntoHover, setPuntoHover] = useState<CoordenadaEstacion | null>(null);

  // Calcula las métricas 100% reales de disponibilidad y umbrales mínimos por estación de proceso
  const { datos, maximoValor, hayEstacionesBajoUmbral } = useMemo(() => {
    const todosProcesos = elementos.filter((e) => e.tipo === 'PROCESO');
    const insumos = elementos.filter((e) => e.tipo === 'INSUMO');

    if (todosProcesos.length === 0) {
      return { datos: [], maximoValor: 200, hayEstacionesBajoUmbral: false };
    }

    // Ordenar las estaciones según el flujo real del proceso productivo
    const ordenFlujo = ['CORTE', 'ACABADO', 'MESA', 'REPISA', 'ESCRITORIO'];
    const procesosOrdenados = [...todosProcesos].sort((a, b) => {
      const idxA = ordenFlujo.findIndex((k) => a.id.includes(k));
      const idxB = ordenFlujo.findIndex((k) => b.id.includes(k));
      return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
    });

    const mapaInsumos = new Map<string, Elemento>();
    insumos.forEach((i) => mapaInsumos.set(i.id, i));

    const puntos: PuntoEstacionReal[] = procesosOrdenados.map((proc) => {
      const aristasEntrada = dependencias.filter((dep) => dep.destino === proc.id);
      const insumosEntrada = aristasEntrada
        .map((dep) => mapaInsumos.get(dep.origen))
        .filter((ins): ins is Elemento => Boolean(ins));

      const insumosEfectivos =
        insumosEntrada.length > 0
          ? insumosEntrada
          : insumos.filter((ins) => {
              if (proc.id.includes('CORTE')) return ins.id.includes('TABLERO') || ins.id.includes('LISTON');
              if (proc.id.includes('ACABADO')) return ins.id.includes('BARNIZ') || ins.id.includes('LIJA');
              if (proc.id.includes('MESA')) return ins.id.includes('TUBO') || ins.id.includes('PANEL');
              if (proc.id.includes('REPISA')) return ins.id.includes('COLA') || ins.id.includes('PIEZA');
              if (proc.id.includes('ESCRITORIO')) return ins.id.includes('CORREDERA') || ins.id.includes('TIRADOR');
              return false;
            });

      const totalDisp = insumosEfectivos.reduce((acc, i) => acc + (i.stockDisponible ?? 0), 0);
      const totalMin = insumosEfectivos.reduce((acc, i) => acc + (i.stockMinimo ?? 0), 0);

      // REGLA MATEMÁTICA ESTRICTA: El punto está bajo el umbral ÚNICAMENTE si totalDisp < totalMin
      const esBajoUmbral = totalDisp < totalMin;

      // Insumos individuales que tienen déficit para avisar en el tooltip informativo
      const insumosConAlerta = insumosEfectivos
        .filter((i) => i.alertaStock || (i.stockDisponible ?? 0) < (i.stockMinimo ?? 0))
        .map((i) => `${i.nombre} (${i.stockDisponible}/${i.stockMinimo})`);

      const nombresInsumos = insumosEfectivos.map((i) => i.nombre);

      // Rótulos claros y correctos para cada estación
      let rotulo = 'Estación';
      if (proc.id.includes('CORTE')) rotulo = 'Corte';
      else if (proc.id.includes('ACABADO')) rotulo = 'Acabado';
      else if (proc.id.includes('MESA')) rotulo = 'Mesa';
      else if (proc.id.includes('REPISA')) rotulo = 'Repisa';
      else if (proc.id.includes('ESCRITORIO')) rotulo = 'Escritorio';
      else {
        rotulo = proc.nombre.split(' ')[0];
      }

      return {
        id: proc.id,
        rotulo,
        nombreCompleto: proc.nombre,
        stockDisponible: totalDisp,
        stockMinimo: totalMin,
        esBajoUmbral,
        insumosConAlerta,
        insumosEntrada: nombresInsumos
      };
    });

    const maxVal = puntos.reduce(
      (max, p) => Math.max(max, p.stockDisponible, p.stockMinimo),
      100
    );
    const hayBajo = puntos.some((p) => p.esBajoUmbral);

    return {
      datos: puntos,
      maximoValor: Math.ceil(maxVal / 50) * 50,
      hayEstacionesBajoUmbral: hayBajo
    };
  }, [elementos, dependencias]);

  const svgWidth = 330;
  const svgHeight = 115;
  const padLeft = 32;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 22;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const maxVal = maximoValor || 300;

  const coords: CoordenadaEstacion[] = useMemo(() => {
    if (datos.length === 0) return [];
    return datos.map((d, i) => {
      const divisor = datos.length > 1 ? datos.length - 1 : 1;
      const x = padLeft + (i / divisor) * chartW;
      const y = padTop + chartH - (d.stockDisponible / maxVal) * chartH;
      const yUmbral = padTop + chartH - (d.stockMinimo / maxVal) * chartH;
      return { x, y, yUmbral, ...d };
    });
  }, [datos, chartW, chartH, maxVal]);

  const pathD = useMemo(() => {
    if (coords.length === 0) return '';
    return coords.reduce((acc, curr, i, arr) => {
      if (i === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[i - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  }, [coords]);

  const pathUmbralD = useMemo(() => {
    if (coords.length === 0) return '';
    return coords.reduce((acc, curr, i, arr) => {
      if (i === 0) return `M ${curr.x} ${curr.yUmbral}`;
      const prev = arr[i - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.yUmbral}, ${cx} ${curr.yUmbral}, ${curr.x} ${curr.yUmbral}`;
    }, '');
  }, [coords]);

  const areaD = useMemo(() => {
    if (coords.length === 0) return '';
    const bottomY = padTop + chartH;
    return `${pathD} L ${coords[coords.length - 1].x} ${bottomY} L ${coords[0].x} ${bottomY} Z`;
  }, [pathD, coords, chartH]);

  return (
    <div className="flex flex-col h-full justify-between select-none">
      {/* Header del gráfico */}
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-1.5">
          <Layers size={12} className="text-sky-600 dark:text-sky-400" />
          <span className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            Capacidad de Insumos por Estación
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hayEstacionesBajoUmbral ? (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 flex items-center gap-1 font-bold shrink-0">
              <AlertTriangle size={9} className="text-rose-600 dark:text-rose-400" />
              Déficit en estación
            </span>
          ) : (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1 font-bold shrink-0">
              <CheckCircle2 size={9} className="text-emerald-600 dark:text-emerald-400" />
              Capacidad nominal
            </span>
          )}
        </div>
      </div>

      {/* SVG del Gráfico */}
      <div className="relative flex-1 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGlowThroughput" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#0284C7" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
            </linearGradient>
            <filter id="neonGlowLine" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Líneas horizontales de fondo */}
          {[0, Math.round(maxVal / 3), Math.round((maxVal * 2) / 3), maxVal].map((val) => {
            const y = padTop + chartH - (val / maxVal) * chartH;
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-white/[0.05]"
                  strokeDasharray="2 3"
                />
                <text
                  x={padLeft - 5}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-500 dark:fill-[#64748B]"
                  fontSize="7"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Curva de Umbral Mínimo Requerido (Línea discontinua rosa) */}
          {pathUmbralD && (
            <path
              d={pathUmbralD}
              fill="none"
              stroke="#F43F5E"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          )}

          {/* Área sombreada */}
          <path d={areaD} fill="url(#areaGlowThroughput)" />

          {/* Línea de stock disponible */}
          <path
            d={pathD}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            filter="url(#neonGlowLine)"
          />

          {/* Puntos de datos de cada estación */}
          {coords.map((pt, i) => (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setPuntoHover(pt)}
              onMouseLeave={() => setPuntoHover(null)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={4}
                className={`transition-all hover:r-5.5 ${
                  pt.esBajoUmbral
                    ? 'fill-rose-500 stroke-rose-300 stroke-[1.8]'
                    : 'fill-white dark:fill-[#0A0F1A] stroke-sky-600 dark:stroke-[#38BDF8] stroke-[1.8]'
                }`}
              />
              {/* Etiqueta de la estación en el eje X */}
              <text
                x={pt.x}
                y={svgHeight - 4}
                textAnchor="middle"
                className="fill-slate-600 dark:fill-[#94A3B8]"
                fontSize="8"
                fontFamily="monospace"
              >
                {pt.rotulo}
              </text>
            </g>
          ))}
        </svg>

        {/* Tooltip interactivo flotante con regla matemática 100% coherente */}
        {puntoHover && (
          <div
            className="absolute z-20 px-2 py-1 rounded bg-[#0A0F1A] border border-sky-500/40 text-[9px] font-mono text-white shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(puntoHover.x / svgWidth) * 100}%`,
              top: `${(puntoHover.y / svgHeight) * 100 - 8}%`
            }}
          >
            <div className="font-bold text-sky-400">{puntoHover.nombreCompleto}</div>
            <div>Disponible: {puntoHover.stockDisponible} uds</div>
            <div className="text-slate-400">Umbral mín: {puntoHover.stockMinimo} uds</div>
            <div className={puntoHover.esBajoUmbral ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {puntoHover.esBajoUmbral
                ? `⚠ Bajo umbral mínimo (-${puntoHover.stockMinimo - puntoHover.stockDisponible} uds)`
                : `✓ Stock conforme (+${puntoHover.stockDisponible - puntoHover.stockMinimo} uds sobre umbral)`}
            </div>
            {puntoHover.insumosConAlerta.length > 0 && !puntoHover.esBajoUmbral && (
              <div className="text-amber-300 text-[8px] mt-0.5">
                (Nota: {puntoHover.insumosConAlerta.length} insumo individual bajo mínimo)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
