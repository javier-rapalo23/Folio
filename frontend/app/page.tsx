"use client";

import { useState } from "react";
import s from "./page.module.css";

const API = process.env.NEXT_PUBLIC_FOLIO_API_URL ?? "http://localhost:8000";
const ACEPTA = ".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.bmp";

type Resultado = { nombre: string; metodo: "ocr" | "texto-nativo"; paginas: string[] };

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  a.click();
  URL.revokeObjectURL(url);
}

export default function Page() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [idioma, setIdioma] = useState("spa");
  const [forzarOcr, setForzarOcr] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<Resultado | null>(null);
  const [actual, setActual] = useState(0);
  const [generandoDocx, setGenerandoDocx] = useState(false);

  function elegir(f?: File | null) {
    if (!f) return;
    setArchivo(f);
    setRes(null);
    setError("");
  }

  async function extraer() {
    if (!archivo) return;
    setProcesando(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      fd.append("idioma", idioma);
      fd.append("forzar_ocr", String(forzarOcr));
      const r = await fetch(`${API}/ocr`, { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail ?? "El servidor no pudo procesar el archivo.");
      setRes(data);
      setActual(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No hubo respuesta del servidor. Revisa la conexión.");
    } finally {
      setProcesando(false);
    }
  }

  function editarPagina(texto: string) {
    if (!res) return;
    const paginas = [...res.paginas];
    paginas[actual] = texto;
    setRes({ ...res, paginas });
  }

  function bajarTxt() {
    if (!res) return;
    // \f (salto de página) separa páginas; la mayoría de editores lo respeta
    const texto = res.paginas.join("\n\n\f\n\n");
    descargar(new Blob([texto], { type: "text/plain;charset=utf-8" }), `${res.nombre}.txt`);
  }

  async function bajarDocx() {
    if (!res) return;
    setGenerandoDocx(true);
    try {
      const r = await fetch(`${API}/docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: res.nombre, paginas: res.paginas }),
      });
      if (!r.ok) throw new Error();
      descargar(await r.blob(), `${res.nombre}.docx`);
    } catch {
      setError("No se pudo generar el .docx. Intenta de nuevo.");
    } finally {
      setGenerandoDocx(false);
    }
  }

  const palabras = res?.paginas.join(" ").split(/\s+/).filter(Boolean).length ?? 0;

  return (
    <main className={s.main}>
      <h1 className={s.titulo}>Extraer texto de documentos</h1>
      <p className={s.intro}>
        Sube una foto o un PDF escaneado. Revisa el texto, corrige lo que haga falta y descárgalo como .txt o .docx. 
        Hola Vicky, aquí probando.
      </p>

      <label
        className={[s.cama, arrastrando && s.arrastrando, procesando && s.escaneando].filter(Boolean).join(" ")}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files[0]); }}
      >
        <input type="file" accept={ACEPTA} onChange={(e) => elegir(e.target.files?.[0])} disabled={procesando} />
        {archivo ? (
          <div>
            <p className={s.archivo}>{archivo.name}</p>
            <p className={s.camaAyuda}>
              {(archivo.size / 1024 / 1024).toFixed(1)} MB · {procesando ? "Leyendo el documento…" : "Haz clic para cambiarlo"}
            </p>
          </div>
        ) : (
          <div>
            <p className={s.camaTexto}>Arrastra aquí tu archivo o haz clic para elegirlo</p>
            <p className={s.camaAyuda}>PDF, JPG, PNG, WEBP o TIFF, hasta 20 MB</p>
          </div>
        )}
      </label>

      <div className={s.opciones}>
        <label>
          Idioma del documento
          <select value={idioma} onChange={(e) => setIdioma(e.target.value)}>
            <option value="spa">Español</option>
            <option value="eng">Inglés</option>
            <option value="spa+eng">Español e inglés</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={forzarOcr} onChange={(e) => setForzarOcr(e.target.checked)} />
          Leer el PDF como imagen aunque ya tenga texto
        </label>
      </div>

      <button className={s.boton} onClick={extraer} disabled={!archivo || procesando}>
        {procesando ? "Extrayendo texto…" : "Extraer texto"}
      </button>
      {error && <p className={s.error} role="alert">{error}</p>}

      {res && (
        <section className={s.resultado} aria-live="polite">
          <div className={s.cabecera}>
            <h2>Texto extraído</h2>
            <span className={s.meta}>
              {res.paginas.length} {res.paginas.length === 1 ? "página" : "páginas"}, {palabras} palabras
              {res.metodo === "texto-nativo" && ", tomado del texto que ya traía el PDF"}
            </span>
          </div>

          {res.paginas.length > 1 && (
            <div className={s.paginas}>
              {res.paginas.map((_, i) => (
                <button key={i} className={s.pagina} aria-current={i === actual} onClick={() => setActual(i)}>
                  Página {i + 1}
                </button>
              ))}
            </div>
          )}

          <textarea
            className={s.texto}
            value={res.paginas[actual]}
            onChange={(e) => editarPagina(e.target.value)}
            aria-label={`Texto de la página ${actual + 1}`}
            spellCheck
          />

          <div className={s.descargas}>
            <button className={s.boton} onClick={bajarDocx} disabled={generandoDocx}>
              {generandoDocx ? "Generando…" : "Descargar .docx"}
            </button>
            <button className={`${s.boton} ${s.secundario}`} onClick={bajarTxt}>Descargar .txt</button>
          </div>
        </section>
      )}
    </main>
  );
}
