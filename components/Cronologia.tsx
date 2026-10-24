"use client";

import { formatearFecha, type Sismo } from "@/lib/sismos";
import { LeyendaProfundidad } from "./LeyendaProfundidad";

interface Props {
  sismos: Sismo[];
  inicio: number;
  fin: number;
  /** null = presente: se ven todos los sismos. */
  cursor: number | null;
  reproduciendo: boolean;
  onCursor: (ms: number) => void;
  onAlternar: () => void;
  onPresente: () => void;
  className?: string;
}

const ANCHO = 1000;

/** Regla de pulsos: cada sismo es una marca cuya altura crece con la magnitud, como un sismograma. */
export function Cronologia({
  sismos,
  inicio,
  fin,
  cursor,
  reproduciendo,
  onCursor,
  onAlternar,
  onPresente,
  className = "",
}: Props) {
  const rango = Math.max(1, fin - inicio);
  const actual = cursor ?? fin;
  const marcas = sismos.map((s) => ({
    id: s.id,
    x: ((s.fecha - inicio) / rango) * ANCHO,
    h: Math.min(34, 4 + (s.magnitud - 2.5) * 8.5),
    pasado: s.fecha <= actual,
  }));

  return (
    <section aria-label="Cronología y reproducción" className={`cartucho px-4 py-3 ${className}`}>
      <div className="flex items-center gap-3">
        <button type="button" className="boton-tinta shrink-0" onClick={onAlternar}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor">
            {reproduciendo ? (
              <path d="M2 1h3v10H2zM7 1h3v10H7z" />
            ) : (
              <path d="M2 1l9 5-9 5z" />
            )}
          </svg>
          {reproduciendo ? "Pausar" : cursor === null ? "Reproducir" : "Seguir"}
        </button>

        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${ANCHO} 36`}
            preserveAspectRatio="none"
            className="block h-9 w-full"
            aria-hidden="true"
          >
            {marcas.map((m) => (
              <line
                key={m.id}
                x1={m.x}
                x2={m.x}
                y1={36}
                y2={36 - m.h}
                stroke="var(--tinta)"
                strokeWidth="2.2"
                vectorEffect="non-scaling-stroke"
                opacity={m.pasado ? 1 : 0.22}
              />
            ))}
          </svg>
          <input
            type="range"
            className="regla"
            min={inicio}
            max={fin}
            step={Math.max(1, Math.round(rango / 600))}
            value={actual}
            aria-label="Momento de la reproducción"
            aria-valuetext={cursor === null ? "Ahora, todos los sismos" : formatearFecha(actual)}
            onChange={(e) => onCursor(Number(e.target.value))}
          />
        </div>

        <p className="hidden w-28 shrink-0 text-right text-sm sm:block">
          <span className="block font-medium">
            {cursor === null ? "Ahora" : formatearFecha(actual)}
          </span>
          {cursor !== null && !reproduciendo && (
            <button type="button" className="enlace text-xs text-tenue" onClick={onPresente}>
              Volver al presente
            </button>
          )}
        </p>
      </div>
      <LeyendaProfundidad className="mt-2" />
    </section>
  );
}
