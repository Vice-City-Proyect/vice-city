import { redirect } from 'next/navigation';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Redirección de compatibilidad para la ruta /client -> /cliente (HU28)
 * Evita error 404 preservando parámetros de consulta si existen.
 */
export default async function ClientRedirectPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  if (params && Object.keys(params).length > 0) {
    const sp = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (Array.isArray(val)) {
        val.forEach((v) => sp.append(key, v));
      } else if (val !== undefined) {
        sp.append(key, val);
      }
    }
    const query = sp.toString();
    redirect(query ? `/cliente?${query}` : '/cliente');
  }

  redirect('/cliente');
}
