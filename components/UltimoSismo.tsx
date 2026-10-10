import {
  ETIQUETA_PROFUNDIDAD,
  clasificarProfundidad,
  formatearFecha,
  formatearMagnitud,
  type Sismo,
} from "@/lib/sismos";
import { colorDeProfundidad } from "./colores";
import { TiempoRelativo } from "./TiempoRelativo";

export function UltimoSismo({ sismo }: { sismo: Sismo | null }) {
  if (!sismo) return null;

  return (
    <section aria-labelledby="titulo-ultimo-sismo" className="px-4 pt-5 pb-4">
      <h2 id="titulo-ultimo-sismo" className="etiqueta">
        Último sismo registrado
      </h2>
      <div className="mt-2 flex items-start gap-4">
        <p className="text-6xl leading-none font-semibold tracking-tight tabular-nums">
          <span className="sr-only">Magnitud </span>
          {formatearMagnitud(sismo.magnitud)}
        </p>
        <div className="min-w-0 pt-1">
          <p className="text-lg leading-snug font-medium text-balance">{sismo.lugar}</p>
          <p className="mt-1 text-sm text-tenue">
            <TiempoRelativo ms={sismo.fecha} /> · {formatearFecha(sismo.fecha)}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-tenue">Profundidad</dt>
          <dd className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: colorDeProfundidad(sismo.profundidadKm) }}
            />
            {sismo.profundidadKm} km
            <span className="sr-only">
              , {ETIQUETA_PROFUNDIDAD[clasificarProfundidad(sismo.profundidadKm)]}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-tenue">Escala</dt>
          <dd>{sismo.tipoMagnitud || "No informada"}</dd>
        </div>
        {sismo.reportesSentido !== null && (
          <div>
            <dt className="text-tenue">Personas que lo sintieron</dt>
            <dd>{sismo.reportesSentido} reportes al USGS</dd>
          </div>
        )}
        <div>
          <dt className="text-tenue">Fuente</dt>
          <dd>
            <a href={sismo.urlUsgs} className="enlace">
              Ver en USGS
            </a>
          </dd>
        </div>
      </dl>

      {sismo.alertaTsunami && (
        <p className="aviso mt-4">
          El USGS marcó este sismo para evaluación de tsunami. Sigue las indicaciones oficiales del
          SHOA y SENAPRED.
        </p>
      )}
    </section>
  );
}
