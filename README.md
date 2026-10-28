# Folio: OCR de imágenes y PDF escaneados → .txt / .docx

backend/   FastAPI + Tesseract + Poppler (Docker, listo para Railway)
frontend/  Página para Next.js (App Router), lista para Vercel

## Backend local
cd backend
docker build -t folio-api . && docker run -p 8000:8000 -e CORS_ORIGINS=http://localhost:3000 folio-api
# Prueba: http://localhost:8000/salud

Sin Docker (Mac): brew install tesseract tesseract-lang poppler
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
