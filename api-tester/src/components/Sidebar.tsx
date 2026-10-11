import React from 'react';
import {
  Home,
  Zap,
  BookOpen,
  ShieldCheck,
  History,
  Settings,
  Server,
  Activity,
  Layers,
} from 'lucide-react';
import { useApp, ActiveNavTab } from '../context/AppContext';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, endpoints, config, history, auth } = useApp();

  const navItems: Array<{ id: ActiveNavTab; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'home', label: 'Inicio', icon: <Home className="w-4 h-4" /> },
    {
      id: 'endpoints',
      label: 'Endpoints',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      badge: endpoints.length,
    },
    {
      id: 'swagger',
      label: 'Documentación Swagger',
      icon: <BookOpen className="w-4 h-4 text-sky-400" />,
    },
    {
      id: 'auth',
      label: 'Autenticación',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      badge: auth.mode !== 'none' ? auth.mode.toUpperCase() : undefined,
    },
    {
      id: 'history',
      label: 'Historial',
      icon: <History className="w-4 h-4 text-purple-400" />,
      badge: history.length > 0 ? history.length : undefined,
    },
    {
      id: 'config',
      label: 'Configuración',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              Vice-City
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Tester
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Local Endpoint Studio</p>
          </div>
        </div>

        {/* Local Loopback badge */}
        <div className="mt-3.5 px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Loopback 127.0.0.1
          </span>
          <span className="text-slate-500 font-mono text-[10px]">:5173</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Navegación
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isActive
                      ? 'bg-cyan-400/20 text-cyan-200'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Target Backend Info Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            Backend Destino
          </span>
          <button
            onClick={() => setActiveTab('config')}
            className="text-[10px] text-cyan-400 hover:underline"
          >
            Editar
          </button>
        </div>
        <div className="truncate font-mono text-[11px] text-slate-300 bg-slate-900 px-2 py-1.5 rounded border border-slate-800">
          {config.baseUrl}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" /> {endpoints.length} operaciones
          </span>
          <span>Next.js App Router</span>
        </div>
      </div>
    </aside>
  );
};

