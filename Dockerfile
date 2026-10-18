FROM python:3.13-slim

WORKDIR /app

COPY backend/ /app/backend/
COPY static/ /app/static/

RUN pip install --no-cache-dir fastapi uvicorn python-multipart requests pillow

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
