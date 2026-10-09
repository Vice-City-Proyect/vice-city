export type UserRole = 'ADMIN' | 'CLIENT' | 'TICKET_SELLER' | 'QR_VALIDATOR';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  registeredAt: string;
}
