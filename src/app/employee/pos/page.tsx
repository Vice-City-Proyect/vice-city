import { redirect } from "next/navigation";

/**
 * Ruta legacy en inglés (/employee/pos) deprecada (Tarea 1).
 * Redirige a la ruta oficial del portal de empleados: /empleado/pos.
 */
export default function LegacyEmployeePosPage() {
  redirect("/empleado/pos");
}

