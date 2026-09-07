from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics

METRIC = "test.metric.boollabel"


def test_metrics_filter_bool_label(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(
        [
            Metrics(
                metric_name=METRIC,
                labels=labels,
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=value,
            )
            for labels, value in [
                ({"success": "true"}, 30.0),
                ({"success": "false"}, 10.0),
                ({"success": "1"}, 5.0),
                ({"success": "maybe"}, 3.0),
                ({"region": "us"}, 7.0),
            ]
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # `true` selects "true" and "1"; `false` selects only "false". "maybe" and the series
    # carrying no `success` label cast to NULL, so they are in neither result.
    for expr, expected in [
        ("success = true", 35.0),
        ("success = false", 10.0),
        ("success != true", 10.0),
        ("success IN [true]", 35.0),
        ("success IN [true, false]", 45.0),
    ]:
        response = querier.make_scalar_query_request(
            signoz,
            token,
            now,
            [
                querier.build_scalar_query(
                    name="A",
                    signal="metrics",
                    aggregations=[querier.build_metrics_aggregation(METRIC, "latest", "sum", "unspecified", reduce_to="last")],
                    filter_expression=expr,
                )
            ],
        )
        assert response.status_code == HTTPStatus.OK, f"{expr}: {response.text}"
        data = querier.get_scalar_table_data(response.json())
        assert len(data) == 1, f"{expr}: {data}"
        assert data[0][-1] == expected, f"{expr}: {data}"
