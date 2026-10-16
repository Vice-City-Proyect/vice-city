#!/usr/bin/env node

/**
 * Script de validación de instalación de dependencias en Vice City.
 *
 * Política de Dependencias Congeladas:
 * - Se prohíbe el uso de `npm install` o `npm i` para evitar alterar versiones o dependencias.
 * - Es estrictamente obligatorio el uso de `npm ci`.
 * - No se permite instalar dependencias que no estén en package-lock.json sin autorización previa.
 */

const npmCommand = process.env.npm_command;

// Si se ejecuta mediante "npm install", "npm i" o "npm add"
if (npmCommand === "install" || npmCommand === "i" || npmCommand === "add") {
  console.error("\n❌ ===========================================================================");
  console.error("  [ERROR DE POLÍTICA DE DEPENDENCIAS - VICE CITY]");
  console.error("  El uso de 'npm install' está estrictamente PROHIBIDO.");
  console.error("  Las dependencias del proyecto están CONGELADAS y blindadas.");
  console.error("  Debes utilizar obligatoriamente:");
  console.error("      npm ci");
  console.error("  Cualquier nueva dependencia debe consultarse y autorizarse previamente.");
  console.error("===========================================================================\n");
  process.exit(1);
}

