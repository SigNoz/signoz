"""
Integration tests for raw ClickHouse SQL queries in the querier.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD


def test_clickhouse_scalar_numeric_result_alias_classified_as_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """A numeric column aliased ``__result_0`` is classified as an aggregation."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = querier.make_query_request(
        signoz,
        token,
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [
            {
                "type": "clickhouse_sql",
                "spec": {
                    "name": "A",
                    "query": "SELECT toFloat64(1.5) AS `__result_0`",
                    "disabled": False,
                },
            }
        ],
        request_type=querier.RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    columns = querier.get_scalar_columns(response.json())
    assert len(columns) == 1
    assert columns[0]["name"] == "__result_0"
    assert columns[0]["columnType"] == "aggregation"
    assert columns[0]["aggregationIndex"] == 0

    response = querier.make_query_request(
        signoz,
        token,
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [
            {
                "type": "clickhouse_sql",
                "spec": {
                    "name": "A",
                    "query": "SELECT toNullable(toFloat64(1.5)) AS value",
                    "disabled": False,
                },
            }
        ],
        request_type=querier.RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    columns = querier.get_scalar_columns(response.json())
    assert len(columns) == 1
    assert columns[0]["name"] == "value"
    assert columns[0]["columnType"] == "aggregation"
    assert columns[0]["aggregationIndex"] == 0
