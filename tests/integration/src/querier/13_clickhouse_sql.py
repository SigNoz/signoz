from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import get_scalar_value, make_query_request


def test_clickhouse_sql_valid_scalar_query(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Insert a few log lines, then run a ClickHouse SQL query against the
    distributed table and verify:
      1. The request is accepted (HTTP 200 / status "success").
      2. The returned count is at least the number of logs we inserted.
    """
    now = datetime.now(tz=timezone.utc)
    num_inserted_logs = 3
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=i),
                body=f"clickhouse sql test log {i}",
                severity_text="INFO",
                resources={
                    "service.name": "clickhouse-sql-test",
                    "deployment.environment": "integration",
                },
            )
            for i in range(num_inserted_logs)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    end = int(now.timestamp() * 1000) + 1_000  # +1 s to include "now"
    start = end - 60_000

    response = make_query_request(
        signoz,
        token,
        start,
        end,
        [
            {
                "type": "clickhouse_sql",
                "spec": {
                    "name": "A",
                    "query": "SELECT count() AS value FROM signoz_logs.distributed_logs_v2",
                },
            }
        ],
        request_type="scalar",
    )
    assert response.status_code == HTTPStatus.OK
    body = response.json()
    assert body["status"] == "success"

    count = get_scalar_value(body, "A")
    assert count is not None, "Expected a scalar count value in the response"
    assert (
        count == num_inserted_logs
    ), f"Expected count == {num_inserted_logs}, got {count}"


def test_clickhouse_sql_valid_raw_query(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Insert a few log lines, then run a ClickHouse SQL query against the
    distributed table and verify:
      1. The request is accepted (HTTP 200 / status "success").
      2. The returned count is at least the number of logs we inserted.
    """
    now = datetime.now(tz=timezone.utc)
    num_inserted_logs = 3
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=i),
                body=f"clickhouse sql test log {i}",
                severity_text="INFO",
                resources={
                    "service.name": "clickhouse-sql-test",
                    "deployment.environment": "integration",
                },
            )
            for i in range(num_inserted_logs)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    end = int(now.timestamp() * 1000) + 1_000  # +1 s to include "now"
    start = end - 60_000

    response = make_query_request(
        signoz,
        token,
        start,
        end,
        [
            {
                "type": "clickhouse_sql",
                "spec": {
                    "name": "A",
                    "query": "SELECT * FROM signoz_logs.distributed_logs_v2",
                },
            }
        ],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK
    body = response.json()
    assert body["status"] == "success"


@pytest.mark.parametrize(
    "query, expected_error",
    [
        (
            "SELECT * FROM signoz_logs.distributed_logs LIMIT 10",
            "deprecated",  # This is captured by validate()
        ),
        (
            "SELECT * from invalid_table",
            "Unknown table expression",  # This is captured by mapClickHouseError()
        ),
    ],
)
def test_clickhouse_sql_invalid_queries(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    query: str,
    expected_error: str,
) -> None:
    """
    ClickHouse SQL queries referencing deprecated tables or unknown tables are
    rejected with HTTP 400.
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    end = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    start = end - 60_000

    response = make_query_request(
        signoz,
        token,
        start,
        end,
        [{"type": "clickhouse_sql", "spec": {"name": "A", "query": query}}],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
    body = response.json()
    assert body["status"] == "error"
    assert expected_error in body["error"]["message"]


def test_clickhouse_sql_local_table_warning(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    ClickHouse SQL queries referencing local (non-distributed) tables are
    executed but the response includes a warning advising use of the
    distributed table instead.
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    end = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    start = end - 60_000

    response = make_query_request(
        signoz,
        token,
        start,
        end,
        [
            {
                "type": "clickhouse_sql",
                "spec": {
                    "name": "A",
                    "query": "SELECT count() AS value FROM signoz_logs.logs_v2",
                },
            }
        ],
        request_type="scalar",
    )
    assert response.status_code == HTTPStatus.OK
    body = response.json()
    assert body["status"] == "success"

    warning = body["data"].get("warning")
    assert (
        warning is not None
    ), "Expected a warning in the response for local table usage"
    warning_messages = " ".join(w["message"] for w in warning.get("warnings", []))
    assert (
        "distributed" in warning_messages
    ), f"Expected warning to mention distributed table, got: {warning_messages}"
