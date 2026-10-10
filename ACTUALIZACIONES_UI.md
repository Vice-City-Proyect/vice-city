# Actualizaciones de UI: Landing Page y Botones

Este documento resume los cambios visuales y funcionales aplicados recientemente a la interfaz principal (Landing Page) del club.

## 1. Carrusel Dinámico (Hero Section)
- **Slider Automático**: La imagen estática de portada fue reemplazada por un carrusel que cambia automáticamente cada 5 segundos.
- **Pausa Inteligente**: Al utilizar las flechas o puntos para cambiar de imagen manualmente, el contador de 5 segundos se reinicia. Esto permite observar la foto seleccionada con calma, pero el carrusel retomará su camino automático poco después.
- **Nuevas Imágenes y Encuadre**: Se implementaron 4 fotos rotativas (gimnasio, fútbol, piscina y voleibol) con posiciones focalizadas personalizadas (ej. `object-top`) para evitar que se corten los rostros de los sujetos en pantallas amplias.
- **Visibilidad Mejorada**: Se aclaró el tinte oscuro sobre las imágenes y se agregó sombra (`drop-shadow`) a la tipografía para equilibrar un fondo iluminado con textos legibles.

## 2. Sistema de Botones Premium
- **Efecto de Iluminación**: Todos los botones principales de la aplicación fueron actualizados. Al pasar el cursor, un elegante y rápido destello de luz ("Shine Sweep") cruza el botón, dándole un aspecto moderno y profesional.
- **Botón "Reservar"**: Se ajustó el botón de la barra de navegación para que utilice un tamaño más visible (`md`) y comparta exactamente la misma forma ligeramente cuadrada (`rounded-xl`) del resto de la interfaz, logrando total coherencia visual.

## 3. Barra de Navegación (Navbar)
- **Animación del Menú**: Las opciones de texto (Piscinas, Instalaciones, etc.) ahora muestran un subrayado animado que se despliega suavemente de izquierda a derecha al poner el cursor sobre ellas.
