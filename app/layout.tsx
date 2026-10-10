import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sismos Chile · Actividad sísmica en tiempo real",
    template: "%s · Sismos Chile",
  },
  description:
    "Mapa y lista de los sismos recientes en Chile, con magnitud, profundidad y ubicación. Se actualiza cada minuto con datos del USGS.",
};

export const viewport: Viewport = {
  themeColor: "#0d1015",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#contenido" className="saltar-contenido">
          Saltar al contenido
        </a>
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-borde px-4">
          <p className="flex items-baseline gap-3">
            <span className="text-base font-semibold tracking-tight">Sismos Chile</span>
            <span className="hidden text-sm text-tenue sm:inline">
              Actividad sísmica reciente
            </span>
          </p>
        </header>
        <main id="contenido" className="flex flex-1 flex-col">
          <h1 className="sr-only">Sismos recientes en Chile</h1>
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
