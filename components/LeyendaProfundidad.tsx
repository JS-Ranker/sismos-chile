import { ETIQUETA_PROFUNDIDAD, type Profundidad } from "@/lib/sismos";
import { COLOR_PROFUNDIDAD } from "./colores";

interface Props {
  className?: string;
  /** Versión en una franja horizontal, para ir bajo el mapa en pantallas chicas. */
  compacta?: boolean;
}

export function LeyendaProfundidad({ className = "", compacta = false }: Props) {
  const items = (Object.keys(COLOR_PROFUNDIDAD) as Profundidad[]).map((p) => (
    <li key={p} className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="size-2.5 rounded-full"
        style={{ backgroundColor: COLOR_PROFUNDIDAD[p] }}
      />
      {ETIQUETA_PROFUNDIDAD[p]}
    </li>
  ));

  if (compacta) {
    return (
      <div className={`text-xs ${className}`}>
        <ul aria-label="Profundidad" className="flex flex-wrap gap-x-4 gap-y-1">
          {items}
          <li className="text-tenue">Tamaño según magnitud</li>
        </ul>
      </div>
    );
  }

  return (
    <div className={`rounded-md border border-borde bg-superficie/90 px-3 py-2 text-xs ${className}`}>
      <p className="mb-1 font-medium">Profundidad</p>
      <ul className="space-y-0.5">{items}</ul>
      <p className="mt-1 text-tenue">Tamaño según magnitud</p>
    </div>
  );
}
