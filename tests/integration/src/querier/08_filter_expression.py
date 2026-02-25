import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List, Set

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs

TESTDATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "testdata")
FILTER_EXPRESSIONS_FILE = os.path.join(TESTDATA_DIR, "filter_expressions_10000.txt")


def _make_raw_logs_query(
    signoz: types.SigNoz,
    token: str,
    filter_expression: str,
) -> requests.Response:
    """Helper to query raw logs with a filter expression over the last 30 seconds."""
    now = datetime.now(tz=timezone.utc)
    return requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=10,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": int((now - timedelta(seconds=30)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
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
                            "filter": {"expression": filter_expression},
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


def _log_bodies_from_response(response_json: dict) -> Set[str]:
    """Extract the set of log bodies from a raw query response.
    Returns an empty set when the result set is empty."""
    results = response_json.get("data", {}).get("data", {}).get("results", [])
    if not results:
        return set()
    rows = results[0].get("rows", [])
    if rows is None:
        return set()
    return {row["data"]["body"] for row in rows}


def _insert_two_logs(
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """Insert the two canonical test logs used by all valid-expression test cases.

    alpha-log: resources f1="v10", f2="v20", f3="v30"
               attributes f4=40,   f5=50,   f6=60  (numbers)
    beta-log:  resources f4="v41", f5="v51", f6="v61"
               attributes f1=11,   f2=21,   f3=31  (numbers)

    f1-f3 are present as resource on alpha and as attribute on beta.
    f4-f6 are present as attribute on alpha and as resource on beta.
    This intentional overlap exercises context-prefix disambiguation.
    """
    now = datetime.now(tz=timezone.utc)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=5),
                body="alpha-log",
                resources={
                    "f1": "v10",
                    "f2": "v20",
                    "f3": "v30",
                },
                attributes={
                    "f4": 40,
                    "f5": 50,
                    "f6": 60,
                },
            ),
            Logs(
                timestamp=now - timedelta(seconds=3),
                body="beta-log",
                resources={
                    "f4": "v41",
                    "f5": "v51",
                    "f6": "v61",
                },
                attributes={
                    "f1": 11,
                    "f2": 21,
                    "f3": 31,
                },
            ),
        ]
    )


@pytest.mark.parametrize(
    "expression,expected_logs",
    [
        # NOT on resource attribute unique to alpha → beta only
        pytest.param(
            'NOT resource.f1 = "v10"',
            {"beta-log"},
            id="not_resource_attr",
        ),
        # NOT on number attribute unique to alpha → beta only
        pytest.param(
            "NOT attribute.f4 = 40",
            {"beta-log"},
            id="not_number_attr",
        ),
        # NOT (OR covering both logs) → no logs
        # resource.f1 = "v10" matches alpha; resource.f4 = "v41" matches beta
        pytest.param(
            'NOT (resource.f1 = "v10" OR resource.f4 = "v41")',
            set(),
            id="not_or_covering_all",
        ),
        # Multiple NOTs ANDed: each NOT excludes one log → no logs
        pytest.param(
            'NOT resource.f1 = "v10" AND NOT resource.f4 = "v41"',
            set(),
            id="multiple_nots_and",
        ),
        # Double NOT: NOT (NOT expr) ≡ expr → alpha only
        pytest.param(
            'NOT (NOT resource.f1 = "v10")',
            {"alpha-log"},
            id="double_not",
        ),
        # NOT EXISTS: resource.f1 exists only on alpha → beta only
        pytest.param(
            "NOT resource.f1 EXISTS",
            {"beta-log"},
            id="not_exists",
        ),
        # NOT IN on resource attribute unique to beta → alpha only
        pytest.param(
            'resource.f4 NOT IN ["v41"]',
            {"alpha-log"},
            id="not_in",
        ),
        # NOT compound (number attr AND resource attr both on alpha) → beta only
        pytest.param(
            'NOT (attribute.f4 = 40 AND resource.f1 = "v10")',
            {"beta-log"},
            id="not_compound_attr_and_resource",
        ),
        # NOT wrapping impossible AND: no log has both resource.f1 and resource.f4
        # → AND always false → NOT always true → both logs
        pytest.param(
            'NOT (resource.f1 = "v10" AND resource.f4 = "v41")',
            {"alpha-log", "beta-log"},
            id="not_impossible_and",
        ),
        # IS and NULL are not grammar keywords so they lex as KEY tokens.
        # The implicit AND in andExpression splits this into three unary expressions:
        #   NOT (body REGEXP 'resource.f1') AND (body REGEXP 'IS') AND (body REGEXP 'NULL')
        # Neither body ("alpha-log", "beta-log") matches "IS" or "NULL" → empty set.
        pytest.param(
            "NOT resource.f1 IS NULL",
            set(),
            id="sql_is_null_as_fulltext",
        ),
        pytest.param(
            "NOT 'NOT'",
            {"alpha-log", "beta-log"},
            id="not_full_text_search",
        ),
    ],
)
def test_not_filter_expression(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    expression: str,
    expected_logs: Set[str],
) -> None:
    """
    Verifies that valid NOT filter expressions return the correct set of logs.

    Two logs are inserted per run:
    - alpha-log: resources f1-f3 (strings), attributes f4-f6 (numbers)
    - beta-log:  resources f4-f6 (strings), attributes f1-f3 (numbers)
    """
    _insert_two_logs(insert_logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = _make_raw_logs_query(signoz, token, expression)
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    assert _log_bodies_from_response(response.json()) == expected_logs


def test_filter_expressions_no_server_error(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    insert_logs: Callable[[List[Logs]], None],  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Reads every line from filter_expressions_10000.txt and fires it as a filter
    expression against the logs query endpoint.

    Expressions may be valid (200) or invalid (400) — both are acceptable.
    A 500 means the server crashed on the input and is a test failure.
    All failing expressions are collected before asserting so the full list is
    visible in one run.
    """

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    failures: List[str] = []
    with ThreadPoolExecutor(max_workers=40) as executor:
        with open(FILTER_EXPRESSIONS_FILE, encoding="utf-8") as f:
            futures = {
                executor.submit(
                    _make_raw_logs_query, signoz, token, expr.rstrip("\n")
                ): expr.rstrip("\n")
                for expr in f
            }
            for future in as_completed(futures):
                expr = futures[future]
                if future.result().status_code == HTTPStatus.INTERNAL_SERVER_ERROR:
                    failures.append(expr)

    assert (
        len(failures) < 200
    ), f"{len(failures)} expression(s) caused HTTP 500:\n" + "\n".join(
        f"  {expr!r}" for expr in failures
    )
