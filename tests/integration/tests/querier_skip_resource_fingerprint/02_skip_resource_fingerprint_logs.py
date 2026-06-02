"""
End-to-end coverage for the skip_resource_fingerprint optimization on logs.

The conftest boots SigNoz with threshold=2, so:
  - count < 2  -> resolver attaches the fingerprint CTE (same shape as legacy).
  - count >= 2 -> fallback: resource conditions evaluated on the main logs table.

Both branches must return the same correct rows.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    Aggregation,
    BuilderQuery,
    OrderBy,
    TelemetryFieldKey,
    get_rows,
    make_query_request,
)


def _log(
    *,
    timestamp: datetime,
    service_name: str,
    body: str,
    extra_resources: dict | None = None,
) -> Logs:
    resources = {"service.name": service_name}
    if extra_resources:
        resources.update(extra_resources)
    return Logs(
        timestamp=timestamp,
        resources=resources,
        attributes={},
        body=body,
        severity_text="INFO",
    )


def test_skip_resource_fingerprint_logs_use_cte_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    A filter matching a single resource fingerprint (count = 1 < 2) keeps the
    legacy CTE attached. The result must only include rows for that resource.
    """
    now = datetime.now(tz=UTC)

    insert_logs(
        [
            _log(timestamp=now - timedelta(seconds=10), service_name="skip-logs-cte-svc", body="log-1"),
            _log(timestamp=now - timedelta(seconds=8), service_name="skip-logs-cte-svc", body="log-2"),
            # Noise from a different resource — must not appear.
            _log(timestamp=now - timedelta(seconds=6), service_name="skip-logs-cte-noise", body="noise"),
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
            BuilderQuery(
                signal="logs",
                limit=50,
                order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
                filter_expression="service.name = 'skip-logs-cte-svc'",
                select_fields=[
                    TelemetryFieldKey("service.name", "string", "resource"),
                    TelemetryFieldKey("body"),
                ],
                aggregations=[Aggregation("count()")],
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK

    rows = get_rows(response)
    assert len(rows) == 2, f"expected 2 'skip-logs-cte-svc' rows, got {len(rows)}"

    bodies = [row["data"]["body"] for row in rows]
    assert bodies == ["log-1", "log-2"]

    services = {row["data"]["service.name"] for row in rows}
    assert services == {"skip-logs-cte-svc"}


def test_skip_resource_fingerprint_logs_fallback_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    A filter matching multiple resource fingerprints (count >= 2) drives the
    fallback path: no CTE, resource conditions evaluated on the main logs
    table. Result must still be correct (no over- or under-matching).
    """
    now = datetime.now(tz=UTC)

    fallback_env = {"deployment.environment": "skip-logs-fallback"}
    insert_logs(
        [
            _log(timestamp=now - timedelta(seconds=10), service_name="skip-logs-fb-svc-a", body="a", extra_resources=fallback_env),
            _log(timestamp=now - timedelta(seconds=9), service_name="skip-logs-fb-svc-b", body="b", extra_resources=fallback_env),
            _log(timestamp=now - timedelta(seconds=8), service_name="skip-logs-fb-svc-c", body="c", extra_resources=fallback_env),
            # Noise without the fallback env — must be filtered out.
            _log(
                timestamp=now - timedelta(seconds=7),
                service_name="skip-logs-fb-other",
                body="noise",
                extra_resources={"deployment.environment": "skip-logs-other"},
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
            BuilderQuery(
                signal="logs",
                limit=50,
                order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
                filter_expression="deployment.environment = 'skip-logs-fallback'",
                select_fields=[
                    TelemetryFieldKey("service.name", "string", "resource"),
                    TelemetryFieldKey("body"),
                ],
                aggregations=[Aggregation("count()")],
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK

    rows = get_rows(response)
    assert len(rows) == 3, f"expected 3 fallback rows, got {len(rows)}"

    services = sorted(row["data"]["service.name"] for row in rows)
    assert services == ["skip-logs-fb-svc-a", "skip-logs-fb-svc-b", "skip-logs-fb-svc-c"]

    bodies = sorted(row["data"]["body"] for row in rows)
    assert bodies == ["a", "b", "c"]
