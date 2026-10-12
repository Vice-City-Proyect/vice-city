import {
  CalendarDays,
  Dumbbell,
  Home,
  LayoutDashboard,
  Receipt,
  ScanLine,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/reservas', label: 'Reservas', icon: CalendarDays },
  { href: '/admin/servicios', label: 'Servicios', icon: Dumbbell },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/ganancias', label: 'Ganancias', icon: Wallet },
];

export const CLIENT_NAV: NavItem[] = [
  { href: '/cliente', label: 'Inicio', icon: Home },
  { href: '/cliente/reservas', label: 'Mis reservas', icon: CalendarDays },
  { href: '/cliente/perfil', label: 'Mi perfil', icon: User },
];

export const EMPLOYEE_NAV: NavItem[] = [
  { href: '/empleado', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/empleado/reservas', label: 'Reservas', icon: CalendarDays },
  { href: '/empleado/pos', label: 'Punto de venta', icon: Receipt },
  { href: '/empleado/qr', label: 'Validación QR', icon: ScanLine },
];

export const ROLE_LABELS = {
  ADMIN: 'Administrador',
  CLIENT: 'Cliente',
  TICKET_SELLER: 'Vendedor de tiquetes',
  QR_VALIDATOR: 'Validador QR',
} as const;
