"""
HTTP seeder wrapping the direct-ClickHouse-insert helpers in
fixtures/traces.py. Each POST endpoint accepts the same JSON shape as the
corresponding pytest fixture input and tags every inserted row with
resource `seeder=true`. DELETE truncates the underlying tables.

Env:
  CH_HOST, CH_PORT, CH_USER, CH_PASSWORD    — ClickHouse connection
  CH_CLUSTER                                — cluster name for TRUNCATE ... ON CLUSTER
"""

import logging
import os
from typing import Any, Dict, List

import clickhouse_connect
from fastapi import FastAPI, HTTPException, Response, status

from fixtures.logs import (
    Logs,
    insert_logs_to_clickhouse,
    truncate_logs_tables,
)
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seeder")

CH_HOST = os.environ["CH_HOST"]
CH_PORT = int(os.environ.get("CH_PORT", "8123"))
CH_USER = os.environ["CH_USER"]
CH_PASSWORD = os.environ["CH_PASSWORD"]
CH_CLUSTER = os.environ["CH_CLUSTER"]

SEEDER_MARKER = {"seeder": "true"}

_conn = None


def get_conn():
    global _conn  # pylint: disable=global-statement
    if _conn is None:
        _conn = clickhouse_connect.get_client(
            host=CH_HOST,
            port=CH_PORT,
            username=CH_USER,
            password=CH_PASSWORD,
        )
    return _conn


app = FastAPI(title="signoz-tests seeder", version="0.1.0")


@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok"}


def _tag(item: Dict[str, Any]) -> Dict[str, Any]:
    resources = {**(item.get("resources") or {}), **SEEDER_MARKER}
    return {**item, "resources": resources}


@app.post("/telemetry/traces", status_code=status.HTTP_201_CREATED)
def post_traces(payload: List[Dict[str, Any]]) -> Dict[str, Any]:
    try:
        traces = [Traces.from_dict(_tag(item)) for item in payload]
        insert_traces_to_clickhouse(get_conn(), traces)
        logger.info("inserted %d traces", len(traces))
        return {"inserted": len(traces)}
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"missing required field: {e}") from e
    except Exception as e:
        logger.exception("insert failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.delete("/telemetry/traces", status_code=status.HTTP_204_NO_CONTENT)
def delete_traces() -> Response:
    try:
        truncate_traces_tables(get_conn(), CH_CLUSTER)
        logger.info("truncated traces tables")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.exception("truncate failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/telemetry/logs", status_code=status.HTTP_201_CREATED)
def post_logs(payload: List[Dict[str, Any]]) -> Dict[str, Any]:
    try:
        logs = [Logs.from_dict(_tag(item)) for item in payload]
        insert_logs_to_clickhouse(get_conn(), logs)
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
        truncate_logs_tables(get_conn(), CH_CLUSTER)
        logger.info("truncated logs tables")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.exception("truncate failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/telemetry/metrics", status_code=status.HTTP_201_CREATED)
def post_metrics(payload: List[Dict[str, Any]]) -> Dict[str, Any]:
    try:
        # Metrics data has label dicts at the top level (no `resources` key
        # like traces/logs); tagging is on the resource_attrs inside the
        # labels wrapper that Metrics.from_dict unpacks.
        metrics = [Metrics.from_dict(_tag_metrics(item)) for item in payload]
        insert_metrics_to_clickhouse(get_conn(), metrics)
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
        truncate_metrics_tables(get_conn(), CH_CLUSTER)
        logger.info("truncated metrics tables")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.exception("truncate failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


def _tag_metrics(item: Dict[str, Any]) -> Dict[str, Any]:
    resource_attrs = {**(item.get("resource_attrs") or {}), **SEEDER_MARKER}
    return {**item, "resource_attrs": resource_attrs}
