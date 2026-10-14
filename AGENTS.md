# Vice City — AI Agent Context

## Proyecto

Vice City es un sistema web para la gestión de reservas y servicios de un complejo deportivo.

La aplicación se desarrolla con Next.js y está organizada por funcionalidades.

## Repositorios

La organización contiene:

* `vice-city`: aplicación principal. Contiene frontend y backend.
* `database`: documentación e información relacionada con la base de datos.

El repositorio `database` no es una dependencia de ejecución de la aplicación.

## Arquitectura

La aplicación utiliza principalmente:

* `src/app/`: páginas, rutas y endpoints de API.
* `src/features/`: funcionalidades del sistema.
* `src/components/`: componentes reutilizables.
* `src/services/`: lógica de negocio y servicios.
* `src/lib/`: utilidades y configuración compartida.
* `src/types/`: tipos compartidos.
* `src/middleware.ts`: middleware global.

## Reglas generales

* Respetar la arquitectura existente.
* Revisar primero el código existente antes de crear nuevas implementaciones.
* Evitar duplicar componentes, servicios o lógica.
* No mover archivos sin una razón clara.
* No introducir dependencias nuevas innecesariamente.
* No modificar reglas de negocio sin autorización.
* Mantener los cambios relacionados con la tarea solicitada.
* Mantener el código simple y consistente con el proyecto.

## Git

El flujo de trabajo del proyecto es:

Jira → Branch → Desarrollo → Pull Request → Code Review → develop → main

Los cambios deben realizarse mediante Pull Requests.

## Skills

Las instrucciones especializadas del proyecto se encuentran en:

`.agents/skills/`

Las skills deben utilizarse cuando una tarea corresponda a su área específica.
