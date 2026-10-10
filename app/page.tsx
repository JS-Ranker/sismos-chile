import { Suspense } from "react";
import { Explorador } from "@/components/Explorador";
import { PERIODO_INICIAL } from "@/lib/sismos";
import { getSismos } from "@/lib/usgs";

export default function Inicio() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-tenue">Cargando sismos…</p>}>
      <ExploradorConDatos />
    </Suspense>
  );
}

async function ExploradorConDatos() {
  // Si el USGS no responde, el cliente vuelve a intentarlo por su cuenta.
  const inicial = await getSismos(PERIODO_INICIAL).catch(() => null);
  return <Explorador inicial={inicial} />;
}
