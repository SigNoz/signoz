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


def test_logs_time_series_count(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_jwt_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert 17 logs with service.name attribute set to "java" and severity_text attribute set to "DEBUG", 23 logs with service.name attribute set to "erlang" and severity_text attribute set to "ERROR", 29 logs with service.name attribute set to "go" and severity_text attribute set to "WARNING".
    All logs have incrementing code.line attribute, modulo 2 for host.name and cloud.account.id.

    Tests:
    1. count() of all logs for the last 5 minutes
    2. count() of all logs where code.line = 7 for last 5 minutes
    3. count() of all logs where service.name = "erlang" OR cloud.account.id = "000" for last 5 minutes
    4. count() of all logs grouped by host.name for the last 5 minutes
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = []

    for i in range(17):
        logs.append(
            Logs(
                timestamp=now
                - timedelta(
                    microseconds=i + 1
                ),  # These logs will be grouped in the now - 1 minute bucket
                resources={
                    "deployment.environment": "production",
                    "service.name": "java",
                    "os.type": "linux",
                    "host.name": f"linux-00{i%2}",
                    "cloud.provider": "integration",
                    "cloud.account.id": f"00{i%2}",
                },
                attributes={
                    "log.iostream": "stdout",
                    "logtag": "F",
                    "code.file": "/opt/Integration.java",
                    "code.function": "com.example.Integration.process",
                    "code.line": i + 1,
                    "telemetry.sdk.language": "java",
                },
                body=f"This is a log message, number {i+1} coming from a java application",
                severity_text="DEBUG",
            )
        )
    for i in range(23):
        logs.append(
            Logs(
                timestamp=now
                - timedelta(minutes=1)
                - timedelta(
                    microseconds=i + 1
                ),  # These logs will be grouped in the now - 2 minute bucket
                resources={
                    "deployment.environment": "production",
                    "service.name": "erlang",
                    "os.type": "linux",
                    "host.name": f"linux-00{i%2}",
                    "cloud.provider": "integration",
                    "cloud.account.id": f"00{i%2}",
                },
                attributes={
                    "log.iostream": "stdout",
                    "logtag": "F",
                    "code.file": "/opt/Integration.erlang",
                    "code.function": "com.example.Integration.process",
                    "code.line": i + 1,
                    "telemetry.sdk.language": "erlang",
                },
                body=f"This is a log message, number {i+1} coming from a erlang application",
                severity_text="ERROR",
            )
        )
    for i in range(29):
        logs.append(
            Logs(
                timestamp=now
                - timedelta(minutes=2)
                - timedelta(
                    microseconds=i + 1
                ),  # These logs will be grouped in the now - 3 minute bucket
                resources={
                    "deployment.environment": "production",
                    "service.name": "go",
                    "os.type": "linux",
                    "host.name": f"linux-00{i%2}",
                    "cloud.provider": "integration",
                    "cloud.account.id": f"00{i%2}",
                },
                attributes={
                    "log.iostream": "stdout",
                    "logtag": "F",
                    "code.file": "/opt/Integration.go",
                    "code.function": "com.example.Integration.process",
                    "code.line": i + 1,
                    "telemetry.sdk.language": "go",
                },
                body=f"This is a log message, number {i+1} coming from a go application",
                severity_text="WARNING",
            )
        )
    insert_logs(logs)

    token = get_jwt_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # count() of all logs for the last 5 minutes
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int(
                (
                    datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
                    - timedelta(minutes=5)
                ).timestamp()
                * 1000
            ),
            "end": int(
                datetime.now(tz=timezone.utc)
                .replace(second=0, microsecond=0)
                .timestamp()
                * 1000
            ),
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "stepInterval": 60,
                            "disabled": False,
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

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) == 1

    values = series[0]["values"]
    assert len(values) == 3

    # Care about the order of the values
    assert [
        i
        for i in values
        if i
        not in [
            {
                "timestamp": int(
                    (now - timedelta(minutes=3))
                    .replace(second=0, microsecond=0)
                    .timestamp()
                    * 1000
                ),
                "value": 29,
            },
            {
                "timestamp": int(
                    (now - timedelta(minutes=2))
                    .replace(second=0, microsecond=0)
                    .timestamp()
                    * 1000
                ),
                "value": 23,
            },
            {
                "timestamp": int(
                    (now - timedelta(minutes=1))
                    .replace(second=0, microsecond=0)
                    .timestamp()
                    * 1000
                ),
                "value": 17,
            },
        ]
    ] == []

    # count() of all logs where code.line = 7 for last 5 minutes
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int(
                (
                    datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
                    - timedelta(minutes=5)
                ).timestamp()
                * 1000
            ),
            "end": int(
                datetime.now(tz=timezone.utc)
                .replace(second=0, microsecond=0)
                .timestamp()
                * 1000
            ),
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "stepInterval": 60,
                            "disabled": False,
                            "filter": {"expression": "code.line = 7"},
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

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) == 1

    values = series[0]["values"]
    assert len(values) == 3

    # Care about the order of the values
    assert [
        i
        for i in values
        if i
        not in [
            {
                "timestamp": int(
                    (now - timedelta(minutes=3))
                    .replace(second=0, microsecond=0)
                    .timestamp()
                    * 1000
                ),
                "value": 1,
            },
            {
                "timestamp": int(
                    (now - timedelta(minutes=2))
                    .replace(second=0, microsecond=0)
                    .timestamp()
                    * 1000
                ),
                "value": 1,
            },
            {
                "timestamp": int(
                    (now - timedelta(minutes=1))
                    .replace(second=0, microsecond=0)
                    .timestamp()
                    * 1000
                ),
                "value": 1,
            },
        ]
    ] == []

    # count() of all logs where service.name = "erlang" OR cloud.account.id = "000" for last 5 minutes
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int(
                (
                    datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
                    - timedelta(minutes=5)
                ).timestamp()
                * 1000
            ),
            "end": int(
                datetime.now(tz=timezone.utc)
                .replace(second=0, microsecond=0)
                .timestamp()
                * 1000
            ),
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "stepInterval": 60,
                            "disabled": False,
                            "filter": {
                                "expression": "service.name = 'erlang' OR cloud.account.id = '000'"
                            },
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

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) == 1

    values = series[0]["values"]
    assert len(values) == 3

    # Do not care about the order of the values
    assert {
        "timestamp": int(
            (now - timedelta(minutes=3)).replace(second=0, microsecond=0).timestamp()
            * 1000
        ),
        "value": 15,
    } in values
    assert {
        "timestamp": int(
            (now - timedelta(minutes=2)).replace(second=0, microsecond=0).timestamp()
            * 1000
        ),
        "value": 23,
    } in values
    assert {
        "timestamp": int(
            (now - timedelta(minutes=1)).replace(second=0, microsecond=0).timestamp()
            * 1000
        ),
        "value": 9,
    } in values

    # count() of all logs grouped by host.name for the last 5 minutes
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int(
                (
                    datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
                    - timedelta(minutes=5)
                ).timestamp()
                * 1000
            ),
            "end": int(
                datetime.now(tz=timezone.utc)
                .replace(second=0, microsecond=0)
                .timestamp()
                * 1000
            ),
            "requestType": "time_series",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "stepInterval": 60,
                            "disabled": False,
                            "groupBy": [
                                {
                                    "name": "host.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "resource",
                                }
                            ],
                            "order": [
                                {"key": {"name": "host.name"}, "direction": "desc"}
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

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) == 2

    # Care about the order of the values
    assert series[0]["labels"] == [
        {
            "key": {
                "name": "host.name",
                "signal": "",
                "fieldContext": "",
                "fieldDataType": "",
            },
            "value": "linux-001",
        }
    ]
    assert {
        "timestamp": int(
            (now - timedelta(minutes=3)).replace(second=0, microsecond=0).timestamp()
            * 1000
        ),
        "value": 14,
    } in series[0]["values"]
    assert {
        "timestamp": int(
            (now - timedelta(minutes=2)).replace(second=0, microsecond=0).timestamp()
            * 1000
        ),
        "value": 11,
    } in series[0]["values"]
    assert {
        "timestamp": int(
            (now - timedelta(minutes=1)).replace(second=0, microsecond=0).timestamp()
            * 1000
        ),
        "value": 8,
    } in series[0]["values"]

    assert series[1]["labels"] == [
        {
            "key": {
                "name": "host.name",
                "signal": "",
                "fieldContext": "",
                "fieldDataType": "",
            },
            "value": "linux-000",
        }
    ]
    assert {
        "timestamp": int(
            (now - timedelta(minutes=3)).replace(second=0, microsecond=0).timestamp()
            * 1000
        ),
        "value": 15,
    } in series[1]["values"]
    assert {
        "timestamp": int(
            (now - timedelta(minutes=2)).replace(second=0, microsecond=0).timestamp()
            * 1000
        ),
        "value": 12,
    } in series[1]["values"]
    assert {
        "timestamp": int(
            (now - timedelta(minutes=1)).replace(second=0, microsecond=0).timestamp()
            * 1000
        ),
        "value": 9,
    } in series[1]["values"]
