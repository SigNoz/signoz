from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    assert_scalar_result_order,
    build_group_by_field,
    build_metrics_aggregation,
    build_order_by,
    build_scalar_query,
    get_scalar_table_data,
    make_scalar_query_request,
)

# Metric scalar `reduceTo`: collapse a time series to a single value for a value/table
# panel. Metrics scalar group-by is covered by 03_metrics.py; this file exercises the
# reduceTo modes (last / sum / avg / min / max / count / median), of which only sum was
# previously tested.


@pytest.mark.parametrize(
    "reduce_to,expected",
    [
        pytest.param("last", 30.0, id="last"),
        pytest.param("sum", 60.0, id="sum"),
        pytest.param("avg", 20.0, id="avg"),
        pytest.param("min", 10.0, id="min"),
        pytest.param("max", 30.0, id="max"),
        pytest.param("count", 3.0, id="count"),
        pytest.param("median", 20.0, id="median"),
    ],
)
def test_metrics_scalar_reduce_to_modes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    reduce_to: str,
    expected: float,
) -> None:
    """reduceTo collapses a series' per-step points (10, 20, 30) to a single value:
    last=30, sum=60, avg=20, min=10, max=30, count=3, median=20."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # same metric_name + labels => one fingerprint/series; three samples in three
    # distinct 60s step buckets so latest-per-step yields 10, 20, 30.
    insert_metrics(
        [
            Metrics(metric_name="test.reduce.metric", labels={"service.name": "service-a"}, timestamp=now - timedelta(seconds=121), value=10.0, temporality="Unspecified", type_="Gauge", is_monotonic=False),
            Metrics(metric_name="test.reduce.metric", labels={"service.name": "service-a"}, timestamp=now - timedelta(seconds=61), value=20.0, temporality="Unspecified", type_="Gauge", is_monotonic=False),
            Metrics(metric_name="test.reduce.metric", labels={"service.name": "service-a"}, timestamp=now - timedelta(seconds=1), value=30.0, temporality="Unspecified", type_="Gauge", is_monotonic=False),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    aggregation = build_metrics_aggregation("test.reduce.metric", "latest", "sum", "unspecified")
    aggregation["reduceTo"] = reduce_to
    query = build_scalar_query(
        name="A",
        signal="metrics",
        aggregations=[aggregation],
        group_by=[build_group_by_field("service.name", "string", "attribute")],
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"
    data = get_scalar_table_data(response.json())
    assert_scalar_result_order(data, [("service-a", expected)], f"metrics reduceTo={reduce_to}")


@pytest.mark.parametrize(
    "reduce_to,order,expected",
    [
        pytest.param("max", "desc", [("payment", 40.0), ("auth", 30.0)], id="max_desc"),
        pytest.param("last", "desc", [("payment", 40.0), ("auth", 30.0)], id="last_desc"),
        pytest.param("min", "asc", [("auth", 0.0), ("payment", 1.0)], id="min_asc"),
        pytest.param("max", None, [("payment", 40.0), ("auth", 30.0)], id="max_no_order"),
    ],
)
def test_metrics_scalar_limit_ranks_by_reduced_value(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    reduce_to: str,
    order: str | None,
    expected: list[tuple[str, float]],
) -> None:
    """Limit keeps the top series by the reduced value, not by their average
    (avg: checkout 10, payment 8.8, auth 6, search 2)."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric_name = "test.reduce.limit.metric"
    points = {
        "checkout": [10.0, 10.0, 10.0, 10.0, 10.0],
        "payment": [1.0, 1.0, 1.0, 1.0, 40.0],
        "auth": [0.0, 0.0, 0.0, 0.0, 30.0],
        "search": [2.0, 2.0, 2.0, 2.0, 2.0],
    }
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service.name": service},
                timestamp=now - timedelta(seconds=60 * (len(values) - 1 - i) + 1),
                value=value,
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
            )
            for service, values in points.items()
            for i, value in enumerate(values)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="metrics",
        aggregations=[build_metrics_aggregation(metric_name, "latest", "sum", "unspecified", reduce_to=reduce_to)],
        group_by=[build_group_by_field("service.name", "string", "attribute")],
        order=[build_order_by(f"sum({metric_name})", order)] if order else None,
        limit=2,
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"
    data = get_scalar_table_data(response.json())
    assert_scalar_result_order(data, expected, f"metrics reduceTo={reduce_to} order={order} limit=2")


@pytest.mark.parametrize(
    "functions,expected",
    [
        pytest.param([{"name": "clampMax", "args": [{"value": 35}]}], [("payment", 35.0), ("auth", 30.0)], id="clamp_max"),
        pytest.param([{"name": "runningDiff"}], [("payment", 39.0), ("auth", 30.0)], id="running_diff"),
    ],
)
def test_metrics_scalar_limit_ranks_after_functions(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    functions: list[dict],
    expected: list[tuple[str, float]],
) -> None:
    """Functions run before reduceTo (max) and limit, so ranking uses the function output."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric_name = "test.reduce.limit.functions.metric"
    points = {
        "checkout": [10.0, 10.0, 10.0, 10.0, 10.0],
        "payment": [1.0, 1.0, 1.0, 1.0, 40.0],
        "auth": [0.0, 0.0, 0.0, 0.0, 30.0],
        "search": [2.0, 2.0, 2.0, 2.0, 2.0],
    }
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service.name": service},
                timestamp=now - timedelta(seconds=60 * (len(values) - 1 - i) + 1),
                value=value,
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
            )
            for service, values in points.items()
            for i, value in enumerate(values)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="metrics",
        aggregations=[build_metrics_aggregation(metric_name, "latest", "sum", "unspecified", reduce_to="max")],
        group_by=[build_group_by_field("service.name", "string", "attribute")],
        order=[build_order_by(f"sum({metric_name})", "desc")],
        limit=2,
        functions=functions,
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"
    data = get_scalar_table_data(response.json())
    assert_scalar_result_order(data, expected, f"metrics functions={functions} reduceTo=max limit=2")


def test_metrics_scalar_missing_reduce_to_rejected(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="metrics",
        aggregations=[build_metrics_aggregation("test.reduce.metric", "latest", "sum", "unspecified")],
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "reduceTo is required" in response.json()["error"]["message"], response.text


def test_metrics_scalar_invalid_reduce_to_rejected(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    aggregation = build_metrics_aggregation("test.reduce.metric", "latest", "sum", "unspecified")
    aggregation["reduceTo"] = "p99"
    query = build_scalar_query(name="A", signal="metrics", aggregations=[aggregation])
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "invalid reduceTo" in response.json()["error"]["message"], response.text
