from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    BuilderQuery,
    OrderBy,
    RequestType,
    TelemetryFieldKey,
    assert_identical_query_response,
    get_rows,
    make_query_request,
)


def test_logs_list(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Insert 2 logs with different attributes

    Tests:
    1. Query logs for the last 10 seconds and check if the logs are returned in the correct order
    2. Query values of severity_text attribute from the autocomplete API
    3. Query values of severity_text attribute from the fields API
    4. Query values of code.file attribute from the autocomplete API
    5. Query values of code.file attribute from the fields API
    6. Query values of code.line attribute from the autocomplete API
    7. Query values of code.line attribute from the fields API
    """
    insert_logs(
        [
            Logs(
                timestamp=datetime.now(tz=UTC) - timedelta(seconds=1),
                resources={
                    "deployment.environment": "production",
                    "service.name": "java",
                    "os.type": "linux",
                    "host.name": "linux-001",
                    "cloud.provider": "integration",
                    "cloud.account.id": "001",
                },
                attributes={
                    "log.iostream": "stdout",
                    "logtag": "F",
                    "code.file": "/opt/Integration.java",
                    "code.function": "com.example.Integration.process",
                    "code.line": 120,
                    "telemetry.sdk.language": "java",
                },
                body="This is a log message, coming from a java application",
                severity_text="DEBUG",
            ),
            Logs(
                timestamp=datetime.now(tz=UTC),
                resources={
                    "deployment.environment": "production",
                    "service.name": "go",
                    "os.type": "linux",
                    "host.name": "linux-001",
                    "cloud.provider": "integration",
                    "cloud.account.id": "001",
                },
                attributes={
                    "log.iostream": "stdout",
                    "logtag": "F",
                    "code.file": "/opt/integration.go",
                    "code.function": "com.example.Integration.process",
                    "code.line": 120,
                    "metric.domain_id": "d-001",
                    "telemetry.sdk.language": "go",
                },
                body="This is a log message, coming from a go application",
                severity_text="INFO",
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Query Logs for the last 10 seconds and check if the logs are returned in the correct order
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int((datetime.now(tz=UTC) - timedelta(seconds=10)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).timestamp() * 1000),
            "requestType": "raw",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "disabled": False,
                            "limit": 100,
                            "offset": 0,
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                                {"key": {"name": "id"}, "direction": "desc"},
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

    assert rows[0]["data"]["body"] == "This is a log message, coming from a go application"
    assert rows[0]["data"]["resources_string"] == {
        "cloud.account.id": "001",
        "cloud.provider": "integration",
        "deployment.environment": "production",
        "host.name": "linux-001",
        "os.type": "linux",
        "service.name": "go",
    }
    assert rows[0]["data"]["attributes_string"] == {
        "code.file": "/opt/integration.go",
        "code.function": "com.example.Integration.process",
        "log.iostream": "stdout",
        "logtag": "F",
        "metric.domain_id": "d-001",
        "telemetry.sdk.language": "go",
    }
    assert rows[0]["data"]["attributes_number"] == {"code.line": 120}

    assert rows[1]["data"]["body"] == "This is a log message, coming from a java application"
    assert rows[1]["data"]["resources_string"] == {
        "cloud.account.id": "001",
        "cloud.provider": "integration",
        "deployment.environment": "production",
        "host.name": "linux-001",
        "os.type": "linux",
        "service.name": "java",
    }
    assert rows[1]["data"]["attributes_string"] == {
        "code.file": "/opt/Integration.java",
        "code.function": "com.example.Integration.process",
        "log.iostream": "stdout",
        "logtag": "F",
        "telemetry.sdk.language": "java",
    }
    assert rows[1]["data"]["attributes_number"] == {"code.line": 120}

    # Query values of severity_text attribute from the autocomplete API
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/autocomplete/attribute_values"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "aggregateOperator": "noop",
            "dataSource": "logs",
            "aggregateAttribute": "",
            "attributeKey": "severity_text",
            "searchText": "",
            "filterAttributeKeyDataType": "string",
            "tagType": "resource",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["stringAttributeValues"]
    assert len(values) == 2
    assert "DEBUG" in values
    assert "INFO" in values

    # Query values of severity_text attribute from the fields API
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "signal": "logs",
            "name": "severity_text",
            "searchText": "",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert len(values) == 2
    assert "DEBUG" in values
    assert "INFO" in values

    # Query values of code.file attribute from the autocomplete API
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/autocomplete/attribute_values"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "aggregateOperator": "noop",
            "dataSource": "logs",
            "aggregateAttribute": "",
            "attributeKey": "code.file",
            "searchText": "",
            "filterAttributeKeyDataType": "string",
            "tagType": "tag",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["stringAttributeValues"]
    assert len(values) == 2
    assert "/opt/Integration.java" in values
    assert "/opt/integration.go" in values

    # Query values of code.file attribute from the fields API
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "signal": "logs",
            "name": "code.file",
            "searchText": "",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert len(values) == 2
    assert "/opt/Integration.java" in values
    assert "/opt/integration.go" in values

    # Query values of code.line attribute from the autocomplete API
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/autocomplete/attribute_values"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "aggregateOperator": "noop",
            "dataSource": "logs",
            "aggregateAttribute": "",
            "attributeKey": "code.line",
            "searchText": "",
            "filterAttributeKeyDataType": "float64",
            "tagType": "tag",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["numberAttributeValues"]
    assert len(values) == 1
    assert 120 in values

    # Query values of code.line attribute from the fields API
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "signal": "logs",
            "name": "code.line",
            "searchText": "",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["numberValues"]
    assert len(values) == 1
    assert 120 in values

    # Query keys from the fields API with context specified in the key
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "signal": "logs",
            "searchText": "resource.servic",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    keys = response.json()["data"]["keys"]
    assert "service.name" in keys
    assert any(k["fieldContext"] == "resource" for k in keys["service.name"])

    # Do not treat `metric.` as a context prefix for logs
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "signal": "logs",
            "searchText": "metric.do",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    keys = response.json()["data"]["keys"]
    assert "metric.domain_id" in keys

    # Query values of service.name resource attribute using context-prefixed key
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "signal": "logs",
            "name": "resource.service.name",
            "searchText": "",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert "go" in values
    assert "java" in values

    # Query values of metric.domain_id (string attribute) and ensure context collision doesn't break it
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        params={
            "signal": "logs",
            "name": "metric.domain_id",
            "searchText": "",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert "d-001" in values


@pytest.mark.parametrize(
    "order_by_context,expected_order",
    ####
    #    Tests:
    #    1. Query logs ordered by attribute.service.name descending
    #    2. Query logs ordered by resource.service.name descending
    #    3. Query logs ordered by service.name descending
    ###
    [
        pytest.param("attribute", ["log-002", "log-001", "log-004", "log-003"]),
        pytest.param("resource", ["log-003", "log-004", "log-001", "log-002"]),
        pytest.param("", ["log-002", "log-001", "log-003", "log-004"]),
    ],
)
def test_logs_list_with_order_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    order_by_context: str,
    expected_order: list[str],
) -> None:
    """
    Setup:
    Insert 3 logs with service.name in attributes and resources
    """

    attribute_resource_pair = [
        [{"id": "log-001", "service.name": "c"}, {}],
        [{"id": "log-002", "service.name": "d"}, {}],
        [{"id": "log-003"}, {"service.name": "b"}],
        [{"id": "log-004"}, {"service.name": "a"}],
    ]
    insert_logs(
        [
            Logs(
                timestamp=datetime.now(tz=UTC) - timedelta(seconds=3),
                attributes=attribute_resource_pair[i][0],
                resources=attribute_resource_pair[i][1],
                body="Log with DEBUG severity",
                severity_text="DEBUG",
            )
            for i in range(4)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = {
        "type": "builder_query",
        "spec": {
            "name": "A",
            "signal": "logs",
            "order": [
                {
                    "key": {
                        "name": "service.name",
                        "fieldContext": order_by_context,
                    },
                    "direction": "desc",
                }
            ],
        },
    }

    query_with_inline_context = {
        "type": "builder_query",
        "spec": {
            "name": "A",
            "signal": "logs",
            "order": [
                {
                    "key": {
                        "name": f"{order_by_context + '.' if order_by_context else ''}service.name",
                    },
                    "direction": "desc",
                }
            ],
        },
    }

    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=1)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="raw",
        queries=[query],
    )

    # Verify that both queries return the same results with specifying context with key name
    response_with_inline_context = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=1)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="raw",
        queries=[query_with_inline_context],
    )

    assert_identical_query_response(response, response_with_inline_context)

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    rows = results[0]["rows"]
    ids = [row["data"]["attributes_string"].get("id", "") for row in rows]

    assert ids == expected_order


@pytest.mark.parametrize("direction", ["desc", "asc"])
def test_logs_list_cursor_pages_every_row_once(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    direction: str,
) -> None:
    """
    Setup:
    7 logs: one alone in its millisecond at each end, 5 inside one millisecond,
    3 of them at the same instant.

    Tests:
    Paging by nextCursor with limit 2 returns every log once, ordered by
    timestamp then id, although page boundaries fall inside the shared
    millisecond and inside the shared instant.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    shared = now - timedelta(seconds=5) + timedelta(microseconds=300)
    instants = [
        now - timedelta(seconds=6),
        shared,
        shared + timedelta(microseconds=1),
        shared + timedelta(microseconds=2),
        shared + timedelta(microseconds=2),
        shared + timedelta(microseconds=2),
        now - timedelta(seconds=4),
    ]
    logs = [Logs(timestamp=instant, resources={"service.name": "cursor-service"}, body=f"log-{i}") for i, instant in enumerate(instants)]
    insert_logs(logs)
    expected = [log.id for log in sorted(logs, key=lambda log: (int(log.timestamp), log.id), reverse=direction == "desc")]

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    seen: list[str] = []
    cursor = None
    for _ in range(len(logs) + 1):
        response = make_query_request(
            signoz,
            token,
            start_ms=int((now - timedelta(minutes=1)).timestamp() * 1000),
            end_ms=int((now + timedelta(seconds=1)).timestamp() * 1000),
            request_type=RequestType.RAW,
            queries=[
                BuilderQuery(
                    signal="logs",
                    limit=2,
                    cursor=cursor,
                    filter_expression="service.name = 'cursor-service'",
                    order=[OrderBy(TelemetryFieldKey("timestamp"), direction), OrderBy(TelemetryFieldKey("id"), direction)],
                ).to_dict()
            ],
        )
        assert response.status_code == HTTPStatus.OK, response.text
        seen += [row["data"]["id"] for row in get_rows(response)]
        cursor = response.json()["data"]["data"]["results"][0].get("nextCursor")
        if not cursor:
            break

    assert seen == expected


@pytest.mark.parametrize(
    "order,offset,cursor,message",
    [
        pytest.param(["timestamp", "id"], 2, "MTc5MzA0MDgzNjc5NQ==", "offset cannot be combined with cursor, got offset 2", id="offset_with_cursor"),
        pytest.param(["timestamp"], 0, "MTc5MzA0MDgzNjc5NQ==", "cursor needs a raw query ordered by timestamp first", id="order_without_id"),
        pytest.param(["timestamp", "id"], 0, "not-a-cursor", 'invalid cursor "not-a-cursor"', id="invalid_cursor"),
    ],
)
def test_logs_list_cursor_rejections(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    order: list[str],
    offset: int,
    cursor: str,
    message: str,
) -> None:
    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                signal="logs",
                limit=2,
                offset=offset,
                cursor=cursor,
                order=[OrderBy(TelemetryFieldKey(name), "desc") for name in order],
            ).to_dict()
        ],
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert message in response.json()["error"]["message"], response.text
