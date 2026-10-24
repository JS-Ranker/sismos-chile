import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, Young_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const grotesk = Schibsted_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

const rotulo = Young_Serif({
  variable: "--font-rotulo",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Sismos Chile · Actividad sísmica en tiempo real",
    template: "%s · Sismos Chile",
  },
  description:
    "Mapa en relieve de los sismos recientes en Chile, con magnitud, profundidad y ubicación. Se actualiza cada minuto con datos del USGS.",
};

export const viewport: Viewport = {
  themeColor: "#eef0ea",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${grotesk.variable} ${rotulo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#contenido" className="saltar-contenido">
          Saltar al contenido
        </a>
        <main id="contenido" className="flex flex-1 flex-col">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
