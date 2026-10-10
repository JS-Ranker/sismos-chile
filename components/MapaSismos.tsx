"use client";

import "leaflet/dist/leaflet.css";

import type { CircleMarker as CapaCirculo, LatLngBoundsExpression } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { formatearFecha, formatearMagnitud, type Sismo } from "@/lib/sismos";
import { colorDeProfundidad, radioDeMagnitud } from "./colores";
import type { Seleccion } from "./Explorador";

// Mapa base gris oscuro de Esri: no requiere API key.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

// Vista inicial: de Arica a Chiloé, donde ocurre la gran mayoría de los sismos.
const VISTA_INICIAL: LatLngBoundsExpression = [
  [-43.5, -76],
  [-17.5, -66.5],
];

interface Props {
  sismos: Sismo[];
  seleccion: Seleccion | null;
  onSeleccionar: (id: string) => void;
}

export default function MapaSismos({ sismos, seleccion, onSeleccionar }: Props) {
  const capas = useRef(new Map<string, CapaCirculo>());

  // Los sismos grandes se dibujan al final para que queden encima de los pequeños.
  const ordenados = useMemo(
    () => [...sismos].sort((a, b) => a.magnitud - b.magnitud),
    [sismos],
  );

  return (
    <MapContainer
      bounds={VISTA_INICIAL}
      className="mapa-sismos h-full w-full"
      zoomSnap={0.25}
      minZoom={3}
      maxZoom={16}
      worldCopyJump
    >
      <TileLayer
        url={`${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
        attribution="Mapa base &copy; Esri, HERE, Garmin, &copy; colaboradores de OpenStreetMap"
        maxZoom={16}
      />
      <TileLayer
        url={`${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`}
        maxZoom={16}
      />
      {ordenados.map((sismo) => {
        const color = colorDeProfundidad(sismo.profundidadKm);
        const activo = seleccion?.id === sismo.id;
        return (
          <CircleMarker
            key={sismo.id}
            ref={(capa) => {
              if (capa) capas.current.set(sismo.id, capa);
              else capas.current.delete(sismo.id);
            }}
            center={[sismo.lat, sismo.lon]}
            radius={radioDeMagnitud(sismo.magnitud)}
            pathOptions={{
              color: activo ? "#ffffff" : color,
              weight: activo ? 2.5 : 1,
              fillColor: color,
              fillOpacity: 0.5,
            }}
            eventHandlers={{ click: () => onSeleccionar(sismo.id) }}
          >
            <Popup>
              <p className="popup-magnitud">M {formatearMagnitud(sismo.magnitud)}</p>
              <p className="popup-lugar">{sismo.lugar}</p>
              <p className="popup-detalle">
                {formatearFecha(sismo.fecha)} · {sismo.profundidadKm} km de profundidad
              </p>
            </Popup>
          </CircleMarker>
        );
      })}
      <EnfocarSeleccion seleccion={seleccion} sismos={sismos} capas={capas} />
    </MapContainer>
  );
}

function EnfocarSeleccion({
  seleccion,
  sismos,
  capas,
}: {
  seleccion: Seleccion | null;
  sismos: Sismo[];
  capas: React.RefObject<Map<string, CapaCirculo>>;
}) {
  const mapa = useMap();
  const ultimaEnfocada = useRef<Seleccion | null>(null);

  useEffect(() => {
    // Si el usuario hizo clic en el mapa, ya está mirando el sismo: no lo movemos.
    // Tampoco volvemos a moverlo cuando solo se refrescaron los datos.
    if (!seleccion || seleccion.origen !== "lista" || seleccion === ultimaEnfocada.current) return;
    const sismo = sismos.find((s) => s.id === seleccion.id);
    if (!sismo) return;
    ultimaEnfocada.current = seleccion;

    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mapa.flyTo([sismo.lat, sismo.lon], Math.max(mapa.getZoom(), 6), {
      animate: !reducirMovimiento,
      duration: 0.8,
    });
    capas.current.get(sismo.id)?.openPopup();
  }, [seleccion, sismos, mapa, capas]);

  return null;
}
