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
    { name: 'Admin - Reservations (MR1)', description: 'Gestión administrativa de reservas: consulta, detalle, reprogramación y cancelación' },
    { name: 'Admin - Employees', description: 'Gestión administrativa de cuentas de empleados' },
    { name: 'Admin - Services', description: 'Gestión de servicios deportivos y categorías' },
    { name: 'Reservations & Catalog (FT-04)', description: 'Catálogo público, disponibilidad horaria, HOLD de 10 min y descuentos' },
    { name: 'Payments & Stripe (FT-05)', description: 'Checkout con tarjeta mediante Stripe Test y webhook de confirmación' },
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
        summary: '[RETIRADO] Iniciar o federar sesión con Google',
        description: 'RETIRADO (VCP-84): ya no ejecuta lógica y responde 410 ENDPOINT_RETIRED. El login con Google se hace solo por NextAuth (GET /api/auth/signin/google), que exige email_verified === true.',
        deprecated: true,
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
          '410': { description: 'Endpoint retirado (ENDPOINT_RETIRED)' },
          '400': { description: 'Cuerpo con formato inválido' },
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
    '/api/admin/reservations': {
      get: {
        tags: ['Admin - Reservations (MR1)'],
        summary: 'Listar reservas administrativas con filtros y paginación',
        description: 'Retorna el listado paginado de reservas consolidando clientes, servicios, estado de pagos y tickets. Exclusivo para administradores.',
        operationId: 'listAdminReservations',
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['ALL', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED', 'EXPIRED'] } },
          { name: 'serviceId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'date', in: 'query', required: false, schema: { type: 'string', example: '2026-10-20' } },
          { name: 'slot', in: 'query', required: false, schema: { type: 'string', example: '10:00' } },
          { name: 'search', in: 'query', required: false, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Listado de reservas obtenido exitosamente' },
          '400': { description: 'Parámetros de consulta inválidos' },
          '401': { description: 'No autenticado' },
          '403': { description: 'Acceso denegado: se requiere rol ADMIN' },
          '500': { description: 'Error interno del servidor' },
        },
      },
    },
    '/api/admin/reservations/{id}': {
      get: {
        tags: ['Admin - Reservations (MR1)'],
        summary: 'Consultar detalle administrativo extendido de una reserva',
        description: 'Retorna información detallada de una reserva incluyendo desglose de pagos, trazabilidad de tickets y registros de acceso.',
        operationId: 'getAdminReservationById',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID de la reserva' },
        ],
        responses: {
          '200': { description: 'Detalle de la reserva obtenido exitosamente' },
          '400': { description: 'Identificador UUID inválido' },
          '401': { description: 'No autenticado' },
          '403': { description: 'Acceso denegado: se requiere rol ADMIN' },
          '404': { description: 'Reserva no encontrada' },
          '500': { description: 'Error interno del servidor' },
        },
      },
      patch: {
        tags: ['Admin - Reservations (MR1)'],
        summary: 'Actualizar, reprogramar o cancelar lógicamente una reserva',
        description: 'Permite reprogramar horario, modificar aforo/asistentes o cancelar lógicamente la reserva con motivo registrado sin borrar pagos ni tickets.',
        operationId: 'updateAdminReservation',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'UUID de la reserva a actualizar o cancelar' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['CANCELLED', 'CONFIRMED', 'PENDING'] },
                  cancellationReason: { type: 'string', minLength: 5, maxLength: 500 },
                  date: { type: 'string', example: '2026-10-20' },
                  startTime: { type: 'string', example: '10:00' },
                  endTime: { type: 'string', example: '11:00' },
                  guests: { type: 'integer', minimum: 1, maximum: 50 },
                  notes: { type: 'string', maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Reserva actualizada o cancelada exitosamente' },
          '400': { description: 'Cuerpo inválido, campos no permitidos o duración fuera de regla' },
          '401': { description: 'No autenticado' },
          '403': { description: 'Acceso denegado: se requiere rol ADMIN' },
          '404': { description: 'Reserva no encontrada' },
          '409': { description: 'Conflicto: aforo insuficiente o solapamiento con otra reserva (SLOT_NOT_AVAILABLE)' },
          '500': { description: 'Error interno del servidor' },
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
    '/api/catalog': {
      get: {
        tags: ['Reservations & Catalog (FT-04)'],
        summary: 'Obtener catálogo público de servicios y categorías (HU20)',
        description: 'Retorna las categorías activas y sus servicios con precios y aforos.',
        operationId: 'getCatalog',
        parameters: [
          { name: 'categoryId', in: 'query', required: false, schema: { type: 'string', format: 'uuid' } },
          { name: 'includeInactive', in: 'query', required: false, schema: { type: 'boolean', default: false } },
        ],
        responses: {
          '200': { description: 'Catálogo obtenido exitosamente' },
          '400': { description: 'Parámetros inválidos' },
        },
      },
    },
    '/api/availability': {
      get: {
        tags: ['Reservations & Catalog (FT-04)'],
        summary: 'Consultar disponibilidad y aforo por fecha (HU20)',
        description: 'Calcula cupos restantes para las 9 franjas (08:00 a 17:00), validando mantenimiento (lunes/martes festivo) y compras en curso (RN-010).',
        operationId: 'getAvailability',
        parameters: [
          { name: 'serviceId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' }, example: '2026-10-15' },
        ],
        responses: {
          '200': { description: 'Disponibilidad calculada exitosamente' },
          '400': { description: 'Fecha fuera de rango o en el pasado' },
          '404': { description: 'Servicio no encontrado' },
        },
      },
    },
    '/api/reservations/hold': {
      post: {
        tags: ['Reservations & Catalog (FT-04)'],
        summary: 'Crear reserva con retención temporal (HOLD) de 10 min (HU21)',
        description: 'Crea reserva en pending bloqueando aforo y congelando tarifa histórica por 10 min.',
        operationId: 'createHoldReservation',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'serviceId', 'startAt', 'endAt'],
                properties: {
                  userId: { type: 'string', format: 'uuid', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
                  serviceId: { type: 'string', format: 'uuid', example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' },
                  startAt: { type: 'string', format: 'date-time', example: '2026-10-15T09:00:00-05:00' },
                  endAt: { type: 'string', format: 'date-time', example: '2026-10-15T10:00:00-05:00' },
                  quantity: { type: 'integer', default: 1, example: 2 },
                  notes: { type: 'string', example: 'Reserva para entrenamiento' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Reserva creada y HOLD retenido' },
          '400': { description: 'Horario o duración inválida' },
          '409': { description: 'Aforo insuficiente / Cupo lleno' },
        },
      },
    },
    '/api/reservations/{id}': {
      get: {
        tags: ['Reservations & Catalog (FT-04)'],
        summary: 'Consultar detalles y tiempo restante de HOLD (HU21)',
        description: 'Consulta estado de la reserva y segundos restantes antes de que expire el HOLD.',
        operationId: 'getReservationHoldStatus',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Detalle de reserva obtenido' },
          '404': { description: 'Reserva no encontrada' },
        },
      },
    },
    '/api/pricing/calculate': {
      post: {
        tags: ['Reservations & Catalog (FT-04)'],
        summary: 'Calcular tarifa de reserva con descuentos automáticos (HU22)',
        description: 'Calcula descuentos del 20% los miércoles (RN-013) o piscina completa (RN-014) y regla de no acumulación (RN-015).',
        operationId: 'calculatePricing',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['serviceId', 'date', 'startAt', 'endAt'],
                properties: {
                  serviceId: { type: 'string', format: 'uuid', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
                  date: { type: 'string', format: 'date', example: '2026-10-14' },
                  startAt: { type: 'string', format: 'date-time', example: '2026-10-14T09:00:00-05:00' },
                  endAt: { type: 'string', format: 'date-time', example: '2026-10-14T10:00:00-05:00' },
                  quantity: { type: 'integer', default: 1, example: 1 },
                  isFullPool: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Tarifa calculada con descuentos exitosamente' },
          '400': { description: 'Parámetros inválidos' },
          '422': { description: 'Piscina completa restringida en fin de semana o festivo' },
        },
      },
    },
    '/api/payments/create-intent': {
      post: {
        tags: ['Payments & Stripe (FT-05)'],
        summary: 'Crear o recuperar Payment Intent de Stripe (HU23)',
        description: 'Genera PaymentIntent con tarifa histórica, valida HOLD de 10 min y previene doble cobro.',
        operationId: 'createPaymentIntent',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['bookingId'],
                properties: {
                  bookingId: { type: 'string', format: 'uuid', example: 'd3b07384-d113-4c91-9c60-8f9f6885dfb2' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'PaymentIntent creado o recuperado exitosamente' },
          '400': { description: 'Parámetros inválidos' },
          '404': { description: 'Reserva no encontrada' },
          '409': { description: 'Reserva ya pagada y confirmada' },
          '410': { description: 'Tiempo de retención HOLD expirado' },
          '502': { description: 'Error al comunicarse con Stripe' },
        },
      },
    },
    '/api/payments/webhook': {
      post: {
        tags: ['Payments & Stripe (FT-05)'],
        summary: 'Webhook oficial de Stripe y confirmación de tickets (HU24)',
        description: 'Valida firma criptográfica stripe-signature, confirma reserva y emite ticket digital con QR.',
        operationId: 'handleStripeWebhook',
        parameters: [
          { name: 'stripe-signature', in: 'header', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': { description: 'Evento procesado exitosamente o ya procesado (idempotente)' },
          '400': { description: 'Firma de webhook inválida' },
          '404': { description: 'Reserva no encontrada' },
          '500': { description: 'Error interno del servidor' },
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
  {
    id: 'ft04-reservations',
    name: 'FT-04 — Motor de Reservas & HOLD (HU20-22)',
    description: 'Catálogo público (/api/catalog), disponibilidad horaria (/api/availability), retención HOLD 10 min (/api/reservations/hold) y descuentos (/api/pricing/calculate).',
    badge: 'FT-04',
    spec: {
      openapi: '3.0.3',
      info: { title: 'FT-04 — Motor de Reservas & HOLD', version: '1.0.0' },
      paths: {
        '/api/catalog': COMBINED_VICE_CITY_SPEC.paths['/api/catalog'],
        '/api/availability': COMBINED_VICE_CITY_SPEC.paths['/api/availability'],
        '/api/reservations/hold': COMBINED_VICE_CITY_SPEC.paths['/api/reservations/hold'],
        '/api/reservations/{id}': COMBINED_VICE_CITY_SPEC.paths['/api/reservations/{id}'],
        '/api/pricing/calculate': COMBINED_VICE_CITY_SPEC.paths['/api/pricing/calculate'],
      },
    },
  },
  {
    id: 'ft05-payments',
    name: 'FT-05 — Pagos & Stripe Webhook (HU23-24)',
    description: 'Checkout seguro con tarjeta Stripe Test (/api/payments/create-intent) y recepción de webhooks con emisión de tickets (/api/payments/webhook).',
    badge: 'FT-05',
    spec: {
      openapi: '3.0.3',
      info: { title: 'FT-05 — Pagos y Stripe Webhook', version: '1.0.0' },
      paths: {
        '/api/payments/create-intent': COMBINED_VICE_CITY_SPEC.paths['/api/payments/create-intent'],
        '/api/payments/webhook': COMBINED_VICE_CITY_SPEC.paths['/api/payments/webhook'],
      },
    },
  },
  {
    id: 'mr1-reservations',
    name: 'MR1 — Gestión de Reservas Administrativas',
    description: 'Endpoints administrativos para listar reservas (/api/admin/reservations), obtener detalle y editar/cancelar (/api/admin/reservations/{id}).',
    badge: 'MR1',
    spec: {
      openapi: '3.0.3',
      info: { title: 'MR1 — Gestión de Reservas Administrativas', version: '1.0.0' },
      paths: {
        '/api/admin/reservations': COMBINED_VICE_CITY_SPEC.paths['/api/admin/reservations'],
        '/api/admin/reservations/{id}': COMBINED_VICE_CITY_SPEC.paths['/api/admin/reservations/{id}'],
      },
    },
  },
];

