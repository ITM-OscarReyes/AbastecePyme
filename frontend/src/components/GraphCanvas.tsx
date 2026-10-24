import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Elemento, Dependencia } from '../types';
import { obtenerCodigoSku } from '../utils/sku';
import { Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut, Layers, Download, Crosshair } from 'lucide-react';

try {
  cytoscape.use(dagre);
} catch {
  // Plugin ya cargado
}

/**
 * Encuadra los elementos contra la esquina superior izquierda del lienzo, en vez de centrarlos.
 * `fit` deja la red en la mitad del área de vista; al cargar la página debe aparecer en el
 * principio. Si el grafo es más grande que el lienzo, la vista queda anclada en su esquina
 * superior izquierda y el resto se alcanza desplazándose.
 */
const encuadrarAlInicio = (cy: Core, padding: number): void => {
  if (cy.width() <= 0 || cy.height() <= 0 || cy.elements().length === 0) return;

  cy.fit(undefined, padding);

  const caja = cy.elements().boundingBox();
  const zoom = cy.zoom();
  const posX = padding - caja.x1 * zoom;
  const posY = padding - caja.y1 * zoom;

  cy.pan({ x: posX, y: posY });
};

interface GraphCanvasProps {
  elementos: Elemento[];
  dependencias: Dependencia[];
  nodoSeleccionadoId?: string | null;
  nodosAfectadosIds?: string[];
  onSelectNode?: (nodoId: string | null) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  elementos,
  dependencias,
  nodoSeleccionadoId,
  nodosAfectadosIds = [],
  onSelectNode
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
      let borderWidth = 2;
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

      const esSeleccionado = nodoSeleccionadoId === e.id;
      const esAfectado = nodosAfectadosIds.includes(e.id);

      if (esSeleccionado) {
        colorBorde = '#38bdf8';
        borderWidth = 4;
      } else if (esAfectado) {
        colorFondo = '#7f1d1d'; // Rojo oscuro de alerta de impacto
        colorBorde = '#ef4444'; // Borde rojo brillante
        borderWidth = 3;
      }

      return {
        data: {
          id: e.id,
          label: `${esAfectado ? '⚠️ ' : ''}${icono} ${e.nombre}\n[${obtenerCodigoSku(e.id)}] • ${e.tipo}`,
          tipo: e.tipo,
          colorFondo,
          colorBorde,
          borderWidth
        }
      };
    });

    // Modelado de aristas dirigidas de abastecimiento
    const cyEdges = dependencias.map((d, index) => {
      const aristaEnCadenaImpacto =
        (nodoSeleccionadoId === d.origen && nodosAfectadosIds.includes(d.destino)) ||
        (nodosAfectadosIds.includes(d.origen) && nodosAfectadosIds.includes(d.destino));

      return {
        data: {
          id: `e_${d.origen}_${d.destino}_${index}`,
          source: d.origen,
          target: d.destino,
          label: 'habilita',
          lineColor: aristaEnCadenaImpacto ? '#ef4444' : '#475569',
          arrowColor: aristaEnCadenaImpacto ? '#f87171' : '#64748b',
          width: aristaEnCadenaImpacto ? 3.5 : 2.5
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
            'opacity': 'data(opacidad)' as unknown as number,
            'overlay-padding': '4px',
            'transition-property': 'background-color, border-color, border-width, opacity, width, height',
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
            'opacity': 'data(opacidad)' as unknown as number,
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

    // Ajuste inicial contra la esquina superior izquierda del lienzo (Decisión 15)
    cy.ready(() => {
      encuadrarAlInicio(cy, 40);
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [elementos, dependencias, nodoSeleccionadoId, nodosAfectadosIds, onSelectNode]);

  const handleZoomIn = () => cyRef.current?.zoom({ level: cyRef.current.zoom() * 1.25, renderedPosition: { x: containerRef.current!.clientWidth / 2, y: containerRef.current!.clientHeight / 2 } });
  const handleZoomOut = () => cyRef.current?.zoom({ level: cyRef.current.zoom() * 0.8, renderedPosition: { x: containerRef.current!.clientWidth / 2, y: containerRef.current!.clientHeight / 2 } });
  const handleFit = () => {
    if (cyRef.current) encuadrarAlInicio(cyRef.current, 45);
  };
  const handleCentrarSeleccion = () => {
    if (!cyRef.current || !nodoSeleccionadoId) return;
    const nodo = cyRef.current.getElementById(nodoSeleccionadoId);
    if (nodo && nodo.length > 0) {
      cyRef.current.animate({
        center: { eles: nodo },
        zoom: Math.max(cyRef.current.zoom(), 1.25),
        duration: 350
      });
    }
  };

  // Al cambiar pantalla completa, esperar a que el DOM aplique las clases de posicionamiento
  useEffect(() => {
    const timer = setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        if (nodoSeleccionadoId) {
          const nodo = cyRef.current.getElementById(nodoSeleccionadoId);
          if (nodo && nodo.length > 0) {
            cyRef.current.center(nodo);
            return;
          }
        }
        encuadrarAlInicio(cyRef.current, 45);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [esPantallaCompleta, nodoSeleccionadoId]);

  // Cytoscape no reajusta su viewport cuando cambia el tamaño del contenedor. Como el lienzo ahora
  // ocupa el espacio restante del viewport, hay que reajustarlo al redimensionar la ventana; si no,
  // el grafo queda con la medida anterior.
  useEffect(() => {
    const reajustarAlRedimensionar = () => {
      cyRef.current?.resize();
      if (cyRef.current) encuadrarAlInicio(cyRef.current, 45);
    };
    window.addEventListener('resize', reajustarAlRedimensionar);
    return () => window.removeEventListener('resize', reajustarAlRedimensionar);
  }, []);

  useEffect(() => {
    const salirConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setEsPantallaCompleta(false);
      }
    };
    window.addEventListener('keydown', salirConEscape);
    return () => window.removeEventListener('keydown', salirConEscape);
  }, []);

  // Al alternar entre `relative` y `fixed` se desactiva cualquier transición de tamaño
  // para evitar que el motor gráfico mida un contenedor con dimensiones intermedias o erróneas.
  const estiloContenedor: CSSProperties = {
    transition: 'none'
  };

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

  const handleExportarPNG = () => {
    if (!cyRef.current) return;
    const uri = cyRef.current.png({ full: true, scale: 2, bg: '#020617' });
    const a = document.createElement('a');
    a.href = uri;
    a.download = `abastecepyme-red-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

// En pantalla completa el ancho y la altura los fijan los insets: ocupa el viewport menos el
  // margen, sin desbordar. En modo normal el lienzo se estira al alto disponible y puede encogerse
  // (`min-h-0`), en vez de imponer una altura fija que empujaría el borde inferior fuera del viewport.
  const clasePosicion = esPantallaCompleta
    ? 'fixed inset-4 z-50 shadow-2xl border-sky-500/50'
    : 'relative w-full h-full min-h-0';

  return (
    <div
      style={estiloContenedor}
      className={`rounded-2xl overflow-hidden glass-card ${clasePosicion}`}
    >
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
        {nodoSeleccionadoId && (
          <button
            onClick={handleCentrarSeleccion}
            title="Centrar vista en componente seleccionado"
            className="p-2 text-sky-400 hover:text-white hover:bg-sky-500/20 rounded-lg transition-colors active:scale-95"
          >
            <Crosshair size={17} />
          </button>
        )}
        <button
          onClick={handleFit}
          title="Ajustar vista"
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
        <button
          onClick={handleExportarPNG}
          title="Exportar diagrama en imagen (PNG)"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors active:scale-95"
        >
          <Download size={17} />
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
