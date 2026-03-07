from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Any, Callable, Dict, List

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    assert_minutely_bucket_values,
    find_named_result,
    index_series_by_label,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode
from src.querier.util import (
    assert_identical_query_response,
    format_timestamp,
    generate_traces_with_corrupt_metadata,
)


def test_traces_list(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
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

    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

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
            "start": int(
                (datetime.now(tz=timezone.utc) - timedelta(minutes=5)).timestamp()
                * 1000
            ),
            "end": int(datetime.now(tz=timezone.utc).timestamp() * 1000),
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
        start_ms=int(
            (datetime.now(tz=timezone.utc) - timedelta(minutes=5)).timestamp() * 1000
        ),
        end_ms=int(datetime.now(tz=timezone.utc).timestamp() * 1000),
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
            "start": int(
                (datetime.now(tz=timezone.utc) - timedelta(minutes=5)).timestamp()
                * 1000
            ),
            "end": int(datetime.now(tz=timezone.utc).timestamp() * 1000),
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
        # Case 1: order by timestamp field which there in attributes as well
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
                x[3].duration_nano,
                x[3].name,
                x[3].response_status_code,
                x[3].service_name,
                x[3].span_id,
                format_timestamp(x[3].timestamp),
                x[3].trace_id,
            ],  # type: Callable[[List[Traces]], List[Any]]
        ),
        # Case 2: order by attribute timestamp field which is there in attributes as well
        # This should break but it doesn't because attribute.timestamp gets adjusted to timestamp
        # because of default trace.timestamp gets added by default and bug in field mapper picks
        # instrinsic field
        pytest.param(
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "disabled": False,
                    "order": [
                        {"key": {"name": "attribute.timestamp"}, "direction": "desc"}
                    ],
                    "limit": 1,
                },
            },
            HTTPStatus.OK,
            lambda x: [
                x[3].duration_nano,
                x[3].name,
                x[3].response_status_code,
                x[3].service_name,
                x[3].span_id,
                format_timestamp(x[3].timestamp),
                x[3].trace_id,
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
        # This doesn't return any data because of where_clause using aliased timestamp
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
            lambda x: [],  # type: Callable[[List[Traces]], List[Any]]
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
    insert_traces: Callable[[List[Traces]], None],
    payload: Dict[str, Any],
    status_code: HTTPStatus,
    results: Callable[[List[Traces]], List[Any]],
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
        start_ms=int(
            (datetime.now(tz=timezone.utc) - timedelta(minutes=5)).timestamp() * 1000
        ),
        end_ms=int(datetime.now(tz=timezone.utc).timestamp() * 1000),
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


@pytest.mark.parametrize(
    "order_by,aggregation_alias,expected_status",
    [
        # Case 1a: count by count()
        pytest.param({"name": "count()"}, "count_", HTTPStatus.OK),
        # Case 1b: count by count() with alias span.count_
        pytest.param({"name": "count()"}, "span.count_", HTTPStatus.OK),
        # Case 2a: count by count() with context specified in the key
        pytest.param(
            {"name": "count()", "fieldContext": "span"}, "count_", HTTPStatus.OK
        ),
        # Case 2b: count by count() with context specified in the key with alias span.count_
        pytest.param(
            {"name": "count()", "fieldContext": "span"}, "span.count_", HTTPStatus.OK
        ),
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
        pytest.param(
            {"name": "span.count()", "fieldContext": ""}, "count_", HTTPStatus.OK
        ),
        # Case 4b: count by span.count() and context specified in the key with alias span.count_
        pytest.param(
            {"name": "span.count()", "fieldContext": ""}, "span.count_", HTTPStatus.OK
        ),
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
    insert_traces: Callable[[List[Traces]], None],
    order_by: Dict[str, str],
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

    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

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
        start_ms=int(
            (datetime.now(tz=timezone.utc) - timedelta(minutes=5)).timestamp() * 1000
        ),
        end_ms=int(datetime.now(tz=timezone.utc).timestamp() * 1000),
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
    insert_traces: Callable[[List[Traces]], None],
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

    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

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
        start_ms=int(
            (datetime.now(tz=timezone.utc) - timedelta(minutes=5)).timestamp() * 1000
        ),
        end_ms=int(datetime.now(tz=timezone.utc).timestamp() * 1000),
        request_type="time_series",
        queries=[query],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    aggregations = results[0]["aggregations"]

    assert (
        aggregations[0]["series"][0]["values"][0]["value"] >= 2.5 * 1e9
    )  # p99 for http-service


def test_traces_fill_gaps(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Test fillGaps for traces without groupBy.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    trace_id = TraceIdGenerator.trace_id()

    traces: List[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "test-service"},
            attributes={"http.method": "GET"},
        ),
    ]
    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": False,
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": True},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) >= 1

    values = series[0]["values"]
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)
    assert_minutely_bucket_values(
        values,
        now,
        expected_by_ts={ts_min_3: 1},
        context="traces/fillGaps",
    )


def test_traces_fill_gaps_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Test fillGaps for traces with groupBy.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    traces: List[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-a",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "service-a"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-b",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "service-b"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": False,
                            "groupBy": [
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
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": True},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) == 2, "Expected 2 series for 2 service groups"

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    series_by_service = index_series_by_label(series, "service.name")
    assert set(series_by_service.keys()) == {"service-a", "service-b"}

    expectations: Dict[str, Dict[int, float]] = {
        "service-a": {ts_min_3: 1},
        "service-b": {ts_min_2: 1},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"traces/fillGaps/{service_name}",
        )


def test_traces_fill_gaps_formula(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Test fillGaps for traces with formula.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    traces: List[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "test"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="another-test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "another-test"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "filter": {"expression": "service.name = 'test'"},
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "filter": {"expression": "service.name = 'another-test'"},
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_formula",
                        "spec": {
                            "name": "F1",
                            "expression": "A + B",
                            "disabled": False,
                        },
                    },
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": True},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    f1 = find_named_result(results, "F1")
    assert f1 is not None, "Expected formula result named F1"

    aggregations = f1.get("aggregations") or []
    assert len(aggregations) == 1
    series = aggregations[0]["series"]
    assert len(series) >= 1

    assert_minutely_bucket_values(
        series[0]["values"],
        now,
        expected_by_ts={ts_min_3: 1, ts_min_2: 1},
        context="traces/fillGaps/F1",
    )


def test_traces_fill_gaps_formula_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Test fillGaps for traces with formula and groupBy.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    traces: List[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-group1",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "group1"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-group2",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "group2"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_formula",
                        "spec": {
                            "name": "F1",
                            "expression": "A + B",
                            "disabled": False,
                        },
                    },
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": True},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    f1 = find_named_result(results, "F1")
    assert f1 is not None, "Expected formula result named F1"

    aggregations = f1.get("aggregations") or []
    assert len(aggregations) == 1
    series = aggregations[0]["series"]
    assert len(series) == 2

    series_by_service = index_series_by_label(series, "service.name")
    assert set(series_by_service.keys()) == {"group1", "group2"}

    expectations: Dict[str, Dict[int, float]] = {
        "group1": {ts_min_3: 2},
        "group2": {ts_min_2: 2},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"traces/fillGaps/F1/{service_name}",
        )


def test_traces_fill_zero(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Test fillZero function for traces without groupBy.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    traces: List[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "test"},
            attributes={"http.method": "GET"},
        ),
    ]
    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": False,
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                            "functions": [{"name": "fillZero"}],
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

    aggregations = results[0].get("aggregations") or []
    assert len(aggregations) == 1
    series = aggregations[0]["series"]
    assert len(series) >= 1
    values = series[0]["values"]

    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)
    assert_minutely_bucket_values(
        values,
        now,
        expected_by_ts={ts_min_3: 1},
        context="traces/fillZero",
    )


def test_traces_fill_zero_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Test fillZero function for traces with groupBy.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    traces: List[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-a",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "service-a"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-b",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "service-b"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": False,
                            "groupBy": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                            "functions": [{"name": "fillZero"}],
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

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) == 2, "Expected 2 series for 2 service groups"

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    series_by_service = index_series_by_label(series, "service.name")
    assert set(series_by_service.keys()) == {"service-a", "service-b"}

    expectations: Dict[str, Dict[int, float]] = {
        "service-a": {ts_min_3: 1},
        "service-b": {ts_min_2: 1},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"traces/fillZero/{service_name}",
        )


def test_traces_fill_zero_formula(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Test fillZero function for traces with formula.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    traces: List[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "test"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="another-test-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "another-test"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "filter": {"expression": "service.name = 'test'"},
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "filter": {"expression": "service.name = 'another-test'"},
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_formula",
                        "spec": {
                            "name": "F1",
                            "expression": "A + B",
                            "disabled": False,
                            "functions": [{"name": "fillZero"}],
                        },
                    },
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    f1 = find_named_result(results, "F1")
    assert f1 is not None, "Expected formula result named F1"
    aggregations = f1.get("aggregations") or []
    assert len(aggregations) == 1
    series = aggregations[0]["series"]
    assert len(series) >= 1

    assert_minutely_bucket_values(
        series[0]["values"],
        now,
        expected_by_ts={ts_min_3: 1, ts_min_2: 1},
        context="traces/fillZero/F1",
    )


def test_traces_fill_zero_formula_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Test fillZero function for traces with formula and groupBy.
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    traces: List[Traces] = [
        Traces(
            timestamp=now - timedelta(minutes=3),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-group1",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "group1"},
            attributes={"http.method": "GET"},
        ),
        Traces(
            timestamp=now - timedelta(minutes=2),
            duration=timedelta(seconds=1),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            parent_span_id="",
            name="span-group2",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            status_message="",
            resources={"service.name": "group2"},
            attributes={"http.method": "POST"},
        ),
    ]
    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "B",
                            "signal": "traces",
                            "stepInterval": 60,
                            "disabled": True,
                            "groupBy": [
                                {
                                    "name": "service.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    },
                    {
                        "type": "builder_formula",
                        "spec": {
                            "name": "F1",
                            "expression": "A + B",
                            "disabled": False,
                            "functions": [{"name": "fillZero"}],
                        },
                    },
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    ts_min_2 = int((now - timedelta(minutes=2)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    f1 = find_named_result(results, "F1")
    assert f1 is not None, "Expected formula result named F1"
    aggregations = f1.get("aggregations") or []
    assert len(aggregations) == 1
    series = aggregations[0]["series"]
    assert len(series) == 2

    series_by_service = index_series_by_label(series, "service.name")
    assert set(series_by_service.keys()) == {"group1", "group2"}

    expectations: Dict[str, Dict[int, float]] = {
        "group1": {ts_min_3: 2},
        "group2": {ts_min_2: 2},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"traces/fillZero/F1/{service_name}",
        )
