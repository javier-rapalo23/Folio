FROM python:3.12-slim

# Tesseract (con español e inglés), Poppler para rasterizar PDFs y Ghostscript para comprimirlos
RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng poppler-utils ghostscript \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .

# Railway inyecta $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
