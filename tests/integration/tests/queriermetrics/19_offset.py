from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import build_builder_query, get_all_series, make_query_request


@pytest.mark.parametrize(
    "limit, offset, expected_services",
    [
        pytest.param(2, 1, ["service-a", "service-b"], id="offset_within_page"),
        pytest.param(None, 1, ["service-a", "service-b", "service-d"], id="offset_without_limit"),
        pytest.param(2, 4, [], id="offset_past_the_end"),
    ],
)
def test_metrics_time_series_offset_skips_series_in_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    limit: int | None,
    offset: int,
    expected_services: list[str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # Ordered by value, descending: service-c 70, service-a 50, service-b 30, service-d 10, one sample each in the bucket before now.
    service_values = {"service-a": 50.0, "service-b": 30.0, "service-c": 70.0, "service-d": 10.0}
    insert_metrics(
        [
            Metrics(
                metric_name="offset.gauge",
                labels={"service.name": service},
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=value,
            )
            for service, value in service_values.items()
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        queries=[
            build_builder_query(
                "A",
                "offset.gauge",
                "avg",
                "sum",
                temporality="unspecified",
                group_by=["service.name"],
                limit=limit,
                offset=offset,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert [
        (
            next(label["value"] for label in series["labels"] if label["key"]["name"] == "service.name"),
            [point["value"] for point in series["values"]],
        )
        for series in get_all_series(response.json(), "A")
    ] == [(service, [service_values[service]]) for service in expected_services]
