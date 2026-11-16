import React, { useState, useMemo } from 'react';
import { MoreVertical, ShieldAlert, ShieldCheck, Truck } from 'lucide-react';
import type { Elemento } from '../types';

interface ProcurementOverviewChartProps {
  elementos: Elemento[];
}

interface PuntoProveedorReal {
  id: string;
  rotulo: string;
  porcentaje: number;
  conformes: number;
  total: number;
  volumen: number;
  minimo: number;
  alertas: number;
  esBajoMinimo: boolean;
  nombresAlerta: string[];
}

interface CoordenadaProveedor {
  x: number;
  y: number;
  data: PuntoProveedorReal;
}

export const ProcurementOverviewChart: React.FC<ProcurementOverviewChartProps> = ({
  elementos
}) => {
  const [puntoHover, setPuntoHover] = useState<PuntoProveedorReal | null>(null);

  // Calcula la tasa de cumplimiento real (0-100%) por proveedor del grafo
  const { datos, totalStockActual, cantProveedoresAlerta } = useMemo(() => {
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
      const totalMinimo = suministrosDelProv.reduce(
        (acc, curr) => acc + (curr.stockMinimo || 0),
        0
      );
      const alertasInsumos = suministrosDelProv.filter(
        (i) => i.alertaStock || (i.stockDisponible ?? 0) < (i.stockMinimo ?? 0)
      );
      const cantAlertas = alertasInsumos.length;
      const totalSKUs = suministrosDelProv.length;
      const conformes = totalSKUs - cantAlertas;
      const pct = totalSKUs > 0 ? Math.round((conformes / totalSKUs) * 100) : 100;
      const esBajoMinimo = pct < 100;
      const nombresAlerta = alertasInsumos.map((i) => {
        const disp = i.stockDisponible ?? 0;
        const min = i.stockMinimo ?? 0;
        const faltan = min - disp;
        return `${i.nombre}: ${disp}/${min} (faltan ${faltan})`;
      });

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
        porcentaje: pct,
        conformes,
        total: totalSKUs,
        volumen: totalVolumen,
        minimo: totalMinimo,
        alertas: cantAlertas,
        esBajoMinimo,
        nombresAlerta
      };
    });

    const stockTotal = insumos.reduce((acc, curr) => acc + (curr.stockDisponible || 0), 0);
    const proveedoresAlerta = puntos.filter((p) => p.esBajoMinimo).length;

    return {
      datos: puntos,
      totalStockActual: stockTotal,
      cantProveedoresAlerta: proveedoresAlerta
    };
  }, [elementos]);

  // Dimensiones del SVG
  const svgWidth = 320;
  const svgHeight = 115;
  const padLeft = 32;
  const padRight = 20;
  const padTop = 14;
  const padBottom = 20;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const maxVal = 100; // Escala 0% a 100%
  const yUmbral100 = padTop; // 100% de cumplimiento está en la parte superior

  // Coordenadas en escala normalizada 0-100%
  const coordenadas: CoordenadaProveedor[] = useMemo(() => {
    if (datos.length === 0) return [];
    return datos.map((d, i) => {
      const divisor = datos.length > 1 ? datos.length - 1 : 1;
      const x = padLeft + (i / divisor) * chartW;
      const y = padTop + chartH - (d.porcentaje / maxVal) * chartH;
      return { x, y, data: d };
    });
  }, [datos, chartW, chartH, padLeft, padTop, maxVal]);

  // Curva suave de porcentaje de cumplimiento
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
      {/* Header del Gráfico con Leyenda Explícita */}
      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 dark:border-white/[0.06] shrink-0 gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0"></span>
          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 tracking-wide truncate">
            Cumplimiento por Proveedor
          </span>
        </div>

        {/* Leyenda Visual explicativa de líneas */}
        <div className="hidden sm:flex items-center gap-2 text-[8px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-cyan-400 rounded"></span> Cumplimiento
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 border-b border-dashed border-rose-400"></span> Meta 100%
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Badge Eficiencia / Alerta estilo Foundry */}
          {cantProveedoresAlerta > 0 ? (
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 flex items-center gap-1 shrink-0 whitespace-nowrap">
              <ShieldAlert size={10} className="text-rose-600 dark:text-rose-400" />
              <span>{totalStockActual} uds · {cantProveedoresAlerta} con déficit</span>
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-cyan-50 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 flex items-center gap-1 shrink-0 whitespace-nowrap">
              <ShieldCheck size={10} className="text-cyan-600 dark:text-cyan-400" />
              <span>{totalStockActual} uds en planta</span>
            </span>
          )}
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

          {/* Líneas de cuadrícula horizontal (0%, 25%, 50%, 75%, 100%) */}
          {[100, 75, 50, 25, 0].map((val) => {
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
                  fontSize="7.5"
                  fontFamily="monospace"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Línea de Umbral de Meta de Abastecimiento Pleno (Línea discontinua fija al 100%) */}
          <line
            x1={padLeft}
            y1={yUmbral100}
            x2={svgWidth - padRight}
            y2={yUmbral100}
            stroke="#F43F5E"
            strokeWidth="1.3"
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
            Meta: 100% Conforme
          </text>

          {/* Relleno de Área con Gradiente */}
          <path d={areaD} fill="url(#procGradReal)" />

          {/* Trazo de Curva Resplandeciente (Cumplimiento por Proveedor) */}
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
                r={pt.data.esBajoMinimo ? '4.5' : '3.5'}
                fill={pt.data.esBajoMinimo ? '#EF4444' : '#0F172A'}
                stroke={pt.data.esBajoMinimo ? '#FCA5A5' : '#06B6D4'}
                strokeWidth="1.8"
                className="hover:r-5.5 transition-all"
              />
            </g>
          ))}

          {/* Etiquetas del eje X (Nombres de proveedores reales) */}
          {coordenadas.map((pt, idx) => (
            <text
              key={idx}
              x={pt.x}
              y={svgHeight - 4}
              textAnchor={idx === 0 ? 'start' : idx === coordenadas.length - 1 ? 'end' : 'middle'}
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
          <div className="absolute top-2 left-6 pointer-events-none px-2.5 py-1.5 rounded bg-[#030712]/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md text-[10px] text-white flex flex-col gap-1 z-20 font-mono">
            <div className="flex items-center gap-1.5 font-bold">
              <Truck size={11} className="text-cyan-400 shrink-0" />
              <span className="text-cyan-300">{puntoHover.rotulo}:</span>
              <span>{puntoHover.porcentaje}% Cumplimiento ({puntoHover.conformes}/{puntoHover.total} insumos listos)</span>
            </div>
            {puntoHover.esBajoMinimo ? (
              <div className="text-rose-400 font-bold text-[9px] flex flex-col gap-0.5">
                <span>⚠ Déficit en {puntoHover.alertas} insumo(s):</span>
                {puntoHover.nombresAlerta.map((alertaStr, idx) => (
                  <span key={idx} className="text-rose-300 font-mono pl-2">
                    • {alertaStr}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-emerald-400 font-bold text-[9px]">
                ✓ 100% Abastecido ({puntoHover.total}/{puntoHover.total} insumos sobre el stock mínimo)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
