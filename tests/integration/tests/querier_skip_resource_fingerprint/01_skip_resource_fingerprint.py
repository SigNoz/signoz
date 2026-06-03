"""
Transparency check for the skip_resource_fingerprint optimization (traces and logs).

The optimization changes how a query's resource conditions are resolved depending on
how selective they are, but must change only ClickHouse performance, never the rows.
Each test runs the same query against the primary instance (optimization on,
threshold=2) and `signoz_fingerprint` (optimization off) and asserts the responses
are identical, covering all three resolver outcomes:

  - CTE: a filter matching fewer fingerprints than the threshold resolves through the
    fingerprint CTE.
  - Fallback: a filter matching at or above the threshold pushes resource conditions
    onto the main spans/logs table instead.
  - No-op: a filter with no resource conditions to pre-resolve (no resource field, or
    resource fields only under an OR) filters inline on the main table.
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


def test_skip_resource_fingerprint_traces_cte_matches_fingerprint(
    signoz: types.SigNoz,
    signoz_fingerprint: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """A < 2-fingerprint filter resolves through the fingerprint CTE; rows must match the baseline."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    # One service shares the env (1 fingerprint < threshold 2 -> CTE); two spans on it
    # exercise dedup. A second service in a different env must be excluded.
    env = {"deployment.environment": "skip-cte"}
    insert_traces(
        [
            Traces(timestamp=now - timedelta(seconds=10), resources={"service.name": "skip-cte-svc-a", **env}),
            Traces(timestamp=now - timedelta(seconds=9), resources={"service.name": "skip-cte-svc-a", **env}),
            Traces(timestamp=now - timedelta(seconds=8), resources={"service.name": "skip-cte-other", "deployment.environment": "skip-cte-other-env"}),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = BuilderQuery(
        signal="traces",
        limit=50,
        order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
        filter_expression="deployment.environment = 'skip-cte'",
        select_fields=[TelemetryFieldKey("service.name", "string", "resource")],
    ).to_dict()

    start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    optimized = make_query_request(signoz, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])
    fingerprint = make_query_request(signoz_fingerprint, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])

    assert len(get_rows(optimized)) == 2
    assert_identical_query_response(optimized, fingerprint)


def test_skip_resource_fingerprint_traces_or_filter_matches_fingerprint(
    signoz: types.SigNoz,
    signoz_fingerprint: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """A resource condition under an OR has no fixed fingerprint set, so it filters inline; rows must match the baseline."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    # `name = ... OR service.name = ...` can't reduce to a fingerprint set (no-op path).
    # span-1 matches on name, span-2 on service.name, span-3 matches neither.
    env = {"deployment.environment": "skip-or"}
    insert_traces(
        [
            Traces(timestamp=now - timedelta(seconds=10), name="tr-or-name", resources={"service.name": "tr-or-svc-x", **env}),
            Traces(timestamp=now - timedelta(seconds=9), name="tr-or-other", resources={"service.name": "tr-or-svc-a", **env}),
            Traces(timestamp=now - timedelta(seconds=8), name="tr-or-other", resources={"service.name": "tr-or-svc-b", **env}),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = BuilderQuery(
        signal="traces",
        limit=50,
        order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
        filter_expression="name = 'tr-or-name' OR service.name = 'tr-or-svc-a'",
        select_fields=[TelemetryFieldKey("service.name", "string", "resource")],
    ).to_dict()

    start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    optimized = make_query_request(signoz, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])
    fingerprint = make_query_request(signoz_fingerprint, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])

    assert len(get_rows(optimized)) == 2
    assert_identical_query_response(optimized, fingerprint)


def test_skip_resource_fingerprint_traces_no_resource_filter_matches_fingerprint(
    signoz: types.SigNoz,
    signoz_fingerprint: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """A filter with no resource field has nothing to pre-resolve, so it filters inline; rows must match the baseline."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    # Filtering only on the span name (an intrinsic, non-resource field) is a no-op for
    # the resolver; span-1 matches, span-2 does not.
    env = {"deployment.environment": "skip-nr"}
    insert_traces(
        [
            Traces(timestamp=now - timedelta(seconds=10), name="tr-nr-name", resources={"service.name": "tr-nr-svc-a", **env}),
            Traces(timestamp=now - timedelta(seconds=9), name="tr-nr-other", resources={"service.name": "tr-nr-svc-b", **env}),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = BuilderQuery(
        signal="traces",
        limit=50,
        order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
        filter_expression="name = 'tr-nr-name'",
        select_fields=[TelemetryFieldKey("service.name", "string", "resource")],
    ).to_dict()

    start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    optimized = make_query_request(signoz, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])
    fingerprint = make_query_request(signoz_fingerprint, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])

    assert len(get_rows(optimized)) == 1
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


def test_skip_resource_fingerprint_logs_cte_matches_fingerprint(
    signoz: types.SigNoz,
    signoz_fingerprint: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A < 2-fingerprint filter resolves through the fingerprint CTE; rows must match the baseline."""
    now = datetime.now(tz=UTC)

    # One service shares the env (1 fingerprint < threshold 2 -> CTE); two logs on it
    # exercise dedup. A second service in a different env must be excluded.
    env = {"deployment.environment": "skip-logs-cte"}
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=10), resources={"service.name": "skip-logs-cte-svc-a", **env}, body="a"),
            Logs(timestamp=now - timedelta(seconds=9), resources={"service.name": "skip-logs-cte-svc-a", **env}, body="b"),
            Logs(timestamp=now - timedelta(seconds=8), resources={"service.name": "skip-logs-cte-other", "deployment.environment": "skip-logs-cte-other-env"}, body="noise"),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = BuilderQuery(
        signal="logs",
        limit=50,
        order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
        filter_expression="deployment.environment = 'skip-logs-cte'",
        select_fields=[TelemetryFieldKey("service.name", "string", "resource"), TelemetryFieldKey("body")],
    ).to_dict()

    start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    optimized = make_query_request(signoz, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])
    fingerprint = make_query_request(signoz_fingerprint, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])

    assert len(get_rows(optimized)) == 2
    assert_identical_query_response(optimized, fingerprint)


def test_skip_resource_fingerprint_logs_or_filter_matches_fingerprint(
    signoz: types.SigNoz,
    signoz_fingerprint: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A resource condition under an OR has no fixed fingerprint set, so it filters inline; rows must match the baseline."""
    now = datetime.now(tz=UTC)

    # `test.marker = ... OR service.name = ...` can't reduce to a fingerprint set (no-op path).
    # log-1 matches on the attribute, log-2 on service.name, log-3 matches neither.
    env = {"deployment.environment": "skip-logs-or"}
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=10), resources={"service.name": "logs-or-svc-x", **env}, attributes={"test.marker": "logs-or-hit"}, body="a"),
            Logs(timestamp=now - timedelta(seconds=9), resources={"service.name": "logs-or-svc-a", **env}, body="b"),
            Logs(timestamp=now - timedelta(seconds=8), resources={"service.name": "logs-or-svc-b", **env}, body="noise"),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = BuilderQuery(
        signal="logs",
        limit=50,
        order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
        filter_expression="test.marker = 'logs-or-hit' OR service.name = 'logs-or-svc-a'",
        select_fields=[TelemetryFieldKey("service.name", "string", "resource"), TelemetryFieldKey("body")],
    ).to_dict()

    start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    optimized = make_query_request(signoz, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])
    fingerprint = make_query_request(signoz_fingerprint, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])

    assert len(get_rows(optimized)) == 2
    assert_identical_query_response(optimized, fingerprint)


def test_skip_resource_fingerprint_logs_no_resource_filter_matches_fingerprint(
    signoz: types.SigNoz,
    signoz_fingerprint: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A filter with no resource field has nothing to pre-resolve, so it filters inline; rows must match the baseline."""
    now = datetime.now(tz=UTC)

    # Filtering only on an attribute (a non-resource field) is a no-op for the resolver;
    # log-1 matches, log-2 does not.
    env = {"deployment.environment": "skip-logs-nr"}
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=10), resources={"service.name": "logs-nr-svc-a", **env}, attributes={"test.marker": "logs-nr-hit"}, body="a"),
            Logs(timestamp=now - timedelta(seconds=9), resources={"service.name": "logs-nr-svc-b", **env}, body="b"),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = BuilderQuery(
        signal="logs",
        limit=50,
        order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
        filter_expression="test.marker = 'logs-nr-hit'",
        select_fields=[TelemetryFieldKey("service.name", "string", "resource"), TelemetryFieldKey("body")],
    ).to_dict()

    start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    optimized = make_query_request(signoz, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])
    fingerprint = make_query_request(signoz_fingerprint, token, start_ms=start_ms, end_ms=end_ms, request_type="raw", queries=[query])

    assert len(get_rows(optimized)) == 1
    assert_identical_query_response(optimized, fingerprint)
