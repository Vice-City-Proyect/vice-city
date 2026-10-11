import React, { createContext, useContext, useState, useEffect } from 'react';
import { OpenApiSpec, EndpointItem, TagGroup } from '../types/openapi';
import { AuthState, DEFAULT_AUTH_STATE } from '../types/auth';
import { HistoryItem } from '../types/history';
import { AppConfig, DEFAULT_CONFIG } from '../types/config';
import { ExecutionResult } from '../services/http-client';
import { parseOpenApiSpec } from '../services/spec-parser';
import { COMBINED_VICE_CITY_SPEC, PRESET_SPECS } from '../services/preset-specs';

export type ActiveNavTab = 'home' | 'endpoints' | 'swagger' | 'auth' | 'history' | 'config';

interface AppContextValue {
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  spec: OpenApiSpec;
  endpoints: EndpointItem[];
  tagGroups: TagGroup[];
  allTags: string[];
  selectedEndpoint: EndpointItem | null;
  setSelectedEndpoint: (ep: EndpointItem | null) => void;
  loadSpec: (newSpec: OpenApiSpec, presetId?: string) => void;
  activePresetId: string;
  auth: AuthState;
  updateAuth: (partial: Partial<AuthState>) => void;
  config: AppConfig;
  updateConfig: (partial: Partial<AppConfig>) => void;
  history: HistoryItem[];
  addHistoryItem: (item: HistoryItem) => void;
  clearHistory: () => void;
  lastResult: ExecutionResult | null;
  setLastResult: (res: ExecutionResult | null) => void;
  isExecuting: boolean;
  setIsExecuting: (val: boolean) => void;
  requestDraft: {
    pathParams: Record<string, string>;
    queryParams: Record<string, string>;
    headers: Record<string, string>;
    body: string;
  };
  setRequestDraft: React.Dispatch<
    React.SetStateAction<{
      pathParams: Record<string, string>;
      queryParams: Record<string, string>;
      headers: Record<string, string>;
      body: string;
    }>
  >;
  loadHistoryIntoBuilder: (historyItem: HistoryItem) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  CONFIG: 'vc_api_tester_config',
  AUTH: 'vc_api_tester_auth',
  HISTORY: 'vc_api_tester_history',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('home');
  const [activePresetId, setActivePresetId] = useState<string>('combined');

  // Cargar configuración guardada
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  // Cargar auth persistente (solo modo, nombre de cookie y mock role; NO contraseñas)
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
      return saved ? { ...DEFAULT_AUTH_STATE, ...JSON.parse(saved) } : DEFAULT_AUTH_STATE;
    } catch {
      return DEFAULT_AUTH_STATE;
    }
  });

  // Historial de peticiones
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Estado de especificación OpenAPI activa
  const [spec, setSpec] = useState<OpenApiSpec>(COMBINED_VICE_CITY_SPEC);
  const [{ endpoints, tagGroups, allTags }, setParsedSpec] = useState(() =>
    parseOpenApiSpec(COMBINED_VICE_CITY_SPEC)
  );

  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointItem | null>(null);
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Borrador actual del Request Builder
  const [requestDraft, setRequestDraft] = useState<{
    pathParams: Record<string, string>;
    queryParams: Record<string, string>;
    headers: Record<string, string>;
    body: string;
  }>({
    pathParams: {},
    queryParams: {},
    headers: {},
    body: '',
  });

  // Cargar especificación inicial o cambiar preset
  const loadSpec = (newSpec: OpenApiSpec, presetId = 'custom') => {
    setSpec(newSpec);
    setActivePresetId(presetId);
    const parsed = parseOpenApiSpec(newSpec);
    setParsedSpec(parsed);
    if (parsed.endpoints.length > 0) {
      setSelectedEndpoint(parsed.endpoints[0]);
    } else {
      setSelectedEndpoint(null);
    }
  };

  // Inicializar endpoint por defecto
  useEffect(() => {
    if (endpoints.length > 0 && !selectedEndpoint) {
      setSelectedEndpoint(endpoints[0]);
    }
  }, [endpoints, selectedEndpoint]);

  const updateConfig = (partial: Partial<AppConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const updateAuth = (partial: Partial<AuthState>) => {
    setAuth((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const addHistoryItem = (item: HistoryItem) => {
    setHistory((prev) => {
      // Guardar hasta un máximo de 50 peticiones
      const updated = [item, ...prev.slice(0, 49)];
      try {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch {}
  };

  const loadHistoryIntoBuilder = (historyItem: HistoryItem) => {
    // Buscar si existe un endpoint correspondiente en la especificación
    const match = endpoints.find(
      (ep) => ep.method === historyItem.method && ep.path === historyItem.path
    );

    if (match) {
      setSelectedEndpoint(match);
    }

    setRequestDraft({
      pathParams: { ...(historyItem.request.pathParams || {}) },
      queryParams: { ...(historyItem.request.queryParams || {}) },
      headers: { ...(historyItem.request.headers || {}) },
      body:
        historyItem.request.body !== undefined
          ? typeof historyItem.request.body === 'string'
            ? historyItem.request.body
            : JSON.stringify(historyItem.request.body, null, 2)
          : '',
    });

    setActiveTab('endpoints');
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        spec,
        endpoints,
        tagGroups,
        allTags,
        selectedEndpoint,
        setSelectedEndpoint,
        loadSpec,
        activePresetId,
        auth,
        updateAuth,
        config,
        updateConfig,
        history,
        addHistoryItem,
        clearHistory,
        lastResult,
        setLastResult,
        isExecuting,
        setIsExecuting,
        requestDraft,
        setRequestDraft,
        loadHistoryIntoBuilder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser utilizado dentro de un AppProvider');
  }
  return context;
};

