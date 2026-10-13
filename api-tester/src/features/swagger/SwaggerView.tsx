import React, { useEffect, useRef, useState } from 'react';
import {
  FileCode,
  Upload,
  Link as LinkIcon,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Layers,
} from 'lucide-react';
// @ts-ignore
import { SwaggerUIBundle } from 'swagger-ui-dist';
import { useApp } from '../../context/AppContext';
import { PRESET_SPECS } from '../../services/preset-specs';
import { OpenApiSpec } from '../../types/openapi';

export const SwaggerView: React.FC = () => {
  const { spec, loadSpec, activePresetId, setActiveTab } = useApp();
  const swaggerContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [urlInput, setUrlInput] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Inicializar o re-renderizar Swagger UI cuando cambia `spec`
  useEffect(() => {
    if (!swaggerContainerRef.current) return;

    // Limpiar contenedor previo
    swaggerContainerRef.current.innerHTML = '';

    try {
      SwaggerUIBundle({
        domNode: swaggerContainerRef.current,
        spec: spec,
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
        ],
        layout: 'BaseLayout',
        docExpansion: 'list',
        defaultModelsExpandDepth: 1,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
      });
    } catch (err: any) {
      console.error('Error inicializando Swagger UI:', err);
    }
  }, [spec]);

  // Cambiar entre especificaciones predefinidas
  const handleSelectPreset = (presetId: string) => {
    const found = PRESET_SPECS.find((p) => p.id === presetId);
    if (found) {
      loadSpec(found.spec, found.id);
      setSuccessMsg(`Especificación "${found.name}" cargada exitosamente`);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Cargar desde archivo local
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.openapi && !parsed.swagger) {
          throw new Error('El archivo no contiene un documento OpenAPI o Swagger válido.');
        }
        loadSpec(parsed as OpenApiSpec, 'custom-file');
        setSuccessMsg(`Archivo "${file.name}" cargado exitosamente`);
        setErrorMsg(null);
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err: any) {
        setErrorMsg(`Error al procesar el archivo: ${err.message}`);
        setSuccessMsg(null);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cargar desde URL
  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return;
    setIsLoadingUrl(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(urlInput.trim());
      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
      }
      const parsed = await res.json();
      if (!parsed.openapi && !parsed.swagger) {
        throw new Error('La respuesta URL no contiene un esquema OpenAPI o Swagger válido.');
      }
      loadSpec(parsed as OpenApiSpec, 'custom-url');
      setSuccessMsg(`Especificación cargada exitosamente desde ${urlInput}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(`No se pudo obtener la especificación: ${err.message}`);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* BARRA SUPERIOR DE CONTROL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <FileCode className="w-5 h-5 text-cyan-400" />
              <span>Explorador Swagger / OpenAPI Oficial</span>
            </h2>
            <p className="text-xs text-slate-400">
              Visualiza esquemas interactivos, definiciones de parámetros y respuestas del contrato.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('endpoints')}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/60 rounded-lg transition-colors shadow-sm"
          >
            <span>Ir al Constructor de Peticiones</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* SELECTOR DE PRESETS */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1 mr-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Presets Vice City:</span>
          </span>
          {PRESET_SPECS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border ${
                activePresetId === preset.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* IMPORTACIÓN PERSONALIZADA (ARCHIVO O URL) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.yaml,.yml"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Importar JSON OpenAPI</span>
            </button>
          </div>

          <div className="flex-1 flex items-center space-x-2 min-w-[280px]">
            <div className="relative flex-1">
              <LinkIcon className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="http://localhost:3000/api/docs (URL OpenAPI)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={handleFetchUrl}
              disabled={isLoadingUrl || !urlInput.trim()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg border border-slate-700 transition-colors flex items-center space-x-1"
            >
              {isLoadingUrl ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Cargar URL</span>
              )}
            </button>
          </div>
        </div>

        {/* MENSAJES DE ESTADO */}
        {successMsg && (
          <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/60">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center space-x-2 text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-900/60">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* CONTENEDOR DE SWAGGER UI */}
      <div className="flex-1 bg-white rounded-xl shadow-xl overflow-auto border border-slate-700 p-2">
        <div id="swagger-ui-container" ref={swaggerContainerRef} />
      </div>
    </div>
  );
};
