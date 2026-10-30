"use client";

import { useEffect, useState } from "react";
import s from "./page.module.css";
import Ocr from "./ocr";
import HerramientaPdf, { HERRAMIENTAS_PDF, type IdPdf } from "./pdf";

type Id = "ocr" | IdPdf;

const MENU: [Id, string][] = [
  ["ocr", "Extraer texto"],
  ...Object.entries(HERRAMIENTAS_PDF).map(([id, h]) => [id as IdPdf, h.nombre] as [Id, string]),
];

export default function Page() {
  const [actual, setActual] = useState<Id>("ocr");

  // #comprimir, #unir…: permite compartir el enlace directo a una herramienta
  useEffect(() => {
    const h = location.hash.slice(1);
    if (h in HERRAMIENTAS_PDF) setActual(h as IdPdf);
  }, []);

  function ir(id: Id) {
    setActual(id);
    history.replaceState(null, "", id === "ocr" ? location.pathname : `#${id}`);
  }

  return (
    <main className={s.main}>
      <nav className={s.menu} aria-label="Herramientas">
        {MENU.map(([id, nombre]) => (
          <button key={id} className={s.pagina} aria-current={id === actual} onClick={() => ir(id)}>
            {nombre}
          </button>
        ))}
      </nav>
      {actual === "ocr" ? <Ocr /> : <HerramientaPdf key={actual} id={actual} />}
    </main>
  );
}
