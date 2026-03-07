from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import List

import requests

from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


def format_timestamp(dt: datetime) -> str:
    """
    Format a datetime object to match the API's timestamp format.
    The API returns timestamps with minimal fractional seconds precision.
    Example: 2026-02-03T20:54:56.5Z for 500000 microseconds
    """
    base_str = dt.strftime("%Y-%m-%dT%H:%M:%S")
    if dt.microsecond:
        # Convert microseconds to fractional seconds and strip trailing zeros
        fractional = f"{dt.microsecond / 1000000:.6f}"[2:].rstrip("0")
        return f"{base_str}.{fractional}Z"
    return f"{base_str}Z"


def assert_identical_query_response(
    response1: requests.Response, response2: requests.Response
) -> None:
    """
    Assert that two query responses are identical in status and data.
    """
    assert response1.status_code == response2.status_code, "Status codes do not match"
    if response1.status_code == HTTPStatus.OK:
        assert (
            response1.json()["status"] == response2.json()["status"]
        ), "Response statuses do not match"
        assert (
            response1.json()["data"]["data"]["results"]
            == response2.json()["data"]["data"]["results"]
        ), "Response data do not match"


def generate_traces_with_corrupt_metadata() -> List[Traces]:
    """
    Specifically, entries with 'id', 'timestamp', 'trace_id' and 'duration_nano' fields in metadata
    """
    http_service_trace_id = TraceIdGenerator.trace_id()
    http_service_span_id = TraceIdGenerator.span_id()
    http_service_db_span_id = TraceIdGenerator.span_id()
    http_service_patch_span_id = TraceIdGenerator.span_id()
    topic_service_trace_id = TraceIdGenerator.trace_id()
    topic_service_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    return [
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
                "trace_id": "corrupt_data",
            },
            attributes={
                "net.transport": "IP.TCP",
                "http.scheme": "http",
                "http.user_agent": "Integration Test",
                "http.request.method": "POST",
                "http.response.status_code": "200",
                "timestamp": "corrupt_data",
            },
        ),
        Traces(
            timestamp=now - timedelta(seconds=3.5),
            duration=timedelta(seconds=5),
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
                "timestamp": "corrupt_data",
            },
            attributes={
                "db.name": "integration",
                "db.operation": "SELECT",
                "db.statement": "SELECT * FROM integration",
                "trace_d": "corrupt_data",
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
                "duration_nano": "corrupt_data",
            },
            attributes={
                "http.request.method": "PATCH",
                "http.status_code": "404",
                "id": "1",
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
                "duration_nano": "corrupt_data",
                "id": 1,
            },
        ),
    ]
