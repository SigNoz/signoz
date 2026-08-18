from collections import namedtuple
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_order_by,
    build_raw_query,
    get_column_data_from_response,
    get_preview_selected_granules,
    get_preview_skip_indexes,
    get_rows,
    make_preview_query_request,
    make_query_request,
)

# search(): keyless fans across every field; scoped search('term', <ctx>...) narrows to
# the named contexts (body/attribute/resource/log). Flag off here, so body matches the
# `body` String column (querier_json_body mirrors this over body_v2).

Bodies = namedtuple("Bodies", ["a", "b", "c", "d"])


@pytest.mark.parametrize(
    "expression,expected",
    [
        # ── keyless: fans across every field ────────────────────────────────
        pytest.param("search('login')", lambda b: {b.a}, id="keyless_body"),
        pytest.param("search('checkout')", lambda b: {b.a, b.d}, id="keyless_body_and_resource"),
        pytest.param("search('useast')", lambda b: {b.a, b.c}, id="keyless_resource_value"),
        pytest.param("search('acme')", lambda b: {b.a, b.c}, id="keyless_attribute_value"),
        pytest.param("search('tenant')", lambda b: {b.a, b.b, b.c, b.d}, id="keyless_attribute_key"),
        pytest.param("search('error')", lambda b: {b.b, b.d}, id="keyless_severity_case_insensitive"),
        pytest.param("search('CHECKOUT')", lambda b: {b.a, b.d}, id="keyless_term_case_insensitive"),
        # ── scoped: narrows to one context ──────────────────────────────────
        pytest.param("search('login', body)", lambda b: {b.a}, id="scope_body"),
        pytest.param("search('login', 'body')", lambda b: {b.a}, id="scope_body_quoted"),
        pytest.param("search('checkout', body)", lambda b: {b.a}, id="scope_body_excludes_resource"),
        pytest.param("search('checkout', resource)", lambda b: {b.a, b.d}, id="scope_resource"),
        pytest.param("search('acme', attribute)", lambda b: {b.a, b.c}, id="scope_attribute"),
        pytest.param("search('error', log)", lambda b: {b.b, b.d}, id="scope_log_severity"),
        pytest.param("search('acme', body)", lambda b: set(), id="scope_body_no_match"),
        pytest.param("search('checkout', attribute)", lambda b: set(), id="scope_attribute_no_match"),
        # ── multiple scopes: union of the named contexts ────────────────────
        pytest.param("search('login', body, resource)", lambda b: {b.a}, id="scopes_body_resource_body_only"),
        pytest.param("search('checkout', body, resource)", lambda b: {b.a, b.d}, id="scopes_body_resource_union"),
        # ── composition with boolean / field filters ────────────────────────
        pytest.param("NOT search('login')", lambda b: {b.b, b.c, b.d}, id="negated"),
        pytest.param("search('useast') AND severity_text = 'INFO'", lambda b: {b.a}, id="and_field_filter"),
    ],
)
def test_search(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    expected: Callable[[Bodies], set[str]],
) -> None:
    """Four self-naming logs, each with a token planted in a distinct place (body,
    resource, attribute, severity), assert search() reaches exactly the right ones."""
    body = Bodies(
        a="alpha checkout login ok",  # service checkout / region useast / tenant acme    / INFO
        b="bravo declined",  # service payment  / region euwest / tenant globex  / ERROR
        c="charlie miss",  # service cart     / region useast / tenant acme    / WARN
        d="delta slow",  # service checkout / region apac   / tenant initech / ERROR
    )
    # (body, resources, attributes, severity_text)
    specs = [
        (body.a, {"service.name": "checkout", "region": "useast"}, {"tenant": "acme"}, "INFO"),
        (body.b, {"service.name": "payment", "region": "euwest"}, {"tenant": "globex"}, "ERROR"),
        (body.c, {"service.name": "cart", "region": "useast"}, {"tenant": "acme"}, "WARN"),
        (body.d, {"service.name": "checkout", "region": "apac"}, {"tenant": "initech"}, "ERROR"),
    ]

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs = [Logs(timestamp=now - timedelta(seconds=i + 1), resources=res, attributes=attrs, body=b, severity_text=sev) for i, (b, res, attrs, sev) in enumerate(specs)]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            build_raw_query(
                "A",
                "logs",
                filter_expression=expression,
                order=[build_order_by("timestamp", "desc"), build_order_by("id", "desc")],
                limit=100,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"
    assert set(get_column_data_from_response(response.json(), "body")) == expected(body)


@pytest.mark.parametrize(
    "expression",
    [
        pytest.param("search('login', bogus)", id="unknown_scope_word"),
        pytest.param("search('login', body.message)", id="qualified_field_not_a_scope"),
    ],
)
def test_search_invalid_scope_rejected(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    expression: str,
) -> None:
    """A scope that is not a field context (an unknown word, or a qualified
    `context.field`) is rejected at build time with a 400."""
    now = datetime.now(tz=UTC)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[build_raw_query("A", "logs", filter_expression=expression, limit=100)],
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "invalid search scope" in response.text


# The querier gates search() on EXPLAIN ESTIMATE against search_max_scan_rows (50000 here,
# see conftest.py). Both recoveries the advisory suggests — a selective filter, a narrower
# range — are exercised below.


def test_search_cost_guard_trips_then_passes_with_filter(
    signoz_search_scan_budget: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A broad search() over ~61000 logs exceeds the 50000-row budget and is rejected;
    the same search narrowed to the 1000-log 'checkout' service scans under budget and
    succeeds — the advisory's "add a more selective filter" made real."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # 60000 'catalog' logs now + 1000 'checkout' logs ~45m back, in an earlier ts_bucket, so
    # the checkout fingerprint owns its own marks and a resource filter on it prunes the scan.
    logs = [Logs(timestamp=now - timedelta(seconds=1 + i % 30), resources={"service.name": "catalog"}, body="log line") for i in range(60000)]
    logs += [Logs(timestamp=now - timedelta(minutes=45, seconds=i % 30), resources={"service.name": "checkout"}, body="log line") for i in range(1000)]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=60)).timestamp() * 1000)
    end_ms = int((now + timedelta(minutes=1)).timestamp() * 1000)

    def run(expression: str):
        return make_query_request(
            signoz_search_scan_budget,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type="raw",
            queries=[build_raw_query("A", "logs", filter_expression=expression, order=[build_order_by("timestamp", "desc")], limit=100)],
        )

    # Broad search over the whole range is over budget -> rejected before executing.
    over_budget = run("search('log')")
    assert over_budget.status_code == HTTPStatus.BAD_REQUEST, over_budget.text
    assert "over the per-shard limit" in over_budget.text
    # The advisory leads the suggestions, then how to get under budget.
    assert "runs across all fields" in over_budget.text
    assert "Narrow the time range or add a more selective filter." in over_budget.text

    # Adding a selective resource filter prunes the scan under budget -> runs.
    within_budget = run("search('log') AND resource.service.name = 'checkout'")
    assert within_budget.status_code == HTTPStatus.OK, within_budget.text
    assert len(get_rows(within_budget)) > 0


def test_search_cost_guard_passes_with_narrower_time_range(
    signoz_search_scan_budget: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A steady stream of ~80000 logs (~4/sec over the last ~5.5h). A search() over the
    whole window is over the 50000-row budget and rejected; the same search over the last
    15 minutes scans only a few thousand rows and runs — the advisory's "narrow the time
    range" made real."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # ~4 logs/sec, oldest ~5.5h back, newest ~now.
    logs = [Logs(timestamp=now - timedelta(seconds=i // 4), resources={"service.name": "app"}, body="log line") for i in range(80000)]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def run(lookback_minutes: int):
        return make_query_request(
            signoz_search_scan_budget,
            token,
            start_ms=int((now - timedelta(minutes=lookback_minutes)).timestamp() * 1000),
            end_ms=int((now + timedelta(minutes=1)).timestamp() * 1000),
            request_type="raw",
            queries=[build_raw_query("A", "logs", filter_expression="search('log')", order=[build_order_by("timestamp", "desc")], limit=100)],
        )

    # The last 6 hours cover the whole stream (~80000) -> over budget -> rejected.
    wide = run(360)
    assert wide.status_code == HTTPStatus.BAD_REQUEST, wide.text
    assert "over the per-shard limit" in wide.text

    # The last 15 minutes hold only ~3600 logs -> under budget -> runs, returning rows.
    narrow = run(15)
    assert narrow.status_code == HTTPStatus.OK, narrow.text
    assert len(get_rows(narrow)) > 0


# search() matches its term as literal text: each case plants the literal beside a decoy only a
# metacharacter reading would match - except the backslash, which unescaped misses the literal.
@pytest.mark.parametrize(
    "term,literal,decoy",
    [
        pytest.param("100% off", "sale 100% off today", "sale 100XX off today", id="percent_is_not_a_wildcard"),
        pytest.param("id_42", "user id_42 seen", "user idX42 seen", id="underscore_is_not_a_wildcard"),
        pytest.param("v1.2", "build v1.2 shipped", "build v1x2 shipped", id="dot_is_not_a_regex_wildcard"),
        pytest.param("cart|payment", "route cart|payment ok", "route cart ok", id="pipe_is_not_a_regex_alternation"),
        pytest.param(r"C:\\tmp", "path C:\\tmp here", "path C:tmp here", id="backslash_is_escaped_not_dropped"),
    ],
)
def test_search_term_matches_literally(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    term: str,
    literal: str,
    decoy: str,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs([Logs(timestamp=now - timedelta(seconds=i + 1), resources={"service.name": "api"}, body=body) for i, body in enumerate([literal, decoy])])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            build_raw_query(
                "A",
                "logs",
                filter_expression=f"search('{term}', body)",
                order=[build_order_by("timestamp", "desc"), build_order_by("id", "desc")],
                limit=100,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert set(get_column_data_from_response(response.json(), "body")) == {literal}


# Scoped to body, search() is a single predicate over the indexed expression - the one search form
# ClickHouse can prune on, since an unscoped OR arm that cannot prune forfeits the skip.
@pytest.mark.parametrize(
    "term,prunes_every_granule",
    [
        pytest.param("login", False, id="term_present_in_a_body"),
        pytest.param("zz_no_seeded_body_holds_this", True, id="term_absent_from_every_body"),
    ],
)
def test_search_scoped_to_body_prunes_granules(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    term: str,
    prunes_every_granule: bool,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs([Logs(timestamp=now - timedelta(seconds=i + 1), resources={"service.name": "api"}, body=body) for i, body in enumerate(["alpha checkout login ok", "bravo declined"])])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_preview_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            build_raw_query(
                "A",
                "logs",
                filter_expression=f"search('{term}', body)",
                order=[build_order_by("timestamp", "desc"), build_order_by("id", "desc")],
                limit=100,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    skip_indexes = get_preview_skip_indexes(response, "A")
    assert "body_index_v2_ngram" in skip_indexes, f"body bloom filters not consulted, only: {sorted(skip_indexes)}"

    selected = get_preview_selected_granules(response, "A")
    if prunes_every_granule:
        assert selected == 0, f"expected every granule pruned, {selected} survived"
    else:
        assert selected > 0, "the granule holding the match must survive"
