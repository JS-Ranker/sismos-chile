import Image from "next/image";

export function Firma() {
  return (
    <a
      href="https://github.com/JS-Ranker"
      className="group inline-flex items-center gap-2.5 rounded-md py-1 pr-2"
    >
      <Image src="/logo-hs.png" alt="" width={28} height={28} className="rounded-full" />
      <span className="leading-tight">
        <span className="block text-tenue">Desarrollado por</span>
        <span className="block font-medium text-texto group-hover:text-marca">
          Héctor Sanhueza
        </span>
      </span>
    </a>
  );
}
