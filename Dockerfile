# syntax=docker/dockerfile:1
# Multi-stage build for TRACER backend (defense-only AI risk engine).
FROM python:3.11-slim AS builder
WORKDIR /build
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim AS runtime
WORKDIR /srv
# Copy pre-built wheels from builder stage.
COPY --from=builder /install /usr/local
COPY backend ./backend
COPY data ./data

# Production posture: ENVIRONMENT=production fails fast at import unless
# RAZORPAY_WEBHOOK_SECRET (>= 32 chars) is provided at runtime.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production \
    DOCS_ENABLED=false
# Run as non-root.
RUN useradd -m -u 10001 tracer && chown -R tracer:tracer /srv
USER tracer
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz').status==200 else 1)"
# Canonical app factory entrypoint.
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
