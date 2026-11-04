from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import numpy as np
import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_aggregation,
    build_group_by_field,
    build_order_by,
    build_scalar_query,
    get_scalar_table_data,
    make_scalar_query_request,
)

# Numeric aggregation-function coverage for logs — the logs counterpart of
# queriertraces/02_aggregation.py::test_traces_aggregate_functions. Logs querier
# tests elsewhere only ever use count()/count_distinct(); here a grouped scalar
# query computes sum / avg / min / max / p50 / p90 / p95 / p99 / countIf / rate /
# rate_sum / count_distinct over a numeric log attribute and asserts every value.
#
# Log number attributes are stored as Float64, so aggregates come back as floats;
# percentiles are matched with pytest.approx (ClickHouse quantile() and
# numpy.percentile both linear-interpolate, but avoid ULP-level exact equality).
#
# The rate family divides by a window the caller does not otherwise see, so the
# lookback is passed explicitly instead of taken from the request helper default.


def test_logs_aggregate_functions(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    svc-a: 3 logs (latency_ms 10/20/30, endpoints /x /x /y); svc-b: 1 log
    (latency_ms 40, endpoint /z).

    Tests:
    A grouped scalar query computes count / sum / avg / min / max / p50 / p90 /
    p95 / p99 over latency_ms, countIf over a numeric threshold, rate and
    rate_sum over the query window, and count_distinct over a string attribute —
    all matching values derived from the inserted logs, ordered by count() desc.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # A scalar rate divides by the whole query window, so both sides agree on it.
    lookback_minutes = 5
    rate_interval_seconds = lookback_minutes * 60
    # (service, latency_ms, endpoint)
    specs = [
        ("svc-a", 10, "/x"),
        ("svc-a", 20, "/x"),
        ("svc-a", 30, "/y"),
        ("svc-b", 40, "/z"),
    ]
    logs = [
        Logs(
            timestamp=now - timedelta(seconds=i + 1),
            resources={"service.name": service},
            attributes={"latency_ms": latency, "endpoint": endpoint},
            body=f"{service} log {i}",
        )
        for i, (service, latency, endpoint) in enumerate(specs)
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[
            build_aggregation("count()", "cnt"),
            build_aggregation("sum(latency_ms)", "sum_l"),
            build_aggregation("avg(latency_ms)", "avg_l"),
            build_aggregation("min(latency_ms)", "min_l"),
            build_aggregation("max(latency_ms)", "max_l"),
            build_aggregation("p50(latency_ms)", "p50_l"),
            build_aggregation("p90(latency_ms)", "p90_l"),
            build_aggregation("p95(latency_ms)", "p95_l"),
            build_aggregation("p99(latency_ms)", "p99_l"),
            build_aggregation("countIf(latency_ms >= 25)", "slow"),
            build_aggregation("rate()", "rate_all"),
            build_aggregation("rate_sum(latency_ms)", "rate_sum_l"),
            build_aggregation("count_distinct(endpoint)", "endpoints"),
        ],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", "desc")],
    )
    response = make_scalar_query_request(signoz, token, now, [query], lookback_minutes=lookback_minutes)

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())

    # Ordered by count() desc: svc-a (3) then svc-b (1).
    assert [row[0] for row in data] == ["svc-a", "svc-b"]
    by_service = {row[0]: row[1:] for row in data}

    for service, latencies, endpoints in [
        ("svc-a", [10, 20, 30], ["/x", "/x", "/y"]),
        ("svc-b", [40], ["/z"]),
    ]:
        expected = [
            len(latencies),  # count()
            sum(latencies),  # sum(latency_ms)
            sum(latencies) / len(latencies),  # avg(latency_ms)
            min(latencies),  # min(latency_ms)
            max(latencies),  # max(latency_ms)
            float(np.percentile(latencies, 50)),  # p50(latency_ms)
            float(np.percentile(latencies, 90)),  # p90(latency_ms)
            float(np.percentile(latencies, 95)),  # p95(latency_ms)
            float(np.percentile(latencies, 99)),  # p99(latency_ms)
            sum(1 for latency in latencies if latency >= 25),  # countIf(latency_ms >= 25)
            # Response floats are rounded to 3 decimals at or above 1 and to 3
            # significant figures below it (roundToNonZeroDecimals). Every other
            # value here is exact; the rates are the only ones that repeat, and
            # they stay below 1 for this fixture, so mirror the latter form.
            float(f"{len(latencies) / rate_interval_seconds:.3g}"),  # rate()
            float(f"{sum(latencies) / rate_interval_seconds:.3g}"),  # rate_sum(latency_ms)
            len(set(endpoints)),  # count_distinct(endpoint)
        ]
        assert by_service[service] == pytest.approx(expected), f"{service}: {by_service[service]} != {expected}"


def test_logs_aggregate_if_predicates_use_filter_syntax(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    svc-a: 3 logs, two with a k8s.pod.name and an x-request-id header, two
    with "timeout" in the body; svc-b: 1 log without either, with "timeout".

    Tests:
    countIf predicates accept the filter-only operators EXISTS, NOT EXISTS,
    CONTAINS and NOT CONTAINS, a combination of them, and a key with hyphens.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # (service, k8s.pod.name, x-request-id header, body)
    specs = [
        ("svc-a", "pod-1", "abc", "request timeout"),
        ("svc-a", None, None, "request ok"),
        ("svc-a", "pod-2", "def", "upstream timeout"),
        ("svc-b", None, None, "timeout"),
    ]
    logs = [
        Logs(
            timestamp=now - timedelta(seconds=i + 1),
            resources={"service.name": service} | ({"k8s.pod.name": pod} if pod else {}),
            attributes={"http.request.header.x-request-id": request_id} if request_id else {},
            body=body,
        )
        for i, (service, pod, request_id, body) in enumerate(specs)
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[
            build_aggregation("count()", "cnt"),
            build_aggregation("countIf(k8s.pod.name EXISTS)", "with_pod"),
            build_aggregation("countIf(k8s.pod.name NOT EXISTS)", "without_pod"),
            build_aggregation("countIf(body CONTAINS 'timeout')", "timeouts"),
            build_aggregation("countIf(body NOT CONTAINS 'timeout')", "not_timeouts"),
            build_aggregation("countIf(body CONTAINS 'timeout' AND k8s.pod.name EXISTS)", "pod_timeouts"),
            build_aggregation("countIf(http.request.header.x-request-id = 'abc')", "request_abc"),
        ],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", "desc")],
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())
    assert [row[0] for row in data] == ["svc-a", "svc-b"]
    by_service = {row[0]: row[1:] for row in data}

    for service in ["svc-a", "svc-b"]:
        rows = [(pod, request_id, body) for svc, pod, request_id, body in specs if svc == service]
        expected = [
            len(rows),
            sum(1 for pod, _, _ in rows if pod),
            sum(1 for pod, _, _ in rows if not pod),
            sum(1 for _, _, body in rows if "timeout" in body),
            sum(1 for _, _, body in rows if "timeout" not in body),
            sum(1 for pod, _, body in rows if "timeout" in body and pod),
            sum(1 for _, request_id, _ in rows if request_id == "abc"),
        ]
        assert by_service[service] == expected, f"{service}: {by_service[service]} != {expected}"


@pytest.mark.parametrize(
    "expression",
    [
        pytest.param("countIf(k8s.pod.name EXISTS", id="unclosed_parenthesis"),
        pytest.param("countIf()", id="missing_predicate"),
        pytest.param("countIf(latency_ms >= 25, latency_ms < 100)", id="extra_argument"),
    ],
)
def test_logs_aggregate_invalid_expression_is_bad_request(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    expression: str,
) -> None:
    """
    An aggregation expression the parser rejects, or one with the wrong number
    of arguments, is the caller's mistake and returns 400.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(name="A", signal="logs", aggregations=[build_aggregation(expression)])
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


@pytest.mark.parametrize(
    "having_expression,aggregations,expected_services",
    [
        pytest.param("count() > 2", ["count()"], {"svc-a"}, id="count_gt_2"),
        pytest.param("count() < 2", ["count()"], {"svc-b"}, id="count_lt_2"),
        pytest.param("sum(latency_ms) >= 50", ["count()", "sum(latency_ms)"], {"svc-a"}, id="sum_gte_50"),
    ],
)
def test_logs_aggregate_having(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    having_expression: str,
    aggregations: list[str],
    expected_services: set[str],
) -> None:
    """
    Setup:
    svc-a: 3 logs (latency_ms 10/20/30, sum 60); svc-b: 1 log (latency_ms 40).

    Tests:
    A grouped scalar query with `having` keeps only the qualifying groups, for a
    count() predicate (both directions) and a sum() predicate — extending logs
    HAVING coverage beyond the single count() case in querierscalar/04_having.py.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    specs = [("svc-a", 10), ("svc-a", 20), ("svc-a", 30), ("svc-b", 40)]
    logs = [
        Logs(
            timestamp=now - timedelta(seconds=i + 1),
            resources={"service.name": service},
            attributes={"latency_ms": latency},
            body=f"{service} log {i}",
        )
        for i, (service, latency) in enumerate(specs)
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation(expr) for expr in aggregations],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        having_expression=having_expression,
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())
    assert {row[0] for row in data} == expected_services
