import React, { useState } from 'react';
import {
  Send,
  RotateCcw,
  Plus,
  Trash2,
  Code2,
  FileJson,
  Key,
  Globe,
  Sliders,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MethodBadge } from '../../components/MethodBadge';
import { executeHttpRequest } from '../../services/http-client';
import { generateExampleFromSchema } from '../../services/spec-parser';

export const RequestBuilder: React.FC = () => {
  const {
    selectedEndpoint,
    config,
    updateConfig,
    auth,
    requestDraft,
    setRequestDraft,
    setLastResult,
    isExecuting,
    setIsExecuting,
    addHistoryItem,
  } = useApp();

  const [activeBuilderTab, setActiveBuilderTab] = useState<'params' | 'headers' | 'body' | 'schema'>(
    'params'
  );

  const [jsonFormatError, setJsonFormatError] = useState<string | null>(null);

  if (!selectedEndpoint) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 space-y-3">
        <Code2 className="w-12 h-12 text-slate-700 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-400">Ningún endpoint seleccionado</h3>
        <p className="text-xs max-w-sm">
          Selecciona una operación en la barra lateral para inspeccionar sus parámetros y construir una petición.
        </p>
      </div>
    );
  }

  const hasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(selectedEndpoint.method);
  const pathParamNames = (selectedEndpoint.path.match(/\{([^}]+)\}/g) || []).map((m) =>
    m.replace(/[{}]/g, '')
  );

  // Manipulación de Path Params
  const handlePathParamChange = (name: string, val: string) => {
    setRequestDraft((prev) => ({
      ...prev,
      pathParams: { ...prev.pathParams, [name]: val },
    }));
  };

  // Manipulación de Query Params
  const queryParamEntries = Object.entries(requestDraft.queryParams);
  const handleQueryParamChange = (key: string, val: string) => {
    setRequestDraft((prev) => ({
      ...prev,
      queryParams: { ...prev.queryParams, [key]: val },
    }));
  };

  const handleAddQueryParam = () => {
    const key = `param_${Date.now()}`;
    setRequestDraft((prev) => ({
      ...prev,
      queryParams: { ...prev.queryParams, [key]: '' },
    }));
  };

  const handleRemoveQueryParam = (key: string) => {
    setRequestDraft((prev) => {
      const copy = { ...prev.queryParams };
      delete copy[key];
      return { ...prev, queryParams: copy };
    });
  };

  // Manipulación de Headers
  const headerEntries = Object.entries(requestDraft.headers);
  const handleHeaderChange = (key: string, val: string) => {
    setRequestDraft((prev) => ({
      ...prev,
      headers: { ...prev.headers, [key]: val },
    }));
  };

  const handleAddHeader = () => {
    const key = `header_${Date.now()}`;
    setRequestDraft((prev) => ({
      ...prev,
      headers: { ...prev.headers, [key]: '' },
    }));
  };

  const handleRemoveHeader = (key: string) => {
    setRequestDraft((prev) => {
      const copy = { ...prev.headers };
      delete copy[key];
      return { ...prev, headers: copy };
    });
  };

  // Formatear JSON en el editor
  const handleFormatJson = () => {
    if (!requestDraft.body.trim()) return;
    try {
      const parsed = JSON.parse(requestDraft.body);
      const formatted = JSON.stringify(parsed, null, 2);
      setRequestDraft((prev) => ({ ...prev, body: formatted }));
      setJsonFormatError(null);
    } catch (err: any) {
      setJsonFormatError(err.message || 'JSON inválido');
    }
  };

  // Rellenar con ejemplo OpenAPI
  const handleLoadSchemaExample = () => {
    const jsonContent = selectedEndpoint.requestBody?.content?.['application/json'];
    if (jsonContent?.example) {
      setRequestDraft((prev) => ({
        ...prev,
        body: JSON.stringify(jsonContent.example, null, 2),
      }));
      setJsonFormatError(null);
    } else if (jsonContent?.schema) {
      const generated = generateExampleFromSchema(jsonContent.schema);
      if (generated) {
        setRequestDraft((prev) => ({
          ...prev,
          body: JSON.stringify(generated, null, 2),
        }));
        setJsonFormatError(null);
      }
    }
  };

  // Limpiar formulario
  const handleResetForm = () => {
    setRequestDraft({
      pathParams: {},
      queryParams: {},
      headers: { 'Content-Type': 'application/json' },
      body: '',
    });
    setJsonFormatError(null);
  };

  // Ejecutar petición HTTP real
  const handleSendRequest = async () => {
    setIsExecuting(true);
    setJsonFormatError(null);

    let parsedBody: any = undefined;
    if (hasBody && requestDraft.body.trim()) {
      try {
        parsedBody = JSON.parse(requestDraft.body);
      } catch (err: any) {
        setJsonFormatError('El cuerpo no es un JSON válido. Corrige la sintaxis antes de enviar.');
        setIsExecuting(false);
        setActiveBuilderTab('body');
        return;
      }
    }

    try {
      const result = await executeHttpRequest({
        baseUrl: config.baseUrl,
        method: selectedEndpoint.method,
        path: selectedEndpoint.path,
        pathParams: requestDraft.pathParams,
        queryParams: requestDraft.queryParams,
        headers: requestDraft.headers,
        body: parsedBody,
        auth,
        timeoutMs: config.timeoutMs,
      });

      setLastResult(result);

      // Guardar en el historial
      addHistoryItem({
        id: `req_${Date.now()}`,
        timestamp: new Date().toISOString(),
        method: selectedEndpoint.method,
        url: result.url,
        path: selectedEndpoint.path,
        status: result.status,
        statusText: result.statusText,
        durationMs: result.durationMs,
        success: result.success,
        request: {
          headers: requestDraft.headers,
          queryParams: requestDraft.queryParams,
          pathParams: requestDraft.pathParams,
          body: parsedBody,
        },
        response: result.status
          ? {
              headers: result.headers,
              data: result.data,
              sizeBytes: result.sizeBytes,
            }
          : undefined,
        error: result.error,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Endpoint Bar Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/40 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <MethodBadge method={selectedEndpoint.method} size="md" />
            <span className="font-mono text-sm font-bold text-white truncate">
              {selectedEndpoint.path}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetForm}
              disabled={isExecuting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar
            </button>

            <button
              onClick={handleSendRequest}
              disabled={isExecuting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              {isExecuting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  Ejecutando...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 fill-slate-950" />
                  Enviar Petición
                </>
              )}
            </button>
          </div>
        </div>

        {/* Base URL selector and description */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="text-slate-500 flex items-center gap-1 text-[11px] font-medium">
              <Globe className="w-3.5 h-3.5 text-cyan-400" /> Base URL:
            </span>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => updateConfig({ baseUrl: e.target.value })}
              className="flex-1 bg-slate-900 text-slate-200 font-mono text-xs px-2.5 py-1 rounded border border-slate-800 focus:outline-none focus:border-cyan-500"
              placeholder="http://localhost:3000"
            />
          </div>

          {auth.mode !== 'none' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono">
              <Key className="w-3 h-3" />
              <span>Auth: {auth.mode.toUpperCase()}</span>
              {auth.mode === 'mock-role' && <span className="font-bold">({auth.mockRole})</span>}
            </div>
          )}
        </div>

        {selectedEndpoint.description && (
          <p className="text-[11px] text-slate-400 leading-relaxed border-l-2 border-cyan-500/50 pl-2.5 py-0.5">
            {selectedEndpoint.description}
          </p>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-1 px-4 border-b border-slate-800 bg-slate-900/20 text-xs">
        <button
          onClick={() => setActiveBuilderTab('params')}
          className={`px-3.5 py-2.5 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
            activeBuilderTab === 'params'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Parámetros
          {(pathParamNames.length > 0 || queryParamEntries.length > 0) && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveBuilderTab('headers')}
          className={`px-3.5 py-2.5 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
            activeBuilderTab === 'headers'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          Cabeceras
          <span className="text-[10px] text-slate-500">({headerEntries.length})</span>
        </button>

        {hasBody && (
          <button
            onClick={() => setActiveBuilderTab('body')}
            className={`px-3.5 py-2.5 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeBuilderTab === 'body'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Cuerpo (JSON)
            {requestDraft.body.trim() && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
          </button>
        )}

        <button
          onClick={() => setActiveBuilderTab('schema')}
          className={`px-3.5 py-2.5 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
            activeBuilderTab === 'schema'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Esquema OpenAPI
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* PARAMS TAB */}
        {activeBuilderTab === 'params' && (
          <div className="space-y-6 max-w-2xl">
            {/* Path Parameters */}
            {pathParamNames.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Parámetros de Ruta (Path Variables)
                </h4>
                <div className="space-y-2">
                  {pathParamNames.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800"
                    >
                      <span className="font-mono text-xs text-amber-300 font-bold px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                        {`{${name}}`}
                      </span>
                      <input
                        type="text"
                        placeholder={`Valor para ${name}...`}
                        value={requestDraft.pathParams[name] || ''}
                        onChange={(e) => handlePathParamChange(name, e.target.value)}
                        className="flex-1 bg-slate-950 text-slate-200 font-mono text-xs px-3 py-1.5 rounded border border-slate-800 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Query Parameters */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  Parámetros de Consulta (Query Params)
                </h4>
                <button
                  onClick={handleAddQueryParam}
                  className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Parámetro
                </button>
              </div>

              {queryParamEntries.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-lg border border-slate-800/60">
                  Sin parámetros query definidos. Haz clic en "Agregar Parámetro" si deseas enviar filtros (ej: ?page=1).
                </p>
              ) : (
                <div className="space-y-2">
                  {queryParamEntries.map(([key, val], idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Clave (ej: page)"
                        value={key}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          setRequestDraft((prev) => {
                            const copy = { ...prev.queryParams };
                            delete copy[key];
                            copy[newKey] = val;
                            return { ...prev, queryParams: copy };
                          });
                        }}
                        className="w-1/3 bg-slate-900 text-slate-200 font-mono text-xs px-3 py-1.5 rounded border border-slate-800 focus:outline-none focus:border-cyan-500"
                      />
                      <input
                        type="text"
                        placeholder="Valor (ej: 1)"
                        value={val}
                        onChange={(e) => handleQueryParamChange(key, e.target.value)}
                        className="flex-1 bg-slate-900 text-slate-200 font-mono text-xs px-3 py-1.5 rounded border border-slate-800 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => handleRemoveQueryParam(key)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HEADERS TAB */}
        {activeBuilderTab === 'headers' && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Cabeceras de Solicitud (HTTP Headers)
              </h4>
              <button
                onClick={handleAddHeader}
                className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Cabecera
              </button>
            </div>

            <div className="space-y-2">
              {headerEntries.map(([k, v], idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Encabezado (ej: Content-Type)"
                    value={k}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      setRequestDraft((prev) => {
                        const copy = { ...prev.headers };
                        delete copy[k];
                        copy[newKey] = v;
                        return { ...prev, headers: copy };
                      });
                    }}
                    className="w-1/2 bg-slate-900 text-slate-200 font-mono text-xs px-3 py-1.5 rounded border border-slate-800 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Valor"
                    value={v}
                    onChange={(e) => handleHeaderChange(k, e.target.value)}
                    className="flex-1 bg-slate-900 text-slate-200 font-mono text-xs px-3 py-1.5 rounded border border-slate-800 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleRemoveHeader(k)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {auth.mode !== 'none' && (
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> Cabeceras de autenticación automáticas activas
                </div>
                <p className="text-[11px] text-slate-400">
                  {auth.mode === 'bearer' && `Se inyectará Authorization: Bearer ${auth.bearerToken.slice(0, 8)}...`}
                  {auth.mode === 'mock-role' && `Se inyectará x-mock-role: ${auth.mockRole}`}
                  {auth.mode === 'cookie' && 'Se enviará withCredentials: true para incluir cookies de sesión.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* BODY TAB */}
        {activeBuilderTab === 'body' && hasBody && (
          <div className="space-y-3 h-full flex flex-col">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Cuerpo de la Solicitud (JSON Payload)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadSchemaExample}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Cargar Ejemplo de Swagger
                </button>
                <button
                  onClick={handleFormatJson}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] border border-slate-700"
                >
                  Formatear JSON
                </button>
              </div>
            </div>

            {jsonFormatError && (
              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{jsonFormatError}</span>
              </div>
            )}

            <textarea
              value={requestDraft.body}
              onChange={(e) => {
                setRequestDraft((prev) => ({ ...prev, body: e.target.value }));
                setJsonFormatError(null);
              }}
              placeholder="Introduce el cuerpo JSON aquí... ej: { &#34;email&#34;: &#34;user@test.com&#34; }"
              className="w-full flex-1 min-h-[220px] bg-slate-900 font-mono text-xs text-slate-200 p-3 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 resize-y"
              spellCheck={false}
            />
          </div>
        )}

        {/* SCHEMA TAB */}
        {activeBuilderTab === 'schema' && (
          <div className="space-y-4 max-w-3xl">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Documentación y Esquemas OpenAPI
            </h4>

            {selectedEndpoint.requestBody && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h5 className="text-xs font-bold text-cyan-400">Esquema del Request Body</h5>
                <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded border border-slate-800 overflow-x-auto text-slate-300">
                  {JSON.stringify(
                    selectedEndpoint.requestBody.content?.['application/json']?.schema ||
                      selectedEndpoint.requestBody,
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

            {selectedEndpoint.responses && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-300">Respuestas Documentadas</h5>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(selectedEndpoint.responses).map(([code, resp]) => (
                    <div
                      key={code}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <span className="font-mono font-bold text-cyan-400">HTTP {code}</span>
                        <p className="text-slate-400 text-[11px]">{resp.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

