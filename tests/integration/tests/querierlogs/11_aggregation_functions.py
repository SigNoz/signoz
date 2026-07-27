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
# query computes sum / avg / min / max / p50 / p90 / p95 / p99 / countIf /
# count_distinct over a numeric log attribute and asserts every value.
#
# Log number attributes are stored as Float64, so aggregates come back as floats;
# percentiles are matched with pytest.approx (ClickHouse quantile() and
# numpy.percentile both linear-interpolate, but avoid ULP-level exact equality).


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
    p95 / p99 over latency_ms, countIf over a numeric threshold, and
    count_distinct over a string attribute — all matching values derived from the
    inserted logs, ordered by count() desc.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
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
            build_aggregation("count_distinct(endpoint)", "endpoints"),
        ],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", "desc")],
    )
    response = make_scalar_query_request(signoz, token, now, [query])

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
            len(set(endpoints)),  # count_distinct(endpoint)
        ]
        assert by_service[service] == pytest.approx(expected), f"{service}: {by_service[service]} != {expected}"


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
