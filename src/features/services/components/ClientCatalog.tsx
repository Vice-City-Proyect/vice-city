'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, RefreshCw, Search, X } from 'lucide-react';
import type { CategoryWithServices } from '../types/catalog.types';
import {
  ClientServiceCard,
  mapServiceItemToClientItem,
  type ClientCatalogItem,
} from './ClientServiceCard';

export function ClientCatalog() {
  const [categories, setCategories] = useState<CategoryWithServices[]>([]);
  const [services, setServices] = useState<ClientCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchCatalog() {
      try {
        const res = await fetch('/api/catalog');
        if (!res.ok) {
          throw new Error(`Error en el servidor (${res.status})`);
        }

        const json = await res.json();
        if (!isMounted) return;

        if (json.success && json.data) {
          const fetchedCategories: CategoryWithServices[] = json.data.categories || [];
          setCategories(fetchedCategories);

          const flattenedServices: ClientCatalogItem[] = fetchedCategories.flatMap((category) =>
            category.services.map((service) => ({
              ...mapServiceItemToClientItem(service),
              categoryId: category.id,
              categoryName: category.name,
            }))
          );

          setServices(flattenedServices);
        } else {
          setError(json.message || 'No fue posible obtener el catálogo de servicios.');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
        setError(`No se pudo cargar el catálogo de servicios: ${msg}`);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCatalog();

    return () => {
      isMounted = false;
    };
  }, [retryTrigger]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRetryTrigger((prev) => prev + 1);
  };

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return services.filter((service) => {
      const matchesCategory =
        selectedCategory === 'ALL' || service.categoryId === selectedCategory;

      const matchesSearch =
        query === '' ||
        service.title.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  const resetFilters = () => {
    setSelectedCategory('ALL');
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filtros dinámicos por categoría */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              selectedCategory === 'ALL'
                ? 'bg-club-accent text-white shadow-xs'
                : 'border border-text-main/10 bg-club-surface text-text-muted hover:border-club-primary hover:text-club-accent'
            }`}
          >
            Todos ({services.length})
          </button>

          {categories.map((cat) => {
            const count = cat.services ? cat.services.length : 0;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  isSelected
                    ? 'bg-club-accent text-white shadow-xs'
                    : 'border border-text-main/10 bg-club-surface text-text-muted hover:border-club-primary hover:text-club-accent'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Buscador de servicios */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full rounded-2xl border border-text-main/15 bg-club-surface py-2.5 pl-10 pr-9 text-xs font-medium text-club-accent placeholder:text-text-muted/70 focus:border-club-accent focus:outline-none focus:ring-1 focus:ring-club-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-club-accent"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Estado de Carga: Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="flex h-[420px] flex-col justify-between overflow-hidden rounded-3xl border border-text-main/10 bg-club-surface p-5 animate-pulse"
            >
              <div className="flex flex-col gap-4">
                <div className="-mx-5 -mt-5 h-44 bg-text-main/10" />
                <div className="h-4 w-3/4 rounded-md bg-text-main/10" />
                <div className="h-3 w-full rounded-md bg-text-main/10" />
                <div className="h-3 w-5/6 rounded-md bg-text-main/10" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="h-6 w-1/3 rounded-md bg-text-main/10" />
                <div className="h-10 w-full rounded-xl bg-text-main/10" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado de Error con opción de reintentar */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-brand-red/20 bg-brand-red/5 p-8 text-center sm:p-12">
          <AlertTriangle className="h-10 w-10 text-brand-red" />
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-club-accent">Error al cargar servicios</h3>
            <p className="max-w-md text-xs leading-relaxed text-text-muted">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-club-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      )}

      {/* Estado Vacío */}
      {!loading && !error && filteredServices.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-text-main/10 bg-club-surface p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-club-bg text-text-muted">
            <Search className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-club-accent">No se encontraron servicios</h3>
            <p className="max-w-sm text-xs leading-relaxed text-text-muted">
              {searchQuery
                ? `No hay coincidencias para "${searchQuery}". Intenta con otros términos.`
                : 'No hay servicios disponibles en esta categoría actualmente.'}
            </p>
          </div>
          {(selectedCategory !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-text-main/10 bg-club-bg px-4 py-2 text-xs font-bold uppercase tracking-wider text-club-accent transition-colors hover:border-club-primary"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      )}

      {/* Cuadrícula Responsiva con Datos Reales */}
      {!loading && !error && filteredServices.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 sm:gap-6">
          {filteredServices.map((service) => (
            <ClientServiceCard key={service.id} item={service} />
          ))}
        </div>
      )}
    </div>
  );
}

