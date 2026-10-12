export type AuthMode = 'none' | 'cookie' | 'bearer' | 'mock-role' | 'custom';

export type SRSRole = 'ADMIN' | 'CLIENT' | 'TICKET_SELLER' | 'QR_VALIDATOR' | 'USER';

export interface CustomHeader {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthState {
  mode: AuthMode;
  cookieName: string;
  cookieValue: string;
  bearerToken: string;
  mockRole: SRSRole;
  mockUserId?: string;
  customHeaders: CustomHeader[];
}

export const DEFAULT_AUTH_STATE: AuthState = {
  mode: 'none',
  cookieName: 'next-auth.session-token',
  cookieValue: '',
  bearerToken: '',
  mockRole: 'ADMIN',
  mockUserId: 'adm-00000000-0000-0000-0000-000000000001',
  customHeaders: [],
};

