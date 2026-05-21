"""Golden dataset fixture — seeds OTel-demo-shaped metrics, traces, and
logs into ClickHouse via the seeder on every test_setup invocation.

Timestamps are rebased to `now` so panels with default time windows
always find data. To refresh the dataset shape on disk, run
`uv run python -m fixtures.seed_golden_dataset regenerate`.
"""

from __future__ import annotations

import datetime
import json
import logging
import os
import random
from collections.abc import Iterator
from pathlib import Path

import pytest
import requests

from fixtures import types

logger = logging.getLogger(__name__)

_GOLDEN_DIR = Path(__file__).resolve().parent.parent / "seeder" / "golden"
METRICS_PATH = _GOLDEN_DIR / "otel-demo-metrics-golden.jsonl"
TRACES_PATH = _GOLDEN_DIR / "otel-demo-traces-golden.jsonl"
LOGS_PATH = _GOLDEN_DIR / "otel-demo-logs-golden.jsonl"


# ─── Generator ───────────────────────────────────────────────────────────

_SERVICES = [
    "adservice",
    "cartservice",
    "checkoutservice",
    "currencyservice",
    "frontend",
    "paymentservice",
    "productcatalogservice",
    "shippingservice",
]
_OPERATIONS = {
    "adservice": ["/ads/get", "/ads/list"],
    "cartservice": ["/cart/add", "/cart/get", "/cart/empty"],
    "checkoutservice": ["/checkout"],
    "currencyservice": ["/currency/convert"],
    "frontend": ["/", "/product", "/checkout"],
    "paymentservice": ["/payment/charge"],
    "productcatalogservice": ["/products/list", "/products/get"],
    "shippingservice": ["/shipping/quote", "/shipping/ship"],
}
_DB_SERVICES = {"cartservice", "productcatalogservice"}
_ENV = "production"
_BUCKET_MINUTES = 5
_WINDOW_HOURS = 6


def _generate_metrics() -> list[dict]:
    rng = random.Random(20260511)
    samples: list[dict] = []
    n_buckets = (_WINDOW_HOURS * 60) // _BUCKET_MINUTES
    base_counter = 1000

    for service in _SERVICES:
        for operation in _OPERATIONS[service]:
            for status in ("STATUS_CODE_OK", "STATUS_CODE_ERROR"):
                weight = 9 if status == "STATUS_CODE_OK" else 1
                counter = base_counter
                latency_sum = 0
                for i in range(n_buckets):
                    minutes_ago = (_WINDOW_HOURS * 60) - (i + 1) * _BUCKET_MINUTES
                    bucket_calls = int(weight * (50 + 20 * (1 + i % 12 / 12.0) + rng.randint(0, 10)))
                    counter += bucket_calls
                    latency_sum += bucket_calls * rng.randint(100_000, 500_000)
                    resource_attrs = {
                        "service.name": service,
                        "deployment.environment": _ENV,
                        "k8s.namespace.name": f"signoz-{service}",
                    }
                    point_attrs = {
                        "operation": operation,
                        "status_code": status,
                        "span_kind": "SPAN_KIND_SERVER",
                    }
                    for name, value in (
                        ("signoz_calls_total", counter),
                        ("signoz_latency_count", counter),
                        ("signoz_latency_sum", latency_sum),
                    ):
                        samples.append(
                            {
                                "metric_name": name,
                                "minutes_ago": minutes_ago,
                                "value": value,
                                "resource_attributes": resource_attrs,
                                "attributes": point_attrs,
                                "is_monotonic": True,
                            }
                        )
        if service in _DB_SERVICES:
            db_counter = 0
            for i in range(n_buckets):
                minutes_ago = (_WINDOW_HOURS * 60) - (i + 1) * _BUCKET_MINUTES
                db_counter += 20 + rng.randint(0, 15)
                samples.append(
                    {
                        "metric_name": "signoz_db_latency_count",
                        "minutes_ago": minutes_ago,
                        "value": db_counter,
                        "resource_attributes": {
                            "service.name": service,
                            "deployment.environment": _ENV,
                            "k8s.namespace.name": f"signoz-{service}",
                        },
                        "attributes": {
                            "db.system": "postgresql" if service == "cartservice" else "mongodb",
                        },
                        "is_monotonic": True,
                    }
                )
    return samples


def _generate_traces() -> list[dict]:
    rng = random.Random(20260512)
    samples: list[dict] = []
    n_buckets = 12
    for service in _SERVICES:
        for operation in _OPERATIONS[service]:
            for i in range(n_buckets):
                minutes_ago = int((_WINDOW_HOURS * 60) - i * (_WINDOW_HOURS * 60 / n_buckets))
                http_status = "500" if rng.random() < 0.05 else "200"
                samples.append(
                    {
                        "name": f"{service} {operation}",
                        "kind": "SERVER",
                        "minutes_ago": minutes_ago,
                        "duration_ms": rng.randint(50, 500),
                        "status": "ERROR" if http_status == "500" else "OK",
                        "resource_attributes": {
                            "service.name": service,
                            "deployment.environment": _ENV,
                            "k8s.namespace.name": f"signoz-{service}",
                        },
                        "attributes": {
                            "http.method": "GET" if "get" in operation.lower() or operation == "/" else "POST",
                            "http.route": operation,
                            "http.status_code": http_status,
                        },
                    }
                )
    return samples


_LOG_SEVERITIES = [("INFO", 0.85), ("WARN", 0.10), ("ERROR", 0.05)]
_LOG_BODIES = {
    "INFO": ["Handled request", "Cache hit", "Connection established"],
    "WARN": ["Slow response detected", "Cache miss", "Retrying upstream call"],
    "ERROR": ["Upstream call failed", "Database query timed out", "Auth failed"],
}


def _generate_logs() -> list[dict]:
    rng = random.Random(20260512)
    samples: list[dict] = []
    n_buckets = 24
    for service in _SERVICES:
        for i in range(n_buckets):
            minutes_ago = int((_WINDOW_HOURS * 60) - i * (_WINDOW_HOURS * 60 / n_buckets))
            r = rng.random()
            cumulative = 0.0
            severity = "INFO"
            for name, weight in _LOG_SEVERITIES:
                cumulative += weight
                if r < cumulative:
                    severity = name
                    break
            samples.append(
                {
                    "body": f"[{service}] {rng.choice(_LOG_BODIES[severity])}",
                    "severity": severity,
                    "minutes_ago": minutes_ago,
                    "resource_attributes": {
                        "service.name": service,
                        "deployment.environment": _ENV,
                        "k8s.namespace.name": f"signoz-{service}",
                    },
                    "attributes": {"logger.name": f"{service}.app"},
                }
            )
    return samples


def _write_jsonl(path: Path, samples: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for s in samples:
            f.write(json.dumps(s, separators=(",", ":")))
            f.write("\n")


def regenerate() -> dict[str, int]:
    metrics = _generate_metrics()
    traces = _generate_traces()
    logs = _generate_logs()
    _write_jsonl(METRICS_PATH, metrics)
    _write_jsonl(TRACES_PATH, traces)
    _write_jsonl(LOGS_PATH, logs)
    return {"metrics": len(metrics), "traces": len(traces), "logs": len(logs)}


# ─── Loader ──────────────────────────────────────────────────────────────


_KIND_TO_INT = {
    "UNSPECIFIED": 0,
    "INTERNAL": 1,
    "SERVER": 2,
    "CLIENT": 3,
    "PRODUCER": 4,
    "CONSUMER": 5,
}
_STATUS_TO_INT = {"UNSET": 0, "OK": 1, "ERROR": 2}


def _read_jsonl(path: Path) -> Iterator[dict]:
    with path.open() as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def _iso_minus_minutes(now: datetime.datetime, minutes: float) -> str:
    ts = now - datetime.timedelta(minutes=minutes)
    return ts.replace(tzinfo=datetime.UTC).isoformat().replace("+00:00", "Z")


def _rebased_metric(sample: dict, now: datetime.datetime) -> dict:
    out = {k: v for k, v in sample.items() if k != "minutes_ago"}
    out["timestamp"] = _iso_minus_minutes(now, sample["minutes_ago"])
    return out


def _rebased_trace(sample: dict, now: datetime.datetime) -> dict:
    return {
        "timestamp": _iso_minus_minutes(now, sample["minutes_ago"]),
        "duration": f"PT{sample['duration_ms'] / 1000:.3f}S",
        "trace_id": sample.get("trace_id") or os.urandom(16).hex(),
        "span_id": sample.get("span_id") or os.urandom(8).hex(),
        "name": sample["name"],
        "kind": _KIND_TO_INT.get(str(sample.get("kind", "SERVER")).upper(), 2),
        "status_code": _STATUS_TO_INT.get(str(sample.get("status", "UNSET")).upper(), 0),
        "resources": sample.get("resource_attributes", {}),
        "attributes": sample.get("attributes", {}),
    }


def _rebased_log(sample: dict, now: datetime.datetime) -> dict:
    return {
        "timestamp": _iso_minus_minutes(now, sample["minutes_ago"]),
        "body": sample["body"],
        "severity_text": str(sample.get("severity", "INFO")).upper(),
        "resources": sample.get("resource_attributes", {}),
        "attributes": sample.get("attributes", {}),
    }


def _post_batches(url: str, rows: Iterator[dict], batch_size: int, timeout: int) -> int:
    batch: list[dict] = []
    total = 0
    for row in rows:
        batch.append(row)
        if len(batch) >= batch_size:
            response = requests.post(url, json=batch, timeout=timeout)
            response.raise_for_status()
            total += len(batch)
            batch = []
    if batch:
        response = requests.post(url, json=batch, timeout=timeout)
        response.raise_for_status()
        total += len(batch)
    return total


def seed(
    seeder_base_url: str,
    *,
    batch_size: int = 500,
    timeout: int = 60,
    clear_first: bool = True,
) -> dict[str, int]:
    """Wipe each signal table (via DELETE /telemetry/<signal>) and replay
    the golden dataset with timestamps rebased to `now`. Each call leaves
    the stack in the exact state the JSONL files describe — chart-data
    assertions are reproducible across sessions regardless of how many
    earlier sessions seeded."""
    for path in (METRICS_PATH, TRACES_PATH, LOGS_PATH):
        if not path.exists():
            raise FileNotFoundError(f"golden dataset missing at {path} — run `uv run python -m fixtures.seed_golden_dataset regenerate`")

    now = datetime.datetime.now(datetime.UTC).replace(microsecond=0, tzinfo=None)
    base = seeder_base_url.rstrip("/")
    if clear_first:
        for signal in ("metrics", "traces", "logs"):
            requests.delete(f"{base}/telemetry/{signal}", timeout=timeout).raise_for_status()
    counts = {
        "metrics": _post_batches(
            base + "/telemetry/metrics",
            (_rebased_metric(s, now) for s in _read_jsonl(METRICS_PATH)),
            batch_size,
            timeout,
        ),
        "traces": _post_batches(
            base + "/telemetry/traces",
            (_rebased_trace(s, now) for s in _read_jsonl(TRACES_PATH)),
            batch_size,
            timeout,
        ),
        "logs": _post_batches(
            base + "/telemetry/logs",
            (_rebased_log(s, now) for s in _read_jsonl(LOGS_PATH)),
            batch_size,
            timeout,
        ),
    }
    logger.info("seeded through %s: %s", base, counts)
    return counts


# ─── Fixture ─────────────────────────────────────────────────────────────


@pytest.fixture(name="golden_dataset", scope="package")
def golden_dataset(seeder: types.TestContainerDocker) -> dict[str, int]:
    """Seed metrics + traces + logs into the running stack via the
    seeder. Runs unconditionally on every test_setup invocation so the
    rebased timestamps always anchor against `now`."""
    return seed(seeder.host_configs["8080"].base())


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)
    if len(sys.argv) < 2:
        sys.stderr.write("usage: seed_golden_dataset.py seed <seeder-base-url> | regenerate\n")
        sys.exit(2)
    cmd = sys.argv[1]
    if cmd == "regenerate":
        print(f"wrote {regenerate()}")
    elif cmd == "seed":
        if len(sys.argv) != 3:
            sys.stderr.write("usage: seed_golden_dataset.py seed <seeder-base-url>\n")
            sys.exit(2)
        print(f"seeded {seed(sys.argv[2])}")
    else:
        sys.stderr.write(f"unknown command: {cmd}\n")
        sys.exit(2)
