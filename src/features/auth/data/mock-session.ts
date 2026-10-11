export interface MockSession {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const MOCK_ADMIN_SESSION: MockSession = {
  id: 'usr-001',
  name: 'Andrés Ríos',
  email: 'admin@vicecityiguana.co',
  role: 'ADMIN',
};

export const MOCK_EMPLOYEE_SESSION: MockSession = {
  id: 'usr-201',
  name: 'Carlos Pérez',
  email: 'carlos.perez@vicecityiguana.co',
  role: 'TICKET_SELLER',
};

export const MOCK_CLIENT_SESSION: MockSession = {
  id: 'usr-101',
  name: 'Laura Mendoza',
  email: 'laura.mendoza@correo.com',
  role: 'CLIENT',
};

