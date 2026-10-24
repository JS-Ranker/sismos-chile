import { colorDeProfundidad } from "./colores";

const MAX_KM = 700;
const ALTO = 112;
const MARCAS = [0, 70, 300, 700];

// Escala de raíz cuadrada: los sismos someros, que son la mayoría, no quedan apretados arriba.
function y(km: number) {
  return 6 + Math.sqrt(Math.min(km, MAX_KM) / MAX_KM) * (ALTO - 12);
}

/** Corte vertical bajo la superficie: dónde ocurrió el sismo entre 0 y 700 km. */
export function MedidorProfundidad({ km }: { km: number }) {
  return (
    <svg
      width="76"
      height={ALTO}
      viewBox={`0 0 76 ${ALTO}`}
      role="img"
      aria-label={`Profundidad: ${km} km bajo la superficie`}
      className="shrink-0"
    >
      <rect x="0.5" y="0.5" width="75" height={ALTO - 1} fill="var(--papel-2)" stroke="var(--tinta)" />
      <rect x="1" y="1" width="74" height={y(70) - 1} fill="#c9d6c4" />
      <path d="M1 6.5H75" stroke="var(--tinta)" strokeWidth="2" />
      {MARCAS.slice(1).map((m) => (
        <g key={m}>
          <line x1="1" x2="12" y1={y(m)} y2={y(m)} stroke="var(--tinta)" />
          <text x="16" y={y(m) + 3.5} fontSize="10" fill="var(--tenue)">
            {m}
          </text>
        </g>
      ))}
      <line x1="52" x2="52" y1="6" y2={y(km)} stroke="var(--tinta)" strokeDasharray="2 3" />
      <circle cx="52" cy={y(km)} r="6.5" fill={colorDeProfundidad(km)} stroke="var(--tinta)" strokeWidth="1.5" />
      <text x="74" y={ALTO - 4} fontSize="9" fill="var(--tenue)" textAnchor="end">
        km
      </text>
    </svg>
  );
}
