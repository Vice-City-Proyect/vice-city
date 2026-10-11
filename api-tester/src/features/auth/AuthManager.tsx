import React, { useState } from 'react';
import {
  Shield,
  Key,
  Cookie,
  UserCheck,
  Plus,
  Trash2,
  CheckCircle,
  Unlock,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuthMode, CustomHeader, SRSRole } from '../../types/auth';

const AVAILABLE_ROLES: { id: SRSRole; name: string; desc: string }[] = [
  { id: 'ADMIN', name: 'Administrador (ADMIN)', desc: 'Acceso total: gestión de empleados, tarifas, asignación de roles' },
  { id: 'TICKET_SELLER', name: 'Taquillero (TICKET_SELLER)', desc: 'Venta presencial de boletos y cobro de reservas' },
  { id: 'QR_VALIDATOR', name: 'Validador QR (QR_VALIDATOR)', desc: 'Validación y check-in de accesos en torniquetes' },
  { id: 'CLIENT', name: 'Cliente / Deportista (CLIENT)', desc: 'Reserva de canchas, consulta de historial y perfil' },
];

export const AuthManager: React.FC = () => {
  const { auth, updateAuth } = useApp();
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderVal, setNewHeaderVal] = useState('');

  const handleModeChange = (mode: AuthMode) => {
    updateAuth({ mode });
  };

  const handleAddCustomHeader = () => {
    if (!newHeaderKey.trim()) return;
    const newHeader: CustomHeader = {
      id: `h_${Date.now()}`,
      key: newHeaderKey.trim(),
      value: newHeaderVal.trim(),
      enabled: true,
    };
    updateAuth({
      customHeaders: [...auth.customHeaders, newHeader],
    });
    setNewHeaderKey('');
    setNewHeaderVal('');
  };

  const handleRemoveCustomHeader = (id: string) => {
    updateAuth({
      customHeaders: auth.customHeaders.filter((h) => h.id !== id),
    });
  };

  const handleToggleCustomHeader = (id: string) => {
    updateAuth({
      customHeaders: auth.customHeaders.map((h) =>
        h.id === id ? { ...h, enabled: !h.enabled } : h
      ),
    });
  };

  const handleResetAuth = () => {
    updateAuth({
      mode: 'none',
      bearerToken: '',
      mockRole: 'ADMIN',
      mockUserId: 'adm-00000000-0000-0000-0000-000000000001',
      cookieName: 'next-auth.session-token',
      cookieValue: '',
      customHeaders: [],
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span>Gestor de Autenticación y Sesiones</span>
            </h2>
            <p className="text-xs text-slate-400">
              Configura cómo el API Tester inyecta credenciales, tokens o roles en las solicitudes HTTP reales al backend.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400">Modo Actual:</span>
              <span
                className={`font-semibold uppercase tracking-wider ${
                  auth.mode === 'none'
                    ? 'text-slate-400'
                    : auth.mode === 'mock-role'
                    ? 'text-purple-400'
                    : auth.mode === 'bearer'
                    ? 'text-emerald-400'
                    : 'text-cyan-400'
                }`}
              >
                {auth.mode}
              </span>
            </div>

            {auth.mode !== 'none' && (
              <button
                onClick={handleResetAuth}
                className="flex items-center space-x-1 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/60 rounded-lg text-xs transition-colors"
                title="Restablecer a sin autenticación"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpiar Sesión</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SELECCIÓN DE MÉTODO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <button
          onClick={() => handleModeChange('none')}
          className={`p-4 rounded-xl border text-left transition-all space-y-2 ${
            auth.mode === 'none'
              ? 'bg-slate-800/80 border-cyan-500 ring-1 ring-cyan-500'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <Unlock className="w-5 h-5 text-slate-400" />
            {auth.mode === 'none' && <CheckCircle className="w-4 h-4 text-cyan-400" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Público (Sin Auth)</h4>
            <p className="text-[11px] text-slate-400">Para endpoints públicos como login, registro y catálogo de precios.</p>
          </div>
        </button>

        <button
          onClick={() => handleModeChange('mock-role')}
          className={`p-4 rounded-xl border text-left transition-all space-y-2 ${
            auth.mode === 'mock-role'
              ? 'bg-slate-800/80 border-purple-500 ring-1 ring-purple-500'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <UserCheck className="w-5 h-5 text-purple-400" />
            {auth.mode === 'mock-role' && <CheckCircle className="w-4 h-4 text-purple-400" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Mock Role (Dev)</h4>
            <p className="text-[11px] text-slate-400">Inyecta <code className="text-purple-300 font-mono">x-mock-role</code> para probar endpoints protegidos sin login previo.</p>
          </div>
        </button>

        <button
          onClick={() => handleModeChange('cookie')}
          className={`p-4 rounded-xl border text-left transition-all space-y-2 ${
            auth.mode === 'cookie'
              ? 'bg-slate-800/80 border-cyan-500 ring-1 ring-cyan-500'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <Cookie className="w-5 h-5 text-cyan-400" />
            {auth.mode === 'cookie' && <CheckCircle className="w-4 h-4 text-cyan-400" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">NextAuth Cookie</h4>
            <p className="text-[11px] text-slate-400">Envía cookies de sesión con <code className="text-cyan-300 font-mono">withCredentials: true</code>.</p>
          </div>
        </button>

        <button
          onClick={() => handleModeChange('bearer')}
          className={`p-4 rounded-xl border text-left transition-all space-y-2 ${
            auth.mode === 'bearer'
              ? 'bg-slate-800/80 border-emerald-500 ring-1 ring-emerald-500'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <Key className="w-5 h-5 text-emerald-400" />
            {auth.mode === 'bearer' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Bearer Token (JWT)</h4>
            <p className="text-[11px] text-slate-400">Inyecta <code className="text-emerald-300 font-mono">Authorization: Bearer &lt;token&gt;</code>.</p>
          </div>
        </button>
      </div>

      {/* CONFIGURACIÓN DETALLADA SEGÚN MODO SELECCIONADO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        {auth.mode === 'none' && (
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-300">Modo Público Activo</p>
            <p>
              Las solicitudes se enviarán sin cabeceras de autorización. Los endpoints protegidos responderán con <code className="text-red-400 font-mono">401 Unauthorized</code> o <code className="text-red-400 font-mono">403 Forbidden</code> según las reglas del backend.
            </p>
          </div>
        )}

        {auth.mode === 'mock-role' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-2">
              <UserCheck className="w-4 h-4" />
              <span>Configuración de Rol Simulado (Desarrollo Local)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_ROLES.map((role) => (
                <div
                  key={role.id}
                  onClick={() => updateAuth({ mockRole: role.id })}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    auth.mockRole === role.id
                      ? 'bg-purple-950/40 border-purple-500/80 text-purple-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{role.name}</span>
                    {auth.mockRole === role.id && <CheckCircle className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{role.desc}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-slate-300">Mock User ID (UUID del usuario)</label>
              <input
                type="text"
                value={auth.mockUserId || ''}
                onChange={(e) => updateAuth({ mockUserId: e.target.value })}
                placeholder="adm-00000000-0000-0000-0000-000000000001"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
              />
              <span className="text-[11px] text-slate-500">
                Se enviarán las cabeceras <code className="text-purple-300 font-mono">x-mock-role: {auth.mockRole}</code> y <code className="text-purple-300 font-mono">x-mock-user-id: {auth.mockUserId}</code>.
              </span>
            </div>
          </div>
        )}

        {auth.mode === 'cookie' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-2">
              <Cookie className="w-4 h-4" />
              <span>Configuración de Cookies NextAuth</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nombre de la Cookie</label>
                <input
                  type="text"
                  value={auth.cookieName}
                  onChange={(e) => updateAuth({ cookieName: e.target.value })}
                  placeholder="next-auth.session-token"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Valor del Token de Sesión</label>
                <input
                  type="password"
                  value={auth.cookieValue}
                  onChange={(e) => updateAuth({ cookieValue: e.target.value })}
                  placeholder="Pegar token de sesión de la cookie..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="p-3 bg-cyan-950/30 rounded-lg border border-cyan-900/40 text-xs text-cyan-300 space-y-1">
              <p className="font-semibold text-cyan-200">Nota técnica sobre solicitudes cross-origin:</p>
              <p className="text-cyan-300/80">
                Las solicitudes se ejecutan con <code className="bg-cyan-950 px-1 py-0.5 rounded text-cyan-200 font-mono">withCredentials: true</code>. Si tienes una sesión iniciada en <code className="bg-cyan-950 px-1 py-0.5 rounded text-cyan-200 font-mono">http://localhost:3000</code>, el navegador compartirá las cookies si las cabeceras CORS del backend lo permiten.
              </p>
            </div>
          </div>
        )}

        {auth.mode === 'bearer' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center space-x-2">
              <Key className="w-4 h-4" />
              <span>Token Bearer (JWT)</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Token JWT</label>
              <textarea
                rows={3}
                value={auth.bearerToken}
                onChange={(e) => updateAuth({ bearerToken: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
              />
              <span className="text-[11px] text-slate-500">
                Se inyectará automáticamente en la cabecera: <code className="text-emerald-300 font-mono">Authorization: Bearer &lt;token&gt;</code>.
              </span>
            </div>
          </div>
        )}

        {/* CABECERAS PERSONALIZADAS GLOBALES */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Cabeceras Personalizadas Globales
          </h4>
          <p className="text-[11px] text-slate-400">
            Estas cabeceras se agregarán a todas las peticiones salientes junto con la autenticación elegida.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Header (ej: X-Correlation-ID)"
              value={newHeaderKey}
              onChange={(e) => setNewHeaderKey(e.target.value)}
              className="flex-1 min-w-[200px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="text"
              placeholder="Valor"
              value={newHeaderVal}
              onChange={(e) => setNewHeaderVal(e.target.value)}
              className="flex-1 min-w-[200px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleAddCustomHeader}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar</span>
            </button>
          </div>

          {auth.customHeaders && auth.customHeaders.length > 0 && (
            <div className="space-y-1.5 pt-2">
              {auth.customHeaders.map((header) => (
                <div
                  key={header.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={() => handleToggleCustomHeader(header.id)}
                      className="accent-cyan-500 rounded"
                    />
                    <span className="text-cyan-400 font-bold">{header.key}: </span>
                    <span className="text-slate-300">{header.value}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveCustomHeader(header.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                    title="Eliminar cabecera"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

