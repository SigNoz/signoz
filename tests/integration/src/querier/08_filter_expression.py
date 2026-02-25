from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List, Set

import pytest
import requests
import os

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

TESTDATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "testdata")
FILTER_EXPRESSIONS_FILE = os.path.join(TESTDATA_DIR, "filter_expressions_10000.txt")

def _make_raw_traces_query(
    signoz: types.SigNoz,
    token: str,
    filter_expression: str,
) -> requests.Response:
    """Helper to query raw traces with a filter expression over the last 30 seconds."""
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
                            "signal": "traces",
                            "disabled": False,
                            "limit": 100,
                            "offset": 0,
                            "filter": {"expression": filter_expression},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
                            "selectFields": [
                                {
                                    "name": "name",
                                    "fieldDataType": "string",
                                    "fieldContext": "span",
                                    "signal": "traces",
                                },
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


def _span_names_from_response(response_json: dict) -> Set[str]:
    """Extract the set of span names from a raw query response.
    Returns an empty set when the result set is empty."""
    results = response_json.get("data", {}).get("data", {}).get("results", [])
    if not results:
        return set()
    rows = results[0].get("rows", [])
    if rows is None:
        return set()
    return {row["data"]["name"] for row in rows}


def _insert_two_spans(
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    """Insert the two canonical test spans used by all valid-expression test cases.

    alpha-span: resources f1="v10", f2="v20", f3="v30"
                attributes f4=40,   f5=50,   f6=60  (numbers)
    beta-span:  resources f4="v41", f5="v51", f6="v61"
                attributes f1=11,   f2=21,   f3=31  (numbers)

    f1-f3 are present as resource on alpha and as attribute on beta.
    f4-f6 are present as attribute on alpha and as resource on beta.
    This intentional overlap exercises context-prefix disambiguation.
    """
    now = datetime.now(tz=timezone.utc)
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=5),
                duration=timedelta(seconds=1),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                parent_span_id="",
                name="alpha-span",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
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
            Traces(
                timestamp=now - timedelta(seconds=3),
                duration=timedelta(seconds=2),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                parent_span_id="",
                name="beta-span",
                kind=TracesKind.SPAN_KIND_PRODUCER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
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
    "expression,expected_spans",
    [
        # NOT on resource attribute unique to alpha → beta only
        pytest.param(
            'NOT resource.f1 = "v10"',
            {"beta-span"},
            id="not_resource_attr",
        ),
        # NOT on number attribute unique to alpha → beta only
        pytest.param(
            "NOT attribute.f4 = 40",
            {"beta-span"},
            id="not_number_attr",
        ),
        # NOT (OR covering both spans) → no spans
        # resource.f1 = "v10" matches alpha; resource.f4 = "v41" matches beta
        pytest.param(
            'NOT (resource.f1 = "v10" OR resource.f4 = "v41")',
            set(),
            id="not_or_covering_all",
        ),
        # Multiple NOTs ANDed: each NOT excludes one span → no spans
        pytest.param(
            'NOT resource.f1 = "v10" AND NOT resource.f4 = "v41"',
            set(),
            id="multiple_nots_and",
        ),
        # Double NOT: NOT (NOT expr) ≡ expr → alpha only
        pytest.param(
            'NOT (NOT resource.f1 = "v10")',
            {"alpha-span"},
            id="double_not",
        ),
        # NOT EXISTS: resource.f1 exists only on alpha → beta only
        pytest.param(
            "NOT resource.f1 EXISTS",
            {"beta-span"},
            id="not_exists",
        ),
        # NOT IN on resource attribute unique to beta → alpha only
        pytest.param(
            'resource.f4 NOT IN ["v41"]',
            {"alpha-span"},
            id="not_in",
        ),
        # NOT compound (number attr AND resource attr both on alpha) → beta only
        pytest.param(
            'NOT (attribute.f4 = 40 AND resource.f1 = "v10")',
            {"beta-span"},
            id="not_compound_attr_and_resource",
        ),
        # NOT wrapping impossible AND: no span has both resource.f1 and resource.f4
        # → AND always false → NOT always true → both spans
        pytest.param(
            'NOT (resource.f1 = "v10" AND resource.f4 = "v41")',
            {"alpha-span", "beta-span"},
            id="not_impossible_and",
        ),
    ],
)
def test_not_filter_expression(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
    expression: str,
    expected_spans: Set[str],
) -> None:
    """
    Verifies that valid NOT filter expressions return the correct set of spans.

    Two spans are inserted per run:
    - alpha-span: resources f1-f3 (strings), attributes f4-f6 (numbers)
    - beta-span:  resources f4-f6 (strings), attributes f1-f3 (numbers)
    """
    _insert_two_spans(insert_traces)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = _make_raw_traces_query(signoz, token, expression)
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    assert _span_names_from_response(response.json()) == expected_spans


@pytest.mark.parametrize(
    "expression",
    [
        # --- Incomplete / truncated expressions ---

        # Bare NOT: parser expects a Primary after NOT but hits EOF
        pytest.param("NOT", id="bare_not"),
        # Chained NOTs with nothing following: second NOT is not a valid Primary
        pytest.param("NOT NOT", id="chained_not_no_expr"),
        # Missing value after '=': parser expects a value token but finds ')'
        pytest.param('NOT (resource.f1 = )', id="missing_value_in_parens"),
        # Missing value entirely: NOT key = <EOF>
        pytest.param('NOT resource.f1 = ', id="missing_value_bare"),
        # LIKE with no value: parser expects a value token but finds EOF
        pytest.param('NOT resource.f1 LIKE ', id="like_no_value"),
        # BETWEEN with only one value: BETWEEN requires exactly two values
        pytest.param('NOT resource.f1 BETWEEN "a"', id="between_single_value"),

        # --- Structural / bracket errors ---

        # Unclosed parenthesis: missing ')' at end
        pytest.param('NOT (resource.f1 = "v10"', id="unclosed_paren"),
        # Empty parentheses: parser expects at least one expression inside '()'
        pytest.param("NOT ()", id="empty_parens"),
        # Closing paren with no opening: RPAREN is not a valid Primary start
        pytest.param("NOT )", id="closing_paren_only"),
        # NOT IN with empty bracket list: value list requires at least one element
        pytest.param("resource.f1 NOT IN []", id="not_in_empty_list"),
        # IN without a key: IN is a keyword, not a valid Primary
        pytest.param('NOT IN ["v10"]', id="in_without_key"),

        # --- Invalid tokens / operators ---

        # NOT followed immediately by AND keyword
        pytest.param('NOT AND resource.f1 = "v10"', id="not_followed_by_and"),
        # NOT followed immediately by OR keyword
        pytest.param('NOT OR resource.f1 = "v10"', id="not_followed_by_or"),
        # Double comparison operator: stray '=' after the first
        pytest.param('NOT resource.f1 = = "v10"', id="double_equals"),
        # Non-existent operator: '==' is not in the grammar
        pytest.param('NOT resource.f1 == "v10"', id="double_equals_operator"),
        # SQL IS NULL syntax: IS NULL is not part of the filter grammar
        pytest.param("NOT resource.f1 IS NULL", id="sql_is_null"),

        # --- Unclosed / mismatched string literals ---

        # Unclosed double-quoted string
        pytest.param('NOT resource.f1 = "unclosed', id="unclosed_double_quote"),
        # Unclosed single-quoted string
        pytest.param("NOT resource.f1 = 'unclosed", id="unclosed_single_quote"),
        # Mismatched quotes: opens with double, closes with single
        pytest.param("NOT resource.f1 = \"mismatch'", id="mismatched_quotes"),
    ],
)
def test_not_invalid_filter_expression(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    expression: str,
) -> None:
    """
    Tests that a malformed NOT filter expression is rejected with HTTP 400.
    No data insertion is needed — invalid expressions are rejected before query execution.
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _make_raw_traces_query(signoz, token, expression)
    assert response.status_code == HTTPStatus.BAD_REQUEST, (
        f"Expected 400 for expression {expression!r}, "
        f"got {response.status_code}: {response.text}"
    )
    body = response.json()
    assert body["status"] == "error"
    assert "error" in body


def test_filter_expressions_no_server_error(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Reads every line from filter_expressions_10000.txt and fires it as a filter
    expression against the traces query endpoint.

    Expressions may be valid (200) or invalid (400) — both are acceptable.
    A 500 means the server crashed on the input and is a test failure.
    All failing expressions are collected before asserting so the full list is
    visible in one run.
    """

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    failures: List[str] = []
    with ThreadPoolExecutor(max_workers=32) as executor:
        with open(FILTER_EXPRESSIONS_FILE, encoding="utf-8") as f:
            futures = {
                executor.submit(_make_raw_traces_query, signoz, token, expr.rstrip('\n')): expr.rstrip('\n')
                for expr in f
            }
            for future in as_completed(futures):
                expr = futures[future]
                if future.result().status_code == HTTPStatus.INTERNAL_SERVER_ERROR:
                    failures.append(expr)

    assert len(failures) < 200, (
        f"{len(failures)} expression(s) caused HTTP 500:\n"
        + "\n".join(f"  {expr!r}" for expr in failures)
    )
