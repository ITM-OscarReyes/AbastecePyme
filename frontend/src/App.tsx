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
import { ImpactPanel } from './components/ImpactPanel';
import { ProductionPlannerPanel } from './components/ProductionPlannerPanel';
import { ModalCrearElemento } from './components/ModalCrearElemento';
import { ModalCrearDependencia } from './components/ModalCrearDependencia';
import {
  Box,
  GitCommitHorizontal,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles,
  EyeOff
} from 'lucide-react';

export const App: React.FC = () => {
  const [grafo, setGrafo] = useState<RespuestaGrafo>({
    elementos: [],
    dependencias: [],
    resumen: { totalElementos: 0, totalDependencias: 0 }
  });
  const [apiConectada, setApiConectada] = useState<boolean>(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const [tabActiva, setTabActiva] = useState<TabActiva>('orden');
  const [nodoSeleccionadoId, setNodoSeleccionadoId] = useState<string | null>(null);
  const [nodosAfectadosIds, setNodosAfectadosIds] = useState<string[]>([]);
  const [nodosCicloIds, setNodosCicloIds] = useState<string[]>([]);

  const [modalElementoAbierto, setModalElementoAbierto] = useState<boolean>(false);
  const [modalDependenciaAbierto, setModalDependenciaAbierto] = useState<boolean>(false);

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

  const handleLimpiarSimulacion = () => {
    setNodosAfectadosIds([]);
    setNodoSeleccionadoId(null);
  };

  const nodoSeleccionado = grafo.elementos.find(e => e.id === nodoSeleccionadoId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Header & Navbar */}
      <HeaderNavbar
        tabActiva={tabActiva}
        onTabChange={(nuevaTab) => {
          setTabActiva(nuevaTab);
          // Si cambiamos a orden y veníamos de impacto, limpiamos el impacto para que el grafo de orden no se pinte de rojo por error
          if (nuevaTab === 'orden' && nodosAfectadosIds.length > 0) {
            setNodosAfectadosIds([]);
          }
        }}
        onAbrirModalElemento={() => setModalElementoAbierto(true)}
        onAbrirModalDependencia={() => setModalDependenciaAbierto(true)}
        apiConectada={apiConectada}
      />

      {/* Alerta de Error Global */}
      {errorGlobal && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-red-400 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-red-400" />
            <span>{errorGlobal}</span>
          </div>
          <button
            onClick={cargarGrafo}
            className="flex items-center gap-1 font-semibold hover:underline text-red-300"
          >
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      )}

      {/* Barra de Notificación si hay simulación de impacto activa */}
      {nodosAfectadosIds.length > 0 && tabActiva !== 'impacto' && (
        <div className="bg-red-950/40 border-b border-red-800/40 px-4 py-2 text-xs flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2 text-red-300">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>Simulación de falla activa ({nodosAfectadosIds.length} elementos resaltados).</span>
          </div>
          <button
            onClick={handleLimpiarSimulacion}
            className="text-xs text-slate-300 hover:text-white font-semibold underline flex items-center gap-1"
          >
            <EyeOff size={13} /> Limpiar y ver colores normales
          </button>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* KPI Summary Cards Glassmorphic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Elementos</span>
              <p className="text-2xl font-black text-white mt-1">{grafo.resumen.totalElementos}</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Box size={22} />
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dependencias</span>
              <p className="text-2xl font-black text-white mt-1">{grafo.resumen.totalDependencias}</p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <GitCommitHorizontal size={22} />
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado de la Red</span>
              <p className={`text-sm font-extrabold mt-1 ${nodosCicloIds.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {nodosCicloIds.length > 0 ? '¡Ciclo Detectado!' : 'Red Acíclica Saludable'}
              </p>
            </div>
            <div className={`p-3 rounded-xl border ${nodosCicloIds.length > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 glow-alert' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 glow-success'}`}>
              {nodosCicloIds.length > 0 ? <AlertTriangle size={22} /> : <ShieldCheck size={22} />}
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Motor Gráfico</span>
              <p className="text-sm font-extrabold text-sky-400 mt-1">Cytoscape GPU + Dagre</p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Sparkles size={22} />
            </div>
          </div>
        </div>

        {/* Pestaña 1: Dashboard Integrado */}
        {tabActiva === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[620px]">
            {/* Lienzo del Grafo */}
            <div className="lg:col-span-2 relative h-full">
              <GraphCanvas
                elementos={grafo.elementos}
                dependencias={grafo.dependencias}
                nodoSeleccionadoId={nodoSeleccionadoId}
                nodosAfectadosIds={nodosAfectadosIds}
                nodosCicloIds={nodosCicloIds}
                onSelectNode={setNodoSeleccionadoId}
                onLimpiarResaltados={handleLimpiarSimulacion}
              />
            </div>

            {/* Panel de Detalles */}
            <div className="space-y-4 overflow-y-auto pr-1">
              {nodoSeleccionado ? (
                <div className="glass-card p-5 rounded-2xl shadow-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="font-mono text-xs font-bold text-sky-400">{nodoSeleccionado.id}</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      {nodoSeleccionado.tipo}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{nodoSeleccionado.nombre}</h3>
                  <p className="text-xs text-slate-400">{nodoSeleccionado.descripcion || 'Sin descripción adicional.'}</p>

                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300">Requerimientos Directos (Habilitado por):</h4>
                    <ul className="space-y-1 text-xs">
                      {grafo.dependencias
                        .filter(d => d.destino === nodoSeleccionado.id)
                        .map(d => (
                          <li key={d.origen} className="p-2 bg-slate-950 rounded-lg text-slate-300 flex justify-between font-mono">
                            <span>{d.origen}</span>
                            <span className="text-slate-500 font-sans text-[10px]">habilita</span>
                          </li>
                        ))}
                      {grafo.dependencias.filter(d => d.destino === nodoSeleccionado.id).length === 0 && (
                        <li className="text-slate-500 text-[11px] italic">No requiere insumos previos (es proveedor o materia prima base).</li>
                      )}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300">Habilita a (Componentes dependientes):</h4>
                    <ul className="space-y-1 text-xs">
                      {grafo.dependencias
                        .filter(d => d.origen === nodoSeleccionado.id)
                        .map(d => (
                          <li key={d.destino} className="p-2 bg-slate-950 rounded-lg text-slate-300 flex justify-between font-mono">
                            <span>{d.destino}</span>
                            <span className="text-slate-500 font-sans text-[10px]">depende de él</span>
                          </li>
                        ))}
                      {grafo.dependencias.filter(d => d.origen === nodoSeleccionado.id).length === 0 && (
                        <li className="text-slate-500 text-[11px] italic">No habilita a otros elementos (es producto final).</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-6 rounded-2xl text-center space-y-3">
                  <Layers size={32} className="mx-auto text-slate-600" />
                  <h4 className="text-sm font-bold text-white">Selecciona un Nodo</h4>
                  <p className="text-xs text-slate-400">Haz clic sobre cualquier elemento del grafo interactivo para inspeccionar sus relaciones directas de abastecimiento.</p>
                </div>
              )}

              {/* Acceso Rápido a Simulación */}
              <ImpactPanel
                grafo={grafo}
                onImpactoCalculado={setNodosAfectadosIds}
              />
            </div>
          </div>
        )}

        {/* Pestaña 2: Catálogo F1 */}
        {tabActiva === 'catalogo' && (
          <div className="space-y-6">
            <CatalogTable
              elementos={grafo.elementos}
              onSelectNode={(id) => {
                setNodoSeleccionadoId(id);
                setTabActiva('dashboard');
              }}
            />
          </div>
        )}

        {/* Pestaña 3: Análisis de Impacto F2 */}
        {tabActiva === 'impacto' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <ImpactPanel
              grafo={grafo}
              onImpactoCalculado={setNodosAfectadosIds}
            />
            <div className="h-[520px]">
              <GraphCanvas
                elementos={grafo.elementos}
                dependencias={grafo.dependencias}
                nodoSeleccionadoId={nodoSeleccionadoId}
                nodosAfectadosIds={nodosAfectadosIds}
                nodosCicloIds={nodosCicloIds}
                onSelectNode={setNodoSeleccionadoId}
                onLimpiarResaltados={handleLimpiarSimulacion}
              />
            </div>
          </div>
        )}

        {/* Pestaña 4: Orden de Producción & Ciclos F3 */}
        {tabActiva === 'orden' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <ProductionPlannerPanel
              grafo={grafo}
              onCicloDetectado={setNodosCicloIds}
              onSelectNode={(id) => setNodoSeleccionadoId(id)}
              nodoSeleccionadoId={nodoSeleccionadoId}
            />
            <div className="h-[520px]">
              <GraphCanvas
                elementos={grafo.elementos}
                dependencias={grafo.dependencias}
                nodoSeleccionadoId={nodoSeleccionadoId}
                // En la vista de orden, el grafo muestra los colores normales de cada tipo salvo que haya un ciclo circular
                nodosAfectadosIds={[]}
                nodosCicloIds={nodosCicloIds}
                onSelectNode={setNodoSeleccionadoId}
                onLimpiarResaltados={handleLimpiarSimulacion}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modales de Creación */}
      <ModalCrearElemento
        isOpen={modalElementoAbierto}
        onClose={() => setModalElementoAbierto(false)}
        onSubmit={handleCrearElemento}
      />

      <ModalCrearDependencia
        isOpen={modalDependenciaAbierto}
        elementos={grafo.elementos}
        onClose={() => setModalDependenciaAbierto(false)}
        onSubmit={handleCrearDependencia}
      />
    </div>
  );
};

export default App;
