"""
config.py - Shared configuration for the ANO (Autonomous Neural Optimizer) system.
All constants in one place. Karpathy rule: no magic numbers scattered in code.
"""
import os

# ─── OpenTelemetry ──────────────────────────────────────────────────────────
OTEL_ENDPOINT = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:4317")
WORKER_SERVICE_NAME = "hackathon-ai-worker"
OVERMIND_SERVICE_NAME = "hackathon-ai-overmind"

# ─── ClickHouse (for Overmind to query traces) ──────────────────────────────
CLICKHOUSE_HOST = os.environ.get("CLICKHOUSE_HOST", "127.0.0.1")
CLICKHOUSE_PORT = int(os.environ.get("CLICKHOUSE_PORT", "8123"))

# ─── LLM ────────────────────────────────────────────────────────────────────
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-3.5-turbo")

# ─── Overmind ────────────────────────────────────────────────────────────────
OVERMIND_POLL_INTERVAL = int(os.environ.get("OVERMIND_POLL_INTERVAL", "10"))
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", "3"))
FAILURE_LOOKBACK_MINUTES = 5
