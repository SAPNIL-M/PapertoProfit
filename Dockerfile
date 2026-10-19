FROM python:3.13-slim

WORKDIR /app

COPY backend/ /app/backend/
COPY static/ /app/static/

RUN pip install --no-cache-dir -r backend/requirements.txt

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
