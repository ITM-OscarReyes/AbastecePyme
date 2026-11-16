import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, MoreVertical } from 'lucide-react';
import type { Elemento } from '../types';
import { obtenerCodigoSku } from '../utils/sku';

interface ProductionOutputChartProps {
  elementos: Elemento[];
  productoSeleccionadoId?: string | null;
  onFiltrarProducto?: (id: string) => void;
}

interface PuntoSuministro {
  id: string;
  sku: string;
  rotulo: string;
  disponible: number;
  minimo: number;
  alerta: boolean;
}

export const ProductionOutputChart: React.FC<ProductionOutputChartProps> = ({
  elementos
}) => {
  const [puntoHover, setPuntoHover] = useState<PuntoSuministro | null>(null);

  // Calcula la serie con los datos 100% reales de inventario de cada suministro del grafo
  const { datos, maximoValor, totalEnAlerta } = useMemo(() => {
    const insumos = elementos.filter((e) => e.tipo === 'INSUMO');

    const puntos: PuntoSuministro[] = insumos.map((i) => {
      const disp = i.stockDisponible ?? 0;
      const min = i.stockMinimo ?? 0;
      const sku = obtenerCodigoSku(i.id) || i.id;
      const bajoMin = Boolean(i.alertaStock || disp < min);

      return {
        id: i.id,
        sku,
        rotulo: i.nombre,
        disponible: disp,
        minimo: min,
        alerta: bajoMin
      };
    });

    const maxDisp = puntos.reduce((max, p) => Math.max(max, p.disponible, p.minimo), 100);
    const enAlerta = puntos.filter((p) => p.alerta).length;

    return {
      datos: puntos,
      maximoValor: Math.ceil(maxDisp / 50) * 50,
      totalEnAlerta: enAlerta
    };
  }, [elementos]);

  // Dimensiones del SVG
  const svgWidth = 320;
  const svgHeight = 115;
  const padLeft = 28;
  const padRight = 10;
  const padTop = 12;
  const padBottom = 20;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const maxVal = maximoValor || 300;

  // Coordenadas de los puntos reales y de sus umbrales específicos
  const coordenadas = useMemo(() => {
    if (datos.length === 0) return [];
    return datos.map((d, i) => {
      const divisor = datos.length > 1 ? datos.length - 1 : 1;
      const x = padLeft + (i / divisor) * chartW;
      const y = padTop + chartH - (d.disponible / maxVal) * chartH;
      const yUmbral = padTop + chartH - (d.minimo / maxVal) * chartH;
      return { x, y, yUmbral, data: d };
    });
  }, [datos, chartW, chartH, padLeft, padTop, maxVal]);

  // Generar curva suave de stock, curva de umbrales y área con datos reales
  const { pathD, pathUmbralD, areaD } = useMemo(() => {
    if (coordenadas.length === 0) return { pathD: '', pathUmbralD: '', areaD: '' };

    let d = `M ${coordenadas[0].x} ${coordenadas[0].y}`;
    let dUmb = `M ${coordenadas[0].x} ${coordenadas[0].yUmbral}`;
    for (let i = 1; i < coordenadas.length; i++) {
      const prev = coordenadas[i - 1];
      const curr = coordenadas[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
      dUmb += ` C ${cx} ${prev.yUmbral}, ${cx} ${curr.yUmbral}, ${curr.x} ${curr.yUmbral}`;
    }

    const last = coordenadas[coordenadas.length - 1];
    const first = coordenadas[0];
    const yBase = padTop + chartH;
    const aD = `${d} L ${last.x} ${yBase} L ${first.x} ${yBase} Z`;

    return { pathD: d, pathUmbralD: dUmb, areaD: aD };
  }, [coordenadas, chartH, padTop]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#080C14] border border-slate-200 dark:border-white/[0.08] rounded-lg p-2.5 overflow-hidden shadow-xs dark:shadow-lg select-none transition-colors">
      {/* Header del Gráfico */}
      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400 shrink-0"></span>
          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 tracking-wide truncate">
            Inventario Real de Insumos
          </span>
          <span className="text-[8.5px] font-mono text-slate-500 shrink-0">
            ({datos.length} SKUs)
          </span>
        </div>

        {/* Leyenda Visual explicativa de líneas */}
        <div className="hidden sm:flex items-center gap-2 text-[8px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-sky-400 rounded"></span> Stock Real
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 border-b border-dashed border-rose-400"></span> Mínimo
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Badge Umbral estilo Foundry */}
          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold border shrink-0 whitespace-nowrap ${
            totalEnAlerta > 0
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
          }`}>
            {totalEnAlerta > 0 ? `${totalEnAlerta} bajo mínimo` : 'Stock seguro'}
          </span>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer"
            title="Opciones de telemetría"
          >
            <MoreVertical size={12} />
          </button>
        </div>
      </div>

      {/* Contenedor del Gráfico SVG */}
      <div className="flex-1 w-full relative min-h-[90px] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="prodRealGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.4} />
              <stop offset="60%" stopColor="#0284C7" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#0284C7" stopOpacity={0.0} />
            </linearGradient>
            <filter id="cyanGlowReal" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Líneas de cuadrícula horizontal y etiquetas de eje Y con valores reales */}
          {[maxVal, Math.round(maxVal * 0.66), Math.round(maxVal * 0.33), 0].map((val) => {
            const y = padTop + chartH - (val / maxVal) * chartH;
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-[#1E293B]"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                />
                <text
                  x={padLeft - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-[#64748B]"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Curva de Umbral Mínimo Específico de cada Insumo */}
          {pathUmbralD && (
            <path
              d={pathUmbralD}
              fill="none"
              stroke="#EF4444"
              strokeWidth="1.2"
              strokeDasharray="3,3"
            />
          )}

          {/* Relleno de Área con Gradiente */}
          <path d={areaD} fill="url(#prodRealGrad)" />

          {/* Trazo de Curva Resplandeciente con datos reales de stock disponible */}
          <path
            d={pathD}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#cyanGlowReal)"
          />

          {/* Puntos interactivos con hover */}
          {coordenadas.map((pt, idx) => (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setPuntoHover(pt.data)}
              onMouseLeave={() => setPuntoHover(null)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={pt.data.alerta ? '4' : '3'}
                fill={pt.data.alerta ? '#EF4444' : '#0F172A'}
                stroke={pt.data.alerta ? '#F87171' : '#38BDF8'}
                strokeWidth="1.8"
                className="hover:r-5 transition-all"
              />
            </g>
          ))}

          {/* Etiquetas del eje X legibles sin superposición: Destacar insumos en alerta y extremos */}
          {coordenadas.map((pt, idx) => {
            const esPrimero = idx === 0;
            const esUltimo = idx === coordenadas.length - 1;
            const esAlerta = pt.data.alerta;

            if (!esAlerta && !esPrimero && !esUltimo) {
              return (
                <line
                  key={idx}
                  x1={pt.x}
                  y1={svgHeight - 13}
                  x2={pt.x}
                  y2={svgHeight - 9}
                  className="stroke-slate-300 dark:stroke-slate-700"
                  strokeWidth="0.8"
                />
              );
            }

            const nombreCorto = pt.data.rotulo.split(' ')[0];

            return (
              <text
                key={idx}
                x={esPrimero ? pt.x + 2 : esUltimo ? pt.x - 2 : pt.x}
                y={svgHeight - 3}
                textAnchor={esPrimero ? 'start' : esUltimo ? 'end' : 'middle'}
                fill={esAlerta ? '#EF4444' : '#64748B'}
                fontSize="7"
                fontFamily="monospace"
                fontWeight={esAlerta ? 'bold' : '500'}
              >
                {nombreCorto}
              </text>
            );
          })}
        </svg>

        {/* Tooltip táctico flotante con datos 100% reales de la base de datos */}
        {puntoHover && (
          <div className="absolute top-2 left-10 pointer-events-none px-2 py-1 rounded bg-[#030712]/95 border border-sky-500/50 shadow-2xl backdrop-blur-md text-[10px] text-white flex items-center gap-2 z-20">
            {puntoHover.alerta ? (
              <AlertTriangle size={11} className="text-rose-400" />
            ) : (
              <CheckCircle2 size={11} className="text-emerald-400" />
            )}
            <span className="font-mono text-sky-300 font-bold">{puntoHover.sku}:</span>
            <span className="truncate max-w-[120px]">{puntoHover.rotulo}</span>
            <span className="font-mono font-bold">
              {puntoHover.disponible}/{puntoHover.minimo} uds
            </span>
            <span className={`text-[9px] font-bold ${puntoHover.alerta ? 'text-rose-400' : 'text-emerald-400'}`}>
              {puntoHover.alerta
                ? `(-${puntoHover.minimo - puntoHover.disponible} bajo umbral)`
                : `(+${puntoHover.disponible - puntoHover.minimo} sobre umbral)`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
