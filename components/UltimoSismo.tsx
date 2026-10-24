import {
  ETIQUETA_PROFUNDIDAD,
  clasificarProfundidad,
  formatearFecha,
  formatearMagnitud,
  type Sismo,
} from "@/lib/sismos";
import { MedidorProfundidad } from "./MedidorProfundidad";
import { TiempoRelativo } from "./TiempoRelativo";

interface Props {
  sismo: Sismo | null;
  /** true cuando es el sismo elegido por la persona y no el más reciente. */
  elegido: boolean;
  onVolver: () => void;
}

export function UltimoSismo({ sismo, elegido, onVolver }: Props) {
  if (!sismo) return null;

  return (
    <section aria-labelledby="titulo-foco" className="px-4 pt-4 pb-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titulo-foco" className="etiqueta">
          {elegido ? "Sismo seleccionado" : "Último sismo registrado"}
        </h2>
        {elegido && (
          <button type="button" className="enlace text-xs" onClick={onVolver}>
            Ver el último
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-4">
        <div className="min-w-0 flex-1">
          <p className="rotulo text-6xl leading-none tabular-nums">
            <span className="sr-only">Magnitud </span>
            {formatearMagnitud(sismo.magnitud)}
          </p>
          <p className="mt-3 text-base leading-snug font-semibold text-balance">{sismo.lugar}</p>
          <p className="mt-1 text-sm text-tenue">
            <TiempoRelativo ms={sismo.fecha} /> · {formatearFecha(sismo.fecha)}
          </p>
        </div>
        <MedidorProfundidad km={sismo.profundidadKm} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-tenue">Profundidad</dt>
          <dd>
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
            <dt className="text-tenue">Lo sintieron</dt>
            <dd>{sismo.reportesSentido} reportes</dd>
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
