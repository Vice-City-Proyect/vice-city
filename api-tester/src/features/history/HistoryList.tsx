import React, { useState } from 'react';
import {
  History,
  Trash2,
  Play,
  Search,
  Filter,
  Clock,
  ExternalLink,
  Shield,
  Layers,
  Inbox,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MethodBadge } from '../../components/MethodBadge';
import { StatusBadge } from '../../components/StatusBadge';
import { HistoryItem } from '../../types/history';

export const HistoryList: React.FC = () => {
  const { history, clearHistory, loadHistoryIntoBuilder } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod =
      selectedMethod === 'ALL' || item.method.toUpperCase() === selectedMethod;
    return matchesSearch && matchesMethod;
  });

  const handleConfirmClear = () => {
    if (window.confirm('¿Estás seguro de que deseas vaciar todo el historial de peticiones?')) {
      clearHistory();
      setSelectedItem(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* HEADER Y ACCIONES */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <History className="w-5 h-5 text-cyan-400" />
            <span>Historial de Ejecuciones ({history.length})</span>
          </h2>
          <p className="text-xs text-slate-400">
            Registro cronológico de peticiones realizadas contra el backend local.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleConfirmClear}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-950/40 hover:bg-red-900/60 border border-red-900/60 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar Historial</span>
          </button>
        )}
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por endpoint o URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-1">
          {['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMethod(m)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedMethod === m
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-transparent'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: LISTA O DETALLE */}
      {filteredHistory.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-500 space-y-3">
          <Inbox className="w-10 h-10 text-slate-700" />
          <p className="text-xs">
            {history.length === 0
              ? 'Aún no se han ejecutado peticiones en esta sesión.'
              : 'No hay peticiones que coincidan con los filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
          {/* TABLA DE PETICIONES */}
          <div className="lg:col-span-7 bg-slate-900/80 rounded-xl border border-slate-800 overflow-auto">
            <div className="divide-y divide-slate-800/80">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                    selectedItem?.id === item.id
                      ? 'bg-slate-850 border-l-2 border-cyan-500'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <MethodBadge method={item.method} />
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-medium text-slate-200 truncate">
                        {item.path}
                      </p>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                        <span>{formatDate(item.timestamp)}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{item.durationMs}ms</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <StatusBadge status={item.status} statusText={item.statusText} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadHistoryIntoBuilder(item);
                      }}
                      className="p-1.5 hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors"
                      title="Cargar de nuevo en el Constructor de Peticiones"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INSPECTOR DEL ÍTEM SELECCIONADO */}
          <div className="lg:col-span-5 bg-slate-900/80 rounded-xl border border-slate-800 overflow-auto p-4 space-y-4">
            {selectedItem ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <MethodBadge method={selectedItem.method} />
                    <StatusBadge
                      status={selectedItem.status}
                      statusText={selectedItem.statusText}
                    />
                  </div>
                  <button
                    onClick={() => loadHistoryIntoBuilder(selectedItem)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-sans font-semibold transition-colors shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Cargar en Constructor</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider">
                    URL Completa:
                  </span>
                  <p className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 break-all select-text">
                    {selectedItem.url}
                  </p>
                </div>

                {selectedItem.request.body && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider">
                      Cuerpo de la Petición:
                    </span>
                    <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto max-h-48 text-[11px] select-text">
                      {typeof selectedItem.request.body === 'string'
                        ? selectedItem.request.body
                        : JSON.stringify(selectedItem.request.body, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider">
                    Respuesta del Backend:
                  </span>
                  <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto max-h-60 text-[11px] select-text">
                    {selectedItem.response?.data !== undefined
                      ? typeof selectedItem.response.data === 'string'
                        ? selectedItem.response.data
                        : JSON.stringify(selectedItem.response.data, null, 2)
                      : 'Sin contenido en la respuesta'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 p-8">
                <Layers className="w-8 h-8 text-slate-700" />
                <p className="text-xs">Selecciona una petición de la lista para ver su detalle.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

