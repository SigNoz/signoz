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
