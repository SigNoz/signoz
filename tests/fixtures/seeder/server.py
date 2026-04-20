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
from fastapi import FastAPI, HTTPException

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


@app.post("/telemetry/traces")
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


@app.delete("/telemetry/traces")
def delete_traces() -> Dict[str, bool]:
    try:
        truncate_traces_tables(get_conn(), CH_CLUSTER)
        logger.info("truncated traces tables")
        return {"truncated": True}
    except Exception as e:
        logger.exception("truncate failed")
        raise HTTPException(status_code=500, detail=str(e)) from e
