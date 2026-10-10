"use client";

import { formatearFecha, tiempoRelativo } from "@/lib/sismos";
import { useAhora } from "./useAhora";

export function TiempoRelativo({ ms }: { ms: number }) {
  const ahora = useAhora();
  const absoluta = formatearFecha(ms);

  return (
    <time dateTime={new Date(ms).toISOString()} title={absoluta}>
      {ahora === null ? absoluta : tiempoRelativo(ms, ahora)}
    </time>
  );
}
