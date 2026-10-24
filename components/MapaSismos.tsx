"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  AttributionControl,
  Map as MapaGL,
  NavigationControl,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Sismo } from "@/lib/sismos";
import { COLOR_PROFUNDIDAD, TINTA_SISMO, radioDeMagnitud } from "./colores";
import type { Seleccion } from "./Explorador";

// Relieve y batimetría sin API key: el mar viene del mapa de océanos de Esri y el relieve,
// incluida la fosa de Atacama, de las teselas de elevación de Mapzen en AWS.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

// Turbopack no resuelve el worker de MapLibre: se sirve como archivo estático desde /public
// (copia de node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs; actualizar junto con la librería).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
const EXAGERACION_RELIEVE = 3;
const DURACION_ONDA_MS = 2200;

const ESTILO: StyleSpecification = {
  version: 8,
  sources: {
    oceano: {
      type: "raster",
      tiles: [`${ESRI}/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 10,
      attribution: "Mapa base &copy; Esri, GEBCO, NOAA, Garmin, &copy; colaboradores de OpenStreetMap",
    },
    referencia: {
      type: "raster",
      tiles: [`${ESRI}/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 10,
    },
    relieve: {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 11,
      attribution: "Elevación: Mapzen, USGS, NOAA",
    },
    // Fuente aparte para el sombreado: MapLibre recomienda no compartirla con el terreno 3D.
    sombra: {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 11,
    },
  },
  sky: {
    "sky-color": "#6f9cc0",
    "horizon-color": "#dfe9ef",
    "fog-color": "#dfe9ef",
    "sky-horizon-blend": 0.6,
    "horizon-fog-blend": 0.6,
    "fog-ground-blend": 0.2,
  },
  terrain: { source: "relieve", exaggeration: EXAGERACION_RELIEVE },
  layers: [
    { id: "fondo", type: "background", paint: { "background-color": "#0d2f52" } },
    { id: "oceano", type: "raster", source: "oceano", paint: { "raster-saturation": 0.25 } },
    {
      id: "sombreado",
      type: "hillshade",
      source: "sombra",
      paint: {
        "hillshade-exaggeration": 0.78,
        "hillshade-shadow-color": "#0b2338",
        "hillshade-highlight-color": "#fff6dc",
        "hillshade-accent-color": "#27405a",
      },
    },
    { id: "referencia", type: "raster", source: "referencia", paint: { "raster-opacity": 0.85 } },
  ],
};

// Radio por magnitud; a más zoom, círculos más grandes. "zoom" solo puede ser la entrada de la
// interpolación de más afuera, así que el margen extra (halo, anillo de selección) va dentro de las paradas.
function radioPorZoom(factor: number, extra: number): ExpressionSpecification {
  const pares = [2.5, 3, 4, 6, 5, 10, 6, 17, 7, 28, 8, 42];
  return [
    "interpolate",
    ["linear"],
    ["get", "mag"],
    ...pares.map((v, i) => (i % 2 ? v * factor + extra : v)),
  ] as ExpressionSpecification;
}

function radio(extra = 0): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 3, radioPorZoom(0.7, extra), 9, radioPorZoom(2.2, extra)];
}

const RADIO = radio();

const COLOR: ExpressionSpecification = [
  "step",
  ["get", "prof"],
  COLOR_PROFUNDIDAD.superficial,
  70,
  COLOR_PROFUNDIDAD.intermedio,
  300,
  COLOR_PROFUNDIDAD.profundo,
];

interface Onda {
  lon: number;
  lat: number;
  mag: number;
  inicio: number;
}

interface Props {
  sismos: Sismo[];
  seleccion: Seleccion | null;
  onSeleccionar: (id: string) => void;
  /** Límite de la reproducción: solo se ven los sismos ocurridos hasta ese instante. */
  cursor: number | null;
  reproduciendo: boolean;
}

function coleccion(sismos: Sismo[]) {
  return {
    type: "FeatureCollection" as const,
    features: sismos.map((s) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [s.lon, s.lat] },
      properties: { id: s.id, mag: s.magnitud, prof: s.profundidadKm, fecha: s.fecha },
    })),
  };
}

/** Deja libre del encuadre el espacio que tapan los cartuchos flotantes. */
function relleno() {
  return window.innerWidth >= 1024
    ? { top: 0, right: 400, bottom: 0, left: 0 }
    : { top: 150, right: 0, bottom: 210, left: 0 };
}

function reducirMovimiento() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function MapaSismos({ sismos, seleccion, onSeleccionar, cursor, reproduciendo }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<MapaGL | null>(null);
  const [listo, setListo] = useState(false);
  const [sinWebGL, setSinWebGL] = useState(false);
  const ondas = useRef<Onda[]>([]);
  const cursorPrevio = useRef<number | null>(null);
  const alSeleccionar = useRef(onSeleccionar);
  const ultimaEnfocada = useRef<Seleccion | null>(null);

  useEffect(() => {
    alSeleccionar.current = onSeleccionar;
  }, [onSeleccionar]);

  // El más reciente late como una onda sobre el relieve.
  const ultimo = useMemo(
    () => sismos.reduce<Sismo | null>((m, s) => (m === null || s.fecha > m.fecha ? s : m), null),
    [sismos],
  );
  const ultimoRef = useRef<Sismo | null>(null);
  useEffect(() => {
    ultimoRef.current = cursor === null ? ultimo : null;
  }, [ultimo, cursor]);

  useEffect(() => {
    if (!contenedor.current) return;
    const movil = window.innerWidth < 768;
    let mapa: MapaGL;
    try {
      mapa = new MapaGL({
        container: contenedor.current,
        style: ESTILO,
        center: reducirMovimiento() ? [-71.2, -31.5] : [-84, -33],
        zoom: reducirMovimiento() ? (movil ? 3.4 : 4.2) : 2.6,
        pitch: reducirMovimiento() ? 55 : 0,
        bearing: reducirMovimiento() ? -14 : 0,
        maxPitch: 75,
        minZoom: 2.5,
        maxZoom: 11,
        attributionControl: false,
        cooperativeGestures: false,
      });
    } catch {
      // Se avisa en el siguiente ciclo: no se cambia estado de forma síncrona dentro del efecto.
      queueMicrotask(() => setSinWebGL(true));
      return;
    }
    mapaRef.current = mapa;
    mapa.addControl(new AttributionControl({ compact: true }), "bottom-right");
    mapa.addControl(new NavigationControl({ visualizePitch: true }), "top-right");

    mapa.on("load", () => {
      mapa.addSource("sismos", { type: "geojson", data: coleccion([]) });
      mapa.addSource("ondas", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      mapa.addLayer({
        id: "sismos-halo",
        type: "circle",
        source: "sismos",
        layout: { "circle-sort-key": ["get", "mag"] },
        paint: {
          "circle-radius": radio(3),
          "circle-color": TINTA_SISMO,
          "circle-opacity": 0.55,
          "circle-blur": 0.8,
        },
      });
      mapa.addLayer({
        id: "sismos",
        type: "circle",
        source: "sismos",
        layout: { "circle-sort-key": ["get", "mag"] },
        paint: {
          "circle-radius": RADIO,
          "circle-color": COLOR,
          "circle-opacity": 0.86,
          "circle-stroke-color": TINTA_SISMO,
          "circle-stroke-width": 1.25,
        },
      });
      mapa.addLayer({
        id: "seleccion-tinta",
        type: "circle",
        source: "sismos",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-radius": radio(5),
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": TINTA_SISMO,
          "circle-stroke-width": 6,
        },
      });
      mapa.addLayer({
        id: "seleccion",
        type: "circle",
        source: "sismos",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-radius": radio(5),
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      });
      mapa.addLayer({
        id: "ondas",
        type: "circle",
        source: "ondas",
        paint: {
          "circle-radius": ["get", "r"],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#fffdf2",
          "circle-stroke-width": 2,
          "circle-stroke-opacity": ["get", "o"],
          "circle-pitch-alignment": "map",
          "circle-pitch-scale": "map",
        },
      });

      mapa.on("click", "sismos", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (typeof id === "string") alSeleccionar.current(id);
      });
      mapa.on("mouseenter", "sismos", () => (mapa.getCanvas().style.cursor = "pointer"));
      mapa.on("mouseleave", "sismos", () => (mapa.getCanvas().style.cursor = ""));

      // Entrada: desde el Pacífico, descendiendo sobre la fosa hasta la costa.
      const destino = {
        center: [-71.4, movil ? -31 : -30.5] as [number, number],
        zoom: movil ? 3.4 : 4.3,
        pitch: 58,
        bearing: -14,
        padding: relleno(),
      };
      if (reducirMovimiento()) mapa.jumpTo(destino);
      else mapa.flyTo({ ...destino, duration: 5200, curve: 1.6 });
      setListo(true);
    });

    // Los errores de teselas sueltas no deben tumbar la interfaz.
    mapa.on("error", () => {});

    return () => {
      mapa.remove();
      mapaRef.current = null;
      setListo(false);
    };
  }, []);

  // Datos.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!listo || !mapa) return;
    (mapa.getSource("sismos") as GeoJSONSource).setData(coleccion(sismos));
  }, [sismos, listo]);

  // Reproducción: solo se ven los sismos hasta el cursor, y los que aparecen lanzan una onda.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!listo || !mapa) return;
    const filtro: ExpressionSpecification | null =
      cursor === null ? null : ["<=", ["get", "fecha"], cursor];
    mapa.setFilter("sismos", filtro);
    mapa.setFilter("sismos-halo", filtro);

    const previo = cursorPrevio.current;
    cursorPrevio.current = cursor;
    if (reproduciendo && !reducirMovimiento() && cursor !== null && previo !== null && cursor > previo) {
      const ahora = performance.now();
      for (const s of sismos) {
        if (s.fecha > previo && s.fecha <= cursor) {
          ondas.current.push({ lon: s.lon, lat: s.lat, mag: s.magnitud, inicio: ahora });
        }
      }
    }
  }, [cursor, reproduciendo, sismos, listo]);

  // Selección resaltada; si viene de la lista, la cámara baja hasta el sismo.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!listo || !mapa) return;
    const filtro: ExpressionSpecification = ["==", ["get", "id"], seleccion?.id ?? ""];
    mapa.setFilter("seleccion", filtro);
    mapa.setFilter("seleccion-tinta", filtro);

    if (!seleccion || seleccion.origen !== "lista" || seleccion === ultimaEnfocada.current) return;
    const sismo = sismos.find((s) => s.id === seleccion.id);
    if (!sismo) return;
    ultimaEnfocada.current = seleccion;
    const opciones = {
      center: [sismo.lon, sismo.lat] as [number, number],
      zoom: Math.max(mapa.getZoom(), 6.2),
      pitch: 62,
      padding: relleno(),
    };
    if (reducirMovimiento()) mapa.jumpTo(opciones);
    else mapa.flyTo({ ...opciones, duration: 1800, curve: 1.4 });
  }, [seleccion, sismos, listo]);

  // Ondas: el último sismo late sin parar y cada sismo de la reproducción lanza un anillo.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!listo || !mapa) return;
    const fuente = mapa.getSource("ondas") as GeoJSONSource;
    const quieto = reducirMovimiento();
    let cuadro = 0;

    const anillo = (lon: number, lat: number, r: number, o: number) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [lon, lat] },
      properties: { r, o },
    });

    const pintar = (t: number) => {
      const rasgos = [];
      const u = ultimoRef.current;
      if (u) {
        const base = radioDeMagnitud(u.magnitud);
        if (quieto) {
          rasgos.push(anillo(u.lon, u.lat, base + 10, 0.8));
        } else {
          for (let k = 0; k < 3; k++) {
            const fase = (t / 3200 + k / 3) % 1;
            rasgos.push(anillo(u.lon, u.lat, base + 4 + fase * (26 + base), (1 - fase) * 0.85));
          }
        }
      }
      ondas.current = ondas.current.filter((o) => t - o.inicio < DURACION_ONDA_MS);
      for (const o of ondas.current) {
        const fase = (t - o.inicio) / DURACION_ONDA_MS;
        const suave = 1 - (1 - fase) ** 3;
        rasgos.push(anillo(o.lon, o.lat, 4 + suave * (18 + radioDeMagnitud(o.mag) * 2.4), (1 - fase) * 0.9));
      }
      fuente.setData({ type: "FeatureCollection", features: rasgos });
      if (!quieto || ondas.current.length > 0) cuadro = requestAnimationFrame(pintar);
    };
    cuadro = requestAnimationFrame(pintar);
    return () => cancelAnimationFrame(cuadro);
  }, [listo, ultimo]);

  if (sinWebGL) {
    return (
      <div className="grid h-full place-items-center bg-papel-2 px-6 text-center text-tenue">
        Tu navegador no pudo dibujar el mapa en relieve. La lista de sismos sigue disponible.
      </div>
    );
  }

  return (
    // MapLibre fuerza position: relative en su contenedor, así que el que ocupa el área es el envoltorio.
    <div
      role="img"
      aria-label="Mapa en relieve de Chile con los sismos recientes. La misma información está en la lista."
      className="absolute inset-0"
    >
      <div ref={contenedor} className="h-full w-full" />
    </div>
  );
}
