from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import index_series_by_label, make_query_request
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

# min()/max() aggregation expressions over a span field. The traces aggregation
# suite (02_aggregation.py) covers count/countIf/avg/p99 but not min/max.


def test_traces_aggregate_min_max(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """max(duration_nano)/min(duration_nano) grouped by service.name return the extremes."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=4),
                duration=timedelta(seconds=3),  # 3e9
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="POST /x",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": "http-service"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=3),
                duration=timedelta(milliseconds=500),  # 0.5e9 (min)
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="SELECT",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": "http-service"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=2),
                duration=timedelta(seconds=1),  # 1e9
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="PATCH",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": "http-service"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=1),
                duration=timedelta(seconds=4),  # 4e9
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="topic publish",
                kind=TracesKind.SPAN_KIND_PRODUCER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": "topic-service"},
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int((now + timedelta(seconds=5)).timestamp() * 1000),
        request_type="time_series",
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "groupBy": [{"name": "service.name", "fieldContext": "resource", "fieldDataType": "string"}],
                    "aggregations": [
                        {"expression": "max(duration_nano)", "alias": "maxDuration"},
                        {"expression": "min(duration_nano)", "alias": "minDuration"},
                    ],
                },
            }
        ],
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    aggregations = response.json()["data"]["data"]["results"][0]["aggregations"]

    max_by_svc = index_series_by_label(aggregations[0]["series"], "service.name")
    min_by_svc = index_series_by_label(aggregations[1]["series"], "service.name")
    assert max_by_svc["http-service"]["values"][0]["value"] == 3_000_000_000.0
    assert min_by_svc["http-service"]["values"][0]["value"] == 500_000_000.0
    assert max_by_svc["topic-service"]["values"][0]["value"] == 4_000_000_000.0
    assert min_by_svc["topic-service"]["values"][0]["value"] == 4_000_000_000.0
