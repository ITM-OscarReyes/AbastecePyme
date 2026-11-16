import type { Core, NodeSingular } from 'cytoscape';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import {
  ChevronDown,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Workflow,
  X,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Layers
} from 'lucide-react';
import type { CSSProperties } from 'react';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Dependencia, Elemento } from '../types';
import { obtenerCodigoSku } from '../utils/sku';

try {
  cytoscape.use(dagre);
} catch {
  // Plugin ya cargado
}

const encuadrarAlInicio = (cy: Core, padding: number): void => {
  if (cy.width() <= 0 || cy.height() <= 0 || cy.elements().length === 0) return;
  cy.fit(undefined, padding);
  const caja = cy.elements().boundingBox();
  const zoom = cy.zoom();
  const posX = padding - caja.x1 * zoom;
  const posY = padding - caja.y1 * zoom;
  cy.pan({ x: posX, y: posY });
};

// Generador de iconos SVG vectoriales nítidos para el interior de los hubs circulares
const generarIconoSvg = (tipo: string, color: string, esGrupo?: boolean): string => {
  let iconPath = '';
  if (esGrupo) {
    // Suministros agrupados / multi-capa
    iconPath = `<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  } else if (tipo === 'PROVEEDOR') {
    // Fábrica / Sede de Proveedor
    iconPath = `<path d="M3 21h18M5 21V7l8-4v18M13 11l6-3v13M9 9h1M9 13h1M9 17h1M17 13h1M17 17h1" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  } else if (tipo === 'INSUMO') {
    // Cubo / Paquete de Suministro
    iconPath = `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="3.29 7 12 12 20.71 7" stroke="${color}" stroke-width="2.2" fill="none"/><line x1="12" y1="22" x2="12" y2="12" stroke="${color}" stroke-width="2.2"/>`;
  } else if (tipo === 'PROCESO') {
    // Engranaje / Línea de Procesamiento
    iconPath = `<circle cx="12" cy="12" r="3" stroke="${color}" stroke-width="2.2" fill="none"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="${color}" stroke-width="2.2" fill="none"/>`;
  } else {
    // Trofeo / Producto Terminado
    iconPath = `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34M7.8 4h8.4C17.2 4 18 4.8 18 5.8v4.4c0 3.2-2.6 5.8-5.8 5.8h-.4C8.6 16 6 13.4 6 10.2V5.8C6 4.8 6.8 4 7.8 4z" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">${iconPath}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Generador de estilos y paleta de colorimetría quirúrgica adaptativa para los hubs circulares
const obtenerEstiloNodoSegunTema = (tipo: string, alertaStock: boolean, esOscuro: boolean, esGrupo?: boolean) => {
  let colorFondo = esOscuro ? '#061325' : '#F0F9FF';
  let colorBorde = esOscuro ? '#38BDF8' : '#0284C7';
  let haloColor = esOscuro ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 132, 199, 0.16)';
  let iconColor = esOscuro ? '#38BDF8' : '#0284C7';
  let borderWidth = 2.5;
  const nodeSize = esGrupo ? 66 : 60;

  if (tipo === 'PROVEEDOR') {
    colorFondo = esOscuro ? '#032015' : '#ECFDF5';
    colorBorde = esOscuro ? '#10B981' : '#059669';
    haloColor = esOscuro ? 'rgba(16, 185, 129, 0.4)' : 'rgba(5, 150, 105, 0.2)';
    iconColor = esOscuro ? '#10B981' : '#047857';
  } else if (tipo === 'INSUMO') {
    if (alertaStock) {
      colorFondo = esOscuro ? '#2E060D' : '#FEF2F2';
      colorBorde = esOscuro ? '#F43F5E' : '#DC2626';
      haloColor = esOscuro ? 'rgba(244, 63, 94, 0.6)' : 'rgba(220, 38, 38, 0.28)';
      iconColor = esOscuro ? '#F43F5E' : '#B91C1C';
      borderWidth = 3;
    } else {
      colorFondo = esOscuro ? (esGrupo ? '#0A2540' : '#071A2E') : (esGrupo ? '#E0F2FE' : '#F0F9FF');
      colorBorde = esOscuro ? (esGrupo ? '#38BDF8' : '#0284C7') : (esGrupo ? '#0284C7' : '#0284C7');
      haloColor = esOscuro ? 'rgba(2, 132, 199, 0.45)' : 'rgba(2, 132, 199, 0.22)';
      iconColor = esOscuro ? '#38BDF8' : '#0284C7';
      if (esGrupo) borderWidth = 3.5;
    }
  } else if (tipo === 'PROCESO') {
    colorFondo = esOscuro ? '#170E2B' : '#FAF5FF';
    colorBorde = esOscuro ? '#A855F7' : '#9333EA';
    haloColor = esOscuro ? 'rgba(168, 85, 247, 0.4)' : 'rgba(147, 51, 234, 0.2)';
    iconColor = esOscuro ? '#C084FC' : '#7E22CE';
  } else if (tipo === 'PRODUCTO') {
    colorFondo = esOscuro ? '#281702' : '#FFFBEB';
    colorBorde = esOscuro ? '#F59E0B' : '#D97706';
    haloColor = esOscuro ? 'rgba(245, 158, 11, 0.5)' : 'rgba(217, 119, 6, 0.25)';
    iconColor = esOscuro ? '#FBBF24' : '#B45309';
    borderWidth = 3;
  }

  return { colorFondo, colorBorde, haloColor, iconColor, borderWidth, nodeSize };
};

interface GraphCanvasProps {
  elementos: Elemento[];
  dependencias: Dependencia[];
  nodoSeleccionadoId?: string | null;
  nodosAfectadosIds?: string[];
  onSelectNode?: (nodoId: string | null) => void;
  esModoOscuro?: boolean;
  filtroProductoId?: string;
  onCambiarFiltroProducto?: (productoId: string) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  elementos,
  dependencias,
  nodoSeleccionadoId = null,
  nodosAfectadosIds = [],
  onSelectNode,
  esModoOscuro = true,
  filtroProductoId = 'TODOS',
  onCambiarFiltroProducto
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menuLineaAbierto, setMenuLineaAbierto] = useState<boolean>(false);
  const [busquedaLinea, setBusquedaLinea] = useState<string>('');
  const [layoutNombre, setLayoutNombre] = useState<'dagre' | 'concentric'>('dagre');
  const [vistaSuministros, setVistaSuministros] = useState<'compacta' | 'detallada'>('compacta');

  // Callback estable para selección de nodo
  const onSelectNodeRef = useRef(onSelectNode);
  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
  }, [onSelectNode]);

  // Productos disponibles
  const productos = useMemo(() => {
    return elementos.filter((e) => e.tipo === 'PRODUCTO');
  }, [elementos]);

  const productoActivo = useMemo(() => {
    if (!filtroProductoId || filtroProductoId === 'TODOS') return null;
    return productos.find((p) => p.id === filtroProductoId) || null;
  }, [filtroProductoId, productos]);

  // Cálculo de cadena de dependencias del producto seleccionado
  const nodosLineaFiltro = useMemo(() => {
    if (!filtroProductoId || filtroProductoId === 'TODOS') return null;
    const alcanzables = new Set<string>();
    const cola = [filtroProductoId];
    alcanzables.add(filtroProductoId);

    const adjInversa = new Map<string, string[]>();
    dependencias.forEach((d) => {
      if (!adjInversa.has(d.destino)) adjInversa.set(d.destino, []);
      adjInversa.get(d.destino)!.push(d.origen);
    });

    while (cola.length > 0) {
      const actual = cola.shift()!;
      const predecesores = adjInversa.get(actual) || [];
      for (const pred of predecesores) {
        if (!alcanzables.has(pred)) {
          alcanzables.add(pred);
          cola.push(pred);
        }
      }
    }
    return alcanzables;
  }, [filtroProductoId, dependencias]);

  // 1. INICIALIZACIÓN ÚNICA DEL LIENZO: ESTÁTICA Y PRECISA (Zero Jitter, Zero Infinite Loops)
  useEffect(() => {
    if (!containerRef.current) return;
    if (elementos.length === 0) return;

    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    // Generación de nodos y conexiones según modo de visualización (Compacta vs Detallada)
    let cyNodes: any[] = [];
    let cyEdges: any[] = [];

    if (vistaSuministros === 'detallada') {
      cyNodes = elementos.map((e) => {
        const { colorFondo, colorBorde, haloColor, iconColor, borderWidth, nodeSize } =
          obtenerEstiloNodoSegunTema(e.tipo, Boolean(e.alertaStock), esModoOscuro, false);

        const sku = obtenerCodigoSku(e.id) || e.id;
        const estadoTag = e.alertaStock ? '⚠️ BAJO' : '';

        return {
          data: {
            id: e.id,
            label: `${e.nombre}\n[${sku}] ${estadoTag}`,
            tipo: e.tipo,
            alertaStock: Boolean(e.alertaStock),
            colorFondo,
            colorBorde,
            haloColor,
            borderWidth,
            nodeSize,
            iconSvg: generarIconoSvg(e.tipo, iconColor, false),
            esGrupo: false
          }
        };
      });

      cyEdges = dependencias.map((d, index) => ({
        data: {
          id: `e-${index}-${d.origen}-${d.destino}`,
          source: d.origen,
          target: d.destino,
          lineColor: '#0284C7',
          arrowColor: '#38BDF8',
          width: 2.2
        }
      }));
    } else {
      // VISTA COMPACTA: Agrupación visual de suministros por proveedor y planta
      const noInsumos = elementos.filter((e) => e.tipo !== 'INSUMO');
      const insumos = elementos.filter((e) => e.tipo === 'INSUMO');

      const mapaInsumoAGrupo = new Map<string, string>();
      const gruposMap = new Map<
        string,
        { key: string; titulo: string; insumos: Elemento[]; alertaStock: boolean }
      >();

      insumos.forEach((ins) => {
        const padres = dependencias
          .filter((d) => d.destino === ins.id)
          .map((d) => elementos.find((e) => e.id === d.origen))
          .filter(Boolean) as Elemento[];

        const provPadres = padres.filter((p) => p.tipo === 'PROVEEDOR');
        const procPadres = padres.filter((p) => p.tipo === 'PROCESO');

        let claveGrupo = 'GRP_BASE';
        let rotuloGrupo = 'Suministros generales';

        if (procPadres.length > 0) {
          claveGrupo = 'GRP_PLANTA';
          rotuloGrupo = 'Producidos en planta';
        } else if (provPadres.length === 1) {
          const prov = provPadres[0];
          claveGrupo = `GRP_PROV_${prov.id}`;
          const rotuloProv =
            prov.nombre.replace(/^Proveedor\s*(de)?\s*/i, '').trim() || prov.id;
          rotuloGrupo = `Suministros [${rotuloProv}]`;
        } else if (provPadres.length > 1) {
          claveGrupo = 'GRP_MULTI_PROV';
          rotuloGrupo = 'Varios proveedores';
        }

        mapaInsumoAGrupo.set(ins.id, claveGrupo);

        if (!gruposMap.has(claveGrupo)) {
          gruposMap.set(claveGrupo, {
            key: claveGrupo,
            titulo: rotuloGrupo,
            insumos: [],
            alertaStock: false
          });
        }
        const g = gruposMap.get(claveGrupo)!;
        g.insumos.push(ins);
        if (ins.alertaStock) g.alertaStock = true;
      });

      const nodosNoInsumos = noInsumos.map((e) => {
        const { colorFondo, colorBorde, haloColor, iconColor, borderWidth, nodeSize } =
          obtenerEstiloNodoSegunTema(e.tipo, Boolean(e.alertaStock), esModoOscuro, false);

        const sku = obtenerCodigoSku(e.id) || e.id;
        const estadoTag = e.alertaStock ? '⚠️ BAJO' : '';

        return {
          data: {
            id: e.id,
            label: `${e.nombre}\n[${sku}] ${estadoTag}`,
            tipo: e.tipo,
            alertaStock: Boolean(e.alertaStock),
            colorFondo,
            colorBorde,
            haloColor,
            borderWidth,
            nodeSize,
            iconSvg: generarIconoSvg(e.tipo, iconColor, false),
            esGrupo: false
          }
        };
      });

      const nodosGrupos = Array.from(gruposMap.values()).map((g) => {
        const { colorFondo, colorBorde, haloColor, iconColor, borderWidth, nodeSize } =
          obtenerEstiloNodoSegunTema('INSUMO', g.alertaStock, esModoOscuro, true);
        const alertaTag = g.alertaStock ? '⚠️ ALERTA' : '';

        return {
          data: {
            id: g.key,
            label: `${g.titulo}\n[${g.insumos.length} suministros] ${alertaTag}`,
            tipo: 'INSUMO',
            alertaStock: g.alertaStock,
            colorFondo,
            colorBorde,
            haloColor,
            borderWidth,
            nodeSize,
            iconSvg: generarIconoSvg('INSUMO', iconColor, true),
            esGrupo: true,
            subIds: g.insumos.map((i) => i.id)
          }
        };
      });

      cyNodes = [...nodosNoInsumos, ...nodosGrupos];

      // Aristas compactas únicas
      const aristasVistas = new Set<string>();
      dependencias.forEach((d, idx) => {
        const fuente = mapaInsumoAGrupo.get(d.origen) || d.origen;
        const sumidero = mapaInsumoAGrupo.get(d.destino) || d.destino;
        if (fuente === sumidero) return;
        const clave = `${fuente}-->${sumidero}`;
        if (!aristasVistas.has(clave)) {
          aristasVistas.add(clave);
          cyEdges.push({
            data: {
              id: `ec-${idx}-${fuente}-${sumidero}`,
              source: fuente,
              target: sumidero,
              lineColor: '#0284C7',
              arrowColor: '#38BDF8',
              width: 2.2
            }
          });
        }
      });
    }

    try {
      const cy = cytoscape({
        container: containerRef.current,
        elements: [...cyNodes, ...cyEdges],
        boxSelectionEnabled: false,
        autounselectify: false,
        minZoom: 0.3,
        maxZoom: 2.8,
        style: [
          {
            selector: 'node',
            style: {
              'shape': 'ellipse',
              'width': 'data(nodeSize)',
              'height': 'data(nodeSize)',
              'background-color': 'data(colorFondo)',
              'border-color': 'data(colorBorde)',
              'border-width': 'data(borderWidth)',
              'border-opacity': 0.95,
              'underlay-shape': 'ellipse',
              'underlay-color': 'data(haloColor)',
              'underlay-padding': '9px',
              'underlay-opacity': 0.65,
              'background-image': 'data(iconSvg)',
              'background-width': '28px',
              'background-height': '28px',
              'background-fit': 'none',
              'background-position-x': '50%',
              'background-position-y': '50%',
              'label': 'data(label)',
              'color': esModoOscuro ? '#F1F5F9' : '#0F172A',
              'font-size': '10px',
              'font-family': 'JetBrains Mono, monospace, sans-serif',
              'font-weight': 700,
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 7,
              'text-wrap': 'wrap',
              'text-max-width': '135px',
              'text-background-color': esModoOscuro ? '#060A12' : '#FFFFFF',
              'text-background-opacity': esModoOscuro ? 0.85 : 0.95,
              'text-background-padding': '4px',
              'text-background-shape': 'roundrectangle',
              'text-border-color': esModoOscuro ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
              'text-border-width': 1,
              'text-border-opacity': 0.85
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
              'arrow-scale': 1.25,
              'opacity': 0.85
            }
          },
          {
            selector: ':selected',
            style: {
              'border-color': '#38BDF8',
              'border-width': 4.5,
              'underlay-padding': '11px',
              'underlay-color': 'rgba(56, 189, 248, 0.95)',
              'underlay-opacity': 0.85
            }
          }
        ],
        // LAYOUT SINCRÓNICO: Ubica los nodos instantáneamente sin animaciones infinitas
        layout: {
          name: 'dagre',
          rankDir: 'LR',
          nodeSep: 60,
          rankSep: 130,
          padding: 50,
          animate: false
        } as any
      });

      cy.on('tap', 'node', (evt) => {
        const node: NodeSingular = evt.target;
        const subIds = node.data('subIds') as string[] | undefined;
        if (subIds && subIds.length > 0) {
          const insumoAlerta = subIds.find((id) => {
            const el = elementos.find((e) => e.id === id);
            return el?.alertaStock;
          });
          onSelectNodeRef.current?.(insumoAlerta || subIds[0]);
        } else {
          onSelectNodeRef.current?.(node.id());
        }
      });

      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          onSelectNodeRef.current?.(null);
        }
      });

      // Encuadre inicial exacto en reposo
      encuadrarAlInicio(cy, 50);
      cyRef.current = cy;
    } catch (err) {
      console.error('Error inicializando Cytoscape:', err);
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [elementos, dependencias, vistaSuministros]);

  // 2. ACTUALIZACIÓN LIGERA DE ESTILOS Y FILTRADO (Sin destruir el lienzo ni mover nodos)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      // Nodos
      cy.nodes().forEach((node) => {
        const id = node.id();
        const subIds = node.data('subIds') as string[] | undefined;
        const esGrupo = Boolean(node.data('esGrupo'));

        const pertenece = esGrupo
          ? !nodosLineaFiltro || (subIds ? subIds.some((sId) => nodosLineaFiltro.has(sId)) : true)
          : !nodosLineaFiltro || nodosLineaFiltro.has(id);

        const esSeleccionado = esGrupo
          ? Boolean(subIds && nodoSeleccionadoId && subIds.includes(nodoSeleccionadoId)) ||
            nodoSeleccionadoId === id
          : nodoSeleccionadoId === id;

        const esAfectado = esGrupo
          ? Boolean(subIds && subIds.some((sId) => nodosAfectadosIds.includes(sId))) ||
            nodosAfectadosIds.includes(id)
          : nodosAfectadosIds.includes(id);

        const tipo = (node.data('tipo') as string) || '';
        const alertaStock = Boolean(node.data('alertaStock'));
        const estilo = obtenerEstiloNodoSegunTema(tipo, alertaStock, esModoOscuro, esGrupo);

        node.style({
          'opacity': pertenece ? 1 : 0.15,
          'background-color': estilo.colorFondo,
          'background-image': generarIconoSvg(tipo, estilo.iconColor, esGrupo),
          'border-width': esSeleccionado ? 4.5 : esAfectado ? 3.5 : estilo.borderWidth,
          'border-color': esSeleccionado ? '#38BDF8' : esAfectado ? '#EF4444' : estilo.colorBorde,
          'underlay-opacity': esSeleccionado
            ? 0.95
            : esAfectado
            ? 0.8
            : pertenece
            ? esModoOscuro
              ? 0.65
              : 0.4
            : 0.08,
          'underlay-color': esSeleccionado ? '#38BDF8' : esAfectado ? '#EF4444' : estilo.haloColor,
          'color': esModoOscuro ? '#F1F5F9' : '#0F172A',
          'text-background-color': esModoOscuro ? '#060A12' : '#FFFFFF',
          'text-background-opacity': esModoOscuro ? 0.85 : 0.95,
          'text-border-color': esModoOscuro ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
          'text-border-width': 1,
          'text-border-opacity': 0.85
        });
      });

      // Aristas
      cy.edges().forEach((edge) => {
        const sourceNode = edge.source();
        const targetNode = edge.target();
        const sourceId = sourceNode.id();
        const targetId = targetNode.id();
        const sourceSubIds = sourceNode.data('subIds') as string[] | undefined;
        const targetSubIds = targetNode.data('subIds') as string[] | undefined;

        const sourcePertenece = sourceSubIds
          ? !nodosLineaFiltro || sourceSubIds.some((sId) => nodosLineaFiltro.has(sId))
          : !nodosLineaFiltro || nodosLineaFiltro.has(sourceId);

        const targetPertenece = targetSubIds
          ? !nodosLineaFiltro || targetSubIds.some((sId) => nodosLineaFiltro.has(sId))
          : !nodosLineaFiltro || nodosLineaFiltro.has(targetId);

        const pertenece = sourcePertenece && targetPertenece;

        const sourceEnCadena =
          sourceId === nodoSeleccionadoId ||
          nodosAfectadosIds.includes(sourceId) ||
          Boolean(sourceSubIds && sourceSubIds.some((sId) => sId === nodoSeleccionadoId || nodosAfectadosIds.includes(sId)));

        const targetEnCadena =
          nodosAfectadosIds.includes(targetId) ||
          Boolean(targetSubIds && targetSubIds.some((sId) => nodosAfectadosIds.includes(sId)));

        const esEnCadena = sourceEnCadena && targetEnCadena;

        edge.style({
          'opacity': pertenece ? (esEnCadena ? 1 : esModoOscuro ? 0.85 : 0.75) : 0.08,
          'width': esEnCadena ? 3.5 : pertenece ? 2 : 1,
          'line-color': esEnCadena
            ? '#EF4444'
            : pertenece
            ? '#0284C7'
            : esModoOscuro
            ? '#334155'
            : '#CBD5E1',
          'target-arrow-color': esEnCadena
            ? '#F87171'
            : pertenece
            ? esModoOscuro
              ? '#38BDF8'
              : '#0284C7'
            : esModoOscuro
            ? '#475569'
            : '#CBD5E1'
        });
      });
    });
  }, [nodoSeleccionadoId, nodosAfectadosIds, nodosLineaFiltro, esModoOscuro]);

  // 3. CAMBIO DE DISPOSICIÓN CONTROLADO (Sólo cuando el usuario presiona el botón)
  const alternarLayout = () => {
    const cy = cyRef.current;
    if (!cy) return;
    const nuevoLayout = layoutNombre === 'dagre' ? 'concentric' : 'dagre';
    setLayoutNombre(nuevoLayout);

    if (nuevoLayout === 'concentric') {
      cy.layout({
        name: 'concentric',
        concentric: (node: any) => {
          const tipo = node.data('tipo');
          if (tipo === 'PRODUCTO') return 4;
          if (tipo === 'PROCESO') return 3;
          if (tipo === 'INSUMO') return 2;
          return 1;
        },
        levelWidth: () => 1,
        padding: 50,
        animate: true,
        animationDuration: 400
      } as any).run();
    } else {
      cy.layout({
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 60,
        rankSep: 130,
        padding: 50,
        animate: true,
        animationDuration: 400
      } as any).run();
    }
  };

  const handleZoomIn = () => {
    if (cyRef.current) cyRef.current.zoom(cyRef.current.zoom() * 1.25);
  };

  const handleZoomOut = () => {
    if (cyRef.current) cyRef.current.zoom(cyRef.current.zoom() * 0.8);
  };

  const handleResetZoom = () => {
    if (cyRef.current) encuadrarAlInicio(cyRef.current, 50);
  };

  const handleExportarPNG = () => {
    if (!cyRef.current) return;
    const uri = cyRef.current.png({ full: true, scale: 2, bg: '#030712' });
    const a = document.createElement('a');
    a.href = uri;
    a.download = `abastecepyme-red-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const productosFiltrados = useMemo(() => {
    if (!busquedaLinea.trim()) return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(busquedaLinea.toLowerCase().trim()));
  }, [productos, busquedaLinea]);

  const clasePosicion = isFullscreen
    ? 'fixed inset-3 z-50 shadow-2xl border-sky-500/50'
    : 'relative w-full h-full min-h-0';

  const estiloContenedor: CSSProperties = {
    transition: 'none'
  };

  return (
    <div style={estiloContenedor} className={`overflow-hidden ${clasePosicion}`}>
      {/* Contenedor del Lienzo Cytoscape con Fondo Blueprint Táctico */}
      <div ref={containerRef} className="w-full h-full absolute inset-0 graph-canvas-bg" />

      {/* BARRA SUPERIOR TÁCTICA: SELECTOR DE LÍNEA DE PRODUCTO (Sin solapamientos) */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <div className="bg-white/95 dark:bg-[#080D18]/90 border border-slate-200 dark:border-white/[0.1] rounded-lg p-1 flex items-center gap-2 shadow-lg dark:shadow-2xl backdrop-blur-md transition-colors">
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Workflow size={13} className="text-sky-600 dark:text-sky-400" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Línea:</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuLineaAbierto((prev) => !prev)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0C1424] dark:hover:bg-[#111C33] border border-slate-300 dark:border-white/[0.1] text-slate-800 dark:text-white text-xs font-semibold rounded px-2.5 py-1 transition-all cursor-pointer max-w-[220px]"
            >
              <span className="truncate">
                {productoActivo ? productoActivo.nombre : 'Todas las líneas'}
              </span>
              <ChevronDown
                size={12}
                className={`text-slate-500 dark:text-slate-400 transition-transform ${menuLineaAbierto ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Menú Desplegable de Selección de Línea (Calibrado para Modo Claro y Oscuro) */}
            {menuLineaAbierto && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-[#0A101D] border border-slate-200 dark:border-white/[0.15] rounded-lg shadow-2xl z-30 overflow-hidden text-xs transition-colors">
                <div className="p-2 border-b border-slate-100 dark:border-white/[0.08]">
                  <div className="relative flex items-center">
                    <Search size={12} className="absolute left-2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar producto final..."
                      value={busquedaLinea}
                      onChange={(e) => setBusquedaLinea(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#050811] border border-slate-200 dark:border-white/[0.1] rounded pl-6 pr-2 py-1 text-[11px] text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onCambiarFiltroProducto?.('TODOS');
                      setMenuLineaAbierto(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors flex items-center justify-between cursor-pointer ${
                      filtroProductoId === 'TODOS'
                        ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <span>Todas las líneas (Red completa)</span>
                    <span className="text-[10px] text-slate-500 font-mono">27 nodos</span>
                  </button>

                  {productosFiltrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onCambiarFiltroProducto?.(p.id);
                        setMenuLineaAbierto(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        filtroProductoId === p.id
                          ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="truncate min-w-0 flex-1">{p.nombre}</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold shrink-0 whitespace-nowrap">
                        {obtenerCodigoSku(p.id)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botón para reiniciar filtro si hay uno activo */}
          {filtroProductoId !== 'TODOS' && (
            <button
              type="button"
              onClick={() => onCambiarFiltroProducto?.('TODOS')}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Restablecer a todas las líneas"
            >
              <X size={13} />
            </button>
          )}

          {/* Alternar Modo de Suministros: Compacta vs Detallada */}
          <div className="h-4 w-px bg-slate-300 dark:bg-white/[0.1] mx-0.5"></div>
          <div className="flex items-center bg-slate-100 dark:bg-white/[0.04] p-0.5 rounded border border-slate-300 dark:border-white/[0.08] text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setVistaSuministros('compacta')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                vistaSuministros === 'compacta'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Vista Compacta: agrupa visualmente los suministros por proveedor y planta (Recomendada)"
            >
              <Layers size={11} />
              <span>Compacta</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaSuministros('detallada')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                vistaSuministros === 'detallada'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Vista Detallada: muestra todos los suministros individuales con sus SKUs"
            >
              <Search size={11} />
              <span>Detallada</span>
            </button>
          </div>

          {/* Alternar Disposición: Dagre vs Concéntrico */}
          <div className="h-4 w-px bg-slate-300 dark:bg-white/[0.1] mx-0.5"></div>
          <button
            type="button"
            onClick={alternarLayout}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              layoutNombre === 'concentric'
                ? 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:text-white border border-slate-300 dark:border-white/[0.06]'
            }`}
            title="Alternar vista jerárquica / concéntrica radial"
          >
            {layoutNombre === 'concentric' ? <Sparkles size={11} /> : <Layers size={11} />}
            <span>{layoutNombre === 'concentric' ? 'Radial' : 'Jerárquico'}</span>
          </button>
        </div>
      </div>

      {/* DOCK FLOTANTE INFERIOR IZQUIERDO: CONTROLES DE ZOOM Y CÁMARA */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-col items-center gap-1 bg-white/95 dark:bg-[#080D18]/90 border border-slate-300 dark:border-white/[0.1] p-1 rounded-lg shadow-lg dark:shadow-2xl backdrop-blur-md transition-colors">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.08] rounded transition-colors cursor-pointer"
          title="Acercar (+)"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.08] rounded transition-colors cursor-pointer"
          title="Alejar (-)"
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.08] rounded transition-colors cursor-pointer"
          title="Centrar y encuadrar"
        >
          <RefreshCw size={14} />
        </button>
        <button
          type="button"
          onClick={handleExportarPNG}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.08] rounded transition-colors cursor-pointer"
          title="Exportar imagen PNG de alta resolución"
        >
          <Download size={14} />
        </button>
        <div className="w-full h-px bg-slate-200 dark:bg-white/[0.1] my-0.5"></div>
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.08] rounded transition-colors cursor-pointer"
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* LEYENDA TÁCTICA INFERIOR DERECHA */}
      <div className="absolute bottom-3 right-3 z-20 hidden md:flex items-center gap-3 bg-white/95 dark:bg-[#080D18]/90 border border-slate-300 dark:border-white/[0.1] px-3 py-1.5 rounded-lg shadow-lg dark:shadow-2xl backdrop-blur-md text-[10px] transition-colors">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-none dark:shadow-[0_0_8px_#10B981]"></span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Proveedor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] dark:bg-[#38BDF8] shadow-none dark:shadow-[0_0_8px_#38BDF8]"></span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Suministro</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] dark:bg-[#38BDF8] ring-2 ring-sky-400/50 shadow-none dark:shadow-[0_0_8px_#38BDF8]"></span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Grupo Suministros</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA] dark:bg-[#A855F7] shadow-none dark:shadow-[0_0_8px_#A855F7]"></span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Proceso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] dark:bg-[#F59E0B] shadow-none dark:shadow-[0_0_8px_#F59E0B]"></span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Producto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] dark:bg-[#F43F5E] shadow-none dark:shadow-[0_0_8px_#F43F5E] animate-pulse"></span>
          <span className="text-rose-700 dark:text-rose-300 font-bold">Stock bajo</span>
        </div>
      </div>
    </div>
  );
};
