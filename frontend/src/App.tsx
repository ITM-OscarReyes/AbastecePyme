import React, { useState, useEffect, useCallback } from 'react';
import type {
  CrearDependenciaDto,
  CrearElementoDto,
  RespuestaGrafo
} from './types';
import { apiService, extraerMensajeError } from './services/api';
import { HeaderNavbar } from './components/HeaderNavbar';
import type { TabActiva } from './components/HeaderNavbar';
import { GraphCanvas } from './components/GraphCanvas';
import { CatalogTable } from './components/CatalogTable';
import { VistaImpacto } from './components/VistaImpacto';
import { ModalCrearElemento } from './components/ModalCrearElemento';
import { ModalCrearDependencia } from './components/ModalCrearDependencia';
import { ModalAyudaOperativa } from './components/ModalAyudaOperativa';
import {
  Box,
  GitCommitHorizontal,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles,
  AlertOctagon
} from 'lucide-react';
import { obtenerCodigoSku } from './utils/sku';

export const App: React.FC = () => {
  const [grafo, setGrafo] = useState<RespuestaGrafo>({
    elementos: [],
    dependencias: [],
    resumen: { totalElementos: 0, totalDependencias: 0 }
  });
  const [apiConectada, setApiConectada] = useState<boolean>(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const [tabActiva, setTabActiva] = useState<TabActiva>('red');
  const [nodoSeleccionadoId, setNodoSeleccionadoId] = useState<string | null>(null);
  const [nodosAfectadosIds, setNodosAfectadosIds] = useState<string[]>([]);
  const [cargandoImpactoNodo, setCargandoImpactoNodo] = useState<boolean>(false);
  const [impactoNodoSeleccionado, setImpactoNodoSeleccionado] = useState<import('./types').ImpactoRespuesta | null>(null);

  const [modalElementoAbierto, setModalElementoAbierto] = useState<boolean>(false);
  const [modalDependenciaAbierto, setModalDependenciaAbierto] = useState<boolean>(false);
  const [modalAyudaAbierto, setModalAyudaAbierto] = useState<boolean>(false);

  // Cargar datos del Grafo desde el backend FastAPI
  const cargarGrafo = useCallback(async () => {
    try {
      setErrorGlobal(null);
      const data = await apiService.obtenerGrafo();
      setGrafo(data);
      setApiConectada(true);
    } catch (err) {
      setApiConectada(false);
      setErrorGlobal(extraerMensajeError(err));
    }
  }, []);

  useEffect(() => {
    cargarGrafo();
  }, [cargarGrafo]);

  // Manejar creación de elementos
  const handleCrearElemento = async (dto: CrearElementoDto) => {
    try {
      await apiService.crearElemento(dto);
      await cargarGrafo();
    } catch (err) {
      throw new Error(extraerMensajeError(err));
    }
  };

  // Manejar creación de dependencias
  const handleCrearDependencia = async (dto: CrearDependenciaDto) => {
    try {
      await apiService.crearDependencia(dto);
      await cargarGrafo();
    } catch (err) {
      throw new Error(extraerMensajeError(err));
    }
  };

  const handleSelectNode = async (nodoId: string | null) => {
    setNodoSeleccionadoId(nodoId);
    setImpactoNodoSeleccionado(null);
    if (!nodoId) {
      setNodosAfectadosIds([]);
      return;
    }

    try {
      setCargandoImpactoNodo(true);
      const dataImpacto = await apiService.obtenerImpacto(nodoId);
      setImpactoNodoSeleccionado(dataImpacto);
      setNodosAfectadosIds(dataImpacto.afectados.map(a => a.id));
    } catch {
      // Si falla la consulta de impacto, limpiamos afectados y dejamos que el panel muestre el estado correspondiente
      setNodosAfectadosIds([]);
    } finally {
      setCargandoImpactoNodo(false);
    }
  };

  useEffect(() => {
    const manejarAtajosTeclado = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT' ||
        modalElementoAbierto ||
        modalDependenciaAbierto ||
        modalAyudaAbierto
      ) {
        return;
      }

      if (e.key === '1') {
        setTabActiva('red');
      } else if (e.key === '2') {
        setTabActiva('catalogo');
      } else if (e.key === '3') {
        setTabActiva('impacto');
      } else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setModalAyudaAbierto(true);
      }
    };

    window.addEventListener('keydown', manejarAtajosTeclado);
    return () => window.removeEventListener('keydown', manejarAtajosTeclado);
  }, [modalElementoAbierto, modalDependenciaAbierto, modalAyudaAbierto]);

  const nodoSeleccionado = grafo.elementos.find(e => e.id === nodoSeleccionadoId);
  const proveedoresCount = grafo.elementos.filter(e => e.tipo === 'PROVEEDOR').length;
  const insumosCount = grafo.elementos.filter(e => e.tipo === 'INSUMO').length;
  const procesosCount = grafo.elementos.filter(e => e.tipo === 'PROCESO').length;
  const productosCount = grafo.elementos.filter(e => e.tipo === 'PRODUCTO').length;

  return (
    <div className="h-dvh overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Header & Navbar */}
      <HeaderNavbar
        tabActiva={tabActiva}
        onTabChange={setTabActiva}
        onAbrirModalElemento={() => setModalElementoAbierto(true)}
        onAbrirModalDependencia={() => setModalDependenciaAbierto(true)}
        onAbrirAyuda={() => setModalAyudaAbierto(true)}
        apiConectada={apiConectada}
      />

      {/* Alerta de Error Global */}
      {errorGlobal && (
        <div className="shrink-0 bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-red-400 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={16} className="shrink-0 text-red-400" />
            <span className="truncate">{errorGlobal}</span>
          </div>
          <button
            onClick={cargarGrafo}
            className="shrink-0 flex items-center gap-1 font-semibold hover:underline text-red-300"
          >
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="flex-1 min-h-0 overflow-y-auto max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Métricas Operativas de Planta */}
        <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl flex items-center justify-between shadow-lg border border-slate-800">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Proveedores</span>
              <p className="text-2xl font-black text-white mt-1">{proveedoresCount}</p>
              <span className="text-[10px] text-blue-400 font-medium">Suministro externo</span>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Box size={22} />
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-center justify-between shadow-lg border border-slate-800">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Materias & Insumos</span>
              <p className="text-2xl font-black text-white mt-1">{insumosCount}</p>
              <span className="text-[10px] text-amber-400 font-medium">Materiales base</span>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Layers size={22} />
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-center justify-between shadow-lg border border-slate-800">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Procesos de Planta</span>
              <p className="text-2xl font-black text-white mt-1">{procesosCount}</p>
              <span className="text-[10px] text-purple-400 font-medium">Estaciones de trabajo</span>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <GitCommitHorizontal size={22} />
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-center justify-between shadow-lg border border-slate-800">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Productos Finales</span>
              <p className="text-2xl font-black text-white mt-1">{productosCount}</p>
              <span className="text-[10px] text-emerald-400 font-medium">Despacho a cliente</span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Sparkles size={22} />
            </div>
          </div>
        </div>

        {/* Pestaña 1: Cadena de Suministro */}
        {tabActiva === 'red' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[560px] lg:h-[620px]">
            {/* Lienzo Interactivo */}
            <div className="lg:col-span-2 relative h-full min-h-0">
              <GraphCanvas
                elementos={grafo.elementos}
                dependencias={grafo.dependencias}
                nodoSeleccionadoId={nodoSeleccionadoId}
                nodosAfectadosIds={nodosAfectadosIds}
                onSelectNode={handleSelectNode}
              />
            </div>

            {/* Ficha de Inspección Operativa */}
            <div className="h-full min-h-0 space-y-4 overflow-y-auto pr-1">
              {nodoSeleccionado ? (
                <div className="glass-card p-5 rounded-2xl shadow-xl space-y-4 animate-in fade-in border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="font-mono text-xs font-bold text-sky-400">{obtenerCodigoSku(nodoSeleccionado.id)}</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {nodoSeleccionado.tipo}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{nodoSeleccionado.nombre}</h3>
                    <p className="text-xs text-slate-400 mt-1">{nodoSeleccionado.descripcion || 'Sin notas operativas adicionales.'}</p>
                  </div>

                  {/* Posición en la Cadena de Suministro */}
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">Etapa del Flujo:</span>
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className={`px-2 py-0.5 rounded transition-colors ${nodoSeleccionado.tipo === 'PROVEEDOR' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold' : 'text-slate-600'}`}>
                        Proveedor
                      </span>
                      <span className="text-slate-700 font-bold">→</span>
                      <span className={`px-2 py-0.5 rounded transition-colors ${nodoSeleccionado.tipo === 'INSUMO' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold' : 'text-slate-600'}`}>
                        Insumo
                      </span>
                      <span className="text-slate-700 font-bold">→</span>
                      <span className={`px-2 py-0.5 rounded transition-colors ${nodoSeleccionado.tipo === 'PROCESO' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold' : 'text-slate-600'}`}>
                        Proceso
                      </span>
                      <span className="text-slate-700 font-bold">→</span>
                      <span className={`px-2 py-0.5 rounded transition-colors ${nodoSeleccionado.tipo === 'PRODUCTO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold' : 'text-slate-600'}`}>
                        Producto
                      </span>
                    </div>
                  </div>

                  {/* Evaluación de Continuidad Operativa (Impacto F2) */}
                  <div className="p-3.5 rounded-xl border bg-slate-900/90 border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <AlertOctagon size={14} className={impactoNodoSeleccionado && impactoNodoSeleccionado.total > 0 ? 'text-red-400' : 'text-emerald-400'} />
                        Riesgo de Continuidad
                      </span>
                      {impactoNodoSeleccionado && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                          impactoNodoSeleccionado.total > 0
                            ? 'bg-red-500/10 text-red-300 border-red-500/25'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                        }`}>
                          {impactoNodoSeleccionado.total === 0 ? 'Sin riesgo en cadena' : `${impactoNodoSeleccionado.total} en riesgo`}
                        </span>
                      )}
                    </div>

                    {cargandoImpactoNodo ? (
                      <p className="text-[11px] text-slate-400 italic">Evaluando dependencias con el sistema...</p>
                    ) : impactoNodoSeleccionado ? (
                      impactoNodoSeleccionado.total === 0 ? (
                        <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                          Elemento terminal: Si este producto o componente se retrasa, no paraliza ninguna otra estación de trabajo en la fábrica.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-red-300/90 leading-relaxed">
                            Alerta: Su indisponibilidad detiene en cascada a los elementos resaltados en rojo en el mapa:
                          </p>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {impactoNodoSeleccionado.afectados.map(af => (
                              <span
                                key={af.id}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/80 text-red-200 border border-red-800/40"
                                title={`${af.nombre} (${af.tipo})`}
                              >
                                {af.nombre} [{obtenerCodigoSku(af.id)}]
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    ) : null}
                  </div>

                  {/* Suministros Previos Requeridos (Entrada) */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300">Suministros Requeridos (Entrada):</h4>
                    <ul className="space-y-1.5 text-xs">
                      {grafo.dependencias
                        .filter(d => d.destino === nodoSeleccionado.id)
                        .map(d => {
                          const itemOrigen = grafo.elementos.find(e => e.id === d.origen);
                          return (
                            <li key={d.origen} className="p-2 bg-slate-950 rounded-lg text-slate-300 flex items-center justify-between border border-slate-800/80">
                              <span className="font-medium">{itemOrigen?.nombre || d.origen}</span>
                              <span className="text-slate-500 font-mono text-[10px]">[{obtenerCodigoSku(d.origen)}]</span>
                            </li>
                          );
                        })}
                      {grafo.dependencias.filter(d => d.destino === nodoSeleccionado.id).length === 0 && (
                        <li className="text-slate-500 text-[11px] italic p-2 bg-slate-950/50 rounded-lg">
                          Materia prima base o proveedor inicial (no requiere insumos previos).
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Componentes Habilitados (Salida) */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300">Abastece Directamente a (Salida):</h4>
                    <ul className="space-y-1.5 text-xs">
                      {grafo.dependencias
                        .filter(d => d.origen === nodoSeleccionado.id)
                        .map(d => {
                          const itemDestino = grafo.elementos.find(e => e.id === d.destino);
                          return (
                            <li key={d.destino} className="p-2 bg-slate-950 rounded-lg text-slate-300 flex items-center justify-between border border-slate-800/80">
                              <span className="font-medium">{itemDestino?.nombre || d.destino}</span>
                              <span className="text-slate-500 font-mono text-[10px]">[{obtenerCodigoSku(d.destino)}]</span>
                            </li>
                          );
                        })}
                      {grafo.dependencias.filter(d => d.origen === nodoSeleccionado.id).length === 0 && (
                        <li className="text-slate-500 text-[11px] italic p-2 bg-slate-950/50 rounded-lg">
                          Producto final manufacturado (listo para entrega a cliente).
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-6 rounded-2xl text-center space-y-3 border border-slate-800">
                  <Layers size={32} className="mx-auto text-slate-600" />
                  <h4 className="text-sm font-bold text-white">Inspeccionar Componente de Planta</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Haz clic sobre cualquier material, proveedor, proceso o producto en el mapa para inspeccionar sus requerimientos de abastecimiento y simular su impacto operativo.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pestaña 2: Catálogo */}
        {tabActiva === 'catalogo' && (
          <div className="space-y-6">
            <CatalogTable
              elementos={grafo.elementos}
              onSelectNode={(id) => {
                handleSelectNode(id);
                setTabActiva('red');
              }}
              onConsultarImpacto={(id) => {
                setNodoSeleccionadoId(id);
                setTabActiva('impacto');
              }}
            />
          </div>
        )}

        {/* Pestaña 3: Análisis de Impacto (F2) */}
        {tabActiva === 'impacto' && (
          <VistaImpacto
            elementos={grafo.elementos}
            idInicial={nodoSeleccionadoId}
            onSeleccionarElementoEnGrafo={(id, afectados) => {
              setNodoSeleccionadoId(id);
              setNodosAfectadosIds(afectados);
              setTabActiva('red');
            }}
          />
        )}
      </main>

      {/* Modales de Creación */}
      <ModalCrearElemento
        isOpen={modalElementoAbierto}
        elementos={grafo.elementos}
        onClose={() => setModalElementoAbierto(false)}
        onSubmit={handleCrearElemento}
      />

      <ModalCrearDependencia
        isOpen={modalDependenciaAbierto}
        elementos={grafo.elementos}
        onClose={() => setModalDependenciaAbierto(false)}
        onSubmit={handleCrearDependencia}
      />

      <ModalAyudaOperativa
        abierto={modalAyudaAbierto}
        onCerrar={() => setModalAyudaAbierto(false)}
      />
    </div>
  );
};

export default App;
