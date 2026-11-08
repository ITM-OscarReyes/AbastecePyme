import React, { useState, useEffect, useCallback } from 'react';
import type {
  ActualizarElementoDto,
  CrearDependenciaDto,
  CrearElementoDto,
  Elemento,
  ImpactoRespuesta,
  ReglaDependencia,
  RespuestaGrafo
} from './types';
import { apiService, extraerMensajeError } from './services/api';
import { HeaderNavbar } from './components/HeaderNavbar';
import type { TabActiva } from './components/HeaderNavbar';
import { GraphCanvas } from './components/GraphCanvas';
import { CatalogTable } from './components/CatalogTable';
import { VistaImpacto } from './components/VistaImpacto';
import { VistaOrdenProduccion } from './components/VistaOrdenProduccion';
import { ModalCrearElemento } from './components/ModalCrearElemento';
import { ModalCrearDependencia } from './components/ModalCrearDependencia';
import { ModalAyudaOperativa } from './components/ModalAyudaOperativa';
import { ModalDetalleElemento } from './components/ModalDetalleElemento';
import { ModalConfirmarRiesgo } from './components/ModalConfirmarRiesgo';
import { PanelDetalleNodo, MensajeSinSeleccion } from './components/PanelDetalleNodo';
import { useHistorialImpactos } from './hooks/useHistorialImpactos';
import {
  Box,
  GitCommitHorizontal,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles,
  AlertOctagon
} from 'lucide-react';

type AccionPendiente =
  | {
      tipo: 'elemento';
      accion: 'editar';
      elementoId: string;
      nombre: string;
      dto: ActualizarElementoDto;
    }
  | {
      tipo: 'elemento';
      accion: 'eliminar';
      elementoId: string;
      nombre: string;
    }
  | {
      tipo: 'dependencia';
      accion: 'editar';
      origenActual: string;
      destinoActual: string;
      dto: CrearDependenciaDto;
    }
  | {
      tipo: 'dependencia';
      accion: 'eliminar';
      origen: string;
      destino: string;
    };

interface EstadoConfirmacion {
  accion: AccionPendiente;
  titulo: string;
  descripcion: string;
  detalle: string;
  impacto: ImpactoRespuesta | null;
  cargando: boolean;
  error: string | null;
}

interface SolicitudImpacto {
  id: string;
  secuencia: number;
}

export const App: React.FC = () => {
  const [grafo, setGrafo] = useState<RespuestaGrafo>({
    elementos: [],
    dependencias: [],
    resumen: { totalElementos: 0, totalDependencias: 0 }
  });
  const [reglas, setReglas] = useState<ReglaDependencia[]>([]);
  const [apiConectada, setApiConectada] = useState<boolean>(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const [tabActiva, setTabActiva] = useState<TabActiva>('red');
  const [nodoSeleccionadoId, setNodoSeleccionadoId] = useState<string | null>(null);
  const [nodosAfectadosIds, setNodosAfectadosIds] = useState<string[]>([]);
  const [filtroProductoGrafoId, setFiltroProductoGrafoId] = useState<string>('TODOS');
  const [cargandoImpactoNodo, setCargandoImpactoNodo] = useState<boolean>(false);
  const [impactoNodoSeleccionado, setImpactoNodoSeleccionado] =
    useState<ImpactoRespuesta | null>(null);

  const [modalElementoAbierto, setModalElementoAbierto] = useState<boolean>(false);
  const [elementoEditar, setElementoEditar] = useState<Elemento | null>(null);
  const [modalDependenciaAbierto, setModalDependenciaAbierto] = useState<boolean>(false);
  const [relacionEditar, setRelacionEditar] = useState<{ origen: string; destino: string } | null>(
    null
  );
  const [modalAyudaAbierto, setModalAyudaAbierto] = useState<boolean>(false);

  const [elementoDetalleId, setElementoDetalleId] = useState<string | null>(null);
  const [modoDetalle, setModoDetalle] = useState<'catalogo' | 'afectado'>('catalogo');
  const [confirmacion, setConfirmacion] = useState<EstadoConfirmacion | null>(null);
  const [solicitudImpacto, setSolicitudImpacto] = useState<SolicitudImpacto | null>(null);
  const [claveVistaImpacto, setClaveVistaImpacto] = useState<number>(0);

  const [esModoOscuro, setEsModoOscuro] = useState<boolean>(() => {
    const guardado = localStorage.getItem('abastecepyme-theme');
    if (guardado) return guardado === 'dark';
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (esModoOscuro) {
      root.classList.add('dark');
      localStorage.setItem('abastecepyme-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('abastecepyme-theme', 'light');
    }
  }, [esModoOscuro]);

  const toggleModoOscuro = () => {
    setEsModoOscuro((prev) => !prev);
  };

  const { historial, registrarAnalisis } = useHistorialImpactos();

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

  const cargarReglas = useCallback(async () => {
    try {
      const data = await apiService.obtenerReglasDependencia();
      setReglas(data.reglas);
    } catch {
      // Las reglas se muestran en el formulario; si no se pueden cargar, el
      // backend seguirá rechazando relaciones inválidas al confirmar.
      setReglas([]);
    }
  }, []);

  useEffect(() => {
    cargarGrafo();
    cargarReglas();
  }, [cargarGrafo, cargarReglas]);

  const handleSelectNode = useCallback(async (nodoId: string | null) => {
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
      setNodosAfectadosIds(dataImpacto.afectados.map((afectado) => afectado.id));
    } catch {
      setNodosAfectadosIds([]);
    } finally {
      setCargandoImpactoNodo(false);
    }
  }, []);

  const handleTabChange = useCallback((tab: TabActiva) => {
    if (tab === 'impacto') {
      setSolicitudImpacto(null);
      setClaveVistaImpacto((clave) => clave + 1);
    }
    setTabActiva(tab);
  }, []);

  useEffect(() => {
    const manejarAtajosTeclado = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT' ||
        modalElementoAbierto ||
        modalDependenciaAbierto ||
        modalAyudaAbierto ||
        confirmacion
      ) {
        return;
      }

      if (e.key === '1') {
        handleTabChange('red');
      } else if (e.key === '2') {
        handleTabChange('catalogo');
      } else if (e.key === '3') {
        handleTabChange('impacto');
      } else if (e.key === '4') {
        handleTabChange('produccion');
      } else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setModalAyudaAbierto(true);
      }
    };

    window.addEventListener('keydown', manejarAtajosTeclado);
    return () => window.removeEventListener('keydown', manejarAtajosTeclado);
  }, [modalElementoAbierto, modalDependenciaAbierto, modalAyudaAbierto, confirmacion, handleTabChange]);

  const abrirNuevoElemento = () => {
    setElementoEditar(null);
    setModalElementoAbierto(true);
  };

  const cerrarModalElemento = () => {
    setModalElementoAbierto(false);
    setElementoEditar(null);
  };

  const abrirNuevaDependencia = () => {
    setRelacionEditar(null);
    setModalDependenciaAbierto(true);
  };

  const cerrarModalDependencia = () => {
    setModalDependenciaAbierto(false);
    setRelacionEditar(null);
  };

  const handleCrearElemento = async (dto: CrearElementoDto) => {
    try {
      await apiService.crearElemento(dto);
      await cargarGrafo();
    } catch (err) {
      throw new Error(extraerMensajeError(err));
    }
  };

  const handleCrearDependencia = async (dto: CrearDependenciaDto) => {
    try {
      await apiService.crearDependencia(dto);
      await cargarGrafo();
      if (nodoSeleccionadoId) {
        await handleSelectNode(nodoSeleccionadoId);
      }
    } catch (err) {
      throw new Error(extraerMensajeError(err));
    }
  };

  const nombreDe = (id: string): string =>
    grafo.elementos.find((elemento) => elemento.id === id)?.nombre ?? id;

  const abrirConfirmacion = async (
    accion: AccionPendiente,
    meta: { titulo: string; descripcion: string; detalle: string },
    idsParaImpacto: string[]
  ) => {
    const estado: EstadoConfirmacion = {
      accion,
      ...meta,
      impacto: null,
      cargando: true,
      error: null
    };
    setConfirmacion(estado);

    try {
      const idsUnicos = Array.from(new Set(idsParaImpacto));
      const impactos = await Promise.all(
        idsUnicos.map((id) => apiService.obtenerImpacto(id).catch(() => null))
      );
      const validos = impactos.filter((impacto): impacto is ImpactoRespuesta => impacto !== null);
      if (validos.length === 0) {
        setConfirmacion((anterior) =>
          anterior && anterior.accion === accion ? { ...anterior, cargando: false } : anterior
        );
        return;
      }

      const afectadosPorId = new Map<string, ImpactoRespuesta['afectados'][number]>();
      validos.forEach((impacto) => {
        impacto.afectados.forEach((afectado) => afectadosPorId.set(afectado.id, afectado));
      });
      const afectados = Array.from(afectadosPorId.values()).sort((a, b) =>
        a.id.localeCompare(b.id)
      );
      const resumen = {
        totalSuministros: afectados.filter((afectado) => afectado.tipo === 'INSUMO').length,
        suministrosBajoMinimo: afectados.filter((afectado) => afectado.alertaStock).length
      };
      const impactoCombinado: ImpactoRespuesta = {
        elemento: validos[0].elemento,
        afectados,
        total: afectados.length,
        resumenStock: resumen
      };

      setConfirmacion((anterior) =>
        anterior && anterior.accion === accion
          ? { ...anterior, impacto: impactoCombinado, cargando: false }
          : anterior
      );
    } catch {
      setConfirmacion((anterior) =>
        anterior && anterior.accion === accion
          ? { ...anterior, cargando: false }
          : anterior
      );
    }
  };

  const solicitarEditarElemento = (dto: ActualizarElementoDto) => {
    if (!elementoEditar) return;
    void abrirConfirmacion(
      {
        tipo: 'elemento',
        accion: 'editar',
        elementoId: elementoEditar.id,
        nombre: elementoEditar.nombre,
        dto
      },
      {
        titulo: 'Editar elemento',
        descripcion: `Vas a guardar cambios en «${elementoEditar.nombre}». Revisa los posibles efectos antes de confirmar.`,
        detalle:
          elementoEditar.tipo === 'INSUMO'
            ? 'Se actualizarán también los datos de inventario del suministro.'
            : 'Se actualizarán el nombre y la descripción del elemento.'
      },
      [elementoEditar.id]
    );
  };

  const solicitarEliminarElemento = (elemento: Elemento) => {
    const relaciones = grafo.dependencias.filter(
      (dependencia) =>
        dependencia.origen === elemento.id || dependencia.destino === elemento.id
    ).length;
    void abrirConfirmacion(
      {
        tipo: 'elemento',
        accion: 'eliminar',
        elementoId: elemento.id,
        nombre: elemento.nombre
      },
      {
        titulo: 'Eliminar elemento',
        descripcion: `Vas a eliminar «${elemento.nombre}». Esta acción no se puede deshacer.`,
        detalle:
          relaciones > 0
            ? `También se eliminarán ${relaciones} relación(es) de la cadena que tocan este elemento.`
            : 'El elemento no tiene relaciones registradas.'
      },
      [elemento.id]
    );
  };

  const solicitarEliminarDependencia = (origen: string, destino: string) => {
    void abrirConfirmacion(
      { tipo: 'dependencia', accion: 'eliminar', origen, destino },
      {
        titulo: 'Eliminar relación',
        descripcion: `Vas a eliminar la relación «${nombreDe(origen)} → ${nombreDe(destino)}».`,
        detalle: 'La relación dejará de aparecer en el mapa y en los análisis de impacto.'
      },
      [origen]
    );
  };

  const abrirEdicionRelacion = (origen: string, destino: string) => {
    setRelacionEditar({ origen, destino });
    setModalDependenciaAbierto(true);
  };

  const solicitarEditarDependencia = (
    origenActual: string,
    destinoActual: string,
    dto: CrearDependenciaDto
  ) => {
    void abrirConfirmacion(
      { tipo: 'dependencia', accion: 'editar', origenActual, destinoActual, dto },
      {
        titulo: 'Editar relación',
        descripcion: `La relación «${nombreDe(origenActual)} → ${nombreDe(destinoActual)}» pasará a «${nombreDe(dto.origen)} → ${nombreDe(dto.destino)}».`,
        detalle: 'Revisa los posibles efectos de este cambio en la continuidad de la cadena.'
      },
      [origenActual, dto.origen]
    );
  };

  const confirmarAccion = async () => {
    if (!confirmacion) return;
    const accion = confirmacion.accion;
    setConfirmacion((anterior) =>
      anterior ? { ...anterior, cargando: true, error: null } : anterior
    );

    try {
      if (accion.tipo === 'elemento' && accion.accion === 'editar') {
        await apiService.actualizarElemento(accion.elementoId, accion.dto);
      } else if (accion.tipo === 'elemento' && accion.accion === 'eliminar') {
        await apiService.eliminarElemento(accion.elementoId);
      } else if (accion.tipo === 'dependencia' && accion.accion === 'editar') {
        await apiService.actualizarDependencia(accion.origenActual, accion.destinoActual, accion.dto);
      } else if (accion.tipo === 'dependencia' && accion.accion === 'eliminar') {
        await apiService.eliminarDependencia(accion.origen, accion.destino);
      }

      await cargarGrafo();
      setConfirmacion(null);
      setModalElementoAbierto(false);
      setElementoEditar(null);
      setModalDependenciaAbierto(false);
      setRelacionEditar(null);

      if (accion.tipo === 'elemento' && accion.accion === 'eliminar') {
        if (elementoDetalleId === accion.elementoId) {
          setElementoDetalleId(null);
        }
        if (nodoSeleccionadoId === accion.elementoId) {
          setNodoSeleccionadoId(null);
          setNodosAfectadosIds([]);
          setImpactoNodoSeleccionado(null);
        }
      } else if (nodoSeleccionadoId) {
        await handleSelectNode(nodoSeleccionadoId);
      }
    } catch (err) {
      setConfirmacion((anterior) =>
        anterior
          ? { ...anterior, cargando: false, error: extraerMensajeError(err) }
          : anterior
      );
    }
  };

  const abrirDetalle = (id: string, modo: 'catalogo' | 'afectado') => {
    setModoDetalle(modo);
    setElementoDetalleId(id);
  };

  const verEnMapa = (id: string) => {
    setElementoDetalleId(null);
    setTabActiva('red');
    const elemento = grafo.elementos.find((e) => e.id === id);
    if (elemento?.tipo === 'PRODUCTO') {
      setFiltroProductoGrafoId(id);
    }
    void handleSelectNode(id);
  };

  const evaluarImpacto = (id: string) => {
    setElementoDetalleId(null);
    setSolicitudImpacto({ id, secuencia: Date.now() });
    setTabActiva('impacto');
  };

  const editarDesdeDetalle = (elemento: Elemento) => {
    setElementoDetalleId(null);
    setElementoEditar(elemento);
    setModalElementoAbierto(true);
  };

  const nodoSeleccionado = grafo.elementos.find((elemento) => elemento.id === nodoSeleccionadoId);
  const elementoDetalle = grafo.elementos.find((elemento) => elemento.id === elementoDetalleId) ?? null;
  const proveedoresCount = grafo.elementos.filter((elemento) => elemento.tipo === 'PROVEEDOR').length;
  const insumosCount = grafo.elementos.filter((elemento) => elemento.tipo === 'INSUMO').length;
  const procesosCount = grafo.elementos.filter((elemento) => elemento.tipo === 'PROCESO').length;
  const productosCount = grafo.elementos.filter((elemento) => elemento.tipo === 'PRODUCTO').length;
  const suministrosEnAlerta = grafo.elementos.filter((elemento) => elemento.alertaStock);

  return (
    <div className={`h-dvh overflow-hidden flex flex-col font-sans transition-colors duration-200 ${esModoOscuro ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} selection:bg-sky-500 selection:text-white`}>
      <HeaderNavbar
        tabActiva={tabActiva}
        onTabChange={handleTabChange}
        onAbrirModalElemento={abrirNuevoElemento}
        onAbrirModalDependencia={abrirNuevaDependencia}
        onAbrirAyuda={() => setModalAyudaAbierto(true)}
        apiConectada={apiConectada}
        esModoOscuro={esModoOscuro}
        onToggleModoOscuro={toggleModoOscuro}
      />

      {errorGlobal && (
        <div className="shrink-0 bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-red-800 dark:text-red-400 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={16} className="shrink-0 text-red-600 dark:text-red-400" />
            <span className="truncate">{errorGlobal}</span>
          </div>
          <button
            onClick={cargarGrafo}
            className="shrink-0 flex items-center gap-1 font-semibold hover:underline text-red-700 dark:text-red-300"
          >
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      )}

      <main
        className={`flex-1 min-h-0 w-full p-4 sm:p-6 lg:p-8 overflow-y-auto ${
          tabActiva === 'red' ? 'flex flex-col gap-4 sm:gap-6' : 'space-y-6'
        }`}
      >
        <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass-card p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-2 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight">Proveedores</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 sm:mt-1 leading-none">{proveedoresCount}</p>
              <span className="block text-[9px] sm:text-[10px] text-blue-600 dark:text-blue-400 font-medium leading-tight mt-0.5">Suministro externo</span>
            </div>
            <div className="shrink-0 p-2 sm:p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20">
              <Box className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="glass-card p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-2 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight">Materias & Suministros</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 sm:mt-1 leading-none">{insumosCount}</p>
              <span className="block text-[9px] sm:text-[10px] text-amber-600 dark:text-amber-400 font-medium leading-tight mt-0.5">Materiales base</span>
            </div>
            <div className="shrink-0 p-2 sm:p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="glass-card p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-2 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight">Procesos de Planta</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 sm:mt-1 leading-none">{procesosCount}</p>
              <span className="block text-[9px] sm:text-[10px] text-purple-600 dark:text-purple-400 font-medium leading-tight mt-0.5">Estaciones de trabajo</span>
            </div>
            <div className="shrink-0 p-2 sm:p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
              <GitCommitHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="glass-card p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-2 shadow-sm dark:shadow-lg border border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              <span className="block text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight">Productos Finales</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 sm:mt-1 leading-none">{productosCount}</p>
              <span className="block text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-tight mt-0.5">Despacho a cliente</span>
            </div>
            <div className="shrink-0 p-2 sm:p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        {tabActiva === 'red' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:flex-1 lg:min-h-0">
            <div className="lg:col-span-2 relative h-[360px] sm:h-[440px] lg:h-full lg:min-h-0 min-w-0">
              <GraphCanvas
                elementos={grafo.elementos}
                dependencias={grafo.dependencias}
                nodoSeleccionadoId={nodoSeleccionadoId}
                nodosAfectadosIds={nodosAfectadosIds}
                onSelectNode={handleSelectNode}
                esModoOscuro={esModoOscuro}
                filtroProductoId={filtroProductoGrafoId}
                onCambiarFiltroProducto={setFiltroProductoGrafoId}
              />
            </div>

            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  void handleSelectNode(null);
                }
              }}
              className="min-w-0 max-h-[440px] lg:max-h-none lg:h-full lg:min-h-0 space-y-4 overflow-y-auto pr-1"
            >
              {suministrosEnAlerta.length > 0 && (
                <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3.5 text-xs text-red-900 dark:text-red-200 flex items-start gap-2.5 shadow-sm">
                  <AlertOctagon size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="font-bold text-red-900 dark:text-red-200">Alerta de stock</p>
                    <p className="mt-0.5 leading-relaxed text-red-700 dark:text-red-300 text-[11px]">
                      {suministrosEnAlerta.length} suministro(s) por debajo del mínimo aceptable:{' '}
                      <span className="font-semibold text-red-900 dark:text-red-100">
                        {suministrosEnAlerta.map((elemento) => elemento.nombre).join(', ')}
                      </span>.
                    </p>
                  </div>
                </div>
              )}

              {nodoSeleccionado ? (
                <PanelDetalleNodo
                  elemento={nodoSeleccionado}
                  elementos={grafo.elementos}
                  dependencias={grafo.dependencias}
                  impacto={impactoNodoSeleccionado}
                  cargandoImpacto={cargandoImpactoNodo}
                  onEditar={(elemento) => {
                    setElementoEditar(elemento);
                    setModalElementoAbierto(true);
                  }}
                  onEliminar={solicitarEliminarElemento}
                  onEditarRelacion={abrirEdicionRelacion}
                  onEliminarRelacion={solicitarEliminarDependencia}
                  onCerrar={() => handleSelectNode(null)}
                />
              ) : (
                <MensajeSinSeleccion />
              )}
            </div>
          </div>
        )}

        {tabActiva === 'catalogo' && (
          <div className="space-y-6">
            <CatalogTable
              elementos={grafo.elementos}
              onConsultarElemento={(id) => abrirDetalle(id, 'catalogo')}
              onConsultarImpacto={evaluarImpacto}
            />
          </div>
        )}

        {tabActiva === 'impacto' && (
          <VistaImpacto
            key={claveVistaImpacto}
            elementos={grafo.elementos}
            solicitudInicial={solicitudImpacto}
            historial={historial}
            onAnalisisRegistrado={registrarAnalisis}
            onSeleccionarElementoEnGrafo={(id) => {
              setTabActiva('red');
              const elemento = grafo.elementos.find((e) => e.id === id);
              if (elemento?.tipo === 'PRODUCTO') {
                setFiltroProductoGrafoId(id);
              }
              void handleSelectNode(id);
            }}
            onConsultarAfectado={(id) => abrirDetalle(id, 'afectado')}
          />
        )}

        {tabActiva === 'produccion' && (
          <VistaOrdenProduccion
            onIrACatalogo={() => setTabActiva('catalogo')}
            onIrARed={(nodoId) => {
              setTabActiva('red');
              if (nodoId) {
                const elemento = grafo.elementos.find((e) => e.id === nodoId);
                if (elemento?.tipo === 'PRODUCTO') {
                  setFiltroProductoGrafoId(nodoId);
                }
                void handleSelectNode(nodoId);
              }
            }}
          />
        )}
      </main>

      <ModalCrearElemento
        isOpen={modalElementoAbierto}
        elementos={grafo.elementos}
        elementoEditar={elementoEditar}
        onClose={cerrarModalElemento}
        onSubmit={handleCrearElemento}
        onSolicitarGuardar={solicitarEditarElemento}
      />

      <ModalCrearDependencia
        isOpen={modalDependenciaAbierto}
        elementos={grafo.elementos}
        reglas={reglas}
        relacionEditar={relacionEditar}
        onClose={cerrarModalDependencia}
        onSubmit={handleCrearDependencia}
        onSolicitarEdicion={solicitarEditarDependencia}
      />

      <ModalDetalleElemento
        elemento={elementoDetalle}
        elementos={grafo.elementos}
        dependencias={grafo.dependencias}
        modo={modoDetalle}
        onCerrar={() => setElementoDetalleId(null)}
        onVerEnMapa={verEnMapa}
        onEvaluarImpacto={evaluarImpacto}
        onEditar={editarDesdeDetalle}
        onEliminar={solicitarEliminarElemento}
      />

      <ModalConfirmarRiesgo
        abierto={Boolean(confirmacion)}
        titulo={confirmacion?.titulo ?? ''}
        accion={confirmacion?.accion.accion ?? 'editar'}
        descripcion={confirmacion?.descripcion ?? ''}
        detalle={confirmacion?.detalle}
        impacto={confirmacion?.impacto ?? null}
        cargando={confirmacion?.cargando ?? false}
        error={confirmacion?.error}
        onConfirmar={confirmarAccion}
        onCancelar={() => setConfirmacion(null)}
      />

      <ModalAyudaOperativa
        abierto={modalAyudaAbierto}
        onCerrar={() => setModalAyudaAbierto(false)}
        onNavegar={handleTabChange}
      />
    </div>
  );
};

export default App;
