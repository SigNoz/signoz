import csv
import io
import json
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import BuilderQuery, OrderBy, QueryRangeRequest, TelemetryFieldKey


def test_export_raw_data_get_not_allowed(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Tests:
    1. GET request to export_raw_data is rejected with 405 Method Not Allowed
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/export_raw_data"),
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == HTTPStatus.METHOD_NOT_ALLOWED


def test_export_logs_csv(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert 3 logs with different severity levels and attributes.

    Tests:
    1. Export logs as CSV format
    2. Verify CSV structure and content
    3. Validate headers are present
    4. Check log data is correctly formatted
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=10),
                body="Application started successfully",
                severity_text="INFO",
                resources={
                    "service.name": "api-service",
                    "deployment.environment": "production",
                    "host.name": "server-01",
                },
                attributes={
                    "http.method": "GET",
                    "http.status_code": 200,
                    "user.id": "user123",
                },
            ),
            Logs(
                timestamp=now - timedelta(seconds=8),
                body="Connection to database failed",
                severity_text="ERROR",
                resources={
                    "service.name": "api-service",
                    "deployment.environment": "production",
                    "host.name": "server-01",
                },
                attributes={
                    "error.type": "ConnectionError",
                    "db.name": "production_db",
                },
            ),
            Logs(
                timestamp=now - timedelta(seconds=5),
                body="Request processed",
                severity_text="DEBUG",
                resources={
                    "service.name": "worker-service",
                    "deployment.environment": "production",
                    "host.name": "server-02",
                },
                attributes={
                    "request.id": "req-456",
                    "duration_ms": 150.5,
                },
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    body = QueryRangeRequest(
        start=start_ns,
        end=end_ns,
        queries=[BuilderQuery(signal="logs", name="A")],
    ).to_dict()

    # Export logs as CSV (default format)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/export_raw_data"),
        json=body,
        timeout=30,
        headers={
            "authorization": f"Bearer {token}",
            "Content-Type": "application/json",
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

    # Verify log bodies are present in the exported data
    bodies = [row.get("body") for row in rows]
    assert "Application started successfully" in bodies
    assert "Connection to database failed" in bodies
    assert "Request processed" in bodies

    # Verify severity levels
    severities = [row.get("severity_text") for row in rows]
    assert "INFO" in severities
    assert "ERROR" in severities
    assert "DEBUG" in severities


def test_export_logs_jsonl(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert 2 logs with different attributes.

    Tests:
    1. Export logs as JSONL format
    2. Verify JSONL structure and content
    3. Check each line is valid JSON
    4. Validate log data is correctly formatted
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=10),
                body="User logged in",
                severity_text="INFO",
                resources={
                    "service.name": "auth-service",
                    "deployment.environment": "staging",
                },
                attributes={
                    "user.email": "test@example.com",
                    "session.id": "sess-789",
                },
            ),
            Logs(
                timestamp=now - timedelta(seconds=5),
                body="Payment processed successfully",
                severity_text="INFO",
                resources={
                    "service.name": "payment-service",
                    "deployment.environment": "staging",
                },
                attributes={
                    "transaction.id": "txn-123",
                    "amount": 99.99,
                },
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    body = QueryRangeRequest(
        start=start_ns,
        end=end_ns,
        queries=[BuilderQuery(signal="logs", name="A")],
    ).to_dict()

    # Export logs as JSONL
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/export_raw_data?format=jsonl"),
        json=body,
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "Content-Type": "application/json",
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
        assert "id" in obj
        assert "timestamp" in obj
        assert "body" in obj
        assert "severity_text" in obj

    # Verify log bodies
    bodies = [obj.get("body") for obj in json_objects]
    assert "User logged in" in bodies
    assert "Payment processed successfully" in bodies


def test_export_logs_with_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert logs with different severity levels.

    Tests:
    1. Export logs with filter applied
    2. Verify only filtered logs are returned
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=10),
                body="Info message",
                severity_text="INFO",
                resources={
                    "service.name": "test-service",
                },
                attributes={},
            ),
            Logs(
                timestamp=now - timedelta(seconds=8),
                body="Error message",
                severity_text="ERROR",
                resources={
                    "service.name": "test-service",
                },
                attributes={},
            ),
            Logs(
                timestamp=now - timedelta(seconds=5),
                body="Another error message",
                severity_text="ERROR",
                resources={
                    "service.name": "test-service",
                },
                attributes={},
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    body = QueryRangeRequest(
        start=start_ns,
        end=end_ns,
        queries=[
            BuilderQuery(
                signal="logs", name="A", filter_expression="severity_text = 'ERROR'"
            )
        ],
    ).to_dict()

    # Export logs with filter
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/export_raw_data?format=jsonl"),
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
    assert len(jsonl_lines) == 2, f"Expected 2 lines (filtered), got {len(jsonl_lines)}"

    # Verify only ERROR logs are returned
    for line in jsonl_lines:
        obj = json.loads(line)
        assert obj["severity_text"] == "ERROR"
        assert "error message" in obj["body"].lower()


def test_export_logs_with_limit(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert 5 logs.

    Tests:
    1. Export logs with limit applied
    2. Verify only limited number of logs are returned
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    logs = []
    for i in range(5):
        logs.append(
            Logs(
                timestamp=now - timedelta(seconds=i),
                body=f"Log message {i}",
                severity_text="INFO",
                resources={
                    "service.name": "test-service",
                },
                attributes={
                    "index": i,
                },
            )
        )

    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    body = QueryRangeRequest(
        start=start_ns,
        end=end_ns,
        queries=[BuilderQuery(signal="logs", name="A", limit=3)],
    ).to_dict()

    # Export logs with limit
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/export_raw_data?format=csv"),
        json=body,
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["Content-Type"] == "text/csv"

    # Parse CSV content
    csv_content = response.text
    csv_reader = csv.DictReader(io.StringIO(csv_content))

    rows = list(csv_reader)
    assert len(rows) == 3, f"Expected 3 rows (limited), got {len(rows)}"


def test_export_logs_with_columns(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert logs with various attributes.

    Tests:
    1. Export logs with specific columns
    2. Verify only specified columns are returned
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=10),
                body="Test log message",
                severity_text="INFO",
                resources={
                    "service.name": "test-service",
                    "deployment.environment": "production",
                },
                attributes={
                    "http.method": "GET",
                    "http.status_code": 200,
                },
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    body = QueryRangeRequest(
        start=start_ns,
        end=end_ns,
        queries=[
            BuilderQuery(
                signal="logs",
                name="A",
                select_fields=[
                    TelemetryFieldKey("timestamp", "string", "log"),
                    TelemetryFieldKey("severity_text", "string", "log"),
                    TelemetryFieldKey("body", "string", "log"),
                ],
            )
        ],
    ).to_dict()

    # Export logs with specific columns
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/export_raw_data?format=csv"),
        json=body,
        timeout=10,
        headers={
            "authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["Content-Type"] == "text/csv"

    # Parse CSV content
    csv_content = response.text
    csv_reader = csv.DictReader(io.StringIO(csv_content))

    rows = list(csv_reader)
    assert len(rows) == 1

    # Verify the specified columns are present
    row = rows[0]
    assert "timestamp" in row
    assert "severity_text" in row
    assert "body" in row
    assert row["severity_text"] == "INFO"
    assert row["body"] == "Test log message"


def test_export_logs_with_order_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert logs at different timestamps.

    Tests:
    1. Export logs with ascending timestamp order
    2. Verify logs are returned in correct order
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=10),
                body="First log",
                severity_text="INFO",
                resources={
                    "service.name": "test-service",
                },
                attributes={},
            ),
            Logs(
                timestamp=now - timedelta(seconds=5),
                body="Second log",
                severity_text="INFO",
                resources={
                    "service.name": "test-service",
                },
                attributes={},
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                body="Third log",
                severity_text="INFO",
                resources={
                    "service.name": "test-service",
                },
                attributes={},
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    body = QueryRangeRequest(
        start=start_ns,
        end=end_ns,
        queries=[
            BuilderQuery(
                signal="logs",
                name="A",
                order=[OrderBy(TelemetryFieldKey("timestamp", "string", "log"), "asc")],
            )
        ],
    ).to_dict()

    # Export logs with ascending order
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/export_raw_data?format=jsonl"),
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
    assert len(jsonl_lines) == 3

    # Verify order - first log should be "First log" (oldest)
    json_objects = [json.loads(line) for line in jsonl_lines]
    assert json_objects[0]["body"] == "First log"
    assert json_objects[1]["body"] == "Second log"
    assert json_objects[2]["body"] == "Third log"


def test_export_logs_with_complex_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert logs with various service names and severity levels.

    Tests:
    1. Export logs with complex filter (multiple conditions)
    2. Verify only logs matching all conditions are returned
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=10),
                body="API error occurred",
                severity_text="ERROR",
                resources={
                    "service.name": "api-service",
                },
                attributes={},
            ),
            Logs(
                timestamp=now - timedelta(seconds=8),
                body="Worker info message",
                severity_text="INFO",
                resources={
                    "service.name": "worker-service",
                },
                attributes={},
            ),
            Logs(
                timestamp=now - timedelta(seconds=5),
                body="API info message",
                severity_text="INFO",
                resources={
                    "service.name": "api-service",
                },
                attributes={},
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Calculate timestamps in nanoseconds
    start_ns = int((now - timedelta(minutes=5)).timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)

    body = QueryRangeRequest(
        start=start_ns,
        end=end_ns,
        queries=[
            BuilderQuery(
                signal="logs",
                name="A",
                filter_expression="service.name = 'api-service' AND severity_text = 'ERROR'",
            )
        ],
    ).to_dict()

    # Export logs with complex filter
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/export_raw_data?format=jsonl"),
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
    assert (
        len(jsonl_lines) == 1
    ), f"Expected 1 line (complex filter), got {len(jsonl_lines)}"

    # Verify the filtered log
    filtered_obj = json.loads(jsonl_lines[0])
    assert filtered_obj["body"] == "API error occurred"
    assert filtered_obj["severity_text"] == "ERROR"
