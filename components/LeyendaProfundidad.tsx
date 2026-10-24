import { ETIQUETA_PROFUNDIDAD, type Profundidad } from "@/lib/sismos";
import { COLOR_PROFUNDIDAD } from "./colores";

const CORTA: Record<Profundidad, string> = {
  superficial: "< 70 km",
  intermedio: "70–300 km",
  profundo: "> 300 km",
};

export function LeyendaProfundidad({ className = "" }: { className?: string }) {
  return (
    <ul aria-label="Profundidad del sismo" className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${className}`}>
      {(Object.keys(COLOR_PROFUNDIDAD) as Profundidad[]).map((p) => (
        <li key={p} className="flex items-center gap-1.5" title={ETIQUETA_PROFUNDIDAD[p]}>
          <span
            aria-hidden="true"
            className="punto"
            style={{ "--c": COLOR_PROFUNDIDAD[p] } as React.CSSProperties}
          />
          <span className="sr-only">{ETIQUETA_PROFUNDIDAD[p]}</span>
          <span aria-hidden="true">{CORTA[p]}</span>
        </li>
      ))}
      <li className="hidden text-tenue sm:list-item">Tamaño según magnitud</li>
    </ul>
  );
}
