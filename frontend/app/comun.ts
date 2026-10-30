export const API = process.env.NEXT_PUBLIC_FOLIO_API_URL ?? "http://localhost:8000";

export function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  a.click();
  URL.revokeObjectURL(url);
}

export const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Mensaje de error de FastAPI ({ detail }) o uno genérico. */
export async function mensajeError(r: Response) {
  const data = await r.json().catch(() => ({}));
  return typeof data.detail === "string" ? data.detail : "El servidor no pudo procesar el archivo.";
}
