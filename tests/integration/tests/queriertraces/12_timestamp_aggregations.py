from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import RequestType, make_query_request
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

# Suites share one stack, so every query scopes to this service to keep other tests'
# spans out of the aggregate.
SERVICE = "timestamp-agg-svc"


def seed_two_spans(insert_traces: Callable[[list[Traces]], None], oldest: datetime, newest: datetime) -> None:
    insert_traces(
        [
            Traces(
                timestamp=ts,
                duration=timedelta(milliseconds=10),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="op",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": SERVICE},
                attributes={},
            )
            for ts in (oldest, newest)
        ]
    )


def query_timestamp_aggregation(signoz: types.SigNoz, token: str, expression: str, now: datetime):
    return make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=10)).timestamp() * 1000),
        end_ms=int((now + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "stepInterval": "60s",
                    "filter": {"expression": f"service.name = '{SERVICE}'"},
                    "aggregations": [{"expression": expression}],
                },
            }
        ],
    )


# `timestamp` is DateTime64(9), so a numeric coercion rescales it to seconds — the
# #5824 regression. Order-based aggregations answer with an instant; sum/avg have
# no time meaning.
@pytest.mark.parametrize("expression,bound", [("max(timestamp)", "newest"), ("min(timestamp)", "oldest")])
def test_timestamp_order_aggregations_return_the_instant(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    expression: str,
    bound: str,
) -> None:
    """
    Setup:
    Two spans for one service, 3 and 1 minutes ago.

    Tests:
    max/min answer with the extreme span's instant. Coerced to Float64 the value would be
    ~1.7e9 seconds, which reads as January 1970 when a consumer treats it as milliseconds.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    oldest, newest = now - timedelta(minutes=3), now - timedelta(minutes=1)
    seed_two_spans(insert_traces, oldest, newest)

    response = query_timestamp_aggregation(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), expression, now)

    assert response.status_code == HTTPStatus.OK, response.text
    raw = response.json()["data"]["data"]["results"][0]["data"][0][0]
    # a native DateTime64 serializes as an RFC 3339 instant
    assert isinstance(raw, str), f"{expression} returned {raw!r}, expected an instant"
    actual = datetime.fromisoformat(raw.replace("Z", "+00:00"))

    expected = newest if bound == "newest" else oldest
    assert abs((actual - expected).total_seconds()) < 1, f"{expression} returned {raw!r} ({actual.isoformat()}), expected {expected.isoformat()}"


def test_timestamp_quantile_returns_an_instant_within_range(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Tests:
    ClickHouse computes quantiles over DateTime64 natively, so p99 lands inside the
    seeded range rather than erroring or collapsing to epoch.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    oldest, newest = now - timedelta(minutes=3), now - timedelta(minutes=1)
    seed_two_spans(insert_traces, oldest, newest)

    response = query_timestamp_aggregation(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), "p99(timestamp)", now)

    assert response.status_code == HTTPStatus.OK, response.text
    raw = response.json()["data"]["data"]["results"][0]["data"][0][0]
    assert isinstance(raw, str), f"p99(timestamp) returned {raw!r}, expected an instant"
    actual = datetime.fromisoformat(raw.replace("Z", "+00:00"))

    assert oldest - timedelta(seconds=1) <= actual <= newest + timedelta(seconds=1), f"p99(timestamp) returned {actual.isoformat()}, outside [{oldest.isoformat()}, {newest.isoformat()}]"


@pytest.mark.parametrize("expression,expected", [("count(timestamp)", 2), ("rate(timestamp)", None)])
def test_timestamp_counting_aggregations_are_numeric(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    expression: str,
    expected: int | None,
) -> None:
    """
    Tests:
    count and rate count rows rather than reading the column's value, so they stay
    numeric for a time column.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    seed_two_spans(insert_traces, now - timedelta(minutes=3), now - timedelta(minutes=1))

    response = query_timestamp_aggregation(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), expression, now)

    assert response.status_code == HTTPStatus.OK, response.text
    raw = response.json()["data"]["data"]["results"][0]["data"][0][0]
    assert isinstance(raw, (int, float)) and not isinstance(raw, bool), f"{expression} returned {raw!r}, expected a number"
    if expected is not None:
        assert raw == expected, f"{expression} returned {raw!r}, expected {expected}"
    else:
        assert raw > 0, f"{expression} returned {raw!r}, expected a positive rate"


# KNOWN GAP, pinned deliberately: ClickHouse rejects sum/avg over DateTime64, and rate_*
# additionally divides a time by an interval; both surface as the generic 500. They returned
# a meaningless seconds number before #5824. Flip to BAD_REQUEST once validated up front.
@pytest.mark.parametrize(
    "expression",
    [
        "sum(timestamp)",
        "avg(timestamp)",
        "rate_sum(timestamp)",
        "rate_avg(timestamp)",
        "rate_min(timestamp)",
        "rate_max(timestamp)",
    ],
)
def test_timestamp_arithmetic_aggregations_are_unsupported(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    expression: str,
) -> None:
    """
    Tests:
    Aggregations that cannot produce a time from a time column fail rather than
    answering with a rescaled number.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    seed_two_spans(insert_traces, now - timedelta(minutes=3), now - timedelta(minutes=1))

    response = query_timestamp_aggregation(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), expression, now)

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, f"{expression} returned {response.status_code}: {response.text[:200]}"
