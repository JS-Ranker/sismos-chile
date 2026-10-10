import type { NextRequest } from "next/server";
import { esPeriodo } from "@/lib/sismos";
import { getSismos } from "@/lib/usgs";

export async function GET(request: NextRequest) {
  const periodo = request.nextUrl.searchParams.get("periodo") ?? "semana";
  if (!esPeriodo(periodo)) {
    return Response.json(
      { error: "Parámetro 'periodo' inválido. Usa dia, semana o mes." },
      { status: 400 },
    );
  }

  try {
    const resultado = await getSismos(periodo);
    return Response.json(
      resultado,
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (error) {
    console.error("Error al consultar el USGS", error);
    return Response.json(
      { error: "No pudimos obtener los datos del USGS. Intenta de nuevo en unos minutos." },
      { status: 502 },
    );
  }
}
