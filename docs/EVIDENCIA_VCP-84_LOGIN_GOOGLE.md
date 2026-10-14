# Evidencia VCP-84 — Prueba real de inicio de sesión con Google

Registro de la verificación pedida por QA en el PR #57 ("verificar la configuración de Google Cloud y realizar una prueba real de inicio de sesión en navegador"). Fecha de la prueba: 2026-10-14. Entorno: local (`http://localhost:3000`) contra la base compartida de Supabase. Los correos están enmascarados y no se incluye ningún secreto.

## 1. Configuración verificada

| Verificación | Resultado |
|---|---|
| `GET /api/auth/providers` lista `google` con `callbackUrl` `http://localhost:3000/api/auth/callback/google` | OK |
| Botón "Continue with Google" en `/login` redirige a `accounts.google.com` | OK |
| Google muestra "Accede a tu cuenta — Ir a Vice City" (sin `redirect_uri_mismatch` ni "app bloqueada") | OK: el Client ID es válido y el redirect local está registrado en Google Cloud |
| Inicio de sesión con una cuenta Gmail real | OK: el usuario ingresó a la aplicación |

## 2. Resultado en la base de datos (consulta de solo lectura)

Cuenta que inició sesión (`and***@gmail.com`):

| Campo | Valor |
|---|---|
| Rol | `customer` (cliente), no administrador |
| `metadata.email_verified` | `true` (Google confirmó el correo; pasa la regla `email_verified === true` de VCP-84) |
| Proveedor vinculado (`linked_accounts`) | `google` |
| Contraseña local (`password_hash`) | no existe (cuenta federada) |
| Estado | activo, con `last_login_at` registrado |

## 3. Comportamiento de seguridad ya validado antes

- `POST /api/auth/google` con un perfil inventado responde `410 ENDPOINT_RETIRED` y no crea usuario (0 filas).
- NextAuth rechaza cuentas de Google con `email_verified` en `false` o ausente (pruebas unitarias en `tests/unit/google-auth.api.test.mjs`).

## 4. Pendiente (no es código)

- Registrar en Google Cloud el dominio de producción y `https://<dominio>/api/auth/callback/google`. Requiere definir el dominio.
- El rechazo por `email_verified === false` solo está cubierto por pruebas unitarias: no es posible provocarlo con una cuenta real de Google, que siempre envía el claim en `true`.

## 5. Alcance de la prueba

Solo se validó el entorno local. No se probó en producción ni con el dominio final. La cuenta de prueba quedó creada en la base compartida como cliente.
