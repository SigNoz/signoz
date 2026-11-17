from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD


def test_clickhouse_sql_runs_with_profile(
    signoz_clickhouse_query_profile: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    response = querier.make_query_request(
        signoz_clickhouse_query_profile,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [{"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT toFloat64(getSetting('readonly')) AS readonly, toFloat64(getSetting('max_result_rows')) AS max_result_rows", "disabled": False}}],
        request_type=querier.RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["data"]["results"][0]["data"][0] == [2, 100]


@pytest.mark.parametrize(
    "settings",
    [
        "max_result_rows = 1000",
        "max_result_rows = 0",
        "max_result_bytes = 1000000",
        "max_bytes_to_read = 10000000",
        "max_rows_to_read = 10000000",
        "max_partitions_to_read = 100",
        "max_partitions_to_read = -1",
        "profile = 'default', max_result_rows = 1000",
    ],
    ids=[
        "result_rows_above_max",
        "result_rows_zero_is_unlimited",
        "result_bytes_above_max",
        "bytes_to_read_above_max",
        "rows_to_read_above_max",
        "partitions_to_read_above_max",
        "partitions_to_read_unlimited",
        "switch_profile_then_raise",
    ],
)
def test_clickhouse_sql_settings_cannot_escape_profile(
    signoz_clickhouse_query_profile: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    settings: str,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    response = querier.make_query_request(
        signoz_clickhouse_query_profile,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [{"type": "clickhouse_sql", "spec": {"name": "A", "query": f"SELECT toFloat64(1) AS value SETTINGS {settings}", "disabled": False}}],
        request_type=querier.RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    error = response.json()["error"]
    assert (error["code"], error["suggestions"]) == ("setting_not_allowed", ["remove the setting from the SETTINGS clause of the query"]), error


RESULT_TOO_LARGE = "add a LIMIT, narrow the time range or select fewer columns"
READ_TOO_LARGE = "narrow the time range or add filters so the query reads less data"


@pytest.mark.parametrize(
    "query,code,suggestion,reason",
    [
        ("SELECT toFloat64(number) AS value FROM numbers(1000)", "result_too_large", RESULT_TOO_LARGE, "max rows"),
        ("SELECT repeat(toString(number), 2000) AS text, toFloat64(number) AS value FROM numbers(90)", "result_too_large", RESULT_TOO_LARGE, "max bytes"),
        ("SELECT toFloat64(count()) AS value FROM numbers(150000)", "read_too_large", READ_TOO_LARGE, "max bytes"),
        ("SELECT toFloat64(sum(value)) AS value FROM {table} WHERE day = '2026-01-01'", "read_too_large", READ_TOO_LARGE, "max rows"),
        ("SELECT toFloat64(sum(value)) AS value FROM {table} WHERE day > '2026-01-01'", "read_too_large", READ_TOO_LARGE, "partitions"),
    ],
    ids=["result_rows", "result_bytes", "bytes_read", "rows_read", "partitions_read"],
)
def test_clickhouse_sql_over_profile_limit(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz_clickhouse_query_profile: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    clickhouse_partitioned_table: str,
    query: str,
    code: str,
    suggestion: str,
    reason: str,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    response = querier.make_query_request(
        signoz_clickhouse_query_profile,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [{"type": "clickhouse_sql", "spec": {"name": "A", "query": query.format(table=clickhouse_partitioned_table), "disabled": False}}],
        request_type=querier.RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    error = response.json()["error"]
    assert (error["code"], error["suggestions"]) == (code, [suggestion]), error
    assert reason in error["message"], error
