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
        pytest.param(2, 4, [], id="offset_past_the_end"),
    ],
)
def test_logs_time_series_offset_skips_series_in_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    limit: int,
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


def test_logs_time_series_offset_pages_are_disjoint(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # steady: 2 logs in each of 5 minutes, 10 in all. spike: 6 logs in one minute.
    # steady has the larger total, spike the larger single-minute count.
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(minutes=minute, seconds=i + 1),
                resources={"service.name": "steady"},
                body=f"steady log {minute}-{i}",
            )
            for minute in range(1, 6)
            for i in range(2)
        ]
        + [
            Logs(
                timestamp=now - timedelta(minutes=1, seconds=i + 1),
                resources={"service.name": "spike"},
                body=f"spike log {i}",
            )
            for i in range(6)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    pages = []
    for offset in (0, 1):
        response = make_query_request(
            signoz,
            token,
            start_ms=int((now - timedelta(minutes=10)).timestamp() * 1000),
            end_ms=int(now.timestamp() * 1000),
            request_type=RequestType.TIME_SERIES,
            queries=[
                BuilderQuery(
                    signal="logs",
                    name="A",
                    aggregations=[Aggregation("count()")],
                    group_by=[TelemetryFieldKey("service.name", "string", "resource")],
                    step_interval=60,
                    limit=1,
                    offset=offset,
                ).to_dict()
            ],
        )
        assert response.status_code == HTTPStatus.OK, response.text
        pages.append(
            [
                (
                    next(label["value"] for label in series["labels"] if label["key"]["name"] == "service.name"),
                    sorted(point["value"] for point in series["values"]),
                )
                for series in get_all_series(response.json(), "A")
            ]
        )

    # Pages follow the total count over the window: steady (10) first, then spike (6).
    assert pages == [[("steady", [2, 2, 2, 2, 2])], [("spike", [6])]]
