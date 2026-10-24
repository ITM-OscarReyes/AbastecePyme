import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Elemento, ImpactoRespuesta } from '../types';
import { apiService, extraerMensajeError } from '../services/api';
import { obtenerCodigoSku } from '../utils/sku';
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
  X
} from 'lucide-react';

interface VistaImpactoProps {
  elementos: Elemento[];
  idInicial?: string | null;
  onSeleccionarElementoEnGrafo?: (id: string, afectadosIds: string[]) => void;
}

// Función pura para extraer y resolver el identificador técnico exacto del catálogo
const extraerIdObjetivo = (texto: string, listaElementos: Elemento[]): string => {
  const q = texto.trim();
  if (!q) return '';

  // 1. Si contiene formato con corchetes o paréntesis: "Nombre [ID]" o "Nombre (ID)" o "[ID]" o "(ID)"
  const matchAislado = q.match(/[[(]([A-Za-z0-9_-]+)[\])]/);
  if (matchAislado) {
    const idEncontrado = matchAislado[1].toUpperCase();
    const existe = listaElementos.find(
      (el) => el.id.toUpperCase() === idEncontrado || obtenerCodigoSku(el.id).toUpperCase() === idEncontrado
    );
    return existe ? existe.id : idEncontrado;
  }

  // 2. Coincidencia exacta por ID o SKU (insensible a mayúsculas/minúsculas)
  const matchIdExacto = listaElementos.find(
    (el) => el.id.toLowerCase() === q.toLowerCase() || obtenerCodigoSku(el.id).toLowerCase() === q.toLowerCase()
  );
  if (matchIdExacto) return matchIdExacto.id;

  // 3. Coincidencia exacta por Nombre (insensible a mayúsculas/minúsculas)
  const matchNombreExacto = listaElementos.find((el) => el.nombre.toLowerCase() === q.toLowerCase());
  if (matchNombreExacto) return matchNombreExacto.id;

  // 4. Si el texto escrito contiene el ID, el SKU o el nombre de algún elemento
  const matchContenido = listaElementos.find((el) =>
    q.toLowerCase().includes(el.id.toLowerCase()) ||
    q.toLowerCase().includes(obtenerCodigoSku(el.id).toLowerCase()) ||
    q.toLowerCase().includes(el.nombre.toLowerCase())
  );
  if (matchContenido) return matchContenido.id;

  // 5. Búsqueda parcial: el elemento contiene el texto escrito
  const matchParcial = listaElementos.find((el) =>
    el.id.toLowerCase().includes(q.toLowerCase()) ||
    obtenerCodigoSku(el.id).toLowerCase().includes(q.toLowerCase()) ||
    el.nombre.toLowerCase().includes(q.toLowerCase())
  );
  if (matchParcial) return matchParcial.id;

  // 6. Búsqueda por SKU numérico correlativo (ej: INS-01, INS-0001, PROV-01, PROD-02)
  const matchSku = q.toUpperCase().match(/^(PROV|INS|PROC|PROD)[-_]?0*([1-9]\d*)$/);
  if (matchSku) {
    const pref = matchSku[1];
    const indice = parseInt(matchSku[2], 10) - 1;
    const delTipo = listaElementos.filter((el) => el.tipo.startsWith(pref));
    if (delTipo[indice]) return delTipo[indice].id;
  }

  // 7. Si no coincide con nada, extraer únicamente caracteres válidos de identificador técnico
  const idSanitizado = q.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase();
  return idSanitizado || q.toUpperCase();
};

export const VistaImpacto: React.FC<VistaImpactoProps> = ({
  elementos,
  idInicial,
  onSeleccionarElementoEnGrafo
}) => {
  const [terminoBusqueda, setTerminoBusqueda] = useState<string>(() => {
    if (!idInicial) return '';
    const encontrado = elementos.find((el) => el.id === idInicial);
    return encontrado ? `${encontrado.nombre} [${obtenerCodigoSku(encontrado.id)}]` : idInicial;
  });
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState<boolean>(false);
  const [indiceSugerencia, setIndiceSugerencia] = useState<number>(-1);
  const [cargando, setCargando] = useState<boolean>(false);
  const [resultado, setResultado] = useState<ImpactoRespuesta | null>(null);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [copiadoMinuta, setCopiadoMinuta] = useState<boolean>(false);
  const [filtroTipoAfectados, setFiltroTipoAfectados] = useState<'TODOS' | 'INSUMO' | 'PROCESO' | 'PRODUCTO'>('TODOS');

  const contenedorBusquedaRef = useRef<HTMLDivElement>(null);
  const inputBusquedaRef = useRef<HTMLInputElement>(null);

  const consultarImpacto = useCallback(async (id: string) => {
    const idLimpio = id.trim();
    if (!idLimpio) return;

    setCargando(true);
    setErrorConsulta(null);
    setErrorCodigo(null);
    setResultado(null);

    try {
      const data = await apiService.obtenerImpacto(idLimpio);
      setResultado(data);
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
  }, []);

  // Coincidencias en tiempo real por ID, SKU, nombre o tipo (insensible a mayúsculas/minúsculas)
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

  // Ordenar componentes según el flujo natural de abastecimiento (Proveedor -> Insumo -> Proceso -> Producto)
  const elementosOrdenadosPorFlujo = useMemo(() => {
    const ordenTipo: Record<string, number> = { PROVEEDOR: 1, INSUMO: 2, PROCESO: 3, PRODUCTO: 4 };
    return [...elementos].sort((a, b) => {
      const pesoA = ordenTipo[a.tipo] || 99;
      const pesoB = ordenTipo[b.tipo] || 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return a.id.localeCompare(b.id);
    });
  }, [elementos]);

  const ejecutarConsulta = useCallback(
    (queryOId: string, etiquetaParaInput?: string) => {
      const idPuro = extraerIdObjetivo(queryOId, elementos);
      if (!idPuro) return;

      const elementoEncontrado = elementos.find((el) => el.id === idPuro);
      const textoAMostrar = etiquetaParaInput || (elementoEncontrado ? `${elementoEncontrado.nombre} [${obtenerCodigoSku(elementoEncontrado.id)}]` : idPuro);

      setTerminoBusqueda(textoAMostrar);
      setSugerenciasAbiertas(false);
      setIndiceSugerencia(-1);
      consultarImpacto(idPuro);
    },
    [elementos, consultarImpacto]
  );

  useEffect(() => {
    if (idInicial) {
      const elementoExistente = elementos.find((el) => el.id === idInicial);
      const etiqueta = elementoExistente ? `${elementoExistente.nombre} [${obtenerCodigoSku(elementoExistente.id)}]` : idInicial;
      setTerminoBusqueda(etiqueta);
      consultarImpacto(idInicial);
    }
  }, [idInicial, elementos, consultarImpacto]);

  // Cierre de sugerencias al hacer clic fuera del combobox
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
      ejecutarConsulta(seleccion.id, `${seleccion.nombre} [${obtenerCodigoSku(seleccion.id)}]`);
      return;
    }

    const idPuro = extraerIdObjetivo(q, elementos);
    const elementoResuelto = elementos.find((el) => el.id === idPuro);
    ejecutarConsulta(idPuro, elementoResuelto ? `${elementoResuelto.nombre} [${obtenerCodigoSku(elementoResuelto.id)}]` : idPuro);
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
    inputBusquedaRef.current?.focus();
  };

  const handleCopiarMinuta = async () => {
    if (!resultado) return;
    const insumosAfect = resultado.afectados.filter(a => a.tipo === 'INSUMO');
    const procesosAfect = resultado.afectados.filter(a => a.tipo === 'PROCESO');
    const productosAfect = resultado.afectados.filter(a => a.tipo === 'PRODUCTO');

    const textoMinuta = [
      `🚨 [ALERTA DE CONTINGENCIA OPERATIVA — ABASTECEPYME]`,
      `Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      `Componente Afectado: ${resultado.elemento.nombre} [${obtenerCodigoSku(resultado.elemento.id)}] (${resultado.elemento.tipo})`,
      `Severidad: ${resultado.total === 0 ? 'Sin riesgo en cadena (Elemento Terminal)' : `${resultado.total} componentes en riesgo`}`,
      resultado.total > 0 && insumosAfect.length > 0 ? `- Insumos Derivados: ${insumosAfect.map(a => `${a.nombre} [${obtenerCodigoSku(a.id)}]`).join(', ')}` : '',
      resultado.total > 0 && procesosAfect.length > 0 ? `- Procesos Paralizados: ${procesosAfect.map(a => `${a.nombre} [${obtenerCodigoSku(a.id)}]`).join(', ')}` : '',
      resultado.total > 0 && productosAfect.length > 0 ? `- Productos Comprometidos: ${productosAfect.map(a => `${a.nombre} [${obtenerCodigoSku(a.id)}]`).join(', ')}` : '',
      `Acción Requerida: ${resultado.total === 0 ? 'No se requiere contingencia.' : `Compras y Planta deben activar protocolo de suministro alternativo para ${obtenerCodigoSku(resultado.elemento.id)}.`}`
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(textoMinuta);
      setCopiadoMinuta(true);
      setTimeout(() => setCopiadoMinuta(false), 2500);
    } catch {
      // Ignorar si clipboard no está disponible
    }
  };

  const getTipoIcono = (tipo: string) => {
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

  const insumosAfectados = resultado?.afectados.filter(a => a.tipo === 'INSUMO') || [];
  const procesosAfectados = resultado?.afectados.filter(a => a.tipo === 'PROCESO') || [];
  const productosAfectados = resultado?.afectados.filter(a => a.tipo === 'PRODUCTO') || [];

  return (
    <div className="space-y-6">
      {/* Panel Superior: Contexto y Formulario de Simulación con Autocompletado */}
      <div className="glass-card p-6 rounded-2xl shadow-xl space-y-5 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Simulador de Continuidad & Ruptura de Suministro</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Gestión Operativa
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Simula en tiempo real la parada o retraso de un proveedor o insumo. El sistema analiza la cadena dirigida para advertir qué procesos de fábrica se detienen y qué productos para clientes se paralizan.
              </p>
            </div>
          </div>
        </div>

        {/* Formulario con Combobox Autocompletado Inteligente */}
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
              placeholder="Buscar por título, nombre o código (ej: tornillo, barra, INS-TORNILLO)..."
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

            {/* Menú Desplegable Flotante de Sugerencias Predictivas */}
            {sugerenciasAbiertas && terminoBusqueda.trim().length > 0 && (
              <div
                id="sugerencias-componentes"
                role="listbox"
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-72 overflow-y-auto divide-y divide-slate-800/80"
              >
                {sugerencias.length > 0 ? (
                  sugerencias.map((el, index) => {
                    const estaSeleccionado = index === indiceSugerencia;
                    return (
                      <button
                        key={el.id}
                        type="button"
                        role="option"
                        aria-selected={estaSeleccionado}
                        onMouseEnter={() => setIndiceSugerencia(index)}
                        onClick={() => ejecutarConsulta(el.id, `${el.nombre} [${obtenerCodigoSku(el.id)}]`)}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                          estaSeleccionado
                            ? 'bg-amber-500/20 text-white'
                            : 'hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="p-1 rounded-md bg-slate-950 border border-slate-800 shrink-0">
                            {getTipoIcono(el.tipo)}
                          </span>
                          <div className="truncate">
                            <span className="text-xs font-semibold block truncate">{el.nombre}</span>
                            <span className="text-[10px] font-mono text-slate-400">{obtenerCodigoSku(el.id)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-950 text-slate-400 border border-slate-800 uppercase">
                            {el.tipo}
                          </span>
                          <span className="text-[10px] text-amber-400/80 font-mono hidden sm:inline">
                            Enter ↵
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-slate-400 text-xs">
                    <p className="font-medium text-slate-300">Sin coincidencias locales para &quot;{terminoBusqueda}&quot;</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Presiona <kbd className="px-1 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-slate-400">Enter</kbd> para enviar la consulta exacta a la API del servidor.
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
                <ShieldAlert size={16} />
                <span>Simular Contingencia</span>
              </>
            )}
          </button>
        </form>

        {/* Acceso Directo a Componentes Registrados en Planta */}
        {elementos.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-sky-400" />
                Componentes Disponibles en Planta
              </span>
              <span className="text-[10px] text-slate-500">Haz clic para autocompletar y simular</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {elementosOrdenadosPorFlujo.map((el) => {
                const esActivo = resultado?.elemento.id === el.id;
                return (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => ejecutarConsulta(el.id, `${el.nombre} [${obtenerCodigoSku(el.id)}]`)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                      esActivo
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 shadow'
                        : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    {getTipoIcono(el.tipo)}
                    <span className="font-medium text-[11px]">{el.nombre}</span>
                    <span className="text-[10px] font-mono text-slate-500">({obtenerCodigoSku(el.id)})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Manejo de Excepciones de la API con lenguaje de negocio */}
      {errorConsulta && (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-sm text-red-400">
            <AlertTriangle size={18} />
            <span>Atención: No fue posible completar la simulación</span>
          </div>
          <p className="text-xs text-red-200">{errorConsulta}</p>
          <div className="text-[11px] text-red-400/80 flex items-center gap-1.5 pt-1">
            <Info size={13} />
            <span>
              {errorCodigo === 'ELEMENTO_NO_ENCONTRADO'
                ? 'El componente consultado no se encuentra registrado en el catálogo de planta.'
                : errorCodigo === 'IDENTIFICADOR_INVALIDO'
                ? 'El formato del identificador contiene caracteres no permitidos.'
                : 'La operación fue rechazada por el servidor conforme a las reglas del sistema.'}
            </span>
          </div>
        </div>
      )}

      {/* Resultado de la Simulación */}
      {resultado && (
        <div className="space-y-4 animate-in fade-in">
          {/* Ficha Ejecutiva del Componente Afectado */}
          <div className="glass-card p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Punto de Falla Simulado</span>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                  {getTipoIcono(resultado.elemento.tipo)}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">{resultado.elemento.nombre}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-sky-400">{obtenerCodigoSku(resultado.elemento.id)}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400 font-medium">Categoría: {resultado.elemento.tipo}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
              <div className="text-right mr-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Severidad Operativa</span>
                <p className={`text-base font-black ${resultado.total > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {resultado.total > 0 ? `${resultado.total} Componentes en Riesgo` : 'Sin Afectación en Cadena'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopiarMinuta}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title="Copiar reporte formal de contingencia al portapapeles para Compras y Planta"
              >
                {copiadoMinuta ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                <span>{copiadoMinuta ? '¡Copiado!' : 'Copiar Minuta'}</span>
              </button>

              {onSeleccionarElementoEnGrafo && (
                <button
                  type="button"
                  onClick={() =>
                    onSeleccionarElementoEnGrafo(
                      resultado.elemento.id,
                      resultado.afectados.map((a) => a.id)
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                  title="Ver la ruta de afectación resaltada en el mapa de planta"
                >
                  <Network size={15} />
                  <span>Ver en Mapa</span>
                </button>
              )}
            </div>
          </div>

          {/* Diagnóstico A: Sin Afectados (Total = 0) */}
          {resultado.total === 0 && (
            <div className="glass-card p-6 rounded-2xl text-center space-y-3 border border-emerald-500/20 bg-emerald-500/5">
              <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
              <h3 className="text-base font-bold text-white">Impacto Operativo Nulo (Elemento Terminal)</h3>
              <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
                El componente <span className="font-semibold text-white">{resultado.elemento.nombre}</span> no abastece ni habilita a otras estaciones de trabajo o productos en la fábrica. Si este elemento se retrasa, no paraliza ninguna otra línea de producción.
              </p>
            </div>
          )}

          {/* Diagnóstico B: Con Cadena de Afectados (Total > 0) */}
          {resultado.total > 0 && (
            <div className="space-y-4">
              {/* Tarjetas de Resumen por Departamento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-400">Insumos Derivados</span>
                  <p className="text-2xl font-black text-white">{insumosAfectados.length}</p>
                  <p className="text-[11px] text-slate-400">Materiales que dependen de este origen</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-purple-400">Procesos Paralizados</span>
                  <p className="text-2xl font-black text-white">{procesosAfectados.length}</p>
                  <p className="text-[11px] text-slate-400">Estaciones de trabajo que se frenan</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-red-500/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-red-400">Productos Comprometidos</span>
                  <p className="text-2xl font-black text-white">{productosAfectados.length}</p>
                  <p className="text-[11px] text-slate-400">Artículos finales sin poder despachar</p>
                </div>
              </div>

              {/* Listado Detallado de la Cadena con Filtro por Eslabón */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <ArrowRight size={14} className="text-red-400" />
                    Detalle de Componentes Alcanzados en Cascada ({resultado.total})
                  </h4>
                  
                  {/* Selector de Pestañas de Filtrado */}
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
                        Insumos ({insumosAfectados.length})
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

                {resultado.afectados.filter(af => filtroTipoAfectados === 'TODOS' || af.tipo === filtroTipoAfectados).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {resultado.afectados
                      .filter(af => filtroTipoAfectados === 'TODOS' || af.tipo === filtroTipoAfectados)
                      .map((af, idx) => (
                        <div
                          key={af.id}
                          className="p-4 rounded-xl bg-slate-900 border border-red-500/20 hover:border-red-500/40 transition-colors space-y-2 relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-500">Paso #{idx + 1}</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800">
                              {getTipoIcono(af.tipo)}
                              <span>{af.tipo}</span>
                            </div>
                          </div>
                          <div className="font-mono text-xs font-bold text-red-300">{obtenerCodigoSku(af.id)}</div>
                          <div className="text-xs font-medium text-slate-200 truncate">{af.nombre}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-4 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                    No se registran componentes de la categoría seleccionada en esta cadena de afectación.
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
