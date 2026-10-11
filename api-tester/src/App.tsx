import React from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './features/home/HomeView';
import { EndpointList } from './features/endpoints/EndpointList';
import { RequestBuilder } from './features/request-builder/RequestBuilder';
import { ResponseViewer } from './features/response-viewer/ResponseViewer';
import { SwaggerView } from './features/swagger/SwaggerView';
import { AuthManager } from './features/auth/AuthManager';
import { HistoryList } from './features/history/HistoryList';
import { ConfigView } from './features/config/ConfigView';

export const App: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* BARRA LATERAL DE NAVEGACIÓN */}
      <Sidebar />

      {/* CONTENEDOR PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* VISTA: INICIO / DASHBOARD */}
        {activeTab === 'home' && (
          <div className="flex-1 overflow-auto p-6">
            <HomeView />
          </div>
        )}

        {/* VISTA: ESTUDIO DE ENDPOINTS (3 PANELES: LISTA + CONSTRUCTOR + RESPUESTA) */}
        {activeTab === 'endpoints' && (
          <div className="flex-1 flex min-w-0 h-full overflow-hidden">
            {/* PANEL IZQUIERDO: LISTA DE ENDPOINTS */}
            <div className="w-72 xl:w-80 h-full border-r border-slate-800 bg-slate-900/60 shrink-0 flex flex-col">
              <EndpointList />
            </div>

            {/* PANEL CENTRAL: CONSTRUCTOR DE PETICIONES */}
            <div className="flex-1 h-full min-w-0 border-r border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
              <RequestBuilder />
            </div>

            {/* PANEL DERECHO: VISOR DE RESPUESTAS */}
            <div className="w-80 xl:w-[440px] 2xl:w-[480px] h-full bg-slate-950/90 shrink-0 p-3 flex flex-col overflow-hidden">
              <ResponseViewer />
            </div>
          </div>
        )}

        {/* VISTA: SWAGGER OFICIAL EMBEBIDO */}
        {activeTab === 'swagger' && (
          <div className="flex-1 overflow-auto p-6">
            <SwaggerView />
          </div>
        )}

        {/* VISTA: GESTOR DE AUTENTICACIÓN */}
        {activeTab === 'auth' && (
          <div className="flex-1 overflow-auto p-6">
            <AuthManager />
          </div>
        )}

        {/* VISTA: HISTORIAL */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-auto p-6">
            <HistoryList />
          </div>
        )}

        {/* VISTA: CONFIGURACIÓN */}
        {activeTab === 'config' && (
          <div className="flex-1 overflow-auto p-6">
            <ConfigView />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

