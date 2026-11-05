from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    Aggregation,
    BuilderQuery,
    RequestType,
    TelemetryFieldKey,
    get_all_series,
    make_query_request,
)


@pytest.mark.parametrize(
    "limit, offset, expected_services",
    [
        # limit=2 selects the top two groups in SQL first; the skipped group must still count toward that page
        pytest.param(2, 1, ["service-a", "service-b"], id="offset_within_limited_page"),
        pytest.param(None, 1, ["service-a", "service-b", "service-d"], id="offset_without_limit"),
        pytest.param(2, 4, [], id="offset_past_the_end"),
    ],
)
def test_logs_time_series_offset_skips_series_in_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    limit: int | None,
    offset: int,
    expected_services: list[str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # Ordered by count, descending: service-c 7, service-a 5, service-b 3, service-d 1, all in the bucket before now.
    service_counts = {"service-a": 5, "service-b": 3, "service-c": 7, "service-d": 1}
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=i + 1),
                resources={"service.name": service},
                body=f"{service} log {i}",
            )
            for service, count in service_counts.items()
            for i in range(count)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            BuilderQuery(
                signal="logs",
                name="A",
                aggregations=[Aggregation("count()")],
                group_by=[TelemetryFieldKey("service.name", "string", "resource")],
                step_interval=60,
                limit=limit,
                offset=offset,
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    bucket_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    assert [
        (
            next(label["value"] for label in series["labels"] if label["key"]["name"] == "service.name"),
            [(point["timestamp"], point["value"]) for point in series["values"]],
        )
        for series in get_all_series(response.json(), "A")
    ] == [(service, [(bucket_ms, service_counts[service])]) for service in expected_services]
