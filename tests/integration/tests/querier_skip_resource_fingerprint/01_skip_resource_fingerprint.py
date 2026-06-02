"""
Transparency check for the skip_resource_fingerprint optimization (traces and logs).

At or above the configured fingerprint threshold the optimization pushes resource
conditions onto the main spans/logs table instead of the fingerprint CTE. That
rewrite must change ClickHouse performance, never the rows: each test runs the same
query against the primary instance (optimization on, threshold=2) and
`signoz_fingerprint` (optimization off) and asserts the responses are identical.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    BuilderQuery,
    OrderBy,
    TelemetryFieldKey,
    assert_identical_query_response,
    get_rows,
    make_query_request,
)
from fixtures.traces import Traces


def test_skip_resource_fingerprint_traces_fallback_matches_fingerprint(
    signoz: types.SigNoz,
    signoz_fingerprint: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """A >= 2-fingerprint filter drives the fallback path; rows must match the fingerprint baseline."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    # 3 distinct services share one env (3 fingerprints > threshold 2 -> fallback);
    # the 4th has a different env and must be excluded.
    env = {"deployment.environment": "skip-fallback"}
    insert_traces(
        [
            Traces(timestamp=now - timedelta(seconds=10), resources={"service.name": "skip-fb-svc-a", **env}),
            Traces(timestamp=now - timedelta(seconds=9), resources={"service.name": "skip-fb-svc-b", **env}),
            Traces(timestamp=now - timedelta(seconds=8), resources={"service.name": "skip-fb-svc-c", **env}),
            Traces(timestamp=now - timedelta(seconds=7), resources={"service.name": "skip-fb-other", "deployment.environment": "skip-other"}),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = BuilderQuery(
        signal="traces",
        limit=50,
        order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
        filter_expression="deployment.environment = 'skip-fallback'",
        select_fields=[TelemetryFieldKey("service.name", "string", "resource")],
    ).to_dict()

    start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    optimized = make_query_request(signoz, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])
    fingerprint = make_query_request(signoz_fingerprint, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])

    assert len(get_rows(optimized)) == 3
    assert_identical_query_response(optimized, fingerprint)


def test_skip_resource_fingerprint_logs_fallback_matches_fingerprint(
    signoz: types.SigNoz,
    signoz_fingerprint: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A >= 2-fingerprint filter drives the fallback path; rows must match the fingerprint baseline."""
    now = datetime.now(tz=UTC)

    # 3 distinct services share one env (3 fingerprints > threshold 2 -> fallback);
    # the 4th has a different env and must be excluded.
    env = {"deployment.environment": "skip-logs-fallback"}
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=10), resources={"service.name": "skip-logs-fb-svc-a", **env}, body="a"),
            Logs(timestamp=now - timedelta(seconds=9), resources={"service.name": "skip-logs-fb-svc-b", **env}, body="b"),
            Logs(timestamp=now - timedelta(seconds=8), resources={"service.name": "skip-logs-fb-svc-c", **env}, body="c"),
            Logs(timestamp=now - timedelta(seconds=7), resources={"service.name": "skip-logs-fb-other", "deployment.environment": "skip-logs-other"}, body="noise"),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = BuilderQuery(
        signal="logs",
        limit=50,
        order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
        filter_expression="deployment.environment = 'skip-logs-fallback'",
        select_fields=[TelemetryFieldKey("service.name", "string", "resource"), TelemetryFieldKey("body")],
    ).to_dict()

    start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    optimized = make_query_request(signoz, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])
    fingerprint = make_query_request(signoz_fingerprint, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])

    assert len(get_rows(optimized)) == 3
    assert_identical_query_response(optimized, fingerprint)
