"""
End-to-end coverage for the skip_resource_fingerprint querier optimization.

The conftest in this package boots SigNoz with:
  - skip_resource_fingerprint.enabled = true
  - skip_resource_fingerprint.threshold = 2

With that configuration the two non-trivial resolver branches are reachable
from a single SigNoz instance:

  - count < 2  -> the resolver attaches the fingerprint CTE (same shape as the
    legacy path; cheap because the fingerprint set is small).
  - count >= 2 -> fallback path: no fingerprint subquery, resource conditions
    are evaluated directly on the main spans table.

These tests assert end-to-end correctness — the optimization must be
semantically transparent.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import make_query_request
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


def _span(
    *,
    timestamp: datetime,
    service_name: str,
    name: str = "span",
    duration_seconds: float = 1.0,
    extra_resources: dict | None = None,
    attributes: dict | None = None,
) -> Traces:
    resources = {"service.name": service_name}
    if extra_resources:
        resources.update(extra_resources)
    return Traces(
        timestamp=timestamp,
        duration=timedelta(seconds=duration_seconds),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        parent_span_id="",
        name=name,
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        status_message="",
        resources=resources,
        attributes=attributes or {},
    )


def test_skip_resource_fingerprint_use_cte_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    A filter that matches a single unique resource fingerprint (count = 1 < 2)
    keeps the legacy CTE attached. The query should still return only the rows
    belonging to that resource.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    insert_traces(
        [
            _span(timestamp=now - timedelta(seconds=10), service_name="skip-cte-svc", name="span-1"),
            _span(timestamp=now - timedelta(seconds=8), service_name="skip-cte-svc", name="span-2"),
            # Noise from a different resource — must be filtered out.
            _span(timestamp=now - timedelta(seconds=6), service_name="skip-cte-noise", name="span-noise"),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="raw",
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "limit": 50,
                    "order": [{"key": {"name": "timestamp"}, "direction": "asc"}],
                    "filter": {"expression": "service.name = 'skip-cte-svc'"},
                    "selectFields": [
                        {
                            "name": "service.name",
                            "fieldDataType": "string",
                            "fieldContext": "resource",
                        },
                        {"name": "name", "fieldContext": "span"},
                    ],
                    "aggregations": [{"expression": "count()"}],
                },
            }
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 2, f"expected only the 2 'skip-cte-svc' spans, got {len(rows)}"

    names = [row["data"]["name"] for row in rows]
    assert names == ["span-1", "span-2"]

    services = {row["data"]["service.name"] for row in rows}
    assert services == {"skip-cte-svc"}


def test_skip_resource_fingerprint_fallback_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    A filter that matches multiple unique resource fingerprints (count >= 2)
    drives the resolver down the fallback path: no fingerprint subquery, and
    the resource condition is evaluated directly on the main spans table.
    The result must still be correct (no over- or under-matching).
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    # 3 services share the same deployment.environment, so the resource filter
    # selects 3 fingerprints, exceeding our threshold of 2.
    fallback_env = {"deployment.environment": "skip-fallback"}
    insert_traces(
        [
            _span(timestamp=now - timedelta(seconds=10), service_name="skip-fb-svc-a", extra_resources=fallback_env),
            _span(timestamp=now - timedelta(seconds=9), service_name="skip-fb-svc-b", extra_resources=fallback_env),
            _span(timestamp=now - timedelta(seconds=8), service_name="skip-fb-svc-c", extra_resources=fallback_env),
            # Noise without the fallback env — must be filtered out.
            _span(
                timestamp=now - timedelta(seconds=7),
                service_name="skip-fb-other",
                extra_resources={"deployment.environment": "skip-other"},
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="raw",
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "limit": 50,
                    "order": [{"key": {"name": "timestamp"}, "direction": "asc"}],
                    "filter": {"expression": "deployment.environment = 'skip-fallback'"},
                    "selectFields": [
                        {
                            "name": "service.name",
                            "fieldDataType": "string",
                            "fieldContext": "resource",
                        },
                    ],
                    "aggregations": [{"expression": "count()"}],
                },
            }
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 3, f"expected 3 spans tagged with skip-fallback, got {len(rows)}"

    services = sorted(row["data"]["service.name"] for row in rows)
    assert services == ["skip-fb-svc-a", "skip-fb-svc-b", "skip-fb-svc-c"]
