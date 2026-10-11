import React, { useState } from 'react';
import {
  Settings,
  Server,
  Clock,
  Code,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_CONFIG } from '../../types/config';

export const ConfigView: React.FC = () => {
  const { config, updateConfig } = useApp();
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleResetDefaults = () => {
    if (window.confirm('¿Restablecer la configuración del API Tester a los valores por defecto?')) {
      updateConfig(DEFAULT_CONFIG);
      setSuccessNotice('Configuración restablecida a los valores por defecto.');
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              <span>Configuración del API Tester</span>
            </h2>
            <p className="text-xs text-slate-400">
              Ajusta los parámetros de conexión, tiempos límite y preferencias de visualización.
            </p>
          </div>

          <button
            onClick={handleResetDefaults}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Valores por Defecto</span>
          </button>
        </div>

        {successNotice && (
          <div className="mt-4 flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/60">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}
      </div>

      {/* FORMULARIO DE CONFIGURACIÓN */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BASE URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center space-x-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>URL Base del Backend</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Dirección donde se ejecuta el backend Next.js de Vice City.
            </p>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => updateConfig({ baseUrl: e.target.value })}
              placeholder="http://localhost:3000"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* TIMEOUT */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Tiempo Límite de Petición (Timeout)</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Milisegundos antes de cancelar una solicitud lenta (ej: 10000ms = 10s).
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={1000}
                max={60000}
                step={500}
                value={config.timeoutMs}
                onChange={(e) => updateConfig({ timeoutMs: parseInt(e.target.value, 10) || 10000 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-slate-500 font-mono">ms</span>
            </div>
          </div>
        </div>

        {/* TOGGLES */}
        <div className="pt-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <Code className="w-4 h-4 text-violet-400" />
                <span>Formatear JSON Automáticamente</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Alinea e indenta los cuerpos de petición y respuesta con sangría de 2 espacios.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.autoFormatJson}
              onChange={(e) => updateConfig({ autoFormatJson: e.target.checked })}
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* GUÍA TÉCNICA Y RESTRICCIONES DE ENTORNO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Políticas de Seguridad y Entorno Loopback</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-cyan-300 font-semibold">
              <Laptop className="w-4 h-4" />
              <span>Restricción Estricta Localhost</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Esta herramienta está diseñada para ejecutarse <strong>exclusivamente</strong> en la interfaz local (<code className="text-cyan-300 font-mono">127.0.0.1:5173</code>). No se desplegará en Vercel, Netlify ni servidores públicos para proteger los endpoints internos del equipo de desarrollo.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-amber-300 font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>Conexión con el Backend Vice City</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Para ejecutar pruebas contra los endpoints reales, asegúrate de tener corriendo el servidor Next.js en una terminal separada:
              <br />
              <code className="text-emerald-300 font-mono block bg-slate-900 p-1.5 rounded mt-1">npm run dev</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

