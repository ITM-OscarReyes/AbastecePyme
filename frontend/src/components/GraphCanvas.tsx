import type { Core, NodeSingular } from 'cytoscape';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { Crosshair, Download, Layers, Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import type { CSSProperties } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import type { Dependencia, Elemento } from '../types';
import { etiquetaTipo } from '../utils/etiquetas';
import { obtenerCodigoSku } from '../utils/sku';

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
  esModoOscuro?: boolean;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  elementos,
  dependencias,
  nodoSeleccionadoId,
  nodosAfectadosIds = [],
  onSelectNode,
  esModoOscuro = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [esPantallaCompleta, setEsPantallaCompleta] = useState<boolean>(false);
  const [filtroProductoId, setFiltroProductoId] = useState<string>('TODOS');

  // Obtener productos disponibles para el filtro interactivo
  const productosDisponibles = elementos.filter((e) => e.tipo === 'PRODUCTO');

  useEffect(() => {
    if (!containerRef.current) return;

    // Calcular qué nodos pertenecen a la línea del producto seleccionado si hay filtro activo
    let nodosLineaFiltro: Set<string> | null = null;
    if (filtroProductoId !== 'TODOS') {
      nodosLineaFiltro = new Set([filtroProductoId]);
      let huboCambios = true;
      while (huboCambios) {
        huboCambios = false;
        for (const dep of dependencias) {
          if (nodosLineaFiltro.has(dep.destino) && !nodosLineaFiltro.has(dep.origen)) {
            nodosLineaFiltro.add(dep.origen);
            huboCambios = true;
          }
        }
      }
    }

    // Clasificación de prioridad de carril (Línea Metal arriba, Ferretería común centro, Línea Madera abajo)
    const obtenerPrioridadFamilia = (id: string): number => {
      // Prioridad 1 (arriba): Línea Acero / Metalmecánica
      if (id.includes('ACERO') || id.includes('METAL') || id.includes('TUBO') || id.includes('MESA')) return 1;
      // Prioridad 2 (centro): Ferretería común transversal
      if (id.includes('FERRETERIA') || id.includes('TORNILLO') || id.includes('TUERCA') || id.includes('ARANDELA')) return 2;
      // Prioridad 3 (abajo): Línea Madera y Carpintería
      if (id.includes('MADERA') || id.includes('TABLERO') || id.includes('LISTON') || id.includes('ACABADO') || id.includes('LIJA') || id.includes('BARNIZ') || id.includes('PIEZA') || id.includes('ESCRITORIO') || id.includes('REPISA') || id.includes('COLA') || id.includes('BISAGRA') || id.includes('CORREDERA') || id.includes('TIRADOR')) return 3;
      return 4;
    };

    // Ordenar elementos respetando familias afines para que Dagre no mezcle las ramas
    const elementosOrdenados = [...elementos].sort((a, b) => {
      const famA = obtenerPrioridadFamilia(a.id);
      const famB = obtenerPrioridadFamilia(b.id);
      if (famA !== famB) return famA - famB;
      return a.id.localeCompare(b.id);
    });

    // Paleta visual empresarial de alto contraste calibrada para Modo Claro y Modo Oscuro
    const cyNodes = elementosOrdenados.map((e) => {
      let colorFondo: string;
      let colorBorde: string;
      let colorTexto: string;
      let borderWidth = 2;
      const icono = e.tipo === 'PROVEEDOR' ? '🏢' : e.tipo === 'INSUMO' ? '📦' : e.tipo === 'PROCESO' ? '⚙️' : '🏆';

      if (esModoOscuro) {
        // MODO OSCURO: Fondos profundos con bordes brillantes y tipografía blanca
        colorFondo = '#1e3a8a'; // Azul cobalto
        colorBorde = '#60a5fa';
        colorTexto = '#ffffff';

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
      } else {
        // MODO CLARO: Fondos suaves tintados, bordes saturados nítidos y texto oscuro legible (WCAG AAA)
        colorFondo = '#eff6ff'; // Azul pastel limpio (blue-50)
        colorBorde = '#2563eb'; // Borde azul cobalto (blue-600)
        colorTexto = '#1e3a8a'; // Azul marino legible (blue-900)

        if (e.tipo === 'INSUMO') {
          colorFondo = '#fffbeb'; // Ámbar pastel (amber-50)
          colorBorde = '#d97706'; // Borde ámbar (amber-600)
          colorTexto = '#78350f'; // Ámbar oscuro legible (amber-900)
        } else if (e.tipo === 'PROCESO') {
          colorFondo = '#faf5ff'; // Púrpura pastel (purple-50)
          colorBorde = '#9333ea'; // Borde púrpura (purple-600)
          colorTexto = '#581c87'; // Púrpura oscuro legible (purple-900)
        } else if (e.tipo === 'PRODUCTO') {
          colorFondo = '#ecfdf5'; // Esmeralda pastel (emerald-50)
          colorBorde = '#059669'; // Borde esmeralda (emerald-600)
          colorTexto = '#064e3b'; // Esmeralda oscuro legible (emerald-900)
        }
      }

      const esSeleccionado = nodoSeleccionadoId === e.id;
      const esAfectado = nodosAfectadosIds.includes(e.id);
      const perteneceAlFiltro = !nodosLineaFiltro || nodosLineaFiltro.has(e.id);
      const opacidad = perteneceAlFiltro ? 1 : (esModoOscuro ? 0.2 : 0.25);

      if (esSeleccionado) {
        colorBorde = esModoOscuro ? '#38bdf8' : '#0284c7';
        borderWidth = 4;
      } else if (esAfectado) {
        colorFondo = esModoOscuro ? '#7f1d1d' : '#fef2f2'; // Rojo suave en claro, rojo oscuro en oscuro
        colorBorde = esModoOscuro ? '#ef4444' : '#dc2626'; // Borde rojo vivo
        colorTexto = esModoOscuro ? '#ffffff' : '#7f1d1d'; // Texto rojo carmesí
        borderWidth = 3;
      } else if (e.alertaStock) {
        colorBorde = esModoOscuro ? '#f97316' : '#ea580c'; // Naranja alerta
        borderWidth = 3;
      }

      const avisoStock = e.alertaStock ? '\n⚠ Stock bajo' : '';

      return {
        data: {
          id: e.id,
          label: `${esAfectado ? '⚠️ ' : ''}${icono} ${e.nombre}\n[${obtenerCodigoSku(e.id)}] • ${etiquetaTipo(e.tipo)}${avisoStock}`,
          tipo: e.tipo,
          colorFondo,
          colorBorde,
          colorTexto,
          borderWidth,
          opacidad
        }
      };
    });

    // Modelado de aristas dirigidas de abastecimiento con pesos calibrados
    const cyEdges = dependencias.map((d, index) => {
      const aristaEnCadenaImpacto =
        (nodoSeleccionadoId === d.origen && nodosAfectadosIds.includes(d.destino)) ||
        (nodosAfectadosIds.includes(d.origen) && nodosAfectadosIds.includes(d.destino));

      const perteneceAlFiltro =
        !nodosLineaFiltro || (nodosLineaFiltro.has(d.origen) && nodosLineaFiltro.has(d.destino));
      const opacidad = perteneceAlFiltro ? 1 : (esModoOscuro ? 0.15 : 0.2);

      // Asignar menor peso a aristas de ferretería común para que no jalen nodos principales al medio
      const esFerreteriaComun = d.origen.includes('FERRETERIA') || d.origen.includes('TORNILLO');
      const pesoArista = esFerreteriaComun ? 1 : 10;

      return {
        data: {
          id: `e_${d.origen}_${d.destino}_${index}`,
          source: d.origen,
          target: d.destino,
          label: 'habilita',
          weight: pesoArista,
          opacidad,
          lineColor: aristaEnCadenaImpacto
            ? '#ef4444'
            : esModoOscuro
            ? '#475569'
            : '#94a3b8',
          arrowColor: aristaEnCadenaImpacto
            ? '#f87171'
            : esModoOscuro
            ? '#64748b'
            : '#64748b',
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
            'color': 'data(colorTexto)',
            'font-size': '11px',
            'font-weight': 700,
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
            'color': esModoOscuro ? '#94a3b8' : '#475569',
            'opacity': 'data(opacidad)' as unknown as number,
            'text-background-color': esModoOscuro ? '#090d16' : '#ffffff',
            'text-background-opacity': esModoOscuro ? 0.9 : 0.95,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'text-border-color': esModoOscuro ? '#1e293b' : '#cbd5e1',
            'text-border-width': 1,
            'text-border-opacity': 0.8,
            'text-rotation': 'autorotate',
            'text-margin-y': -8
          }
        },
        {
          selector: ':selected',
          style: {
            'border-color': esModoOscuro ? '#38bdf8' : '#0284c7',
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
  }, [elementos, dependencias, nodoSeleccionadoId, nodosAfectadosIds, onSelectNode, esModoOscuro, filtroProductoId]);

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
    const uri = cyRef.current.png({ full: true, scale: 2, bg: esModoOscuro ? '#020617' : '#ffffff' });
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

      {/* Leyenda y Selector de Línea de Producto */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
        <div className="bg-white/95 dark:bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex flex-wrap items-center gap-3 shadow-md dark:shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-blue-100 dark:bg-blue-600 border border-blue-600 dark:border-blue-400 inline-block shadow-sm"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">Proveedor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-100 dark:bg-amber-600 border border-amber-600 dark:border-amber-400 inline-block shadow-sm"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">Suministro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-purple-100 dark:bg-purple-600 border border-purple-600 dark:border-purple-400 inline-block shadow-sm"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">Proceso</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-100 dark:bg-emerald-600 border border-emerald-600 dark:border-emerald-400 inline-block shadow-sm"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">Producto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-white dark:bg-slate-800 border-2 border-orange-500 inline-block shadow-sm"></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">Stock bajo</span>
          </div>
        </div>

        {productosDisponibles.length > 0 && (
          <div className="bg-white/95 dark:bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center gap-2 shadow-md dark:shadow-xl">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">Ver línea:</span>
            <select
              value={filtroProductoId}
              onChange={(e) => setFiltroProductoId(e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="TODOS">Todos los productos</option>
              {productosDisponibles.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de Vista y Pantalla Completa */}
      <div className="absolute bottom-3 right-3 z-10 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1 shadow-md dark:shadow-2xl">
        <button
          onClick={handleZoomIn}
          title="Acercar (+)"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80 rounded-lg transition-colors active:scale-95 cursor-pointer"
        >
          <ZoomIn size={17} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Alejar (-)"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80 rounded-lg transition-colors active:scale-95 cursor-pointer"
        >
          <ZoomOut size={17} />
        </button>
        {nodoSeleccionadoId && (
          <button
            onClick={handleCentrarSeleccion}
            title="Centrar vista en componente seleccionado"
            className="p-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:text-white dark:hover:bg-sky-500/20 rounded-lg transition-colors active:scale-95 cursor-pointer"
          >
            <Crosshair size={17} />
          </button>
        )}
        <button
          onClick={handleFit}
          title="Ajustar vista"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80 rounded-lg transition-colors active:scale-95 cursor-pointer"
        >
          <Layers size={17} />
        </button>
        <button
          onClick={handleRelayout}
          title="Reorganizar Grafo (LR)"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80 rounded-lg transition-colors active:scale-95 cursor-pointer"
        >
          <RefreshCw size={17} />
        </button>
        <button
          onClick={handleExportarPNG}
          title="Exportar diagrama en imagen (PNG)"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80 rounded-lg transition-colors active:scale-95 cursor-pointer"
        >
          <Download size={17} />
        </button>
        <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />
        <button
          onClick={() => setEsPantallaCompleta(!esPantallaCompleta)}
          title={esPantallaCompleta ? "Salir de Pantalla Completa" : "Pantalla Completa"}
          className="p-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:text-sky-300 dark:hover:bg-sky-500/10 rounded-lg transition-colors active:scale-95 cursor-pointer"
        >
          {esPantallaCompleta ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </div>

      {elementos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-20">
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">El catálogo está vacío. Agrega elementos para visualizar la red.</p>
        </div>
      )}
    </div>
  );
};
