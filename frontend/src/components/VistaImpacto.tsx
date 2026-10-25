import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  AnalisisReciente,
  Elemento,
  ImpactoRespuesta,
  TipoElemento
} from '../types';
import { apiService, extraerMensajeError } from '../services/api';
import { obtenerCodigoSku } from '../utils/sku';
import { etiquetaEstadoStock, etiquetaTipo, formatearFechaHora } from '../utils/etiquetas';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Loader2,
  Building2,
  Package,
  Cog,
  CheckSquare,
  Sparkles,
  Network,
  Copy,
  Check,
  X,
  History,
  Zap
} from 'lucide-react';

interface SolicitudImpacto {
  id: string;
  secuencia: number;
}

interface VistaImpactoProps {
  elementos: Elemento[];
  solicitudInicial?: SolicitudImpacto | null;
  historial: AnalisisReciente[];
  onAnalisisRegistrado: (resultado: ImpactoRespuesta) => void;
  onSeleccionarElementoEnGrafo?: (id: string, afectadosIds: string[]) => void;
  onConsultarAfectado: (id: string) => void;
}

// Función pura para extraer y resolver el identificador técnico exacto del catálogo
const extraerIdObjetivo = (texto: string, listaElementos: Elemento[]): string => {
  const q = texto.trim();
  if (!q) return '';

  const matchAislado = q.match(/[[(]([A-Za-z0-9_-]+)[\])]/);
  if (matchAislado) {
    const idEncontrado = matchAislado[1].toUpperCase();
    const existe = listaElementos.find(
      (el) => el.id.toUpperCase() === idEncontrado || obtenerCodigoSku(el.id).toUpperCase() === idEncontrado
    );
    return existe ? existe.id : idEncontrado;
  }

  const matchIdExacto = listaElementos.find(
    (el) => el.id.toLowerCase() === q.toLowerCase() || obtenerCodigoSku(el.id).toLowerCase() === q.toLowerCase()
  );
  if (matchIdExacto) return matchIdExacto.id;

  const matchNombreExacto = listaElementos.find((el) => el.nombre.toLowerCase() === q.toLowerCase());
  if (matchNombreExacto) return matchNombreExacto.id;

  const matchContenido = listaElementos.find((el) =>
    q.toLowerCase().includes(el.id.toLowerCase()) ||
    q.toLowerCase().includes(obtenerCodigoSku(el.id).toLowerCase()) ||
    q.toLowerCase().includes(el.nombre.toLowerCase())
  );
  if (matchContenido) return matchContenido.id;

  const matchParcial = listaElementos.find((el) =>
    el.id.toLowerCase().includes(q.toLowerCase()) ||
    obtenerCodigoSku(el.id).toLowerCase().includes(q.toLowerCase()) ||
    el.nombre.toLowerCase().includes(q.toLowerCase())
  );
  if (matchParcial) return matchParcial.id;

  const matchSku = q.toUpperCase().match(/^(PROV|INS|PROC|PROD)[-_]?0*([1-9]\d*)$/);
  if (matchSku) {
    const pref = matchSku[1];
    const indice = parseInt(matchSku[2], 10) - 1;
    const delTipo = listaElementos.filter((el) => el.tipo.startsWith(pref));
    if (delTipo[indice]) return delTipo[indice].id;
  }

  const idSanitizado = q.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase();
  return idSanitizado || q.toUpperCase();
};

const getTipoIcono = (tipo: TipoElemento) => {
  switch (tipo) {
    case 'PROVEEDOR':
      return <Building2 size={16} className="text-blue-400" />;
    case 'INSUMO':
      return <Package size={16} className="text-amber-400" />;
    case 'PROCESO':
      return <Cog size={16} className="text-purple-400" />;
    case 'PRODUCTO':
      return <CheckSquare size={16} className="text-emerald-400" />;
    default:
      return <Package size={16} className="text-slate-400" />;
  }
};

export const VistaImpacto: React.FC<VistaImpactoProps> = ({
  elementos,
  solicitudInicial,
  historial,
  onAnalisisRegistrado,
  onSeleccionarElementoEnGrafo,
  onConsultarAfectado
}) => {
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>('');
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState<boolean>(false);
  const [indiceSugerencia, setIndiceSugerencia] = useState<number>(-1);
  const [cargando, setCargando] = useState<boolean>(false);
  const [resultado, setResultado] = useState<ImpactoRespuesta | null>(null);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [copiadoInforme, setCopiadoInforme] = useState<boolean>(false);
  const [filtroTipoAfectados, setFiltroTipoAfectados] = useState<'TODOS' | 'INSUMO' | 'PROCESO' | 'PRODUCTO'>('TODOS');

  const contenedorBusquedaRef = useRef<HTMLDivElement>(null);
  const inputBusquedaRef = useRef<HTMLInputElement>(null);
  const ultimaSecuenciaRef = useRef<number | null>(null);

  const consultarImpacto = useCallback(
    async (id: string) => {
      const idLimpio = id.trim();
      if (!idLimpio) return;

      setCargando(true);
      setErrorConsulta(null);
      setErrorCodigo(null);
      setResultado(null);
      setFiltroTipoAfectados('TODOS');

      try {
        const data = await apiService.obtenerImpacto(idLimpio);
        setResultado(data);
        onAnalisisRegistrado(data);
      } catch (err: unknown) {
        const mensaje = extraerMensajeError(err);
        setErrorConsulta(mensaje);
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const axErr = err as { response?: { status?: number; data?: { error?: { codigo?: string } } } };
          setErrorCodigo(axErr.response?.data?.error?.codigo || null);
        }
      } finally {
        setCargando(false);
      }
    },
    [onAnalisisRegistrado]
  );

  const ejecutarConsulta = useCallback(
    (queryOId: string) => {
      const idPuro = extraerIdObjetivo(queryOId, elementos);
      if (!idPuro) return;
      const elementoEncontrado = elementos.find((el) => el.id === idPuro);
      setTerminoBusqueda(
        elementoEncontrado
          ? `${elementoEncontrado.nombre} [${obtenerCodigoSku(elementoEncontrado.id)}]`
          : idPuro
      );
      setSugerenciasAbiertas(false);
      setIndiceSugerencia(-1);
      consultarImpacto(idPuro);
    },
    [elementos, consultarImpacto]
  );

  useEffect(() => {
    if (!solicitudInicial) return;
    if (ultimaSecuenciaRef.current === solicitudInicial.secuencia) return;
    ultimaSecuenciaRef.current = solicitudInicial.secuencia;
    const elementoExistente = elementos.find((el) => el.id === solicitudInicial.id);
    setTerminoBusqueda(
      elementoExistente
        ? `${elementoExistente.nombre} [${obtenerCodigoSku(elementoExistente.id)}]`
        : solicitudInicial.id
    );
    setSugerenciasAbiertas(false);
    consultarImpacto(solicitudInicial.id);
  }, [solicitudInicial, elementos, consultarImpacto]);

  const sugerencias = useMemo(() => {
    const q = terminoBusqueda.trim().toLowerCase();
    if (!q) return [];
    return elementos
      .filter((el) => {
        const coincideId = el.id.toLowerCase().includes(q) || obtenerCodigoSku(el.id).toLowerCase().includes(q);
        const coincideNombre = el.nombre.toLowerCase().includes(q);
        const coincideTipo = el.tipo.toLowerCase().includes(q);
        return coincideId || coincideNombre || coincideTipo;
      })
      .slice(0, 8);
  }, [elementos, terminoBusqueda]);

  useEffect(() => {
    const clickAfuera = (event: MouseEvent) => {
      if (
        contenedorBusquedaRef.current &&
        !contenedorBusquedaRef.current.contains(event.target as Node)
      ) {
        setSugerenciasAbiertas(false);
        setIndiceSugerencia(-1);
      }
    };
    document.addEventListener('mousedown', clickAfuera);
    return () => document.removeEventListener('mousedown', clickAfuera);
  }, []);

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    const q = terminoBusqueda.trim();
    if (!q) return;

    if (indiceSugerencia >= 0 && sugerencias[indiceSugerencia]) {
      const seleccion = sugerencias[indiceSugerencia];
      ejecutarConsulta(seleccion.id);
      return;
    }

    ejecutarConsulta(q);
  };

  const manejarTeclasInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!sugerenciasAbiertas || sugerencias.length === 0) {
      if (e.key === 'ArrowDown' && sugerencias.length > 0) {
        setSugerenciasAbiertas(true);
        setIndiceSugerencia(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSugerencia((prev) => (prev < sugerencias.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSugerencia((prev) => (prev > 0 ? prev - 1 : sugerencias.length - 1));
    } else if (e.key === 'Escape') {
      setSugerenciasAbiertas(false);
      setIndiceSugerencia(-1);
    }
  };

  const handleLimpiarBusqueda = () => {
    setTerminoBusqueda('');
    setSugerenciasAbiertas(false);
    setIndiceSugerencia(-1);
    setResultado(null);
    setErrorConsulta(null);
    inputBusquedaRef.current?.focus();
  };

  const handleCopiarInforme = async () => {
    if (!resultado) return;

    const suministrosAfectados = resultado.afectados.filter((a) => a.tipo === 'INSUMO');
    const procesosAfectados = resultado.afectados.filter((a) => a.tipo === 'PROCESO');
    const productosAfectados = resultado.afectados.filter((a) => a.tipo === 'PRODUCTO');
    const conStockBajo = [resultado.elemento, ...resultado.afectados].filter(
      (elemento) => elemento.alertaStock
    );

    const lineas = [
      'INFORME DE ANÁLISIS DE IMPACTO — ABASTECEPYME',
      `Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      `Elemento analizado: ${resultado.elemento.nombre} [${obtenerCodigoSku(resultado.elemento.id)}]`,
      `Tipo de elemento: ${etiquetaTipo(resultado.elemento.tipo)}`,
      resultado.elemento.tipo === 'INSUMO'
        ? `Stock: ${resultado.elemento.stockDisponible ?? 0} unidades disponibles; mínimo aceptable: ${resultado.elemento.stockMinimo ?? 0}. Estado: ${etiquetaEstadoStock(resultado.elemento.estadoStock)}.`
        : '',
      '',
      `Resultado: ${
        resultado.total === 0
          ? 'sin elementos afectados en la cadena.'
          : `${resultado.total} elemento(s) afectado(s) en la cadena.`
      }`,
      procesosAfectados.length > 0
        ? `- Procesos afectados: ${procesosAfectados.map((a) => `${a.nombre} [${obtenerCodigoSku(a.id)}]`).join(', ')}`
        : '',
      productosAfectados.length > 0
        ? `- Productos afectados: ${productosAfectados.map((a) => `${a.nombre} [${obtenerCodigoSku(a.id)}]`).join(', ')}`
        : '',
      suministrosAfectados.length > 0
        ? `- Suministros afectados: ${suministrosAfectados.map((a) => `${a.nombre} [${obtenerCodigoSku(a.id)}]`).join(', ')}`
        : '',
      conStockBajo.length > 0
        ? `- Suministros con stock bajo el mínimo: ${conStockBajo.map((a) => `${a.nombre} [${obtenerCodigoSku(a.id)}]`).join(', ')}`
        : '',
      '',
      `Recomendación: ${
        resultado.total === 0
          ? 'No se requiere activar un plan de contingencia para este elemento.'
          : 'Revisar el abastecimiento del elemento analizado y coordinar un plan de contingencia con Compras y Producción.'
      }`
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lineas.join('\n'));
      setCopiadoInforme(true);
      setTimeout(() => setCopiadoInforme(false), 2500);
    } catch {
      // El portapapeles puede no estar disponible; el análisis sigue visible.
    }
  };

  const insumosAfectados = resultado?.afectados.filter((a) => a.tipo === 'INSUMO') || [];
  const procesosAfectados = resultado?.afectados.filter((a) => a.tipo === 'PROCESO') || [];
  const productosAfectados = resultado?.afectados.filter((a) => a.tipo === 'PRODUCTO') || [];

  const afectadosFiltrados =
    resultado?.afectados.filter(
      (a) => filtroTipoAfectados === 'TODOS' || a.tipo === filtroTipoAfectados
    ) || [];

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-xl space-y-5 border border-slate-800">
        <div className="flex items-start gap-3.5 border-b border-slate-800/80 pb-5">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <ShieldAlert size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">Análisis de Impacto</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Continuidad operativa
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Evalúa qué procesos y productos se ven afectados cuando un elemento de la cadena
              deja de estar disponible. El análisis considera también el stock de los suministros.
            </p>
          </div>
        </div>

        <form onSubmit={manejarEnvio} className="flex flex-col sm:flex-row gap-3">
          <div ref={contenedorBusquedaRef} className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
            <input
              ref={inputBusquedaRef}
              type="text"
              role="combobox"
              aria-expanded={sugerenciasAbiertas && sugerencias.length > 0}
              aria-autocomplete="list"
              aria-controls="sugerencias-componentes"
              placeholder="Buscar por nombre o código (ej: tornillo, barra, INS-TORNILLO)..."
              value={terminoBusqueda}
              onChange={(e) => {
                setTerminoBusqueda(e.target.value);
                setSugerenciasAbiertas(true);
                setIndiceSugerencia(-1);
              }}
              onFocus={() => {
                if (terminoBusqueda.trim().length > 0) {
                  setSugerenciasAbiertas(true);
                }
              }}
              onKeyDown={manejarTeclasInput}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 transition-all font-sans"
            />

            {terminoBusqueda && (
              <button
                type="button"
                onClick={handleLimpiarBusqueda}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                title="Limpiar búsqueda"
              >
                <X size={15} />
              </button>
            )}

            {sugerenciasAbiertas && terminoBusqueda.trim().length > 0 && (
              <div
                id="sugerencias-componentes"
                role="listbox"
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-72 overflow-y-auto divide-y divide-slate-800/80"
              >
                {sugerencias.length > 0 ? (
                  sugerencias.map((elemento, index) => {
                    const estaSeleccionado = index === indiceSugerencia;
                    return (
                      <button
                        key={elemento.id}
                        type="button"
                        role="option"
                        aria-selected={estaSeleccionado}
                        onMouseEnter={() => setIndiceSugerencia(index)}
                        onClick={() => {
                          setTerminoBusqueda(
                            `${elemento.nombre} [${obtenerCodigoSku(elemento.id)}]`
                          );
                          setSugerenciasAbiertas(false);
                          setIndiceSugerencia(-1);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                          estaSeleccionado
                            ? 'bg-amber-500/20 text-white'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="p-1 rounded-md bg-slate-950 border border-slate-800 shrink-0">
                            {getTipoIcono(elemento.tipo)}
                          </span>
                          <div className="truncate">
                            <span className="text-xs font-semibold block truncate">
                              {elemento.nombre}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {obtenerCodigoSku(elemento.id)}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-950 text-slate-400 border border-slate-800 uppercase">
                          {etiquetaTipo(elemento.tipo)}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-slate-400 text-xs">
                    <p className="font-medium text-slate-300">
                      Sin coincidencias para &quot;{terminoBusqueda}&quot;
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Presiona Enter o el botón «Evaluar impacto» para consultar el código
                      exacto en el servidor.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={cargando || !terminoBusqueda.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {cargando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Analizando impacto...</span>
              </>
            ) : (
              <>
                <Zap size={16} />
                <span>Evaluar impacto</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History size={13} className="text-sky-400" />
              Últimos 10 análisis de impacto
            </span>
            <span className="text-[10px] text-slate-500">
              Los más recientes primero · haz clic para volver a evaluar
            </span>
          </div>

          {historial.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-[11px] text-slate-500">
              Todavía no se han ejecutado análisis de impacto. Selecciona un elemento y presiona
              «Evaluar impacto».
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {historial.map((analisis) => (
                <button
                  key={`${analisis.elementoId}-${analisis.fecha}`}
                  type="button"
                  onClick={() => ejecutarConsulta(analisis.elementoId)}
                  className={`rounded-xl border p-2.5 text-left transition-colors ${
                    resultado?.elemento.id === analisis.elementoId
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                  title={`Volver a evaluar ${analisis.nombre}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-semibold text-slate-200">
                      {analisis.nombre}
                    </span>
                    {getTipoIcono(analisis.tipo)}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className="font-mono text-[9px] text-sky-400">
                      {obtenerCodigoSku(analisis.elementoId)}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        analisis.total > 0
                          ? 'bg-red-500/10 text-red-300'
                          : 'bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      {analisis.total} afectado(s)
                    </span>
                  </div>
                  <span className="mt-1 block text-[9px] text-slate-500">
                    {formatearFechaHora(analisis.fecha)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {errorConsulta && (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-sm text-red-400">
            <AlertTriangle size={18} />
            <span>Atención: no fue posible completar el análisis de impacto</span>
          </div>
          <p className="text-xs text-red-200">{errorConsulta}</p>
          <div className="text-[11px] text-red-400/80 flex items-center gap-1.5 pt-1">
            <Info size={13} />
            <span>
              {errorCodigo === 'ELEMENTO_NO_ENCONTRADO'
                ? 'El elemento consultado no se encuentra registrado en el catálogo.'
                : errorCodigo === 'IDENTIFICADOR_INVALIDO'
                  ? 'El formato del identificador contiene caracteres no permitidos.'
                  : 'La operación fue rechazada por el servidor conforme a las reglas del sistema.'}
            </span>
          </div>
        </div>
      )}

      {!resultado && !cargando && !errorConsulta && (
        <div className="glass-card p-8 rounded-2xl text-center space-y-3 border border-slate-800">
          <Sparkles size={30} className="mx-auto text-amber-400" />
          <h3 className="text-sm font-bold text-white">Comienza un análisis de impacto</h3>
          <p className="mx-auto max-w-xl text-xs leading-relaxed text-slate-400">
            Busca un proveedor, suministro, proceso o producto y presiona el botón
            «Evaluar impacto». También puedes abrir la ficha de un elemento desde
            Materiales y procesos y lanzar el análisis desde allí.
          </p>
        </div>
      )}

      {resultado && (
        <div className="space-y-4 animate-in fade-in">
          <div className="glass-card p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Punto de partida del análisis
              </span>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                  {getTipoIcono(resultado.elemento.tipo)}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">{resultado.elemento.nombre}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-sky-400">
                      {obtenerCodigoSku(resultado.elemento.id)}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400 font-medium">
                      {etiquetaTipo(resultado.elemento.tipo)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
              <div className="text-right mr-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Severidad operativa
                </span>
                <p
                  className={`text-base font-black ${
                    resultado.total > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {resultado.total > 0
                    ? `${resultado.total} ${resultado.total === 1 ? 'elemento afectado' : 'elementos afectados'}`
                    : 'Sin afectación en cadena'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopiarInforme}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title="Copiar el informe del análisis al portapapeles"
              >
                {copiadoInforme ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                <span>{copiadoInforme ? '¡Copiado!' : 'Copiar informe'}</span>
              </button>

              {onSeleccionarElementoEnGrafo && (
                <button
                  type="button"
                  onClick={() =>
                    onSeleccionarElementoEnGrafo(
                      resultado.elemento.id,
                      resultado.afectados.map((afectado) => afectado.id)
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                  title="Ver la ruta de afectación resaltada en el mapa de la cadena"
                >
                  <Network size={15} />
                  <span>Ver en el mapa</span>
                </button>
              )}
            </div>
          </div>

          {resultado.elemento.tipo === 'INSUMO' && (
            <div className="max-w-xl">
              <TarjetaStockInline resultado={resultado} />
            </div>
          )}

          {resultado.total === 0 ? (
            <div className="glass-card p-6 rounded-2xl text-center space-y-3 border border-emerald-500/20 bg-emerald-500/5">
              <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                Sin afectación en la cadena
              </h3>
              <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
                El elemento <span className="font-semibold text-white">{resultado.elemento.nombre}</span>{' '}
                no habilita a otros procesos o productos. Si deja de estar disponible, no
                detiene otras estaciones ni productos de la cadena.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {resultado.resumenStock.suministrosBajoMinimo > 0 && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-200">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-400" />
                  <div>
                    <p className="font-bold">Alerta de stock en el análisis</p>
                    <p className="mt-0.5 leading-relaxed">
                      {resultado.resumenStock.suministrosBajoMinimo} suministro(s) involucrado(s)
                      están por debajo del nivel mínimo aceptable. El impacto puede ser
                      inmediato y conviene priorizar su reposición.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-400">
                    Suministros afectados
                  </span>
                  <p className="text-2xl font-black text-white">{insumosAfectados.length}</p>
                  <p className="text-[11px] text-slate-400">Suministros que dependen de este origen</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-purple-400">
                    Procesos afectados
                  </span>
                  <p className="text-2xl font-black text-white">{procesosAfectados.length}</p>
                  <p className="text-[11px] text-slate-400">Estaciones de trabajo que se detienen</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-red-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-red-400">
                    Productos afectados
                  </span>
                  <p className="text-2xl font-black text-white">{productosAfectados.length}</p>
                  <p className="text-[11px] text-slate-400">Artículos finales que no se pueden despachar</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <ArrowRight size={14} className="text-red-400" />
                    Elementos afectados ({resultado.total})
                  </h4>

                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setFiltroTipoAfectados('TODOS')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        filtroTipoAfectados === 'TODOS'
                          ? 'bg-slate-800 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Todos ({resultado.total})
                    </button>
                    {insumosAfectados.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFiltroTipoAfectados('INSUMO')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          filtroTipoAfectados === 'INSUMO'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400 hover:text-amber-300'
                        }`}
                      >
                        Suministros ({insumosAfectados.length})
                      </button>
                    )}
                    {procesosAfectados.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFiltroTipoAfectados('PROCESO')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          filtroTipoAfectados === 'PROCESO'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'text-slate-400 hover:text-purple-300'
                        }`}
                      >
                        Procesos ({procesosAfectados.length})
                      </button>
                    )}
                    {productosAfectados.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFiltroTipoAfectados('PRODUCTO')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          filtroTipoAfectados === 'PRODUCTO'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-slate-400 hover:text-emerald-300'
                        }`}
                      >
                        Productos ({productosAfectados.length})
                      </button>
                    )}
                  </div>
                </div>

                {afectadosFiltrados.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {afectadosFiltrados.map((afectado, indice) => (
                      <button
                        key={afectado.id}
                        type="button"
                        onClick={() => onConsultarAfectado(afectado.id)}
                        className={`p-4 rounded-xl bg-slate-900 border text-left transition-colors space-y-2 relative overflow-hidden group ${
                          afectado.alertaStock
                            ? 'border-red-500/30 hover:border-red-500/50'
                            : 'border-red-500/20 hover:border-red-500/40'
                        }`}
                        title={`Consultar información de ${afectado.nombre}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            Elemento #{indice + 1}
                          </span>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800">
                            {getTipoIcono(afectado.tipo)}
                            <span>{etiquetaTipo(afectado.tipo)}</span>
                          </div>
                        </div>
                        <div className="font-mono text-xs font-bold text-red-300">
                          {obtenerCodigoSku(afectado.id)}
                        </div>
                        <div className="text-xs font-medium text-slate-200 truncate">
                          {afectado.nombre}
                        </div>
                        {afectado.tipo === 'INSUMO' && (
                          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1 text-[10px]">
                            <span className="text-slate-400">
                              Stock {afectado.stockDisponible ?? 0} / mín. {afectado.stockMinimo ?? 0}
                            </span>
                            {afectado.alertaStock && (
                              <span className="flex items-center gap-1 font-bold text-red-400">
                                <AlertTriangle size={10} />
                                Alerta
                              </span>
                            )}
                          </div>
                        )}
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-400 opacity-80 group-hover:opacity-100">
                          <Info size={11} />
                          Ver detalle
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                    No se registran elementos de la categoría seleccionada en esta cadena de
                    afectación.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TarjetaStockInline: React.FC<{ resultado: ImpactoRespuesta }> = ({ resultado }) => {
  const { elemento } = resultado;
  const bajoMinimo = elemento.alertaStock;

  return (
    <div
      className={`rounded-2xl border p-4 space-y-2 ${
        bajoMinimo ? 'border-red-500/30 bg-red-950/30' : 'border-slate-800 bg-slate-950/70'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Package size={14} className={bajoMinimo ? 'text-red-400' : 'text-amber-400'} />
          Stock del suministro analizado
        </span>
        <span
          className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
            bajoMinimo
              ? 'border-red-500/25 bg-red-500/10 text-red-300'
              : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {bajoMinimo ? 'Bajo el mínimo' : 'Stock suficiente'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-300">
        <span>
          Disponible: <strong className="text-white">{elemento.stockDisponible ?? 0}</strong> unidades
        </span>
        <span>
          Mínimo aceptable: <strong className="text-white">{elemento.stockMinimo ?? 0}</strong> unidades
        </span>
      </div>
      <p className={`text-[11px] leading-relaxed ${bajoMinimo ? 'text-red-200' : 'text-slate-400'}`}>
        {bajoMinimo
          ? 'El suministro ya está por debajo del mínimo aceptable: el impacto sobre la cadena puede ser inmediato.'
          : 'El stock disponible puede mantener la operación mientras se repone el suministro. El impacto se materializa al agotarse.'}
      </p>
    </div>
  );
};
