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
  porcentajeCobertura: number;
  insumosConformes: number;
  totalInsumos: number;
  esBajoUmbral: boolean;
  insumosConAlerta: string[];
}

interface CoordenadaEstacion extends PuntoEstacionReal {
  x: number;
  y: number;
}

export const StationThroughputChart: React.FC<StationThroughputChartProps> = ({
  elementos = [],
  dependencias = []
}) => {
  const [puntoHover, setPuntoHover] = useState<CoordenadaEstacion | null>(null);

  // Calcula la tasa de cobertura operativa 100% real por estación de manufactura
  const { datos, cantBajoUmbral } = useMemo(() => {
    const todosProcesos = elementos.filter((e) => e.tipo === 'PROCESO');
    const insumos = elementos.filter((e) => e.tipo === 'INSUMO');

    if (todosProcesos.length === 0) {
      return { datos: [], cantBajoUmbral: 0 };
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

      const totalInsumos = insumosEfectivos.length;
      const insumosConAlerta = insumosEfectivos
        .filter((i) => i.alertaStock || (i.stockDisponible ?? 0) < (i.stockMinimo ?? 0))
        .map((i) => `${i.nombre} (${i.stockDisponible}/${i.stockMinimo})`);

      const insumosConformes = totalInsumos - insumosConAlerta.length;
      const pct = totalInsumos > 0 ? Math.round((insumosConformes / totalInsumos) * 100) : 100;

      // REGLA MATEMÁTICA ESTRICTA: El punto está bajo el umbral ÚNICAMENTE si porcentaje < 100%
      const esBajoUmbral = pct < 100;

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
        porcentajeCobertura: pct,
        insumosConformes,
        totalInsumos,
        esBajoUmbral,
        insumosConAlerta
      };
    });

    const bajo = puntos.filter((p) => p.esBajoUmbral).length;

    return {
      datos: puntos,
      cantBajoUmbral: bajo
    };
  }, [elementos, dependencias]);

  const svgWidth = 330;
  const svgHeight = 115;
  const padLeft = 32;
  const padRight = 24;
  const padTop = 14;
  const padBottom = 22;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Escala fija estándar de 0% a 100%
  const maxVal = 100;
  const yUmbral100 = padTop; // 100% está en la parte superior del gráfico

  const coords: CoordenadaEstacion[] = useMemo(() => {
    if (datos.length === 0) return [];
    return datos.map((d, i) => {
      const divisor = datos.length > 1 ? datos.length - 1 : 1;
      const x = padLeft + (i / divisor) * chartW;
      const y = padTop + chartH - (d.porcentajeCobertura / maxVal) * chartH;
      return { x, y, ...d };
    });
  }, [datos, chartW, chartH]);

  const pathD = useMemo(() => {
    if (coords.length === 0) return '';
    return coords.reduce((acc, curr, i, arr) => {
      if (i === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[i - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  }, [coords]);

  const areaD = useMemo(() => {
    if (coords.length === 0) return '';
    const bottomY = padTop + chartH;
    return `${pathD} L ${coords[coords.length - 1].x} ${bottomY} L ${coords[0].x} ${bottomY} Z`;
  }, [pathD, coords, chartH]);

  return (
    <div className="flex flex-col h-full justify-between select-none">
      {/* Header del gráfico con Leyenda Explícita */}
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 dark:border-white/[0.06] shrink-0 gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers size={11} className="text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-wider whitespace-nowrap">
            Cobertura por Estación
          </span>
        </div>

        {/* Leyenda Visual explicativa de líneas */}
        <div className="hidden sm:flex items-center gap-2 text-[8px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-sky-400 rounded"></span> Cobertura
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 border-b border-dashed border-rose-400"></span> Meta 100%
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {cantBajoUmbral > 0 ? (
            <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 flex items-center gap-1 font-bold shrink-0 whitespace-nowrap">
              <AlertTriangle size={9} className="text-rose-600 dark:text-rose-400 shrink-0" />
              {cantBajoUmbral} con Déficit
            </span>
          ) : (
            <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1 font-bold shrink-0 whitespace-nowrap">
              <CheckCircle2 size={9} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              100% Plena
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

          {/* Líneas horizontales de porcentaje de fondo (0%, 25%, 50%, 75%, 100%) */}
          {[0, 25, 50, 75].map((val) => {
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
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Línea de Umbral de Capacidad Plena (Línea discontinua roja fija al 100%) */}
          <line
            x1={padLeft}
            y1={yUmbral100}
            x2={svgWidth - padRight}
            y2={yUmbral100}
            stroke="#F43F5E"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <text
            x={svgWidth - padRight - 2}
            y={yUmbral100 - 3}
            textAnchor="end"
            fill="#F43F5E"
            fontSize="7"
            fontFamily="monospace"
            fontWeight="bold"
          >
            Meta: 100% Insumos Listos
          </text>

          {/* Área sombreada */}
          <path d={areaD} fill="url(#areaGlowThroughput)" />

          {/* Línea de cobertura de insumos */}
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
                    : 'fill-white dark:fill-[#0A0F1A] stroke-sky-400 stroke-[2]'
                }`}
              />
              {/* Etiqueta de la estación en el eje X */}
              <text
                x={i === 0 ? pt.x + 2 : i === coords.length - 1 ? pt.x - 2 : pt.x}
                y={svgHeight - 4}
                textAnchor={i === 0 ? 'start' : i === coords.length - 1 ? 'end' : 'middle'}
                className="fill-slate-600 dark:fill-[#94A3B8]"
                fontSize="7.5"
                fontFamily="monospace"
                fontWeight="500"
              >
                {pt.rotulo}
              </text>
            </g>
          ))}
        </svg>

        {/* Tooltip táctico flotante posicionado de forma segura para no recortarse jamás */}
        {puntoHover && (
          <div
            className="absolute z-30 pointer-events-none px-2.5 py-1.5 rounded bg-[#0A0F1A]/95 border border-sky-500/50 shadow-2xl backdrop-blur-md text-[9px] font-mono text-white max-w-[240px]"
            style={{
              left: puntoHover.x > svgWidth * 0.65 
                ? 'auto' 
                : `${Math.max(6, (puntoHover.x / svgWidth) * 100 - 15)}%`,
              right: puntoHover.x > svgWidth * 0.65 ? '10px' : 'auto',
              top: puntoHover.y < svgHeight * 0.55
                ? `${((puntoHover.y + 12) / svgHeight) * 100}%`
                : `${Math.max(4, ((puntoHover.y - 45) / svgHeight) * 100)}%`
            }}
          >
            <div className="font-bold text-sky-400">{puntoHover.nombreCompleto}</div>
            <div className="font-semibold text-slate-200 mt-0.5">
              Cobertura: {puntoHover.porcentajeCobertura}% ({puntoHover.insumosConformes}/{puntoHover.totalInsumos} insumos)
            </div>
            <div className={puntoHover.esBajoUmbral ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {puntoHover.esBajoUmbral
                ? `⚠ Déficit operativo (Faltan: ${puntoHover.insumosConAlerta.join(', ')})`
                : '✓ 100% Plena capacidad (Insumos completos)'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
