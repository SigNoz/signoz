from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    make_query_request,
)
from fixtures.traces import (
    TraceIdGenerator,
    Traces,
    TracesKind,
    TracesStatusCode,
)


@pytest.mark.parametrize(
    "order_by,aggregation_alias,expected_status",
    [
        # Case 1a: count by count()
        pytest.param({"name": "count()"}, "count_", HTTPStatus.OK),
        # Case 1b: count by count() with alias span.count_
        pytest.param({"name": "count()"}, "span.count_", HTTPStatus.OK),
        # Case 2a: count by count() with context specified in the key
        pytest.param({"name": "count()", "fieldContext": "span"}, "count_", HTTPStatus.OK),
        # Case 2b: count by count() with context specified in the key with alias span.count_
        pytest.param({"name": "count()", "fieldContext": "span"}, "span.count_", HTTPStatus.OK),
        # Case 3a: count by span.count() and context specified in the key [BAD REQUEST]
        pytest.param(
            {"name": "span.count()", "fieldContext": "span"},
            "count_",
            HTTPStatus.BAD_REQUEST,
        ),
        # Case 3b: count by span.count() and context specified in the key with alias span.count_ [BAD REQUEST]
        pytest.param(
            {"name": "span.count()", "fieldContext": "span"},
            "span.count_",
            HTTPStatus.BAD_REQUEST,
        ),
        # Case 4a: count by span.count() and context specified in the key
        pytest.param({"name": "span.count()", "fieldContext": ""}, "count_", HTTPStatus.OK),
        # Case 4b: count by span.count() and context specified in the key with alias span.count_
        pytest.param({"name": "span.count()", "fieldContext": ""}, "span.count_", HTTPStatus.OK),
        # Case 5a: count by count_
        pytest.param({"name": "count_"}, "count_", HTTPStatus.OK),
        # Case 5b: count by count_ with alias span.count_
        pytest.param({"name": "count_"}, "count_", HTTPStatus.OK),
        # Case 6a: count by span.count_
        pytest.param({"name": "span.count_"}, "count_", HTTPStatus.OK),
        # Case 6b: count by span.count_ with alias span.count_
        pytest.param({"name": "span.count_"}, "span.count_", HTTPStatus.OK),
        # Case 7a: count by span.count_ and context specified in the key [BAD REQUEST]
        pytest.param(
            {"name": "span.count_", "fieldContext": "span"},
            "count_",
            HTTPStatus.BAD_REQUEST,
        ),
        # Case 7b: count by span.count_ and context specified in the key with alias span.count_
        pytest.param(
            {"name": "span.count_", "fieldContext": "span"},
            "span.count_",
            HTTPStatus.OK,
        ),
    ],
)
def test_traces_aggergate_order_by_count(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    order_by: dict[str, str],
    aggregation_alias: str,
    expected_status: HTTPStatus,
) -> None:
    """
    Setup:
    Insert 4 traces with different attributes.
    http-service: POST /integration -> SELECT, HTTP PATCH
    topic-service: topic publish

    Tests:
    1. Query traces count for spans grouped by service.name and host.name
    """
    http_service_trace_id = TraceIdGenerator.trace_id()
    http_service_span_id = TraceIdGenerator.span_id()
    http_service_db_span_id = TraceIdGenerator.span_id()
    http_service_patch_span_id = TraceIdGenerator.span_id()
    topic_service_trace_id = TraceIdGenerator.trace_id()
    topic_service_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=4),
                duration=timedelta(seconds=3),
                trace_id=http_service_trace_id,
                span_id=http_service_span_id,
                parent_span_id="",
                name="POST /integration",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "deployment.environment": "production",
                    "service.name": "http-service",
                    "os.type": "linux",
                    "host.name": "linux-000",
                    "cloud.provider": "integration",
                    "cloud.account.id": "000",
                },
                attributes={
                    "net.transport": "IP.TCP",
                    "http.scheme": "http",
                    "http.user_agent": "Integration Test",
                    "http.request.method": "POST",
                    "http.response.status_code": "200",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=3.5),
                duration=timedelta(seconds=0.5),
                trace_id=http_service_trace_id,
                span_id=http_service_db_span_id,
                parent_span_id=http_service_span_id,
                name="SELECT",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "deployment.environment": "production",
                    "service.name": "http-service",
                    "os.type": "linux",
                    "host.name": "linux-000",
                    "cloud.provider": "integration",
                    "cloud.account.id": "000",
                },
                attributes={
                    "db.name": "integration",
                    "db.operation": "SELECT",
                    "db.statement": "SELECT * FROM integration",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=3),
                duration=timedelta(seconds=1),
                trace_id=http_service_trace_id,
                span_id=http_service_patch_span_id,
                parent_span_id=http_service_span_id,
                name="HTTP PATCH",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "deployment.environment": "production",
                    "service.name": "http-service",
                    "os.type": "linux",
                    "host.name": "linux-000",
                    "cloud.provider": "integration",
                    "cloud.account.id": "000",
                },
                attributes={
                    "http.request.method": "PATCH",
                    "http.status_code": "404",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=1),
                duration=timedelta(seconds=4),
                trace_id=topic_service_trace_id,
                span_id=topic_service_span_id,
                parent_span_id="",
                name="topic publish",
                kind=TracesKind.SPAN_KIND_PRODUCER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "deployment.environment": "production",
                    "service.name": "topic-service",
                    "os.type": "linux",
                    "host.name": "linux-001",
                    "cloud.provider": "integration",
                    "cloud.account.id": "001",
                },
                attributes={
                    "message.type": "SENT",
                    "messaging.operation": "publish",
                    "messaging.message.id": "001",
                },
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = {
        "type": "builder_query",
        "spec": {
            "name": "A",
            "signal": "traces",
            "disabled": False,
            "order": [{"key": {"name": "count()"}, "direction": "desc"}],
            "aggregations": [{"expression": "count()", "alias": "count_"}],
        },
    }

    # Query traces count for spans

    query["spec"]["order"][0]["key"] = order_by
    query["spec"]["aggregations"][0]["alias"] = aggregation_alias
    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="time_series",
        queries=[query],
    )

    assert response.status_code == expected_status
    if expected_status != HTTPStatus.OK:
        return
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1
    series = aggregations[0]["series"]
    assert len(series) == 1
    assert series[0]["values"][0]["value"] == 4


def test_traces_aggregate_with_mixed_field_selectors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    Insert 4 traces with different attributes.
    http-service: POST /integration -> SELECT, HTTP PATCH
    topic-service: topic publish

    Tests:
    1. Query traces count for spans grouped by service.name
    """
    http_service_trace_id = TraceIdGenerator.trace_id()
    http_service_span_id = TraceIdGenerator.span_id()
    http_service_db_span_id = TraceIdGenerator.span_id()
    http_service_patch_span_id = TraceIdGenerator.span_id()
    topic_service_trace_id = TraceIdGenerator.trace_id()
    topic_service_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=4),
                duration=timedelta(seconds=3),
                trace_id=http_service_trace_id,
                span_id=http_service_span_id,
                parent_span_id="",
                name="POST /integration",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "deployment.environment": "production",
                    "service.name": "http-service",
                    "os.type": "linux",
                    "host.name": "linux-000",
                    "cloud.provider": "integration",
                    "cloud.account.id": "000",
                },
                attributes={
                    "net.transport": "IP.TCP",
                    "http.scheme": "http",
                    "http.user_agent": "Integration Test",
                    "http.request.method": "POST",
                    "http.response.status_code": "200",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=3.5),
                duration=timedelta(seconds=0.5),
                trace_id=http_service_trace_id,
                span_id=http_service_db_span_id,
                parent_span_id=http_service_span_id,
                name="SELECT",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "deployment.environment": "production",
                    "service.name": "http-service",
                    "os.type": "linux",
                    "host.name": "linux-000",
                    "cloud.provider": "integration",
                    "cloud.account.id": "000",
                },
                attributes={
                    "db.name": "integration",
                    "db.operation": "SELECT",
                    "db.statement": "SELECT * FROM integration",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=3),
                duration=timedelta(seconds=1),
                trace_id=http_service_trace_id,
                span_id=http_service_patch_span_id,
                parent_span_id=http_service_span_id,
                name="HTTP PATCH",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "deployment.environment": "production",
                    "service.name": "http-service",
                    "os.type": "linux",
                    "host.name": "linux-000",
                    "cloud.provider": "integration",
                    "cloud.account.id": "000",
                },
                attributes={
                    "http.request.method": "PATCH",
                    "http.status_code": "404",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=1),
                duration=timedelta(seconds=4),
                trace_id=topic_service_trace_id,
                span_id=topic_service_span_id,
                parent_span_id="",
                name="topic publish",
                kind=TracesKind.SPAN_KIND_PRODUCER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "deployment.environment": "production",
                    "service.name": "topic-service",
                    "os.type": "linux",
                    "host.name": "linux-001",
                    "cloud.provider": "integration",
                    "cloud.account.id": "001",
                },
                attributes={
                    "message.type": "SENT",
                    "messaging.operation": "publish",
                    "messaging.message.id": "001",
                },
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = {
        "type": "builder_query",
        "spec": {
            "name": "A",
            "signal": "traces",
            "groupBy": [
                {
                    "name": "service.name",
                    "fieldContext": "resource",
                    "fieldDataType": "string",
                }
            ],
            "aggregations": [
                {"expression": "p99(duration_nano)", "alias": "p99"},
                {"expression": "avg(duration_nano)", "alias": "avgDuration"},
                {"expression": "count()", "alias": "numCalls"},
                {"expression": "countIf(status_code = 2)", "alias": "numErrors"},
                {
                    "expression": "countIf(response_status_code >= 400 AND response_status_code < 500)",
                    "alias": "num4XX",
                },
            ],
            "order": [{"key": {"name": "count()"}, "direction": "desc"}],
        },
    }

    # Query traces count for spans
    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="time_series",
        queries=[query],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    aggregations = results[0]["aggregations"]

    assert aggregations[0]["series"][0]["values"][0]["value"] >= 2.5 * 1e9  # p99 for http-service
