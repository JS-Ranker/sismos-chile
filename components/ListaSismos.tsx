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
    <ol aria-label="Sismos, del más reciente al más antiguo" className="border-t border-tinta">
      {sismos.map((sismo) => (
        <li key={sismo.id} id={`sismo-${sismo.id}`} className="border-b border-tinta/25">
          <button
            type="button"
            aria-pressed={seleccionadoId === sismo.id}
            onClick={() => onSeleccionar(sismo.id)}
            className="fila-sismo"
          >
            <span
              className="insignia-magnitud"
              style={{ "--punto": colorDeProfundidad(sismo.profundidadKm) } as React.CSSProperties}
            >
              <span className="sr-only">Magnitud </span>
              {formatearMagnitud(sismo.magnitud)}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{sismo.lugar}</span>
              <span className="tenue block text-sm text-tenue">
                <TiempoRelativo ms={sismo.fecha} /> · {sismo.profundidadKm} km de profundidad
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
