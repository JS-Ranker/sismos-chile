"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  MAGNITUDES_MINIMAS,
  PERIODO_INICIAL,
  PERIODOS,
  type Periodo,
  type ResultadoSismos,
  type Sismo,
} from "@/lib/sismos";
import { LeyendaProfundidad } from "./LeyendaProfundidad";
import { ListaSismos } from "./ListaSismos";
import { TiempoRelativo } from "./TiempoRelativo";
import { UltimoSismo } from "./UltimoSismo";

// Leaflet usa `window`, así que el mapa solo se carga en el navegador.
const MapaSismos = dynamic(() => import("./MapaSismos"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-tenue">Cargando mapa…</div>,
});

const ACTUALIZAR_CADA_MS = 60_000;

export interface Seleccion {
  id: string;
  origen: "mapa" | "lista";
}

async function obtenerSismos(periodo: Periodo, signal: AbortSignal): Promise<ResultadoSismos> {
  const res = await fetch(`/api/sismos?periodo=${periodo}`, { signal });
  const cuerpo: (Partial<ResultadoSismos> & { error?: string }) | null = await res
    .json()
    .catch(() => null);
  if (!res.ok || !cuerpo?.sismos || !cuerpo.obtenidoEn) {
    throw new Error(cuerpo?.error ?? "No pudimos cargar los sismos.");
  }
  return { sismos: cuerpo.sismos, obtenidoEn: cuerpo.obtenidoEn };
}

export function Explorador({ inicial }: { inicial: ResultadoSismos | null }) {
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_INICIAL);
  const [magnitudMinima, setMagnitudMinima] = useState<number>(MAGNITUDES_MINIMAS[0]);
  const [pausado, setPausado] = useState(false);
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);

  const consulta = useQuery({
    queryKey: ["sismos", periodo],
    queryFn: ({ signal }) => obtenerSismos(periodo, signal),
    initialData: periodo === PERIODO_INICIAL && inicial ? inicial : undefined,
    initialDataUpdatedAt: inicial?.obtenidoEn,
    placeholderData: keepPreviousData,
    // Con Cache Components, Next prerenderiza este componente: si TanStack Query lee la hora
    // para saber si los datos están viejos, el render se aplaza al navegador. "static" evita
    // esa lectura; la actualización queda a cargo de refetchInterval.
    staleTime: "static",
    refetchInterval: pausado ? false : ACTUALIZAR_CADA_MS,
    retry: 2,
  });
  // Mientras llega el nuevo período se siguen mostrando los datos del anterior.
  const cambiandoPeriodo = consulta.isPlaceholderData;

  const sismos = useMemo(
    () => (consulta.data?.sismos ?? []).filter((s) => s.magnitud >= magnitudMinima),
    [consulta.data, magnitudMinima],
  );
  const mayor = sismos.reduce<Sismo | null>(
    (max, s) => (max === null || s.magnitud > max.magnitud ? s : max),
    null,
  );

  function seleccionarDesdeMapa(id: string) {
    setSeleccion({ id, origen: "mapa" });
    // En escritorio la lista está al lado del mapa: la desplazamos hasta el sismo.
    // En móvil no, porque sacaría el mapa de la pantalla.
    if (window.matchMedia("(min-width: 64rem)").matches) {
      document.getElementById(`sismo-${id}`)?.scrollIntoView({ block: "nearest" });
    }
  }

  return (
    <div className="flex flex-1 flex-col lg:grid lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:flex-none lg:grid-cols-[minmax(0,1fr)_27rem] lg:grid-rows-[minmax(0,1fr)]">
      <section
        aria-label="Mapa de sismos. La misma información está disponible en la lista."
        className="relative h-[55svh] min-h-80 overflow-hidden border-b border-borde lg:h-auto lg:border-r lg:border-b-0"
      >
        <MapaSismos sismos={sismos} seleccion={seleccion} onSeleccionar={seleccionarDesdeMapa} />
        <LeyendaProfundidad className="absolute bottom-6 left-3 z-[1000] hidden lg:block" />
      </section>
      {/* En móvil el mapa es bajo: la leyenda va debajo para no tapar sismos. */}
      <LeyendaProfundidad compacta className="border-b border-borde px-4 py-2 lg:hidden" />

      <div className="flex min-h-0 flex-col">
        <div className="space-y-4 border-b border-borde px-4 py-4">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <fieldset>
              <legend className="etiqueta mb-1.5">Período</legend>
              <div className="segmentado">
                {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
                  <label key={p}>
                    <input
                      type="radio"
                      name="periodo"
                      value={p}
                      checked={periodo === p}
                      onChange={() => setPeriodo(p)}
                    />
                    <span>{PERIODOS[p].etiqueta}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="magnitud-minima" className="etiqueta mb-1.5 block">
                Magnitud mínima
              </label>
              <select
                id="magnitud-minima"
                className="control"
                value={magnitudMinima}
                onChange={(e) => setMagnitudMinima(Number(e.target.value))}
              >
                {MAGNITUDES_MINIMAS.map((m) => (
                  <option key={m} value={m}>
                    M {m.toFixed(1)}+
                  </option>
                ))}
              </select>
            </div>
          </div>

          <EstadoActualizacion
            actualizadoEn={consulta.data?.obtenidoEn ?? 0}
            actualizando={consulta.isFetching}
            pausado={pausado}
            onAlternarPausa={() => {
              // Al reanudar, pedimos datos de inmediato en vez de esperar al próximo minuto.
              if (pausado) void consulta.refetch();
              setPausado(!pausado);
            }}
          />
        </div>

        {/* relative: los textos sr-only (absolutos) deben quedar dentro del scroll, no del documento. */}
        <div className="relative min-h-0 flex-1 lg:overflow-y-auto">
          {consulta.isError && consulta.data && !cambiandoPeriodo && (
            <p role="alert" className="aviso mx-4 mt-4">
              No se pudo actualizar. Se muestran los últimos datos obtenidos.
            </p>
          )}

          {consulta.isError && (consulta.data === undefined || cambiandoPeriodo) ? (
            <ErrorCarga mensaje={consulta.error.message} onReintentar={() => consulta.refetch()} />
          ) : consulta.data === undefined ? (
            <p className="px-4 py-8 text-tenue">Cargando sismos…</p>
          ) : (
            <div aria-busy={cambiandoPeriodo} className={cambiandoPeriodo ? "opacity-50" : undefined}>
              <UltimoSismo sismo={sismos[0] ?? null} />
              <p aria-live="polite" className="px-4 pb-3 text-sm text-tenue">
                {cambiandoPeriodo
                  ? `Cargando sismos de ${PERIODOS[periodo].etiqueta}…`
                  : resumen(sismos.length, mayor, periodo, magnitudMinima)}
              </p>
              {sismos.length > 0 ? (
                <ListaSismos
                  sismos={sismos}
                  seleccionadoId={seleccion?.id ?? null}
                  onSeleccionar={(id) => setSeleccion({ id, origen: "lista" })}
                />
              ) : (
                <p className="mx-4 mb-4 rounded-md border border-borde px-4 py-6 text-center text-tenue">
                  No hay sismos registrados con estos filtros. Prueba con un período más largo o
                  una magnitud mínima menor.
                </p>
              )}
            </div>
          )}

          <footer className="space-y-2 px-4 py-6 text-xs leading-relaxed text-tenue">
            <p>
              Datos del{" "}
              <a href="https://earthquake.usgs.gov/" className="enlace">
                Servicio Geológico de EE.&nbsp;UU. (USGS)
              </a>
              , que en Chile registra principalmente sismos de magnitud 4 o superior. Para sismos
              menores consulta el{" "}
              <a href="https://www.sismologia.cl/" className="enlace">
                Centro Sismológico Nacional
              </a>
              .
            </p>
            <p>
              Este sitio no es un sistema oficial de alerta. Ante una emergencia sigue las
              indicaciones de{" "}
              <a href="https://senapred.cl/" className="enlace">
                SENAPRED
              </a>{" "}
              y el{" "}
              <a href="https://www.shoa.cl/" className="enlace">
                SHOA
              </a>
              .
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

function resumen(total: number, mayor: Sismo | null, periodo: Periodo, magnitudMinima: number) {
  const rango = `en ${PERIODOS[periodo].etiqueta}`;
  const filtro = `M ${magnitudMinima.toFixed(1)}+`;
  if (total === 0) return `0 sismos ${filtro} ${rango}.`;
  const cantidad = total === 1 ? "1 sismo" : `${total} sismos`;
  return `${cantidad} ${filtro} ${rango}. Mayor: M ${mayor?.magnitud.toFixed(1)}.`;
}

function EstadoActualizacion({
  actualizadoEn,
  actualizando,
  pausado,
  onAlternarPausa,
}: {
  actualizadoEn: number;
  actualizando: boolean;
  pausado: boolean;
  onAlternarPausa: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="flex items-center gap-2 text-tenue">
        <span className={pausado ? "punto-vivo pausado" : "punto-vivo"} aria-hidden="true" />
        {pausado ? (
          "Actualización en pausa"
        ) : actualizando ? (
          "Actualizando…"
        ) : actualizadoEn > 0 ? (
          <span>
            Actualizado <TiempoRelativo ms={actualizadoEn} />
          </span>
        ) : (
          "Actualización automática cada minuto"
        )}
      </p>
      <button type="button" className="boton-secundario" onClick={onAlternarPausa}>
        {pausado ? "Reanudar" : "Pausar"}
      </button>
    </div>
  );
}

function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div role="alert" className="m-4 space-y-3 rounded-md border border-borde px-4 py-5">
      <p>{mensaje}</p>
      <button type="button" className="boton-secundario" onClick={onReintentar}>
        Reintentar
      </button>
    </div>
  );
}
