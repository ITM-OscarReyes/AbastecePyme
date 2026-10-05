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
import { ModalCrearElemento } from './components/ModalCrearElemento';
import { ModalCrearDependencia } from './components/ModalCrearDependencia';
import {
  Box,
  GitCommitHorizontal,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles
} from 'lucide-react';

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

  const handleSelectNode = (nodoId: string | null) => {
    setNodoSeleccionadoId(nodoId);
  };

  const nodoSeleccionado = grafo.elementos.find(e => e.id === nodoSeleccionadoId);
  const tiposEnCatalogo = new Set(grafo.elementos.map(e => e.tipo));

  return (
    <div className="h-dvh overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Header & Navbar */}
      <HeaderNavbar
        tabActiva={tabActiva}
        onTabChange={setTabActiva}
        onAbrirModalElemento={() => setModalElementoAbierto(true)}
        onAbrirModalDependencia={() => setModalDependenciaAbierto(true)}
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
      {/* `min-h-0` en `main` y en la fila del grafo es lo que permite que el flex los encoja por
          debajo de su contenido; sin eso, la altura del lienzo empuja el borde inferior fuera del
          viewport. El área del grafo ocupa el espacio restante en vez de una altura fija. */}
      <main className="flex-1 min-h-0 overflow-y-auto max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* KPI Summary Cards Glassmorphic */}
        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tipos en Catálogo</span>
              <p className="text-2xl font-black text-white mt-1">{tiposEnCatalogo.size}</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Layers size={22} />
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

        {/* Pestaña 1: Red de Dependencias */}
        {tabActiva === 'red' && (
          <div className="flex-1 min-h-[420px] grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lienzo del Grafo */}
            <div className="lg:col-span-2 relative min-h-0">
              <GraphCanvas
                elementos={grafo.elementos}
                dependencias={grafo.dependencias}
                nodoSeleccionadoId={nodoSeleccionadoId}
                onSelectNode={handleSelectNode}
              />
            </div>

            {/* Panel de Detalles */}
            <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
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
            </div>
          </div>
        )}

        {/* Pestaña 2: Catálogo */}
        {tabActiva === 'catalogo' && (
          <div className="space-y-6">
            <CatalogTable
              elementos={grafo.elementos}
              onSelectNode={(id) => {
                setNodoSeleccionadoId(id);
                setTabActiva('red');
              }}
            />
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
