from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import RequestType, make_query_request


def test_clickhouse_query_within_budget(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [{"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT number FROM numbers(1000)"}}],
        request_type=RequestType.RAW,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert len(response.json()["data"]["data"]["results"][0]["rows"]) == 1000


def test_clickhouse_query_row_limit_only_for_raw(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [{"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT toString(number) AS k, toFloat64(number) AS __result_0 FROM numbers(2000)"}}],
        request_type=RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.OK, response.text


@pytest.mark.parametrize(
    "query, expected_status, expected_code, expected_suggestion",
    [
        pytest.param(
            "SELECT number FROM numbers(2000)",
            HTTPStatus.BAD_REQUEST,
            "result_too_large",
            "add a LIMIT, narrow the time range or select fewer columns",
            id="max_result_rows",
        ),
        pytest.param(
            "SELECT repeat(toString(number), 4000) AS s FROM numbers(500)",
            HTTPStatus.BAD_REQUEST,
            "result_too_large",
            "add a LIMIT, narrow the time range or select fewer columns",
            id="max_result_bytes",
        ),
        pytest.param(
            "SELECT groupArray(number) FROM numbers(50000000)",
            HTTPStatus.BAD_REQUEST,
            "memory_limit_exceeded",
            "narrow the time range, add filters or reduce the number of groups",
            id="max_memory_usage",
        ),
        pytest.param(
            "SELECT sleep(3)",
            HTTPStatus.GATEWAY_TIMEOUT,
            "query_timeout",
            "optimize your query: narrow the time range or add filters to read less data",
            id="max_execution_time",
        ),
    ],
)
def test_clickhouse_query_over_budget(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    query: str,
    expected_status: HTTPStatus,
    expected_code: str,
    expected_suggestion: str,
) -> None:
    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [{"type": "clickhouse_sql", "spec": {"name": "A", "query": query}}],
        request_type=RequestType.RAW,
    )

    assert response.status_code == expected_status, response.text
    error = response.json()["error"]
    assert error["code"] == expected_code
    assert error["suggestions"] == [expected_suggestion]


def test_clickhouse_query_budget_reaches_clickhouse(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [{"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT 'budget_precedence_probe' AS probe"}}],
        request_type=RequestType.RAW,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    conn = signoz.telemetrystore.conn
    conn.command("SYSTEM FLUSH LOGS")
    result = conn.query("SELECT Settings FROM system.query_log WHERE type = 'QueryFinish' AND position(query, 'budget_precedence_probe') > 0 AND position(query, 'system.query_log') = 0 ORDER BY event_time_microseconds DESC LIMIT 1")

    assert result.result_rows, "the probe query is missing from system.query_log"
    settings = result.result_rows[0][0]
    # clickhouse-go sets max_execution_time from the 2s budget deadline plus 5s, not from the 60s request timeout.
    assert int(settings["max_execution_time"]) <= 7
    assert settings["max_memory_usage"] == "100000000"
    assert settings["max_result_rows"] == "1000"
    assert settings["max_result_bytes"] == "1000000"
