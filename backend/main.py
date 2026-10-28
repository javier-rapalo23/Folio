"""
Folio, servicio OCR: recibe imagen o PDF (escaneado o con texto) y devuelve el texto por página.
Exporta a .docx a partir del texto (posiblemente editado por el usuario).
"""
import io
import os

import pytesseract
from docx import Document
from docx.enum.text import WD_BREAK
from docx.shared import Pt
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pdf2image import convert_from_bytes, pdfinfo_from_bytes
from PIL import Image, ImageOps
from pydantic import BaseModel
from pypdf import PdfReader

MAX_MB = int(os.getenv("MAX_MB", "20"))
MAX_PAGINAS = int(os.getenv("MAX_PAGINAS", "50"))
DPI = int(os.getenv("OCR_DPI", "300"))
ORIGENES = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")]

TIPOS_IMAGEN = {"image/png", "image/jpeg", "image/webp", "image/tiff", "image/bmp"}

app = FastAPI(title="Folio API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


def preparar(img: Image.Image) -> Image.Image:
    """Endereza según EXIF, pasa a escala de grises y sube contraste."""
    img = ImageOps.exif_transpose(img)
    img = ImageOps.grayscale(img)
    return ImageOps.autocontrast(img)


def ocr_imagen(img: Image.Image, idioma: str) -> str:
    # --psm 3: segmentación automática de página (lo normal para documentos)
    return pytesseract.image_to_string(preparar(img), lang=idioma, config="--psm 3").strip()


def texto_nativo_pdf(datos: bytes) -> list[str] | None:
    """Si el PDF ya trae capa de texto (no escaneado), úsala: es exacta y mucho más rápida."""
    try:
        lector = PdfReader(io.BytesIO(datos))
        paginas = [(p.extract_text() or "").strip() for p in lector.pages]
    except Exception:
        return None
    # Heurística: si casi todas las páginas tienen texto, se considera PDF digital
    con_texto = sum(1 for t in paginas if len(t) > 30)
    return paginas if paginas and con_texto >= len(paginas) * 0.8 else None


@app.get("/salud")
def salud():
    return {"ok": True, "idiomas": pytesseract.get_languages()}


@app.post("/ocr")
async def ocr(
    archivo: UploadFile = File(...),
    idioma: str = Form("spa"),          # "spa", "eng" o "spa+eng"
    forzar_ocr: bool = Form(False),     # ignora la capa de texto del PDF
):
    datos = await archivo.read()
    if len(datos) > MAX_MB * 1024 * 1024:
        raise HTTPException(413, f"El archivo pasa de {MAX_MB} MB.")

    tipo = archivo.content_type or ""
    nombre = (archivo.filename or "documento").rsplit(".", 1)[0]

    if tipo == "application/pdf":
        if not forzar_ocr and (nativo := texto_nativo_pdf(datos)):
            return {"nombre": nombre, "metodo": "texto-nativo", "paginas": nativo}

        total = pdfinfo_from_bytes(datos)["Pages"]
        if total > MAX_PAGINAS:
            raise HTTPException(413, f"El PDF tiene {total} páginas; el máximo es {MAX_PAGINAS}.")

        paginas = []
        # Página por página para no cargar todo el PDF rasterizado en memoria
        for n in range(1, total + 1):
            img = convert_from_bytes(datos, dpi=DPI, first_page=n, last_page=n)[0]
            paginas.append(ocr_imagen(img, idioma))
        return {"nombre": nombre, "metodo": "ocr", "paginas": paginas}

    if tipo in TIPOS_IMAGEN:
        try:
            img = Image.open(io.BytesIO(datos))
        except Exception:
            raise HTTPException(400, "No se pudo abrir la imagen.")
        # TIFF puede traer varias páginas
        paginas = []
        for i in range(getattr(img, "n_frames", 1)):
            img.seek(i)
            paginas.append(ocr_imagen(img.copy(), idioma))
        return {"nombre": nombre, "metodo": "ocr", "paginas": paginas}

    raise HTTPException(415, "Formato no soportado. Sube PDF, PNG, JPG, WEBP, TIFF o BMP.")


class SolicitudDocx(BaseModel):
    nombre: str = "documento"
    paginas: list[str]


@app.post("/docx")
def exportar_docx(body: SolicitudDocx):
    doc = Document()
    estilo = doc.styles["Normal"]
    estilo.font.name = "Calibri"
    estilo.font.size = Pt(11)

    for i, texto in enumerate(body.paginas):
        for parrafo in texto.split("\n\n"):
            # Une los saltos de línea internos del OCR para que el párrafo fluya
            doc.add_paragraph(" ".join(l.strip() for l in parrafo.splitlines() if l.strip()))
        if i < len(body.paginas) - 1:
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{body.nombre}.docx"'},
    )
