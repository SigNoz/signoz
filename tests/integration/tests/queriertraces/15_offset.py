from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    Aggregation,
    BuilderQuery,
    RequestType,
    TelemetryFieldKey,
    find_named_result,
    get_all_series,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


@pytest.mark.parametrize(
    "limit, offset, expected_services",
    [
        # limit=2 selects the top two groups in SQL first; the skipped group must still count toward that page
        pytest.param(2, 1, ["service-a", "service-b"], id="offset_within_limited_page"),
        pytest.param(2, 4, [], id="offset_past_the_end"),
    ],
)
def test_traces_time_series_offset_skips_series_in_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    limit: int,
    offset: int,
    expected_services: list[str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # Ordered by count, descending: service-c 7, service-a 5, service-b 3, service-d 1, all in the bucket before now.
    service_counts = {"service-a": 5, "service-b": 3, "service-c": 7, "service-d": 1}
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                resources={"service.name": service},
                name=f"{service} span {i}",
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
                signal="traces",
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


def test_trace_operator_scalar_offset_skips_rows_in_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    span_counts = {"offset-a": 4, "offset-b": 3, "offset-c": 2, "offset-d": 1}
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=1),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                parent_span_id="",
                name="scalar-offset",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": service},
                attributes={"operation.type": "scalar-offset"},
            )
            for service, count in span_counts.items()
            for _ in range(count)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "disabled": True,
                    "filter": {"expression": "operation.type = 'scalar-offset'"},
                    "aggregations": [{"expression": "count()"}],
                },
            },
            {
                "type": "builder_trace_operator",
                "spec": {
                    "name": "C",
                    "expression": "A",
                    "aggregations": [{"expression": "count()"}],
                    "groupBy": [{"name": "service.name", "fieldContext": "resource"}],
                    "limit": 2,
                    "offset": 1,
                },
            },
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    result = find_named_result(response.json()["data"]["data"]["results"], "C")
    assert result is not None, "trace_operator result C not found"
    assert result["data"] == [["offset-b", 3], ["offset-c", 2]]


def test_traces_time_series_offset_pages_are_disjoint(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # steady: 2 spans in each of 5 minutes, 10 in all. spike: 6 spans in one minute.
    # steady has the larger total, spike the larger single-minute count.
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(minutes=minute, seconds=i + 1),
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                resources={"service.name": "steady"},
                name=f"steady span {minute}-{i}",
            )
            for minute in range(1, 6)
            for i in range(2)
        ]
        + [
            Traces(
                timestamp=now - timedelta(minutes=1, seconds=i + 1),
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                resources={"service.name": "spike"},
                name=f"spike span {i}",
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
                    signal="traces",
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
