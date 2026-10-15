import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeInternalCallbackUrl,
  extractRoleFromSession,
} from '../../src/features/auth/utils/url-sanitizer.ts';

const DASHBOARD_BY_ROLE = {
  ADMIN: '/admin',
  CLIENT: '/cliente',
  TICKET_SELLER: '/employee/pos',
  QR_VALIDATOR: '/empleado/qr',
};

function resolveRedirectDestination(role, callbackUrl) {
  const safeCallback = sanitizeInternalCallbackUrl(callbackUrl);
  const roleDestination = role ? DASHBOARD_BY_ROLE[role] || '/' : '/';
  return safeCallback || roleDestination;
}

describe('HU28 / PR #59: Sanitización de callbackUrl y Prevención de Redirección Abierta', () => {
  test('1. Rechaza valores nulos, vacíos o rutas reservadas (/ y /login)', () => {
    assert.equal(sanitizeInternalCallbackUrl(null), null);
    assert.equal(sanitizeInternalCallbackUrl(undefined), null);
    assert.equal(sanitizeInternalCallbackUrl(''), null);
    assert.equal(sanitizeInternalCallbackUrl('   '), null);
    assert.equal(sanitizeInternalCallbackUrl('/'), null);
    assert.equal(sanitizeInternalCallbackUrl('/login'), null);
    assert.equal(sanitizeInternalCallbackUrl(' /login '), null);
  });

  test('2. Defensa Open Redirect: rechaza URLs absolutas con esquema externo', () => {
    assert.equal(sanitizeInternalCallbackUrl('https://evil.example'), null);
    assert.equal(sanitizeInternalCallbackUrl('http://evil.com/phishing'), null);
    assert.equal(sanitizeInternalCallbackUrl('javascript:alert(1)'), null);
    assert.equal(sanitizeInternalCallbackUrl('data:text/html,evil'), null);
    assert.equal(sanitizeInternalCallbackUrl('ftp://evil.example/file'), null);
  });

  test('3. Defensa Open Redirect: rechaza URLs relativas al protocolo (//)', () => {
    assert.equal(sanitizeInternalCallbackUrl('//evil.example'), null);
    assert.equal(sanitizeInternalCallbackUrl('//evil.com/path'), null);
    assert.equal(sanitizeInternalCallbackUrl('///evil.example'), null);
  });

  test('4. Defensa Open Redirect: rechaza caracteres de escape y barras invertidas', () => {
    assert.equal(sanitizeInternalCallbackUrl('/\\evil.example'), null);
    assert.equal(sanitizeInternalCallbackUrl('/\\/evil.com'), null);
  });

  test('5. Permite y preserva rutas internas relativas legítimas', () => {
    assert.equal(sanitizeInternalCallbackUrl('/admin/reports'), '/admin/reports');
    assert.equal(sanitizeInternalCallbackUrl('/cliente/reservas'), '/cliente/reservas');
    assert.equal(sanitizeInternalCallbackUrl('/employee/pos?filter=active'), '/employee/pos?filter=active');
    assert.equal(sanitizeInternalCallbackUrl('/empleado/qr'), '/empleado/qr');
    assert.equal(sanitizeInternalCallbackUrl('/cliente/perfil#seguridad'), '/cliente/perfil#seguridad');
  });
});

describe('HU28 / PR #59: Extracción tipada y resiliente del rol de usuario', () => {
  test('1. Extrae rol desde session.user.role (NextAuth estándar)', () => {
    const session = {
      user: {
        id: 'usr-1',
        email: 'admin@vicecity.com',
        role: 'ADMIN',
      },
    };
    assert.equal(extractRoleFromSession(session), 'ADMIN');
  });

  test('2. Extrae rol desde session.data.role (Respuesta estructurada /api/auth/session)', () => {
    const session = {
      success: true,
      authenticated: true,
      data: {
        id: 'usr-2',
        email: 'cliente@vicecity.com',
        role: 'CLIENT',
      },
    };
    assert.equal(extractRoleFromSession(session), 'CLIENT');
  });

  test('3. Prioriza session.user.role si ambos existen', () => {
    const session = {
      user: { role: 'ADMIN' },
      data: { role: 'CLIENT' },
    };
    assert.equal(extractRoleFromSession(session), 'ADMIN');
  });

  test('4. Maneja sesiones nulas, vacías o malformadas sin lanzar error', () => {
    assert.equal(extractRoleFromSession(null), undefined);
    assert.equal(extractRoleFromSession(undefined), undefined);
    assert.equal(extractRoleFromSession('not-an-object'), undefined);
    assert.equal(extractRoleFromSession({}), undefined);
    assert.equal(extractRoleFromSession({ user: {} }), undefined);
    assert.equal(extractRoleFromSession({ data: {} }), undefined);
  });

  test('5. Normaliza roles en minúsculas y alias legacy (admin -> ADMIN, customer -> CLIENT)', () => {
    assert.equal(extractRoleFromSession({ user: { role: 'admin' } }), 'ADMIN');
    assert.equal(extractRoleFromSession({ user: { role: 'client' } }), 'CLIENT');
    assert.equal(extractRoleFromSession({ data: { role: 'customer' } }), 'CLIENT');
    assert.equal(extractRoleFromSession({ data: { role: 'ticket_seller' } }), 'TICKET_SELLER');
    assert.equal(extractRoleFromSession({ user: { role: 'qr_validator' } }), 'QR_VALIDATOR');
  });
});

describe('HU28 / PR #59: Redirecciones oficiales por rol (DASHBOARD_BY_ROLE)', () => {
  test('ADMIN redirige a /admin', () => {
    assert.equal(resolveRedirectDestination('ADMIN', null), '/admin');
  });

  test('CLIENT redirige a /cliente', () => {
    assert.equal(resolveRedirectDestination('CLIENT', null), '/cliente');
  });

  test('TICKET_SELLER redirige a /employee/pos', () => {
    assert.equal(resolveRedirectDestination('TICKET_SELLER', null), '/employee/pos');
  });

  test('QR_VALIDATOR redirige a /empleado/qr', () => {
    assert.equal(resolveRedirectDestination('QR_VALIDATOR', null), '/empleado/qr');
  });

  test('Rol desconocido o ausente cae a /', () => {
    assert.equal(resolveRedirectDestination(null, null), '/');
    assert.equal(resolveRedirectDestination('UNKNOWN', null), '/');
  });
});

describe('HU28 / PR #59: Guardián de sesión y protección integrada contra Open Redirect', () => {
  test('Ataque https://evil.example es neutralizado y redirige al dashboard del rol', () => {
    const destination = resolveRedirectDestination('ADMIN', 'https://evil.example');
    assert.equal(destination, '/admin');
  });

  test('Ataque //evil.example es neutralizado y redirige al dashboard del rol', () => {
    const destination = resolveRedirectDestination('CLIENT', '//evil.example/login');
    assert.equal(destination, '/cliente');
  });

  test('Ruta interna legítima /admin/reports es permitida y preservada', () => {
    const destination = resolveRedirectDestination('ADMIN', '/admin/reports');
    assert.equal(destination, '/admin/reports');
  });

  test('Usuario con sesión activa entrando a /login sin callbackUrl redirige a su rol', () => {
    const session = { user: { role: 'TICKET_SELLER' } };
    const role = extractRoleFromSession(session);
    const destination = resolveRedirectDestination(role, null);
    assert.equal(destination, '/employee/pos');
  });

  test('Usuario con sesión activa entrando a /login con ataque Open Redirect va a su rol', () => {
    const session = { data: { role: 'QR_VALIDATOR' } };
    const role = extractRoleFromSession(session);
    const destination = resolveRedirectDestination(role, 'https://evil.example');
    assert.equal(destination, '/empleado/qr');
  });
});
