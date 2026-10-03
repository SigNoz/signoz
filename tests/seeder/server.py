import os
from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager, contextmanager
from typing import Any

import clickhouse_connect
from fastapi import FastAPI, HTTPException, Response, status

from fixtures.logger import setup_logger
from fixtures.logs import Logs, insert_logs_to_clickhouse, truncate_logs_tables
from fixtures.metrics import (
    Metrics,
    insert_metrics_to_clickhouse,
    truncate_metrics_tables,
)
from fixtures.traces import (
    Traces,
    insert_traces_to_clickhouse,
    truncate_traces_tables,
)

logger = setup_logger(__name__)

CH_HOST = os.environ["CH_HOST"]
CH_PORT = int(os.environ.get("CH_PORT", "8123"))
CH_USER = os.environ["CH_USER"]
CH_PASSWORD = os.environ["CH_PASSWORD"]
CH_CLUSTER = os.environ["CH_CLUSTER"]

# Every seeded row carries this tag so parallel tests can share the seeded
# baseline; per-test mutations live in their own dashboards.
SEEDER_MARKER = {"seeder": "true"}


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Connect once at startup purely to fail fast on bad coordinates; request
    # handlers each open their own client (see `conn`).
    probe = _new_client()
    try:
        probe.command("SELECT 1")
    finally:
        probe.close()
    yield


def _new_client():
    return clickhouse_connect.get_client(
        host=CH_HOST, port=CH_PORT, username=CH_USER, password=CH_PASSWORD
    )


@contextmanager
def conn() -> Iterator[Any]:
    """
    A ClickHouse client scoped to one request.

    A `clickhouse_connect` client owns a session, and ClickHouse rejects
    concurrent queries within one session with "Attempt to execute concurrent
    queries within the same session." FastAPI runs these sync handlers in a
    threadpool, so a module-level client shared across requests fails as soon as
    two Playwright workers seed at the same time — which is the normal case, the
    suite runs 6 workers against one seeder. One client per request is what makes
    the "Parallel-safe" promise in the module docstring true.
    """
    client = _new_client()
    try:
        yield client
    finally:
        client.close()


app = FastAPI(title="seeder", version="dev", lifespan=lifespan)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


def _tag(item: dict[str, Any]) -> dict[str, Any]:
    resources = {**(item.get("resources") or {}), **SEEDER_MARKER}
    return {**item, "resources": resources}


def _tag_metrics(item: dict[str, Any]) -> dict[str, Any]:
    # Accept OTLP-style `resource_attributes` / `attributes` or legacy
    # `resource_attrs` / `labels` interchangeably.
    resource_attrs = {
        **(item.get("resource_attrs") or {}),
        **(item.get("resource_attributes") or {}),
        **SEEDER_MARKER,
    }
    labels = {**(item.get("labels") or {}), **(item.get("attributes") or {})}
    out = {**item, "resource_attrs": resource_attrs, "labels": labels}
    out.pop("resource_attributes", None)
    out.pop("attributes", None)
    return out


@app.post("/telemetry/traces", status_code=status.HTTP_201_CREATED)
def post_traces(payload: list[dict[str, Any]]) -> dict[str, Any]:
    try:
        traces = [Traces.from_dict(_tag(item)) for item in payload]
        with conn() as ch:
            insert_traces_to_clickhouse(ch, traces)
        logger.info("inserted %d traces", len(traces))
        return {"inserted": len(traces)}
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"missing required field: {e}") from e
    except Exception as e:
        logger.exception("insert failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


# The DELETE endpoints truncate the signal tables. Only test_teardown should
# call them — workers must finish first.
@app.delete("/telemetry/traces", status_code=status.HTTP_204_NO_CONTENT)
def delete_traces() -> Response:
    try:
        with conn() as ch:
            truncate_traces_tables(ch, CH_CLUSTER)
        logger.info("truncated traces tables")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.exception("truncate failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/telemetry/logs", status_code=status.HTTP_201_CREATED)
def post_logs(payload: list[dict[str, Any]]) -> dict[str, Any]:
    try:
        logs = [Logs.from_dict(_tag(item)) for item in payload]
        with conn() as ch:
            insert_logs_to_clickhouse(ch, logs)
        logger.info("inserted %d logs", len(logs))
        return {"inserted": len(logs)}
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"missing required field: {e}") from e
    except Exception as e:
        logger.exception("insert failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.delete("/telemetry/logs", status_code=status.HTTP_204_NO_CONTENT)
def delete_logs() -> Response:
    try:
        with conn() as ch:
            truncate_logs_tables(ch, CH_CLUSTER)
        logger.info("truncated logs tables")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.exception("truncate failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/telemetry/metrics", status_code=status.HTTP_201_CREATED)
def post_metrics(payload: list[dict[str, Any]]) -> dict[str, Any]:
    try:
        metrics = [Metrics.from_dict(_tag_metrics(item)) for item in payload]
        with conn() as ch:
            insert_metrics_to_clickhouse(ch, metrics)
        logger.info("inserted %d metrics", len(metrics))
        return {"inserted": len(metrics)}
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"missing required field: {e}") from e
    except Exception as e:
        logger.exception("insert failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.delete("/telemetry/metrics", status_code=status.HTTP_204_NO_CONTENT)
def delete_metrics() -> Response:
    try:
        with conn() as ch:
            truncate_metrics_tables(ch, CH_CLUSTER)
        logger.info("truncated metrics tables")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.exception("truncate failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/seed/golden", status_code=status.HTTP_200_OK)
def seed_golden() -> dict[str, int]:
    """Re-seed the golden dataset with timestamps rebased to `now`.
    Called by Playwright globalSetup before every test session so chart
    assertions land within default panel time windows."""
    from fixtures import seed_golden_dataset  # noqa: PLC0415 — local import keeps cold-start fast

    try:
        return seed_golden_dataset.seed("http://localhost:8080")
    except Exception as e:
        logger.exception("golden seed failed")
        raise HTTPException(500, str(e)) from e
