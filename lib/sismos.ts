// Tipos y utilidades compartidas entre servidor y cliente (sin dependencias de Node).

export interface Sismo {
  id: string;
  magnitud: number;
  tipoMagnitud: string;
  lugar: string;
  /** Milisegundos desde epoch (UTC). */
  fecha: number;
  profundidadKm: number;
  lat: number;
  lon: number;
  alertaTsunami: boolean;
  /** Reportes "¿Lo sentiste?" recibidos por el USGS. */
  reportesSentido: number | null;
  urlUsgs: string;
}

export interface ResultadoSismos {
  sismos: Sismo[];
  /** Cuándo se consultó el USGS (ms). Viene del servidor para no leer la hora al prerenderizar. */
  obtenidoEn: number;
}

export const PERIODOS = {
  dia: { etiqueta: "24 h", horas: 24 },
  semana: { etiqueta: "7 días", horas: 24 * 7 },
  mes: { etiqueta: "30 días", horas: 24 * 30 },
} as const;

export type Periodo = keyof typeof PERIODOS;

export const PERIODO_INICIAL: Periodo = "semana";

export function esPeriodo(valor: string): valor is Periodo {
  return Object.hasOwn(PERIODOS, valor);
}

export const MAGNITUDES_MINIMAS = [2.5, 4, 5, 6] as const;

export type Profundidad = "superficial" | "intermedio" | "profundo";

/** Rangos usados habitualmente en sismología: <70 km, 70–300 km, >300 km. */
export function clasificarProfundidad(km: number): Profundidad {
  if (km < 70) return "superficial";
  if (km <= 300) return "intermedio";
  return "profundo";
}

export const ETIQUETA_PROFUNDIDAD: Record<Profundidad, string> = {
  superficial: "Superficial (< 70 km)",
  intermedio: "Intermedio (70–300 km)",
  profundo: "Profundo (> 300 km)",
};

const formatoFecha = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatearFecha(ms: number): string {
  // Node y los navegadores traen versiones distintas de ICU y no siempre usan el mismo
  // tipo de espacio; si difieren, React falla al hidratar. Se normalizan a espacios simples.
  return formatoFecha.format(ms).replace(/[  ]/g, " ");
}

export function formatearMagnitud(m: number): string {
  return m.toFixed(1);
}

export function tiempoRelativo(ms: number, ahora: number): string {
  const minutos = Math.round((ahora - ms) / 60_000);
  if (minutos < 1) return "hace instantes";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}
