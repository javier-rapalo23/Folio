# Folio: OCR de imágenes y PDF escaneados → .txt / .docx, y herramientas de PDF

backend/   FastAPI + Tesseract + Poppler + Ghostscript (Docker, listo para Railway)
frontend/  Página para Next.js (App Router), lista para Vercel

## Backend local
cd backend
docker build -t folio-api . && docker run -p 8000:8000 -e CORS_ORIGINS=http://localhost:3000 folio-api
# Prueba: http://localhost:8000/salud

Sin Docker (Mac): brew install tesseract tesseract-lang poppler ghostscript
  pip install -r requirements.txt && uvicorn main:app --reload

## Frontend
npx create-next-app@latest folio-web --ts --app --no-tailwind
Copia frontend/app/* encima de folio-web/app/ y frontend/.env.example como .env.local
npm run dev

## Variables del backend
CORS_ORIGINS  dominios permitidos, separados por coma (ej. https://ocr.tudominio.com)
MAX_MB        tamaño máximo del archivo (20)
MAX_PAGINAS   páginas máximas por PDF (50)
OCR_DPI       resolución al rasterizar PDF (300)
MAX_ARCHIVOS  archivos máximos al unir PDF o juntar imágenes (20)

## Endpoints de PDF (multipart; devuelven el archivo)
POST /pdf/unir             archivos[]
POST /pdf/organizar        archivo, paginas ("3,1-2,5-"), rotar (0/90/180/270), paginas_rotar
POST /pdf/separar          archivo, rangos ("1-3,4-6"; vacío = una por página) → .zip
POST /pdf/comprimir        archivo, nivel (fuerte | recomendada | ligera)
POST /pdf/desde-imagenes   archivos[]
POST /pdf/a-imagenes       archivo, formato (jpg | png), dpi → .zip si hay varias páginas
POST /pdf/marca-agua       archivo, texto
POST /pdf/numerar          archivo, posicion, formato, inicio
POST /pdf/proteger         archivo, contrasena
