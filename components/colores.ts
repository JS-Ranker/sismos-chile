import { clasificarProfundidad, type Profundidad } from "@/lib/sismos";

// Leaflet dibuja en SVG con atributos, que no aceptan variables CSS: los colores viven aquí.
export const COLOR_PROFUNDIDAD: Record<Profundidad, string> = {
  superficial: "#ff6b5a",
  intermedio: "#f6b93b",
  profundo: "#8ea2ff",
};

export function colorDeProfundidad(km: number): string {
  return COLOR_PROFUNDIDAD[clasificarProfundidad(km)];
}

/** Radio en px que crece de forma exponencial, como la energía liberada. */
export function radioDeMagnitud(magnitud: number): number {
  return 2 + 3 * 1.45 ** Math.max(0, magnitud - 2.5);
}
