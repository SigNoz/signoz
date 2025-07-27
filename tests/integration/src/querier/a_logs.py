from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs


def test_logs_list(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_jwt_token: Callable[[], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    insert_logs(
        [
            Logs(
                timestamp=datetime.now(tz=timezone.utc) - timedelta(seconds=1),
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
                timestamp=datetime.now(tz=timezone.utc),
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
                    "telemetry.sdk.language": "go",
                },
                body="This is a log message, coming from a go application",
                severity_text="INFO",
            ),
        ]
    )

    token = get_jwt_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # Query Logs for the last 10 seconds and check if the logs are returned in the correct order
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

    assert (
        rows[0]["data"]["body"] == "This is a log message, coming from a go application"
    )
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
        "telemetry.sdk.language": "go",
    }
    assert rows[0]["data"]["attributes_number"] == {"code.line": 120}

    assert (
        rows[1]["data"]["body"]
        == "This is a log message, coming from a java application"
    )
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

    # Query values of severity_text attribute
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

    # Query values of code.file attribute
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

    # Query values of code.line attribute
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

    print(response.json())
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["numberAttributeValues"]
    assert len(values) == 1
    assert 120 in values
