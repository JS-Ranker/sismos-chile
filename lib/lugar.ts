// Traduce las descripciones de lugar del USGS ("72 km SSW of Colchane, Chile") al español.

const DISTANCIA = /^(\d+(?:\.\d+)?) km ([NSEW]{1,3}) of (.+)$/;

const FRASES: [RegExp, string][] = [
  [/^off the coast of (.+)$/i, "Frente a la costa de $1"],
  [/^near the coast of (.+)$/i, "Cerca de la costa de $1"],
  [/^(.+)-(.+) border region$/i, "Zona fronteriza $1-$2"],
  [/^Northern Chile$/i, "Norte de Chile"],
  [/^Central Chile$/i, "Chile central"],
  [/^Southern Chile$/i, "Sur de Chile"],
];

// Inglés usa W (west); en español es O (oeste).
function traducirRumbo(rumbo: string): string {
  return rumbo.replaceAll("W", "O");
}

function quitarPais(lugar: string): string {
  return lugar.replace(/, Chile$/, "");
}

export function traducirLugar(lugar: string): string {
  const distancia = DISTANCIA.exec(lugar);
  if (distancia) {
    const [, km, rumbo, referencia] = distancia;
    return `${km} km al ${traducirRumbo(rumbo)} de ${quitarPais(referencia)}`;
  }

  for (const [patron, reemplazo] of FRASES) {
    if (patron.test(lugar)) return quitarPais(lugar.replace(patron, reemplazo));
  }

  return quitarPais(lugar);
}
