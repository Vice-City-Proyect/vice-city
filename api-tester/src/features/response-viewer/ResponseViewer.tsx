import React, { useState } from 'react';
import {
  Copy,
  Check,
  Clock,
  HardDrive,
  AlertTriangle,
  WifiOff,
  ShieldAlert,
  Inbox,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/StatusBadge';

export const ResponseViewer: React.FC = () => {
  const { lastResult, isExecuting } = useApp();
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [copied, setCopied] = useState(false);

  const handleCopyBody = () => {
    if (!lastResult) return;
    const content =
      typeof lastResult.data === 'string'
        ? lastResult.data
        : JSON.stringify(lastResult.data, null, 2);

    navigator.clipboard.writeText(content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isExecuting) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-900/60 rounded-xl border border-slate-800 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-300">Enviando petición HTTP real...</p>
        <span className="text-xs text-slate-500 font-mono">Esperando respuesta del backend</span>
      </div>
    );
  }

  if (!lastResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-center space-y-3 text-slate-500">
        <Inbox className="w-10 h-10 text-slate-700" />
        <h4 className="text-sm font-medium text-slate-400">Sin respuesta disponible</h4>
        <p className="text-xs max-w-xs text-slate-500">
          Configura los parámetros y haz clic en &quot;Enviar Petición&quot; para inspeccionar la respuesta en vivo.
        </p>
      </div>
    );
  }

  const {
    status = 0,
    statusText = '',
    durationMs,
    sizeBytes,
    headers,
    data,
    error,
  } = lastResult;

  const isError = !lastResult.success || status >= 400;
  const errorType = error?.type;
  const errorMessage = error?.message || (error?.details ? String(error.details) : undefined);

  const formattedBody =
    typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const formattedSize =
    sizeBytes > 1024
      ? `${(sizeBytes / 1024).toFixed(2)} KB`
      : `${sizeBytes} B`;

  return (
    <div className="h-full flex flex-col bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      {/* HEADER DE ESTADO */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Respuesta:
          </span>
          <StatusBadge status={status} statusText={statusText} />
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-1" title="Tiempo de respuesta">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{durationMs} ms</span>
          </div>
          <div className="flex items-center space-x-1" title="Tamaño aproximado del cuerpo">
            <HardDrive className="w-3.5 h-3.5 text-violet-400" />
            <span>{formattedSize}</span>
          </div>
        </div>
      </div>

      {/* ALERTAS ESPECÍFICAS DE ERROR DE RED / CORS / TIMEOUT */}
      {isError && errorType && (
        <div className="p-4 bg-red-950/30 border-b border-red-900/50">
          {errorType === 'NETWORK_ERROR' && (
            <div className="flex items-start space-x-3 text-red-300">
              <WifiOff className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-red-200">
                  Backend no disponible o inaccesible (Network Error)
                </p>
                <p className="text-red-300/80">
                  No se pudo establecer conexión con el servidor. Verifica que el backend de Vice City esté ejecutándose en el puerto configurado (ej: <code className="bg-red-950 px-1 py-0.5 rounded text-red-200 font-mono">npm run dev</code> en <code className="bg-red-950 px-1 py-0.5 rounded text-red-200 font-mono">http://localhost:3000</code>).
                </p>
              </div>
            </div>
          )}

          {errorType === 'CORS_ERROR' && (
            <div className="flex items-start space-x-3 text-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-amber-200">
                  Posible bloqueo por política de CORS
                </p>
                <p className="text-amber-300/80">
                  El navegador bloqueó la petición debido a la política Cross-Origin. La aplicación se ejecuta en <code className="bg-amber-950 px-1 py-0.5 rounded text-amber-200 font-mono">http://127.0.0.1:5173</code> y el servidor debe aceptar solicitudes desde este origen o responder con cabeceras CORS adecuadas.
                </p>
              </div>
            </div>
          )}

          {errorType === 'TIMEOUT' && (
            <div className="flex items-start space-x-3 text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-amber-200">
                  Tiempo de espera agotado (Timeout)
                </p>
                <p className="text-amber-300/80">
                  El backend no respondió antes del límite de tiempo. Puedes aumentar el timeout en la pestaña de Configuración.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-2 text-[11px] font-mono text-red-400 bg-red-950/60 p-2 rounded border border-red-900/40">
              Detalle: {errorMessage}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑAS (BODY / HEADERS) */}
      <div className="flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('body')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'body'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cuerpo ({typeof data === 'object' && data !== null ? 'JSON' : 'Texto'})
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'headers'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cabeceras ({Object.keys(headers || {}).length})
          </button>
        </div>

        {activeTab === 'body' && (
          <button
            onClick={handleCopyBody}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            title="Copiar respuesta al portapapeles"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* CONTENIDO DE LA PESTAÑA */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs">
        {activeTab === 'body' && (
          <div className="h-full">
            {formattedBody ? (
              <pre className="text-slate-300 whitespace-pre-wrap break-all leading-relaxed font-mono select-text">
                {formattedBody}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                Cuerpo de respuesta vacío (204 No Content o sin payload)
              </div>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="space-y-2">
            {headers && Object.keys(headers).length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 pr-4 font-semibold">Cabecera</th>
                    <th className="py-2 font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {Object.entries(headers).map(([key, val]) => (
                    <tr key={key} className="hover:bg-slate-800/30">
                      <td className="py-2 pr-4 text-cyan-400 align-top select-text">{key}</td>
                      <td className="py-2 text-slate-300 break-all select-text">{String(val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                No se recibieron cabeceras de respuesta o fueron restringidas por el navegador.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
