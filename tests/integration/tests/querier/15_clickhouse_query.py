"""
Integration tests for the v5 ClickHouse SQL query length cap and the
raised ClickHouse `max_query_size` setting (350000) configured in
pkg/telemetrystore/config.go.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import make_query_request

# Mirrors MaxClickHouseQueryLength in
# pkg/types/querybuildertypes/querybuildertypesv5/validation.go
MAX_CLICKHOUSE_QUERY_LENGTH = 300_000

# ClickHouse's built-in default `max_query_size`. SigNoz raises this to
# 350000 via telemetrystore settings.
CLICKHOUSE_BUILTIN_MAX_QUERY_SIZE = 262_144


def test_clickhouse_query_at_validation_cap_is_accepted(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    prefix = "SELECT 1 /* "
    suffix = " */"
    query = prefix + ("x" * (MAX_CLICKHOUSE_QUERY_LENGTH - len(prefix) - len(suffix))) + suffix
    assert len(query) == MAX_CLICKHOUSE_QUERY_LENGTH

    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        queries=[
            {
                "type": "clickhouse_sql",
                "spec": {"name": "A", "query": query, "disabled": False},
            }
        ],
        request_type="raw",
    )

    assert response.status_code == HTTPStatus.OK, response.text


def test_clickhouse_query_above_validation_cap_is_rejected(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    prefix = "SELECT 1 /* "
    suffix = " */"
    target_len = MAX_CLICKHOUSE_QUERY_LENGTH + 1
    query = prefix + ("x" * (target_len - len(prefix) - len(suffix))) + suffix

    assert len(query) > MAX_CLICKHOUSE_QUERY_LENGTH

    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        queries=[
            {
                "type": "clickhouse_sql",
                "spec": {"name": "A", "query": query, "disabled": False},
            }
        ],
        request_type="raw",
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "exceeds maximum allowed length" in response.text


def test_clickhouse_query_above_builtin_max_query_size_parses(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Verifies that the raised `max_query_size` setting is applied on every
    ClickHouse query: a payload above ClickHouse's built-in parser limit
    (262144 bytes) but below the v5 validation cap (300000) must succeed
    end-to-end. Without the setting override the ClickHouse parser would
    reject this and the server would return 500.
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    target_len = CLICKHOUSE_BUILTIN_MAX_QUERY_SIZE + 10_000
    prefix = "SELECT 1 /* "
    suffix = " */"
    query = prefix + ("x" * (target_len - len(prefix) - len(suffix))) + suffix

    assert len(query) > CLICKHOUSE_BUILTIN_MAX_QUERY_SIZE
    assert len(query) < MAX_CLICKHOUSE_QUERY_LENGTH

    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        queries=[
            {
                "type": "clickhouse_sql",
                "spec": {"name": "A", "query": query, "disabled": False},
            }
        ],
        request_type="raw",
    )

    assert response.status_code == HTTPStatus.OK, response.text
