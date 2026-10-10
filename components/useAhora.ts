"use client";

import { useSyncExternalStore } from "react";

// Reloj compartido que avanza cada 30 s. En el servidor devuelve null para que el HTML
// prerenderizado no dependa de la hora y no haya diferencias al hidratar.
const INTERVALO_MS = 30_000;
const oyentes = new Set<() => void>();
let ahora = 0;
let intervalo: ReturnType<typeof setInterval> | undefined;

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  if (!intervalo) {
    intervalo = setInterval(() => {
      ahora = Date.now();
      oyentes.forEach((o) => o());
    }, INTERVALO_MS);
  }
  return () => {
    oyentes.delete(oyente);
    if (oyentes.size === 0) {
      clearInterval(intervalo);
      intervalo = undefined;
    }
  };
}

function leerAhora() {
  if (ahora === 0) ahora = Date.now();
  return ahora;
}

export function useAhora(): number | null {
  return useSyncExternalStore(suscribir, leerAhora, () => null);
}
