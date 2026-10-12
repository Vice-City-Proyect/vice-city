import React from 'react';
import {
  Zap,
  BookOpen,
  ShieldCheck,
  History,
  Server,
  CheckCircle2,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PRESET_SPECS } from '../../services/preset-specs';

export const HomeView: React.FC = () => {
  const { setActiveTab, endpoints, config, history, activePresetId, loadSpec } = useApp();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Herramienta Oficial de Desarrollo Frontend — Vice City
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Vice-City <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">API Tester</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Explora las especificaciones Swagger/OpenAPI de las HUs del backend, construye peticiones reales
            con validación de cabeceras y cookies de NextAuth, y visualiza las respuestas en tiempo real
            sin depender de herramientas externas como Postman ni exponer el entorno.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('endpoints')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              Probar Endpoints
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('swagger')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              Ver Documentación Swagger
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Endpoints Disponibles</p>
            <p className="text-2xl font-bold text-white mt-1 font-mono">{endpoints.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Servidor Destino</p>
            <p className="text-sm font-semibold text-cyan-400 mt-1 font-mono truncate max-w-[140px]">
              {config.baseUrl}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Peticiones en Historial</p>
            <p className="text-2xl font-bold text-white mt-1 font-mono">{history.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Entorno de Ejecución</p>
            <p className="text-xs font-semibold text-emerald-400 mt-1">100% Local (127.0.0.1)</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Catálogo de Especificaciones Swagger (Presets)</h3>
          </div>
          <span className="text-xs text-slate-400">
            Cambia entre las HUs documentadas de Vice City con un clic
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESET_SPECS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => loadSpec(preset.spec, preset.id)}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="font-semibold text-xs tracking-tight">{preset.name}</h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
                {isSelected && (
                  <div className="mt-2 text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Activo en el Tester
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workflow Steps Guide */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          Flujo de Trabajo para el Equipo Frontend
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold font-mono text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="text-xs font-bold text-slate-200">Selecciona o Importa la HU</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Elige el preset de la HU que estás integrando o importa el archivo <code className="text-cyan-300">.swagger.json</code> local desde la pestaña Swagger.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 font-bold font-mono text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="text-xs font-bold text-slate-200">Configura Auth y Parámetros</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ajusta la cabecera de rol simulado (<code className="text-amber-300">x-mock-role: ADMIN</code>) o cookies de sesión para probar accesos permitidos y 403 Forbidden.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold font-mono text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="text-xs font-bold text-slate-200">Dispara la Petición Real</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Envía la solicitud contra <code className="text-emerald-300">localhost:3000</code>, examina los códigos de estado, cabeceras y copia el JSON real para tus componentes React.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

