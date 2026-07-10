from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    assert_identical_query_response,
    make_query_request,
)


def test_logs_time_series_count(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
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
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = []

    for i in range(17):
        logs.append(
            Logs(
                timestamp=now - timedelta(microseconds=i + 1),  # These logs will be grouped in the now - 1 minute bucket
                resources={
                    "deployment.environment": "production",
                    "service.name": "java",
                    "os.type": "linux",
                    "host.name": f"linux-00{i % 2}",
                    "cloud.provider": "integration",
                    "cloud.account.id": f"00{i % 2}",
                },
                attributes={
                    "log.iostream": "stdout",
                    "logtag": "F",
                    "code.file": "/opt/Integration.java",
                    "code.function": "com.example.Integration.process",
                    "code.line": i + 1,
                    "telemetry.sdk.language": "java",
                },
                body=f"This is a log message, number {i + 1} coming from a java application",
                severity_text="DEBUG",
            )
        )
    for i in range(23):
        logs.append(
            Logs(
                timestamp=now - timedelta(minutes=1) - timedelta(microseconds=i + 1),  # These logs will be grouped in the now - 2 minute bucket
                resources={
                    "deployment.environment": "production",
                    "service.name": "erlang",
                    "os.type": "linux",
                    "host.name": f"linux-00{i % 2}",
                    "cloud.provider": "integration",
                    "cloud.account.id": f"00{i % 2}",
                },
                attributes={
                    "log.iostream": "stdout",
                    "logtag": "F",
                    "code.file": "/opt/Integration.erlang",
                    "code.function": "com.example.Integration.process",
                    "code.line": i + 1,
                    "telemetry.sdk.language": "erlang",
                },
                body=f"This is a log message, number {i + 1} coming from a erlang application",
                severity_text="ERROR",
            )
        )
    for i in range(29):
        logs.append(
            Logs(
                timestamp=now - timedelta(minutes=2) - timedelta(microseconds=i + 1),  # These logs will be grouped in the now - 3 minute bucket
                resources={
                    "deployment.environment": "production",
                    "service.name": "go",
                    "os.type": "linux",
                    "host.name": f"linux-00{i % 2}",
                    "cloud.provider": "integration",
                    "cloud.account.id": f"00{i % 2}",
                },
                attributes={
                    "log.iostream": "stdout",
                    "logtag": "F",
                    "code.file": "/opt/Integration.go",
                    "code.function": "com.example.Integration.process",
                    "code.line": i + 1,
                    "telemetry.sdk.language": "go",
                },
                body=f"This is a log message, number {i + 1} coming from a go application",
                severity_text="WARNING",
            )
        )
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # count() of all logs for the last 5 minutes
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int((datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).replace(second=0, microsecond=0).timestamp() * 1000),
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
                "timestamp": int((now - timedelta(minutes=3)).replace(second=0, microsecond=0).timestamp() * 1000),
                "value": 29,
            },
            {
                "timestamp": int((now - timedelta(minutes=2)).replace(second=0, microsecond=0).timestamp() * 1000),
                "value": 23,
            },
            {
                "timestamp": int((now - timedelta(minutes=1)).replace(second=0, microsecond=0).timestamp() * 1000),
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
            "start": int((datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).replace(second=0, microsecond=0).timestamp() * 1000),
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
                "timestamp": int((now - timedelta(minutes=3)).replace(second=0, microsecond=0).timestamp() * 1000),
                "value": 1,
            },
            {
                "timestamp": int((now - timedelta(minutes=2)).replace(second=0, microsecond=0).timestamp() * 1000),
                "value": 1,
            },
            {
                "timestamp": int((now - timedelta(minutes=1)).replace(second=0, microsecond=0).timestamp() * 1000),
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
            "start": int((datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).replace(second=0, microsecond=0).timestamp() * 1000),
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
                            "filter": {"expression": "service.name = 'erlang' OR cloud.account.id = '000'"},
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
        "timestamp": int((now - timedelta(minutes=3)).replace(second=0, microsecond=0).timestamp() * 1000),
        "value": 15,
    } in values
    assert {
        "timestamp": int((now - timedelta(minutes=2)).replace(second=0, microsecond=0).timestamp() * 1000),
        "value": 23,
    } in values
    assert {
        "timestamp": int((now - timedelta(minutes=1)).replace(second=0, microsecond=0).timestamp() * 1000),
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
            "start": int((datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).replace(second=0, microsecond=0).timestamp() * 1000),
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
                            "order": [{"key": {"name": "host.name"}, "direction": "desc"}],
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )

    response_with_inline_context = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).replace(second=0, microsecond=0).timestamp() * 1000),
        request_type="time_series",
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "logs",
                    "stepInterval": 60,
                    "disabled": False,
                    "groupBy": [
                        {
                            "name": "resource.host.name:string",
                        }
                    ],
                    "order": [{"key": {"name": "host.name"}, "direction": "desc"}],
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

    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1

    series = aggregations[0]["series"]
    assert len(series) == 2

    # Care about the order of the values
    assert series[0]["labels"] == [
        {
            "key": {
                "name": "host.name",
            },
            "value": "linux-001",
        }
    ]
    assert {
        "timestamp": int((now - timedelta(minutes=3)).replace(second=0, microsecond=0).timestamp() * 1000),
        "value": 14,
    } in series[0]["values"]
    assert {
        "timestamp": int((now - timedelta(minutes=2)).replace(second=0, microsecond=0).timestamp() * 1000),
        "value": 11,
    } in series[0]["values"]
    assert {
        "timestamp": int((now - timedelta(minutes=1)).replace(second=0, microsecond=0).timestamp() * 1000),
        "value": 8,
    } in series[0]["values"]

    assert series[1]["labels"] == [
        {
            "key": {
                "name": "host.name",
            },
            "value": "linux-000",
        }
    ]
    assert {
        "timestamp": int((now - timedelta(minutes=3)).replace(second=0, microsecond=0).timestamp() * 1000),
        "value": 15,
    } in series[1]["values"]
    assert {
        "timestamp": int((now - timedelta(minutes=2)).replace(second=0, microsecond=0).timestamp() * 1000),
        "value": 12,
    } in series[1]["values"]
    assert {
        "timestamp": int((now - timedelta(minutes=1)).replace(second=0, microsecond=0).timestamp() * 1000),
        "value": 9,
    } in series[1]["values"]


def test_datatype_collision(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Insert logs with data type collision scenarios to test DataTypeCollisionHandledFieldName function

    Tests:
    1. severity_number comparison with string value
    2. http.status_code with mixed string/number values
    3. response.time with string values in numeric field
    4. Edge cases: empty strings
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = []

    # Logs with string values in numeric fields
    severity_levels = ["DEBUG", "INFO", "WARN"]
    for i in range(3):
        logs.append(
            Logs(
                timestamp=now - timedelta(microseconds=i + 1),
                resources={
                    "deployment.environment": "production",
                    "service.name": "java",
                    "os.type": "linux",
                    "host.name": f"linux-00{i % 2}",
                    "cloud.provider": "integration",
                    "cloud.account.id": f"00{i % 2}",
                },
                attributes={
                    "log.iostream": "stdout",
                    "logtag": "F",
                    "code.file": "/opt/Integration.java",
                    "code.function": "com.example.Integration.process",
                    "code.line": i + 1,
                    "telemetry.sdk.language": "java",
                    "http.status_code": "200",  # String value
                    "response.time": "123.45",  # String value
                },
                body=f"Test log {i + 1} with string values",
                severity_text=severity_levels[i],  # DEBUG(5-8), INFO(9-12), WARN(13-16)
            )
        )

    # Logs with numeric values in string fields
    severity_levels_2 = ["ERROR", "FATAL", "TRACE", "DEBUG"]
    for i in range(4):
        logs.append(
            Logs(
                timestamp=now - timedelta(microseconds=i + 10),
                resources={
                    "deployment.environment": "production",
                    "service.name": "go",
                    "os.type": "linux",
                    "host.name": f"linux-00{i % 2}",
                    "cloud.provider": "integration",
                    "cloud.account.id": f"00{i % 2}",
                },
                attributes={
                    "log.iostream": "stdout",
                    "logtag": "F",
                    "code.file": "/opt/integration.go",
                    "code.function": "com.example.Integration.process",
                    "code.line": i + 1,
                    "telemetry.sdk.language": "go",
                    "http.status_code": 404,  # Numeric value
                    "response.time": 456.78,  # Numeric value
                },
                body=f"Test log {i + 4} with numeric values",
                severity_text=severity_levels_2[i],  # ERROR(17-20), FATAL(21-24), TRACE(1-4), DEBUG(5-8)
            )
        )

    # Edge case: empty string and zero value
    logs.append(
        Logs(
            timestamp=now - timedelta(microseconds=20),
            resources={
                "deployment.environment": "production",
                "service.name": "python",
                "os.type": "linux",
                "host.name": "linux-002",
                "cloud.provider": "integration",
                "cloud.account.id": "002",
            },
            attributes={
                "log.iostream": "stdout",
                "logtag": "F",
                "code.file": "/opt/integration.py",
                "code.function": "com.example.Integration.process",
                "code.line": 1,
                "telemetry.sdk.language": "python",
                "http.status_code": "",  # Empty string
                "response.time": 0,  # Zero value
            },
            body="Edge case test log",
            severity_text="ERROR",
        )
    )

    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # count() of all logs for the where severity_number > '7'
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int((datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).replace(second=0, microsecond=0).timestamp() * 1000),
            "requestType": "scalar",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "stepInterval": 60,
                            "disabled": False,
                            "filter": {"expression": "severity_number > '7'"},
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": True, "fillGaps": False},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    count = results[0]["data"][0][0]
    assert count == 5

    # count() of all logs for the where severity_number > '7.0'
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int((datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).replace(second=0, microsecond=0).timestamp() * 1000),
            "requestType": "scalar",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "stepInterval": 60,
                            "disabled": False,
                            "filter": {"expression": "severity_number > '7.0'"},
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": True, "fillGaps": False},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    count = results[0]["data"][0][0]
    assert count == 5

    # Test 2: severity_number comparison with string value
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int((datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).replace(second=0, microsecond=0).timestamp() * 1000),
            "requestType": "scalar",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "stepInterval": 60,
                            "disabled": False,
                            "filter": {"expression": "severity_number = '13'"},  # String comparison with numeric field
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": True, "fillGaps": False},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    count = results[0]["data"][0][0]
    # WARN severity maps to 13-16 range, so should find 1 log with severity_number = 13
    assert count == 1

    # Test 3: http.status_code with numeric value (query contains number, actual value is string "200")
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int((datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).replace(second=0, microsecond=0).timestamp() * 1000),
            "requestType": "scalar",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "stepInterval": 60,
                            "disabled": False,
                            "filter": {"expression": "http.status_code = 200"},  # Numeric comparison with string field
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": True, "fillGaps": False},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    count = results[0]["data"][0][0]
    # Should return 3 logs with http.status_code = "200" (first 3 logs have string value "200")
    assert count == 3

    # Test 4: http.status_code with string value (query contains string, actual value is numeric 404)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int((datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).replace(second=0, microsecond=0).timestamp() * 1000),
            "requestType": "scalar",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "stepInterval": 60,
                            "disabled": False,
                            "filter": {"expression": "http.status_code = '404'"},  # String comparison with numeric field
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": True, "fillGaps": False},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    count = results[0]["data"][0][0]
    # Should return 4 logs with http.status_code = 404 (next 4 logs have numeric value 404)
    assert count == 4

    # Test 5: Edge case - empty string comparison
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={
            "authorization": f"Bearer {token}",
        },
        json={
            "schemaVersion": "v1",
            "start": int((datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(datetime.now(tz=UTC).replace(second=0, microsecond=0).timestamp() * 1000),
            "requestType": "scalar",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "stepInterval": 60,
                            "disabled": False,
                            "filter": {"expression": "http.status_code = ''"},  # Empty string comparison
                            "having": {"expression": ""},
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": True, "fillGaps": False},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    count = results[0]["data"][0][0]
    # Should return 1 log with empty http.status_code (edge case log)
    assert count == 1
