from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs


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


NO_COMMON_TYPE = "cast the values to one type, for example with toInt64 or toFloat64, so that the branches of if or multiIf, the elements of an array, or the columns of a UNION share it; count() returns UInt64, which has no common type with Int64"
ILLEGAL_AGGREGATION = "give an aggregate an alias that is not a column name, because ClickHouse reads the alias in WHERE; move a condition on an aggregate from WHERE to HAVING; compute a nested aggregate in a subquery"
INVALID_REGEXP = "write the pattern in RE2 syntax, which has no lookaround or backreferences, and escape a backslash that is meant literally"


@pytest.mark.parametrize(
    "query,code,suggestion",
    [
        pytest.param(
            {"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT if(number > 5, toInt64(-1), count()) AS value FROM numbers(10) GROUP BY number"}},
            "no_common_type",
            NO_COMMON_TYPE,
            id="no_common_type",
        ),
        pytest.param(
            {"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT number, count() AS value FROM numbers(10) GROUP BY number % 2"}},
            "not_an_aggregate",
            "add the column to GROUP BY, or wrap it in an aggregate function such as any()",
            id="not_an_aggregate",
        ),
        pytest.param(
            {"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT any(number) AS number FROM numbers(10) WHERE number > 5"}},
            "illegal_aggregation",
            ILLEGAL_AGGREGATION,
            id="aggregate_alias_in_where",
        ),
        pytest.param(
            {"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT sum(count()) AS value FROM numbers(10)"}},
            "illegal_aggregation",
            ILLEGAL_AGGREGATION,
            id="nested_aggregate",
        ),
        pytest.param(
            {"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT arrayMap((x, y) -> x + y, [1, 2], [1]) AS value"}},
            "illegal_argument",
            "pass arrays of the same length to a function that takes several arrays, such as arrayMap or arrayZip",
            id="arrays_of_different_sizes",
        ),
        pytest.param(
            {"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT match('abc', '(?=a)') AS value"}},
            "invalid_regexp",
            INVALID_REGEXP,
            id="regexp_in_sql",
        ),
        pytest.param(
            querier.build_scalar_query("A", "logs", [querier.build_aggregation("count()")], filter_expression="body REGEXP '(?=a)'"),
            "invalid_regexp",
            INVALID_REGEXP,
            id="regexp_in_filter",
        ),
    ],
)
def test_clickhouse_user_mistake_is_bad_request(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    query: dict,
    code: str,
    suggestion: str,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # ClickHouse compiles a filter's regular expression only when it reads a part.
    insert_logs([Logs(timestamp=now - timedelta(minutes=1), body="abc")])
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = querier.make_query_request(
        signoz,
        token,
        int((now - timedelta(hours=1)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [query],
        request_type=querier.RequestType.SCALAR,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    error = response.json()["error"]
    assert (error["code"], error["suggestions"]) == (code, [suggestion]), error
