from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import make_scalar_query_request

metric_values_for_test = {
    "service-a": 50.0,
    "service-b": 30.0,
    "service-c": 70.0,
    "service-d": 10.0,
}


def generate_metrics_with_values(
    now: datetime,
    service_values: dict[str, float],
) -> list[Metrics]:
    metrics = []
    for service, value in service_values.items():
        metrics.append(
            Metrics(
                metric_name="test.metric",
                labels={"service.name": service},
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=value,
            )
        )
    return metrics


def build_metrics_query(
    name: str = "A",
    metric_name: str = "test.metric",
    time_aggregation: str = "latest",
    space_aggregation: str = "sum",
    group_by: list[str] | None = None,
    order_by: list[tuple[str, str]] | None = None,
    limit: int | None = None,
) -> dict:
    aggs = [querier.build_metrics_aggregation(metric_name, time_aggregation, space_aggregation, "unspecified")]
    gb = [querier.build_group_by_field(f, "string", "attribute") for f in group_by] if group_by else None
    order = [querier.build_order_by(name, direction) for name, direction in order_by] if order_by else None

    return querier.build_scalar_query(
        name=name,
        signal="metrics",
        aggregations=aggs,
        group_by=gb,
        order=order,
        limit=limit,
    )


def test_metrics_scalar_group_by_single_agg_no_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_metrics_query(group_by=["service.name"])],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [
            ("service-c", 70.0),
            ("service-a", 50.0),
            ("service-b", 30.0),
            ("service-d", 10.0),
        ],
        "Metrics no order - default desc",
    )


def test_metrics_scalar_group_by_single_agg_order_by_agg_asc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_metrics_query(
                group_by=["service.name"],
                order_by=[("sum(test.metric)", "asc")],
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [
            ("service-d", 10.0),
            ("service-b", 30.0),
            ("service-a", 50.0),
            ("service-c", 70.0),
        ],
        "Metrics order by agg asc",
    )


def test_metrics_scalar_group_by_single_agg_order_by_grouping_key_asc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_metrics_query(
                group_by=["service.name"],
                order_by=[("service.name", "asc")],
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [
            ("service-a", 50.0),
            ("service-b", 30.0),
            ("service-c", 70.0),
            ("service-d", 10.0),
        ],
        "Metrics order by grouping key asc",
    )


def test_metrics_scalar_group_by_single_agg_order_by_agg_asc_limit_2(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_metrics_query(
                group_by=["service.name"],
                order_by=[("sum(test.metric)", "asc")],
                limit=2,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-d", 10.0), ("service-b", 30.0)],
        "Metrics order by agg asc with limit 2",
    )


def test_metrics_scalar_group_by_single_agg_order_by_agg_desc_limit_3(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_metrics_query(
                group_by=["service.name"],
                order_by=[("sum(test.metric)", "desc")],
                limit=3,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-c", 70.0), ("service-a", 50.0), ("service-b", 30.0)],
        "Metrics order by agg desc with limit 3",
    )


def test_metrics_scalar_group_by_order_by_grouping_key_asc_limit_2(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_metrics_query(
                group_by=["service.name"],
                order_by=[("service.name", "asc")],
                limit=2,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-a", 50.0), ("service-b", 30.0)],
        "Metrics order by grouping key asc with limit 2",
    )
