from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.traces import Traces, generate_span_id, generate_trace_id


def test_traces_list(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_jwt_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """
    Setup:
    Insert 2 traces with different attributes

    Tests:
    1. Query traces for the last 5 minutes and check if the traces are returned in the correct order
    """
    http_service_trace_id = generate_trace_id()
    http_service_span_id = generate_span_id()

    topic_service_trace_id = generate_trace_id()
    topic_service_span_id = generate_span_id()
    insert_traces(
        [
            Traces(
                timestamp=datetime.now(tz=timezone.utc) - timedelta(seconds=4),
                duration=timedelta(seconds=2),
                trace_id=http_service_trace_id,
                span_id=http_service_span_id,
                parent_span_id="",
                name="POST /integration",
                kind=1,
                status_code=1,
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
                timestamp=datetime.now(tz=timezone.utc) - timedelta(seconds=1),
                duration=timedelta(seconds=4),
                trace_id=topic_service_trace_id,
                span_id=topic_service_span_id,
                parent_span_id="",
                name="topic publish",
                kind=1,
                status_code=1,
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

    token = get_jwt_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

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
                (datetime.now(tz=timezone.utc) - timedelta(seconds=10)).timestamp()
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

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    rows = results[0]["rows"]
    assert len(rows) == 2

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

    row_1 = dict(rows[1]["data"])
    assert row_1.pop("timestamp") is not None
    assert row_1 == {
        "duration_nano": 2 * 1e9,
        "http_method": "POST",
        "name": "POST /integration",
        "response_status_code": "200",
        "service.name": "http-service",
        "span_id": http_service_span_id,
        "trace_id": http_service_trace_id,
    }
