# Pull Request: [HU09-F] Landing Page & Flujo de Reservas

| Parámetro | Detalle |
| :--- | :--- |
| **Rama** | `feature/HU09/landing-page/saeb-gc` ➔ `develop` |
| **Historia de Usuario** | **HU09-F: Landing Page (Frontend)** |
| **Tipo de Cambio** | `feat` / `refactor` (Arquitectura por funcionalidades) |

---

## 🎯 Resumen de Cambios Realizados

Se implementó la **Landing Page** completa para **Vice City Iguana Club**, estructurando el código bajo la arquitectura de features definida en [readme.md](file:///c:/Users/garci/Downloads/proyecto_vc_1/readme.md):

1. **Arquitectura y Reorganización**:
   - Traslado de componentes específicos de reservas desde `components/layout/` hacia `src/features/landing/`.
   - Centralización de tipos TypeScript compartidos en [types.ts](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/types.ts).

2. **Componentes Globales de Layout**:
   - [Header.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/components/layout/Header.tsx): Barra de navegación fija con efecto *glassmorphism*, enlaces de anclaje (`#facilities`, `#about`, `#contact`) y botón del carrito con badge numérico animado en tiempo real.
   - [Footer.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/components/layout/Footer.tsx): Pie de página institucional con horarios de atención (8:00 AM - 5:00 PM, UTC-5), políticas del club y derechos reservados.

3. **Módulos de la Landing Page**:
   - [Hero.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Hero.tsx): Banner principal con imagen optimizada a pantalla completa (`next/image`), overlays de contraste y botones de llamado a la acción.
   - [FacilitiesSlider.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/FacilitiesSlider.tsx): Carrusel horizontal deslizable con 7 escenarios deportivos (piscinas, fútbol 11, microfútbol, polideportivo, gimnasio y zona húmeda). Incluye modal interactivo con cálculo dinámico de precio (horas × personas o tarifa fija exclusiva) y selección de fecha/hora.
   - [LocationSection.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/LocationSection.tsx): Información de la sede en Barranquilla, tarjetas de contacto/concierge, iframe interactivo de Google Maps y botón de apertura directa en Maps.

4. **Sistema de Carrito y Estado Global**:
   - [CartContext.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Cart/CartContext.tsx): Proveedor de estado en React para agregar reservas, ajustar horas, eliminar items y calcular subtotales y total en COP.
   - [Cart.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Cart/Cart.tsx): Panel lateral (*slide-over*) animado con `framer-motion`.
   - [CartItem.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Cart/CartItem.tsx) y [CartEmpty.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Cart/CartEmpty.tsx): Tarjetas individuales con controles incrementales de tiempo y vista cuando no hay reservas.

5. **Integración en Página Principal**:
   - [page.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/app/page.tsx): Ensamblado de layout, secciones y envoltura con [CartProvider](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Cart/CartContext.tsx#L22-L114).

---

## 📂 Archivos Creados y Modificados

| Estado | Archivo | Descripción |
| :--- | :--- | :--- |
| **Modificado** | [src/app/page.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/app/page.tsx) | Integración de componentes y proveedor de carrito |
| **Creado** | [src/components/layout/Header.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/components/layout/Header.tsx) | Navbar fija con contador reactivo de reservas |
| **Creado** | [src/components/layout/Footer.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/components/layout/Footer.tsx) | Footer con datos operativos y políticas |
| **Creado** | [src/features/landing/types.ts](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/types.ts) | Modelos `FacilityItem`, `BookingPayload`, `CartBookingItem` |
| **Creado** | [src/features/landing/components/Hero.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Hero.tsx) | Sección visual principal y CTAs |
| **Creado** | [src/features/landing/components/FacilitiesSlider.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/FacilitiesSlider.tsx) | Carrusel de canchas + modal de reserva con calculadora |
| **Creado** | [src/features/landing/components/LocationSection.tsx](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/LocationSection.tsx) | Sede Barranquilla, concierge y Google Maps |
| **Creado** | [src/features/landing/components/Cart/](file:///c:/Users/garci/Downloads/proyecto_vc_1/src/features/landing/components/Cart/) | Carrito deslizable: `CartContext`, `Cart`, `CartItem`, `CartEmpty` |

---

## 📦 Dependencias Clave

- **`framer-motion`**: Animación del drawer lateral del carrito y transiciones de modales.
- **`lucide-react`**: Iconografía vectorial accesible de deportes, agenda y navegación.
- **`next` (v16.3.7) & `react` (v19.2.8)**: Carga optimizada de imágenes con `next/image` y estado reactivo.
- **`tailwindcss` (v4)**: Estilizado responsivo y paleta de colores corporativa.

---

## ✅ Verificación y Pruebas

- [x] **Linting**: Verificado con `npm run lint` (0 errores en archivos de la landing).
- [x] **Responsividad**: Probado en resoluciones móviles, tablets y escritorio.
- [x] **Flujo de Reserva**: Validación de cálculo de tarifas (reserva por hora vs por persona), ajuste de horas en carrito y persistencia en sesión.
- [x] **Accesibilidad**: Cierre de modal con tecla `Escape` y bloqueo de scroll al abrir paneles.
