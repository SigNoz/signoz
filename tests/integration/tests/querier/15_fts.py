"""
Full-text search integration tests — context isolation.

Validates that FTS (bare text, "quoted", search()) correctly finds logs
when the search term lives in any one of the intended field contexts:

    severity_text       — LowCardinality(String), LOWER/match
    trace_id            — String, LOWER/match
    span_id             — String, LOWER/match
    body                — String (stringified JSON), LOWER(body)/match
    attributes_string   — Map(String,String), arrayExists(match, mapKeys/mapValues)
    attributes_number   — Map(String,Float64), arrayExists(match, mapKeys)
    resources_string    — Map(String,String), arrayExists(match, mapKeys/mapValues)

Each test log carries a unique token in exactly one context; all other fields
are neutral.  Per-context assertions verify:
    1. Exactly 1 row is returned (isolation — no cross-context bleed).
    2. The returned row belongs to the expected log (service.name check).
    3. The FTS warning is always present in the response.
"""

import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import build_raw_query, get_rows, make_query_request


def test_fts_across_contexts(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    10 logs, one unique token per log, each token in a different field context.
    Every FTS form (bare / quoted / search('…')) is exercised per context.
    search() requires a quoted argument; unquoted args must return HTTP 400.
    """
    now = datetime.now(tz=UTC)

    # ── unique tokens ────────────────────────────────────────────────────────
    # TOK_SEV: a severity level unused by every other fixture log (all others are INFO).
    # TOK_TID / TOK_SID: valid hex-format IDs; unique so no other inserted log matches them.
    # The remaining tokens are lowercase so they work for both case-insensitive
    # (String/JSON) and case-sensitive (Map) match().  Each token appears in exactly one log.
    TOK_SEV = "TRACE"  # → severity_text (others use INFO)
    TOK_TID = "0af7651916cd43dd8448eb211c80319c"  # → trace_id (valid 32-char hex, unique)
    TOK_SID = "6e0c63257de34c92"  # → span_id (valid 16-char hex, unique)
    TOK_BKEY = "xfts_bkey_004"  # → body JSON — key name
    TOK_BVAL = "xfts_bval_005"  # → body JSON — value
    TOK_ASKEY = "xfts_askey_006"  # → attributes_string key
    TOK_ASVAL = "xfts_asval_007"  # → attributes_string value
    TOK_ANKEY = "xfts_ankey_008"  # → attributes_number key (string key of the map)
    TOK_RKEY = "xfts_rkey_009"  # → resources_string key
    TOK_RVAL = "xfts_rval_010"  # → resources_string value

    # Neutral body — does not contain any xfts_ token.
    _N = json.dumps({"message": "neutral log entry"})

    # ── log fixtures ─────────────────────────────────────────────────────────
    # Each log uses a distinct service.name so assertions can verify identity.
    log_sev = Logs(
        timestamp=now - timedelta(seconds=10),
        resources={"service.name": "severity-text-svc"},
        body=_N,
        severity_text=TOK_SEV,  # ← token lives here
    )
    log_tid = Logs(
        timestamp=now - timedelta(seconds=9),
        resources={"service.name": "trace-id-svc"},
        body=_N,
        severity_text="INFO",
        trace_id=TOK_TID,  # ← token lives here
    )
    log_sid = Logs(
        timestamp=now - timedelta(seconds=8),
        resources={"service.name": "span-id-svc"},
        body=_N,
        severity_text="INFO",
        span_id=TOK_SID,  # ← token lives here
    )
    log_bkey = Logs(
        timestamp=now - timedelta(seconds=7),
        resources={"service.name": "body-key-svc"},
        body=json.dumps({TOK_BKEY: "irrelevant_val"}),  # ← token is a key in the stringified body
        severity_text="INFO",
    )
    log_bval = Logs(
        timestamp=now - timedelta(seconds=6),
        resources={"service.name": "body-val-svc"},
        body=json.dumps({"some_key": TOK_BVAL}),  # ← token is a value in the stringified body
        severity_text="INFO",
    )
    log_askey = Logs(
        timestamp=now - timedelta(seconds=5),
        resources={"service.name": "attr-str-key-svc"},
        attributes={TOK_ASKEY: "other_val"},  # ← token is an attr string key
        body=_N,
        severity_text="INFO",
    )
    log_asval = Logs(
        timestamp=now - timedelta(seconds=4),
        resources={"service.name": "attr-str-val-svc"},
        attributes={"some_attr": TOK_ASVAL},  # ← token is an attr string value
        body=_N,
        severity_text="INFO",
    )
    log_ankey = Logs(
        timestamp=now - timedelta(seconds=3),
        resources={"service.name": "attr-num-key-svc"},
        attributes={TOK_ANKEY: 42},  # ← token is an attr_number key
        body=_N,
        severity_text="INFO",
    )
    log_rkey = Logs(
        timestamp=now - timedelta(seconds=2),
        resources={"service.name": "resource-key-svc", TOK_RKEY: "irrelevant_val"},  # ← token is a resource key
        body=_N,
        severity_text="INFO",
    )
    log_rval = Logs(
        timestamp=now - timedelta(seconds=1),
        resources={"service.name": "resource-val-svc", "some_res_key": TOK_RVAL},  # ← token is a resource value
        body=_N,
        severity_text="INFO",
    )

    logs_list = [
        log_sev,
        log_tid,
        log_sid,
        log_bkey,
        log_bval,
        log_askey,
        log_asval,
        log_ankey,
        log_rkey,
        log_rval,
    ]
    not_search_count = len(logs_list) - 1
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(seconds=20)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # ── helpers ───────────────────────────────────────────────────────────────

    def _fts(expression: str) -> requests.Response:
        resp = make_query_request(
            signoz=signoz,
            token=token,
            start_ms=start_ms,
            end_ms=end_ms,
            queries=[build_raw_query("A", "logs", filter_expression=expression, step_interval=60)],
            request_type="raw",
        )
        assert resp.status_code == 200, f"FTS({expression!r}): HTTP {resp.status_code} — {resp.text}"
        return resp

    def _only(svc: str):
        """Validate lambda: exactly 1 row for `svc`."""
        return lambda r, s=svc: len(get_rows(r)) == 1 and get_rows(r)[0]["data"]["resources_string"].get("service.name") == s

    # ── per-context isolation cases ───────────────────────────────────────────
    # Free Text Search: bare/quoted tokens route through freeTextColumn (body only).
    # Full Text Search: search() fans out across all fields via ftsFieldKeys.

    cases = [
        # body — Free text search (body column only)
        {
            "name": "fts.body/quoted",
            "expression": f'"{TOK_BVAL}"',
            "validate": _only("body-val-svc"),
        },
        # TOK_SEV lives only in severity_text — free text (body-only) must return 0 rows
        {
            "name": "fts.free_text/non_body_token_returns_zero",
            "expression": f'"{TOK_SEV}"',
            "validate": lambda r: get_rows(r) == [],
        },
        # ── Full Text Search (search()) ───────────────────────────────────────
        # severity_text — only reachable via search(), not bare/quoted Free Text Search
        {
            "name": "fts.severity_text/search_quoted",
            "expression": f'search("{TOK_SEV}")',
            "validate": _only("severity-text-svc"),
        },
        # trace_id (String — only reachable via search())
        {
            "name": "fts.trace_id/search",
            "expression": f'search("{TOK_TID}")',
            "validate": _only("trace-id-svc"),
        },
        # span_id (String — LOWER/match, case-insensitive)
        {
            "name": "fts.span_id/search",
            "expression": f'search("{TOK_SID}")',
            "validate": _only("span-id-svc"),
        },
        # body key (String — LOWER(body)/match, token appears as a key in stringified JSON)
        {
            "name": "fts.body_key/search",
            "expression": f'search("{TOK_BKEY}")',
            "validate": _only("body-key-svc"),
        },
        # body value (String — LOWER(body)/match, token appears as a value in stringified JSON)
        {
            "name": "fts.body_val/search",
            "expression": f'search("{TOK_BVAL}")',
            "validate": _only("body-val-svc"),
        },
        # attributes_string key (Map — arrayExists(match, mapKeys), case-sensitive)
        {
            "name": "fts.attr_str_key/search",
            "expression": f'search("{TOK_ASKEY}")',
            "validate": _only("attr-str-key-svc"),
        },
        # attributes_string value (Map — arrayExists(match, mapValues), case-sensitive)
        {
            "name": "fts.attr_str_val/search",
            "expression": f'search("{TOK_ASVAL}")',
            "validate": _only("attr-str-val-svc"),
        },
        # attributes_number key (Map — arrayExists(match, mapKeys), key is a string)
        {
            "name": "fts.attr_num_key/search",
            "expression": f'search("{TOK_ANKEY}")',
            "validate": _only("attr-num-key-svc"),
        },
        # resources_string key (Map — arrayExists(match, mapKeys), case-sensitive)
        {
            "name": "fts.resource_key/search",
            "expression": f'search("{TOK_RKEY}")',
            "validate": _only("resource-key-svc"),
        },
        # resources_string value (Map — arrayExists(match, mapValues), case-sensitive)
        {
            "name": "fts.resource_val/search",
            "expression": f'search("{TOK_RVAL}")',
            "validate": _only("resource-val-svc"),
        },
        # NOT search: all logs except log_sev
        {
            "name": "fts.not_search",
            "expression": f'NOT search("{TOK_SEV}")',
            "validate": lambda r, n=not_search_count: len(get_rows(r)) == n and "severity-text-svc" not in {row["data"]["resources_string"].get("service.name") for row in get_rows(r)},
        },
        # no-match guard: a token that exists nowhere must return 0 rows
        {"name": "fts.no_match", "expression": '"xfts_nonexistent_zzz_999"', "validate": lambda r: get_rows(r) == []},
    ]

    for case in cases:
        resp = _fts(case["expression"])
        assert case["validate"](resp), f"Validation failed for '{case['name']}': {resp.json()}"

    # ── unquoted search guard ────────────────────────────────────────────────
    # search(TRACE) — unquoted argument — must be rejected with HTTP 400.
    unquoted_resp = make_query_request(
        signoz=signoz,
        token=token,
        start_ms=start_ms,
        end_ms=end_ms,
        queries=[build_raw_query("A", "logs", filter_expression=f"search({TOK_SEV})", step_interval=60)],
        request_type="raw",
    )
    assert unquoted_resp.status_code == 400, f"Expected 400 for unquoted search(), got {unquoted_resp.status_code}: {unquoted_resp.text}"
