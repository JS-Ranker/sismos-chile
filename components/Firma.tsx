import Image from "next/image";

export function Firma() {
  return (
    <a
      href="https://github.com/JS-Ranker"
      className="group inline-flex items-center gap-2 py-0.5"
    >
      <Image src="/logo-hs.png" alt="" width={20} height={20} className="rounded-full" />
      <span>
        Desarrollado por <span className="font-semibold group-hover:text-marca">Héctor Sanhueza</span>
      </span>
    </a>
  );
}
