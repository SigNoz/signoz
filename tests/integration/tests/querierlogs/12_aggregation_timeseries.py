from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    RequestType,
    build_aggregation,
    build_group_by_field,
    build_order_by,
    build_scalar_query,
    get_all_series,
    get_scalar_table_data,
    index_series_by_label,
    make_query_request,
    make_scalar_query_request,
)

# Time-series aggregation shapes for logs — the logs counterpart of
# queriertraces/08_aggregation_min_max.py and the time_series limit in
# queriertraces/02_aggregation.py, plus a multi-key group-by (a shape neither
# signal covered before). Logs querier tests elsewhere only exercise single-key
# grouped counts, so this file adds min/max over a numeric attribute, top-N /
# bottom-N series limiting, and a two-key group-by cross product.


def test_logs_aggregate_min_max(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    svc-a: 3 logs (latency_ms 10/20/30); svc-b: 1 log (latency_ms 40).

    Tests:
    max(latency_ms) / min(latency_ms) as two aggregations in one time_series query
    grouped by service.name return each service's latency extremes.
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

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int((now + timedelta(seconds=5)).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[
                    build_aggregation("max(latency_ms)", "maxLatency"),
                    build_aggregation("min(latency_ms)", "minLatency"),
                ],
                group_by=[build_group_by_field("service.name", "string", "resource")],
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    aggregations = response.json()["data"]["data"]["results"][0]["aggregations"]
    max_by_svc = index_series_by_label(aggregations[0]["series"], "service.name")
    min_by_svc = index_series_by_label(aggregations[1]["series"], "service.name")

    latencies_by_service = {"svc-a": [10, 20, 30], "svc-b": [40]}
    for service, latencies in latencies_by_service.items():
        assert max_by_svc[service]["values"][0]["value"] == max(latencies)
        assert min_by_svc[service]["values"][0]["value"] == min(latencies)


@pytest.mark.parametrize(
    "limit,direction",
    [
        pytest.param(2, "desc", id="top_2_desc"),
        pytest.param(3, "desc", id="top_3_desc"),
        pytest.param(2, "asc", id="bottom_2_asc"),
        pytest.param(10, "desc", id="limit_exceeds_group_count"),
    ],
)
def test_logs_aggregate_time_series_limit(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    limit: int,
    direction: str,
) -> None:
    """
    Setup:
    Four services with distinct log counts (a=5, b=3, c=7, d=1).

    Tests:
    A time_series group-by with a limit returns only the N series that the ordered
    aggregation keeps — top-N for desc, bottom-N for asc — each series summing to
    that service's log count.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    counts = {"svc-a": 5, "svc-b": 3, "svc-c": 7, "svc-d": 1}
    logs = [
        Logs(
            timestamp=now - timedelta(seconds=i + 1),
            resources={"service.name": service},
            body=f"{service} log {i}",
        )
        for service, count in counts.items()
        for i in range(count)
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("service.name", "string", "resource")],
                order=[build_order_by("count()", direction)],
                limit=limit,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text

    ordered = sorted(counts.items(), key=lambda kv: kv[1], reverse=(direction == "desc"))
    expected = dict(ordered[:limit])

    by_service = index_series_by_label(get_all_series(response.json(), "A"), "service.name")
    assert set(by_service) == set(expected)
    for service, series in by_service.items():
        assert sum(point["value"] for point in series["values"]) == expected[service]


def test_logs_aggregate_multi_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Logs across (service.name, deployment.environment) pairs:
    (svc-a, prod)=2, (svc-a, dev)=1, (svc-b, prod)=3.

    Tests:
    A scalar query grouped by two resource keys returns one row per present pair
    (the cross product, not the full Cartesian) with the correct per-pair count.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    pair_counts = {("svc-a", "prod"): 2, ("svc-a", "dev"): 1, ("svc-b", "prod"): 3}
    logs = [
        Logs(
            timestamp=now - timedelta(seconds=i + 1),
            resources={"service.name": service, "deployment.environment": env},
            body=f"{service}-{env} log {i}",
        )
        for (service, env), count in pair_counts.items()
        for i in range(count)
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[
            build_group_by_field("service.name", "string", "resource"),
            build_group_by_field("deployment.environment", "string", "resource"),
        ],
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    data = get_scalar_table_data(response.json())

    actual = {(row[0], row[1], row[2]) for row in data}
    expected = {(service, env, count) for (service, env), count in pair_counts.items()}
    assert actual == expected
