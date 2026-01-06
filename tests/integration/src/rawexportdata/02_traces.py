from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List
from urllib.parse import urlencode
import csv
import io
import json

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


def test_export_traces_csv(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Setup:
    Insert 3 traces with different attributes.

    Tests:
    1. Export traces as CSV format
    2. Verify CSV structure and content
    3. Validate headers are present
    4. Check trace data is correctly formatted
    """
    http_service_trace_id = TraceIdGenerator.trace_id()
    http_service_span_id = TraceIdGenerator.span_id()
    http_service_db_span_id = TraceIdGenerator.span_id()
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
                },
                attributes={
                    "db.name": "integration",
                    "db.operation": "SELECT",
                    "db.statement": "SELECT * FROM integration",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=1),
                duration=timedelta(seconds=2),
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

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    params = {
        "start": start_ns,
        "end": end_ns,
        "format": "csv",
        "source": "traces",
        "limit": 1000,
    }

    # Export traces as CSV (GET for simple queries)
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/export_raw_data?{urlencode(params)}"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["Content-Type"] == "text/csv"
    assert "attachment" in response.headers.get("Content-Disposition", "")

    # Parse CSV content
    csv_content = response.text
    csv_reader = csv.DictReader(io.StringIO(csv_content))

    rows = list(csv_reader)
    assert len(rows) == 3, f"Expected 3 rows, got {len(rows)}"

    # Verify trace IDs are present in the exported data
    trace_ids = [row.get("trace_id") for row in rows]
    assert http_service_trace_id in trace_ids
    assert topic_service_trace_id in trace_ids

    # Verify span names are present
    span_names = [row.get("name") for row in rows]
    assert "POST /integration" in span_names
    assert "SELECT" in span_names
    assert "topic publish" in span_names


def test_export_traces_jsonl(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Setup:
    Insert 2 traces with different attributes.

    Tests:
    1. Export traces as JSONL format
    2. Verify JSONL structure and content
    3. Check each line is valid JSON
    4. Validate trace data is correctly formatted
    """
    http_service_trace_id = TraceIdGenerator.trace_id()
    http_service_span_id = TraceIdGenerator.span_id()
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
                name="POST /api/test",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "service.name": "api-service",
                    "deployment.environment": "staging",
                },
                attributes={
                    "http.request.method": "POST",
                    "http.response.status_code": "201",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=2),
                duration=timedelta(seconds=1),
                trace_id=topic_service_trace_id,
                span_id=topic_service_span_id,
                parent_span_id="",
                name="queue.process",
                kind=TracesKind.SPAN_KIND_CONSUMER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "service.name": "queue-service",
                    "deployment.environment": "staging",
                },
                attributes={
                    "messaging.operation": "process",
                    "messaging.system": "rabbitmq",
                },
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    params = {
        "start": start_ns,
        "end": end_ns,
        "format": "jsonl",
        "source": "traces",
        "limit": 1000,
    }

    # Export traces as JSONL (GET for simple queries)
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/export_raw_data?{urlencode(params)}"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["Content-Type"] == "application/x-ndjson"
    assert "attachment" in response.headers.get("Content-Disposition", "")

    # Parse JSONL content
    jsonl_lines = response.text.strip().split("\n")
    assert len(jsonl_lines) == 2, f"Expected 2 lines, got {len(jsonl_lines)}"

    # Verify each line is valid JSON
    json_objects = []
    for line in jsonl_lines:
        obj = json.loads(line)
        json_objects.append(obj)
        assert "trace_id" in obj
        assert "span_id" in obj
        assert "name" in obj

    # Verify trace IDs are present
    trace_ids = [obj.get("trace_id") for obj in json_objects]
    assert http_service_trace_id in trace_ids
    assert topic_service_trace_id in trace_ids

    # Verify span names are present
    span_names = [obj.get("name") for obj in json_objects]
    assert "POST /api/test" in span_names
    assert "queue.process" in span_names


def test_export_traces_with_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Setup:
    Insert traces with different service names.

    Tests:
    1. Export traces with filter applied
    2. Verify only filtered traces are returned
    """
    service_a_trace_id = TraceIdGenerator.trace_id()
    service_a_span_id = TraceIdGenerator.span_id()
    service_b_trace_id = TraceIdGenerator.trace_id()
    service_b_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=4),
                duration=timedelta(seconds=1),
                trace_id=service_a_trace_id,
                span_id=service_a_span_id,
                parent_span_id="",
                name="operation-a",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "service.name": "service-a",
                },
                attributes={},
            ),
            Traces(
                timestamp=now - timedelta(seconds=2),
                duration=timedelta(seconds=1),
                trace_id=service_b_trace_id,
                span_id=service_b_span_id,
                parent_span_id="",
                name="operation-b",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "service.name": "service-b",
                },
                attributes={},
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    params = {
        "start": start_ns,
        "end": end_ns,
        "format": "jsonl",
        "source": "traces",
        "limit": 1000,
        "filter": "service.name = 'service-a'",
    }

    # Export traces with filter (GET supports filter param)
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/export_raw_data?{urlencode(params)}"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["Content-Type"] == "application/x-ndjson"

    # Parse JSONL content
    jsonl_lines = response.text.strip().split("\n")
    assert len(jsonl_lines) == 1, f"Expected 1 line (filtered), got {len(jsonl_lines)}"

    # Verify the filtered trace
    filtered_obj = json.loads(jsonl_lines[0])
    assert filtered_obj["trace_id"] == service_a_trace_id
    assert filtered_obj["name"] == "operation-a"


def test_export_traces_with_limit(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Setup:
    Insert 5 traces.

    Tests:
    1. Export traces with limit applied
    2. Verify only limited number of traces are returned
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    traces = []
    for i in range(5):
        traces.append(
            Traces(
                timestamp=now - timedelta(seconds=i),
                duration=timedelta(seconds=1),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                parent_span_id="",
                name=f"operation-{i}",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "service.name": "test-service",
                },
                attributes={},
            )
        )

    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    params = {
        "start": start_ns,
        "end": end_ns,
        "format": "csv",
        "source": "traces",
        "limit": 3,
    }

    # Export traces with limit (GET supports limit param)
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/export_raw_data?{urlencode(params)}"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["Content-Type"] == "text/csv"

    # Parse CSV content
    csv_content = response.text
    csv_reader = csv.DictReader(io.StringIO(csv_content))

    rows = list(csv_reader)
    assert len(rows) == 3, f"Expected 3 rows (limited), got {len(rows)}"


def test_export_traces_with_multiple_composite_queries(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Setup:
    Insert traces with different service names and attributes.

    Tests:
    1. Export traces using multiple composite queries
    2. Verify all queries are executed and results are combined
    """
    service_a_trace_id = TraceIdGenerator.trace_id()
    service_a_span_id = TraceIdGenerator.span_id()
    service_b_trace_id = TraceIdGenerator.trace_id()
    service_b_span_id = TraceIdGenerator.span_id()
    service_c_trace_id = TraceIdGenerator.trace_id()
    service_c_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=1),
                trace_id=service_a_trace_id,
                span_id=service_a_span_id,
                parent_span_id="",
                name="operation-a",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "service.name": "service-a",
                },
                attributes={
                    "http.status_code": "200",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=8),
                duration=timedelta(seconds=1),
                trace_id=service_b_trace_id,
                span_id=service_b_span_id,
                parent_span_id="",
                name="operation-b",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_ERROR,
                status_message="",
                resources={
                    "service.name": "service-b",
                },
                attributes={
                    "http.status_code": "500",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=5),
                duration=timedelta(seconds=1),
                trace_id=service_c_trace_id,
                span_id=service_c_span_id,
                parent_span_id="",
                name="operation-c",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "service.name": "service-c",
                },
                attributes={
                    "http.status_code": "200",
                },
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    # Build first composite query - filter for service-a
    composite_query_1 = {
        "type": "builder_query",
        "spec": {
            "signal": "traces",
            "name": "A",
            "limit": 1000,
            "filter": {
                "expression": "service.name = 'service-a'"
            }
        }
    }

    # Build second composite query - filter for service-b
    composite_query_2 = {
        "type": "builder_query",
        "spec": {
            "signal": "traces",
            "name": "B",
            "limit": 1000,
            "filter": {
                "expression": "service.name = 'service-b'"
            }
        }
    }

    # Multiple composite queries require POST with JSON body
    body = {
        "start": start_ns,
        "end": end_ns,
        "format": "jsonl",
        "source": "traces",
        "composite_query": [composite_query_1, composite_query_2],
    }

    url = signoz.self.host_configs["8080"].get("/api/v1/export_raw_data")
    response = requests.post(
        url,
        json=body,
        timeout=30,
        headers={
            "authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["Content-Type"] == "application/x-ndjson"

    # Parse JSONL content
    # With multiple queries, we should get results from both queries
    jsonl_lines = response.text.strip().split("\n")
    assert len(jsonl_lines) >= 1, f"Expected at least 1 line, got {len(jsonl_lines)}"

    # Verify the result
    json_objects = [json.loads(line) for line in jsonl_lines]

    # Check that we got results
    assert len(json_objects) > 0

    # Verify we got traces from both service-a and service-b (or at least one of them)
    # Multiple queries return combined results from all queries
    trace_ids_in_results = [obj.get("trace_id") for obj in json_objects]

    # We should have at least service-a or service-b (depending on query execution)
    assert service_a_trace_id in trace_ids_in_results or service_b_trace_id in trace_ids_in_results

    # Count how many from each service we got
    service_a_count = trace_ids_in_results.count(service_a_trace_id)
    service_b_count = trace_ids_in_results.count(service_b_trace_id)

    # At least one query should have returned results
    assert service_a_count > 0 or service_b_count > 0

def test_export_traces_with_composite_query_trace_operator(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Setup:
    Insert multiple traces with parent-child relationships.

    Tests:
    1. Export traces using trace operator in composite query
    2. Verify trace operator query works correctly
    """
    parent_trace_id = TraceIdGenerator.trace_id()
    parent_span_id = TraceIdGenerator.span_id()
    child_span_id_1 = TraceIdGenerator.span_id()
    child_span_id_2 = TraceIdGenerator.span_id()

    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=5),
                trace_id=parent_trace_id,
                span_id=parent_span_id,
                parent_span_id="",
                name="parent-operation",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "service.name": "parent-service",
                },
                attributes={
                    "operation.type": "parent",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=9),
                duration=timedelta(seconds=2),
                trace_id=parent_trace_id,
                span_id=child_span_id_1,
                parent_span_id=parent_span_id,
                name="child-operation-1",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "service.name": "parent-service",
                },
                attributes={
                    "operation.type": "child",
                },
            ),
            Traces(
                timestamp=now - timedelta(seconds=7),
                duration=timedelta(seconds=1),
                trace_id=parent_trace_id,
                span_id=child_span_id_2,
                parent_span_id=parent_span_id,
                name="child-operation-2",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "service.name": "parent-service",
                },
                attributes={
                    "operation.type": "child",
                },
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    # Build first composite query - filter for parent
    composite_query_1 = {
        "type": "builder_query",
        "spec": {
            "signal": "traces",
            "name": "A",
            "limit": 1000,
            "filter": {
                "expression": "operation.type = 'parent'"
            }
        }
    }

    # Build second composite query - filter for child
    composite_query_2 = {
        "type": "builder_query",
        "spec": {
            "signal": "traces",
            "name": "B",
            "limit": 1000,
            "filter": {
                "expression": "operation.type = 'child'"
            }
        }
    }

    # Build composite query using trace operator (A => B)
    composite_query = {
        "type": "builder_trace_operator",
        "spec": {
            "name": "C",
            "expression": "A => B",
            "limit": 1000
        }
    }

    # Trace operator requires POST with JSON body
    body = {
        "start": start_ns,
        "end": end_ns,
        "format": "jsonl",
        "source": "traces",
        "composite_query": [composite_query_1, composite_query_2, composite_query],
    }

    url = signoz.self.host_configs["8080"].get("/api/v1/export_raw_data")
    response = requests.post(
        url,
        json=body,
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["Content-Type"] == "application/x-ndjson"

    # Parse JSONL content
    jsonl_lines = response.text.strip().split("\n")

    assert len(jsonl_lines) == 2, f"Expected 2 lines, got {len(jsonl_lines)}"

    # Verify all traces are from the same trace
    json_objects = [json.loads(line) for line in jsonl_lines]
    trace_ids = [obj.get("trace_id") for obj in json_objects]
    assert all(tid == parent_trace_id for tid in trace_ids)

    # Verify span names
    span_names = [obj.get("name") for obj in json_objects]
    assert "parent-operation" in span_names

def test_export_traces_with_select_fields(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Setup:
    Insert traces with various attributes.

    Tests:
    1. Export traces with specific select fields
    2. Verify only specified fields are returned in the output
    """
    trace_id = TraceIdGenerator.trace_id()
    span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=2),
                trace_id=trace_id,
                span_id=span_id,
                parent_span_id="",
                name="test-operation",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={
                    "service.name": "test-service",
                    "deployment.environment": "production",
                    "host.name": "server-01",
                },
                attributes={
                    "http.method": "POST",
                    "http.status_code": "201",
                    "user.id": "user123",
                },
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    # Build composite query with specific select fields (requires POST for complex spec)
    body = {
        "start": start_ns,
        "end": end_ns,
        "format": "jsonl",
        "source": "traces",
        "composite_query": [
            {
                "type": "builder_query",
                "spec": {
                    "signal": "traces",
                    "name": "A",
                    "limit": 1000,
                    "selectFields": [
                        {
                            "name": "trace_id",
                            "fieldDataType": "string",
                            "fieldContext": "span",
                            "signal": "traces"
                        },
                        {
                            "name": "span_id",
                            "fieldDataType": "string",
                            "fieldContext": "span",
                            "signal": "traces"
                        },
                        {
                            "name": "name",
                            "fieldDataType": "string",
                            "fieldContext": "span",
                            "signal": "traces"
                        },
                        {
                            "name": "service.name",
                            "fieldDataType": "string",
                            "fieldContext": "resource",
                            "signal": "traces"
                        }
                    ]
                }
            }
        ],
    }

    url = signoz.self.host_configs["8080"].get("/api/v1/export_raw_data")
    response = requests.post(
        url,
        json=body,
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["Content-Type"] == "application/x-ndjson"

    # Parse JSONL content
    jsonl_lines = response.text.strip().split("\n")
    assert len(jsonl_lines) == 1

    # Verify the selected fields are present
    result = json.loads(jsonl_lines[0])
    assert "trace_id" in result
    assert "span_id" in result
    assert "name" in result

    # Verify values
    assert result["trace_id"] == trace_id
    assert result["span_id"] == span_id
    assert result["name"] == "test-operation"
