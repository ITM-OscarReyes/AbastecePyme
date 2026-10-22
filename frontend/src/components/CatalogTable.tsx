import React, { useState } from 'react';
import type { Elemento, TipoElemento } from '../types';
import { Search, Filter, LayoutGrid, Table as TableIcon } from 'lucide-react';

interface CatalogTableProps {
  elementos: Elemento[];
  onSelectNode?: (id: string) => void;
}

export const CatalogTable: React.FC<CatalogTableProps> = ({ elementos, onSelectNode }) => {
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [modoVista, setModoVista] = useState<'tabla' | 'tarjetas'>('tabla');

  const elementosFiltrados = elementos.filter(e => {
    const coincideTipo = filtroTipo === 'TODOS' || e.tipo === filtroTipo;
    const coincideBusqueda = 
      e.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.descripcion && e.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    return coincideTipo && coincideBusqueda;
  });

  const getTipoBadge = (tipo: TipoElemento) => {
    switch (tipo) {
      case 'PROVEEDOR':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">PROVEEDOR</span>;
      case 'INSUMO':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">INSUMO</span>;
      case 'PROCESO':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">PROCESO</span>;
      case 'PRODUCTO':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">PRODUCTO</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Controles de búsqueda y filtros */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por ID o nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
            <Filter size={14} className="text-slate-500 ml-1.5" />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-transparent text-xs text-slate-300 font-medium border-none focus:ring-0 pr-2 cursor-pointer"
            >
              <option value="TODOS" className="bg-slate-900 text-white">Todos los tipos</option>
              <option value="PROVEEDOR" className="bg-slate-900 text-white">Proveedores</option>
              <option value="INSUMO" className="bg-slate-900 text-white">Insumos</option>
              <option value="PROCESO" className="bg-slate-900 text-white">Procesos</option>
              <option value="PRODUCTO" className="bg-slate-900 text-white">Productos</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setModoVista('tabla')}
              className={`p-1.5 rounded-lg transition-colors ${modoVista === 'tabla' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Vista de Tabla"
            >
              <TableIcon size={16} />
            </button>
            <button
              onClick={() => setModoVista('tarjetas')}
              className={`p-1.5 rounded-lg transition-colors ${modoVista === 'tarjetas' ? 'bg-slate-800 text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Renderizado de Datos */}
      {modoVista === 'tabla' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 text-[11px] uppercase font-semibold border-b border-slate-800">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Nombre</th>
                <th className="py-3 px-4">Descripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs text-slate-300 font-medium">
              {elementosFiltrados.map((el) => (
                <tr
                  key={el.id}
                  onClick={() => onSelectNode?.(el.id)}
                  className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-sky-400">{el.id}</td>
                  <td className="py-3 px-4">{getTipoBadge(el.tipo)}</td>
                  <td className="py-3 px-4 text-white font-semibold">{el.nombre}</td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{el.descripcion || '—'}</td>
                </tr>
              ))}
              {elementosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                    No se encontraron elementos con el filtro aplicado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {elementosFiltrados.map((el) => (
            <div
              key={el.id}
              onClick={() => onSelectNode?.(el.id)}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:shadow-lg space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-sky-400">{el.id}</span>
                {getTipoBadge(el.tipo)}
              </div>
              <h4 className="text-sm font-bold text-white leading-snug">{el.nombre}</h4>
              <p className="text-xs text-slate-400 line-clamp-2">{el.descripcion || 'Sin descripción.'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
