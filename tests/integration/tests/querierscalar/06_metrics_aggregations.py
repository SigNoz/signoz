from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    build_group_by_field,
    build_metrics_aggregation,
    build_scalar_query,
    get_scalar_table_data,
    make_scalar_query_request,
)

# Metrics scalar breadth beyond 03_metrics.py (which only uses space_aggregation=sum)
# and 04_having.py (logs only): the other space aggregations (avg / min / max / count)
# and HAVING on a grouped metrics query.

METRIC_VALUES = {"service-a": 50.0, "service-b": 30.0, "service-c": 70.0, "service-d": 10.0}


@pytest.mark.parametrize(
    "space_aggregation,expected",
    [
        pytest.param("sum", 160.0, id="sum"),
        pytest.param("avg", 40.0, id="avg"),
        pytest.param("min", 10.0, id="min"),
        pytest.param("max", 70.0, id="max"),
        pytest.param("count", 4.0, id="count"),
    ],
)
def test_metrics_scalar_space_aggregations(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    space_aggregation: str,
    expected: float,
) -> None:
    """
    Setup:
    Four gauge series with latest values 50 / 30 / 70 / 10.

    Tests:
    An ungrouped scalar query combines the four series with the given space
    aggregation: sum=160, avg=40, min=10, max=70, count=4.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics([Metrics(metric_name="test.metric", labels={"service.name": service}, timestamp=now - timedelta(seconds=1), temporality="Unspecified", type_="Gauge", is_monotonic=False, value=value) for service, value in METRIC_VALUES.items()])
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="metrics",
        aggregations=[build_metrics_aggregation("test.metric", "latest", space_aggregation, "unspecified")],
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"
    data = get_scalar_table_data(response.json())
    assert len(data) == 1, f"expected a single ungrouped row, got {data}"
    assert data[0][0] == pytest.approx(expected), f"{space_aggregation}: {data[0][0]} != {expected}"


@pytest.mark.parametrize(
    "having_expression,expected_services",
    [
        pytest.param("sum(test.metric) > 40", {"service-a", "service-c"}, id="gt"),
        pytest.param("sum(test.metric) < 40", {"service-b", "service-d"}, id="lt"),
    ],
)
def test_metrics_scalar_having(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    having_expression: str,
    expected_services: set[str],
) -> None:
    """
    Setup:
    Four gauge series (per service.name) with latest values 50 / 30 / 70 / 10.

    Tests:
    A grouped metrics scalar query with `having` on the space-aggregated value keeps
    only the qualifying services — HAVING was previously logs-only.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics([Metrics(metric_name="test.metric", labels={"service.name": service}, timestamp=now - timedelta(seconds=1), temporality="Unspecified", type_="Gauge", is_monotonic=False, value=value) for service, value in METRIC_VALUES.items()])
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="metrics",
        aggregations=[build_metrics_aggregation("test.metric", "latest", "sum", "unspecified")],
        group_by=[build_group_by_field("service.name", "string", "attribute")],
        having_expression=having_expression,
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"
    data = get_scalar_table_data(response.json())
    assert {row[0] for row in data} == expected_services
