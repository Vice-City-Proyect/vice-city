'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AdminReservationPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function AdminReservationPagination({
  page,
  totalPages,
  onPageChange,
}: AdminReservationPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Paginación de reservas"
      className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-4"
    >
      <Button
        type="button"
        variant="dark"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </Button>
      <span className="text-xs font-bold text-text-muted">
        Página {page} de {totalPages}
      </span>
      <Button
        type="button"
        variant="dark"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
