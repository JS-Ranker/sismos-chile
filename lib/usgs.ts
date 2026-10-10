import "server-only";

import { cacheLife } from "next/cache";
import { z } from "zod";
import { traducirLugar } from "./lugar";
import { PERIODOS, type Periodo, type ResultadoSismos, type Sismo } from "./sismos";

const USGS_QUERY = "https://earthquake.usgs.gov/fdsnws/event/1/query";

// Rectángulo que cubre Chile continental y su costa. Incluye zonas de países vecinos,
// que se descartan después según el lugar informado por el USGS.
const LIMITES_CHILE = {
  minlatitude: "-56.5",
  maxlatitude: "-17",
  minlongitude: "-82",
  maxlongitude: "-65",
};

// La cobertura del USGS en Chile es fiable desde ~M2.5 (en la práctica, mayormente M4+).
const MAGNITUD_MINIMA = "2.5";

const respuestaUsgs = z.object({
  features: z.array(
    z.object({
      id: z.string(),
      properties: z.object({
        mag: z.number().nullable(),
        magType: z.string().nullable(),
        place: z.string().nullable(),
        time: z.number(),
        tsunami: z.number(),
        felt: z.number().nullable(),
        url: z.string(),
        type: z.string(),
      }),
      geometry: z.object({
        coordinates: z.tuple([z.number(), z.number(), z.number()]),
      }),
    }),
  ),
});

type FeatureUsgs = z.infer<typeof respuestaUsgs>["features"][number];

function esSismoEnChile(f: FeatureUsgs): boolean {
  return (
    f.properties.type === "earthquake" &&
    f.properties.mag !== null &&
    (f.properties.place?.includes("Chile") ?? false)
  );
}

function aSismo(f: FeatureUsgs): Sismo {
  const [lon, lat, profundidad] = f.geometry.coordinates;
  return {
    id: f.id,
    magnitud: f.properties.mag ?? 0,
    tipoMagnitud: f.properties.magType ?? "",
    lugar: traducirLugar(f.properties.place ?? ""),
    fecha: f.properties.time,
    profundidadKm: Math.round(profundidad * 10) / 10,
    lat,
    lon,
    alertaTsunami: f.properties.tsunami === 1,
    reportesSentido: f.properties.felt,
    urlUsgs: f.properties.url,
  };
}

/** Sismos en Chile del período indicado, del más reciente al más antiguo. */
export async function getSismos(periodo: Periodo): Promise<ResultadoSismos> {
  "use cache";
  // El USGS publica con algunos minutos de retraso; refrescar cada minuto es suficiente.
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });

  const obtenidoEn = Date.now();
  const desde = new Date(obtenidoEn - PERIODOS[periodo].horas * 3_600_000);
  const params = new URLSearchParams({
    format: "geojson",
    orderby: "time",
    minmagnitude: MAGNITUD_MINIMA,
    starttime: desde.toISOString(),
    ...LIMITES_CHILE,
  });

  const res = await fetch(`${USGS_QUERY}?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`USGS respondió ${res.status}`);
  }

  const datos = respuestaUsgs.parse(await res.json());
  return { sismos: datos.features.filter(esSismoEnChile).map(aSismo), obtenidoEn };
}
