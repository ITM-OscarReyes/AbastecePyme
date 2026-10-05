import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Elemento, Dependencia } from '../types';
import { Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut, EyeOff, Layers } from 'lucide-react';

try {
  cytoscape.use(dagre);
} catch {
  // Plugin ya cargado
}

interface GraphCanvasProps {
  elementos: Elemento[];
  dependencias: Dependencia[];
  nodoSeleccionadoId?: string | null;
  nodosAfectadosIds?: string[];
  nodosCicloIds?: string[];
  onSelectNode?: (nodoId: string | null) => void;
  onLimpiarResaltados?: () => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  elementos,
  dependencias,
  nodoSeleccionadoId,
  nodosAfectadosIds = [],
  nodosCicloIds = [],
  onSelectNode,
  onLimpiarResaltados
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [esPantallaCompleta, setEsPantallaCompleta] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Modelado de nodos con mayor tamaño, claridad y badges legibles
    const cyNodes = elementos.map(e => {
      let colorFondo = '#1e3a8a'; // Azul cobalto (PROVEEDOR)
      let colorBorde = '#60a5fa';
      const icono = e.tipo === 'PROVEEDOR' ? '🏢' : e.tipo === 'INSUMO' ? '📦' : e.tipo === 'PROCESO' ? '⚙️' : '🏆';

      if (e.tipo === 'INSUMO') {
        colorFondo = '#92400e'; // Ámbar intenso
        colorBorde = '#fbbf24';
      } else if (e.tipo === 'PROCESO') {
        colorFondo = '#5b21b6'; // Púrpura eléctrico
        colorBorde = '#c084fc';
      } else if (e.tipo === 'PRODUCTO') {
        colorFondo = '#065f46'; // Esmeralda profundo
        colorBorde = '#34d399';
      }

      const esAfectado = nodosAfectadosIds.includes(e.id);
      const esCiclo = nodosCicloIds.includes(e.id);
      const esSeleccionado = nodoSeleccionadoId === e.id;

      let borderWidth = 2;

      if (esAfectado) {
        colorFondo = '#991b1b'; // Rojo carmesí de alerta
        colorBorde = '#f87171';
        borderWidth = 3.5;
      }
      if (esCiclo) {
        colorFondo = '#881337'; // Rosa neón de ciclo
        colorBorde = '#fb7185';
        borderWidth = 4;
      }
      if (esSeleccionado) {
        colorBorde = '#38bdf8';
        borderWidth = 4;
      }

      return {
        data: {
          id: e.id,
          label: `${icono} ${e.nombre}\n[${e.id}] • ${e.tipo}`,
          tipo: e.tipo,
          colorFondo,
          colorBorde,
          borderWidth
        }
      };
    });

    // Modelado de aristas dirigidas de abastecimiento
    const cyEdges = dependencias.map((d, index) => {
      const esCadenaAfectada =
        nodosAfectadosIds.includes(d.origen) && nodosAfectadosIds.includes(d.destino);
      const esCadenaCiclo =
        nodosCicloIds.includes(d.origen) && nodosCicloIds.includes(d.destino);

      let lineColor = '#475569';
      let arrowColor = '#64748b';
      let width = 2.5;

      if (esCadenaAfectada) {
        lineColor = '#ef4444';
        arrowColor = '#ef4444';
        width = 4;
      }
      if (esCadenaCiclo) {
        lineColor = '#f43f5e';
        arrowColor = '#f43f5e';
        width = 4.5;
      }

      return {
        data: {
          id: `e_${d.origen}_${d.destino}_${index}`,
          source: d.origen,
          target: d.destino,
          label: 'habilita',
          lineColor,
          arrowColor,
          width
        }
      };
    });

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Inicializar Cytoscape con restricciones de zoom y tipografía óptima
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      minZoom: 0.6,
      maxZoom: 2.2,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(colorFondo)',
            'label': 'data(label)',
            'color': '#ffffff',
            'font-size': '11px',
            'font-weight': 600,
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '155px',
            'width': '175px',
            'height': '68px',
            'shape': 'round-rectangle',
            'border-color': 'data(colorBorde)',
            'border-width': 'data(borderWidth)',
            'overlay-padding': '4px',
            'transition-property': 'background-color, border-color, border-width, width, height',
            'transition-duration': 0.25
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 'data(width)',
            'line-color': 'data(lineColor)',
            'target-arrow-color': 'data(arrowColor)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.4,
            'label': 'habilita',
            'font-size': '10px',
            'font-weight': 600,
            'color': '#94a3b8',
            'text-background-color': '#030712',
            'text-background-opacity': 0.85,
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
            'text-rotation': 'autorotate',
            'text-margin-y': -8
          }
        },
        {
          selector: ':selected',
          style: {
            'border-color': '#38bdf8',
            'border-width': 4,
            'overlay-color': '#0284c7',
            'overlay-opacity': 0.15
          }
        }
      ],
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 60,
        rankSep: 110,
        padding: 50,
        animate: true,
        animationDuration: 400
      } as any
    });

    cy.on('tap', 'node', (evt) => {
      const node: NodeSingular = evt.target;
      onSelectNode?.(node.id());
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onSelectNode?.(null);
      }
    });

    // Ajuste inicial limpio
    cy.ready(() => {
      cy.fit(undefined, 40);
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [elementos, dependencias, nodoSeleccionadoId, nodosAfectadosIds, nodosCicloIds]);

  const handleZoomIn = () => cyRef.current?.zoom({ level: cyRef.current.zoom() * 1.25, renderedPosition: { x: containerRef.current!.clientWidth / 2, y: containerRef.current!.clientHeight / 2 } });
  const handleZoomOut = () => cyRef.current?.zoom({ level: cyRef.current.zoom() * 0.8, renderedPosition: { x: containerRef.current!.clientWidth / 2, y: containerRef.current!.clientHeight / 2 } });
  const handleFit = () => cyRef.current?.fit(undefined, 45);
  const handleRelayout = () => {
    cyRef.current?.layout({
      name: 'dagre',
      rankDir: 'LR',
      nodeSep: 60,
      rankSep: 110,
      padding: 50,
      animate: true,
      animationDuration: 400
    } as any).run();
  };

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden glass-card transition-all duration-300 ${
      esPantallaCompleta ? 'fixed inset-4 z-50 shadow-2xl border-sky-500/50' : 'min-h-[520px]'
    }`}>
      {/* Fondo Blueprint */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 graph-canvas-bg" />

      {/* Leyenda y Estado Superior */}
      <div className="absolute top-3 left-3 z-10 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-xs flex flex-wrap items-center gap-3 shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-blue-600 border border-blue-400 inline-block shadow-sm"></span>
          <span className="text-slate-300 font-semibold text-[11px]">Proveedor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-600 border border-amber-400 inline-block shadow-sm"></span>
          <span className="text-slate-300 font-semibold text-[11px]">Insumo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-purple-600 border border-purple-400 inline-block shadow-sm"></span>
          <span className="text-slate-300 font-semibold text-[11px]">Proceso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-600 border border-emerald-400 inline-block shadow-sm"></span>
          <span className="text-slate-300 font-semibold text-[11px]">Producto</span>
        </div>

        {nodosAfectadosIds.length > 0 && (
          <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block"></span>
            <span className="text-red-400 font-bold text-[11px]">Impacto Activo ({nodosAfectadosIds.length})</span>
            {onLimpiarResaltados && (
              <button
                onClick={onLimpiarResaltados}
                className="ml-1 p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md text-[10px] flex items-center gap-1 transition-colors"
                title="Limpiar Resaltado"
              >
                <EyeOff size={12} /> Limpiar
              </button>
            )}
          </div>
        )}

        {nodosCicloIds.length > 0 && (
          <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse inline-block"></span>
            <span className="text-rose-400 font-bold text-[11px]">Ciclo Circular ({nodosCicloIds.length})</span>
          </div>
        )}
      </div>

      {/* Controles de Vista y Pantalla Completa */}
      <div className="absolute bottom-3 right-3 z-10 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 flex items-center gap-1 shadow-2xl">
        <button
          onClick={handleZoomIn}
          title="Acercar (+)"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors active:scale-95"
        >
          <ZoomIn size={17} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Alejar (-)"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors active:scale-95"
        >
          <ZoomOut size={17} />
        </button>
        <button
          onClick={handleFit}
          title="Centrar y Ajustar"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors active:scale-95"
        >
          <Layers size={17} />
        </button>
        <button
          onClick={handleRelayout}
          title="Reorganizar Grafo (LR)"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors active:scale-95"
        >
          <RefreshCw size={17} />
        </button>
        <div className="w-[1px] h-5 bg-slate-800 mx-0.5" />
        <button
          onClick={() => setEsPantallaCompleta(!esPantallaCompleta)}
          title={esPantallaCompleta ? "Salir de Pantalla Completa" : "Pantalla Completa"}
          className="p-2 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors active:scale-95"
        >
          {esPantallaCompleta ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </div>

      {elementos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20">
          <p className="text-slate-400 font-medium text-sm">El catálogo está vacío. Agrega elementos para visualizar la red.</p>
        </div>
      )}
    </div>
  );
};
