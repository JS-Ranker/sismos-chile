import { clasificarProfundidad, type Profundidad } from "@/lib/sismos";

// MapLibre pinta con expresiones, que no aceptan variables CSS: los colores viven aquí.
// Se leen sobre el relieve pintado (mar azul, tierra ocre) y sobre el papel de los cartuchos.
export const COLOR_PROFUNDIDAD: Record<Profundidad, string> = {
  superficial: "#ff4a2b",
  intermedio: "#ffbe3d",
  profundo: "#fffdf2",
};

/** Tinta de contorno de los sismos sobre el mapa. */
export const TINTA_SISMO = "#071a30";

export function colorDeProfundidad(km: number): string {
  return COLOR_PROFUNDIDAD[clasificarProfundidad(km)];
}

/** Radio en px (zoom bajo) que crece de forma exponencial, como la energía liberada. */
export function radioDeMagnitud(magnitud: number): number {
  return 2.5 + 2.2 * 1.5 ** Math.max(0, magnitud - 2.5);
}
