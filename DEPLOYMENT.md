# Guía de Despliegue en Producción — Vice City

Esta guía detalla paso a paso el despliegue del proyecto **Vice City** en un servidor VPS con Ubuntu (2 vCPU, ~3.7 GiB RAM) utilizando **Docker Compose**, **Nginx** como proxy inverso y **Certbot** para la emisión y renovación automática de certificados SSL/TLS (HTTPS).

- **Dominio de producción:** `https://vicecity.coderhivex.com`
- **Servicio interno:** Contenedor Docker escuchando exclusivamente en `127.0.0.1:3000`
- **Base de datos:** PostgreSQL en la nube mediante Supabase (sin contenedor local de BD)

---

## 1. Requisitos Previos en el Servidor VPS

Asegúrate de contar con las siguientes herramientas instaladas en Ubuntu:

```bash
# Actualizar repositorios e instalar paquetes base
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw nginx certbot python3-certbot-nginx

# Instalar Docker y Docker Compose (si aún no están instalados)
sudo apt install -y docker.io docker-compose-v2

# Habilitar e iniciar el servicio de Docker
sudo systemctl enable --now docker

# (Opcional) Permitir ejecutar Docker sin sudo para tu usuario
sudo usermod -aG docker $USER
newgrp docker
```

---

## 2. Configuración de Variables de Entorno de Producción

En la raíz del proyecto (`/ruta/del/proyecto/vice-city`), crea el archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Configura los valores de producción reales:

```ini
# ==============================================================================
# 1. BASE DE DATOS SUPABASE + PRISMA
# ==============================================================================
# Connection pooler (puerto 6543) para transacciones en runtime
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Conexión directa (puerto 5432) para CLI de Prisma (migraciones y pull)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# ==============================================================================
# 2. SUPABASE API CLIENT
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# ==============================================================================
# 3. AUTENTICACIÓN (NextAuth v4)
# ==============================================================================
# Generar clave secreta obligatoria de 32 bytes:
# openssl rand -base64 32
NEXTAUTH_SECRET="tu-clave-secreta-generada-con-openssl-base64-32"

# URLs canónicas de producción (HTTPS obligatorio)
NEXTAUTH_URL="https://vicecity.coderhivex.com"
NEXT_PUBLIC_APP_URL="https://vicecity.coderhivex.com"

# Cabeceras de simulación de rol: NUNCA habilitar en producción
# ENABLE_MOCK_AUTH_HEADERS="false"

# ==============================================================================
# 4. GOOGLE OAUTH 2.0 (Opcional)
# ==============================================================================
GOOGLE_CLIENT_ID="tu-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-google-client-secret"

# ==============================================================================
# 5. STRIPE (Pagos)
# ==============================================================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_tu_stripe_publishable_key"
STRIPE_SECRET_KEY="sk_live_tu_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_tu_stripe_webhook_secret"

# ==============================================================================
# 6. CORREO ELECTRÓNICO (Resend / SMTP)
# ==============================================================================
RESEND_API_KEY="re_tu_resend_api_key"
EMAIL_FROM="Vice City <noreply@vicecity.coderhivex.com>"
```

> **IMPORTANTE DE SEGURIDAD:**
> Nunca hagas commit del archivo `.env`. El archivo `.gitignore` ya lo excluye por defecto.

---

## 3. Construcción y Arranque del Contenedor con Docker Compose

El proyecto utiliza un `Dockerfile` multi-etapa con el modo `standalone` de Next.js y límites de recursos configurados en `compose.yml` (1.5 vCPU y 1.5 GiB de RAM) para operar de forma óptima en el VPS.

```bash
# 1. Construir la imagen de producción
docker compose build

# 2. Iniciar el servicio en segundo plano
docker compose up -d

# 3. Verificar que el contenedor esté corriendo y su estado de salud
docker compose ps
```

La columna `STATUS` debe indicar `Up (healthy)`.

---

## 4. Verificación Local en el VPS

Antes de conectar Nginx, verifica que el contenedor responde localmente en el puerto `3000`:

```bash
curl -I http://127.0.0.1:3000/
```

Deberás recibir una respuesta HTTP `200 OK` (o `307/308` de redirección canónica de Next.js).

Para revisar los logs en tiempo real del contenedor:

```bash
docker compose logs -f vice-city
```

---

## 5. Configuración de Nginx como Reverse Proxy

El tráfico público entrará por el puerto 80/443 gestionado por Nginx, que lo reenviará al puerto local `127.0.0.1:3000`.

1. Copia la plantilla de configuración a Nginx:
   ```bash
   sudo cp deploy/nginx/vicecity.coderhivex.com.conf /etc/nginx/sites-available/
   ```

2. Habilita el sitio mediante un enlace simbólico en `sites-enabled`:
   ```bash
   sudo ln -s /etc/nginx/sites-available/vicecity.coderhivex.com.conf /etc/nginx/sites-enabled/
   ```

3. Comprueba que no haya errores de sintaxis en Nginx:
   ```bash
   sudo nginx -t
   ```

4. Si la comprobación indica `syntax is ok`, recarga Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

---

## 6. Configuración de HTTPS con Certbot

1. Asegúrate de que el registro DNS tipo `A` de `vicecity.coderhivex.com` apunte a la IP pública de tu VPS.

2. Abre los puertos del firewall si usas UFW:
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw status
   ```

3. Ejecuta Certbot para obtener el certificado e instalar automáticamente la redirección HTTPS:
   ```bash
   sudo certbot --nginx -d vicecity.coderhivex.com
   ```

4. Verifica que la renovación automática del certificado esté activa:
   ```bash
   sudo certbot renew --dry-run
   ```

---

## 7. Configuración de Servicios Externos

### A. Google Cloud Console (OAuth 2.0)
Si se utiliza inicio de sesión con Google:
1. Ingresa a [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Credentials**.
2. Edita las credenciales del cliente OAuth 2.0.
3. En **Orígenes de JavaScript autorizados**, añade:
   - `https://vicecity.coderhivex.com`
4. En **URIs de redireccionamiento autorizados**, añade exactamente:
   - `https://vicecity.coderhivex.com/api/auth/callback/google`
5. Guarda los cambios.

### B. Stripe Dashboard (Webhooks)
1. Ingresa a [Stripe Dashboard](https://dashboard.stripe.com/) > **Developers** > **Webhooks**.
2. Añade un nuevo endpoint:
   - **URL del endpoint:** `https://vicecity.coderhivex.com/api/payments/webhook`
   - **Eventos a escuchar:**
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `checkout.session.async_payment_succeeded`
     - `checkout.session.async_payment_failed`
3. Copia el **Signing secret** (`whsec_...`) y colócalo en la variable `STRIPE_WEBHOOK_SECRET` de tu archivo `.env`.
4. Reinicia el contenedor si actualizaste el secreto:
   ```bash
   docker compose up -d
   ```

---

## 8. Diagnóstico y Tareas Administrativas en el VPS

El proyecto incluye un script de diagnóstico seguro que no expone secretos:

```bash
# Ejecutar diagnóstico de configuración contra la base de datos
docker compose exec vice-city node scripts/diagnose-config.mjs
```

### Sembrado de Administrador Inicial (Opcional)
Si necesitas crear el usuario superadministrador inicial:
```bash
docker compose exec -e ADMIN_SEED_PASSWORD="TuPasswordSeguro123!" vice-city npm run db:seed:admin
```

---

## 9. Procedimiento para Actualizaciones Futuras (Deploy Continuo)

Para desplegar una nueva versión sin pérdida de datos ni configuraciones:

```bash
# 1. Obtener los últimos cambios de Git
git pull origin develop

# 2. Reconstruir la imagen de Docker
docker compose build

# 3. Reiniciar el servicio con la nueva imagen (cero tiempo de inactividad)
docker compose up -d

# 4. Inspeccionar los logs para confirmar inicio exitoso
docker compose logs -f --tail=100 vice-city
```

---

## 10. Procedimiento de Rollback (Reversión)

Si una versión presenta incidencias en producción:

1. Identifica el commit estable previo en Git:
   ```bash
   git log --oneline -n 5
   ```

2. Regresa temporalmente al commit estable:
   ```bash
   git checkout <COMMIT_HASH_ESTABLE>
   ```

3. Reconstruye y levanta el contenedor anterior:
   ```bash
   docker compose build
   docker compose up -d
   ```

---

## 11. Solución de Problemas Comunes

| Síntoma | Causa Probable | Solución |
|---|---|---|
| **502 Bad Gateway en Nginx** | El contenedor no ha iniciado o falló al arrancar. | Ejecuta `docker compose ps` y revisa los logs con `docker compose logs -f`. |
| **Error: P1001 (Can't reach database)** | Fallo de conexión con Supabase. | Verifica que `DATABASE_URL` use el Transaction Pooler (puerto 6543) con `?pgbouncer=true`. Ejecuta `node scripts/diagnose-config.mjs`. |
| **Error en login: Configuration** | Faltan credenciales de Google OAuth. | Define `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env` o el usuario debe iniciar sesión con correo y contraseña. |
| **Error en webhook de Stripe (400)** | Firma inválida o cuerpo alterado. | Verifica que `STRIPE_WEBHOOK_SECRET` coincida con el secreto del webhook de Stripe en producción. |
| **Redirecciones a http en lugar de https** | Falta cabecera `X-Forwarded-Proto`. | Comprueba que Nginx tenga configurado `proxy_set_header X-Forwarded-Proto $scheme;`. |

