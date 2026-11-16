import React, { useMemo } from 'react';

interface TrendSparklineProps {
  disponible: number;
  minimo: number;
  alerta?: boolean;
  puntosHistoricos?: number[];
  width?: number;
  height?: number;
}

export const TrendSparkline: React.FC<TrendSparklineProps> = ({
  disponible,
  minimo,
  alerta = false,
  puntosHistoricos,
  width = 64,
  height = 20
}) => {
  // Genera puntos de tendencia dinámicos basados en la relación stock/mínimo real si no se pasan puntos
  const puntos = useMemo(() => {
    if (puntosHistoricos && puntosHistoricos.length >= 3) {
      return puntosHistoricos;
    }
    const ratio = minimo > 0 ? disponible / minimo : 1.2;
    // Semilla determinista basada en disponible y minimo para consistencia visual
    const b1 = Math.max(10, Math.round(disponible * 0.92));
    const b2 = Math.max(8, Math.round(disponible * (ratio < 1 ? 0.85 : 1.05)));
    const b3 = Math.max(12, Math.round(disponible * (ratio < 1 ? 0.78 : 0.95)));
    const b4 = Math.max(9, Math.round(disponible * (ratio < 1 ? 0.82 : 1.02)));
    const b5 = disponible;
    return [b1, b2, b3, b4, b5];
  }, [disponible, minimo, puntosHistoricos]);

  const { pathD, areaD, ultimoPunto } = useMemo(() => {
    const minVal = Math.min(...puntos) * 0.85;
    const maxVal = Math.max(...puntos, minimo) * 1.15;
    const rango = maxVal - minVal || 1;

    const padX = 2;
    const padY = 3;
    const wEfectivo = width - padX * 2;
    const hEfectivo = height - padY * 2;

    const coords = puntos.map((val, idx) => {
      const x = padX + (idx / (puntos.length - 1)) * wEfectivo;
      const y = padY + hEfectivo - ((val - minVal) / rango) * hEfectivo;
      return { x, y };
    });

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }

    const last = coords[coords.length - 1];
    const first = coords[0];
    const aD = `${d} L ${last.x} ${height} L ${first.x} ${height} Z`;

    return { pathD: d, areaD: aD, ultimoPunto: last };
  }, [puntos, minimo, width, height]);

  const colorLinea = alerta ? '#F43F5E' : '#38BDF8';
  const gradId = `sparkGrad_${alerta ? 'alert' : 'norm'}_${Math.round(disponible)}_${minimo}`;

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible inline-block shrink-0"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorLinea} stopOpacity={0.35} />
          <stop offset="100%" stopColor={colorLinea} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={colorLinea}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={ultimoPunto.x}
        cy={ultimoPunto.y}
        r="2"
        fill={colorLinea}
        className="animate-pulse"
      />
    </svg>
  );
};
