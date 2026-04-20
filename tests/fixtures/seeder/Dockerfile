# HTTP seeder for Playwright e2e tests. Wraps the direct-ClickHouse-insert
# helpers in tests/fixtures/{traces,logs,metrics}.py so a browser test can
# seed telemetry with fine-grained control.
#
# Build context is tests/ (one level above this file) so `fixtures/` is
# importable inside the image.

FROM python:3.13-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY fixtures/seeder/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Ship the whole fixtures/ package so server.py can `from fixtures.traces
# import ...` with the same module path the pytest side uses.
COPY fixtures /app/fixtures

EXPOSE 8080

CMD ["uvicorn", "fixtures.seeder.server:app", "--host", "0.0.0.0", "--port", "8080"]
