import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Dict, List

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.dashboards import upsert_dashboard
from fixtures.logger import setup_logger
from fixtures.logs import Logs
from fixtures.metrics import Metrics
from fixtures.traces import (
    TraceIdGenerator,
    Traces,
    TracesKind,
    TracesStatusCode,
)

logger = setup_logger(__name__)

TESTDATA_ROOT = Path(__file__).resolve().parent / "testdata"


def _load_json_dir(path: Path) -> List[Dict]:
    if not path.exists():
        return []
    return [json.loads(f.read_text()) for f in sorted(path.glob("*.json"))]


@pytest.fixture(name="seed_dashboards", scope="function")
def seed_dashboards(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> List[str]:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    ids: List[str] = []
    for payload in _load_json_dir(TESTDATA_ROOT / "dashboards"):
        dashboard_id = upsert_dashboard(signoz, token, payload)
        logger.info("seeded dashboard: %s", {"title": payload.get("title"), "id": dashboard_id})
        ids.append(dashboard_id)
    return ids


@pytest.fixture(name="seed_alert_rules", scope="function")
def seed_alert_rules(
    create_alert_rule: Callable[[Dict], str],
) -> List[str]:
    ids: List[str] = []
    for payload in _load_json_dir(TESTDATA_ROOT / "alerts"):
        ids.append(create_alert_rule(payload))
    return ids


@pytest.fixture(name="seed_e2e_telemetry", scope="function")
def seed_e2e_telemetry(
    insert_traces: Callable[[List[Traces]], None],
    insert_logs: Callable[[List[Logs]], None],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Emit a small, fresh slice of telemetry across a few synthetic services so the
    Services table has rows and /home ingestion banners pass their freshness check.

    Re-run each pytest invocation (function scope) — the signoz container is reused
    under --reuse but telemetry freshness is re-established every time.
    """
    now = datetime.now(tz=timezone.utc).replace(microsecond=0)

    services = ["checkout-service", "orders-service", "payment-service"]
    traces_out: List[Traces] = []
    logs_out: List[Logs] = []

    for service in services:
        trace_id = TraceIdGenerator.trace_id()
        parent_span_id = TraceIdGenerator.span_id()
        child_span_id = TraceIdGenerator.span_id()

        traces_out.extend(
            [
                Traces(
                    timestamp=now - timedelta(seconds=30),
                    duration=timedelta(milliseconds=120),
                    trace_id=trace_id,
                    span_id=parent_span_id,
                    parent_span_id="",
                    name=f"GET /{service}/healthz",
                    kind=TracesKind.SPAN_KIND_SERVER,
                    status_code=TracesStatusCode.STATUS_CODE_OK,
                    status_message="",
                    resources={
                        "service.name": service,
                        "deployment.environment": "e2e",
                        "host.name": f"{service}-host-01",
                    },
                    attributes={
                        "http.request.method": "GET",
                        "http.response.status_code": "200",
                        "http.route": "/healthz",
                    },
                ),
                Traces(
                    timestamp=now - timedelta(seconds=29),
                    duration=timedelta(milliseconds=45),
                    trace_id=trace_id,
                    span_id=child_span_id,
                    parent_span_id=parent_span_id,
                    name=f"SELECT {service}_db.status",
                    kind=TracesKind.SPAN_KIND_CLIENT,
                    status_code=TracesStatusCode.STATUS_CODE_OK,
                    status_message="",
                    resources={
                        "service.name": service,
                        "deployment.environment": "e2e",
                        "host.name": f"{service}-host-01",
                    },
                    attributes={
                        "db.system": "postgresql",
                        "db.statement": f"SELECT 1 FROM {service}_db.status",
                    },
                ),
            ]
        )

        logs_out.append(
            Logs(
                timestamp=now - timedelta(seconds=15),
                body=f"{service} ready",
                severity_text="INFO",
                resources={
                    "service.name": service,
                    "deployment.environment": "e2e",
                    "host.name": f"{service}-host-01",
                },
                attributes={"ready": "true"},
            )
        )

    insert_traces(traces_out)
    insert_logs(logs_out)
    # Metrics bypassed for now — insert_metrics needs metric specs beyond a simple smoke payload.
    # Traces + logs alone light up Services and Logs-ingestion-active banners.
    _ = insert_metrics  # keep dependency declared so the fixture graph wires up correctly
