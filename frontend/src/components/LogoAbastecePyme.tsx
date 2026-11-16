import React, { useState } from 'react';

interface LogoAbastecePymeProps {
  size?: number;
  mostrarTexto?: boolean;
  className?: string;
  textoClassName?: string;
  usarImagenOficial?: boolean;
}

export const LogoAbastecePyme: React.FC<LogoAbastecePymeProps> = ({
  size = 28,
  mostrarTexto = true,
  className = '',
  textoClassName = '',
  usarImagenOficial = true
}) => {
  const [errorImagen, setErrorImagen] = useState(false);

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Opción 1: Imagen Original Idéntica (Copiada del archivo oficial de referencia) */}
      {usarImagenOficial && !errorImagen ? (
        <img
          src="/logo-abastecepyme.jpg"
          alt="Logo AbastecePyme"
          style={{ width: size, height: size }}
          className="rounded-lg object-cover shadow-xs ring-1 ring-white/10 dark:ring-white/20 shrink-0"
          onError={() => setErrorImagen(true)}
        />
      ) : (
        /* Opción 2: SVG Vectorial Puro con las 3 piezas flotantes y 100% DESCONECTADAS (Sin lados pegados) */
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 overflow-visible"
          aria-label="Logo AbastecePyme"
        >
          <defs>
            {/* Gradiente Cyan (Pieza superior izquierda) */}
            <linearGradient id="cyanFacetGrad" x1="50" y1="102" x2="105" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00A8C6" />
              <stop offset="50%" stopColor="#00E5FF" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>

            {/* Gradiente Naranja (Pilar derecho) */}
            <linearGradient id="amberFacetGrad" x1="120" y1="36" x2="175" y2="168" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="45%" stopColor="#FF9F43" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>

            {/* Sombra 3D facetada en la cara interior del pilar naranja */}
            <linearGradient id="facetShadowAmber" x1="110" y1="36" x2="135" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#78350F" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#92400E" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#B45309" stopOpacity="0" />
            </linearGradient>

            {/* Gradiente Azul (Pieza inferior izquierda y codo) */}
            <linearGradient id="blueFacetGrad" x1="28" y1="168" x2="124" y2="112" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1D4ED8" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>

            {/* Sombra de profundidad */}
            <filter id="logoElevation" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.45" />
            </filter>
          </defs>

          <g filter="url(#logoElevation)">
            {/* PIEZA 1: Pilar Naranja Derecho (Totalmente separado, NO toca ni cyan ni azul) */}
            <path
              d="M 124 38 C 126 34 131 34 134 38 L 182 156 C 185 162 181 168 174 168 L 152 168 C 147 168 143 165 141 160 L 115 98 L 111 48 C 110 42 116 36 124 38 Z"
              fill="url(#amberFacetGrad)"
            />

            {/* Bisel 3D del pilar naranja */}
            <path
              d="M 122 38 L 130 40 L 136 82 L 116 78 L 111 48 Z"
              fill="url(#facetShadowAmber)"
            />

            {/* PIEZA 2: Pieza Azul (Pata inferior con codo y travesaño; termina ANTES del pilar naranja) */}
            <path
              d="M 28 168 C 24 168 22 164 24 158 L 33 138 C 39 122 52 112 68 112 L 112 112 C 118 112 122 117 121 123 C 120 128 116 132 111 132 L 68 132 C 60 132 54 138 52 145 L 46 168 Z"
              fill="url(#blueFacetGrad)"
            />

            {/* Reflejo / Luz en el codo azul */}
            <path
              d="M 36 135 C 41 123 52 114 66 114 L 110 114"
              stroke="#93C5FD"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeOpacity="0.4"
            />

            {/* PIEZA 3: Pieza Cyan (Superior izquierda; flota separada arriba del azul y del naranja) */}
            <path
              d="M 52 102 C 50 102 48 99 50 95 L 86 26 C 89 21 95 19 100 21 L 112 25 C 117 27 118 32 115 37 L 88 95 C 86 99 81 102 76 102 Z"
              fill="url(#cyanFacetGrad)"
            />

            {/* Reflejo / Luz exterior en el Cyan */}
            <path
              d="M 86 24 L 52 94"
              stroke="#E0F2FE"
              strokeWidth="3"
              strokeLinecap="round"
              strokeOpacity="0.5"
            />
          </g>
        </svg>
      )}

      {/* Logotipo Tipográfico Oficial */}
      {mostrarTexto && (
        <span
          className={`font-sans font-bold tracking-tight text-sm sm:text-base leading-none transition-colors ${
            textoClassName || 'text-slate-900 dark:text-white'
          }`}
        >
          <span>Abastece</span>
          <span className="text-sky-500 dark:text-sky-400 font-extrabold">Pyme</span>
        </span>
      )}
    </div>
  );
};
