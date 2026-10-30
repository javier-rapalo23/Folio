"use client";

import { useState } from "react";
import s from "./page.module.css";
import { API, descargar, mb, mensajeError } from "./comun";

type Campo = { nombre: string; etiqueta: string; inicial?: string; soloLocal?: boolean } & (
  | { tipo: "texto"; placeholder?: string; requerido?: boolean; contrasena?: boolean }
  | { tipo: "opciones"; opciones: [valor: string, texto: string][] }
  | { tipo: "numero"; min?: number }
);

type Herramienta = {
  nombre: string;           // en el menú
  titulo: string;
  intro: string;
  endpoint: string;
  multiple?: boolean;       // varios archivos, con orden
  minimo?: number;
  acepta: string;
  ayuda: string;
  boton: string;
  campos: Campo[];
  validar?: (v: Record<string, string>) => string | null;
};

const PDF = ".pdf";
const IMAGENES = ".jpg,.jpeg,.png,.webp,.tif,.tiff,.bmp";

export const HERRAMIENTAS_PDF = {
  unir: {
    nombre: "Unir",
    titulo: "Unir varios PDF en uno",
    intro: "Sube los PDF y ordénalos como quieres que queden en el documento final.",
    endpoint: "/pdf/unir",
    multiple: true,
    minimo: 2,
    acepta: PDF,
    ayuda: "Dos o más PDF, hasta 20 MB cada uno",
    boton: "Unir PDF",
    campos: [],
  },
  organizar: {
    nombre: "Ordenar y rotar",
    titulo: "Ordenar, quitar o rotar páginas",
    intro: "Escribe las páginas en el orden en que las quieres; las que no pongas se quitan. Déjalo vacío para conservarlas todas.",
    endpoint: "/pdf/organizar",
    acepta: PDF,
    ayuda: "Un PDF, hasta 20 MB",
    boton: "Aplicar cambios",
    campos: [
      { tipo: "texto", nombre: "paginas", etiqueta: "Páginas y orden", placeholder: "Todas, o ej. 3, 1-2, 5-" },
      {
        tipo: "opciones", nombre: "rotar", etiqueta: "Rotar",
        opciones: [["0", "No rotar"], ["90", "90° a la derecha"], ["180", "180°"], ["270", "90° a la izquierda"]],
      },
      { tipo: "texto", nombre: "paginas_rotar", etiqueta: "Páginas a rotar", placeholder: "Todas, o ej. 2, 4" },
    ],
  },
  separar: {
    nombre: "Separar",
    titulo: "Separar un PDF en varios",
    intro: "Cada rango se vuelve un PDF aparte; si lo dejas vacío, sale un PDF por página. Si son varios, los recibes en un .zip.",
    endpoint: "/pdf/separar",
    acepta: PDF,
    ayuda: "Un PDF, hasta 20 MB",
    boton: "Separar",
    campos: [{ tipo: "texto", nombre: "rangos", etiqueta: "Rangos", placeholder: "Uno por página, o ej. 1-3, 4-6, 7-" }],
  },
  comprimir: {
    nombre: "Comprimir",
    titulo: "Reducir el peso de un PDF",
    intro: "Para esos escaneos de 15 MB que hay que mandar por WhatsApp o por correo.",
    endpoint: "/pdf/comprimir",
    acepta: PDF,
    ayuda: "Un PDF, hasta 20 MB",
    boton: "Comprimir",
    campos: [
      {
        tipo: "opciones", nombre: "nivel", etiqueta: "Compresión",
        opciones: [["recomendada", "Recomendada"], ["fuerte", "Fuerte (archivo más pequeño)"], ["ligera", "Ligera (casi sin pérdida)"]],
      },
    ],
  },
  "imagenes-pdf": {
    nombre: "Imágenes a PDF",
    titulo: "Juntar fotos en un PDF",
    intro: "Varias fotos del celular en un solo documento, una por página, en el orden que elijas.",
    endpoint: "/pdf/desde-imagenes",
    multiple: true,
    acepta: IMAGENES,
    ayuda: "JPG, PNG, WEBP o TIFF, hasta 20 MB cada una",
    boton: "Crear PDF",
    campos: [],
  },
  "pdf-imagenes": {
    nombre: "PDF a imágenes",
    titulo: "Convertir un PDF en imágenes",
    intro: "Cada página se vuelve una imagen. Si el PDF tiene varias páginas, las recibes en un .zip.",
    endpoint: "/pdf/a-imagenes",
    acepta: PDF,
    ayuda: "Un PDF de hasta 50 páginas y 20 MB",
    boton: "Convertir",
    campos: [
      { tipo: "opciones", nombre: "formato", etiqueta: "Formato", opciones: [["jpg", "JPG (más liviano)"], ["png", "PNG (sin pérdida)"]] },
      { tipo: "opciones", nombre: "dpi", etiqueta: "Calidad", opciones: [["150", "Normal"], ["100", "Baja"], ["300", "Alta, para imprimir"]] },
    ],
  },
  "marca-agua": {
    nombre: "Marca de agua",
    titulo: "Agregar marca de agua",
    intro: "Un texto en diagonal y semitransparente sobre todas las páginas.",
    endpoint: "/pdf/marca-agua",
    acepta: PDF,
    ayuda: "Un PDF, hasta 20 MB",
    boton: "Agregar marca",
    campos: [{ tipo: "texto", nombre: "texto", etiqueta: "Texto", placeholder: "CONFIDENCIAL", requerido: true }],
  },
  numerar: {
    nombre: "Numerar páginas",
    titulo: "Numerar las páginas",
    intro: "Agrega el número de página en cada hoja del PDF.",
    endpoint: "/pdf/numerar",
    acepta: PDF,
    ayuda: "Un PDF, hasta 20 MB",
    boton: "Numerar",
    campos: [
      {
        tipo: "opciones", nombre: "posicion", etiqueta: "Posición",
        opciones: [["abajo-centro", "Abajo, al centro"], ["abajo-derecha", "Abajo, a la derecha"], ["abajo-izquierda", "Abajo, a la izquierda"], ["arriba-derecha", "Arriba, a la derecha"]],
      },
      { tipo: "opciones", nombre: "formato", etiqueta: "Formato", opciones: [["n", "1"], ["n-de-total", "1 de 10"], ["pagina-n-de-total", "Página 1 de 10"]] },
      { tipo: "numero", nombre: "inicio", etiqueta: "Empezar en", inicial: "1", min: 0 },
    ],
  },
  proteger: {
    nombre: "Proteger",
    titulo: "Proteger con contraseña",
    intro: "Nadie podrá abrir el PDF sin la contraseña. Guárdala bien: no hay forma de recuperarla.",
    endpoint: "/pdf/proteger",
    acepta: PDF,
    ayuda: "Un PDF, hasta 20 MB",
    boton: "Proteger",
    campos: [
      { tipo: "texto", nombre: "contrasena", etiqueta: "Contraseña", contrasena: true, requerido: true },
      { tipo: "texto", nombre: "confirmar", etiqueta: "Repítela", contrasena: true, requerido: true, soloLocal: true },
    ],
    validar: (v) =>
      v.contrasena.length < 4 ? "La contraseña debe tener al menos 4 caracteres."
        : v.contrasena !== v.confirmar ? "Las contraseñas no coinciden." : null,
  },
} satisfies Record<string, Herramienta>;

export type IdPdf = keyof typeof HERRAMIENTAS_PDF;

/** El backend manda el nombre en Content-Disposition (filename*=UTF-8''…). */
function nombreDescarga(r: Response) {
  const m = r.headers.get("Content-Disposition")?.match(/filename\*=UTF-8''([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "resultado";
}

export default function HerramientaPdf({ id }: { id: IdPdf }) {
  const h: Herramienta = HERRAMIENTAS_PDF[id];
  const [archivos, setArchivos] = useState<File[]>([]);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(h.campos.map((c) => [c.nombre, c.inicial ?? (c.tipo === "opciones" ? c.opciones[0][0] : "")])),
  );
  const [arrastrando, setArrastrando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<{ blob: Blob; nombre: string } | null>(null);

  function agregar(lista?: FileList | null) {
    if (!lista?.length) return;
    const nuevos = Array.from(lista);
    setArchivos((prev) => (h.multiple ? [...prev, ...nuevos] : nuevos.slice(0, 1)));
    setResultado(null);
    setError("");
  }

  function mover(i: number, delta: number) {
    setArchivos((prev) => {
      const lista = [...prev];
      [lista[i], lista[i + delta]] = [lista[i + delta], lista[i]];
      return lista;
    });
    setResultado(null);
  }

  function quitar(i: number) {
    setArchivos((prev) => prev.filter((_, j) => j !== i));
    setResultado(null);
  }

  function cambiar(nombre: string, valor: string) {
    setValores((v) => ({ ...v, [nombre]: valor }));
    setResultado(null);
  }

  async function procesar() {
    const problema = h.validar?.(valores);
    if (problema) return setError(problema);
    setProcesando(true);
    setError("");
    setResultado(null);
    try {
      const fd = new FormData();
      for (const a of archivos) fd.append(h.multiple ? "archivos" : "archivo", a);
      for (const c of h.campos) if (!c.soloLocal) fd.append(c.nombre, valores[c.nombre]);
      const r = await fetch(`${API}${h.endpoint}`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(await mensajeError(r));
      setResultado({ blob: await r.blob(), nombre: nombreDescarga(r) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No hubo respuesta del servidor. Revisa la conexión.");
    } finally {
      setProcesando(false);
    }
  }

  const faltaCampo = h.campos.some((c) => c.tipo === "texto" && c.requerido && !valores[c.nombre].trim());
  const listo = archivos.length >= (h.minimo ?? 1) && !faltaCampo;
  const original = archivos.reduce((t, a) => t + a.size, 0);

  return (
    <>
      <h1 className={s.titulo}>{h.titulo}</h1>
      <p className={s.intro}>{h.intro}</p>

      <label
        className={[s.cama, arrastrando && s.arrastrando, procesando && s.escaneando].filter(Boolean).join(" ")}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); agregar(e.dataTransfer.files); }}
      >
        <input
          type="file"
          accept={h.acepta}
          multiple={h.multiple}
          disabled={procesando}
          onChange={(e) => { agregar(e.target.files); e.target.value = ""; }}
        />
        {!h.multiple && archivos[0] ? (
          <div>
            <p className={s.archivo}>{archivos[0].name}</p>
            <p className={s.camaAyuda}>
              {mb(archivos[0].size)} · {procesando ? "Procesando…" : "Haz clic para cambiarlo"}
            </p>
          </div>
        ) : (
          <div>
            <p className={s.camaTexto}>
              {h.multiple && archivos.length
                ? "Arrastra aquí más archivos o haz clic para agregarlos"
                : "Arrastra aquí tu archivo o haz clic para elegirlo"}
            </p>
            <p className={s.camaAyuda}>{h.ayuda}</p>
          </div>
        )}
      </label>

      {h.multiple && archivos.length > 0 && (
        <ol className={s.lista}>
          {archivos.map((a, i) => (
            <li key={`${a.name}-${a.lastModified}-${i}`}>
              <span className={s.nombreArchivo}>{a.name}</span>
              <span className={s.meta}>{mb(a.size)}</span>
              <button className={s.icono} onClick={() => mover(i, -1)} disabled={i === 0 || procesando} aria-label={`Subir ${a.name}`}>↑</button>
              <button className={s.icono} onClick={() => mover(i, 1)} disabled={i === archivos.length - 1 || procesando} aria-label={`Bajar ${a.name}`}>↓</button>
              <button className={s.icono} onClick={() => quitar(i)} disabled={procesando} aria-label={`Quitar ${a.name}`}>✕</button>
            </li>
          ))}
        </ol>
      )}

      {h.campos.length > 0 && (
        <div className={s.opciones}>
          {h.campos.map((c) => (
            <label key={c.nombre}>
              {c.etiqueta}
              {c.tipo === "opciones" ? (
                <select value={valores[c.nombre]} onChange={(e) => cambiar(c.nombre, e.target.value)}>
                  {c.opciones.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                </select>
              ) : (
                <input
                  type={c.tipo === "numero" ? "number" : c.contrasena ? "password" : "text"}
                  min={c.tipo === "numero" ? c.min : undefined}
                  placeholder={c.tipo === "texto" ? c.placeholder : undefined}
                  autoComplete={c.tipo === "texto" && c.contrasena ? "new-password" : "off"}
                  value={valores[c.nombre]}
                  onChange={(e) => cambiar(c.nombre, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>
      )}

      <button className={`${s.boton} ${h.campos.length ? "" : s.separado}`} onClick={procesar} disabled={!listo || procesando}>
        {procesando ? "Procesando…" : h.boton}
      </button>
      {error && <p className={s.error} role="alert">{error}</p>}

      {resultado && (
        <section className={s.listo} aria-live="polite">
          <div>
            <p className={s.archivo}>{resultado.nombre}</p>
            <p className={s.camaAyuda}>
              {id === "comprimir"
                ? resultado.blob.size < original
                  ? `De ${mb(original)} a ${mb(resultado.blob.size)} (${Math.round((1 - resultado.blob.size / original) * 100)} % menos)`
                  : "Este PDF ya estaba optimizado; no se pudo reducir más."
                : mb(resultado.blob.size)}
            </p>
          </div>
          <button className={s.boton} onClick={() => descargar(resultado.blob, resultado.nombre)}>Descargar</button>
        </section>
      )}
    </>
  );
}
