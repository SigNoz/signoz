from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    assert_identical_query_response,
    assert_minutely_bucket_values,
    build_formula_query,
    build_group_by_field,
    build_logs_aggregation,
    build_order_by,
    build_scalar_query,
    find_named_result,
    index_series_by_label,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


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


def test_logs_fill_gaps(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Test fillGaps for logs without groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=3),
            resources={"service.name": "test-service"},
            attributes={"code.file": "test.py"},
            body="Log at minute 3",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "test-service"},
            attributes={"code.file": "test.py"},
            body="Log at minute 1",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

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
                            "signal": "logs",
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
    # Logs are exactly at minute -3 and minute -1, so counts should be 1 there and 0 everywhere else
    ts_min_1 = int((now - timedelta(minutes=1)).timestamp() * 1000)
    ts_min_3 = int((now - timedelta(minutes=3)).timestamp() * 1000)

    assert_minutely_bucket_values(
        values,
        now,
        expected_by_ts={ts_min_1: 1, ts_min_3: 1},
        context="logs/fillGaps",
    )


def test_logs_fill_gaps_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Test fillGaps for logs with groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=3),
            resources={"service.name": "service-a"},
            attributes={"code.file": "test.py"},
            body="Log from service A",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=2),
            resources={"service.name": "service-b"},
            attributes={"code.file": "test.py"},
            body="Log from service B",
            severity_text="ERROR",
        ),
    ]
    insert_logs(logs)

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
                            "signal": "logs",
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

    # service-a has one log at minute -3, service-b at minute -2
    expectations = {
        "service-a": {ts_min_3: 1.0},
        "service-b": {ts_min_2: 1.0},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"logs/fillGaps/{service_name}",
        )


def test_logs_fill_gaps_formula(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Test fillGaps for logs with formula.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=3),
            resources={"service.name": "test"},
            attributes={"code.file": "test.py"},
            body="Test log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=2),
            resources={"service.name": "another-test"},
            attributes={"code.file": "test.py"},
            body="Another test log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

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
                            "signal": "logs",
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
                            "signal": "logs",
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
        context="logs/fillGaps/F1",
    )


def test_logs_fill_gaps_formula_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Test fillGaps for logs with formula and groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=3),
            resources={"service.name": "group1"},
            attributes={"code.file": "test.py"},
            body="Test log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=2),
            resources={"service.name": "group2"},
            attributes={"code.file": "test.py"},
            body="Test log 2",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

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
                            "signal": "logs",
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
                            "signal": "logs",
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

    expectations = {
        "group1": {ts_min_3: 2.0},
        "group2": {ts_min_2: 2.0},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"logs/fillGaps/F1/{service_name}",
        )


def test_logs_fill_zero(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Test fillZero function for logs without groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=3),
            resources={"service.name": "test"},
            attributes={"code.file": "test.py"},
            body="Test log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

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
                            "signal": "logs",
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
        context="logs/fillZero",
    )


def test_logs_fill_zero_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Test fillZero function for logs with groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=3),
            resources={"service.name": "service-a"},
            attributes={"code.file": "test.py"},
            body="Log A",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=2),
            resources={"service.name": "service-b"},
            attributes={"code.file": "test.py"},
            body="Log B",
            severity_text="ERROR",
        ),
    ]
    insert_logs(logs)

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
                            "signal": "logs",
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
    expectations = {
        "service-a": {ts_min_3: 1.0},
        "service-b": {ts_min_2: 1.0},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"logs/fillZero/{service_name}",
        )


def test_logs_fill_zero_formula(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Test fillZero function for logs with formula.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=3),
            resources={"service.name": "test"},
            attributes={"code.file": "test.py"},
            body="Test log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=2),
            resources={"service.name": "another-test"},
            attributes={"code.file": "test.py"},
            body="Another log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

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
                            "signal": "logs",
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
                            "signal": "logs",
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
    values = series[0]["values"]

    assert_minutely_bucket_values(
        values,
        now,
        expected_by_ts={ts_min_3: 1, ts_min_2: 1},
        context="logs/fillZero/F1",
    )


def test_logs_fill_zero_formula_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Test fillZero function for logs with formula and groupBy.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=3),
            resources={"service.name": "group1"},
            attributes={"code.file": "test.py"},
            body="Test log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=2),
            resources={"service.name": "group2"},
            attributes={"code.file": "test.py"},
            body="Test log 2",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

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
                            "signal": "logs",
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
                            "signal": "logs",
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

    expectations = {
        "group1": {ts_min_3: 2.0},
        "group2": {ts_min_2: 2.0},
    }

    for service_name, s in series_by_service.items():
        assert_minutely_bucket_values(
            s["values"],
            now,
            expected_by_ts=expectations[service_name],
            context=f"logs/fillZero/F1/{service_name}",
        )


def test_logs_formula_orderby_and_limit(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Test that formula results are correctly ordered and limited when
    order and limit are applied on the formula.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs: list[Logs] = []
    # For service-i (i in 0..9): insert (10 - i) ERROR logs and 2 INFO logs.
    # A counts ERROR, B counts INFO, so A/B = (10 - i) / 2.
    # service-0 ratio = 5.0 (highest), service-9 ratio = 0.5 (lowest).
    for i in range(10):
        for j in range(10 - i):
            logs.append(
                Logs(
                    timestamp=now - timedelta(minutes=j + 1),
                    resources={"service.name": f"service-{i}"},
                    attributes={"code.file": "test.py"},
                    body=f"Error log {i}-{j}",
                    severity_text="ERROR",
                )
            )
        for k in range(2):
            logs.append(
                Logs(
                    timestamp=now - timedelta(minutes=k + 1),
                    resources={"service.name": f"service-{i}"},
                    attributes={"code.file": "test.py"},
                    body=f"Info log {i}-{k}",
                    severity_text="INFO",
                )
            )
    # Extra INFO-only services that appear in B but not in A. The formula
    for name in ("service-info-only-1", "service-info-only-2"):
        for k in range(2):
            logs.append(
                Logs(
                    timestamp=now - timedelta(minutes=k + 1),
                    resources={"service.name": name},
                    attributes={"code.file": "test.py"},
                    body=f"Info log {name}-{k}",
                    severity_text="INFO",
                )
            )

    # Logs look like this (columns = minutes before `now`; query range is
    # (now - 15m, now], so the `now` column is the exclusive upper bound and
    # no log lands there). E = ERROR, I = INFO, X = both at that minute.
    #
    #              t-10 t-9 t-8 t-7 t-6 t-5 t-4 t-3 t-2 t-1 |now |  A  B  A/B
    # service-0:    E   E   E   E   E   E   E   E   X   X  |    | 10  2  5.0
    # service-1:    .   E   E   E   E   E   E   E   X   X  |    |  9  2  4.5
    # service-2:    .   .   E   E   E   E   E   E   X   X  |    |  8  2  4.0
    # service-3:    .   .   .   E   E   E   E   E   X   X  |    |  7  2  3.5
    # service-4:    .   .   .   .   E   E   E   E   X   X  |    |  6  2  3.0
    # service-5:    .   .   .   .   .   E   E   E   X   X  |    |  5  2  2.5
    # service-6:    .   .   .   .   .   .   E   E   X   X  |    |  4  2  2.0
    # service-7:    .   .   .   .   .   .   .   E   X   X  |    |  3  2  1.5
    # service-8:    .   .   .   .   .   .   .   .   X   X  |    |  2  2  1.0
    # service-9:    .   .   .   .   .   .   .   .   I   X  |    |  1  2  0.5
    # info-only-1:  .   .   .   .   .   .   .   .   I   I  |    |  0* 2  0.0
    # info-only-2:  .   .   .   .   .   .   .   .   I   I  |    |  0* 2  0.0
    #
    # * A is missing for the info-only services; because A is count(), the
    #   formula evaluator defaults missing A to 0, yielding A/B = 0.
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    result = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=15)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="scalar",
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[build_logs_aggregation("count()")],
                group_by=[build_group_by_field("service.name")],
                filter_expression="severity_text = 'ERROR'",
                disabled=True,
            ),
            build_scalar_query(
                name="B",
                signal="logs",
                aggregations=[build_logs_aggregation("count()")],
                group_by=[build_group_by_field("service.name")],
                filter_expression="severity_text = 'INFO'",
                disabled=True,
            ),
            build_formula_query(
                "F1",
                "A / B",
                order=[build_order_by("__result", "desc")],
                limit=3,
            ),
            build_formula_query(
                "F2",
                "A / B",
                order=[build_order_by("__result", "desc")],
            ),
            build_formula_query(
                "F3",
                "A / B",
                order=[build_order_by("__result", "asc")],
                limit=3,
            ),
            build_formula_query(
                "F4",
                "A / B",
                order=[build_order_by("__result", "asc")],
            ),
        ],
    )
    assert result.status_code == HTTPStatus.OK
    assert result.json()["status"] == "success"

    results = result.json()["data"]["data"]["results"]

    def extract_services_and_values(query_name: str) -> tuple[list, list]:
        res = find_named_result(results, query_name)
        assert res is not None, f"Expected formula result named {query_name}"
        cols = res["columns"]
        s_col = next(i for i, c in enumerate(cols) if c["name"] == "service.name")
        v_col = next(i for i, c in enumerate(cols) if c["name"] == "__result")
        rows = res["data"]
        return [row[s_col] for row in rows], [row[v_col] for row in rows]

    # Because A is count(), canDefaultZero["A"] is true; the formula evaluator
    # defaults A to 0 for services that exist only in B. So the two INFO-only
    # services appear in the formula result with value 0.0 (extreme bottom in
    # desc order, extreme top in asc order). Their relative ordering is not
    # deterministic across separate formula evaluations (tied values).
    info_only_services = {"service-info-only-1", "service-info-only-2"}

    # F2: desc, no limit -> 12 rows in descending order by value.
    f2_services, f2_values = extract_services_and_values("F2")
    assert len(f2_services) == 12, f"F2: expected 12 rows with no limit, got {len(f2_services)}"
    assert f2_values == [5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0, 0.0], f2_values
    # Top 10 have distinct positive values -> deterministic service ordering.
    assert f2_services[:10] == [f"service-{i}" for i in range(10)], f2_services[:10]
    # Tail 2 are the INFO-only services tied at 0.0 (order between them not guaranteed).
    assert set(f2_services[10:]) == info_only_services, f2_services[10:]

    # F1: desc + limit 3 -> must be exactly the first 3 rows of F2.
    # Top 3 are not in the tie region, so prefix equality is safe.
    f1_services, f1_values = extract_services_and_values("F1")
    assert len(f1_services) == 3, f"F1: expected 3 rows after limit, got {len(f1_services)}"
    assert f1_services == f2_services[:3], f"F1 services {f1_services} are not the prefix of F2 services {f2_services}"
    assert f1_values == f2_values[:3], f"F1 values {f1_values} are not the prefix of F2 values {f2_values}"

    # F4: asc, no limit -> 12 rows in ascending order by value.
    f4_services, f4_values = extract_services_and_values("F4")
    assert len(f4_services) == 12, f"F4: expected 12 rows with no limit, got {len(f4_services)}"
    assert f4_values == sorted(f4_values), f"F4 not ascending: {f4_values}"
    # First 2 are the INFO-only services tied at 0.0 (order between them not guaranteed).
    assert set(f4_services[:2]) == info_only_services, f4_services[:2]
    assert f4_values[:2] == [0.0, 0.0], f4_values[:2]
    # Tail 10 are service-9 down to service-0 by value.
    assert f4_services[2:] == [f"service-{i}" for i in reversed(range(10))], f4_services[2:]
    assert f4_values[2:] == [(10 - i) / 2 for i in reversed(range(10))], f4_values[2:]

    # F3: asc + limit 3 -> values must match F4[:3] exactly; service set must
    # match too. Direct prefix equality on services would be flaky because the
    # two tied INFO-only entries can swap order between formula evaluations.
    f3_services, f3_values = extract_services_and_values("F3")
    assert len(f3_services) == 3, f"F3: expected 3 rows after limit, got {len(f3_services)}"
    assert f3_values == f4_values[:3], f"F3 values {f3_values} do not match F4[:3] values {f4_values[:3]}"
    assert set(f3_services) == set(f4_services[:3]), f"F3 services {f3_services} do not match F4[:3] services {f4_services[:3]}"


def test_logs_list_filter_by_trace_id(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Tests that filtering logs by trace_id uses the trace_summary lookup to
    narrow the query window before scanning the logs table:
    1. Returns the matching log (narrow window, single bucket).
    2. Does not return duplicate logs when the query window should span multiple
       exponential buckets (>1 h). But is clamped to the timerange of trace.
    3. Returns no results when the query window does not contain the trace.
    4. Logs carrying a trace_id whose trace is NOT in trace_summary (e.g.
       traces disabled) are still returned — the lookup miss must not
       short-circuit logs queries.
    """
    target_trace_id = TraceIdGenerator.trace_id()
    orphan_trace_id = TraceIdGenerator.trace_id()
    target_root_span_id = TraceIdGenerator.span_id()
    target_child_span_id = TraceIdGenerator.span_id()
    orphan_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    common_resources = {
        "deployment.environment": "production",
        "service.name": "logs-trace-filter-service",
        "cloud.provider": "integration",
    }

    # Populate signoz_traces.distributed_trace_summary by inserting spans for
    # the target trace_id. trace_summary records min/max of span timestamps
    # (it ignores span duration), so two spans are inserted to give the trace
    # a non-trivial recorded window of [now-10s, now-5s].
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=1),
                trace_id=target_trace_id,
                span_id=target_root_span_id,
                parent_span_id="",
                name="root-span",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources=common_resources,
                attributes={},
            ),
            Traces(
                timestamp=now - timedelta(seconds=5),
                duration=timedelta(seconds=1),
                trace_id=target_trace_id,
                span_id=target_child_span_id,
                parent_span_id=target_root_span_id,
                name="child-span",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources=common_resources,
                attributes={},
            ),
        ]
    )

    # Insert logs:
    # - one with the target trace_id, at a timestamp within the trace's
    #   recorded window (now-10s..now-5s, padded ±1s).
    # - one with an orphan trace_id whose trace was never ingested — used to
    #   verify the lookup miss does NOT short-circuit logs queries.
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=7),
                resources=common_resources,
                attributes={"http.method": "GET"},
                body="log inside the target trace window",
                severity_text="INFO",
                trace_id=target_trace_id,
                span_id=target_root_span_id,
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources=common_resources,
                attributes={"http.method": "PUT"},
                body="log with a trace_id absent from trace_summary",
                severity_text="INFO",
                trace_id=orphan_trace_id,
                span_id=orphan_span_id,
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def _query(start_ms: int, end_ms: int, trace_id: str) -> tuple[list, list[str]]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type="raw",
            queries=[
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "logs",
                        "disabled": False,
                        "limit": 100,
                        "offset": 0,
                        "filter": {"expression": f"trace_id = '{trace_id}'"},
                        "order": [
                            {"key": {"name": "timestamp"}, "direction": "desc"},
                            {"key": {"name": "id"}, "direction": "desc"},
                        ],
                    },
                }
            ],
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json()["status"] == "success"
        rows = response.json()["data"]["data"]["results"][0]["rows"] or []
        warning = (response.json().get("data") or {}).get("warning") or {}
        messages = [w.get("message", "") for w in (warning.get("warnings") or [])]
        return rows, messages

    outside_range_msg = "lies outside the selected time range"

    now_ms = int(now.timestamp() * 1000)

    # --- Test 1: narrow window (single bucket, <1 h) ---
    narrow_start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    narrow_rows, narrow_warnings = _query(narrow_start_ms, now_ms, target_trace_id)

    assert len(narrow_rows) == 1, f"Expected 1 log for trace_id filter (narrow window), got {len(narrow_rows)}"
    assert narrow_rows[0]["data"]["trace_id"] == target_trace_id
    assert narrow_rows[0]["data"]["span_id"] == target_root_span_id
    assert not any(outside_range_msg in m for m in narrow_warnings), f"Did not expect outside-range warning, got {narrow_warnings}"

    # --- Test 2: wide window (>1 h, clamp to the timerange from trace_summary) ---
    # Should still return exactly one log — no duplicates from multi-bucket scan.
    wide_start_ms = int((now - timedelta(hours=12)).timestamp() * 1000)
    wide_rows, wide_warnings = _query(wide_start_ms, now_ms, target_trace_id)

    assert len(wide_rows) == 1, f"Expected 1 log for trace_id filter (wide window, multi-bucket), got {len(wide_rows)} — possible duplicate-log regression"
    assert wide_rows[0]["data"]["trace_id"] == target_trace_id
    assert wide_rows[0]["data"]["span_id"] == target_root_span_id
    assert not any(outside_range_msg in m for m in wide_warnings), f"Did not expect outside-range warning, got {wide_warnings}"

    # --- Test 3: window that does not contain the trace returns no results + warning ---
    past_start_ms = int((now - timedelta(hours=6)).timestamp() * 1000)
    past_end_ms = int((now - timedelta(hours=2)).timestamp() * 1000)
    past_rows, past_warnings = _query(past_start_ms, past_end_ms, target_trace_id)

    assert len(past_rows) == 0, f"Expected 0 logs for trace_id filter outside time window, got {len(past_rows)}"
    assert any(outside_range_msg in m for m in past_warnings), f"Expected outside-range warning, got warnings={past_warnings}"

    # --- Test 4: trace_id not present in trace_summary still returns logs (no warning) ---
    orphan_rows, orphan_warnings = _query(narrow_start_ms, now_ms, orphan_trace_id)

    assert len(orphan_rows) == 1, f"Expected 1 log for orphan trace_id (no trace_summary entry), got {len(orphan_rows)} — logs query may have been incorrectly short-circuited"
    assert orphan_rows[0]["data"]["trace_id"] == orphan_trace_id
    assert not any(outside_range_msg in m for m in orphan_warnings), f"Did not expect outside-range warning for orphan trace_id, got {orphan_warnings}"


def test_logs_aggregation_filter_by_trace_id(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Tests that the trace_id time-range optimization also applies to
    non-window-list (time_series / aggregation) logs queries:
    1. Wide query window containing the trace returns the correct count.
    2. Query window outside the trace's time range short-circuits to an
       empty result.
    3. A trace_id with no row in trace_summary (e.g. traces disabled) still
       returns the matching logs — the lookup miss must not short-circuit
       logs aggregation queries.
    """
    target_trace_id = TraceIdGenerator.trace_id()
    orphan_trace_id = TraceIdGenerator.trace_id()
    target_root_span_id = TraceIdGenerator.span_id()
    target_child_span_id = TraceIdGenerator.span_id()
    orphan_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    common_resources = {
        "deployment.environment": "production",
        "service.name": "logs-trace-agg-service",
        "cloud.provider": "integration",
    }

    # trace_summary records min/max of span timestamps (it ignores duration),
    # so insert two spans to give the trace a recorded window wide enough to
    # comfortably contain the log timestamps below.
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=1),
                trace_id=target_trace_id,
                span_id=target_root_span_id,
                parent_span_id="",
                name="root-span",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources=common_resources,
                attributes={},
            ),
            Traces(
                timestamp=now - timedelta(seconds=5),
                duration=timedelta(seconds=1),
                trace_id=target_trace_id,
                span_id=target_child_span_id,
                parent_span_id=target_root_span_id,
                name="child-span",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources=common_resources,
                attributes={},
            ),
        ]
    )

    # Two logs for the target trace_id, both inside the recorded trace window.
    # One additional log carries an orphan trace_id with no row in
    # trace_summary — used to verify that the lookup miss does not
    # short-circuit logs aggregations.
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=7),
                resources=common_resources,
                attributes={},
                body="log A inside trace window",
                severity_text="INFO",
                trace_id=target_trace_id,
                span_id=target_root_span_id,
            ),
            Logs(
                timestamp=now - timedelta(seconds=6),
                resources=common_resources,
                attributes={},
                body="log B inside trace window",
                severity_text="INFO",
                trace_id=target_trace_id,
                span_id=target_root_span_id,
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources=common_resources,
                attributes={},
                body="log with a trace_id absent from trace_summary",
                severity_text="INFO",
                trace_id=orphan_trace_id,
                span_id=orphan_span_id,
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def _count(start_ms: int, end_ms: int, trace_id: str) -> tuple[float, list[str]]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type="time_series",
            queries=[
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "logs",
                        "stepInterval": 60,
                        "disabled": False,
                        "filter": {"expression": f"trace_id = '{trace_id}'"},
                        "having": {"expression": ""},
                        "aggregations": [{"expression": "count()"}],
                    },
                }
            ],
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json()["status"] == "success"
        results = response.json()["data"]["data"]["results"]
        assert len(results) == 1
        warning = (response.json().get("data") or {}).get("warning") or {}
        messages = [w.get("message", "") for w in (warning.get("warnings") or [])]
        aggregations = results[0].get("aggregations") or []
        if not aggregations:
            return 0, messages
        series = aggregations[0].get("series") or []
        if not series:
            return 0, messages
        return sum(v["value"] for v in series[0]["values"]), messages

    outside_range_msg = "lies outside the selected time range"

    now_ms = int(now.timestamp() * 1000)
    narrow_start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)

    # --- Test 1: wide window (>1 h) containing the trace returns 2 logs ---
    wide_start_ms = int((now - timedelta(hours=12)).timestamp() * 1000)
    wide_count, wide_warnings = _count(wide_start_ms, now_ms, target_trace_id)
    assert wide_count == 2, f"Expected count=2 for trace_id aggregation (wide window), got {wide_count}"
    assert not any(outside_range_msg in m for m in wide_warnings), f"Did not expect outside-range warning, got {wide_warnings}"

    # --- Test 2: window outside the trace short-circuits to empty + warning ---
    past_start_ms = int((now - timedelta(hours=6)).timestamp() * 1000)
    past_end_ms = int((now - timedelta(hours=2)).timestamp() * 1000)
    past_count, past_warnings = _count(past_start_ms, past_end_ms, target_trace_id)
    assert past_count == 0, f"Expected count=0 for trace_id aggregation outside time window, got {past_count}"
    assert any(outside_range_msg in m for m in past_warnings), f"Expected outside-range warning, got warnings={past_warnings}"

    # --- Test 3: trace_id not present in trace_summary still returns logs (no warning) ---
    orphan_count, orphan_warnings = _count(narrow_start_ms, now_ms, orphan_trace_id)
    assert orphan_count == 1, f"Expected count=1 for orphan trace_id aggregation, got {orphan_count} — query may have been incorrectly short-circuited"
    assert not any(outside_range_msg in m for m in orphan_warnings), f"Did not expect outside-range warning for orphan trace_id, got {orphan_warnings}"
