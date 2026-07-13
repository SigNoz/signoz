from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    assert_identical_query_response,
    format_timestamp,
    generate_traces_with_corrupt_metadata,
    make_query_request,
)
from fixtures.traces import (
    ALL_SELECT_FIELDS,
    TraceIdGenerator,
    Traces,
    TracesEvent,
    TracesKind,
    TracesLink,
    TracesRefType,
    TracesStatusCode,
)


def test_traces_list(
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
    1. Query traces for the last 5 minutes and check if the spans are returned in the correct order
    2. Query root spans for the last 5 minutes and check if the spans are returned in the correct order
    3. Query values of http.request.method attribute from the autocomplete API
    4. Query values of http.request.method attribute from the fields API
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

    # Query all traces for the past 5 minutes
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).timestamp() * 1000),
            "requestType": "raw",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "traces",
                            "disabled": False,
                            "limit": 10,
                            "offset": 0,
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
                            "selectFields": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                    "signal": "traces",
                                },
                                {
                                    "name": "name",
                                    "fieldDataType": "string",
                                    "fieldContext": "span",
                                    "signal": "traces",
                                },
                                {
                                    "name": "duration_nano",
                                    "fieldDataType": "",
                                    "fieldContext": "span",
                                    "signal": "traces",
                                },
                                {
                                    "name": "http_method",
                                    "fieldDataType": "",
                                    "fieldContext": "span",
                                    "signal": "traces",
                                },
                                {
                                    "name": "response_status_code",
                                    "fieldDataType": "",
                                    "fieldContext": "span",
                                    "signal": "traces",
                                },
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )

    # Query results with context appended to key names
    response_with_inline_context = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="raw",
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "disabled": False,
                    "limit": 10,
                    "offset": 0,
                    "order": [
                        {"key": {"name": "timestamp"}, "direction": "desc"},
                    ],
                    "selectFields": [
                        {
                            "name": "resource.service.name",
                            "fieldDataType": "string",
                            "signal": "traces",
                        },
                        {
                            "name": "span.name:string",
                            "signal": "traces",
                        },
                        {
                            "name": "span.duration_nano",
                            "signal": "traces",
                        },
                        {
                            "name": "span.http_method",
                            "signal": "traces",
                        },
                        {
                            "name": "span.response_status_code",
                            "signal": "traces",
                        },
                    ],
                    "having": {"expression": ""},
                    "aggregations": [{"expression": "count()"}],
                },
            }
        ],
    )
    assert_identical_query_response(response, response_with_inline_context)

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    rows = results[0]["rows"]
    assert len(rows) == 4

    # Care about the order of the rows
    row_0 = dict(rows[0]["data"])
    assert row_0.pop("timestamp") is not None
    assert row_0 == {
        "duration_nano": 4 * 1e9,
        "http_method": "",
        "name": "topic publish",
        "response_status_code": "",
        "service.name": "topic-service",
        "span_id": topic_service_span_id,
        "trace_id": topic_service_trace_id,
    }

    row_2 = dict(rows[1]["data"])
    assert row_2.pop("timestamp") is not None
    assert row_2 == {
        "duration_nano": 1 * 1e9,
        "http_method": "PATCH",
        "name": "HTTP PATCH",
        "response_status_code": "404",
        "service.name": "http-service",
        "span_id": http_service_patch_span_id,
        "trace_id": http_service_trace_id,
    }

    row_3 = dict(rows[2]["data"])
    assert row_3.pop("timestamp") is not None
    assert row_3 == {
        "duration_nano": 0.5 * 1e9,
        "http_method": "",
        "name": "SELECT",
        "response_status_code": "",
        "service.name": "http-service",
        "span_id": http_service_db_span_id,
        "trace_id": http_service_trace_id,
    }

    row_1 = dict(rows[3]["data"])
    assert row_1.pop("timestamp") is not None
    assert row_1 == {
        "duration_nano": 3 * 1e9,
        "http_method": "POST",
        "name": "POST /integration",
        "response_status_code": "200",
        "service.name": "http-service",
        "span_id": http_service_span_id,
        "trace_id": http_service_trace_id,
    }

    # Query root spans for the last 5 minutes and check if the spans are returned in the correct order
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).timestamp() * 1000),
            "requestType": "raw",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "traces",
                            "disabled": False,
                            "limit": 10,
                            "offset": 0,
                            "filter": {"expression": "isRoot = 'true'"},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
                            "selectFields": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    rows = results[0]["rows"]
    assert len(rows) == 2

    assert rows[0]["data"]["service.name"] == "topic-service"
    assert rows[1]["data"]["service.name"] == "http-service"

    # Query values of http.request.method attribute from the autocomplete API
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/autocomplete/attribute_values"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "aggregateOperator": "noop",
            "dataSource": "traces",
            "aggregateAttribute": "",
            "attributeKey": "http.request.method",
            "searchText": "",
            "filterAttributeKeyDataType": "string",
            "tagType": "tag",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["stringAttributeValues"]
    assert len(values) == 2

    assert set(values) == set(["POST", "PATCH"])

    # Query values of http.request.method attribute from the fields API
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "signal": "traces",
            "name": "http.request.method",
            "searchText": "",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert len(values) == 2

    assert set(values) == set(["POST", "PATCH"])

    # Query keys from the fields API with context specified in the key
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "signal": "traces",
            "searchText": "resource.servic",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    keys = response.json()["data"]["keys"]
    assert "service.name" in keys
    assert any(k["fieldContext"] == "resource" for k in keys["service.name"])

    # Query values of service.name resource attribute using context-prefixed key
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "signal": "traces",
            "name": "resource.service.name",
            "searchText": "",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert set(values) == set(["topic-service", "http-service"])


@pytest.mark.parametrize(
    "payload,status_code,results",
    [
        # Case 1: order by timestamp; empty selectFields returns the full
        # response shape (all intrinsic + calculated columns plus the merged
        # `attributes` and `resource` maps). x[3] (topic-service) is latest.
        pytest.param(
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "disabled": False,
                    "order": [{"key": {"name": "timestamp"}, "direction": "desc"}],
                    "limit": 1,
                },
            },
            HTTPStatus.OK,
            lambda x: [
                {
                    **x[3].attribute_string,
                    **x[3].attributes_number,
                    **x[3].attributes_bool,
                },  # attributes
                x[3].db_name,
                x[3].db_operation,
                int(x[3].duration_nano),
                x[3].events,
                x[3].external_http_method,
                x[3].external_http_url,
                int(x[3].flags),
                x[3].has_error,
                x[3].http_host,
                x[3].http_method,
                x[3].http_url,
                x[3].is_remote,
                int(x[3].kind),
                x[3].kind_string,
                x[3].links,
                x[3].name,
                x[3].parent_span_id,
                x[3].resources_string,
                x[3].response_status_code,
                x[3].span_id,
                int(x[3].status_code),
                x[3].status_code_string,
                x[3].status_message,
                format_timestamp(x[3].timestamp),
                x[3].trace_id,
                x[3].trace_state,
            ],  # type: Callable[[List[Traces]], List[Any]]
        ),
        # Case 2: order by attribute.timestamp. The key resolves to the
        # intrinsic span.timestamp column, so the latest span (x[3]) is
        # returned with the same full response shape as Case 1.
        pytest.param(
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "disabled": False,
                    "order": [{"key": {"name": "attribute.timestamp"}, "direction": "desc"}],
                    "limit": 1,
                },
            },
            HTTPStatus.OK,
            lambda x: [
                {
                    **x[3].attribute_string,
                    **x[3].attributes_number,
                    **x[3].attributes_bool,
                },  # attributes
                x[3].db_name,
                x[3].db_operation,
                int(x[3].duration_nano),
                x[3].events,
                x[3].external_http_method,
                x[3].external_http_url,
                int(x[3].flags),
                x[3].has_error,
                x[3].http_host,
                x[3].http_method,
                x[3].http_url,
                x[3].is_remote,
                int(x[3].kind),
                x[3].kind_string,
                x[3].links,
                x[3].name,
                x[3].parent_span_id,
                x[3].resources_string,
                x[3].response_status_code,
                x[3].span_id,
                int(x[3].status_code),
                x[3].status_code_string,
                x[3].status_message,
                format_timestamp(x[3].timestamp),
                x[3].trace_id,
                x[3].trace_state,
            ],  # type: Callable[[List[Traces]], List[Any]]
        ),
        # Case 3: select timestamp with empty order by
        pytest.param(
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "disabled": False,
                    "selectFields": [{"name": "timestamp"}],
                    "limit": 1,
                },
            },
            HTTPStatus.OK,
            lambda x: [
                x[2].span_id,
                format_timestamp(x[2].timestamp),
                x[2].trace_id,
            ],  # type: Callable[[List[Traces]], List[Any]]
        ),
        # Case 4: select attribute.timestamp with empty order by
        # This returns the one span which has attribute.timestamp
        pytest.param(
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "filter": {"expression": "attribute.timestamp exists"},
                    "disabled": False,
                    "selectFields": [{"name": "attribute.timestamp"}],
                    "limit": 1,
                },
            },
            HTTPStatus.OK,
            lambda x: [
                x[0].span_id,
                format_timestamp(x[0].timestamp),
                x[0].trace_id,
            ],  # type: Callable[[List[Traces]], List[Any]]
        ),
        # Case 5: select timestamp with timestamp order by
        pytest.param(
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "disabled": False,
                    "selectFields": [{"name": "timestamp"}],
                    "limit": 1,
                    "order": [{"key": {"name": "timestamp"}, "direction": "asc"}],
                },
            },
            HTTPStatus.OK,
            lambda x: [
                x[0].span_id,
                format_timestamp(x[0].timestamp),
                x[0].trace_id,
            ],  # type: Callable[[List[Traces]], List[Any]]
        ),
        # Case 6: select duration_nano with duration order by
        pytest.param(
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "disabled": False,
                    "selectFields": [{"name": "duration_nano"}],
                    "limit": 1,
                    "order": [{"key": {"name": "duration_nano"}, "direction": "desc"}],
                },
            },
            HTTPStatus.OK,
            lambda x: [
                x[1].duration_nano,
                x[1].span_id,
                format_timestamp(x[1].timestamp),
                x[1].trace_id,
            ],  # type: Callable[[List[Traces]], List[Any]]
        ),
        # Case 7: select attribute.duration_nano with attribute.duration_nano order by
        pytest.param(
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "disabled": False,
                    "selectFields": [{"name": "attribute.duration_nano"}],
                    "filter": {"expression": "attribute.duration_nano exists"},
                    "limit": 1,
                    "order": [
                        {
                            "key": {"name": "attribute.duration_nano"},
                            "direction": "desc",
                        }
                    ],
                },
            },
            HTTPStatus.OK,
            lambda x: [
                "corrupt_data",
                x[3].span_id,
                format_timestamp(x[3].timestamp),
                x[3].trace_id,
            ],  # type: Callable[[List[Traces]], List[Any]]
        ),
        # Case 8: select attribute.duration_nano with duration order by
        pytest.param(
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "disabled": False,
                    "selectFields": [{"name": "attribute.duration_nano"}],
                    "limit": 1,
                    "order": [{"key": {"name": "duration_nano"}, "direction": "desc"}],
                },
            },
            HTTPStatus.OK,
            lambda x: [
                x[1].duration_nano,
                x[1].span_id,
                format_timestamp(x[1].timestamp),
                x[1].trace_id,
            ],  # type: Callable[[List[Traces]], List[Any]]
        ),
    ],
)
def test_traces_list_with_corrupt_data(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    payload: dict[str, Any],
    status_code: HTTPStatus,
    results: Callable[[list[Traces]], list[Any]],
) -> None:
    """
    Setup:
    Insert 4 traces with corrupt attributes.
    Tests:
    """

    traces = generate_traces_with_corrupt_metadata()
    insert_traces(traces)
    # 4 Traces with corrupt metadata inserted
    # traces[i] occured before traces[j] where i < j

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="raw",
        queries=[payload],
    )

    assert response.status_code == status_code

    if response.status_code == HTTPStatus.OK:
        if not results(traces):
            # No results expected
            assert response.json()["data"]["data"]["results"][0]["rows"] is None
        else:
            data = response.json()["data"]["data"]["results"][0]["rows"][0]["data"]
            # Cannot compare values as they are randomly generated
            for key, value in zip(list(data.keys()), results(traces)):
                assert data[key] == value


def _verify_events_links_full(rows: list[dict], traces: list[Traces]) -> None:
    """Empty-selectFields case: events/links arrive parsed into structured objects.
    Every row's events/links should match the fixture's stored parsed shape
    (the fixture's `.events`/`.links` mirror the API response shape directly).
    """
    for row, trace in zip(rows, traces, strict=True):
        assert row["data"]["events"] == trace.events
        assert row["data"]["links"] == trace.links
        # Jaeger-era `refType` is dropped at the consume layer.
        for link in row["data"]["links"]:
            assert "refType" not in link


def _verify_events_links_skip(rows: list[dict], traces: list[Traces]) -> None:
    """Projected-selectFields case: nothing to verify beyond the key set."""


@pytest.mark.parametrize(
    "select_fields,status_code,expected_keys,verify_values",
    [
        pytest.param(
            [],
            HTTPStatus.OK,
            ALL_SELECT_FIELDS,
            _verify_events_links_full,
        ),
        pytest.param(
            [
                {"name": "service.name"},
            ],
            HTTPStatus.OK,
            ["timestamp", "trace_id", "span_id", "service.name"],
            _verify_events_links_skip,
        ),
    ],
)
def test_traces_list_with_select_fields(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    select_fields: list[dict],
    status_code: HTTPStatus,
    expected_keys: list[str],
    verify_values: Callable[[list[dict], list[Traces]], None],
) -> None:
    """
    Setup:
    Insert a root span with no events/links and a child span carrying two
    events and one user-supplied link.

    Tests:
    1. Empty select fields should return all the fields, and the `events` /
       `links` columns should arrive parsed into structured objects (events
       carry `attributes`, links carry only `traceId`/`spanId` — refType is
       dropped at the consume layer).
    2. Non-empty select field should return the select field along with
       timestamp, trace_id and span_id.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    parent_trace_id = TraceIdGenerator.trace_id()
    parent_span_id = TraceIdGenerator.span_id()
    child_span_id = TraceIdGenerator.span_id()
    linked_trace_id = TraceIdGenerator.trace_id()
    linked_span_id = TraceIdGenerator.span_id()

    event_one = TracesEvent(
        name="request_received",
        timestamp=now - timedelta(seconds=3, microseconds=500_000),
        attribute_map={"http.method": "GET", "http.route": "/api/chat"},
    )
    event_two = TracesEvent(
        name="cache_lookup",
        timestamp=now - timedelta(seconds=3, microseconds=400_000),
        attribute_map={"cache.hit": "true", "cache.key": "user:123:prompt"},
    )
    user_link = TracesLink(
        trace_id=linked_trace_id,
        span_id=linked_span_id,
        ref_type=TracesRefType.REF_TYPE_FOLLOWS_FROM,
    )

    traces = [
        # Root span: no events, no links. Verifies the empty-case parsed shape.
        Traces(
            timestamp=now - timedelta(seconds=4),
            duration=timedelta(seconds=3),
            trace_id=parent_trace_id,
            span_id=parent_span_id,
            parent_span_id="",
            name="root span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "events-links-service"},
            attributes={"http.request.method": "GET"},
        ),
        # Child span: two events + one user-supplied link. The fixture
        # auto-inserts a CHILD_OF link for the parent, so the parsed response
        # contains two links total — the auto-inserted one first.
        Traces(
            timestamp=now - timedelta(seconds=3),
            duration=timedelta(seconds=1),
            trace_id=parent_trace_id,
            span_id=child_span_id,
            parent_span_id=parent_span_id,
            name="child span",
            kind=TracesKind.SPAN_KIND_INTERNAL,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "events-links-service"},
            attributes={"http.request.method": "GET"},
            events=[event_one, event_two],
            links=[user_link],
        ),
    ]

    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    payload = {
        "type": "builder_query",
        "spec": {
            "name": "A",
            "signal": "traces",
            "filter": {"expression": "resource.service.name = 'events-links-service'"},
            "selectFields": select_fields,
            "order": [{"key": {"name": "timestamp"}, "direction": "asc"}],
            "limit": 10,
        },
    }

    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="raw",
        queries=[payload],
    )
    assert response.status_code == status_code

    if response.status_code != HTTPStatus.OK:
        return

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 2
    for row in rows:
        assert set(row["data"].keys()) == set(expected_keys)

    verify_values(rows, traces)
