"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAGNITUDES_MINIMAS,
  PERIODO_INICIAL,
  PERIODOS,
  type Periodo,
  type ResultadoSismos,
  type Sismo,
  formatearMagnitud,
} from "@/lib/sismos";
import { Cronologia } from "./Cronologia";
import { Firma } from "./Firma";
import { ListaSismos } from "./ListaSismos";
import { TiempoRelativo } from "./TiempoRelativo";
import { UltimoSismo } from "./UltimoSismo";

// MapLibre usa WebGL y `window`, así que el mapa solo se carga en el navegador.
const MapaSismos = dynamic(() => import("./MapaSismos"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#0d2f52]" aria-hidden="true" />,
});

const ACTUALIZAR_CADA_MS = 60_000;
/** Lo que dura repetir todo el período en la reproducción. */
const DURACION_REPRODUCCION_MS = 26_000;
const HORA_MS = 3_600_000;

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

const ListaMemo = memo(ListaSismos);

export function Explorador({ inicial }: { inicial: ResultadoSismos | null }) {
  const [periodo, setPeriodo] = useState<Periodo>(PERIODO_INICIAL);
  const [magnitudMinima, setMagnitudMinima] = useState<number>(MAGNITUDES_MINIMAS[0]);
  const [pausado, setPausado] = useState(false);
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const cursorRef = useRef<number | null>(null);

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

  // La ventana de tiempo sale de la hora del servidor, no de Date.now() (ver README).
  const fin = consulta.data?.obtenidoEn ?? 0;
  const inicio = fin - PERIODOS[periodo].horas * HORA_MS;

  const cambiarCursor = useCallback((ms: number | null) => {
    cursorRef.current = ms;
    setCursor(ms);
  }, []);

  // Al cambiar el período o el filtro, la reproducción empieza de cero.
  const reiniciarReproduccion = useCallback(() => {
    setReproduciendo(false);
    cambiarCursor(null);
  }, [cambiarCursor]);

  useEffect(() => {
    if (!reproduciendo) return;
    let previo = performance.now();
    let cuadro = 0;
    const paso = (t: number) => {
      const avance = (t - previo) * ((fin - inicio) / DURACION_REPRODUCCION_MS);
      previo = t;
      const siguiente = (cursorRef.current ?? inicio) + avance;
      if (siguiente >= fin) {
        setReproduciendo(false);
        cambiarCursor(null);
        return;
      }
      cambiarCursor(siguiente);
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [reproduciendo, inicio, fin, cambiarCursor]);

  function alternarReproduccion() {
    if (reproduciendo) {
      setReproduciendo(false);
      return;
    }
    if (cursorRef.current === null) cambiarCursor(inicio);
    setReproduciendo(true);
  }

  // El sismo en foco es el elegido o, si no hay, el más reciente hasta el instante de la reproducción.
  const visibles = cursor === null ? sismos : sismos.filter((s) => s.fecha <= cursor);
  const elegido = seleccion ? sismos.find((s) => s.id === seleccion.id) ?? null : null;
  const foco = elegido ?? visibles[0] ?? null;

  const seleccionarDesdeMapa = useCallback((id: string) => {
    setSeleccion({ id, origen: "mapa" });
    setPanelAbierto(true);
    // En escritorio la lista está al lado del mapa: la desplazamos hasta el sismo.
    if (window.matchMedia("(min-width: 64rem)").matches) {
      document.getElementById(`sismo-${id}`)?.scrollIntoView({ block: "nearest" });
    }
  }, []);
  const seleccionarDesdeLista = useCallback(
    (id: string) => setSeleccion({ id, origen: "lista" }),
    [],
  );

  const cargando = consulta.data === undefined && !consulta.isError;

  return (
    <div className="carta flex h-dvh flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden border border-tinta bg-[#0d2f52]">
        <MapaSismos
          sismos={sismos}
          seleccion={seleccion}
          onSeleccionar={seleccionarDesdeMapa}
          cursor={cursor}
          reproduciendo={reproduciendo}
        />

        <div className="escena">
          <header className="cartucho area-titulo px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <div>
                <h1 className="rotulo text-2xl leading-none sm:text-3xl">Sismos Chile</h1>
                <EstadoActualizacion
                  actualizadoEn={fin}
                  actualizando={consulta.isFetching}
                  pausado={pausado}
                  onAlternarPausa={() => {
                    // Al reanudar, pedimos datos de inmediato en vez de esperar al próximo minuto.
                    if (pausado) void consulta.refetch();
                    setPausado(!pausado);
                  }}
                />
              </div>

              <div className="flex w-full items-end gap-x-4 sm:w-auto sm:flex-wrap">
                <fieldset>
                  <legend className="etiqueta mb-1">Período</legend>
                  <div className="segmentado">
                    {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
                      <label key={p}>
                        <input
                          type="radio"
                          name="periodo"
                          value={p}
                          checked={periodo === p}
                          onChange={() => {
                            setPeriodo(p);
                            reiniciarReproduccion();
                          }}
                        />
                        <span>{PERIODOS[p].etiqueta}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="magnitud-minima" className="etiqueta mb-1 block">
                    Magnitud<span className="sr-only sm:not-sr-only"> mínima</span>
                  </label>
                  <select
                    id="magnitud-minima"
                    className="control"
                    value={magnitudMinima}
                    onChange={(e) => {
                      setMagnitudMinima(Number(e.target.value));
                      reiniciarReproduccion();
                    }}
                  >
                    {MAGNITUDES_MINIMAS.map((m) => (
                      <option key={m} value={m}>
                        M {m.toFixed(1)}+
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </header>

          <Cronologia
            className={`area-crono ${panelAbierto ? "max-lg:hidden" : ""}`}
            sismos={sismos}
            inicio={inicio}
            fin={fin}
            cursor={cursor}
            reproduciendo={reproduciendo}
            onCursor={(ms) => {
              setReproduciendo(false);
              cambiarCursor(ms >= fin ? null : ms);
            }}
            onAlternar={alternarReproduccion}
            onPresente={() => cambiarCursor(null)}
          />

          <aside
            aria-label="Detalle y lista de sismos"
            className={`cartucho area-panel flex min-h-0 flex-col overflow-hidden ${
              panelAbierto ? "max-h-[55dvh] lg:max-h-none" : ""
            }`}
          >
            {/* En móvil el panel se pliega a una línea para dejar ver el mapa. */}
            {foco && !panelAbierto && (
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left lg:hidden"
                aria-expanded={false}
                onClick={() => setPanelAbierto(true)}
              >
                <span className="rotulo text-3xl leading-none">{formatearMagnitud(foco.magnitud)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{foco.lugar}</span>
                  <span className="block text-xs text-tenue">
                    <TiempoRelativo ms={foco.fecha} /> · Ver detalle y lista
                  </span>
                </span>
              </button>
            )}

            <div
              className={`min-h-0 flex-1 overflow-y-auto ${panelAbierto ? "" : "hidden lg:block"}`}
            >
              {panelAbierto && (
                <button
                  type="button"
                  className="boton-tinta m-3 mb-0 w-[calc(100%-1.5rem)] justify-center lg:hidden"
                  aria-expanded
                  onClick={() => setPanelAbierto(false)}
                >
                  Ocultar lista
                </button>
              )}

              {consulta.isError && consulta.data && !cambiandoPeriodo && (
                <p role="alert" className="aviso mx-4 mt-4">
                  No se pudo actualizar. Se muestran los últimos datos obtenidos.
                </p>
              )}

              {consulta.isError && (consulta.data === undefined || cambiandoPeriodo) ? (
                <ErrorCarga
                  mensaje={consulta.error.message}
                  onReintentar={() => consulta.refetch()}
                />
              ) : cargando ? (
                <p className="px-4 py-8 text-tenue">Cargando sismos…</p>
              ) : (
                <div
                  aria-busy={cambiandoPeriodo}
                  className={cambiandoPeriodo ? "opacity-50" : undefined}
                >
                  <UltimoSismo
                    sismo={foco}
                    elegido={elegido !== null}
                    onVolver={() => setSeleccion(null)}
                  />
                  <p aria-live="polite" className="px-4 pb-3 text-sm text-tenue">
                    {cambiandoPeriodo
                      ? `Cargando sismos de ${PERIODOS[periodo].etiqueta}…`
                      : resumen(sismos.length, mayor, periodo, magnitudMinima)}
                  </p>
                  {sismos.length > 0 ? (
                    <ListaMemo
                      sismos={sismos}
                      seleccionadoId={seleccion?.id ?? null}
                      onSeleccionar={seleccionarDesdeLista}
                    />
                  ) : (
                    <p className="mx-4 mb-4 border border-tinta px-4 py-6 text-center text-tenue">
                      No hay sismos registrados con estos filtros. Prueba con un período más largo
                      o una magnitud mínima menor.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 border-t border-tinta px-4 py-4 text-xs leading-relaxed text-tenue">
                <p>
                  Datos del{" "}
                  <a href="https://earthquake.usgs.gov/" className="enlace">
                    Servicio Geológico de EE.&nbsp;UU. (USGS)
                  </a>
                  , que en Chile registra principalmente sismos de magnitud 4 o superior. Para
                  sismos menores consulta el{" "}
                  <a href="https://www.sismologia.cl/" className="enlace">
                    Centro Sismológico Nacional
                  </a>
                  .
                </p>
                <Firma />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <footer className="px-1 py-2 text-xs leading-snug sm:text-[0.8125rem]">
        <p className="mx-auto max-w-[110ch] text-center">
          <strong className="font-semibold">Este sitio no es un sistema oficial de alerta.</strong>{" "}
          Ante una emergencia sigue las indicaciones de{" "}
          <a href="https://senapred.cl/" className="enlace">
            SENAPRED
          </a>{" "}
          y el{" "}
          <a href="https://www.shoa.cl/" className="enlace">
            SHOA
          </a>
          .
        </p>
        <p className="mx-auto mt-0.5 max-w-[110ch] text-center text-[0.6875rem] text-tenue">
          Mapa: Esri, GEBCO, NOAA, Garmin y colaboradores de OpenStreetMap · Relieve: Mapzen, USGS,
          NOAA
        </p>
      </footer>
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
    <p className="mt-1.5 flex items-center gap-2 text-xs text-tenue">
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
      <button type="button" className="enlace" onClick={onAlternarPausa}>
        {pausado ? "Reanudar" : "Pausar"}
      </button>
    </p>
  );
}

function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div role="alert" className="m-4 space-y-3 border border-tinta px-4 py-5">
      <p>{mensaje}</p>
      <button type="button" className="boton-tinta" onClick={onReintentar}>
        Reintentar
      </button>
    </div>
  );
}
