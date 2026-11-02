FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/aptitude-test
COPY backend/server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

COPY backend/ .
RUN useradd --system --create-home appuser \
    && mkdir -p /var/lib/aptitude-test \
    && chown appuser /var/lib/aptitude-test
USER appuser

ENV VOC_DB=/var/lib/aptitude-test/aptitude-test.db \
    VOC_NODE=/usr/bin/node

WORKDIR /opt/aptitude-test/server
EXPOSE 8100
CMD ["gunicorn", "--workers", "2", "--bind", "0.0.0.0:8100", "--access-logfile", "-", "app:app"]
