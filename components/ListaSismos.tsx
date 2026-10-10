"use client";

import { formatearMagnitud, type Sismo } from "@/lib/sismos";
import { colorDeProfundidad } from "./colores";
import { TiempoRelativo } from "./TiempoRelativo";

interface Props {
  sismos: Sismo[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
}

export function ListaSismos({ sismos, seleccionadoId, onSeleccionar }: Props) {
  return (
    <ol aria-label="Sismos, del más reciente al más antiguo" className="border-t border-borde">
      {sismos.map((sismo) => (
        <li key={sismo.id} id={`sismo-${sismo.id}`} className="border-b border-borde">
          <button
            type="button"
            aria-pressed={seleccionadoId === sismo.id}
            onClick={() => onSeleccionar(sismo.id)}
            className="fila-sismo"
          >
            <span
              className="insignia-magnitud"
              style={{ borderColor: colorDeProfundidad(sismo.profundidadKm) }}
            >
              <span className="sr-only">Magnitud </span>
              {formatearMagnitud(sismo.magnitud)}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{sismo.lugar}</span>
              <span className="block text-sm text-tenue">
                <TiempoRelativo ms={sismo.fecha} /> · {sismo.profundidadKm} km de profundidad
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
