import { Activity, AlertTriangle } from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface PuntoThroughput {
  hora: string;
  throughput: number;
  umbral: number;
}

interface PuntoThroughputConCoords extends PuntoThroughput {
  x: number;
  y: number;
}

export const StationThroughputChart: React.FC = () => {
  const [puntoHover, setPuntoHover] = useState<PuntoThroughputConCoords | null>(null);

  // Serie de horas de turno coincidente con el mockup de referencia
  const datos: PuntoThroughput[] = useMemo(() => [
    { hora: '0h', throughput: 820, umbral: 1500 },
    { hora: '0h', throughput: 1250, umbral: 1500 },
    { hora: '0h', throughput: 940, umbral: 1500 },
    { hora: '1h', throughput: 1680, umbral: 1500 },
    { hora: '2h', throughput: 1310, umbral: 1500 },
    { hora: '3h', throughput: 1580, umbral: 1500 }
  ], []);

  const svgWidth = 330;
  const svgHeight = 115;
  const padLeft = 32;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 22;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const maxVal = 2000;
  const umbral = 1500;

  const coords = useMemo(() => {
    return datos.map((d, i) => {
      const x = padLeft + (i / (datos.length - 1)) * chartW;
      const y = padTop + chartH - (d.throughput / maxVal) * chartH;
      return { x, y, ...d };
    });
  }, [datos, chartW, chartH]);

  const umbralY = padTop + chartH - (umbral / maxVal) * chartH;

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
      {/* Header del gráfico */}
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-sky-600 dark:text-sky-400" />
          <span className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            Production Output vs Target
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 flex items-center gap-1 font-bold shrink-0">
            <AlertTriangle size={9} className="text-rose-600 dark:text-rose-400" />
            Critical Threshold: 1500
          </span>
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
          {[0, 500, 1000, 1500, 2000].map((val) => {
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

          {/* Línea roja de Umbral Crítico (1500 pcs/hr) */}
          <line
            x1={padLeft}
            y1={umbralY}
            x2={svgWidth - padRight}
            y2={umbralY}
            stroke="#F43F5E"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <text
            x={svgWidth - padRight - 2}
            y={umbralY - 4}
            textAnchor="end"
            fill="#F43F5E"
            fontSize="7"
            fontWeight="bold"
            fontFamily="monospace"
          >
            Critical Threshold
          </text>

          {/* Área sombreada */}
          <path d={areaD} fill="url(#areaGlowThroughput)" />

          {/* Línea de throughput */}
          <path
            d={pathD}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            filter="url(#neonGlowLine)"
          />

          {/* Puntos de datos */}
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
                className="fill-white dark:fill-[#0A0F1A] stroke-sky-600 dark:stroke-[#38BDF8] stroke-[1.8] transition-all hover:r-5.5 hover:stroke-sky-400"
              />
              {/* Etiqueta del eje X */}
              <text
                x={pt.x}
                y={svgHeight - 4}
                textAnchor="middle"
                className="fill-slate-600 dark:fill-[#94A3B8]"
                fontSize="8"
                fontFamily="monospace"
              >
                {pt.hora}
              </text>
            </g>
          ))}
        </svg>

        {/* Tooltip interactivo flotante */}
        {puntoHover && (
          <div
            className="absolute z-20 px-2 py-1 rounded bg-[#0A0F1A] border border-sky-500/40 text-[9px] font-mono text-white shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(puntoHover.x / svgWidth) * 100}%`,
              top: `${(puntoHover.y / svgHeight) * 100 - 8}%`
            }}
          >
            <div className="font-bold text-sky-400">{puntoHover.hora}</div>
            <div>{puntoHover.throughput} pcs/hr</div>
            <div className={puntoHover.throughput >= 1500 ? 'text-emerald-400' : 'text-amber-400'}>
              {puntoHover.throughput >= 1500 ? '✓ Sobre meta' : '⚠ Bajo meta'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
