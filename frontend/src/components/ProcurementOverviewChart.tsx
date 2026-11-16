import React, { useState, useMemo } from 'react';
import { MoreVertical, ShieldCheck, Truck } from 'lucide-react';
import type { Elemento } from '../types';

interface ProcurementOverviewChartProps {
  elementos: Elemento[];
}

interface PuntoProveedorReal {
  id: string;
  rotulo: string;
  volumen: number;
  cantidadSuministros: number;
  alertas: number;
}

export const ProcurementOverviewChart: React.FC<ProcurementOverviewChartProps> = ({
  elementos
}) => {
  const [puntoHover, setPuntoHover] = useState<PuntoProveedorReal | null>(null);

  // Calcula el aprovisionamiento real por proveedor del grafo
  const { datos, totalStockActual, maximoValor } = useMemo(() => {
    const insumos = elementos.filter((e) => e.tipo === 'INSUMO');
    const todosProveedores = elementos.filter((e) => e.tipo === 'PROVEEDOR');

    // Ordenar los proveedores según la secuencia lógica de manufactura:
    // Madera -> Acero -> Acabados -> Ferretería
    const ordenLogico = ['MADERA', 'ACERO', 'ACABADOS', 'FERRETERIA'];
    const proveedores = [...todosProveedores].sort((a, b) => {
      const idxA = ordenLogico.findIndex((k) => a.id.includes(k));
      const idxB = ordenLogico.findIndex((k) => b.id.includes(k));
      return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
    });

    const puntos: PuntoProveedorReal[] = proveedores.map((prov) => {
      // Identificar suministros asociados al proveedor por prefijo o coincidencia
      const suministrosDelProv = insumos.filter((ins) => {
        if (prov.id.includes('MADERA')) return ins.id.includes('TABLERO') || ins.id.includes('LISTON');
        if (prov.id.includes('ACERO')) return ins.id.includes('PANEL') || ins.id.includes('TUBO');
        if (prov.id.includes('ACABADOS')) return ins.id.includes('LIJA') || ins.id.includes('BARNIZ');
        if (prov.id.includes('FERRETERIA')) {
          return (
            ins.id.includes('TORNILLO') ||
            ins.id.includes('TUERCA') ||
            ins.id.includes('ARANDELA') ||
            ins.id.includes('BISAGRA') ||
            ins.id.includes('CORREDERA') ||
            ins.id.includes('TIRADOR') ||
            ins.id.includes('COLA')
          );
        }
        return false;
      });

      const totalVolumen = suministrosDelProv.reduce(
        (acc, curr) => acc + (curr.stockDisponible || 0),
        0
      );
      const cantAlertas = suministrosDelProv.filter(
        (i) => i.alertaStock || (i.stockDisponible ?? 0) < (i.stockMinimo ?? 0)
      ).length;

      let rotuloCorto = 'Proveedor';
      if (prov.id.includes('MADERA')) rotuloCorto = 'Madera';
      else if (prov.id.includes('ACERO')) rotuloCorto = 'Acero';
      else if (prov.id.includes('ACABADOS')) rotuloCorto = 'Acabados';
      else if (prov.id.includes('FERRETERIA')) rotuloCorto = 'Ferretería';
      else {
        rotuloCorto = prov.nombre.replace('Proveedor de ', '').replace('Proveedor ', '').split(' ')[0];
      }

      return {
        id: prov.id,
        rotulo: rotuloCorto,
        volumen: totalVolumen,
        cantidadSuministros: suministrosDelProv.length,
        alertas: cantAlertas
      };
    });

    const stockTotal = insumos.reduce((acc, curr) => acc + (curr.stockDisponible || 0), 0);
    const maxVol = puntos.reduce((max, p) => Math.max(max, p.volumen), 200);

    return {
      datos: puntos,
      totalStockActual: stockTotal,
      maximoValor: Math.ceil(maxVol / 100) * 100
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
  const maxVal = maximoValor || 700;

  // Coordenadas con datos reales
  const coordenadas = useMemo(() => {
    if (datos.length === 0) return [];
    return datos.map((d, i) => {
      const divisor = datos.length > 1 ? datos.length - 1 : 1;
      const x = padLeft + (i / divisor) * chartW;
      const y = padTop + chartH - (d.volumen / maxVal) * chartH;
      return { x, y, data: d };
    });
  }, [datos, chartW, chartH, padLeft, padTop, maxVal]);

  // Curva suave
  const { pathD, areaD } = useMemo(() => {
    if (coordenadas.length === 0) return { pathD: '', areaD: '' };

    let d = `M ${coordenadas[0].x} ${coordenadas[0].y}`;
    for (let i = 1; i < coordenadas.length; i++) {
      const prev = coordenadas[i - 1];
      const curr = coordenadas[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }

    const last = coordenadas[coordenadas.length - 1];
    const first = coordenadas[0];
    const yBase = padTop + chartH;
    const aD = `${d} L ${last.x} ${yBase} L ${first.x} ${yBase} Z`;

    return { pathD: d, areaD: aD };
  }, [coordenadas, chartH, padTop]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#080C14] border border-slate-200 dark:border-white/[0.08] rounded-lg p-2.5 overflow-hidden shadow-xs dark:shadow-lg select-none transition-colors">
      {/* Header del Gráfico */}
      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400"></span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-wide">
            Aprovisionamiento por Proveedor
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge Eficiencia estilo Foundry */}
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-50 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 flex items-center gap-1">
            <ShieldCheck size={10} className="text-cyan-600 dark:text-cyan-400" />
            <span>{totalStockActual} uds en planta</span>
          </span>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer"
            title="Opciones de aprovisionamiento"
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
            <linearGradient id="procGradReal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} />
              <stop offset="60%" stopColor="#0891B2" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#0891B2" stopOpacity={0.0} />
            </linearGradient>
            <filter id="cyanGlowProc" x="-20%" y="-20%" width="140%" height="140%">
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

          {/* Relleno de Área con Gradiente */}
          <path d={areaD} fill="url(#procGradReal)" />

          {/* Trazo de Curva Resplandeciente */}
          <path
            d={pathD}
            fill="none"
            stroke="#06B6D4"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#cyanGlowProc)"
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
                r="3.5"
                fill="#0F172A"
                stroke="#06B6D4"
                strokeWidth="1.8"
                className="hover:r-5 transition-all"
              />
            </g>
          ))}

          {/* Etiquetas del eje X (Nombres de proveedores reales) */}
          {coordenadas.map((pt, idx) => (
            <text
              key={idx}
              x={pt.x}
              y={svgHeight - 4}
              textAnchor="middle"
              fill="#64748B"
              fontSize="7.5"
              fontWeight="600"
            >
              {pt.data.rotulo}
            </text>
          ))}
        </svg>

        {/* Tooltip táctico flotante con datos 100% reales */}
        {puntoHover && (
          <div className="absolute top-2 left-10 pointer-events-none px-2 py-1 rounded bg-[#030712]/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md text-[10px] text-white flex items-center gap-2 z-20">
            <Truck size={11} className="text-cyan-400" />
            <span className="font-bold text-cyan-300">{puntoHover.rotulo}:</span>
            <span>{puntoHover.volumen} uds suministradas</span>
            <span className="text-[9px] text-slate-400">
              ({puntoHover.cantidadSuministros} SKUs{puntoHover.alertas > 0 ? ` · ${puntoHover.alertas} con déficit` : ' conformes'})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
