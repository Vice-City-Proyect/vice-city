import { OpenApiSpec } from '../types/openapi';

export interface PresetSpecItem {
  id: string;
  name: string;
  description: string;
  badge: string;
  spec: OpenApiSpec;
}

export const COMBINED_VICE_CITY_SPEC: OpenApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Vice City — Unified API Documentation',
    version: '1.0.0',
    description:
      'Catálogo completo de endpoints de Vice City (Autenticación, Recuperación, OAuth Google, Roles Administrativos, Empleados, Categorías y Servicios Deportivos).',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor local de desarrollo Next.js',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Registro, inicio de sesión y verificación' },
    { name: 'Auth - Password Reset', description: 'Recuperación de contraseña con tokens de un solo uso' },
    { name: 'Auth - Google OAuth', description: 'Federación e inicio de sesión social con Google' },
    { name: 'Auth - Logout', description: 'Cierre de sesión e invalidación de cookies JWT' },
    { name: 'Admin - Roles', description: 'Gestión administrativa de roles de usuarios y auditoría' },
    { name: 'Admin - Employees', description: 'Gestión administrativa de cuentas de empleados' },
    { name: 'Admin - Services', description: 'Gestión de servicios deportivos y categorías' },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar nuevo usuario',
        description: 'Valida los datos y registra una nueva cuenta con rol CLIENT y contraseña encriptada (bcrypt).',
        operationId: 'registerUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password'],
                additionalProperties: false,
                properties: {
                  fullName: { type: 'string', minLength: 2, example: 'Carlos Valderrama' },
                  email: { type: 'string', format: 'email', example: 'carlos@vicecity.com' },
                  password: { type: 'string', minLength: 8, example: 'Pive10Clave2026!' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Usuario registrado exitosamente' },
          '400': { description: 'Datos inválidos o campos no reconocidos' },
          '409': { description: 'Correo electrónico ya registrado' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión de usuario',
        description: 'Autentica credenciales (correo y contraseña) retornando id, email, name y rol SRS autorizado.',
        operationId: 'loginUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                additionalProperties: false,
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@vicecity.com' },
                  password: { type: 'string', minLength: 1, example: 'Admin123456!' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Inicio de sesión exitoso' },
          '400': { description: 'Solicitud malformada' },
          '401': { description: 'Credenciales inválidas' },
        },
      },
    },
    '/api/auth/session': {
      get: {
        tags: ['Auth'],
        summary: 'Consultar estado de sesión actual',
        description: 'Devuelve si existe una sesión activa y los datos básicos del usuario autenticado.',
        operationId: 'getSession',
        responses: {
          '200': { description: 'Estado de la sesión devuelto' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth - Logout'],
        summary: 'Cerrar sesión activa',
        description: 'Invalida y purga todas las cookies de sesión (next-auth.session-token) con Max-Age=0.',
        operationId: 'logout',
        responses: {
          '200': { description: 'Sesión cerrada exitosamente' },
        },
      },
      get: {
        tags: ['Auth - Logout'],
        summary: 'Cerrar sesión y redirigir al login',
        description: 'Emite una redirección HTTP 302/307 hacia /login tras limpiar las cookies.',
        operationId: 'logoutRedirect',
        responses: {
          '302': { description: 'Redirección al login' },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth - Password Reset'],
        summary: 'Solicitar enlace de recuperación de contraseña',
        description: 'Genera un token seguro con expiración de 1 hora e invalida tokens previos activos.',
        operationId: 'forgotPassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                additionalProperties: false,
                properties: {
                  email: { type: 'string', format: 'email', example: 'usuario@vicecity.com' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Enlace enviado al correo electrónico' },
          '400': { description: 'Validación fallida' },
          '404': { description: 'Usuario no encontrado' },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth - Password Reset'],
        summary: 'Restablecer contraseña con token de un solo uso',
        description: 'Consume el token, valida fortaleza mínima (8 caracteres) y actualiza el password_hash con bcrypt.',
        operationId: 'resetPassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'newPassword'],
                additionalProperties: false,
                properties: {
                  token: { type: 'string', minLength: 10, example: 'plain-token-crypto-uuid-12345' },
                  newPassword: { type: 'string', minLength: 8, example: 'NuevaClaveSegura2026!' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Contraseña restablecida exitosamente' },
          '400': { description: 'Token inválido o ya utilizado' },
          '410': { description: 'Token expirado' },
        },
      },
      get: {
        tags: ['Auth - Password Reset'],
        summary: 'Validar vigencia de token de recuperación sin consumirlo',
        description: 'Consulta si el token está activo para validar vistas previas en UI.',
        operationId: 'validateResetToken',
        parameters: [
          {
            name: 'token',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Token de recuperación recibido por email',
          },
        ],
        responses: {
          '200': { description: 'Token válido' },
          '400': { description: 'Token inválido' },
          '410': { description: 'Token vencido' },
        },
      },
    },
    '/api/auth/google': {
      post: {
        tags: ['Auth - Google OAuth'],
        summary: 'Iniciar o federar sesión con Google',
        description: 'Recibe el perfil autenticado por Google y crea la cuenta o la vincula sin duplicidad.',
        operationId: 'googleAuthLogin',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id', 'email', 'name'],
                additionalProperties: false,
                properties: {
                  id: { type: 'string', example: 'google-sub-1029384756' },
                  email: { type: 'string', format: 'email', example: 'deportista@gmail.com' },
                  name: { type: 'string', example: 'Deportista Vice City' },
                  picture: { type: 'string', format: 'uri', example: 'https://lh3.googleusercontent.com/photo.jpg' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Inicio de sesión con Google exitoso' },
          '400': { description: 'Perfil de Google inválido' },
          '403': { description: 'Cuenta inactiva' },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin - Roles'],
        summary: 'Listar usuarios del sistema de forma paginada',
        description: 'Requiere sesión de ADMIN (403 para otros roles). Permite filtros por texto y rol.',
        operationId: 'adminListUsers',
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'role', in: 'query', required: false, schema: { type: 'string', enum: ['ADMIN', 'CLIENT', 'TICKET_SELLER', 'QR_VALIDATOR'] } },
        ],
        responses: {
          '200': { description: 'Listado de usuarios recuperado' },
          '401': { description: 'No autenticado' },
          '403': { description: 'No autorizado (se requiere ADMIN)' },
        },
      },
    },
    '/api/admin/users/{id}/role': {
      patch: {
        tags: ['Admin - Roles'],
        summary: 'Actualizar rol de un usuario con auditoría',
        description: 'Permite a un ADMIN asignar uno de los 4 roles del SRS. Previene degradar al último ADMIN.',
        operationId: 'adminUpdateRole',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID del usuario objetivo' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                additionalProperties: false,
                properties: {
                  role: { type: 'string', enum: ['ADMIN', 'CLIENT', 'TICKET_SELLER', 'QR_VALIDATOR'], example: 'TICKET_SELLER' },
                  reason: { type: 'string', maxLength: 255, example: 'Asignación a taquilla de fin de semana' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Rol actualizado exitosamente' },
          '400': { description: 'Rol inválido o intento de degradar al único ADMIN' },
          '401': { description: 'No autenticado' },
          '403': { description: 'Permisos insuficientes' },
          '404': { description: 'Usuario no encontrado' },
        },
      },
    },
    '/api/employees': {
      get: {
        tags: ['Admin - Employees'],
        summary: 'Listar empleados (TICKET_SELLER y QR_VALIDATOR)',
        description: 'Retorna empleados del complejo deportivo. Exclusivo para ADMIN.',
        operationId: 'listEmployees',
        responses: {
          '200': { description: 'Lista de empleados' },
          '403': { description: 'Requiere rol ADMIN' },
        },
      },
      post: {
        tags: ['Admin - Employees'],
        summary: 'Crear nuevo empleado',
        description: 'Crea una cuenta con rol TICKET_SELLER o QR_VALIDATOR encriptando su clave.',
        operationId: 'createEmployee',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password', 'role'],
                properties: {
                  fullName: { type: 'string', example: 'Mariana Pajón' },
                  email: { type: 'string', format: 'email', example: 'mariana@vicecity.com' },
                  password: { type: 'string', minLength: 8, example: 'Taquilla2026!' },
                  role: { type: 'string', enum: ['TICKET_SELLER', 'QR_VALIDATOR'], example: 'TICKET_SELLER' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Empleado creado exitosamente' },
          '400': { description: 'Rol no permitido o datos inválidos' },
          '403': { description: 'Requiere rol ADMIN' },
        },
      },
    },
    '/api/employees/{id}': {
      get: {
        tags: ['Admin - Employees'],
        summary: 'Consultar empleado por ID',
        description: 'Obtiene el detalle de un empleado por su identificador UUID. Exclusivo para ADMIN.',
        operationId: 'getEmployeeById',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Detalle del empleado' },
          '404': { description: 'Empleado no encontrado' },
          '403': { description: 'Requiere rol ADMIN' },
        },
      },
      patch: {
        tags: ['Admin - Employees'],
        summary: 'Actualizar o cambiar estado de empleado',
        description: 'Permite desactivar (is_active = false) o actualizar datos de un empleado.',
        operationId: 'updateEmployee',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  full_name: { type: 'string', example: 'Mariana Pajón Actualizada' },
                  phone: { type: 'string', example: '+57 301 987 6543' },
                  role: { type: 'string', enum: ['TICKET_SELLER', 'QR_VALIDATOR'] },
                  is_active: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Estado o datos actualizados' },
          '400': { description: 'El administrador no puede desactivarse a sí mismo' },
          '403': { description: 'Requiere rol ADMIN' },
        },
      },
      delete: {
        tags: ['Admin - Employees'],
        summary: 'Desactivar empleado (baja lógica)',
        description: 'Desactiva el empleado para impedir su inicio de sesión en taquilla o escáner.',
        operationId: 'deactivateEmployee',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Empleado desactivado' },
          '400': { description: 'No se puede desactivar al propio administrador' },
          '403': { description: 'Requiere rol ADMIN' },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['Admin - Services'],
        summary: 'Listar categorías deportivas',
        description: 'Retorna piscinas, canchas, gimnasio, zona húmeda.',
        operationId: 'listCategories',
        responses: {
          '200': { description: 'Listado de categorías' },
        },
      },
    },
    '/api/services': {
      get: {
        tags: ['Admin - Services'],
        summary: 'Listar catálogo de servicios deportivos',
        description: 'Consulta los servicios con sus aforos y tarifas vigentes.',
        operationId: 'listServices',
        responses: {
          '200': { description: 'Listado de servicios' },
        },
      },
    },
    '/api/services/{id}': {
      patch: {
        tags: ['Admin - Services'],
        summary: 'Ajustar tarifa base de un servicio (RN-007)',
        description: 'Ajusta el precio base sin alterar reservas históricas ni en hold.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['price'],
                properties: {
                  price: { type: 'number', minimum: 0, example: 25000 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Tarifa actualizada exitosamente' },
          '400': { description: 'Precio inválido o negativo' },
          '403': { description: 'Requiere rol ADMIN' },
        },
      },
    },
  },
};

export const PRESET_SPECS: PresetSpecItem[] = [
  {
    id: 'combined',
    name: 'Vice City — API Completa (Todas las HUs)',
    description: 'Catálogo unificado con los 15 endpoints del complejo deportivo (Auth, Roles, Servicios, Empleados).',
    badge: 'Recomendado',
    spec: COMBINED_VICE_CITY_SPEC,
  },
  {
    id: 'roles',
    name: 'HU07 — Gestión de Roles y Usuarios',
    description: 'Endpoints administrativos para listar usuarios (/api/admin/users) y actualizar roles con auditoría.',
    badge: 'HU-07',
    spec: {
      openapi: '3.0.3',
      info: { title: 'HU07 — Gestión de Roles', version: '1.0.0' },
      paths: {
        '/api/admin/users': COMBINED_VICE_CITY_SPEC.paths['/api/admin/users'],
        '/api/admin/users/{id}/role': COMBINED_VICE_CITY_SPEC.paths['/api/admin/users/{id}/role'],
      },
    },
  },
  {
    id: 'auth-login',
    name: 'HU02 — Inicio de Sesión y Consulta',
    description: 'Endpoints para autenticación local con credenciales (/api/auth/login) y consulta de sesión.',
    badge: 'HU-02',
    spec: {
      openapi: '3.0.3',
      info: { title: 'HU02 — Login y Sesión', version: '1.0.0' },
      paths: {
        '/api/auth/login': COMBINED_VICE_CITY_SPEC.paths['/api/auth/login'],
        '/api/auth/session': COMBINED_VICE_CITY_SPEC.paths['/api/auth/session'],
      },
    },
  },
  {
    id: 'auth-reset',
    name: 'HU04 — Recuperación de Contraseña',
    description: 'Solicitud (/api/auth/forgot-password) y restablecimiento con token único (/api/auth/reset-password).',
    badge: 'HU-04',
    spec: {
      openapi: '3.0.3',
      info: { title: 'HU04 — Recuperación de Contraseña', version: '1.0.0' },
      paths: {
        '/api/auth/forgot-password': COMBINED_VICE_CITY_SPEC.paths['/api/auth/forgot-password'],
        '/api/auth/reset-password': COMBINED_VICE_CITY_SPEC.paths['/api/auth/reset-password'],
      },
    },
  },
  {
    id: 'employees-services',
    name: 'HU17-19 — Empleados y Tarifas Dinámicas',
    description: 'CRUD de empleados de taquilla/escáner y ajuste dinámico de tarifas (RN-007).',
    badge: 'HU17-19',
    spec: {
      openapi: '3.0.3',
      info: { title: 'HU17-19 — Catálogo, Tarifas y Empleados', version: '1.0.0' },
      paths: {
        '/api/employees': COMBINED_VICE_CITY_SPEC.paths['/api/employees'],
        '/api/employees/{id}': COMBINED_VICE_CITY_SPEC.paths['/api/employees/{id}'],
        '/api/categories': COMBINED_VICE_CITY_SPEC.paths['/api/categories'],
        '/api/services': COMBINED_VICE_CITY_SPEC.paths['/api/services'],
        '/api/services/{id}': COMBINED_VICE_CITY_SPEC.paths['/api/services/{id}'],
      },
    },
  },
];

