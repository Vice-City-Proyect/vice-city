# 📘 Guía Paso a Paso: Configuración de Google OAuth 2.0 (Desarrollo y Producción)

Esta guía documenta el procedimiento oficial para configurar **Google OAuth 2.0** en Google Cloud Console e integrarlo con **NextAuth.js v4** en la plataforma **Vice City**, tanto para entornos de desarrollo local como para despliegues en producción.

---

## 📋 Resumen de Requisitos para Producción

Para que el inicio de sesión con Google funcione en producción se requieren dos componentes:
1. **Google Cloud Console:** Crear las credenciales de tipo *Aplicación Web* autorizando el dominio y el URI de callback exacto de NextAuth (`/api/auth/callback/google`).
2. **Servidor de Producción (Vercel / Railway / AWS / Docker):** Configurar las variables de entorno `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL` y `NEXTAUTH_SECRET`.

---

## 🛠️ Paso 1: Crear o Seleccionar un Proyecto en Google Cloud

1. Ingresa a la consola oficial de Google Cloud: [https://console.cloud.google.com/](https://console.cloud.google.com/).
2. Inicia sesión con la cuenta corporativa o de desarrollo del proyecto.
3. En la barra superior, haz clic en el selector de proyectos y presiona **"Nuevo proyecto"** (o *New Project*).
4. Asigna un nombre al proyecto (ej. `Vice City Complex`) y haz clic en **"Crear"**.
5. Asegúrate de tener seleccionado el proyecto recién creado en la barra superior.

---

## 🔐 Paso 2: Configurar la Pantalla de Consentimiento OAuth (OAuth Consent Screen)

Antes de generar credenciales, Google requiere definir los datos que verán los usuarios al autenticarse:

1. En el menú de navegación lateral, ve a **APIs & Services (APIs y servicios)** > **OAuth consent screen (Pantalla de consentimiento de OAuth)**.
2. Selecciona el tipo de usuario (**User Type**):
   * Selecciona **External (Externo)** para permitir que cualquier cliente o usuario con cuenta Google pueda iniciar sesión.
   * Haz clic en **Crear**.
3. **Información de la aplicación:**
   * **App name (Nombre de la aplicación):** `Vice City Sports Complex`
   * **User support email (Correo de asistencia del usuario):** Selecciona tu correo o el correo de soporte del equipo.
   * **App logo (opcional):** Puedes subir el logotipo de Vice City.
   * **Authorized domains (Dominios autorizados):** En producción, agrega el dominio base sin `https://` (ejemplo: `vicecity.com` o `vercel.app`).
   * **Developer contact information (Datos de contacto del desarrollador):** Ingresa el correo de contacto técnico del equipo.
   * Haz clic en **Guardar y continuar**.
4. **Permisos (Scopes):**
   * Haz clic en **Add or remove scopes (Agregar o quitar permisos)**.
   * Selecciona los 3 permisos básicos requeridos por Vice City:
     - `.../auth/userinfo.email` (Ver dirección de correo principal)
     - `.../auth/userinfo.profile` (Ver información básica del perfil: nombre y foto)
     - `openid` (Autenticación OpenID Connect)
   * Haz clic en **Actualizar** y luego en **Guardar y continuar**.
5. **Usuarios de prueba (Test Users):**
   * Mientras la aplicación esté en estado de prueba (*Testing*), solo los correos agregados aquí podrán iniciar sesión.
   * Agrega los correos de los desarrolladores y evaluadores del equipo.
   * *(Nota para Producción):* Cuando el proyecto pase a producción final, presiona el botón **"Publish App" (Publicar aplicación)** en la pantalla de consentimiento para permitir acceso a todo el público.
6. Haz clic en **Guardar y continuar**.

---

## 🔑 Paso 3: Crear las Credenciales OAuth 2.0 (Client ID & Client Secret)

1. En el menú lateral, ve a **Credentials (Credenciales)**.
2. En la parte superior, haz clic en **+ Create Credentials (+ Crear credenciales)** > **OAuth client ID (ID de cliente de OAuth)**.
3. En **Application type (Tipo de aplicación)**, selecciona **Web application (Aplicación web)**.
4. Asigna un nombre descriptivo (ej. `Vice City Web App`).
5. **Orígenes autorizados de JavaScript (Authorized JavaScript origins):**
   * Son las URLs desde donde el usuario puede iniciar la petición:
     * Para desarrollo local: `http://localhost:3000`
     * Para producción: `https://tu-dominio-produccion.com` (o `https://vice-city.vercel.app`)
6. **URIs de redireccionamiento autorizados (Authorized redirect URIs) — [CRÍTICO]:**
   * Es la ruta exacta a la que Google enviará el código de autorización tras el consentimiento del usuario.
   * NextAuth v4 utiliza **estrictamente** la ruta `/api/auth/callback/google`:
     * Para desarrollo local:
       ```text
       http://localhost:3000/api/auth/callback/google
       ```
     * Para producción:
       ```text
       https://tu-dominio-produccion.com/api/auth/callback/google
       ```
7. Haz clic en **Crear**.
8. Se abrirá un modal con tus claves:
   * Copia el **Client ID** (tiene formato `xxxx-xxxx.apps.googleusercontent.com`).
   * Copia el **Client Secret** (tiene formato `GOCSPX-xxxx`).

---

## ⚙️ Paso 4: Configurar las Variables de Entorno

### A. Para Entorno de Desarrollo Local (`.env` o `.env.local`):
Edita tu archivo `.env` o `.env.local` local descomentando y asignando las claves obtenidas:

```env
# ==========================================
# AUTENTICACIÓN (NextAuth / JWT / Google OAuth)
# ==========================================
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="vice_city_dev_secret_jwt_signing_key_2026_super_secure"

# Credenciales de Google Cloud Console
GOOGLE_CLIENT_ID="tu-cliente-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-tu-cliente-secreto"
```

### B. Para Entorno de Producción (Vercel, Railway, AWS, Docker):
En el panel de configuración de variables de entorno de tu proveedor de hosting:

| Variable | Valor de Producción | Descripción |
| :--- | :--- | :--- |
| `NEXTAUTH_URL` | `https://tu-dominio.com` | URL canónica pública del complejo deportivo |
| `NEXTAUTH_SECRET` | *(Generar con `openssl rand -base64 32`)* | Clave de cifrado de sesiones y JWT en producción |
| `GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` | ID de cliente web generado en Google Cloud |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxx` | Secreto del cliente generado en Google Cloud |

---

## 🧪 Paso 5: Verificación del Flujo en Producción

Una vez desplegada la aplicación y configuradas las variables:

1. Ingresa a `https://tu-dominio.com/login`.
2. Presiona el botón **"Continuar con Google"**.
3. Se abrirá la ventana de consentimiento de Google solicitando acceso a email y perfil.
4. **Casos validados por la lógica de negocio (HU05-B):**
   * **Usuario nuevo:** Se crea automáticamente en la base de datos con rol `CLIENT` y correo marcado como verificado.
   * **Usuario existente (con contraseña previa):** Se vincula a la cuenta Google existente sin duplicar registros y preservando su identificador único.
   * **Cancelación de usuario:** Si el usuario cierra o deniega el permiso, es redirigido a `/login` con un mensaje claro en español (`"Inicio de sesión cancelado"`).

---

## ⚠️ Preguntas Frecuentes y Solución de Errores Comunes

### 1. Error: `redirect_uri_mismatch` (Error 400)
* **Causa:** La URL desde donde se llama o la URL de callback no coincide exactamente con las registradas en Google Cloud Console.
* **Solución:** Verifica que en *Authorized redirect URIs* esté escrita la URL exacta con protocolo `https://`, sin slash final adicional y con la ruta `/api/auth/callback/google`. Recuerda que `http://localhost:3000` y `http://127.0.0.1:3000` son diferentes para Google.

### 2. Error: `Access blocked: App has not completed the Google verification process`
* **Causa:** La pantalla de consentimiento está en modo *Testing* y el correo del usuario que intenta iniciar sesión no está registrado en *Test Users*.
* **Solución:**
  * En desarrollo: Agrega el correo a la lista de *Test users* en la consola de Google.
  * En producción: Presiona el botón **Publish App** en la pantalla de consentimiento de OAuth.

### 3. Error: `OAuthCallback` o error de firma en NextAuth
* **Causa:** Falta configurar `NEXTAUTH_SECRET` o `NEXTAUTH_URL` en las variables de entorno de producción.
* **Solución:** Asegúrate de que `NEXTAUTH_URL` contenga exactamente la URL base del sitio (`https://tu-dominio.com`).

