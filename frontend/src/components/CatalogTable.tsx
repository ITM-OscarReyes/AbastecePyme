import React, { useState } from 'react';
import type { Elemento, TipoElemento } from '../types';
import { AlertTriangle, Download, Filter, LayoutGrid, Search, Table as TableIcon, Zap } from 'lucide-react';
import { obtenerCodigoSku } from '../utils/sku';
import { etiquetaTipo } from '../utils/etiquetas';

interface CatalogTableProps {
  elementos: Elemento[];
  onConsultarElemento?: (id: string) => void;
  onConsultarImpacto?: (id: string) => void;
}

export const CatalogTable: React.FC<CatalogTableProps> = ({
  elementos,
  onConsultarElemento,
  onConsultarImpacto
}) => {
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [modoVista, setModoVista] = useState<'tabla' | 'tarjetas'>('tabla');

  const handleExportarCsv = () => {
    if (!elementos || elementos.length === 0) return;

    const encabezados = [
      'ID',
      'Tipo',
      'Nombre',
      'Descripcion',
      'StockDisponible',
      'StockMinimo',
      'EstadoStock'
    ];
    const filas = elementos.map((el) => {
      const escaparCsv = (valor: string) => `"${(valor || '').replace(/"/g, '""')}"`;

      return [
        escaparCsv(el.id),
        escaparCsv(etiquetaTipo(el.tipo)),
        escaparCsv(el.nombre),
        escaparCsv(el.descripcion || ''),
        escaparCsv(el.stockDisponible === null ? '' : String(el.stockDisponible)),
        escaparCsv(el.stockMinimo === null ? '' : String(el.stockMinimo)),
        escaparCsv(el.estadoStock)
      ].join(',');
    });

    const contenidoCsv = '\uFEFF' + [encabezados.join(','), ...filas].join('\r\n');
    const blob = new Blob([contenidoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `abastecepyme-catalogo-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const elementosFiltrados = elementos.filter((elemento) => {
    const coincideTipo = filtroTipo === 'TODOS' || elemento.tipo === filtroTipo;
    const termino = busqueda.toLowerCase();
    const coincideBusqueda =
      elemento.id.toLowerCase().includes(termino) ||
      elemento.nombre.toLowerCase().includes(termino) ||
      (elemento.descripcion && elemento.descripcion.toLowerCase().includes(termino));
    return coincideTipo && coincideBusqueda;
  });

  const getTipoBadge = (tipo: TipoElemento) => {
    switch (tipo) {
      case 'PROVEEDOR':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">PROVEEDOR</span>;
      case 'INSUMO':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">SUMINISTRO</span>;
      case 'PROCESO':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">PROCESO</span>;
      case 'PRODUCTO':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">PRODUCTO</span>;
    }
  };

  const getStock = (elemento: Elemento) => {
    if (elemento.tipo !== 'INSUMO') {
      return <span className="text-slate-600">—</span>;
    }
    return (
      <div className="flex flex-col gap-0.5">
        <span className={elemento.alertaStock ? 'font-bold text-red-300' : 'text-slate-200'}>
          {elemento.stockDisponible ?? 0} / mín. {elemento.stockMinimo ?? 0}
        </span>
        {elemento.alertaStock && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
            <AlertTriangle size={11} />
            Bajo el mínimo
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-bold text-white">Materiales, suministros y procesos</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Consulta la ficha de cada elemento, su inventario y sus relaciones. Haz clic en una
            fila o tarjeta para abrir su información detallada.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 transition-all font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1 flex-1 sm:flex-none">
              <Filter size={14} className="text-slate-500 ml-1.5" />
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="bg-transparent text-xs text-slate-300 font-medium border-none focus:ring-0 pr-2 cursor-pointer"
              >
                <option value="TODOS" className="bg-slate-900 text-white">Todas las categorías</option>
                <option value="PROVEEDOR" className="bg-slate-900 text-white">🏢 Proveedores</option>
                <option value="INSUMO" className="bg-slate-900 text-white">📦 Suministros / Materias</option>
                <option value="PROCESO" className="bg-slate-900 text-white">⚙️ Procesos de fábrica</option>
                <option value="PRODUCTO" className="bg-slate-900 text-white">🏆 Productos finales</option>
              </select>
            </div>

            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={handleExportarCsv}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold cursor-pointer"
                title="Exportar catálogo e inventario a CSV compatible con Excel"
              >
                <Download size={14} className="text-emerald-400" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <div className="w-[1px] h-4 bg-slate-800 mx-1" />
              <button
                onClick={() => setModoVista('tabla')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${modoVista === 'tabla' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Vista de tabla detallada"
              >
                <TableIcon size={16} />
              </button>
              <button
                onClick={() => setModoVista('tarjetas')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${modoVista === 'tarjetas' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Vista de tarjetas rápidas"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {modoVista === 'tabla' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 text-[11px] uppercase font-semibold border-b border-slate-800">
                <th className="py-3 px-4">ID (Código Único)</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Descripción</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs text-slate-300 font-medium">
              {elementosFiltrados.map((elemento) => (
                <tr
                  key={elemento.id}
                  onClick={() => onConsultarElemento?.(elemento.id)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                    {obtenerCodigoSku(elemento.id)}
                  </td>
                  <td className="py-3.5 px-4">{getTipoBadge(elemento.tipo)}</td>
                  <td className="py-3.5 px-4 text-white font-semibold">{elemento.nombre}</td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                    {elemento.descripcion || '—'}
                  </td>
                  <td className="py-3.5 px-4">{getStock(elemento)}</td>
                  <td className="py-3.5 px-4 text-right">
                    {onConsultarImpacto && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConsultarImpacto(elemento.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
                        title={`Evaluar impacto de ${elemento.nombre}`}
                      >
                        <Zap size={13} />
                        <span>Evaluar impacto</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {elementosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No se encontraron elementos con el filtro aplicado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {elementosFiltrados.map((elemento) => (
            <div
              key={elemento.id}
              onClick={() => onConsultarElemento?.(elemento.id)}
              className={`bg-slate-950 border p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg space-y-3 flex flex-col justify-between ${
                elemento.alertaStock
                  ? 'border-red-500/30 hover:border-red-500/50'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-400">
                    {obtenerCodigoSku(elemento.id)}
                  </span>
                  <div className="flex items-center gap-1">{getTipoBadge(elemento.tipo)}</div>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">{elemento.nombre}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {elemento.descripcion || 'Sin descripción adicional.'}
                </p>
                {elemento.tipo === 'INSUMO' && (
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-[11px]">
                    <span className="text-slate-400">
                      Stock: {elemento.stockDisponible ?? 0} / mín. {elemento.stockMinimo ?? 0}
                    </span>
                    {elemento.alertaStock && (
                      <span className="flex items-center gap-1 font-bold text-red-400">
                        <AlertTriangle size={12} />
                        Alerta
                      </span>
                    )}
                  </div>
                )}
              </div>

              {onConsultarImpacto && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConsultarImpacto(elemento.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
                  >
                    <Zap size={13} />
                    <span>Evaluar impacto</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
