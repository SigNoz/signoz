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
from fixtures.querier import get_column_data_from_response, make_query_request

TESTDATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "testdata")
FILTER_EXPRESSIONS_FILE = os.path.join(TESTDATA_DIR, "filter_expressions_10000.txt")


@pytest.mark.parametrize(
    "expression,expected_logs",
    [
        # NOT on resource attribute unique to alpha → beta only
        pytest.param(
            'NOT resource.region = "us-east"',
            {"beta-log"},
            id="not_resource_attr",
        ),
        # NOT on number attribute unique to alpha → beta only
        pytest.param(
            "NOT attribute.status_code = 200",
            {"beta-log"},
            id="not_number_attr",
        ),
        # NOT (OR covering both logs) → no logs
        # resource.region = "us-east" matches alpha; resource.status_code = "500" matches beta
        pytest.param(
            'NOT (resource.region = "us-east" OR resource.status_code = "500")',
            set(),
            id="not_or_covering_all",
        ),
        # Multiple NOTs ANDed: each NOT excludes one log → no logs
        pytest.param(
            'NOT resource.region = "us-east" AND NOT resource.status_code = "500"',
            set(),
            id="multiple_nots_and",
        ),
        # Double NOT: NOT (NOT expr) ≡ expr → alpha only
        pytest.param(
            'NOT (NOT resource.region = "us-east")',
            {"alpha-log"},
            id="double_not",
        ),
        # NOT EXISTS: resource.region exists only on alpha → beta only
        pytest.param(
            "NOT resource.region EXISTS",
            {"beta-log"},
            id="not_exists",
        ),
        # NOT IN on resource attribute unique to beta → alpha only
        pytest.param(
            'resource.status_code NOT IN ["500"]',
            {"alpha-log"},
            id="not_in",
        ),
        # NOT compound (number attr AND resource attr both on alpha) → beta only
        pytest.param(
            'NOT (attribute.status_code = 200 AND resource.region = "us-east")',
            {"beta-log"},
            id="not_compound_attr_and_resource",
        ),
        # NOT wrapping impossible AND: no log has both resource.region and resource.status_code
        # → AND always false → NOT always true → both logs
        pytest.param(
            'NOT (resource.region = "us-east" AND resource.status_code = "500")',
            {"alpha-log", "beta-log"},
            id="not_impossible_and",
        ),
        # IS and NULL are not grammar keywords so they lex as KEY tokens.
        # The implicit AND in andExpression splits this into three unary expressions:
        #   NOT (body REGEXP 'resource.region') AND (body REGEXP 'IS') AND (body REGEXP 'NULL')
        # Neither body ("alpha-log", "beta-log") matches "IS" or "NULL" → empty set.
        pytest.param(
            "NOT resource.region IS NULL",
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

    Insert the two canonical test logs used by all valid-expression test cases.

    alpha-log: resources region="us-east", env="production",  hostname="host-alpha"
               attributes status_code=200,  latency_ms=350,   error_count=3  (numbers)
    beta-log:  resources status_code="500", latency_ms="2500", error_count="10"
               attributes region=1,          env=2,             hostname=3    (numbers)

    region/env/hostname are present as resource on alpha and as attribute on beta.
    status_code/latency_ms/error_count are present as attribute on alpha and as resource on beta.
    This intentional overlap exercises context-prefix disambiguation.
    """
    now = datetime.now(tz=timezone.utc)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=5),
                body="alpha-log",
                resources={
                    "region": "us-east",
                    "env": "production",
                    "hostname": "host-alpha",
                },
                attributes={
                    "status_code": 200,
                    "latency_ms": 350,
                    "error_count": 3,
                },
            ),
            Logs(
                timestamp=now - timedelta(seconds=3),
                body="beta-log",
                resources={
                    "status_code": "500",
                    "latency_ms": "2500",
                    "error_count": "10",
                },
                attributes={
                    "region": 1,
                    "env": 2,
                    "hostname": 3,
                },
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
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
                    "filter": {"expression": expression},
                    "order": [
                        {"key": {"name": "timestamp"}, "direction": "desc"},
                        {"key": {"name": "id"}, "direction": "desc"},
                    ],
                    "having": {"expression": ""},
                    "aggregations": [{"expression": "count()"}],
                },
            }
        ],
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    assert set(get_column_data_from_response(response.json(), "body")) == expected_logs


def test_filter_expressions_no_server_error(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    insert_logs,
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

    def _make_raw_logs_query(
        signoz: types.SigNoz,
        token: str,
        filter_expression: str,
    ) -> requests.Response:
        """Helper to query raw logs with a filter expression over the last 30 seconds."""
        now = datetime.now(tz=timezone.utc)
        return make_query_request(
            signoz,
            token,
            start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
            end_ms=int(now.timestamp() * 1000),
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
                        "filter": {"expression": filter_expression},
                        "order": [
                            {"key": {"name": "timestamp"}, "direction": "desc"},
                            {"key": {"name": "id"}, "direction": "desc"},
                        ],
                        "having": {"expression": ""},
                        "aggregations": [{"expression": "count()"}],
                    },
                }
            ],
        )

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
        len(failures) <= 0
    ), f"{len(failures)} expression(s) caused HTTP 500:\n" + "\n".join(
        f"  {expr!r}" for expr in failures
    )
