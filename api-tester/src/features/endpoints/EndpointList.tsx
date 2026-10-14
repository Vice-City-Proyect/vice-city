import React, { useState, useMemo } from 'react';
import { Search, Filter, ChevronRight, Hash, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MethodBadge } from '../../components/MethodBadge';
import { HttpMethod, EndpointItem } from '../../types/openapi';
import { generateExampleFromSchema } from '../../services/spec-parser';

export const EndpointList: React.FC = () => {
  const { endpoints, selectedEndpoint, setSelectedEndpoint, allTags, setRequestDraft } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  const methodsList = ['ALL', 'GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

  // Filtrado de endpoints
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ep.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ep.tag.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMethod = selectedMethod === 'ALL' || ep.method === selectedMethod;
      const matchTag = selectedTag === 'ALL' || ep.tag === selectedTag;

      return matchSearch && matchMethod && matchTag;
    });
  }, [endpoints, searchTerm, selectedMethod, selectedTag]);

  // Agrupación por tag
  const groupedEndpoints = useMemo(() => {
    const groups = new Map<string, EndpointItem[]>();
    for (const ep of filteredEndpoints) {
      if (!groups.has(ep.tag)) {
        groups.set(ep.tag, []);
      }
      groups.get(ep.tag)!.push(ep);
    }
    return Array.from(groups.entries());
  }, [filteredEndpoints]);

  const handleSelectEndpoint = (ep: EndpointItem) => {
    setSelectedEndpoint(ep);

    // Preparar borrador inicial a partir de parámetros y esquema
    const initialPathParams: Record<string, string> = {};
    const initialQueryParams: Record<string, string> = {};

    for (const param of ep.parameters) {
      if (param.in === 'path') {
        initialPathParams[param.name] = param.example ? String(param.example) : '';
      } else if (param.in === 'query') {
        initialQueryParams[param.name] = param.example ? String(param.example) : '';
      }
    }

    // Preparar body de ejemplo si existe
    let initialBody = '';
    const jsonContent = ep.requestBody?.content?.['application/json'];
    if (jsonContent?.example) {
      initialBody = JSON.stringify(jsonContent.example, null, 2);
    } else if (jsonContent?.schema) {
      const generated = generateExampleFromSchema(jsonContent.schema);
      if (generated) {
        initialBody = JSON.stringify(generated, null, 2);
      }
    }

    setRequestDraft({
      pathParams: initialPathParams,
      queryParams: initialQueryParams,
      headers: {
        'Content-Type': 'application/json',
      },
      body: initialBody,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border-r border-slate-800">
      {/* Search and Filters Header */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por ruta, descripción o tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 text-slate-200 placeholder-slate-500 pl-9 pr-4 py-2 rounded-lg text-xs border border-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
        </div>

        {/* Method Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {methodsList.map((m) => {
            const isSelected = selectedMethod === m;
            return (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold tracking-wide transition-all ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>

        {/* Tag Category Dropdown */}
        {allTags.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full bg-slate-950 text-slate-300 py-1.5 px-2.5 rounded text-xs border border-slate-800 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todas las Categorías ({endpoints.length})</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Endpoint List Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {filteredEndpoints.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <Layers className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-400">No se encontraron endpoints</p>
            <p className="text-[11px] text-slate-500">
              Prueba cambiando los filtros o el término de búsqueda.
            </p>
          </div>
        ) : (
          groupedEndpoints.map(([tag, tagEndpoints]) => (
            <div key={tag} className="space-y-1.5">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-cyan-400" />
                  {tag}
                </span>
                <span className="font-mono text-[10px] text-slate-500 font-normal">
                  {tagEndpoints.length}
                </span>
              </div>

              <div className="space-y-1">
                {tagEndpoints.map((ep) => {
                  const isSelected = selectedEndpoint?.id === ep.id;
                  return (
                    <button
                      key={ep.id}
                      onClick={() => handleSelectEndpoint(ep)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 group ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/40'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="pt-0.5">
                        <MethodBadge method={ep.method} size="sm" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-medium truncate tracking-tight text-slate-200 group-hover:text-cyan-300">
                          {ep.path}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
                          {ep.summary}
                        </p>
                      </div>

                      <ChevronRight
                        className={`w-3.5 h-3.5 mt-1 transition-transform ${
                          isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

